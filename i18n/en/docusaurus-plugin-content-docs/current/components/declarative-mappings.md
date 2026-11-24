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
| `into` | string | Write path. Input: a field of the task's `config`; output: instance data (not the root `$`) |
| `set` | object | Write path → expression. Applied after `into`, in declaration order (a later key wins) |

A string literal is a quoted expression: `"\"web\""`. At most 8000 characters per expression.

**Paths:** `$`, `.name` (hyphens allowed), `['name']`, `[n]`, `[*]`. `[n]` and `[*]` are read-only; a write
target has no index or wildcard and arrays are written whole. No filters, no recursive descent.

## Input block — shaping the request

- **Targets are fields of the task's own `config`**, named as in the task JSON: `$.url`, `$.method`,
  `$.body.customer`, `$.headers.x-channel`, `$.timeoutSeconds`, a DaprService's `$.queryString`. Anything a
  C# `InputHandler` could set is reachable; the root `$` is rejected.
- The block edits a copy of the configured `config` (untouched fields keep their value) and hands it back
  through the task type's own parser, as if the task definition had carried it. A value the parser rejects
  (`"$.url": "42"`) fails the task.
- A path into a field that is not an object (`$.body.x` over an array body) fails; target the field whole to
  replace it. An absent or `null` field becomes an object. Header values are written as strings.
- A field the task type does not read is **ignored**, as in the task definition; check field names against
  the task's schema.
- `select` and `into` appear together; `select` starts with a JSON variable (`$.data.x`, `$.task.body`).

### URL from configuration

The `API_BASEURL` placeholder a `.csx` resolves with `GetConfigValue` is one expression:

```json
"input": {
  "set": {
    "$.url": "task.url.ToString().Replace(\"API_BASEURL\", config.get(\"Example:ApiBaseUrl\", \"http://localhost:3001\")) + \"/\" + urlEncode(data.customer.id)"
  }
}
```

- `task.url` is a JSON view; call `.ToString()` before string methods. There is no `$"..."` interpolation:
  use `+` or `string.Format`.
- Splice data into a path or query through `urlEncode(...)`. `data.amount.AsDouble().ToString("0.00")`
  follows the server culture; `urlEncode(data.amount)` or `"" + data.amount` uses the JSON text.

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
| `task` | the task's `config` (JSON view); in the output phase, as the input phase left it | `task.url` |
| `config` | host configuration, same reach as `GetConfigValue` | `config.get("Example:ApiBaseUrl", "http://localhost:3001")` |
| `result` | output only: `body`, `headers`, `statusCode` | `result.body.score` |

- `urlEncode(value)` percent-encodes one URL component. `task`, `config` and `urlEncode` exist in task
  mappings only, not in condition rules.
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
