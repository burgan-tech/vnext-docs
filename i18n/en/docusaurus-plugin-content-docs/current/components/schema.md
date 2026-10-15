---
sidebar_position: 7
title: Schema
description: vNext Schema component — schema roles (master, transition, function, component), data validation and the x-* vocabulary
---

# Schema

The **Schema** component is a JSON schema definition for a flow's **master (data) schema**, a **transition** body, a **function** `inputSchema`, or an embedded view's **component** data contract. Requests are validated on both the front-end and back-end, ensuring **instance data consistency**.

A schema plays one **role**, and what an `x-*` keyword means depends on it. The role is declared in `attributes.type` <sup>New</sup> v0.0.100 / vnext-schema 0.0.56; for which keyword is valid in which role, see [Schema Roles](/docs/concepts/schema-roles).

> **Schema source:** [`vnext-schema/schema-definition.schema.json`](https://github.com/burgan-tech/vnext-schema)

## Usage Types

| Type | `attributes.type` | Attached At | Purpose |
|---|---|---|---|
| **Master Schema** | `master` | Workflow root (`attributes.schema`) | Main structure of instance data; consistency check on every change |
| **Transition Schema** | `transition` | Transition definition | Transition request body validation |
| **Function Input Schema** | `function` | Function `inputSchema` | Function request body validation |
| **Component Schema** | `component` | An embedded view's `dataSchema` | The component's input contract (`x-binding`) |
| Schema used in more than one role | absent / `""` | — | No role gate; see [Schema Roles](/docs/concepts/schema-roles) |

## Master Schema Behavior

The master schema is defined on the flow itself and determines the **template structure of instance data**. It also enables vNext features such as `x-roles` (field-level authorization), `x-encryption`, `x-lookup` and **instance filtering**. When an instance data merge is applied, the runtime validates it against the master schema and **rejects** the request if it does not conform.

:::caution[Do not use required, set additionalProperties: true]
Instance data **grows** via merge at each state. Therefore the master schema must **not use `required`** and must set **`additionalProperties: true`** so the data can expand. Strict requirements belong in **transition schemas** (request body validation), not the master schema.
:::

The master schema also plays an active role in the Data Function: during [instance filtering](/docs/how-to/instance-filtering) it resolves the **types of dynamic fields from the schema**, enabling advanced filtering.

**Attribute index preparation (`x-indexed`)** <sup>New</sup> v0.0.94 — Scalar fields of a master schema (a schema component whose `attributes.type` is exactly `master`) can opt into **manual index preparation** with `x-indexed: true`. The runtime never creates indexes from this marker: the `wf indexes generate` CLI command produces the SQL, a DBA executes it, and the runtime uses those columns through the `AttributeIndexCatalog` when `AttributeIndexes` is enabled. `x-indexed` is not a permission — filterability is still governed by `x-filterOperators` / `x-sortable`. In a non-master schema, `x-indexed` (even `false`) is rejected at publish time. See [Attribute Indexes](/docs/how-to/attribute-indexes).

### `attributes.type` values

<sup>New</sup> v0.0.100 / vnext-schema 0.0.56 — `attributes.type` is an **optional enum** naming the schema's **role**: `""` (no role), `master`, `transition`, `component`, `function`. It selects the **role vocabulary** `attributes.schema` is validated against. It may be omitted or `""`; before v0.0.100 the runtime refused a schema without a type (`Schema type is required.`), now it publishes cleanly.

| `attributes.type` | Role vocabulary | Used for | `x-indexed` |
|---|---|---|---|
| `master` | `record-vocab.json` | A flow's master (data) schema — the stored record | Allowed |
| `transition` | `input-vocab.json` | A transition body | Refused |
| `function` | `input-vocab.json` | A function `inputSchema` | Refused |
| `component` | `component-vocab.json` | An embedded view's own `dataSchema` (input contract) | Refused |
| absent / `""` | no role gate | A schema used in more than one role | Refused |

The comparison is exact (`Master` is not `master`).

**Migrating legacy values.** The former free-text values (`workflow`, `schema`, `view`, `headers`, `task`, `extension`, `SchemaDefinition`, …) are not roles. Pick the value from where the schema is **actually used**:

| Where the schema is used | Typical legacy value | New `attributes.type` |
|---|---|---|
| The workflow's `attributes.schema` reference (the flow's data schema) | `workflow`, `schema`, `SchemaDefinition` | `master` |
| A transition body | `workflow`, `schema` | `transition` |
| A function `inputSchema` | `function`, `schema` | `function` |
| An embedded (component) view's `dataSchema` | `view` | `component` |
| A schema used in more than one role, or none of the above | `headers`, `task`, `extension`, … | Omit it (or `""`) — or split the schema per role |

The schema package 0.0.56, the CLI (`npm run validate`) and Forge **refuse** a legacy value. Runtime v0.0.100 publishes it with a **warning** (a temporary allowance):

```
attributes.type 'workflow' is not a schema role (master, transition, component, function) and will be refused in a future release; use 'master' for a flow's data schema, 'transition' / 'function' for a request body, 'component' for an embedded view's dataSchema, or omit it.
```

:::warning[Not the other components' `attributes.type`]
This role enum applies only to the **schema component** (`flow: sys-schemas`). The `attributes.type` of workflows (`C` / `F` / `S` / `P`), tasks (numeric task type), views (content type) and extensions (numeric extension type) keep their own enums and are unaffected.
:::

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

The same system roles and JSONPath grant prefixes (`$user.` / `$userBehalfOf.` / `$role.`) apply; see [Authorization](/docs/concepts/authorization). `x-encryption` is in the same field-governance scope. <sup>New</sup> v0.0.100 — `source` selects who encrypts: `runtime` (the default; at rest, as described here) or `client` (in transit; the client seals the value to the recipient's public key before sending, and the runtime **never handles** the rule). For `source: runtime`, `hash` digests the value on write under a per-instance salt (the database stores the digest), and `encrypt` stores the value AES-256-GCM-encrypted in instance data and decrypts it for the `allow` exemption roles only on every read surface — instance GET, list, data function, sync response and the Get* tasks, which are evaluated as the header set the task presents: its mapping headers plus the caller's credential (`sub`, `act_sub`, `position`, `client_id`, `role`) where unset — `role` only as the caller sent it, never a role morph-idm resolved. Scripts see an encrypt field as its token and open it with `context.Instance.DecryptAsync(path)` (`persisted` / `transport` were removed).

Since v0.0.99 an `x-roles` entry may also be an `allOf` / `anyOf` combinator instead of a single `role`; see [Authorization](/docs/concepts/authorization). Malformed `x-roles` entries are now rejected at publish.

`x-masking` (v0.0.99) keeps the value plain in storage and transforms it on read: `operator: "mask"` (`keepFirst`, `keepLast`, `maskingChar`; output keeps the input length, value unchanged when `keepFirst + keepLast` ≥ length) or `operator: "replace"` (`params.value`). `roles` is an allow-only exemption list (no combinators); a matching caller sees the raw value. Reads apply `x-roles` → `x-masking` → `x-encryption` (`source: runtime` only) → `x-computed` (`evaluatedBy: runtime`, <sup>New</sup> v0.0.100); `x-masking` / `x-encryption` are allowed only on nested-`properties` `type: "string"` fields, one transform per field, and never together with `x-filterOperators` / `x-sortable` / `x-indexed`.

Schema `attributes.labels` are returned as `labels` by the schema and master functions since v0.0.99 (all languages; omitted when none are declared).

### Filter & Sort Vocabulary

Whether a JSON (`attributes.*`) field is **filterable and sortable** is declared in the master schema via three keywords. The Data Function and instance-listing endpoints (`.../instances?filter=`, `.../functions/data`) honor this vocabulary:

| Keyword | Type | Required | Description |
|---------|------|----------|-------------|
| `x-filterOperators` | string[] | No | Allowed filter operators. **Empty or absent means the field is not filterable** |
| `x-sortable` | boolean | No | When `true`, the field is sortable. Absent means not sortable |
| `x-displayFormat` | string | No | UI-facing format hint (e.g. `yyyy-MM-dd'T'HH:mm:ssXXX`) |
| `x-indexed` <sup>New</sup> v0.0.94 | boolean | No | **Master schema only** (`attributes.type: "master"`). `true` marks a scalar `string` / `number` / `integer` / `boolean` field under fixed `properties` paths as a candidate for the SQL generated by `wf indexes generate`; arrays, objects, `$ref` and conditional nodes are rejected. **Not a permission** — does not change filter/sort rights. See [Attribute Indexes](/docs/how-to/attribute-indexes) |

**`x-filterOperators` values (declaration names):** `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `between`, `contains`, `startsWith`, `endsWith`, `in`, `nin`, `isNull`, `includes` (`uniqueItems`). <sup>New</sup> v0.0.100 — query tokens (`ne`, `ge`, `le`, `like`, `match`, `startswith`, `endswith`, `isnull`) and case variants are **refused at publish** as declarations; the message names the right declaration. Query syntax is unchanged; for the mapping see [Instance Filtering → Schema declaration vs. query token](/docs/how-to/instance-filtering#schema-declaration-vs-query-token).

```json
"startDateTime": {
  "type": "string",
  "format": "date-time",
  "x-filterOperators": ["eq", "gt", "gte", "lt", "lte", "between"],
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

### Vocabulary by role

Besides the keywords above, the vNext vocabulary includes `x-storage` (file field), `x-computed` (derived, never-stored field), `x-order` (form field order), `x-binding` (component input contract), `x-labels`, `x-lov`, `x-lookup`, `x-conditional` and more; see [Schema Definition](/docs/how-to/view-consept/schema-tanimi). <sup>New</sup> v0.0.100 / vnext-schema 0.0.56 — they are grouped into **role vocabularies**: base and view-hint keywords apply in every role; `record-vocab.json` (master) adds `x-roles`, `x-masking`, `x-encryption`, `x-storage`, `x-indexed`, `x-filterOperators`, `x-sortable`, `x-computed`, `x-context-target`; `input-vocab.json` (transition / function) adds `x-context-source` and `x-encryption` with `source: client`; `component-vocab.json` adds `x-binding`. A keyword outside its role is refused by package validation. Matrix: [Schema Roles](/docs/concepts/schema-roles).

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

- [Schema Roles](/docs/concepts/schema-roles) — `attributes.type` roles, the annotation × role matrix and rule sets
- [Workflow component](/docs/components/workflow) — `attributes.schema` master schema reference
- [Transitions](/docs/components/mappings) — transition schema usage
- Schema source: [vnext-schema (GitHub)](https://github.com/burgan-tech/vnext-schema)
