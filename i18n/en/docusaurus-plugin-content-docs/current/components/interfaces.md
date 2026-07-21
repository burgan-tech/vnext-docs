---
sidebar_position: 4
title: Interfaces
description: Workflow source code interfaces and graph visualization
---

# Interfaces

These are the basic interfaces used in script-based code writing for definitions on the platform. The technology used for developing scripts is the [Roslyn](https://github.com/dotnet/roslyn) product.

For usage examples and conceptual guide, see [Mappings](./mappings).

## Interface Types

### IMapping
General mapping interface. Used for input and output bindings of tasks.



**Usage Areas:**
- Input data preparation and transformation before task execution
- Output data processing after task execution
- Data validation and transformation
- Audit logging and metadata management

**Methods:**
```csharp
Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context);
Task<ScriptResponse> OutputHandler(ScriptContext context);
```

**Method Descriptions:**
- `InputHandler`: Prepares input data before the task is executed, configures the WorkflowTask object
- `OutputHandler`: Processes output data after the task is executed and merges it into the workflow instance

### ITimerMapping
Used for schedule mapping. Special interface for timer-based workflows and scheduling operations.



**Usage Areas:**
- DateTime-based scheduling
- Periodic operations with cron expressions
- Duration-based delays
- Immediate execution
- Business logic-based scheduling calculations

**Method:**
```csharp
Task<TimerSchedule> Handler(ScriptContext context);
```

**Method Description:**
- `Handler`: Calculates timer schedule according to script context and returns TimerSchedule object

### ISubProcessMapping
Used for input binding for sub processes. For starting independent sub-processes.



**Usage Areas:**
- Background data processing
- Audit log generation
- External system notifications
- Data synchronization
- Fire-and-forget operations

**Method:**
```csharp
Task<ScriptResponse> InputHandler(ScriptContext context);
```

**Method Description:**
- `InputHandler`: Prepares the necessary input data to start a subprocess and returns ScriptResponse

**Note:** Since subprocesses run independently, only input binding is required, no output binding.

### ISubFlowMapping
Used for input binding for sub flows and output binding to transfer data to the parent flow when completed.

> See [Interfaces](/docs/components/interfaces#isubflowmapping) for the full contract.

**Usage Areas:**
- Approval workflows
- Data processing workflows
- Validation processes
- Computed value generation
- Parent-child workflow integration

**Methods:**
```csharp
Task<ScriptResponse> InputHandler(ScriptContext context);
Task<ScriptResponse> OutputHandler(ScriptContext context);
```

**Method Descriptions:**
- `InputHandler`: Prepares input data to start subflow and returns ScriptResponse
- `OutputHandler`: Transfers results to parent workflow when subflow is completed and returns ScriptResponse

**Note:** Since subflows run integrated with the parent workflow, both input and output binding are required.

### IConditionMapping
Used for decision parts like auto transitions. Provides condition checking in automatic transitions.



**Usage Areas:**
- Data validation checks
- Business rule validation
- Time-based conditions
- External system status checks
- User role/permission verification
- Auto-transition decision logic

**Method:**
```csharp
Task<bool> Handler(ScriptContext context);
```

**Method Description:**
- `Handler`: Returns boolean value according to the given context (true: allow transition, false: block transition)

### ITransitionMapping
Used for mapping transition payloads to instance data. Allows custom transformation of transition request data before merging into workflow instance.

> See [Interfaces](/docs/components/interfaces#itransitionmapping) for the full contract.

**Usage Areas:**
- Custom payload transformation before saving to instance data
- Data validation and sanitization during transitions
- Enriching transition data with additional context
- Filtering or restructuring incoming data
- Default behavior: If no mapping is defined, payload is written as-is to instance data

**Method:**
```csharp
Task<dynamic> Handler(ScriptContext context);
```

**Method Description:**
- `Handler`: Transforms transition payload and returns the data to be merged into workflow instance data

**Transition Schema with Mapping:**
```json
{
  "key": "transition-name",
  "source": "source-state",
  "target": "target-state",
  "mapping": {
    "code": "BASE64_ENCODED_CSX_CONTENT",
    "location": "./src/TransitionMappingFile.csx"
  }
}
```
### IEventMapping

Binds an external pub/sub event to a workflow instance. Referenced by the workflow-level `attributes.event` (instance start) and by the `event` definition on `triggerType: 3` transitions (event-driven transition). See the [Event-Driven Workflows guide](/docs/how-to/event-driven-workflows).

```csharp
public interface IEventMapping
{
    Task<EventMappingResult> Handler(ScriptContext context);
}
```

The raw event payload is available as **`context.EventPayload`** (CloudEvent envelopes are unwrapped by the runtime before the script runs). The handler has exactly two responsibilities: **correlation** (which instance is this event about?) and **payload shaping** (what data goes into the workflow?). The script must be deterministic and side-effect free.

**`EventMappingResult` fields:**

| Field | Used by | Meaning |
|---|---|---|
| `InstanceKey` | start + transition | Business key. For start: the new instance's key. For transition: finds the **active** instance with that key |
| `Body` | start + transition | For start: the new instance's initial attributes. For transition: the transition's input data |
| `Selector` | transition only | Fallback correlation built with the fluent `InstanceQuery` and terminated with `First()`/`Last()`, used when the payload carries no key. Ignored when `InstanceKey` is set |

```csharp
public class AbortEventMapping : ScriptBase, IEventMapping
{
    public Task<EventMappingResult> Handler(ScriptContext context)
    {
        var p = context.EventPayload;
        return Task.FromResult(new EventMappingResult
        {
            Selector = InstanceQuery.Create()
                .Where("currentState",      f => f.Eq("waiting-payment"))
                .Where("attributes.userId", f => f.Eq(p.userId))
                .OrderBy("createdAt")
                .Last(),
            Body = new { reason = p.reason }
        });
    }
}
```

Selectors are automatically scoped to the target workflow's flow. Throwing or returning `null` yields 500 (retried by the broker); a non-matching selector/key returns 200 by design (no redelivery).
