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
