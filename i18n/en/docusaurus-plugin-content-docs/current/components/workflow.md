---
sidebar_position: 0
title: Workflow
description: vNext Workflow component — definition, types, capability matrix, and special transitions
---

# Workflow

A **Workflow** is the core **definable unit** modeling business processes on the vNext platform. Defined as JSON and validated against `vnext-schema`.

> **Schema:** [`vnext-schema/workflow-definition.schema.json`](https://github.com/burgan-tech/vnext-schema)

## Workflow Types

| Code | Type | Description | Typical Usage |
|---|---|---|---|
| **C** | Core | Platform core workflows | System operations, platform services |
| **F** | Flow | Main workflows | Business main processes, user interaction |
| **S** | SubFlow | Sub workflows | Reusable process pieces |
| **P** | SubProcess | Sub processes | Parallel and independent operations (fire-and-forget) |

## Required Top-Level Fields

Every workflow definition must include the following top-level fields (per `vnext-schema` `required`):

| Field | Type | Description |
|---|---|---|
| `key` | string | Unique workflow identifier (unique within domain) |
| `flow` | string | Categorization flow name |
| `flowVersion` | string | Flow version (SemVer) |
| `domain` | string | Owning domain |
| `version` | string | Workflow definition version (SemVer) |
| `tags` | string[] | Tags — for query/filter |
| `attributes` | object | The actual workflow definition (below) |

## `attributes` Structure

`attributes` is the workflow's behavioral definition. The schema requires:

- `type` — workflow type (C/F/S/P)
- `states` — list of workflow states. Since v0.0.99 **at most one** `Initial` state (`stateType: 1`) may be declared and it is optional; without one the instance is born in the runtime's implicit `$start` state and `startTransition.target` decides where it enters (see [Start without an Initial state](#start-without-an-initial-state-start))
- `startTransition` — start transition definition
- `labels` — multi-language labels

Optional fields include `executionType` (v0.0.99, see [Execution mode](#execution-mode-executiontype)), `history` (<sup>New</sup> v0.0.100: `full` — the default — or `none`; see [History mode](#history-mode)), `schema`, `timeout`, `functions`, `extensions`, `sharedTransitions`, `errorBoundary`, `cancel`, `exit`, `updateData`, `queryRoles`, `rowSecurity` (<sup>New</sup> v0.0.102: role-keyed row filters for the instance list, the single GET and the `GetInstances` / `GetInstance` tasks; deny by default when declared — see [Row Security](/docs/concepts/row-security)), `scripts`, `output` (sync response mapping — see [Output Mapping](#output-mapping)), `event` (workflow-level event definition — see [Event-Driven Transitions](#event-event-driven-workflows)), and `config` (flow-level configuration — currently built-in function cache tuning, `config.functionCache.ttlSeconds`; host default 60s; the State Function is managed separately by the platform).

## Capability Matrix

Which sub-features each workflow type **typically uses**:

| Feature | Core (C) | Flow (F) | SubFlow (S) | SubProcess (P) |
|---|---|---|---|---|
| **states** (required) | ✓ | ✓ | ✓ | ✓ |
| **startTransition** (required) | ✓ | ✓ | ✓ | ✓ |
| **labels** (required) | ✓ | ✓ | ✓ | ✓ |
| **schema** (master schema) | ✓ | ✓ | ✓ | ✓ |
| **functions** | ✓ | ✓ | ✓ | ✓ |
| **extensions** | ✓ | ✓ | ✓ | ✓ |
| **sharedTransitions** | – | ✓ | ✓ | – |
| **errorBoundary** (global) | ✓ | ✓ | ✓ | ✓ |
| **timeout** | – | ✓ | ✓ | ✓ |
| **queryRoles** | – | ✓ | ✓ | – |
| **cancel** (special transition) | – | ✓ | ✓ | – |
| **exit** (special transition) | – | ✓ | – | – |
| **updateData** (special transition) | – | – | ✓ | – |

> **Note:** The "typical usage" reflects practical patterns; the schema technically accepts all fields for any type.

## Special Transitions

### MasterSchema

The workflow's **`schema`** field defines the main structure of **instance data**. Enables advanced filtering and **consistency checks** at every change point of instance data. See [Schema component](/docs/components/schema).

### Update Data

A specially defined transition. Used to update instance data without locking the instance — and to advance the instance under parallel load. `target` must always be `$self`. See [Transition Execution Model](#transition-execution-model-lock-and-busy-check) below for its execution semantics.

### Start without an Initial state (`$start`)

Since v0.0.99 a workflow may declare **at most one** Initial state; it is no longer required.

- With an Initial state, behavior is unchanged.
- Without one, the instance is born in the reserved implicit **`$start`** state (no tasks, view or transitions; typed Initial; never listed in `states`) and `startTransition.target` decides where it enters. The first transition record is `$start → step-1`.
- `currentState` may temporarily be **`$start`** until the start transition commits (async start, subflow child creation).
- `startTransition.target` must be a **declared state**; `$self`, `$start` or empty are rejected at publish.
- An instance stranded at `$start` (async start job failed permanently) can only leave through well-known transitions with no `availableIn` restriction; `availableIn` cannot name `$start`.

Publish errors: `Workflow may contain at most one initial state. Found: N.` · `State key '$start' is reserved by the runtime.` · `StartTransition must declare a target state.` · `The 'target' value in StartTransition does not match any state 'X'.` Requires vnext-schema `0.0.55`.

### Rule-based schema selection (`schemas`)

<sup>New</sup> v0.0.105 Every transition kind — state transitions, `sharedTransitions`, `startTransition`, `cancel`, `updateData` and `exit` — may declare a rule-based `schemas` list next to the single `schema` reference. The shape is the one the function `inputSchema` slot already uses, and the selection semantics match [rule-based view selection](/docs/how-to/view-selection) (`views`): the request body is validated against the schema of the entry whose rule matches.

```json
{
  "key": "submit",
  "target": "done",
  "triggerType": 0,
  "versionStrategy": "Major",
  "labels": [{ "label": "Submit", "language": "en-US" }],
  "schemas": [
    {
      "rule": { "location": "./src/IsCorporate.csx", "code": "<base64>", "encoding": "B64" },
      "schema": { "key": "corporate-payload", "domain": "core", "flow": "sys-schemas", "version": "1.0.0" }
    },
    {
      "schema": { "key": "retail-payload", "domain": "core", "flow": "sys-schemas", "version": "1.0.0" }
    }
  ]
}
```

The list may be written as a bare array or in the wrapped `{ "schemas": [...] }` form (the runtime always writes the wrapped form back). Each entry carries only `rule` (optional) and `schema` (required).

**Selection rules:**

1. Entries are evaluated **in declaration order**; the **first entry** whose `rule` matches **wins**.
2. An entry without a `rule` always matches — it is the fallback and must be the **last entry**.
3. When `schemas` is declared it **overrides** `schema`.
4. Automatic (`triggerType: 1`) and scheduled (`triggerType: 2`) transitions **may not** declare `schemas` (there is no request carrying a body).
5. A rule that cannot be evaluated (throws) is logged and skipped — except when the caller's roles cannot be read (see below).

**Outcomes (write path):**

| Case | Result |
|------|--------|
| An entry matched | The body is validated against that entry's schema; violation → `400` with field-level errors (same format as a single `schema`) |
| `schemas` declared, no entry matched | `400` `Transition:100025` — regardless of the body. The instance keeps its state, is **not** faulted, and no transition record is written |
| Neither `schema` nor `schemas` declared | The request is accepted without validation (unchanged) |

**Rule context.** The rule is an [IConditionMapping](/docs/components/interfaces#iconditionmapping) script. Its context carries the workflow, instance, runtime, transition, `body` (the instance's **latest data**; `{}` when there is none) and the request headers. There are **no query parameters**, and the rule **does not see the request body** — a caller cannot pick its own schema through the body. The rule may read the caller's runtime-resolved roles through `context.Caller`; if the role provider cannot answer, selection does not fall through to the fallback but fails with `503` `Authorization:110006` — see [Mappings → Caller](/docs/components/mappings#caller).

On `startTransition` the instance has no data yet, so `body` is `{}`: select by header (or by role through `context.Caller`).

```csharp
public class IsCorporate : ScriptBase, IConditionMapping
{
    public Task<bool> Handler(ScriptContext context)
    {
        string segment = context.Headers?["x-segment"]?.ToString();
        return Task.FromResult(string.Equals(segment, "corporate", StringComparison.OrdinalIgnoreCase));
    }
}
```

:::note[Validation order]
Schema resolution (rule scripts included) runs **before** the state-machine / actor-type policy check. A request in the wrong state (or from the wrong actor) that matches no entry therefore gets `400` `Transition:100025` first. Role authorization is not decided on this write path (the gateway decides), so there is no `403` to take precedence here.
:::

**Read path.** The transition schema function returns the matched entry's schema, or `404` when nothing matches. `hasSchema` in the state function's transition lists looks at the **declaration** only (`schema` or a non-empty `schemas`), like `hasView`. The schema function's cache key and ETag include the non-volatile request headers, so a header-driven rule never serves the entry selected for another header value.

| Code | HTTP | When |
|------|------|------|
| `Transition:100025` | 400 | `schemas` declared, no entry matched (`TransitionSchemaNotMatched`) |
| `Authorization:110006` | 503 (retryable) | A rule read the caller's roles and the role provider could not answer (`CallerRolesUnavailable`) |

:::tip[Selection is not authorization]
Selecting a schema by role or header is a contract choice, not an access decision. Write rules as positive tests (`HasRoleAsync("x")`) and make the rule-less fallback the **least-privileged** contract.
:::

The function `inputSchema` slot uses the same mechanism; the only difference is that no match returns `Function:800006` — see [Custom Functions → When no rule-based entry matches](/docs/components/functions/custom#when-no-rule-based-entry-matches).

Working example: [vnext-example `core/Workflows/rule-schema-lab/rule-schema-lab.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/rule-schema-lab/rule-schema-lab.json) (`src/IsApproverRole.csx` for the role-based entry). Schema package: vnext-schema `0.0.60`.

### Start transition authorization (`startTransition.roles`)

<sup>New</sup> v0.0.105 Until this release `startTransition.roles` was evaluated nowhere. Now the gateway, before forwarding `POST …/workflows/{workflow}/instances/start`, calls the workflow-scoped `GET /api/v1/{domain}/workflows/{workflow}/functions/authorize?type=instance` function, which decides — before any instance exists — from `startTransition.roles`. The runtime does **not** check the roles itself during `instances/start`; as for every other transition, the gateway decides. Static roles and `$Everyone` compare as usual; instance-bound grants (`$InstanceStarter`, `$PreviousUser`, `$user.` / `$role.` context references, etc.) **never match** before a start — a start guarded only by `allow $InstanceStarter` is closed to everyone. Without `roles` the start is open to everyone. For the route, the `version` parameter and the gateway rule see [Authorization](/docs/concepts/authorization).

### Execution mode (`executionType`)

Since v0.0.99 `executionType` (`"S"` sync / `"A"` async) may be set on the flow (`attributes.executionType`), on state transitions, `sharedTransitions` and `startTransition`. **Precedence:** transition → flow → the caller's `?sync` query (default `false` = async); when the definition sets a value the query parameter is ignored. Not applied to automatic transitions, runtime-internal paths or subflow start/forward. Effective sync → `200` + full instance; async → `202` `{ id, status }`. Trace tags: `vnext.execution.requested`, `vnext.execution.effective` (`SYNC`/`ASYNC`), `vnext.execution.overridden=true` only when the definition changed the caller's mode. Invalid value → publish error `Unknown execution type: X`. See [Sync vs Async execution](/docs/how-to/async-sync).

<sup>New</sup> v0.0.104 A sync (`200`) start / transition response also carries `currentState` and `effectiveState` next to `status` / `effectiveStatus` — the same values as the instance GET's `metadata.currentState` / `metadata.effectiveState` (no SubFlow descent). An async `202` carries neither. For using them from a sync SubProcess task see [Sync SubProcess task output: child state](#sync-subprocess-task-output-child-state). `executionType` itself adds no response field.

```json
{ "key": "submit", "target": "review", "triggerType": 0, "executionType": "S" }
```

### Shared Transitions

**Common transitions** accessible from multiple states. Specify via `availableIn` array which states can trigger it. Since v0.0.99, `roles` on transitions and `availableIn` entries also accept `allOf` / `anyOf` combinators — see [Authorization](/docs/concepts/authorization).

### Cancel

A specially defined transition. When a flow receives a cancel request, it broadcasts **cancel** to its sub flows if any. Sub flows that lack a cancel definition are bypassed.

### Exit

A specially defined transition. Used especially in **client implementations** to terminate active live instances on screen exit or screen leave events.

### Timeout

If `timeout` is defined when starting an instance, it is **scheduled**. When the time arrives during the active period, it executes and ends the instance. If the flow ends earlier, the scheduled job is cancelled.

### Functions

Defines the list of **functions** that will run for the flow and instance. Each function can be pinned with `version`.

### Extension

Defines the list of **extensions** that will run for the flow and instance. Extensions enrich instance data.

### Scripts (Helpers & Allowed Assemblies)

`attributes.scripts` declares **helper** references and **allowed assemblies** effective across the whole flow:

```json
"scripts": {
  "helpers": [
    { "key": "rsa-crypto", "version": "1.0.0", "domain": "core", "flow": "sys-mappings" }
  ],
  "allowedAssemblies": ["System.Security.Cryptography"]
}
```

Since v0.0.99 every declared `allowedAssemblies` name (flow level or any script slot) is checked at publish: it must resolve as a framework (TPA) assembly or a DLL in `Scripting:Sandbox:PluginDirectory`, otherwise publish returns `400` (`Assembly '{name}' declared in '{member}' is not available in this runtime …`). The check runs even with `Scripting:Sandbox:Enabled=false`.

The same `scripts` object can be defined on any mapping object. Mapping `encoding` may also be **`REF`** (a reference to a sys-mappings component instead of inline code). See [Mapping Component](/docs/components/mapping-component) and [Scripting / Sandbox](/docs/configuration/scripting).

### Output Mapping

`attributes.output` is an optional **output mapping** for the workflow (standard `scriptCode` object implementing `IOutputHandler`). When an instance is started or transitioned with **`sync=true`**, the script's result is returned **directly as the HTTP response body** — together with the script's `statusCode` and `headers` — instead of the standard `StartInstanceOutput` / `TransitionOutput` envelope, mirroring Function endpoint behavior.

```json
"attributes": {
  "type": "F",
  "output": {
    "type": "L",
    "code": "<base64-encoded IOutputHandler script>",
    "encoding": "B64"
  }
}
```

- Applies only to `sync=true` requests; the `sync=false` response (`{ id, status }`) is unchanged.
- **Subflow instances are excluded**: `/sub/instances/start` and subflow transitions keep the standard envelope (parent/child correlation relies on it).
- If the output script fails, the platform logs the error and falls back to the standard response.

### Event (Event-Driven Workflows)

A workflow can react to external pub/sub events in two independent ways:

- **`attributes.event`** (workflow level): an external event may **start a new instance** (`action=start`).
- **`transition.event`** with **`"triggerType": 3`** (transition level): an external event may **run the transition** on an existing instance (`action=transition&transitionKey=<key>`). Event transitions are supported on state transitions and shared transitions only; delivery to a non-event transition is rejected with `NotAnEventTransition`.

The `event` object has a single field, `mapping` — a standard `scriptCode` implementing [`IEventMapping`](/docs/components/interfaces) that turns the raw event payload into an `InstanceKey` + `Body` (or a fluent `Selector` when the payload carries no key).

```json
{
  "key": "abort-order",
  "target": "aborted",
  "triggerType": 3,
  "event": {
    "mapping": { "location": "./src/AbortEventMapping.csx", "code": "<base64>" }
  }
}
```

See the [Event-Driven Workflows guide](/docs/how-to/event-driven-workflows) for correlation rules, Dapr Subscription delivery, and runtime behavior.

### Resource Lock

Start, state-level, and shared transitions may declare an optional `resourceLock` block — a distributed lock (Dapr `lock.redis` by default; an optional Postgres lease provider since v0.0.106) that prevents concurrent instances from mutating a shared resource. It runs in the **Manual** profile only. The recommended model is to `Acquire` on the entry transition and let the runtime auto-release the lock when the instance reaches a terminal state. See the [Resource Lock guide](/docs/how-to/resource-lock) for the full behavioral model, `keyExpression` authoring, conflict/409 handling, and examples.

<sup>New</sup> v0.0.106 `onConflict` takes two values: `Abort` (default — the instance faults, `409 Execution:200010`) and `Reject` (schema 0.0.61 — the instance is left untouched, `409 Execution:200014`, the same call can be retried). With `Abort`, an `errorBoundary` rule for `Execution:200010` that names a `transition` reroutes the losing instance instead of faulting it. `ttlSeconds` > 0 is required at publish for `Acquire` / `Extend`.

### Query Roles

Authorization mechanism. Holds the information about **who can query** the workflow and the states within an instance. `queryRoles` can be defined at two levels: the **flow (root)** level and each **state** level. **Precedence:** the instance's **current state** `queryRoles` is evaluated first; if the state has none, the flow-level `queryRoles` is used as the base. Since v0.0.95 the decision is made by `authorize?queryRoles=true`, called by the Internal Gateway; read functions no longer return `403` in-process. Since v0.0.99 that decision is taken **at the deepest active SubFlow leaf only** (parent-stamped override ?? leaf state `queryRoles` ?? leaf workflow `queryRoles`); the root/intermediate AND was removed, which loosens access where the root declares `queryRoles` but the leaf has none — add `subFlow.overrides.states.<state>.queryRoles` or leaf `queryRoles` where needed. `allOf` / `anyOf` combinators are accepted in `queryRoles` since v0.0.99. See [Built-in Functions → QueryRoles authorization in read functions](/docs/components/functions/built-in#queryroles-authorization-in-read-functions) and [Authorization](/docs/concepts/authorization).

### State Notifications

A state may declare a `notifications` array. After the transition pipeline completes, the platform **enqueues** each notification and processes it **durably** — independently of the task pipeline. The Dapr Binding convention is the same as the [Notification Task](./tasks/notification) (`vnext-notification-state`). Mapping uses `IStateNotificationMapping`.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | integer | yes | Notification type. Currently only `0` (State) is supported |
| `mapping` | scriptCode | yes | `IStateNotificationMapping` implementation |
| `rule` | scriptCode \| null | no | Condition script. If absent or `null`, the notification fires on every state entry |

```json
{
  "key": "waiting-approval",
  "stateType": 2,
  "notifications": [
    {
      "type": 0,
      "mapping": { "type": "L", "code": "<base64-encoded-script>", "encoding": "B64" },
      "rule": { "type": "L", "code": "<base64-encoded-condition>", "encoding": "B64" }
    }
  ]
}
```

See [IStateNotificationMapping](/docs/components/interfaces) · [Notification Task](./tasks/notification).

### State Interaction (Long Poll)

A state may declare an optional `interaction.longPoll` block that makes **long-poll termination declarative**. The runtime keeps the State Function request open until a transition occurs or the fallback timeout elapses, so different clients can model their own stop points across a process.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `terminate` | boolean | yes | Whether leaving the state closes the open long-poll request |
| `fallbackTimeoutSeconds` | integer | no | Max seconds to hold the request open before falling back (`minimum: 1`). If the client cannot send an ack, the platform closes the request automatically after this duration |
| `roles` | array | conditional | Roles allowed to use the long-poll interaction. DENY overrides ALLOW; `allOf` / `anyOf` combinators accepted since v0.0.99 |

```json
{
  "key": "waiting-approval",
  "stateType": 2,
  "interaction": {
    "longPoll": {
      "terminate": true,
      "fallbackTimeoutSeconds": 30,
      "roles": [{ "role": "client.app", "grant": "allow" }]
    }
  }
}
```

#### The `interaction` object in the State response

When the State function response carries the `interaction` object depends on `terminate` (always subject to the interaction gate: `rule`, else `roles`, else allow):

- **`terminate: true`** — since v0.0.95 the block is returned **only while an ack is outstanding** (the pipeline paused on entry and no ack/fallback has arrived yet). It carries `ack.href`.
- **`terminate: false`** — since v0.0.98 the block is returned **whenever the instance is in the declaring state**, with **no `ack`**; nothing is armed server-side. (v0.0.95–v0.0.97 suppressed it by mistake.)

```json
"interaction": { "terminateLongPoll": false, "fallbackTimeoutSeconds": 120 }
```

```json
"interaction": { "terminateLongPoll": true, "fallbackTimeoutSeconds": 60, "ack": { "href": "/api/v1/core/workflows/account-opening/instances/{id}/longpoll/ack" } }
```

- `terminateLongPoll` and `fallbackTimeoutSeconds` are always present; `fallbackTimeoutSeconds` is the effective value (the state's own or a parent override; default `60`).
- `terminateLongPoll: true` → the client terminates its long-poll, renders the entered state, and acknowledges via `ack.href` (a scheduled fallback resumes the pipeline if not acknowledged in time).
- `terminateLongPoll: false` → no ack; `fallbackTimeoutSeconds` replaces the client's default long-poll window (default 60s; a state declaring `120` → the client polls for 120s).
- `ack` is present only when `terminateLongPoll` is `true`. In a subflow the child's block bubbles up and `ack.href` is rewritten to the polled (top) instance.

#### Long Poll Acknowledge

When the client finishes consuming the long-poll response, it calls the **acknowledge** endpoint to inform the platform:

```
POST /api/v1/{domain}/workflows/{workflow}/instances/{instance}/longpoll/ack
```

If the client fails or cannot send the request, the platform automatically closes the long-poll after `fallbackTimeoutSeconds` elapses — preventing stuck connections on client crash or network failure.

#### Interaction wait (Busy subType + interaction)

<sup>New</sup> v0.0.102 A state with `subType: 5` (Busy) that declares an `interaction` is an **interaction wait**: the instance deliberately rests **Busy** there and waits for an outside trigger (usually an `updateData` whose data opens the state's automatic transition). Nobody owns that Busy. Both ways out no longer stall:

- **The trigger arrives:** an armed timer of the state that is not yet due no longer counts as the Busy's live owner — only a timer whose time has come does. Before, a far-off timeout counted as the owner and the automatic transition satisfied by `updateData` was dropped (`Instance:100031`).
- **The trigger never arrives:** when the state's scheduled transition fires, it **takes the parked Busy over** and runs (log EventId 10181). It is still refused when the Busy has a live owner (another transition's job), while a long-poll acknowledge is pending, or when an open SubFlow holds the instance.

Only the timer qualifies: a **client request in the same state is still refused**. A Busy-subtype state without `interaction` keeps the old rule — its timer is refused as busy. Example: [vnext-example `busy-subtype-armed-timer`](https://github.com/burgan-tech/vnext-example/tree/master/core/Workflows/busy-subtype-armed-timer).

See [Sync vs Async execution](/docs/how-to/async-sync).

### Error Boundary

The **global error handling** definition at the workflow level. Applied if no boundary is defined at task or state level.

## Automatic Transition Order

Since v0.0.102 a state's automatic transitions are evaluated in a defined order and **the first satisfied rule wins**; the rest are not evaluated. An automatic transition may declare an optional `priority`:

| Field | Type | Required | Description |
|---|---|---|---|
| `priority` | integer | no | Evaluation priority among the state's automatic transitions (`minimum: 1`, absent = `100`). Lower is evaluated first. Valid **only on state-level, non-default automatic** transitions (`triggerType: 1`, not `triggerKind: 10`) |

1. Non-default automatic transitions come first, by `priority` **ascending** (a transition without `priority` counts as `100`).
2. Transitions with the same effective priority keep their **declaration order** (stable sort). A state without any `priority` is therefore evaluated in declaration order.
3. The default automatic transition (`triggerKind: 10`) is **always last** and is taken only when no other rule was satisfied.

```json
"transitions": [
  {
    "key": "to-low", "target": "low", "triggerType": 1, "priority": 30,
    "versionStrategy": "Minor", "labels": [{ "language": "en-US", "label": "To Low" }],
    "rule": { "location": "./src/LowRule.csx", "code": "<base64>" }
  },
  {
    "key": "to-high", "target": "high", "triggerType": 1, "priority": 10,
    "versionStrategy": "Minor", "labels": [{ "language": "en-US", "label": "To High" }],
    "rule": { "location": "./src/HighRule.csx", "code": "<base64>" }
  },
  {
    "key": "to-fallback", "target": "fallback", "triggerType": 1, "triggerKind": 10,
    "versionStrategy": "Minor", "labels": [{ "language": "en-US", "label": "Fallback" }]
  }
]
```

`to-high` is evaluated **first** even though it is declared second; `to-fallback` is taken only when neither rule is satisfied.

- **Evaluation is sequential** (not parallel): put cheap and likely rules at a low `priority` number — an expensive rule is only paid for when nothing before it was satisfied.
- If a rule's script **throws**, the step fails and later rules are not evaluated; a throwing rule is not skipped. The failure follows the error boundary like any other step failure.
- **Publish validation:** `priority < 1`; `priority` on a manual, shared or start transition; `priority` on the default automatic transition (`triggerKind: 10`) → publish error. Automatic transitions of one state sharing an effective priority while at least one declares it explicitly → publish warning (log).

:::warning[Behaviour change: absent `triggerKind` vs `triggerKind: 0`]
Before this release the runtime sorted automatic transitions by the nullable `triggerKind`: a transition with no `triggerKind` was evaluated **before** one with an explicit `triggerKind: 0`, regardless of its array position. Both now keep declaration order. In states that mix the two and have more than one satisfiable rule, the winner can change. **Action:** in such states declare the transitions in the intended order, or give the one that must win a lower `priority`. Flows that do not mix the two evaluate exactly as before.
:::

:::note[Rollback]
A runtime older than this release ignores `priority` and evaluates in array order (with the `triggerKind` exception above). Do not roll the runtime back below this release while a flow depends on `priority`.
:::

Working example: [vnext-example `core/Workflows/auto-priority-lab/`](https://github.com/burgan-tech/vnext-example/tree/master/core/Workflows/auto-priority-lab). For its place in the pipeline see [Transition Pipeline](/docs/concepts/transition-pipeline).

## Transition Execution Model: Lock and Busy Check

As of v0.0.79, transition execution uses the **Busy-as-mutex** model: the instance's `Busy` status is itself the execution mutex. Admission performs an Active→Busy check-and-set under a short **status lock** (5s lease); the pipeline and the auto-transition chain then run lock-free. The previous long-lease distributed lock (chain-token) is gone from the transition path entirely.

Each transition type participates differently — and these differences matter in flow design:

| Transition type | Status lock | Busy check | Behavior |
|---|---|---|---|
| `stateTransition` / `sharedTransition` | Holds | **Applies** | Request is rejected with **409** while the instance is `Busy`; when Active, it is flipped to Busy and the pipeline runs |
| `cancel` / `exit` | Holds | **Exempt** | Admitted even on a Busy instance (bypass); starts the cancel/exit flow |
| `updateData` | **Exempt** | **Exempt** | Admitted unconditionally; never sets or settles Busy |

### updateData: Reserve Transition

`updateData` is a **reserve** transition: exempt from every lock and busy check, and **status-neutral** — it never sets or settles Busy, so it cannot strand an instance in Busy. It is **the one and only way to update data and advance an instance under parallel requests** — hammering `stateTransition` in the same scenario produces 409s on Busy collisions.

Its behavior splits on the instance's situation:

- **Plain instance (no active subflow):** data is updated and the **normal transition pipeline runs** — `$self` state change, `onExecutionTasks`, and auto-transition evaluation at the end of the pipeline (order 80). A satisfied auto reserves ownership at the continuation boundary and advances the instance (taking over parked Busy when no live owner exists).
- **In an active subflow:** when the instance defines `updateData`, the request is **answered by the parent even while an active subflow is running — it is never forwarded**: the parent's data is updated and left as-is; the pipeline does not advance the instance and the subflow is not disturbed.

Autos are evaluated after **every** `updateData`, so "accumulate data, advance when the threshold is met" (fan-in) patterns work safely under an updateData storm.

:::tip[Flow design notes]
- In scenarios that keep pushing data while the instance is active (telemetry, parallel service results, background tasks), give the client **`updateData`**, not `stateTransition`.
- Under parallel `updateData`, mappings should return **delta-only** output: a full echo can overwrite concurrent writers' fresher values with stale copies.
- Each accepted `updateData` produces two data rows (request payload + task output). The data version is computed as `MAX(VersionNo)+1` under a per-instance `FOR UPDATE` lock; every row is persisted the moment it is produced.
- To run the same task more than once at the same order, give each entry a distinct `variableKey` (v0.0.99); otherwise their responses file under the same slot and publish rejects the definition — see [Tasks → Execution Order](/docs/components/tasks/).
:::

> **Reference:** [vnext #877](https://github.com/burgan-tech/vnext/pull/877) — Busy-as-mutex locking, status-neutral updateData, and immediate InstanceData persistence.

### SubFlow transition proxy

<sup>New</sup> v0.0.100 A forwardable transition that arrives at a parent with an active `S` SubFlow is **no longer queued on the parent**; it is forwarded straight to the active child (behavior change):

- **Nothing is written on the parent.** The parent does not reserve the chain, flip Busy or schedule a job; it forwards the request **unchanged** to the active child. Intermediate levels repeat the check, so the request reaches the deepest active SubFlow (the **leaf**).
- **The mode is resolved once, on the parent** (transition `executionType` → flow `executionType` → `?sync`) and the child is called in that mode — async stays async. See [Execution mode](#execution-mode-executiontype).
- **The leaf runs in its own scope:** it validates with its own schema, writes `x-storage` files with its own binding, and takes its own Busy and job.
- **The response** carries the parent's id and the child's status (async `202`, sync `200`).
- **Leaf rejections are now synchronous.** The leaf's `403` / `400` / `409` reaches the client directly; previously the parent answered `202`.
- **Completion window:** if the child has completed while the parent's correlation is still open, or the child does not exist yet, the parent answers **`409` `InstanceBusy`** — retry after a short wait. (A correlation pointing at a never-created child is a data defect; then the `409` is permanent.)
- **Never forwarded:** `updateData`, `cancel`, `exit`, the timeout, and parent shared transitions **available in the current state** are handled on the parent. A parent shared transition not available in the current state is forwarded (the leaf normally answers `400`).
- Added cost is about **5 ms** at p50.

:::info[Deprecation: `subflow-chain-reserve-claim`]
The old accept-time chain reserve (the `ChainReserved` claim, the `…/busy` and `internal/busy-release` routes) is **deprecated** since v0.0.100 and will be removed no earlier than v0.0.103. This runtime keeps the receiving side: a reserved relay from an older parent is still admitted at the leaf as before. **Mixed-version domains need no action.**
:::

### SubFlow: resolved version and carried headers

- **Resolved version** <sup>New</sup> v0.0.102: the parent writes the child's **resolved** version (the `flowVersion` of the child's start response) to the correlation — not the authored reference in `process.version` (`1.0`, `latest`). Later parent reads (forward, descent, human task, retry) never re-resolve the floating reference; a running child stays on its version even if the child flow's default version moves. An older remote runtime that returns no `flowVersion` keeps the authored reference. See [Flow Default Version](/docs/concepts/flow-default-version).
- **Carried headers** <sup>New</sup> v0.0.102: the headers of the request that settled the child (finish/exit, cancel, or a fault on a request) travel to the parent. The parent's output mapping sees them as `context.Headers`, and by default the parent's resumed hop runs with them (auto conditions, onEntry tasks, the next subflow's input mapping). A child finished by a timer or timeout carries nothing. For the contents, the excluded headers and the opt-out see [Interfaces](/docs/components/interfaces).

### Sync SubProcess task output: child state

<sup>New</sup> v0.0.104 SubProcesses (`P`) are not started at state level but by a [SubProcess task](/docs/components/tasks/trigger#4-subprocesstask-type-14) (type `14`). When the task runs **sync** (`SetSync(true)`), its output now carries the child's `currentState` and `effectiveState`, so the output mapping can see where the child stopped without an extra read. The path depends on the route:

```csharp
// SubProcess (sync) OutputHandler
var state = context.Body?.data?.value?.currentState   // same-domain start: the output is nested under data.value
         ?? context.Body?.data?.currentState;         // cross-domain start: the remote body is passed through flat (data.*)
```

- These are the instance's **own persisted state** — same names and values as the instance GET's `metadata.currentState` / `metadata.effectiveState`; there is no SubFlow descent. They are **not** the state function's `state` (the active SubFlow leaf's state).
- If the child auto-advances out of its initial state, the value is the state it **came to rest in**, not the one it was born in.
- An **async** (`202`) response carries neither field. A pipeline that produced its response from a `ClientResponse` has no instance, so both stay `null`.
- The same fields are returned on the sync start / transition response (`?sync=true` or `executionType: S`) — see [Execution mode](#execution-mode-executiontype).

Working example: [vnext-example `sync-subprocess-state-lab`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/sync-subprocess-state-lab/src/SspStartChildMapping.csx) (task: [`ssp-start-child.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Tasks/sync-subprocess-state-lab/ssp-start-child.json)).

## History mode

<sup>New</sup> v0.0.100 A flow that runs very often and is never looked at afterwards (a lookup, an introspection, a quote) paid the same storage cost as a long-lived business process: an `InstancesData` row per append, an `InstanceTransitions` row per transition and `InstanceTasks` journal rows. `attributes.history: "none"` marks such a flow as **one-shot**: it stays a state machine (states, transitions, correlation, a queryable instance), but writes no transition or task history and a single data row.

```json
{
  "key": "payments-quote",
  "attributes": {
    "type": "F",
    "history": "none",
    "states": []
  }
}
```

| Value | Meaning |
|-------|---------|
| `full` | Default (also when omitted). Full history is written |
| `none` | One-shot flow: no transition or task history, data flushed as a single row |

`history` sits at the root of `attributes` (beside `type` and `executionType`), **not under `config`**. An unknown value is a publish error. An older runtime or schema **silently ignores** the field — upgrade the schema package (`@burgan-tech/vnext-schema` 0.0.56) and the runtime together. **Rollback:** remove the field; no migration.

**What is stored and when.** `InstanceTransitions` and `InstanceTasks` are never written (the transition record stays in memory, so scripts still read `CurrentTransition`). `InstancesData` is buffered in memory and written as one row at **Finish** (in the same transaction as completion — Completed never commits without its data), at a **SubFlow handoff** (with the correlation, before the child starts), or on an **in-pipeline fault** (best effort). One row without SubFlow; at most `1 + 2·N` with N SubFlow states visited. The instance row, incidents, jobs and correlations are written as for any flow. A stage that comes to rest at a non-Finish state is faulted with incident `Instance:100046` (`HistoryNoneNotTerminal`).

**Publish rules** (errors, flow-local):

| Rule | Also in vnext-schema |
|------|----------------------|
| At least one Finish state | Yes |
| Every state transition is Automatic (`triggerType: 1`) | Yes |
| Every non-Finish state, SubFlow states included, has at least one transition | Yes |
| No `sharedTransitions`, `cancel`, `exit`, `updateData` | Yes |
| No workflow `timeout`, no `subFlow.overrides.timeout` | Yes |
| No `interaction.longPoll`, no Wizard state, no Suspended / Busy / Human subtype | Yes |
| Every state can reach a Finish state (no cycle, no `$self`-only loop, no dead end) | **No — runtime only** |

Allowed: a manual `startTransition`, a workflow-level `event` start, SubFlow states and SubProcess tasks.

**SubFlow rule.** A `none` parent requires a `none` **SubFlow (`S`)** child: the child checks right after loading its definition, before anything is persisted, and refuses with `Instance:100044` (`HistoryNoneSubFlowChildNotEligible`, `400`); the parent then faults with an incident. The rule holds across domains. **SubProcess (`P`)** children are exempt, and a `none` child under a `full` parent is fine.

**HTTP behavior** for a `none` instance:

| Endpoint | Behavior |
|----------|----------|
| `POST …/instances/{instance}/retry` | `409` `Instance:100045` (`HistoryNoneRetryNotSupported`) |
| `GET …/instances/{instance}/transitions` | `200`, empty list |
| `GET …/functions/tasks` | `200`, empty list |
| `GET …/functions/actions?taskId=` | `200`, empty list (not `404`) |
| Transition / state metrics | Empty |

While a `none` instance runs it has **no data row**: instance / data / state reads return null data, and attribute filters do not find it.

**Error codes:** `Instance:100044` (`400`, SubFlow child not `none`), `Instance:100045` (`409`, retry), `Instance:100046` (incident, stage rested at a non-Finish state).

**Accepted limits:**

- Post-commit faults, job timeouts and process crashes run after the in-memory data is gone: the instance faults with an incident but **without the data since the last flush**.
- **No retry** (`409`): the open transition record and task journal that retry relies on are not written.
- `$PreviousUser` / `$PreviousBehalfOfUser` grants never resolve (no transition history).
- `x-encryption` fields are sealed **at flush**; during the run scripts see newly written values in plaintext and `DecryptAsync` returns `null` for them.

## What's New in v0.0.79

- **Busy-as-mutex + updateData v2**: the Busy status is the execution mutex — state/shared transitions get 409 on Busy, cancel/exit bypass the busy check, `updateData` is admitted unconditionally and is status-neutral (see [Transition Execution Model](#transition-execution-model-lock-and-busy-check)).

- **Role-scoped `availableIn`**: each entry of `availableIn` (shared and well-known transitions) may be a bare state key or `{ "state": "...", "roles": [...] }`; the entry's roles compose with the transition's own `roles` as an **AND**. A role-less entry behaves exactly like the legacy string.
- **`updateData` / `exit` discovery**: both are now listed in `availableTransitions` (by configured key) and their `roles` actually filter the list. Roles are still not enforced at execution — they control what a client is *offered*.
- **Execution state gate**: well-known transitions (`cancel`/`updateData`/`exit`) can no longer be POSTed from a state excluded by `availableIn` (`Transition:100024`).

> 🚧 Full English translation is pending. See the [Turkish page](/docs/components/workflow) for the full shape, validation rules, and examples.

## Related

- [Workflow (conceptual)](/docs/components/workflow) — workflow as a concept
- [States](/docs/components/workflow) — state types
- [Transitions](/docs/components/mappings) — transition behaviors
- [Schema component](/docs/components/schema) — master schema
- [Tasks](/docs/components/tasks/) — task types
- Schema source: [vnext-schema (GitHub)](https://github.com/burgan-tech/vnext-schema)
