---
sidebar_position: 7
title: Schema
description: vNext Schema component — workflow and transition data validation, master-data
---

# Schema

The **Schema** component is a JSON schema definition for **transition**, **flow**, and **master-data**. Requests are validated on both the front-end and back-end, ensuring **instance data consistency**.

> **Schema source:** [`vnext-schema/schema-definition.schema.json`](https://github.com/burgan-tech/vnext-schema)

## Usage Types

| Type | Attached At | Purpose |
|---|---|---|
| **Master Schema** | Workflow root (`attributes.schema`) | Main structure of instance data; consistency check on every change |
| **Transition Schema** | Transition definition | Transition request body validation |
| **Flow Schema** | Workflow definition | Workflow-level validation |

## Master Schema Behavior

The master schema is defined on the flow itself and determines the **template structure of instance data**. It also enables vNext features such as `x-roles` (field-level authorization), `x-encryption`, `x-lookup` and **instance filtering**. When an instance data merge is applied, the runtime validates it against the master schema and **rejects** the request if it does not conform.

:::caution[Do not use required, set additionalProperties: true]
Instance data **grows** via merge at each state. Therefore the master schema must **not use `required`** and must set **`additionalProperties: true`** so the data can expand. Strict requirements belong in **transition schemas** (request body validation), not the master schema.
:::

The master schema also plays an active role in the Data Function: during [instance filtering](/docs/how-to/instance-filtering) it resolves the **types of dynamic fields from the schema**, enabling advanced filtering.

### Field-Level Authorization: `x-roles`

`x-roles` is the vocabulary keyword that authorizes a JSON Schema property (an instance data field) via **role evaluation**. It matters most in the **master schema**: it decides which fields are visible to whom — i.e. it provides **column-level security**. The Data Function and data-returning endpoints run the authorize layer and return only the fields the caller may see.

```json
{
  "x-roles": [
    { "role": "morph-idm.initiator", "grant": "allow" },
    { "role": "$userBehalfOf.$.context.Instance.Data.initial.customer.ownerUserId", "grant": "deny" }
  ]
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `x-roles` | — | Role grant list for the property (`minItems: 1`). If absent, the field is visible to all authorized callers |
| `role` | Yes | Domain-qualified role name (e.g. `morph-idm.initiator`) **or** a dynamic JSONPath expression |
| `grant` | Yes | `allow` or `deny`. **DENY always overrides ALLOW** |

The same system roles and JSONPath grant prefixes (`$user.` / `$userBehalfOf.` / `$role.`) apply; see [Authorization](/docs/concepts/authorization). `x-encryption` is in the same field-governance scope (`persisted` / `transport`).

### Filter & Sort Vocabulary

Whether a JSON (`attributes.*`) field is **filterable and sortable** is declared in the master schema via three keywords. The Data Function and instance-listing endpoints (`.../instances?filter=`, `.../functions/data`) honor this vocabulary:

| Keyword | Type | Required | Description |
|---------|------|----------|-------------|
| `x-filterOperators` | string[] | No | Allowed filter operators. **Empty or absent means the field is not filterable** |
| `x-sortable` | boolean | No | When `true`, the field is sortable. Absent means not sortable |
| `x-displayFormat` | string | No | UI-facing format hint (e.g. `yyyy-MM-dd'T'HH:mm:ssXXX`) |

**`x-filterOperators` values:** `eq`, `ne`, `gt`, `ge`, `lt`, `le`, `between`, `match`, `like`, `startswith`, `endswith`, `in`, `nin` (`uniqueItems`).

```json
"startDateTime": {
  "type": "string",
  "format": "date-time",
  "x-filterOperators": ["eq", "gt", "ge", "lt", "le", "between"],
  "x-sortable": true,
  "x-displayFormat": "yyyy-MM-dd'T'HH:mm:ssXXX"
}
```

A non-filterable field, or a disallowed operator, raises **`SchemaFilterValidationException`**. For per-type (numeric / date / text / boolean / array) operator behavior, the `includes` operator for JSON arrays, and the rules, see [Instance Filtering → Schema-Driven Filterability](/docs/how-to/instance-filtering#schema-driven-filterability--sorting).

For a read-only view (no input), the master schema can be supplied directly as the view's `dataSchema`; for input sections, a transition-specific schema should be used instead.

### Data Context Vocabulary (data-vocab)

> **Vocabulary:** `vnext-schema/vocabularies/data-vocab.json`

Two backwards-compatible annotations for **schema-driven client context-store binding** — a generic client wires a flow's inputs from, and persists its reusable outputs to, the client context-store purely from backend schemas, with zero per-flow client code:

| Annotation | Lives on | Direction | Applied when |
|---|---|---|---|
| `x-context-source` | A property of a transition input schema | context-store → input | Building a start/transition payload |
| `x-context-target` | The workflow **master schema** | instance data → context-store | On every instance read (start result, after each transition) |

**`x-context-source`** marks a property as client-resolved (no form field rendered), from one of: a literal (`{ "const": <any> }`), a context-store slot (`{ "context": { "boundary": "device|user|subject", "key": "<template>", "storage"?: "memory|local|secure" } }`), or the client identity (`{ "identity": "subject" | "user" }` — e.g. the logged-in userId / JWT `sub`).

```json
"properties": {
  "oldPassword": { "type": "string" },
  "channel":  { "type": "string", "x-context-source": { "const": "web" } },
  "deviceId": { "type": "string", "x-context-source": { "context": { "boundary": "device", "key": "device.id" } } },
  "userId":   { "type": "string", "x-context-source": { "identity": "subject" } }
}
```

**`x-context-target`** (on the master schema) maps instance-data field paths (dot-notation) to context-store slots, applied on every instance read — so values that appear only after a transition (tokens, device ids, certificates) propagate automatically and become available to later flows via `x-context-source`. Slot keys support `{instance}` / `{subject}` templating; omit `{instance}` for cross-flow singletons.

```json
"x-context-target": {
  "deviceData.instanceId": { "context": { "boundary": "device", "key": "device.registration.{instance}" } },
  "certificate":           { "context": { "boundary": "device", "key": "device.cert.{instance}", "storage": "secure" } }
}
```

Standard JSON Schema validators ignore unknown `x-*` keywords, so unannotated schemas behave exactly as before — adoption is per-schema and incremental.

## Required Fields

| Field | Type | Description |
|---|---|---|
| `key` | string | Unique schema identifier |
| `version` | string | Schema version (SemVer) |
| `domain` | string | Owning domain |
| `flow` | string | Associated flow |
| `flowVersion` | string | Flow version |
| `tags` | string[] | Tags |
| `attributes` | object | JSON Schema (Draft) definition |

## Validation

Schemas are validated with **Ajv2019**. The front-end can use annotations for form validation; the back-end validates transition/start requests automatically.

- Frontend: form annotations, real-time validation
- Backend: request body validation, instance data merge validation
- CI/CD: the schema itself is centrally validated in the `vnext-schema` repo

## Typical Use Cases

- **Master schema** to keep instance data **immutable** and **versionable**
- **Transition schema** for distinct request body validation per transition
- **Form schema** for automatic form generation on the UI side

## Related

- [Schema (conceptual)](/docs/components/schema) — conceptual explanation
- [Workflow component](/docs/components/workflow) — `attributes.schema` master schema reference
- [Transitions](/docs/components/mappings) — transition schema usage
- Schema source: [vnext-schema (GitHub)](https://github.com/burgan-tech/vnext-schema)
