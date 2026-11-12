---
id: authorization
title: Authorization
sidebar_label: Authorization
sidebar_position: 3
description: vNext authorization model — sub/act_sub claims, system roles, JSONPath role grants and master schema field visibility
---

# Authorization

vNext authorization makes decisions about triggering transitions, querying instances/states and **master schema field visibility** through a single shared model. This page is the **single source of truth** for authorization; the workflow, schema and function pages reference it whenever they need authorization.

Authorization rests on two inputs:

1. **Token claims** — the identity of the requester (`sub`, `act_sub`).
2. **Role grants** — `allow` / `deny` rules on a transition, queryRole or schema field.

:::info[DENY takes precedence]
In all grant evaluations, **DENY always overrides ALLOW.** If an actor matches both `allow` and `deny`, the result is `deny`.
:::

---

## Token Claims: `sub` and `act_sub`

vNext uses two claims to distinguish "on-behalf-of" scenarios:

| Claim | Meaning |
|-------|---------|
| `sub` | The customer **on whose behalf** the operation is performed (subject) |
| `act_sub` | The user **performing** the operation (actor) |

For example, when a call-center agent starts an operation on behalf of a customer: `act_sub` is the agent's identity, `sub` is the customer's identity. In self-service use they may be the same.

This distinction is decisive both in **system roles** (actor or subject?) and in **JSONPath grants** (`$user` vs `$userBehalfOf`).

---

## Predefined System Roles

For instance authorization (transition `roles`, state/flow `queryRoles`, or master schema field visibility), predefined system roles are available. The first four resolve at runtime based on the instance context; `$Everyone` reads nothing:

| Role | Resolved identity | Description |
|------|-------------------|-------------|
| `$InstanceStarter` | Actor | The user who **started** the instance |
| `$PreviousUser` | Actor | The user who triggered the **previous** transition |
| `$InstanceBehalfOfStarter` | Subject | The **subject** who started the instance (on-behalf-of token) |
| `$PreviousBehalfOfUser` | Subject | The subject of the previous transition (on-behalf-of token) |
| `$Everyone` | — | <sup>New</sup> v0.0.105 **Every caller** — with or without roles, with or without an instance loaded. See [`$Everyone`](#everyone--every-caller) |

`$InstanceStarter` / `$PreviousUser` compare against `act_sub` (actor), `$InstanceBehalfOfStarter` / `$PreviousBehalfOfUser` against `sub` (subject).

**roleGrant example:**

```json
{
  "roles": [
    { "role": "$InstanceStarter", "grant": "allow" },
    { "role": "$PreviousUser", "grant": "allow" }
  ]
}
```

### `$Everyone` — every caller

<sup>New</sup> v0.0.105 `$Everyone` is an identity leaf that is **Yes for every caller**: with or without roles, on the instance path (transitions, `queryRoles`, `x-roles`) and on the no-instance path ([start authorization](#authorizing-an-instance-start-authorizetypeinstance)) alike. So `deny $Everyone` refuses everybody and `allow $Everyone` admits everybody, including a role-less caller.

```json
"x-roles": [
  { "role": "$Everyone", "grant": "deny" }
]
```

| Rule | Description |
|------|-------------|
| Accepted in | Every role-grant surface: transition `roles`, workflow/state `queryRoles`, `availableIn[].roles`, function `roles`, subflow overrides, schema `x-roles`, and as an `allOf` / `anyOf` child |
| Refused in | `x-masking.roles` / `x-encryption.roles` — it would exempt every caller; publish rejects it and the read path drops it too (fail closed). `rowSecurity.rules[].roles` — RS-E05 ([Row Security](/docs/concepts/row-security)) |
| Spelling | **Ordinal** (case-sensitive): `$everyone` or `$EVERYONE` is a publish error on every surface that takes role grants (message: `predefined roles are case-sensitive, write '$Everyone'`). Only `$Everyone` gets this check; adding it to the older predefined roles could reject definitions that are already published |
| Caller's roles | The decision is made on the grant side: a caller sending a `role: $Everyone` header changes nothing |
| Static-role collision | A grant that targeted a **static** role literally named `$Everyone` now covers every caller — the predefined match runs before the static comparison |

The older workaround for "hide this field from everyone" was `deny $InstanceStarter` + `allow $InstanceStarter`, which only worked through the three-valued matcher's Unknown handling. It keeps working, but write `deny $Everyone` in new definitions.

**Example:** [`role-matrix-combinator-master.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Schemas/role-matrix-lab/role-matrix-combinator-master.json) — the `hiddenFromAll` (`deny $Everyone`) and `hiddenByWorkaround` (old spelling) fields; tests: [`EveryoneGrantTests.cs`](https://github.com/burgan-tech/vnext-example/blob/master/tests/Core.IntegrationTests/Tests/RoleMatrixLab/EveryoneGrantTests.cs).

---

## Instance Data JSONPath Authorization

The `role` values inside `roles` may use **JSONPath-style** expressions. The runtime compares token values against context values read from **ScriptContext** (including **`Instance.Data`**). This enables dynamic authorization bound to **instance data** instead of static role lists.

| Prefix | Compared token | Compared context value |
|--------|----------------|------------------------|
| `$user.<jsonpath>` | **Actor** (`act_sub`) | The `<jsonpath>` value in context |
| `$userBehalfOf.<jsonpath>` | **Subject** (`sub`, on-behalf-of) | The `<jsonpath>` value in context |
| `$role.<jsonpath>` | **Role** | The `<jsonpath>` value in context |

**Example paths** (must match your workflow data schema):

```text
$user.$.context.Instance.Data.customer.ownerUserId
$user.$.context.Instance.Data.assignedUsers[*].userId
$userBehalfOf.$.context.Instance.Data.customer.behalfOfUserId
$role.$.context.Instance.Data.permissions.requiredRole
$role.$.context.Transition.Key
```

These patterns are evaluated everywhere **available transition** and **data** authorization applies (including **master schema** field visibility).

> **Reference:** [vnext#469](https://github.com/burgan-tech/vnext/issues/469)

---

## Master Schema Field-Level Visibility

A flow's **master schema** can apply **field-level visibility** by defining the **`x-roles`** keyword on schema properties — i.e. it provides **column-level security**. The Data Function and data-returning endpoints run the authorize layer and return only the fields the caller is allowed to see.

<sup>New</sup> v0.0.99 `x-roles`, `x-masking` and `x-encryption` (in that order) apply on every read surface: **instance GET, instance list, data function, sync start/transition response** and the **GetInstance / GetInstances / GetInstanceData tasks**. Before, instance GET/list returned data unfiltered and the Get* tasks read with system visibility (`SystemRead`, removed); task reads are now evaluated with the caller's presented credential.

<sup>New</sup> v0.0.100 — Read order: **`x-roles` → `x-masking` → `x-encryption` (`source: runtime` only) → `x-computed` (`evaluatedBy: runtime`)**. The encryption step applies only at-rest rules (`source: runtime`, the default); a `source: client` rule is never handled by the runtime (the value is stored and returned as the client sent it). Runtime computed fields come last and are evaluated over the view the caller can already see (pruned, masked, encrypted), so a computed field can never reveal a field the caller cannot see and takes no `x-roles` / `x-masking` of its own. See [Schema Definition](/docs/how-to/view-consept/schema-tanimi) and [Schema Roles](/docs/concepts/schema-roles).

**Credential forwarding:** every outbound task type forwards the request headers `sub`, `act_sub`, `position`, `client_id`, `role` where the task mapping leaves them absent or empty; a mapping value wins. Values over 1024 characters or containing control characters are not forwarded, and a role resolved by morph-idm is never forwarded. To read as another identity, set the credential in the input mapping.

> **Note:** `roles` and `queryRoles` are for transition and state authorization. Schema property **field visibility** uses the `x-roles` keyword (same shape: `role` + `grant`).

- Properties **without** an `x-roles` definition are visible to all authorized callers.
- Properties with `x-roles` use the same system roles and JSONPath grants; `role` may be a static name or a JSONPath expression, `grant` ∈ `allow|deny` (DENY > ALLOW). Since v0.0.99 [combinators](#combinators-allof--anyof) are accepted too.
- <sup>New</sup> v0.0.105 To hide a field from every caller, write its `x-roles` as `[{ "role": "$Everyone", "grant": "deny" }]`; see [`$Everyone`](#everyone--every-caller).
- `x-masking` / `x-encryption` `roles` are allow-only exemption lists (no combinators; `$Everyone` is refused — it would exempt every caller).
- For structure and examples, see [Schema → Field-Level Authorization: `x-roles`](/docs/components/schema#field-level-authorization-x-roles) and [Schema Definition → `x-roles`](/docs/how-to/view-consept/schema-tanimi).
- The keyword is defined in `vnext-schema` [view-vocab.json](https://github.com/burgan-tech/vnext-schema/blob/master/vocabularies/view-vocab.json).

For master schema behavior and why `required` should not be used, see [Schema → Master Schema Behavior](/docs/components/schema#master-schema-behavior).

---

## Grant evaluation: allow-list vs. deny-only (blacklist)

The **intent** of a `roles` / `queryRoles` set is interpreted in two ways depending on its grants:

| Set contents | Mode | Default | Meaning |
|--------------|------|---------|---------|
| Contains at least one `allow` grant | **allow-list** (whitelist) | **deny** | Only matching `allow` roles pass |
| Contains only `deny` grants | **blacklist** | **allow** | Everyone is allowed *except* the listed roles |

In both modes **DENY always overrides ALLOW.** A deny-only set lets you express "allow everyone except X" without enumerating every permitted role.

The canonical rule is evaluated over the whole grant set and the caller's **whole role set**, as two groups: `authorized = DenyGroupOk AND AllowGroupOk` — the deny group is an AND (evaluated first), the allow group is an OR, a set with no allow is a blacklist, an empty set allows. <sup>New</sup> v0.0.96 **Rule 5: a caller with no roles cannot clear a role-bound deny.** A static role (`blocked`) or a `$role.$.context…` reference is a statement about the caller's *roles*; with none to compare, "nothing matched" is not evidence the caller is not the denied one, so the deny refuses. Identity-bound denies (the four system roles, `$user.` / `$userBehalfOf.`) keep their normal evaluation. Example: `[deny: blocked]` with no roles → **refused**; `[deny: $InstanceStarter]` with no roles, caller not the starter → allowed. This applies to every surface and every provider and reverses the v0.0.79 behaviour for deny-only sets (more restrictive). <sup>New</sup> v0.0.99 **Rule 6:** a role-less caller is no longer admitted by an allow `$role.` grant whose path resolves to `""` — a role-bound leaf is Unknown for them and an allow admits only on Yes.

:::warning[Backward impact]
An existing deny-only set is now treated as a **blacklist** (open to everyone except the listed roles). If your intent was "deny everyone," convert it to an allow-list by adding at least one `allow` grant — or, <sup>New</sup> since v0.0.105, write [`deny $Everyone`](#everyone--every-caller).
:::

---

## Combinators: allOf / anyOf

<sup>New</sup> v0.0.99 — A grant may carry **exactly one** of `role`, `allOf` (AND) or `anyOf` (OR); `grant` stays on the outer grant. Children are `{ "role": "..." }` only (at least one, no `grant`, no nesting — depth 1); an unknown member on a child is rejected. The plain form is unchanged.

```json
"roles": [
  { "allOf": [ { "role": "morph-idm.officer" }, { "role": "$user.$.context.Instance.Data.branch.managerId" } ], "grant": "allow" },
  { "anyOf": [ { "role": "morph-idm.auditor" }, { "role": "morph-idm.risk" } ], "grant": "deny" }
]
```

**Accepted in:** transition `roles`, workflow/state `queryRoles`, `availableIn[].roles`, function `roles`, `interaction.longPoll.roles`, subflow overrides and schema `x-roles`. **Not accepted in** `x-masking.roles` / `x-encryption.roles`.

**Three-valued evaluation:** static roles and `$role.` leaves are **Unknown** for a role-less caller; identity leaves (system roles, `$user.`, `$userBehalfOf.`) are always Yes/No. <sup>New</sup> v0.0.105 `$Everyone` reads nothing from an instance and is **Yes** for every caller, on the no-instance path too.

| Leaf | Caller has roles | Caller has no roles |
|------|------------------|---------------------|
| static role / `$role.…` | Yes if matched, else No | **Unknown** |
| `$InstanceStarter`, `$PreviousUser`, `$InstanceBehalfOfStarter`, `$PreviousBehalfOfUser`, `$user.…`, `$userBehalfOf.…` | Yes / No | Yes / No |
| `$Everyone` <sup>New</sup> v0.0.105 | **Yes** | **Yes** |

On the no-instance path (no starter or history to compare against — e.g. [start authorization](#authorizing-an-instance-start-authorizetypeinstance)) the identity leaves are **No**; `$Everyone` stays **Yes** there too.

| `allOf` children | Result | `anyOf` children | Result |
|------------------|--------|------------------|--------|
| any **No** | No | any **Yes** | Yes |
| else any **Unknown** | Unknown | else any **Unknown** | Unknown |
| all **Yes** | Yes | all **No** | No |

A **deny fires on Yes or Unknown**; an **allow admits only on Yes**. Typical intents: four eyes — `allow maker`, `deny allOf[maker, $PreviousUser]`; block a role only for its own starter — `deny allOf[blocked, $InstanceStarter]`; <sup>New</sup> v0.0.105 hide from everyone — `deny $Everyone`; open to everyone, explicitly — `allow $Everyone`. Dynamic paths are checked per leaf at publish (must start with `$.context.`, case-sensitive, non-empty path); malformed schema `x-roles` entries and function `roles` with a malformed dynamic path are now rejected at publish. The `permissions` matrix shows combinator grants with `allOf` / `anyOf` and **without `role`**.

:::warning[Rollout floor]
Author the first combinator only after every pod — and every domain that stamps overrides onto this one — runs v0.0.99; an older pod cannot read it. Do not binary-downgrade once combinators are published.
:::

---

## Where Is It Evaluated?

| Context | Field | Effect |
|---------|-------|--------|
| Transition | `roles` | Who can trigger the transition |
| Workflow `startTransition` | `roles` | <sup>New</sup> v0.0.105 Who may start an instance of the flow. Decided at the **gateway** via `authorize?type=instance`; the runtime does not check it at `POST …/instances/start` — see [Authorizing an instance start](#authorizing-an-instance-start-authorizetypeinstance) |
| Transition `availableIn` entry | `roles` <sup>New</sup> | Who is offered the transition in that state (AND with transition `roles`) |
| Flow / State | `queryRoles` | Who can query instances and states (state level overrides root). <sup>New</sup> v0.0.99 inside a SubFlow the decision is made at the **deepest active leaf only**: parent-stamped override ?? leaf state `queryRoles` ?? leaf workflow `queryRoles`; the root/intermediate AND was removed, which loosens access where the root declares `queryRoles` but the leaf has none — add `subFlow.overrides.states.<state>.queryRoles` or leaf `queryRoles`. Parent-owned transitions and `?ack=true` are unchanged. <sup>New</sup> v0.0.95 decided at the **gateway** via `authorize?queryRoles=true` — the read functions (`state`, `data`, `view`, `schema`, `master`, `tasks`, `actions`, incidents) no longer refuse in process |
| State `interaction.longPoll` | `roles` / `rule` <sup>New</sup> v0.0.94 | Who receives the long-poll termination signal and may acknowledge. <sup>New</sup> v0.0.95 decided at the gateway via `authorize?ack=true`; `POST …/longpoll/ack` no longer gates in process |
| Function | `roles` | Who sees it in discovery (`/info`, `catalog`). <sup>New</sup> As of v0.0.88 this is no longer a gate on a direct custom function call — only the `authorize` function evaluates it |
| State `alias` | `roles` | The role-masked view of a state |
| Master schema property | `x-roles` | Column-level data visibility (combinators accepted since v0.0.99) |
| Master schema property | `x-masking.roles` / `x-encryption.roles` <sup>New</sup> v0.0.99 | Who sees the raw value (allow-only exemption list; no combinators; <sup>New</sup> v0.0.105 `$Everyone` is refused at publish) |
| Flow | `rowSecurity.rules[].roles` <sup>New</sup> v0.0.102 | Row-level visibility: the instance list, the single GET and the `GetInstances` / `GetInstance` tasks return only the instances the matched rules open — see [Row security](#row-security-rowsecurity) |

### The leaf is the deepest existing instance

<sup>New</sup> v0.0.104 A parent commits its SubFlow correlation in its own transaction; the child's row is created afterwards by a post-commit job (after the subflow input mapping). In between — hundreds of milliseconds under load, indefinitely if the child start fails — the correlation points at a child that cannot be loaded. In that window the child answers `allowed: false` with `reason: "instance-not-found"` without evaluating any grant, and the parent then decides with its **own** `queryRoles` resolution (the override stamped on it ?? state `queryRoles` ?? workflow `queryRoles`) as if it were the leaf. That matches what the `state` function serves in the same window (it falls back to the main flow's view when the descent fails), and there is no child data to expose yet. Up to v0.0.103 every `queryRoles` probe in the window was refused and the gateway answered `403` to the client's state poll.

- **Only `queryRoles` falls back.** `transitionKey` / `functionKey` / `ack` targets are unchanged: a transition or function forwarded to a missing child cannot execute either, so `false` stays the answer.
- A child that exists and refuses is still the refusal; the fallback triggers only on the `instance-not-found` reason.
- The fallback reads the `reason` field, so it works over the remote (cross-domain) descent too. A partner domain on an older runtime omits the field, and the previous behaviour (refusal) applies.
- During that short interval the parent's `subFlow.overrides.states.<state>.queryRoles` for the child is not applied — the child's state is not known yet — so the parent's own gate decides.
- Observability: the decision taken at the parent is logged as `AuthorizeLeafMissingFallback` (EventId 50046, with the missing child's flow and id), and its `Authorization.Decide` span carries `vnext.auth.fallback = leaf-missing`.

**The `reason` field of the `authorize` response.** <sup>New</sup> v0.0.104 The response body gains an optional `reason` field. Its only value, `instance-not-found`, marks a refusal that **evaluated no grant** because the addressed instance could not be loaded. An ordinary decision carries no `reason` — the body is `{"allowed": true|false}` as before.

```json
{ "allowed": false, "reason": "instance-not-found" }
```

**Gateway / client guidance:** a `403` with `reason: "instance-not-found"` on a directly addressed instance means the instance **does not exist (yet)** — **not** that the caller lacks a role. Do not surface it as a permission error; a `403` without `reason` is a grant refusal.

**Example:** [`authorization-chain-lab`](https://github.com/burgan-tech/vnext-example/tree/master/core/Workflows/authorization-chain-lab) — the `root-slow` → `mid-slow` → `leaf-open` chain holds the window open with a 6 s input mapping ([`ChainSlowSubFlowMapping.csx`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/authorization-chain-lab/src/ChainSlowSubFlowMapping.csx)); tests: [`LeafNotCreatedYetTests.cs`](https://github.com/burgan-tech/vnext-example/blob/master/tests/Core.IntegrationTests/Tests/AuthorizationChainLab/LeafNotCreatedYetTests.cs).

### Authorizing an instance start (`authorize?type=instance`)

<sup>New</sup> v0.0.105 Before a start there is no instance to address, so the instance route cannot answer "may this caller start an instance of this flow?" — which is why `startTransition.roles` was applied nowhere until now. The **workflow-scoped** route of the `authorize` function answers it, before any instance exists, from the flow's own `startTransition.roles`:

```http
GET /api/v1/{domain}/workflows/{workflow}/functions/authorize?type=instance[&version=x][&role=r]
```

| Parameter | Required | Description |
|-----------|----------|-------------|
| `type` | **Yes** | What is authorized. `instance` (start a new instance) is the only supported value today; the parameter exists so other workflow-scoped questions can be added without a new route. Matched **ordinally**, with no default: a missing or unknown value is `400` `Authorization:110005` (`AuthorizeUnsupportedType`), and the message lists the supported values. Not to be confused with the instance list filter `instanceType` (`R`/`S`/`P`) |
| `version` | No | Pins the definition version. The gateway should forward the start request's own `version` so both calls read the same `startTransition.roles` |
| `role` | No | As on the instance route; composes per the provider's `RoleParameterMode` ([Caller Role Provider](/docs/configuration/caller-role-provider)) |

| Status | Body | Meaning |
|--------|------|---------|
| `200` | `{"allowed": true}` | May start |
| `403` | `{"allowed": false}` | May not start |
| `400` | error envelope | `type` missing or unknown (`Authorization:110005`) |
| `404` | error envelope | Unknown workflow or version |

The response contract is the instance route's. The gateway never has to know the start transition's key — the route resolves it from the definition. The caller's role set is resolved exactly as on the instance route (configured provider, `role` parameter).

**Evaluation** is the no-instance path of the one evaluation core:

| Grant leaf | At start |
|------------|----------|
| Static role | Compared against the caller's roles; DENY wins over ALLOW across the whole set |
| `$Everyone` | Matches every caller |
| `$InstanceStarter`, `$PreviousUser`, `$InstanceBehalfOfStarter`, `$PreviousBehalfOfUser` | **Never match** — there is no instance to compare against |
| `$user.` / `$userBehalfOf.` / `$role.` context references | **Never match** — `Instance.Data` does not exist yet, and the request body is never part of the authorization context |

A leaf that never matches neither admits nor refuses: an ALLOW of it admits nobody, a DENY of it refuses nobody, and an `allOf` containing it cannot be satisfied. Therefore:

- A start transition guarded **only** by `allow $InstanceStarter` is **closed to everyone** (fail-closed) — even to a caller carrying an actor identity.
- `[allow $InstanceStarter, allow maker]` is decided by `maker`.
- No grants ⇒ allowed, as for every transition.
- `availableIn` and the state check do not apply — the start transition belongs to no state.

:::warning[The runtime does not check the start itself]
The runtime **still does not** check `startTransition.roles` at `POST …/workflows/{workflow}/instances/start` — as for every other transition, the gateway decides. A runtime without a gateway applying this rule does not refuse a start by a caller without the role.
:::

**Gateway rule:** in APISIX check-authorize, add a second rule for `POST …/workflows/{workflow}/instances/start` that calls this route, the same way the transition rule calls the instance route. The host is environment-specific; forward the start request's `version` query parameter when present:

```text
Utils.CallApiGet("http://<orchestrator-host>/api/v1/"+path.var1+"/workflows/"+path.var2+"/functions/authorize?type=instance", header, allHeader).IsSuccessStatusCode == true
```

Every decision appears in the `AuthorizeRequest` (EventId 50030) audit log with target `start:{key}` and an empty instance id.

**Examples:** [`role-matrix-lab-start-open.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/role-matrix-lab/role-matrix-lab-start-open.json) (no grants → open to everyone), [`role-matrix-lab-start-gated.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/role-matrix-lab/role-matrix-lab-start-gated.json) (`allow maker`, `deny viewer` plus instance-bound grants that never match), [`role-matrix-lab-start-starter-only.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/role-matrix-lab/role-matrix-lab-start-starter-only.json) (only `allow $InstanceStarter` → closed to everyone); tests: [`StartAuthorizeTests.cs`](https://github.com/burgan-tech/vnext-example/blob/master/tests/Core.IntegrationTests/Tests/RoleMatrixLab/StartAuthorizeTests.cs).

## One Evaluation Core <sup>New</sup>

As of v0.0.79 every grant surface — transition `roles`, function `roles`, flow/state `queryRoles`, schema `x-roles` — evaluates through a single `RoleGrantEvaluator`, so DENY-wins, allow-list/blacklist semantics, predefined system roles and JSONPath grants behave identically everywhere. This alignment changes some observable behavior (`x-roles` DENY across the whole grant set, deny-only sets for role-less callers, the human-task list) — see the [v0.0.79 breaking changes announcement](/blog/breaking-changes/breaking-changes-v0-0-79).

> 🚧 Full English translation is pending. See the [Turkish page](/docs/concepts/authorization) for the surface-alignment table and `availableIn` role-narrowing details.

## Caller-Role Provider <sup>New</sup> v0.0.88

The caller role set that feeds the grant evaluation above is resolved through a pluggable provider — `default` (unchanged) or `morph-idm` (one memoized call per request scope to an external IDM). See [Configuration → Caller Role Provider](/docs/configuration/caller-role-provider) for details. <sup>New</sup> v0.0.96 `morph-idm` fails **open to an empty role set**: an error status, timeout, transport failure, unparseable body or `204` resolves to `[]` instead of a 403 (`Authorization:110004`), and callers with neither `act_sub` nor `client_id` are not sent to morph-idm at all — rule 5 and the allow-lists keep an outage from widening access. <sup>New</sup> v0.0.97 under `morph-idm` a non-blank `role` header **replaces** the service's answer (morph-idm is not called); `authorize?role=X` behaves like that header when the request carries none, and a real header wins. `transition.roles`, `availableIn[].roles`, `queryRoles` and schema `x-roles` semantics are unaffected; only the role-set source changes. The one exception is a direct custom function call, where `function.roles` is no longer enforced — see the table above. **Gateway precondition:** under both providers a client-supplied `role` header is taken at face value, so the gateway must strip or overwrite it (from the token), never pass it through or append to it.

---

## Row security (rowSecurity)

<sup>New</sup> v0.0.102 The row counterpart of field-level visibility (`x-roles`, `x-masking`, `x-encryption`) is `attributes.rowSecurity`: a flow declares a filter per role, and the runtime ANDs it into the instance list, the single GET and the `GetInstances` / `GetInstance` tasks. In short:

- **Deny by default:** in a flow that declares `rowSecurity`, a caller no rule matches sees no rows; "X sees everything" is an explicit unfiltered rule. A flow without `rowSecurity` is not filtered.
- The filters of the matched rules are **ORed** and **ANDed** with the caller's own filter; role-resolution or parameter failures **never widen** visibility. Rule roles are static roles or `$InstanceStarter` / `$InstanceBehalfOfStarter`; `allOf` / `anyOf` and other reserved roles (<sup>New</sup> v0.0.105 including `$Everyone`, RS-E05) are not accepted.
- An excluded instance answers the same `404` as a missing one on GET; list counts cover visible rows only.
- **Not an access boundary:** `functions/state`, `functions/data`, `functions/view` etc., transitions and `GetInstanceData` are not filtered. Guard those surfaces with `authorize` at the gateway.
- **Gateway precondition:** the gateway must write the `role` header and every header a rule reads from the token (strip/overwrite, never append); `QueryParameters` are client-controlled.

:::warning[A lookup failure now fails the read]
Since v0.0.102 the instance list, the single GET and the `GetInstances` / `GetInstance` tasks look the flow definition up; when the lookup fails, the read fails with the same error — with or without `rowSecurity`: `Instance:100052` (409, invalid default-version pointer), `Instance:100053` (503, version registry unavailable), `Instance:100051` (404, flow version not activated). Warning 20509 is logged.
:::

Details: [Row Security](/docs/concepts/row-security).

---

## Related

- [Workflow component](/docs/components/workflow) — `queryRoles`, transition `roles`, state `alias`
- [Schema component](/docs/components/schema) — master schema and field-level visibility
- [Built-in Functions](/docs/components/functions/built-in) — State/Data Function authorization behavior and authorize endpoints
- [Instance Data](/docs/concepts/instance-data) — `Instance.Data` and ScriptContext
- [Row Security](/docs/concepts/row-security) — row-level visibility with `attributes.rowSecurity`
