---
id: flow-default-version
title: Flow Default Version (Publish ≠ Activate)
sidebar_label: Flow Default Version
description: Publishing a flow version does not make it the default — the sys-version-registry pointer, pin modes, resolution rules, rollout runbooks and error codes
---

# Flow Default Version (Publish ≠ Activate)

Since v0.0.102, **publishing** a flow version makes it **reachable**, but it does not make it the **default**. A flow's default version is decided by a **pointer** kept in the `sys-version-registry` system flow: every start that names no version, asks for `latest`, or asks for a partial version (`2`, `2.1`) resolves against that pointer. Published versions above the pointer stay **pending**; only a call that asks for them explicitly reaches them.

The policy is **opt-in per flow**: a flow with no registry entry behaves exactly as before (the newest published version). Domain teams that want a release strategy write the pointer; nothing changes for anyone else.

:::info[Requires core package v0.0.21 or later]
The `sys-version-registry` flow ships with **vnext-core v0.0.21** ([burgan-tech/vnext-sys-flow v0.0.21](https://github.com/burgan-tech/vnext-sys-flow/releases/tag/v0.0.21); npm: `@burgan-tech/vnext-core-runtime@0.0.21`). In a domain with an older core package, `sys-version-registry` does not exist and **every flow behaves as Automatic** (newest version) — no error is raised. Upgrade the domain's core package to v0.0.21 before writing a pointer.
:::

## For product owners

Publishing a new version is no longer the same as "going live". A team can publish a version ahead of time and let only pilot channels (calls that ask for the version explicitly) use it; moving all traffic to the new version becomes a separate, reversible decision — a single `set-default` call on the registry. Rolling back is the same call; applications that already started on the new version finish on it.

---

## Concepts

| Term | Meaning |
|---|---|
| **Published** | Every version that has a row in `sys-flows` |
| **Latest** | The highest published version; the default when there is no pointer (Automatic) |
| **Default** (pointer) | The `defaultVersion` written in the registry: major (`2`), minor (`2.1`), artifact (`2.1.0`), full package build (`2.1.0-pkg.1.0.168`) or `"latest"` (Automatic) |
| **Effective default** (D) | The best published match of the pointer. For a partial pointer (`2`, `2.1`) D moves up by itself when a newer patch of that line is published |
| **Pending** | Published versions above D |
| **Explicit request** | A full (`-pkg.`) or artifact (`2.2.0`) version request. It never meets the ceiling, so pending versions are reachable |

### Pin modes

| Pointer | Mode | New patch in the line | Higher minor or major |
|---|---|---|---|
| `"latest"` / no record | **Automatic** (previous behaviour) | live | live |
| `2.1.0-pkg.1.0.168` | **Package-build pin** — pins one package build | pending | pending |
| `2.1.0` | **Artifact pin (exact)** — follows re-published package builds of `2.1.0` | pending | pending |
| `2.1` | **Minor line** — hotfixes (`2.1.x`) go live by themselves | live | pending |
| `2` | **Major line** | live | live within `2`, `3.0.0` pending |

- Write a full package pointer **without `+metadata`** (the registry schema rejects the stored `+core` form); matching ignores build metadata, so the pointer `2.1.0-pkg.1.0.168` selects the published `2.1.0-pkg.1.0.168+core`.
- Partial package forms (`2.1.0-pkg.1.0`, `2.1.0-pkg.1`) are not supported and are rejected as an invalid pointer (`Instance:100052`).
- **`"latest"` is how a pointer is cleared.** `null` is valid but **only takes effect at create**: the instance-data merge ignores a `null` on a key that already exists (see [Instance Data](/docs/concepts/instance-data)), so sending `null` with `set-default` does not change the pointer. A blank value is rejected.

---

## Registry contract

The registry flow is `sys-version-registry`: **one instance per flow**, **instance key = the target flow's key**. The registry instance lives in the **same domain** as the target flow; resolution always happens in the called (callee) flow's domain, with that domain's pointer.

```json
{ "type": "Flow", "defaultVersion": "2.1", "reason": "pilot finished, CHG-12345" }
```

| Field | Rule |
|---|---|
| `type` | Informational; the runtime never reads it. Write `"Flow"` today |
| `defaultVersion` | `M`, `M.m`, `M.m.p`, a full `-pkg.` version, or `"latest"` for Automatic. `null` only takes effect at create; blank is rejected |
| `reason` | Optional audit text |

The registry instance rests in the `active` state; its only transition is `set-default` and it has no final state. The pointer is read from the latest committed data row of the newest registry instance with the flow key, **whatever its status** — a registry instance that is Busy during a `set-default`, or Faulted, still carries its last pointer.

### The two calls

**1. Create the pointer** — the first time for a target flow:

```http
POST /api/v1/{domain}/workflows/sys-version-registry/instances/start?sync=true
Content-Type: application/json

{
  "key": "customer-onboarding",
  "attributes": { "type": "Flow", "defaultVersion": "2.1.0", "reason": "CHG-12345" }
}
```

**2. Move the pointer (`set-default`)** — on the existing registry instance:

```http
PATCH /api/v1/{domain}/workflows/sys-version-registry/instances/{instance}/transitions/set-default?sync=true
Content-Type: application/json

{
  "attributes": { "type": "Flow", "defaultVersion": "latest", "reason": "back to Automatic" }
}
```

- Both writes are validated **before** admission and Busy. A malformed pointer, or one that matches no published version, is rejected with `409` `Instance:100052`; the registry instance stays `active` and the old pointer stays in force.
- After a successful write, a best-effort post-commit job bumps the flow's cache generation; the change is visible on every pod within about **5 seconds** (`GenerationMemoSeconds`). A start made immediately afterwards may still see the old resolution.
- If a registry instance already exists for the target flow, apply `set-default` to it instead of a second `create`.

---

## Resolution

| Request | Result |
|---|---|
| Full (build metadata ignored) or artifact version | Exact match, ceiling not applied (pending included); served even while the pointer matches nothing |
| No version, empty or `latest` | D |
| `M` or `M.m` | The best published match at or below D |
| Partial request whose matches are all above D | `404` `Instance:100051` |
| Pointer matches no published version | `409` `Instance:100052` for `latest` / empty and partial requests — fail-closed, never replaced by latest |

**Explicit always wins.** A full or artifact request is handled before the pointer is judged, so a pointer that matches nothing blocks only `latest` / empty and partial requests; explicit versions keep working — that is the way around a broken pointer until it is fixed. `sys-*` flows and full-version requests bypass the policy entirely.

<sup>New</sup> v0.0.105 **An artifact request resolves to the highest package build.** A request or component reference by artifact version (for example `"1.0.0"`) resolves to the **highest `-pkg.`-stamped row** (`1.0.0-pkg.*`) even when an older bare `1.0.0` row exists for the same artifact; the bare row is returned only when no package-stamped row exists. Before, a case-insensitive exact-match shortcut let the bare row win, so a view (or any component) referenced by artifact version served a stale definition. Full-version, package-only, partial and major requests resolve as before.

<sup>New</sup> v0.0.106 **Floating resolution reads version names only.** A floating request (`1.0.0`, `1.0`, `1`, `latest` or none) now picks the winner from the stored **version strings** and loads **one** body. Before, every cache miss and every publish loaded and deserialized the body of **every** published version: large flows with many versions ran pods out of memory, and a row that failed to deserialize silently dropped out of the list, so an older version could win and be cached for up to an hour (starts ran an old flow version with no error). An unreadable winner now fails the request and is not cached. A full version without build metadata (`1.0.0-pkg.1.0.123` for a stored `…+core`) is also found by floating resolution. The rules above are unchanged. Workaround on 0.0.103–0.0.105: reference the full version (`1.0.0-pkg.1.0.N+domain`) from consuming flows — restarting pods does not help, the wrong answer lives in Redis.

### Scenario table

Published: `2.0.0`, `2.1.0`, `2.1.3`, `2.2.0`, `2.3.0`, `3.0.0`. D = effective default.

| Pointer | D | Request | Result | Why |
|---|---|---|---|---|
| none / `latest` | — | none / `latest` | `3.0.0` | Automatic, previous behaviour |
| none / `latest` | — | `2` | `2.3.0` | Automatic, highest of line `2` |
| `2.1.0` | `2.1.0` | none / `latest` | **`2.1.0`** | `2.1.3` is pending |
| `2.1.0` | `2.1.0` | `2.1` | **`2.1.0`** | Partial requests stay at or below D |
| `2.1.0` | `2.1.0` | `2.2.0` | `2.2.0` | Explicit request (pilot) |
| `2.1.0` | `2.1.0` | `2.2` | `404` `Instance:100051` | All of `2.2.x` is pending |
| `2.1` | `2.1.3` | none | **`2.1.3`** | Highest of the line; hotfixes advance D |
| `2.1` | `2.1.3` | `2` | `2.1.3` | Best match at or below D |
| `2` | `2.3.0` | `3` | `404` `Instance:100051` | `3.x` is pending |
| `2.1.0-pkg.1.0.168` | that build | none | that build | A full pointer pins a package build (build metadata ignored) |
| `2.4` (no match) | — | none / `2` | `409` `Instance:100052` | Fails closed for partial requests |
| `2.4` (no match) | — | `2.2.0` | `2.2.0` | Explicit always wins |

### Start response and running instances

- **The start response carries the resolved version:** `StartInstanceOutput` now includes `flowVersion` — the version the instance actually started on. The stored version may be in package-build form (for example an SDK-published `1.0.0-pkg.1.0.0+core`); the artifact part is what precedes `-pkg.` and `+`.
- **Running instances are unaffected:** each instance is pinned to the resolved version it started with. Flipping or rolling back the pointer does not move work in flight.
- **SubFlow / SubProcess correlations store the resolved version:** the parent writes the child's **resolved** version (the `flowVersion` of the start response) to the correlation — not the authored reference (`1.0` or `latest`). Parent reads (forward, descent, human task, retry) therefore never re-resolve a floating reference to a different definition than the child runs. This applies locally and cross-domain; an older remote runtime that returns no `flowVersion` keeps the authored reference. See [Workflow](/docs/components/workflow).
- **Row security uses the default version too:** the `rowSecurity` rule set applied to the list and the single GET is read from the default version when a pointer is set, otherwise from latest — a `set-default` also switches the row rules in force. See [Row Security](/docs/concepts/row-security).

---

## Rollout runbooks

### 1. Pilot a patch in one domain (live `1.2.0`, pilot `1.2.1`)

1. `set-default "1.2.0"` — an **artifact pin**. A line pointer (`1.2`) would let `1.2.1` go live the moment it is published.
2. Publish `1.2.1` — it stays pending.
3. Pilot clients start with `?version=1.2.1`.
4. When ready, `set-default "1.2.1"` (or `"1.2"` to let later patches flow).
5. **Rollback:** `set-default "1.2.0"`. Instances started on `1.2.1` stay on it.

### 2. Pilot a minor while hotfixes flow (live line `2.1`, pilot `2.2.0`)

1. `set-default "2.1"` — a **minor line**. `2.1.x` hotfixes go live as they are published.
2. Publish `2.2.0` — it is above line `2.1`, so it stays pending.
3. Pilot clients start with `?version=2.2.0`; `?version=2.2` (partial) answers `404` `Instance:100051`.
4. If a `2.1.4` hotfix is published meanwhile, it goes live without waiting for the pilot (within about 5 s).
5. When the pilot is done, `set-default "2.2"` — line `2.2.x` is now live.
6. **Rollback:** `set-default "2.1"`; instances started on `2.2.0` stay on it.

### 3. Cross-domain: onboarding → contract

Resolution happens **in the callee's domain, with the callee's pointer**. Example: the `onboarding` flow in domain `core` starts the `contract` flow in domain `partner` as a SubFlow / SubProcess.

- A caller referencing `"1.2.0"` or `"1.2"` must change its reference to move; one referencing `"1"`, `latest` or nothing follows the callee's pointer.
- Pilot order:
  1. Publish the new version of `contract` in `partner` (pending).
  2. In a pilot version of `onboarding`, reference `contract` by explicit version and publish it (pending in `core`).
  3. Flip the **callee**'s default first (`contract` in `partner`), then the **caller**'s (`onboarding` in `core`).
- The two registries are not atomic: **flip the callee first.** Children started during the flip stay on the version they resolved to.

---

## Error codes

| Code | Name | HTTP | Meaning |
|---|---|---|---|
| `Instance:100051` | `FlowVersionNotActivated` | 404 | The requested version(s) exist but are above the default (pending). Request an explicit version or move the pointer |
| `Instance:100052` | `FlowDefaultVersionInvalid` | 409 | The pointer is malformed (non-string included) or matches no published version (`latest` / partial requests only). Also rejected at write. Point it at a published version or `"latest"` |
| `Instance:100053` | `VersionRegistryUnavailable` | 503 | The registry read failed; transient, retry. Resolution fails instead of falling back to latest |

:::note[Instance reads are affected too]
Since v0.0.102 the instance list, the single GET and the `GetInstances` / `GetInstance` tasks look the flow definition up once; when that lookup fails with one of the errors above, the read fails with the same error — whether or not the flow declares `rowSecurity`. See [Row Security → Lookup failure](/docs/concepts/row-security#lookup-failure).
:::

## Observability

- `Instance.Create` span: `vnext.flow.version.requested` (what the caller sent; absent when none) and `vnext.flow.version` (what it resolved to).
- Cache resolution span: `vnext.flow.version.pointer`, `vnext.flow.version.source` (`automatic` / `explicit` / `default` / `ceiling`).
- Logs: 20500 resolved by policy, 20501 invalid default, 20502 registry read failed, 20503 registry invalidated, 20504 invalidation failed.

## Out of scope

- **There is no read surface for "which version is live".** You can read the pointer from the registry instance's data; there is no endpoint that returns the effective default (D) in this release.
- **Function default versions** are not supported; the policy applies to workflows only.

## Examples

- [vnext-example — FlowDefaultVersion integration tests](https://github.com/burgan-tech/vnext-example/tree/master/tests/Core.IntegrationTests/Tests/FlowDefaultVersion) — latest without a registry, artifact / line / full-package pins, flip + rollback, clearing with `latest`, pointer flip under load
- [vnext-example — `flow-default-version-lab` workflows](https://github.com/burgan-tech/vnext-example/tree/master/core/Workflows/flow-default-version-lab)

## Related

- [Workflow](/docs/components/workflow) — resolved version on the SubFlow correlation
- [Row Security](/docs/concepts/row-security) — which version's rule set applies
- [Instance Data](/docs/concepts/instance-data) — merge semantics
- [REST API](/docs/api-reference/rest-api) — start and transition endpoints
- [URN Catalog](/docs/components/urn-catalog) — system flows
