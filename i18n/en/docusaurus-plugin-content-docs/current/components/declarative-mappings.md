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
| `input` | the request body of the hop (not the task payload); `null` on timers, continuations and SubFlow resume — see [`input` and `headers`](#input-and-headers) | `input.amount` |
| `instance` | read-only view, **camelCase**: `id`, `key`, `flow`, `version`, `currentState`, `effectiveState`, `effectiveStateType`, `effectiveStateSubType`, `effectiveStatus`, `type`, `data` | `instance.currentState` |
| `now` | one timestamp per mapping | `now` |
| `user` | the caller: `available`, `roles`, `hasRole("x")` | `user.available && user.hasRole("approver")` |
| `context` | the legacy rule context (PascalCase, unchanged) | `context.Instance.CurrentState` |
| `task` | the task's `config` (JSON view); in the output phase, as the input phase left it | `task.url` |
| `config` | host configuration, same reach as `GetConfigValue` | `config.get("Example:ApiBaseUrl", "http://localhost:3001")` |
| `result` | output only: `body`, `headers`, `statusCode` | `result.body.score` |
| `headers` | the **incoming request's** headers, read-only; names are case-insensitive | `headers["x-channel"]`, `headers.has("x-channel")` |

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

## `input` and `headers`

`input` is **one value per hop**: the raw request body that triggered the hop. Every step of the hop reads the same value; task outputs never change it, and it is neither the merged instance data nor a task response.

| Trigger | `input` |
|---|---|
| Manual transition, instance start, `updateData`, retry | the request body (`null` on a retry with no body) |
| Task mappings on an event-triggered transition | the **mapped body** the event block (or event `mapping` script) built; not the raw event payload |
| The event block itself (`event.input`) | the event payload (after CloudEvent unwrapping; `null` for an empty body) — see [Event `input`](#event-input) |
| A function's `output` block and task mappings | the function's request body |
| Transition / start `schemas[]` rule | the transition request body **as sent** (before the `x-storage` file swap) |
| Fired timer, automatic continuation hop, SubFlow resume (completion, fault, cancellation) | `null` |
| Read paths (view selection, state / data functions) | `null` |

A rule tells the triggering hop from a continuation with `input == null`.

- **`x-encryption` fields arrive in plaintext** (`encrypt` and `hash`): encryption and hashing happen in the instance-data write funnel, after `input` was captured. Writing the field back to **its own path** keeps the protection; copying it to an **unprotected path** stores plaintext, and the runtime neither refuses nor logs it. `data.email` is the stored token and cannot be written to another path. Forge warns about these copies when the master schema is in the project.
- **`x-storage` fields arrive as the stored handle** (never the bytes). Exception: the transition / start `schemas[]` rule sees the request **as sent** (with `content`), because it validates the write shape; do not select a schema by file metadata, read a member the client sends next to the file.
- Headers and query parameters are not part of `input`.

`headers` is a read-only view of the incoming request's headers. It reads the same dictionary as `context.Headers`, so `Workflow:HeaderExposure:Deny` applies unchanged (a denied name is absent).

- Use the indexer for a hyphenated name: `headers["x-channel"]` (`null` when absent); `headers.has("x-channel")` returns a bool. `headers.x-channel` parses as a subtraction and does not compile. A value is text.
- **`task.headers` is not `headers`**: `task.headers` is the task's own configured **outgoing** headers (written with `"$.headers.x-channel"` targets); `headers` is the **incoming** request's. To forward one: `"set": { "$.headers.x-channel": "headers[\"x-channel\"]" }`.
- `headers` is not a `select` root (`"select": "$.headers.x"` is a publish error); read it with a `set` expression.

## Missing values and errors

- A missing `select` path, a missing leaf, `?.`, or a read through a missing intermediate
  (`data.customer.id` with no `customer`) makes that entry **write nothing**, without an error.
- Every other failure (a bad conversion, an unwritable path, a role read on a System hop) **fails the
  task**: the error boundary applies, and with none the instance faults; no part of the delta is written.
- A non-JSON response body is a string: `result.body.x` reads as missing, a `select` without `into` fails.
- **Methods are not called on JSON values; convert first**: `input.name.ToString().Substring(0, 3)`, `data.amount.AsDouble()`. An unknown method call on a present value (`input.name.Substring(40)`, `.ToUpper()`) fails the mapping; the same call through a missing intermediate (`data.missing.name.ToUpper()`) is still a missing source and writes nothing.

## Blocks outside task bindings

Three more sites take a declarative block in place of a C# `mapping` script: a transition's `output`, a SubFlow state's `input` and its `output`. The block grammar (`select`, `into`, `set`) and the expression rules are those of a task binding; what differs is the variables, the target document and where the result goes.

- `input` builds what goes **to** a callee, `output` writes what comes **back**. A single-block site rejects the other block at publish (an `input` member on a transition is a publish error: `'input' is not supported on a transition; use 'output'.`).
- `select` reads `result` when the site has one, otherwise the variables except `headers` (`$.data…`, `$.input…`); `headers` is never a `select` root.
- A block and a C# `mapping` on the same site is a publish error.

| Site | Target | Delta starts | Result goes to |
|---|---|---|---|
| Transition `output` | instance data | empty; `"select": "$.input"` keeps the whole request | transition record body, the single data append |
| SubFlow `input` | the child's start document `{ attributes, headers, key, tags }` | empty | the child start request |
| SubFlow `output` | instance data | empty | the parent's single data append |

Variables: `data`, `input`, `instance`, `now`, `user`, `context`, `headers` for transition `output` and SubFlow `input`. SubFlow `output` adds `result` (the `select` root, default `$.data`); there `input` is `null`, and `headers` / `user` are the child settler's.

### Transition `output`

Applies to `transitions[]`, `startTransition`, shared transitions and the well-known `cancel` / `updateData` / `exit`. Automatic and scheduled transitions reject `output`, like `mapping`: an automatic hop has no request to map. An empty delta is no data version.

```json
{
  "key": "submit",
  "target": "review",
  "output": {
    "select": "$.input.customer",
    "into": "$.customer",
    "set": { "$.submittedAt": "now", "$.reviewedByAuditor": "user.available && user.hasRole(\"auditor\")" }
  }
}
```

### SubFlow `input`

For `type: S` only; a `P` SubProcess rejects both blocks (it is started by its own task). The target document is `{ attributes, headers, key, tags }`:

- `select` needs `into`; `key` must be a string and `tags` an array of strings, anything else fails the start before a child is created. Convert a number with `.ToString()` (`"\"kyc-\" + data.customer.id.ToString()"`).
- `$.headers.sub` written blank stays blank (the instance-call credential rule).
- `input` is the request of the hop that entered the SubFlow state: `null` on an automatic chain and on a retry restart (on a retry, `user` and `headers` are the retrying requester's).

```json
"subFlow": {
  "type": "S",
  "process": { "key": "kyc-check", "domain": "core", "version": "1.0.0", "flow": "sys-flows" },
  "input": {
    "set": {
      "$.attributes.customerId": "data.customer.id",
      "$.attributes.amount": "input.amount",
      "$.headers.x-channel": "\"web\"",
      "$.key": "\"kyc-\" + data.customer.id.ToString()",
      "$.tags": "new string[] { \"kyc\" }"
    }
  }
}
```

### SubFlow `output`

Runs on completion **and** on fault; `result.status` (`"completed"` or `"faulted"`) tells them apart. `result` is `{ data, status }`. Child data arrives in plaintext. Script `Mutations` have no block equivalent.

```json
"subFlow": {
  "type": "S",
  "process": { "key": "kyc-check", "domain": "core", "version": "1.0.0", "flow": "sys-flows" },
  "output": {
    "select": "$.data.score",
    "into": "$.kyc.score",
    "set": { "$.kyc.outcome": "result.status", "$.kyc.settledAt": "now" }
  }
}
```

On failure each site fails with its script's error code (transition `output`: the transition mapping error; SubFlow `input`: `SubFlowInputMappingFailed`; SubFlow `output`: `SubFlowOutputMappingFailed`). A role-provider failure stays `Authorization:110006`; reading `user.roles` with no caller is a permanent failure.

## Event `input`, workflow `output` and function `output`

Three more sites take a block beside their script: an event's `input` (beside `mapping`), and a workflow's or a function's `output` (beside the `output` script). On these three, `select` and `into` are written **together** (either alone is a publish error), an empty block (`{"set":{}}`) is a publish error, and `headers` is never a `select` root. `select` reads the variables (`$.input…`, `$.data…`); on a function `output` it reads `result` and has no default.

| Site | Variables | Target document | Used for |
|---|---|---|---|
| Event `input` | `input`, `now`, `context`, `headers` | `{ key, attributes }` | the start / transition body of the event delivery |
| Workflow `output` | `data`, `input`, `instance`, `now`, `user`, `context`, `headers` | `{ data, statusCode, headers }` | the sync start / transition response |
| Function `output` | `data`, `input`, `instance`, `now`, `context`, `headers`, `result` | `{ data, statusCode, headers }` | the function response |

### Event `input`

`input` is the event payload after CloudEvent unwrapping (`null` for an empty body); `headers` are the event's headers (a deny-filtered view). `data`, `instance` and `user` do not exist here: naming one is a publish error. `attributes` starts empty; `key` is a string or left unset, anything else is a mapping failure. The instance lookup by filter (`Selector`) stays C#-only: a transition event whose block sets no `key` is ignored like an unmatched event. `mapping` and `input` on one event is a publish error (`event: 'mapping' and 'input' are mutually exclusive`); a stored event holding both runs the script, and one holding neither stays the runtime `EventDefinitionMissing`. The check covers the workflow `event` and every transition that carries an `event`.

```json
"event": {
  "input": {
    "select": "$.input.payload",
    "into": "$.attributes",
    "set": { "$.key": "input.customerId.ToString()", "$.attributes.channel": "headers[\"x-channel\"]" }
  }
}
```

`.ToString()` on an absent member (`input.customerId` missing from the payload) fails the mapping; guard an optional field with `input.customerId != null ? input.customerId.ToString() : null`.

A failure logs `EventMappingFailed` (40993), as the script does, with error code `EventMappingFailed` under the `Script.Execute` span, kind `eventMapping`.

### Workflow `output`

Shapes a sync start / transition response only, and never runs for a sub-flow instance. In the `output` JSON, an object with `location` or `code` is a script; one with `select` / `into` / `set` and neither of those is a block; members of both kinds together return a publish 400 (`InvalidWorkflow`, the message names `output`). A script `output` is stored byte for byte as before.

- `data` is the latest instance data (`x-encryption` fields stay tokens). `input` is the admitted hop payload when this process ran the hop: the start attributes after file offload, or the transition payload after the `x-storage` swap (a file member is the stored handle, never inline base64). It is `null` when no hop ran here: an idempotent start that returned an existing instance, a transition proxied to a SubFlow, a parent transition relayed to its active SubFlow.
- `statusCode` must be an integer JSON number and `headers` an object of string values; `data` absent or `null` is an empty response.
- Any block failure, a wrong-typed `statusCode` / `headers` included, falls back to the standard envelope, logs `WorkflowOutputScriptFailed` and marks the span as an error, exactly like a failing script.

```json
"output": {
  "select": "$.data.score",
  "into": "$.data.score",
  "set": { "$.statusCode": "201", "$.headers.x-score-band": "data.score.AsDouble() > 700 ? \"high\" : \"low\"" }
}
```

### Function `output`

`result` is `{ <variableKey>: { body, headers, statusCode } }` for every executed task (`variableKey`, or the task key's variable name); a skipped task is absent. `instance` is empty for a domain- or flow-scoped function.

- **No caller.** `user.available` is `false` and a block that reads `user` is a publish error (`function output has no caller: the function response cache does not vary by role`); the output script's caller is closed too.
- Order: the output script if present, else the block, else the old single-task extraction.
- `rawResponse: false`: the response is `{ <function key as variable name>: data }`; `statusCode` and `headers` are ignored and not type-checked, and publish warns when the block targets them (the message names `rawResponse`). `rawResponse: true`: `data`, `statusCode` (integer) and `headers` (object of strings) are used, and wrong types fail the call. The example below needs `rawResponse: true`.
- Binary responses (`byte[]`, `ScriptFile`) are script-only.
- The function response cache stores a block-built response like a script-built one.
- A failure is `ExtensionExecutionFailed` with the message `Function '{key}' output declarative output mapping failed: {detail}`, logged once as `FunctionOutputMappingFailed` (10280; script failures use it now too).

```json
"rawResponse": true,
"output": {
  "select": "$.fetch.body.items",
  "into": "$.data.items",
  "set": { "$.data.count": "result.fetch.body.items.AsArrayLength()", "$.statusCode": "200" }
}
```

### Failures

| Site | Error code | Span kind | Log event |
|---|---|---|---|
| Event `input` | `EventMappingFailed` | `eventMapping` | 40993 `EventMappingFailed` |
| Workflow `output` | falls back to the standard envelope | `Script.Execute` (error) | `WorkflowOutputScriptFailed` |
| Function `output` | `ExtensionExecutionFailed` | `Script.Execute` (error) | 10280 `FunctionOutputMappingFailed` |

## Example

A working end-to-end scenario: [`vnext-example` · declarative-mapping-lab](https://github.com/burgan-tech/vnext-example/tree/master/tests/Core.IntegrationTests/Tests/DeclarativeMappingLab).

## Related

- [Mappings](./mappings) — the `.csx` mapping guide
- [Interfaces](./interfaces) — `IMapping` and the other interfaces
- [Workflow](./workflow) — where task bindings live
