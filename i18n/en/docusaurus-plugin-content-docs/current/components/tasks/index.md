---
sidebar_position: 1
title: Tasks Overview
description: vNext task types, reference mechanism, and mapping usage
---

# Task Document

Tasks are independent components that perform specific operations during workflow runtime. Each task can be defined in different types according to its own special purpose and can be executed at different points in the workflow.

:::tip
Tasks are stored as an independent workflow. They are defined as references to the points where they will be used.
A workflow named `tasks` is created in each domain deployment. All tasks used within the domain are record instances in this workflow.
:::

## Task Types

The runtime executes a total of **23 task types**. `@burgan-tech/vnext-schema@0.0.54`'s `task-definition.schema.json` defines the first **21** of them; types `22` (External HTTP — **deprecated** since v0.0.94) and `23` (Python) are not in the published schema enum (see the note below). Each is listed below with its number, name, and detail page.

| # | Task Type | Description | Detail |
|---|---|---|---|
| 1 | **DaprHttpEndpoint** | Dapr HTTP endpoint invocation | *(detail page in a later phase)* |
| 2 | **DaprBinding** | Dapr binding (input/output) | *(detail page in a later phase)* |
| 3 | **DaprService** | Dapr service invocation calls | [DaprService](./dapr-service) |
| 4 | **DaprPubSub** | Dapr pub/sub messaging | [DaprPubSub](./dapr-pubsub) |
| 5 | **HumanTask** | Task requiring user interaction | *(detail page in a later phase)* |
| 6 | **HttpTask** | HTTP web service calls | [HTTP](./http) |
| 7 | **ScriptTask** | C# Roslyn script execution | [Script](./script) |
| 8 | **ConditionTask** | Conditional logic and branch decision | *(see mappings)* |
| 9 | **TimerTask** | Timer (DateTime/Duration) | *(see mappings)* |
| 10 | **NotificationTask** | Sending notifications | [Notification](./notification) |
| 11 | **StartFlowTask** | Start a new instance (subflow/process) | [Trigger](./trigger) |
| 12 | **TriggerTransitionTask** | Trigger a transition on an existing instance | [Trigger](./trigger) |
| 13 | **GetInstanceDataTask** | Fetch a single instance's data | *(detail page in a later phase)* |
| 14 | **SubProcessTask** | Run a SubProcess (fire-and-forget) | *(detail page in a later phase)* |
| 15 | **GetInstancesTask** | Fetch multiple instances by filter | [GetInstances](./get-instances) |
| 16 | **SoapTask** | SOAP 1.1 / 1.2 web service calls | [Soap](./soap) |
| 17 | **StateStoreTask** | Dapr state store caching (get/set/delete) | [StateStore](./state-store) |
| 18 | **CacheAsideTask** | Read-through cache (runs sourceTask on miss and caches it) | [CacheAside](./cache-aside) |
| 19 | **GetInstanceTask** | Fetch a full single-instance projection (metadata + data) | [GetInstance](./get-instance) |
| 20 | **DaprConversationTask** | Invoke an LLM/AI provider via Dapr Conversation | [DaprConversation](./dapr-conversation) |
| 21 | **FanOutTask** | Run an inner task in parallel, once per item of a runtime-resolved collection | [Fan-Out](./fan-out) |
| 22 | **ExternalHttpTask** — *deprecated* v0.0.94 | Runs the HTTP call directly inside the Orchestrator. Since v0.0.94 the type `6` HTTP task already runs orchestrator-local by default (`Workflow:TaskInvocation`); use `6` for new definitions | [External HTTP](./external-http) |
| 23 | **PythonTask** | Built-in `main(input)` Python task, executed in the Execution service (experimental) | [Python](./python) |

> **Note:** Only these task types exist. Task types not on this list are **not supported** by the system.

:::warning[Types `22` and `23` are not in the schema package]
The `task-definition.schema.json` shipped in `@burgan-tech/vnext-schema@0.0.54` still enumerates `1`–`21`; `22` (External HTTP) and `23` (Python) are not in the `attributes.type` enum. As a result, `npm run validate` in a domain package rejects a task definition using either type, while `publish` and runtime execution work fine. Type `22` is deprecated since v0.0.94, so it is not planned for the schema. Details: [External HTTP Task](./external-http), [Python Task](./python).
:::

:::info[Orchestrator-local task types — v0.0.94]
Since v0.0.94 the `http` (6), `daprservice` (3), `soap` (16) and `statestore` (17) task types run **inside the Orchestrator process** by default instead of hopping to Execution (`Workflow:TaskInvocation:Modes`, `Local` / `Remote` per type; task-level `invocation` override > per-type mode > `DefaultMode`). `FanOutTask` (21) is always orchestrator-local; `ExternalHttpTask` (22) is therefore redundant and **deprecated**; `PythonTask` (23) runs in Execution over the `python` route. Since v0.0.99 `CacheAsideTask` (18) runs in the Orchestrator without a separate `cacheaside` mode: its cache I/O follows the `statestore` mode and its `sourceTask` follows its own type's mode (`Modes:cacheaside` was removed). The orchestrator sidecar now needs a Dapr `state` component. Details: [Task Invocation](../../configuration/task-invocation).
:::

## Task Usage

Tasks are used by being referenced by other modules. In each task usage, `order`, `task` reference, and `mapping` information are defined.

### Example Task Definition

```json
"onExecutionTasks": [
  {
    "order": 1,
    "task": {
      "key": "invalidate-cache",
      "domain": "core",
      "flow": "sys-tasks",
      "version": "1.0.0"
    },
    "mapping": {
      "location": "./src/InvalideCacheMapping.csx",
      "code": "<BASE64>"
    }
  }
]
```

### Execution Order
- `order` values are grouped among themselves
- Those with the same order are executed **in parallel**
- Those with different orders are executed **sequentially**

#### Response slot and `variableKey`

Since v0.0.99 every task entry (workflow `onEntries` / `onExits` / transition `onExecutionTasks`, function `onExecutionTasks`) may carry an optional **`variableKey`** that names the **slot** the task's response is filed under in the script context.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `variableKey` | string | No | Response slot name. Format `^[A-Za-z_][A-Za-z0-9_]*$`, max 100 characters. Used **verbatim** |

- **Effective slot** = `variableKey ?? camelCase(task.key)` — e.g. `send-notification` → `sendNotification`.
- Read it as `context.TaskResponse["primaryChild"]` in workflow scripts and `context.OutputResponse["primaryChild"]` in function scripts.

**Publish rules:**

- A malformed value is rejected: `... variableKey 'x' is not a valid response slot name: use letters, digits and '_', starting with a letter or '_' (max 100 characters).`
- In **workflows**, collisions are checked **per order**: two entries running in parallel at the same `order` that file under the same effective slot are rejected (`…run in parallel at order N and both file their response under 'slot'; … Give one of them a distinct 'variableKey' or a different order.`).
- In **functions**, collisions are checked across **all** `onExecutionTasks`, regardless of order.
- A definition running the same task twice at one order without `variableKey` is now rejected at publish (it used to crash at runtime with `Parallel tasks produced conflicting output for key '...'`).

**Slot-aware merge:**

- A later order rewriting an earlier order's slot **overwrites** it (also as a parallel group — this used to throw).
- Only two branches **in the same round** writing the same slot with **different** payloads is a conflict: it throws and nothing is applied.
- In-place mutation of an inherited value inside a parallel task is not seen by the merge.
- The ExternalHttp task now honors the slot as well.
- Extension task entries file their response under the extension's own key; a `variableKey` there is ignored.

**Example — running the same SubProcess start task twice at the same order:**

```json
"onExecutionTasks": [
  {
    "order": 1,
    "task": { "key": "start-child", "domain": "core", "version": "1.0.0", "flow": "sys-tasks" },
    "variableKey": "primaryChild",
    "mapping": { "location": "./src/mappings/start-primary-child.csx", "code": "<base64>" }
  },
  {
    "order": 1,
    "task": { "key": "start-child", "domain": "core", "version": "1.0.0", "flow": "sys-tasks" },
    "variableKey": "secondaryChild",
    "mapping": { "location": "./src/mappings/start-secondary-child.csx", "code": "<base64>" }
  }
]
```

A mapping at a later order reads both responses separately: `context.TaskResponse["primaryChild"]` and `context.TaskResponse["secondaryChild"]`.

### Data Management
- If tasks have output data as a result of their execution, they increase the master data as a patch version
- Input and output binding is done with the `mapping` field

### Task Execution Points

**Within the workflow:**
- `Transition.OnExecutionTasks`: Executed when transition is triggered
- `State.OnEntries`: Executed on first entry to a stage
- `State.OnExits`: Executed on first exit from a stage

**Outside the workflow:**
- `Functions.OnExecutionTasks`: Executed within platform services
- `Extensions.OnExecutionTasks`: Workflow record instance tasks

## Standard Task Response

All task types use the same standard response structure:

```csharp
public sealed class StandardTaskResponse
{
    /// <summary>
    /// Data returned from task execution
    /// </summary>
    public dynamic? Data { get; set; }

    /// <summary>
    /// Status code for HTTP-based tasks
    /// </summary>
    public int? StatusCode { get; set; }

    /// <summary>
    /// Whether the task execution was successful
    /// </summary>
    public bool IsSuccess { get; set; } = true;

    /// <summary>
    /// Error message in case of error
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Response headers for HTTP-based tasks
    /// </summary>
    public Dictionary<string, string>? Headers { get; set; }

    /// <summary>
    /// Additional metadata about task execution
    /// </summary>
    public Dictionary<string, object>? Metadata { get; set; }

    /// <summary>
    /// Task execution time (milliseconds)
    /// </summary>
    public long? ExecutionDurationMs { get; set; }

    /// <summary>
    /// Task type identifier
    /// </summary>
    public string? TaskType { get; set; }
}
```