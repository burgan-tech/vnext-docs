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

Optional fields include `schema`, `timeout`, `functions`, `extensions`, `sharedTransitions`, `errorBoundary`, `cancel`, `exit`, `updateData`, `queryRoles`, `scripts`, and `output` (sync response mapping — see [Output Mapping](#output-mapping)).

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

A specially defined transition. Typically used to **update parent flow data from sub flows** in intermediate blocks. `target` must always be `$self`.

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

#### Long Poll Acknowledge

When the client finishes consuming the long-poll response, it calls the **acknowledge** endpoint to inform the platform:

```
PATCH /api/v1/{domain}/workflows/{workflow}/instances/{instance}/longpoll/ack
```

If the client fails or cannot send the request, the platform automatically closes the long-poll after `fallbackTimeoutSeconds` elapses — preventing stuck connections on client crash or network failure.

See [Sync vs Async execution](/docs/how-to/async-sync).

### Error Boundary

The **global error handling** definition at the workflow level. Applied if no boundary is defined at task or state level.

## Related

- [Workflow (conceptual)](/docs/components/workflow) — workflow as a concept
- [States](/docs/components/workflow) — state types
- [Transitions](/docs/components/mappings) — transition behaviors
- [Schema component](/docs/components/schema) — master schema
- [Tasks](/docs/components/tasks/) — task types
- Schema source: [vnext-schema (GitHub)](https://github.com/burgan-tech/vnext-schema)
