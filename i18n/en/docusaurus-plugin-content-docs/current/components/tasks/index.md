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

`vnext-schema/task-definition.schema.json` defines a total of **19 task types**. Each is listed below with its number, name, and detail page.

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

> **Note:** Only these 19 task types defined in the schema exist. Task types not on this list are **not supported** by the system.

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