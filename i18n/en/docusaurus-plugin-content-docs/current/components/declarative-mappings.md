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

### Several headers

One `set` key per header. With the task configured as
`"headers": { "Content-Type": "application/json", "x-channel": "mobile" }`:

```json
"input": {
  "set": {
    "$.headers.x-channel": "\"web\"",
    "$.headers.x-customer-id": "data.customer.id",
    "$.headers.x-request-id": "instance.id",
    "$.headers.x-amount": "data.amount",
    "$.headers['x-correlation.id']": "instance.key",
    "$.headers.Accept-Language": "data.lang ?? \"tr-TR\"",
    "$.headers.x-approver": "user.available && user.hasRole(\"approver\") ? \"yes\" : \"no\""
  }
}
```

The task is called with:

```json
{
  "Content-Type": "application/json",
  "x-channel": "web",
  "x-customer-id": "c-42",
  "x-request-id": "8b1f…",
  "x-amount": "1250.5",
  "x-correlation.id": "BASVURU-001",
  "Accept-Language": "tr-TR",
  "x-approver": "no"
}
```

| Case | Result |
|---|---|
| Configured header the block does not touch (`Content-Type`) | Kept |
| Configured header the block writes (`x-channel`) | The block's value wins |
| Non-string value (`data.amount`) | Sent as its JSON text (`1250.5` → `"1250.5"`; an object → its JSON) |
| Hyphen in the name | Plain segment: `$.headers.x-channel` |
| Dot or space in the name | Bracket segment: `$.headers['x-correlation.id']` |
| Expression yields `null` or reads a missing value | Nothing written; the configured value stays |
| No `headers` (or `null`) in the configuration | An object is created first |
| Configured `headers` is not an object | The task fails |

- **`into: "$.headers"` replaces the whole object** — `{ "select": "$.data.outgoingHeaders", "into": "$.headers" }`
  drops `Content-Type`. `into` writes its target as it is, it never merges; add headers one `set` key at a time.
- A header cannot be removed: `null` means "write nothing". Send `"\"\""` for an empty value, or leave the header
  out of the task definition.

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

### What each part reads and writes

| Part | Reads | Writes |
|---|---|---|
| `select` | The task response only: `result` = `{ body, headers, statusCode }`; `$` is `result`, default `$.body` | — |
| `into` | The value `select` found | The delta (not instance data) |
| `set` key | — | The same delta |
| `set` value | Every variable: `result`, `data`, `input`, `instance`, `now`, `user`, `task`, `config`, `context` | — |

The block never edits instance data directly: it builds a delta, and the delta is merged once at the end. `data` in a
`set` expression is therefore the data **before** this task's output — what `into` just wrote to the delta is not
visible through `data`; read it from `result`.

### Worked example

Instance data before the task, and the task response:

```json
{ "customer": { "id": "c-42", "name": "Ayşe" },
  "kyc": { "level": "basic", "score": 10, "history": [1, 2] } }
```

```json
{ "statusCode": 200,
  "headers": { "x-request-id": "r-991" },
  "body": { "score": 87, "band": "A", "checks": ["id", "address"] } }
```

Block:

```json
"output": {
  "select": "$.body.score",
  "into": "$.kyc.score",
  "set": { "$.kyc.checkedAt": "now", "$.kyc.state": "instance.currentState" }
}
```

1. The delta starts empty.
2. `select` + `into`: `result.body.score` is `87`, written at `$.kyc.score` (missing objects are created) →
   `{ "kyc": { "score": 87 } }`.
3. `set`, in declaration order →
   `{ "kyc": { "score": 87, "checkedAt": "2026-11-24T10:15:03.123Z", "state": "kyc-check" } }`.
4. The delta is merged into the latest data and stored as a new data version:

```json
{ "customer": { "id": "c-42", "name": "Ayşe" },
  "kyc": { "level": "basic", "score": 87, "history": [1, 2],
           "checkedAt": "2026-11-24T10:15:03.123Z", "state": "kyc-check" } }
```

`kyc.level` and `kyc.history` survive (not in the delta), `kyc.score` changes 10 → 87, `band` and `checks` are not
written (`select` took only `score`).

### `select` / `into` combinations

With the response above:

| Authored | Behaviour | Delta |
|---|---|---|
| `select` + `into` | The selected value at `into` | `"select": "$.body.band", "into": "$.kyc.band"` → `{ "kyc": { "band": "A" } }` |
| `into` only | `select` defaults to `$.body` | `"into": "$.kyc.response"` → `{ "kyc": { "response": { "score": 87, "band": "A", "checks": [...] } } }` |
| `select` only | The selected **object's members** merge at the data root | `"select": "$.body"` → `{ "score": 87, "band": "A", "checks": [...] }` |
| `select` only, value not an object | The task fails | `"select": "$.body.score"` → `87` cannot merge at the root |
| Neither | Only `set` runs | Whatever `set` writes |

Response headers and status code are readable too:

```json
"set": {
  "$.audit.requestId": "result.headers[\"x-request-id\"]",
  "$.audit.httpStatus": "result.statusCode",
  "$.kyc.approved": "result.body.score.AsInt32() >= 70"
}
```

### Collisions and edge cases

- **Later wins:** `into: "$.kyc.score"` then `set: { "$.kyc.score": "result.body.score.AsInt32() * 2" }` → `174`.
- **A parent path replaces the whole subtree in the delta:** a `set` key `"$.kyc"` replaces what `into` wrote under
  `kyc`; the stored `kyc.level` still survives, because the final merge is deep.
- **No path inside a non-object:** after `into` wrote `87` at `$.kyc.score`, a `set` key `"$.kyc.score.detail"` fails
  the task (`'score' exists and is not a JSON object`).
- **`data` is the previous value:** `{ "$.kyc.previousScore": "data.kyc.score" }` writes `10`.
- **Failure is all or nothing:** any error other than a missing value ([Missing values and errors](#missing-values-and-errors))
  writes no part of the delta.

### Effect on instance data

1. **Objects merge deeply, key by key**; a field not in the delta is never removed.
2. **Arrays are replaced whole**: `{ "$.kyc.history": "result.body.checks" }` turns `[1, 2]` into
   `["id", "address"]`. This is why write paths take no `[n]` / `[*]`; `select` may read `"$.body.checks[0]"`.
3. **A field cannot be removed**: a `null` from `set` writes nothing, and the merge never clears an existing key with
   `null`. Use a sentinel (`""`, `false`, `"cleared"`) where "cleared" must be expressible.
4. **Nothing written, no version.**

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
