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

The master schema is defined on the flow itself and determines the **template structure of instance data**. It also enables vNext features such as `x-lookup`, `x-encrypt` and **instance filtering**. When an instance data merge is applied, the runtime validates it against the master schema and **rejects** the request if it does not conform.

:::caution[Do not use required, set additionalProperties: true]
Instance data **grows** via merge at each state. Therefore the master schema must **not use `required`** and must set **`additionalProperties: true`** so the data can expand. Strict requirements belong in **transition schemas** (request body validation), not the master schema.
:::

The master schema also plays an active role in the Data Function: during [instance filtering](/docs/how-to/instance-filtering) it resolves the **types of dynamic fields from the schema**, enabling advanced filtering. Field-level visibility (roleGrant) is defined on master schema properties — see [Authorization → Master Schema Field-Level Visibility](/docs/concepts/authorization#master-schema-field-level-visibility).

For a read-only view (no input), the master schema can be supplied directly as the view's `dataSchema`; for input sections, a transition-specific schema should be used instead.

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
