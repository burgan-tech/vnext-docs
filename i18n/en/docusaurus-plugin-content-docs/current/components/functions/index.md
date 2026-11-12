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
3. **Built-in**: State, Data, View, Schema, Master, Catalog, Tasks, Instance Correlation and more — system-provided functions (see [Built-in Functions](/docs/components/functions/built-in)).

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

A function may also declare a client contract — `verbs`, `inputSchema`, `outputSchema`, `inputView`, `outputView` — each slot a single reference or a rule-based list; see [Custom Functions](/docs/components/functions/custom). When `inputSchema` is declared, the request body is **validated** against the schema that wins rule evaluation (violation → `400`).

:::warning[⚠️ Breaking (v0.0.105): `inputSchema` with no matching entry]
<sup>New</sup> v0.0.105 When no entry of a rule-based `inputSchema` list matches, a request with a body is rejected with `400` `Function:800006` (previously validation was skipped). End the list with a rule-less last entry to keep accepting unmatched callers — see [Custom Functions → When no rule-based entry matches](/docs/components/functions/custom#when-no-rule-based-entry-matches) and [v0.0.105 Breaking Changes](/blog/breaking-changes/breaking-changes-v0-0-105).
:::

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
