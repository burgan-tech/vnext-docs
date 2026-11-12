---
id: row-security
title: Row Security
sidebar_label: Row Security
description: Role-keyed row filters with attributes.rowSecurity — contract, parameters, deny-by-default evaluation, covered surfaces, gateway precondition, publish validation and lookup-failure behaviour
---

# Row Security

Column-level authority already exists: `x-roles`, `x-masking` and `x-encryption` in the master schema (see [Authorization](/docs/concepts/authorization)). **Row security** (`attributes.rowSecurity`), new in v0.0.102, adds the **row** dimension: a flow declares, per role, a filter that the runtime ANDs into the instance reads it covers, so a caller sees only the instances a rule opens. Typical case: a branch employee sees only the applications of their own branch.

**Platform position.** The runtime provides the mechanism. Which request values are trustworthy and how tight a rule is, is the domain team's responsibility (see [Gateway precondition](#gateway-precondition)).

:::warning[Row security is not an access boundary]
`rowSecurity` filters only the instance **list**, the **single GET** and the `GetInstances` / `GetInstance` tasks. Instance-addressed surfaces such as `functions/state`, `functions/data` and `functions/view`, transitions and the `GetInstanceData` task are not filtered: a caller who knows an instance id can read a hidden instance there. Details: [Unfiltered surfaces](#unfiltered-surfaces-known-gap).
:::

---

## Contract

Workflow-level, inside `attributes`:

```json
"rowSecurity": {
  "rules": [
    { "roles": ["branch-staff", "branch-ops"],
      "filter": { "attributes": { "branchCode": { "eq": "$.context.Headers.x-branch-code" } } } },
    { "roles": ["region-manager"],
      "filter": { "attributes": { "branchCode": { "in": { "$param": "$.context.Headers.x-branches", "split": "," } } } } },
    { "roles": ["hq-auditor"] },
    { "roles": ["customer"],
      "filter": { "createdBy": { "eq": "$InstanceStarter" } } },
    { "roles": ["$InstanceStarter"],
      "filter": { "status": { "eq": "A" } } }
  ]
}
```

This example validates against the `rowSecurity` definition in vnext-schema 0.0.58.

| Field | Type | Required | Description |
|---|---|---|---|
| `rowSecurity` | object \| absent | No | Absent = the flow is **not filtered at all** (as before). Any member other than `rules` is a publish error (RS-E12) |
| `rowSecurity.rules` | array | **Yes** | Role-keyed row rules (`minItems: 1`) |
| `rules[].roles` | string[] | **Yes** | Roles the rule applies to (`minItems: 1`): static role names **or** the reserved identity roles `$InstanceStarter` / `$InstanceBehalfOfStarter` |
| `rules[].filter` | object | No | The same filter language as instance queries. Absent: **all rows** for a static-role rule, all of the caller's **own instances** for an identity rule |

:::info[There is no default — deny by default]
In a flow that declares `rowSecurity`, **a caller no static rule matches sees nothing beyond the identity rules the author declared.** "Role X sees everything" is written as an explicit unfiltered rule: `{ "roles": ["hq-auditor"] }`.
:::

### `rules[].roles`

- **Static roles** are compared like role grants (case-insensitive).
- **Identity-bound reserved roles:**
  - `$InstanceStarter` → row predicate `createdBy eq <caller's ActorUserName>`
  - `$InstanceBehalfOfStarter` → `createdByBehalfOf eq <caller's UserName>`
- Rejected at publish: `$PreviousUser` / `$PreviousBehalfOfUser` (RS-E01), dynamic grants `$user.`, `$userBehalfOf.`, `$role.` (RS-E02), any other reserved role (RS-E05) — <sup>New</sup> v0.0.105 including [`$Everyone`](/docs/concepts/authorization#everyone--every-caller). "X sees everything" is written as an explicit, unfiltered static-role rule. An `allOf` / `anyOf` object cannot be used in `roles` — the schema expects a list of strings, and the runtime answers `400` `App:900006` at JSON binding.
- A static role and a reserved role may not share one rule's `roles` (RS-E04): split them into two rules.

### `rules[].filter`

- The body is the list-engine filter JSON (GraphQL wire form): `eq ne gt ge lt le between like match startswith endswith in nin isNull includes`, with `and` / `or` / `not`, on `attributes.*` paths and whitelisted instance columns (`createdBy`, `createdByBehalfOf`, `modifiedBy`, `modifiedByBehalfOf`, `key`, `status`, `createdAt`, …). See [Instance Filtering](/docs/how-to/instance-filtering).
- On an identity rule, a `filter` is ANDed with the identity predicate.
- `sort`, `orderBy`, `groupBy`, `aggregations` are not part of a rule (RS-E13).

### Parameters

A string leaf value that starts with `$.context.` (case-sensitive prefix) is a **parameter**.

| Path | Source |
|---|---|
| `$.context.Headers.<name>` | Request header (case-insensitive name). For gateway-written claim headers |
| `$.context.QueryParameters.<name>` | Query string — **client-controlled**, do not use for security decisions |
| `$.context.CurrentUser.ActorUserName` / `ActorUserId` / `UserName` / `Position` | The authenticated caller. `sub`, `act_sub` and `client_id` are reachable as `Headers` |

- `$.context.Route.*`, `$.context.Query.*`, an unknown `CurrentUser` field and any malformed path are publish errors (RS-E07). A prefix in a different letter case (`$.Context.`) is treated as a literal and logged as RS-W4.
- **Shorthands** (valid only as the value of their own column; RS-E06 elsewhere): `$InstanceStarter` on `createdBy` = `$.context.CurrentUser.ActorUserName`; `$InstanceBehalfOfStarter` on `createdByBehalfOf` = `$.context.CurrentUser.UserName`.
- Parameters are not allowed on `like` / `match` / `startswith` / `endswith` or inside `includes` (RS-E17): an unescaped `%` or `_` in a caller-supplied value would change the pattern.

**Arrays (`in`, `nin`, `between`):**

- **Element-wise:** a JSON array whose elements are literals or parameters — `"between": ["$.context.Headers.x-min", "$.context.Headers.x-max"]`.
- **Explicit split:** `{ "$param": "<path>", "split": "<separator>" }`. Without `split`, a multi-valued source (a repeated header) is taken element by element. Each element is trimmed. `split` on an operator that takes no array is RS-E11; `between` without exactly two operands is RS-E10.
- Values are strings on the wire; each is coerced to the field type from the flow's master schema. A value that cannot be coerced drops its rule.
- On an **instance column** (not `attributes.*`), an `in` / `nin` / `between` value that contains a comma drops its rule (the list engine re-splits these operands on `,`).

**Limits** (`Workflow:RowSecurity`): exceeding `MaxElements` (default `100`) or `MaxElementLength` (default `1000`) drops the rule. The rule does not count against the caller's own filter length limits.

---

## Evaluation model

**The platform never adds an implicit branch**: everything a caller sees comes from a rule the author wrote.

1. **Role resolution failed** (provider error, timeout, transport, unparseable body) → **no rows**. A provider answer of "no roles" (`204`, blank body, `roles: []`) and a caller with no identity are a role-less caller, not a failure.
2. **Base — static-role matching.** If the caller holds a role listed in at least one static rule, base = the **OR** of those rules' filters (a rule without `filter` = all rows); the caller's other roles add nothing. If no static rule matches, base = **none**.
3. **Identity add-on.** Only rules declared with `roles: ["$InstanceStarter"]` or `["$InstanceBehalfOfStarter"]` contribute, and only when the caller's identity value resolves: identity predicate AND the rule's filter, **ORed** onto the base.
4. **Effective query** = the caller's own filter **AND** (base OR identity add-ons). Base none and no add-on returns an empty page without going to SQL.

**Parameter failures never widen.** A matched static rule whose parameters fail still counts as matched and contributes nothing:

- a missing or empty parameter → nothing;
- narrowing array (`in`): unresolved elements are dropped; none left → nothing;
- widening operator (`nin`, `ne`) or any failure under `not` → the whole rule contributes nothing;
- `between` without exactly two values, a scalar operator fed a multi-valued source, an element over the limits → nothing.

### Outcome tables

**Definition A:** `branch-staff` → `branchCode eq $.context.Headers.x-branch-code`; `hq-auditor` unfiltered; no identity rule.

| Request | Result |
|---|---|
| no credential | none |
| identity, no roles | none |
| `[menu.view]` | none |
| `[branch-staff]`, header present | own branch |
| `[branch-staff]`, header missing | none |
| `[branch-staff, menu.view, report.read]` | own branch |
| `[branch-staff, hq-auditor]` | all |
| `[hq-auditor]` | all |
| role resolution failed | none |

**Definition B:** Definition A plus `{ "roles": ["$InstanceStarter"] }`.

| Request | Result |
|---|---|
| no credential | none |
| identity, no roles | own instances |
| identity, `[menu.view]` | own instances |
| identity, `[branch-staff]`, header present | own branch ∪ own instances |
| identity, `[branch-staff]`, header missing | own instances |
| no identity, `[branch-staff]` | own branch |
| role resolution failed | none |

### Which version's rules apply?

The rule set is the one in the flow's **default version** (the `sys-version-registry` pointer, see [Flow Default Version](/docs/concepts/flow-default-version)); without a pointer, the **latest** published version. The same single lookup serves instances of every version; the list and the GET never read `instance.FlowVersion`, so they always agree. A `set-default` therefore also switches the row rules in force.

---

## Covered and unfiltered surfaces

### Covered surfaces

| Surface | Behaviour |
|---|---|
| `GET /api/v1/{domain}/workflows/{workflow}/instances` | The predicate joins the query **before** paging, `groupBy` and aggregations; counts and totals cover **visible rows only** |
| `GET /api/v1/{domain}/workflows/{workflow}/instances/{instance}` | Probed as `id = <instance> AND <row predicate>`, before extensions and before the ETag comparison. An excluded instance answers **the same `404` as a missing one** (no `304` for an excluded row). The probe runs against the latest data even when `?version=` asks for an older data version |
| `GetInstances` / `GetInstance` tasks | Filtered by the same rules, **same-domain and cross-domain**, with the credential and headers the task presents — see [Trigger tasks](#trigger-tasks) |

The GET `404` is a **consistency check with the list, not a confidentiality boundary**.

### Unfiltered surfaces (known gap)

These surfaces do **not** apply row security in this release; a caller who knows an instance id can read an instance there even when the list and the GET hide it:

- `functions/state`, `functions/data`, `functions/view`, `functions/schema`, `functions/master`
- transition and data history endpoints, `internal/*` endpoints
- the `GetInstanceData` task, view content resolution, transitions (including a direct trigger by key), `context.Related` in scripts, the human-task list, event correlation selectors

Consequences:

- **Existence oracle:** for an excluded instance, `GET` answers `404` while `functions/data` answers `200`, and a transition on it succeeds.
- `authorize?queryRoles=true` may admit a caller whom the GET hides; it has no row term.
- **SubFlow children do not inherit the parent's rules.** A child is read through its own flow's `rowSecurity` (or none); publish logs RS-W7 for a flow that declares `rowSecurity` and has a SubFlow state.

This gap is a recorded, accepted risk with no date for closing it. Enforce access to these surfaces at the gateway (`authorize`).

### Trigger tasks

A `GetInstances` / `GetInstance` task is filtered with the header set it presents — in the same domain by the local read, in another domain by that domain's public list or GET endpoint. That set carries only `sub`, `act_sub`, `position`, `client_id` and `role`. A header a rule reads is **not forwarded automatically**: the domain team sets it in the task's input mapping, otherwise the parametrised rule contributes nothing. Query parameters have no task counterpart. The target domain trusts the header set a calling runtime presents — reading another domain through a trigger task is as strong as the mapping's author.

---

## Gateway precondition

Row security trusts the header set a request arrives with. On **every public route** to the list and the GET, the gateway **must strip or overwrite, never append,** the `role` header and **every header** a rule reads, writing the values introspected from the token. Under the default caller-role provider the `role` header **is** the role set; a `split` on a header is only safe under this precondition.

`QueryParameters` are client-controlled even behind a perfect gateway: the caller picks the value. A rule on them restricts nothing against that caller and is **never a boundary**. Publish rejects them on `x-roles`, `x-masking` and `x-encryption` paths (RS-E18 or the stricter code) and logs RS-W6q on every other use.

Header values a rule reads (for example `x-branch-code`) can appear in request logs unless the deployment redacts them via `Telemetry:Logging:Body:AdditionalSensitiveHeaderNames`; row security itself never logs a parameter value.

---

## Publish validation

**Errors (RS-E\*) reject the publish. Warnings (RS-W\*) are log-only:** the publish response is unchanged and the flow goes live.

| Code | Severity | Meaning |
|---|---|---|
| RS-E01 | error | `$PreviousUser` / `$PreviousBehalfOfUser` used as a rule role |
| RS-E02 | error | Dynamic grant (`$user.`, `$userBehalfOf.`, `$role.`) used as a rule role |
| RS-E03 | (reserved) | `allOf` / `anyOf` — not emitted by the runtime; refused at JSON binding (`400` `App:900006`), reported first by vnext-schema |
| RS-E04 | error | Static and reserved roles mixed in one rule |
| RS-E05 | error | Reserved role other than `$InstanceStarter` / `$InstanceBehalfOfStarter` (for example <sup>New</sup> v0.0.105 `$Everyone`) |
| RS-E06 | error | Instance-starter shorthand on a column it does not belong to |
| RS-E07 | error | Malformed `$.context.` path, unknown source (`Route`, `Query`) or unknown `CurrentUser` field |
| RS-E08 | error | Filter on, or above, an `x-encryption: encrypt` path |
| RS-E09 | error | Invalid operator or filter JSON shape |
| RS-E10 | error | `between` without an array of exactly two operands |
| RS-E11 | error | `split` on an operator that takes no array |
| RS-E12 | error | `rules` missing or empty, or an unknown member on `rowSecurity` or a rule |
| RS-E13 | error | `sort` / `orderBy` / `groupBy` / `aggregations` inside a rule filter |
| RS-E14 | error | Filter on an `x-encryption: hash` path |
| RS-E15 | error | Filter on an `x-masking` path |
| RS-E16 | error | `rowSecurity` on a `sys-*` flow |
| RS-E17 | error | Parameter on `like` / `match` / `startswith` / `endswith`, or inside `includes` |
| RS-E18 | error | `QueryParameters` value on an `x-roles` path |
| RS-W0 | warning | Master schema not resolvable at publish: schema-aware checks skipped; protected-path rules are dropped at read time instead |
| RS-W1 | warning | Filtered field not declared in the master schema |
| RS-W2a | warning | `in` / range / pattern operator on a field without `x-indexed` |
| RS-W2b | warning | Identity rule or filter on `createdBy` / `createdByBehalfOf`, which have no index |
| RS-W2c | warning | `ne` / `nin` as the only predicates of a rule |
| RS-W4 | warning | `$.context.` in another letter case: treated as a literal |
| RS-W5 | warning | `not` / `nin` on a field that is not `required` also matches rows missing it |
| RS-W6q | warning | `QueryParameters` used: client-controlled, not a boundary |
| RS-W6r | warning | `Headers` value on an `x-roles` path |
| RS-W7 | warning | SubFlow children do not inherit `rowSecurity` |

With the master schema resolvable the protected-path checks (RS-E08, E14, E15, E18) are errors; without it they downgrade to RS-W0.

---

## Lookup failure

:::danger[Behaviour change — including flows without rowSecurity]
Since v0.0.102 the instance list, the single GET and the `GetInstances` / `GetInstance` tasks look the flow definition up once (cached). When that lookup fails with anything other than "no definition", the read **fails with that error as is** — whether or not the flow declares `rowSecurity`. Before, the list served rows through such an error and the GET did not look the flow up.
:::

| Lookup result | Read |
|---|---|
| Flow loaded, declares `rowSecurity` | Filtered by the rules |
| Flow loaded, no `rowSecurity` — or no published definition | Unfiltered, exactly as before |
| Any other failure | **Fails** with the lookup error as is |

Typical errors that fail the read:

| Code | HTTP | Cause |
|---|---|---|
| `Instance:100052` | 409 | Invalid default-version pointer |
| `Instance:100053` | 503 | Version registry unavailable (transient) |
| `Instance:100051` | 404 | Flow version not activated |

- The list answers the error, never an empty page; the GET answers it before the ETag. The tasks fail like any other read error (cross-domain, the partner's endpoint answers the same error).
- Starts and transitions of that flow already fail with the same error; without its flow, no instance of it is readable.
- The span carries `vnext.rowsecurity.outcome = denied-flow-load` and warning **20509** is logged with the error code.
- Surfaces that do not apply row security (view resolution, triggers, `GetInstanceData`, functions) are not affected.

**Operator action:** before upgrading, check that every flow's `sys-version-registry` pointer resolves to a published version (or is `"latest"`) and that the registry is reachable; watch warning 20509 after the rollout.

Component cache keys gain a shape segment; the first reads after the upgrade miss the cache once.

---

## Rollback

:::warning[Do not roll the runtime back below this release]
A runtime older than row security **ignores `rowSecurity` entirely** and serves every row of every flow, whatever the definition holds. Nothing in the flow definition protects anything on such a runtime.

The only protections are:

- do not roll the runtime back below this release while any flow relies on `rowSecurity`; or
- for as long as an older runtime serves those flows, block or authorize the instance list and the single GET of those flows at the gateway.
:::

Removing `rowSecurity` from the flow restores today's behaviour (it **widens** visibility). During a rollout, do not force re-publish the same version number to add `rowSecurity`; publish a new version instead.

---

## Observability

Log and span output carries parameter **names**, rule indexes and error codes; never a parameter, header or identity **value**. A flow without `rowSecurity` carries no row-security tag.

| Tag | Value |
|---|---|
| `vnext.rowsecurity.applied` | the read was evaluated |
| `vnext.rowsecurity.outcome` | `unrestricted`, `filtered`, `excluded`, `denied-no-match`, `denied-no-contribution`, `denied-resolution-failed`, `denied-flow-load` |
| `vnext.rowsecurity.rules` | matched rule indexes |
| `vnext.rowsecurity.missing_params` | names of the parameters that did not resolve |
| `vnext.rowsecurity.flow_version` | the resolved rule-set version |

EventIds: 20505 decision of one read, 20506 single GET found the instance outside the predicate (`404`), 20507 an applicable rule contributed nothing, 20508 role resolution failed, 20509 rule set could not be loaded, 20510 publish schema checks skipped (RS-W0), 20511 publish: SubFlow children do not inherit (RS-W7). 20507 is a **Warning** and can fire on **every request** of a caller who lacks a header a matched rule reads — it scales with traffic.

---

## Examples

- [`rs-a.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/row-security-lab/rs-a.json) — Definition A (branch header + unfiltered auditor)
- [`rs-b.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/row-security-lab/rs-b.json) — Definition B (Definition A + `$InstanceStarter`)
- [`rs-params.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/row-security-lab/rs-params.json) — every parameter form (`$param` + `split`, element-wise arrays, `between`, `not`, `CurrentUser`)
- [RowSecurityLab integration tests](https://github.com/burgan-tech/vnext-example/tree/master/tests/Core.IntegrationTests/Tests/RowSecurityLab)

## Related

- [Authorization](/docs/concepts/authorization) — role grants, caller-role provider, field-level visibility
- [Flow Default Version](/docs/concepts/flow-default-version) — which version's rules apply
- [Workflow](/docs/components/workflow) — `attributes.rowSecurity`
- [GetInstances Task](/docs/components/tasks/get-instances) · [GetInstance Task](/docs/components/tasks/get-instance)
- [Instance Filtering](/docs/how-to/instance-filtering) — the filter language
