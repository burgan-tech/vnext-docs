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

A flow's **master schema** can apply **field-level visibility** by defining the **`x-roles`** keyword on schema properties — i.e. it provides **column-level security**. The Data Function and data-returning endpoints (Get Instance, GetInstances, etc.) run the authorize layer and return only the fields the caller is allowed to see.

> **Note:** `roles` and `queryRoles` are for transition and state authorization. Schema property **field visibility** uses the `x-roles` keyword (same shape: `role` + `grant`).

- Properties **without** an `x-roles` definition are visible to all authorized callers.
- Properties with `x-roles` use the same system roles and JSONPath grants; `role` may be a static name or a JSONPath expression, `grant` ∈ `allow|deny` (DENY > ALLOW).
- For structure and examples, see [Schema → Field-Level Authorization: `x-roles`](/docs/components/schema#field-level-authorization-x-roles) and [Schema Definition → `x-roles`](/docs/how-to/view-consept/schema-tanimi).
- The keyword is defined in `vnext-schema` [view-vocab.json](https://github.com/burgan-tech/vnext-schema/blob/master/vocabularies/view-vocab.json).

For master schema behavior and why `required` should not be used, see [Schema → Master Schema Behavior](/docs/components/schema#master-schema-behavior).

---

## Where Is It Evaluated?

| Context | Field | Effect |
|---------|-------|--------|
| Transition | `roles` | Who can trigger the transition |
| Flow / State | `queryRoles` | Who can query instances and states (state level overrides root) |
| State `alias` | `roles` | The role-masked view of a state |
| Master schema property | `x-roles` | Column-level data visibility |

---

## Related

- [Workflow component](/docs/components/workflow) — `queryRoles`, transition `roles`, state `alias`
- [Schema component](/docs/components/schema) — master schema and field-level visibility
- [Built-in Functions](/docs/components/functions/built-in) — State/Data Function authorization behavior and authorize endpoints
- [Instance Data](/docs/concepts/instance-data) — `Instance.Data` and ScriptContext
