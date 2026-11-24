---
id: declarative-mappings
title: Declarative Task Mappings
sidebar_label: Declarative Mappings
description: input/output blocks instead of .csx on a task binding — select, into, set and Dynamic Expresso expressions
---

# Declarative Task Mappings

A task binding (state `onEntries` / `onExits`, transition `onExecutionTasks`, function `task` /
`onExecutionTasks`, extension `task`) can shape its request and write its result with two JSON blocks
instead of a C# `IMapping` file: **`input`** and **`output`**. Each block has `select`, `into` and `set`;
`set` values are [Dynamic Expresso](https://github.com/dynamicexpresso/DynamicExpresso) expressions.
There is no Roslyn compile: expressions are compiled at publish and errors come back with their JSON
location.

:::info Version
Requires the first runtime release after 0.0.106 and the vnext-schema release that defines
`inputMappingBlock` / `outputMappingBlock`. On older versions a binding needs `mapping`.
:::

## Blocks or `.csx`?

Use the blocks first for a new binding; they cover "copy this value there" and "compute this value with one
expression". Write an [`IMapping`](./interfaces) `.csx` for:

| Need | Why blocks cannot do it |
|---|---|
| An environment-driven URL (`API_BASEURL` placeholder, `GetConfigValue`) | No URL surface and no config access; input targets are `$.body`, `$.headers`, `$.query` only |
| Secrets, file reads, related-instance reads | Expressions see variables only, no I/O |
| Loops, multi-step branching, helper classes | One expression per target |
| FanOut, Notification and Human tasks | The runtime **rejects** blocks on these |

A binding carries `mapping` **or** blocks; both together (or neither) are rejected by the schema and at
publish.

## Shape

```json
{
  "order": 1,
  "task": { "key": "score-task", "domain": "core", "version": "1.0.0", "flow": "sys-tasks" },
  "input": {
    "select": "$.data.customer",
    "into": "$.body.customer",
    "set": { "$.body.customerId": "data.customer.id", "$.headers.x-channel": "\"web\"" }
  },
  "output": {
    "select": "$.body.score",
    "into": "$.kyc.score",
    "set": { "$.kyc.checkedAt": "now", "$.kyc.state": "instance.currentState" }
  }
}
```

| Field | Type | Description |
|---|---|---|
| `select` | string | Read path. Input: starts with a variable (`$.data.customer`); output: reads `result` (default `$.body`) |
| `into` | string | Write path. Input: a request surface; output: instance data (not the root `$`) |
| `set` | object | Write path → expression. Applied after `into`, in declaration order (a later key wins) |

A string literal is a quoted expression: `"\"web\""`. At most 8000 characters per expression.

**Paths:** `$`, `.name` (hyphens allowed), `['name']`, `[n]`, `[*]`. `[n]` and `[*]` are read-only; a write
target has no index or wildcard and arrays are written whole. No filters, no recursive descent.

## Input block — shaping the request

- Targets start with a request surface: `$.body`, `$.headers`, `$.query` (`$.route` is rejected). Each
  surface starts from the task definition's static value; fields no target touches are kept.
- `select` and `into` appear together.

| Task type | body | headers | query |
|---|---|---|---|
| Http, DirectTrigger, Start, SubProcess | ✓ | ✓ | – |
| DaprService | ✓ | ✓ | ✓ |
| DaprHttpEndpoint, DaprBinding, DaprPubSub | ✓ | – | – |
| Soap, GetInstance, GetInstanceData, GetInstances | – | ✓ | – |
| Script, Python, MCP, CacheAside | output block only | | |

## Output block — writing the result

- `select` reads `result` = `{ body, headers, statusCode }`.
- `into` writes the selected value at a data path. Without `into` the selected **object** merges at the
  data root; without `select`, `into` takes `result.body`.
- In a workflow all writes are **one** instance-data append (x-encryption, versioning and ETag apply as
  usual). In a function or extension the block's result is the task output an `OutputHandler` would return.

## Expression variables

| Variable | Meaning | Example |
|---|---|---|
| `data` | the instance's latest data | `data.customer.id` |
| `input` | the transition request body | `input.amount` |
| `instance` | read-only view, **camelCase**: `id`, `key`, `flow`, `version`, `currentState`, `effectiveState`, `effectiveStateType`, `effectiveStateSubType`, `effectiveStatus`, `type`, `data` | `instance.currentState` |
| `now` | one timestamp per mapping | `now` |
| `user` | the caller: `available`, `roles`, `hasRole("x")` | `user.available && user.hasRole("approver")` |
| `context` | the legacy rule context (PascalCase, unchanged) | `context.Instance.CurrentState` |
| `result` | output only: `body`, `headers`, `statusCode` | `result.body.score` |

- Names are **case-sensitive**; `instance.CurrentState` is a publish error.
- JSON values need a conversion for comparison and arithmetic: `data.amount.AsDouble() > 1000`,
  `.AsInt32()`, `.AsBoolean()`, `.AsArrayLength()`.
- Assignment is disabled (`data.x = 1` is a publish error); only `into` / `set` write.
- Only the variables an expression uses are built.

**`user`:** on System hops (timer, SubFlow resume) `user.available` is `false` and reading `user.roles` /
`user.hasRole` fails the task — always guard: `user.available ? user.hasRole("x") : false`. Functions and
extensions always see `available == false`.

## Missing values and errors

- A missing `select` path, a missing leaf, `?.`, or a read through a missing intermediate
  (`data.customer.id` with no `customer`) makes that entry **write nothing**, without an error.
- Every other failure (a bad conversion, an unwritable path, a role read on a System hop) **fails the
  task**: the error boundary applies, and with none the instance faults; no part of the delta is written.
- A non-JSON response body is a string: `result.body.x` reads as missing, a `select` without `into` fails.

## Example

A working end-to-end scenario: [`vnext-example` · declarative-mapping-lab](https://github.com/burgan-tech/vnext-example/tree/master/tests/Core.IntegrationTests/Tests/DeclarativeMappingLab).

## Related

- [Mappings](./mappings) — the `.csx` mapping guide
- [Interfaces](./interfaces) — `IMapping` and the other interfaces
- [Workflow](./workflow) — where task bindings live
