---
sidebar_position: 5
title: Extension
description: vNext Extension component — instance data enrichment mechanism
---

# Extension

The **Extension** component is used for **instance data enrichment**. Extensions are invoked in Data Function and `GetInstanceData` endpoints; their results appear in the `extensions` object of the response.

> **Schema:** [`vnext-schema/extension-definition.schema.json`](https://github.com/burgan-tech/vnext-schema)

## Usage Model

When instance data is queried or a Data Function is called, the `extensions` list in the workflow definition runs and the results are added to the response:

```json
{
  "id": "...",
  "key": "...",
  "metadata": { },
  "attributes": { },
  "extensions": {
    "customer-detail": { },
    "credit-history": { }
  }
}
```

Each extension key becomes a property in the `extensions` object, with the value being whatever the extension returns.

## Required Fields

| Field | Type | Description |
|---|---|---|
| `key` | string | Unique identifier (becomes the property name in the response) |
| `version` | string | Extension version (SemVer) |
| `domain` | string | Owning domain |
| `flow` | string | Associated flow |
| `flowVersion` | string | Flow version |
| `tags` | string[] | Tags |
| `attributes` | object | Extension behavior content |

## Typical Use Cases

- **Customer enrichment**: full customer info from a customer ID
- **Credit history**: credit history associated with the instance
- **External system data**: pulling data from external systems
- **Computed fields**: fields derived from instance data

## Related

- [Extensions (conceptual)](/docs/components/extension) — conceptual explanation
- [Built-in Functions](/docs/components/functions/built-in) — Data Function integration
- Schema source: [vnext-schema (GitHub)](https://github.com/burgan-tech/vnext-schema)
