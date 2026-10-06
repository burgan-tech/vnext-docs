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

For instance authorization (transition `roles`, state/flow `queryRoles`, or master schema field visibility), four static system roles are available. They resolve at runtime based on the instance context:

| Role | Resolved identity | Description |
|------|-------------------|-------------|
| `$InstanceStarter` | Actor | The user who **started** the instance |
| `$PreviousUser` | Actor | The user who triggered the **previous** transition |
| `$InstanceBehalfOfStarter` | Subject | The **subject** who started the instance (on-behalf-of token) |
| `$PreviousBehalfOfUser` | Subject | The subject of the previous transition (on-behalf-of token) |

The first two compare against `act_sub` (actor), the last two against `sub` (subject).

**roleGrant example:**

```json
{
  "roles": [
    { "role": "$InstanceStarter", "grant": "allow" },
    { "role": "$PreviousUser", "grant": "allow" }
  ]
}
```

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

**Credential forwarding:** every outbound task type forwards the request headers `sub`, `act_sub`, `position`, `client_id`, `role` where the task mapping leaves them absent or empty; a mapping value wins. Values over 1024 characters or containing control characters are not forwarded, and a role resolved by morph-idm is never forwarded. To read as another identity, set the credential in the input mapping.

> **Note:** `roles` and `queryRoles` are for transition and state authorization. Schema property **field visibility** uses the `x-roles` keyword (same shape: `role` + `grant`).

- Properties **without** an `x-roles` definition are visible to all authorized callers.
- Properties with `x-roles` use the same system roles and JSONPath grants; `role` may be a static name or a JSONPath expression, `grant` ∈ `allow|deny` (DENY > ALLOW). Since v0.0.99 [combinators](#combinators-allof--anyof) are accepted too.
- `x-masking` / `x-encryption` `roles` are allow-only exemption lists (no combinators).
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

:::warning Backward impact
An existing deny-only set is now treated as a **blacklist** (open to everyone except the listed roles). If your intent was "deny everyone," convert it to an allow-list by adding at least one `allow` grant.
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

**Three-valued evaluation:** static roles and `$role.` leaves are **Unknown** for a role-less caller; identity leaves (system roles, `$user.`, `$userBehalfOf.`) are always Yes/No.

| `allOf` children | Result | `anyOf` children | Result |
|------------------|--------|------------------|--------|
| any **No** | No | any **Yes** | Yes |
| else any **Unknown** | Unknown | else any **Unknown** | Unknown |
| all **Yes** | Yes | all **No** | No |

A **deny fires on Yes or Unknown**; an **allow admits only on Yes**. Dynamic paths are checked per leaf at publish (must start with `$.context.`, case-sensitive, non-empty path); malformed schema `x-roles` entries and function `roles` with a malformed dynamic path are now rejected at publish. The `permissions` matrix shows combinator grants with `allOf` / `anyOf` and **without `role`**.

:::warning Rollout floor
Author the first combinator only after every pod — and every domain that stamps overrides onto this one — runs v0.0.99; an older pod cannot read it. Do not binary-downgrade once combinators are published.
:::

---

## Where Is It Evaluated?

| Context | Field | Effect |
|---------|-------|--------|
| Transition | `roles` | Who can trigger the transition |
| Transition `availableIn` entry | `roles` <sup>New</sup> | Who is offered the transition in that state (AND with transition `roles`) |
| Flow / State | `queryRoles` | Who can query instances and states (state level overrides root). <sup>New</sup> v0.0.99 inside a SubFlow the decision is made at the **deepest active leaf only**: parent-stamped override ?? leaf state `queryRoles` ?? leaf workflow `queryRoles`; the root/intermediate AND was removed, which loosens access where the root declares `queryRoles` but the leaf has none — add `subFlow.overrides.states.<state>.queryRoles` or leaf `queryRoles`. Parent-owned transitions and `?ack=true` are unchanged. <sup>New</sup> v0.0.95 decided at the **gateway** via `authorize?queryRoles=true` — the read functions (`state`, `data`, `view`, `schema`, `master`, `tasks`, `actions`, incidents) no longer refuse in process |
| State `interaction.longPoll` | `roles` / `rule` <sup>New</sup> v0.0.94 | Who receives the long-poll termination signal and may acknowledge. <sup>New</sup> v0.0.95 decided at the gateway via `authorize?ack=true`; `POST …/longpoll/ack` no longer gates in process |
| Function | `roles` | Who sees it in discovery (`/info`, `catalog`). <sup>New</sup> As of v0.0.88 this is no longer a gate on a direct custom function call — only the `authorize` function evaluates it |
| State `alias` | `roles` | The role-masked view of a state |
| Master schema property | `x-roles` | Column-level data visibility (combinators accepted since v0.0.99) |
| Master schema property | `x-masking.roles` / `x-encryption.roles` <sup>New</sup> v0.0.99 | Who sees the raw value (allow-only exemption list; no combinators) |

## One Evaluation Core <sup>New</sup>

As of v0.0.79 every grant surface — transition `roles`, function `roles`, flow/state `queryRoles`, schema `x-roles` — evaluates through a single `RoleGrantEvaluator`, so DENY-wins, allow-list/blacklist semantics, predefined system roles and JSONPath grants behave identically everywhere. This alignment changes some observable behavior (`x-roles` DENY across the whole grant set, deny-only sets for role-less callers, the human-task list) — see the [v0.0.79 breaking changes announcement](/blog/breaking-changes/breaking-changes-v0-0-79).

> 🚧 Full English translation is pending. See the [Turkish page](/docs/concepts/authorization) for the surface-alignment table and `availableIn` role-narrowing details.

## Caller-Role Provider <sup>New</sup> v0.0.88

The caller role set that feeds the grant evaluation above is resolved through a pluggable provider — `default` (unchanged) or `morph-idm` (one memoized call per request scope to an external IDM). See [Configuration → Caller Role Provider](/docs/configuration/caller-role-provider) for details. <sup>New</sup> v0.0.96 `morph-idm` fails **open to an empty role set**: an error status, timeout, transport failure, unparseable body or `204` resolves to `[]` instead of a 403 (`Authorization:110004`), and callers with neither `act_sub` nor `client_id` are not sent to morph-idm at all — rule 5 and the allow-lists keep an outage from widening access. <sup>New</sup> v0.0.97 under `morph-idm` a non-blank `role` header **replaces** the service's answer (morph-idm is not called); `authorize?role=X` behaves like that header when the request carries none, and a real header wins. `transition.roles`, `availableIn[].roles`, `queryRoles` and schema `x-roles` semantics are unaffected; only the role-set source changes. The one exception is a direct custom function call, where `function.roles` is no longer enforced — see the table above.

---

## Related

- [Workflow component](/docs/components/workflow) — `queryRoles`, transition `roles`, state `alias`
- [Schema component](/docs/components/schema) — master schema and field-level visibility
- [Built-in Functions](/docs/components/functions/built-in) — State/Data Function authorization behavior and authorize endpoints
- [Instance Data](/docs/concepts/instance-data) — `Instance.Data` and ScriptContext
