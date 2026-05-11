---
sidebar_position: 6
title: Function
description: vNext Function component — cross-domain BFF and external integration
---

# Function

The **Function** component is designed to **reduce BFF (Backend-for-Frontend) needs** by handling **cross-domain or external integration** processes. Functions can run independently or within a workflow context.

> **Schema:** [`vnext-schema/function-definition.schema.json`](https://github.com/burgan-tech/vnext-schema)

## Function Invocation Types

Functions support three invocation styles:

1. **Domain-level**: `/api/v1/{domain}/functions/{function}` — workflow-independent.
2. **Instance-level**: `/api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/{function}` — runs in instance context.
3. **Built-in**: State, Data, View — three system-provided functions (see [Built-in Functions](/docs/components/functions/built-in)).

## Required Fields

| Field | Type | Description |
|---|---|---|
| `key` | string | Unique function identifier |
| `version` | string | Function version (SemVer) |
| `domain` | string | Owning domain |
| `flow` | string | Associated flow (if any) |
| `flowVersion` | string | Flow version |
| `tags` | string[] | Tags |
| `attributes` | object | Function behavior (input mapping, task list, output mapping) |

## Structure

A function typically contains:

- **Input mapping** — request → task input
- **Task list** — sequential tasks (HTTP, Script, Dapr Service, etc.)
- **Output mapping** — task results → response

The `IOutputHandler` interface is implemented for output mapping; see [Interfaces](../interfaces).

## Typical Use Cases

- **Cross-domain data**: pulling data from domain A to domain B
- **External API gateway**: wrapping 3rd-party APIs
- **Aggregation**: collecting data from multiple sources
- **BFF replacement**: frontend talking to domain without a BFF

## Related

- [Built-in Functions](/docs/components/functions/built-in) — system functions
- [Custom Functions](/docs/components/functions/custom) — user-defined functions
- [Interfaces](../interfaces) — output mapping interface (IOutputHandler)
- Schema source: [vnext-schema (GitHub)](https://github.com/burgan-tech/vnext-schema)
