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
- `states` — list of workflow states (at least one `Initial` state)
- `startTransition` — start transition definition
- `labels` — multi-language labels

Optional fields include `schema`, `timeout`, `functions`, `extensions`, `sharedTransitions`, `errorBoundary`, `cancel`, `exit`, `updateData`, `queryRoles`, `scripts`, `output` (sync response mapping — see [Output Mapping](#output-mapping)), `event` (workflow-level event definition — see [Event-Driven Transitions](#event-event-driven-workflows)), and `config` (flow-level configuration — currently built-in function cache tuning, `config.functionCache.ttlSeconds`; host default 60s; the State Function is managed separately by the platform).

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

### Shared Transitions

**Common transitions** accessible from multiple states. Specify via `availableIn` array which states can trigger it.

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

Start, state-level, and shared transitions may declare an optional `resourceLock` block — a distributed lock (Dapr `lock.redis`) that prevents concurrent instances from mutating a shared resource. It runs in the **Manual** profile only. The recommended model is to `Acquire` on the entry transition and let the runtime auto-release the lock when the instance reaches a terminal state. See the [Resource Lock guide](/docs/how-to/resource-lock) for the full behavioral model, `keyExpression` authoring, conflict/409 handling, and examples.

### Query Roles

Authorization mechanism. Holds the information about **who can query** the workflow and the states within an instance. `queryRoles` can be defined at two levels: the **flow (root)** level and each **state** level. **Precedence:** the instance's **current state** `queryRoles` is evaluated first; if the state has none, the flow-level `queryRoles` is used as the base. It is enforced by the built-in **state/data/view/schema** read functions; if the caller is not allowed, the function returns **`403`**. See [Built-in Functions → QueryRoles authorization in read functions](/docs/components/functions/built-in#queryroles-authorization-in-read-functions).

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
| `roles` | array | yes | Roles allowed to use the long-poll interaction. DENY overrides ALLOW |

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

The State function response carries an `interaction` object **whenever the state declares `interaction.longPoll`** (subject to role grants) — regardless of the `terminate` value:

```json
"interaction": {
  "terminateLongPoll": false,
  "fallbackTimeoutSeconds": 600
}
```

- `terminateLongPoll: true` → the client terminates its long-poll, renders the entered state, and acknowledges via the included `ack` HREF (a scheduled fallback resumes the pipeline if not acknowledged within `fallbackTimeoutSeconds`, default `60`).
- `terminateLongPoll: false` → the client restarts the long-poll request if it has stopped — independent of the instance status — and keeps retrying within the `fallbackTimeoutSeconds` window.
- `ack` is present only when `terminateLongPoll` is `true`.

#### Long Poll Acknowledge

When the client finishes consuming the long-poll response, it calls the **acknowledge** endpoint to inform the platform:

```
PATCH /api/v1/{domain}/workflows/{workflow}/instances/{instance}/longpoll/ack
```

If the client fails or cannot send the request, the platform automatically closes the long-poll after `fallbackTimeoutSeconds` elapses — preventing stuck connections on client crash or network failure.

See [Sync vs Async execution](/docs/how-to/async-sync).

### Error Boundary

The **global error handling** definition at the workflow level. Applied if no boundary is defined at task or state level.

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

- **Plain instance (no active subflow):** data is updated and the **normal transition pipeline runs** — `$self` state change, `onExecutionTasks`, and auto-transition evaluation at the end of the pipeline (order 90). A satisfied auto reserves ownership at the continuation boundary and advances the instance (taking over parked Busy when no live owner exists).
- **In an active subflow:** when the instance defines `updateData`, the request is **answered by the parent even while an active subflow is running — it is never forwarded**: the parent's data is updated and left as-is; the pipeline does not advance the instance and the subflow is not disturbed.

Autos are evaluated after **every** `updateData`, so "accumulate data, advance when the threshold is met" (fan-in) patterns work safely under an updateData storm.

:::tip[Flow design notes]
- In scenarios that keep pushing data while the instance is active (telemetry, parallel service results, background tasks), give the client **`updateData`**, not `stateTransition`.
- Under parallel `updateData`, mappings should return **delta-only** output: a full echo can overwrite concurrent writers' fresher values with stale copies.
- Each accepted `updateData` produces two data rows (request payload + task output). The data version is computed as `MAX(VersionNo)+1` under a per-instance `FOR UPDATE` lock; every row is persisted the moment it is produced.
- Parallel branches at the same order need **distinct task definitions** (the task-journal key is the `transition+task+order` triple).
:::

> **Reference:** [vnext #877](https://github.com/burgan-tech/vnext/pull/877) — Busy-as-mutex locking, status-neutral updateData, and immediate InstanceData persistence.

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
