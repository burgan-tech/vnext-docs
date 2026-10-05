---
sidebar_position: 2
title: Custom Functions
description: User-defined functions and C# scripting
---

# Custom Functions

Custom functions are components designed to reduce BFF (Backend for Frontend) API usage in the vNext platform. They work on instance data to provide endpoints to other domains or integrated services.

## Table of Contents

1. [Overview](#overview)
2. [Function Definition](#function-definition)
3. [Function Properties](#function-properties)
4. [Function Cache](#function-cache)
5. [Consumption Endpoints](#consumption-endpoints)
6. [System Functions](#system-functions)
7. [Usage Examples](#usage-examples)
8. [Best Practices](#best-practices)

---

## Overview

Custom functions are used for:

- **BFF API Reduction**: Reduces intermediate API layers by providing direct data access
- **Data Transformation**: Presents instance data in desired format via mapping
- **Task Execution**: Runs the defined task when function is called
- **Service Integration**: Provides endpoints to other domains or external services

:::tip
Each function can execute a task and the task result data can be returned in the desired format via mapping.
:::

---

## Function Definition

### Basic Structure

```json
{
  "key": "function-get-user-info",
  "flow": "sys-functions",
  "domain": "core",
  "version": "1.0.0",
  "flowVersion": "1.0.0",
  "tags": [
    "system",
    "core",
    "users",
    "lookup"
  ],
  "attributes": {
    "scope": "I",
    "task": {
      "order": 1,
      "task": {
        "key": "get-user-info",
        "domain": "core",
        "version": "1.0.0",
        "flow": "sys-tasks"
      },
      "mapping": {
        "location": "./src/GetUserInfoMapping.csx",
        "code": "<BASE64_ENCODED_MAPPING_CODE>"
      }
    }
  }
}
```

---

## Function Properties

### Core Properties

| Property | Type | Description |
|----------|------|-------------|
| `key` | `string` | Unique identifier for the function |
| `flow` | `string` | Flow stream information (default: `sys-functions`) |
| `domain` | `string` | Domain the function belongs to |
| `version` | `string` | Version information (semantic versioning) |
| `flowVersion` | `string` | Flow version information |
| `tags` | `string[]` | Tags for categorization and searching |
| `attributes` | `object` | Function configuration |

### Attributes Properties

| Property | Type | Description |
|----------|------|-------------|
| `scope` | `string` | Function scope (`I` = Instance, `F` = Workflow, `D` = Domain) |
| `task` | `object` | Single task to execute (legacy shape; use with one task) |
| `onExecutionTasks` | `array` | Ordered tasks to execute; see **Multi-task execution** below |
| `output` | `object` | Optional output mapping script: `location` / `code`; implements **`IOutputHandler`** |
| `cache` | `object` | Optional read-through response cache — see **Function Cache** below |
| `labels` | `array` | Multi-language labels (`[{ label, language }]`). (v0.0.99) No longer dropped at load time; returned by the built-in `catalog` as `functions[].labels` |
| `executionLog` (v0.0.99) | `string` | Opt-in execution journal: `E` (enabled) records every invocation, served by the [function metrics endpoints](/docs/components/functions/built-in#function-metrics); `D` or absent records nothing. Asynchronous, best-effort |

### Scope Values

| Value | Description | Access Level |
|-------|-------------|--------------|
| `I` | Instance | Works for a specific instance |
| `F` | Workflow | Works at workflow level |
| `D` | Domain | Works at domain level |

### Task Structure

```json
{
  "task": {
    "order": 1,
    "task": {
      "key": "task-key",
      "domain": "core",
      "version": "1.0.0",
      "flow": "sys-tasks"
    },
    "mapping": {
      "location": "./src/MappingFile.csx",
      "code": "<BASE64_ENCODED_CODE>"
    }
  }
}
```

| Property | Type | Description |
|----------|------|-------------|
| `order` | `number` | Task execution order |
| `task` | `object` | Task reference |
| `mapping` | `object` | Input/Output transformation mapping |
| `variableKey` (v0.0.99) | `string` | Optional response-slot name in `context.OutputResponse` / `context.TaskResponse`. Format `^[A-Za-z_][A-Za-z0-9_]*$`, max 100 chars, used verbatim. Effective slot = `variableKey ?? camelCase(task.key)` (`send-notification` → `sendNotification`) |

### Multi-task execution and output mapping

A function may run **multiple tasks in order** using **`attributes.onExecutionTasks`** instead of a single **`task`**. Each entry has **`order`**, a **`task`** reference, and optional **`mapping`**. Later tasks can consume outputs from earlier ones in the same function execution.

Optional **`attributes.output`** references a script that implements **`IOutputHandler`**. In **`OutputHandler`**, read per-task results from **`context.OutputResponse`**, keyed by each entry's **effective slot**: `variableKey` when set, otherwise the camelCased task key.

:::tip Response header & status code forwarding
In multi-task functions, the **`Headers`** and **`StatusCode`** of the `ScriptResponse` returned by the output handler are **forwarded** onto the final function HTTP response. The output handler can therefore set the response status (e.g. `201`, `202`) and propagate headers such as `Location` or `ETag` — not just the body.
:::

```json
"attributes": {
  "scope": "I",
  "onExecutionTasks": [
    {
      "order": 1,
      "task": {
        "key": "validate-account-policies",
        "domain": "core",
        "flow": "sys-tasks",
        "version": "1.0.0"
      },
      "mapping": {
        "location": "./src/FunctionValidatePoliciesMapping.csx",
        "code": ""
      }
    },
    {
      "order": 2,
      "task": {
        "key": "get-data-from-workflow",
        "domain": "core",
        "flow": "sys-tasks",
        "version": "1.0.0"
      },
      "mapping": {
        "location": "./src/FunctionGetInstanceDataMapping.csx",
        "code": ""
      }
    }
  ],
  "output": {
    "location": "./src/FunctionOutputMapping.csx",
    "code": ""
  }
}
```

```csharp
using System.Threading.Tasks;
using BBT.Workflow.Scripting;

public class FunctionOutputMapping : IOutputHandler
{
    public Task<ScriptResponse> OutputHandler(ScriptContext context)
    {
        var policies = context.OutputResponse["validateAccountPolicies"].data;
        var instanceData = context.OutputResponse?["getDataFromWorkflow"].data;
        return Task.FromResult(new ScriptResponse
        {
            Key = "multi-task-function-output",
            Data = new { policyValidation = policies, instanceSnapshot = instanceData }
        });
    }
}
```

#### Running the same task twice (`variableKey`)

(v0.0.99) Give each entry a distinct `variableKey` so the results land in separate slots:

```json
"onExecutionTasks": [
  { "order": 1, "task": { "key": "start-child", "domain": "core", "version": "1.0.0", "flow": "sys-tasks" }, "variableKey": "primaryChild", "mapping": { "location": "./src/StartPrimaryChildMapping.csx", "code": "" } },
  { "order": 1, "task": { "key": "start-child", "domain": "core", "version": "1.0.0", "flow": "sys-tasks" }, "variableKey": "secondaryChild", "mapping": { "location": "./src/StartSecondaryChildMapping.csx", "code": "" } }
]
```

`context.OutputResponse["primaryChild"]` and `context.OutputResponse["secondaryChild"]` then hold the two results. For functions, slot collisions are checked at publish across **all** `onExecutionTasks`, regardless of `order` (the same task twice without `variableKey` is rejected — it used to fail at runtime with "Parallel tasks produced conflicting output for key '...'"). A malformed `variableKey` is rejected at publish as well.

---

## Function Cache

A function can declare an optional **`attributes.cache`** block that caches its **entire response** in a Dapr state store. On a hit the response is served with a single cache read — tasks are skipped; on a miss the function runs normally and the result is written back (read-through). Opt-in per function and intended **only for side-effect-free (read) functions**.

```json
"cache": {
  "keyExpression": {
    "location": "dynamicExpresso",
    "code": "\"config:\" + Instance.Key + \":\" + Instance.Version"
  },
  "ttlInSeconds": 300,
  "consistency": "Eventual",
  "bypassOnCacheError": true
}
```

Fields: `keyExpression` (Dynamic Expresso, takes precedence) or static `key`; `storeName` (defaults to the runtime's `DAPR_STATE_STORE_NAME`); `ttlInSeconds`; `consistency` (`Eventual`/`Strong`); `bypassOnCacheError` (default `true` — cache failures fall back to executing the function); and `generationKey` / `generationKeyExpression` for **generation-namespace invalidation** — bumping the generation stamp in the state store invalidates the whole cache family without deletes. `Instance.Version` is available in key expressions so a new config version self-invalidates. Add `varyByHeaders` (exact request-header names) and/or `varyByHeaderPrefixes` (header-name prefixes) to keep **separate cache variants per header value** — they feed the `varyKey(context)` key-expression helper (#839).

> 🚧 Full English translation of this section is pending. See the [Turkish page](/docs/components/functions/custom) for the complete field table and details.

---

## Consumption Endpoints

### Domain Level Functions

**Returns all domain instances and data:**

```http
GET /api/v1/{domain}/functions
```

**Returns result of a specific function:**

```http
GET /api/v1/{domain}/functions/{function}
```

### Workflow level custom function URL (removed in )

The pattern **`GET /api/v1/{domain}/workflows/{workflow}/functions/{function}`** (calling a registered function by name without an instance id) **is removed** as of . Use **instance-scoped** function endpoints below, **workflow instance listing** (`GET .../workflows/{workflow}/instances`), or other documented APIs instead.

### Instance Level Functions

**Executes a function for a specific instance:**

```http
GET /api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/{function}
```

---

## Function Contract & Discovery <sup>New</sup>

As of v0.0.79 a function can declare a full client contract — all fields are opt-in:

- **`verbs`** (`GET`/`POST`/`PATCH`/`DELETE`) — an undeclared verb returns **405** with an `Allow` header.
- **`inputSchema`** — the request body is validated against the resolved `sys-schemas` contract (**400** with field-level errors on violation); **`outputSchema`** is declarative only.
- **`inputView` / `outputView`** — the `sys-views` contract a client renders to collect input / present output.
- Every slot accepts a single reference or **rule-based entries** (declaration order, first match wins, trailing rule-less fallback).
- Discovery endpoints answer *may I run this, with which verb, and which view/schema applies now*: `GET .../functions/{function}/info`, `/view?target=input|output`, `/schema?target=input|output` — at domain and instance scope, guarded by the same scope/role policy as execution (`403` on denial).

> 🚧 Full English translation is pending. See the [Turkish page](/docs/components/functions/custom) for the complete contract tables, rule-slot semantics, and discovery endpoint details.

## System Functions

The platform provides built-in system functions for every instance — `state`, `data`, `view`, `schema`, `master`, `catalog`, `tasks`, `actions`, `instance-correlation`, `authorize`, `permissions`, and the domain-level `human-task`. They have no `sys-functions` component and shadow a custom function with the same key. For the full endpoint, response and field reference, see [Built-in Functions](/docs/components/functions/built-in).

### State Function

Returns the instance's current state, role-filtered transitions (with `labels` and `target` since v0.0.99), `interaction`, `timeout` and correlation information for long-polling: `GET /api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/state`. When the active state defines an `alias`, `state` may return a role-masked label — see [State Alias](/docs/components/workflow). Full shape: [Built-in Functions → State Function](/docs/components/functions/built-in#state-function).

### View and Schema Functions

`…/functions/view?transitionKey=&platform=` returns the state or transition view; `…/functions/schema?transitionKey=` returns the transition's JSON Schema. Since v0.0.99 both carry the component's `labels`. See [Built-in Functions](/docs/components/functions/built-in#view-function).

---

## Usage Examples

### Example 1: User Info Function

```json
{
  "key": "function-get-user-info",
  "flow": "sys-functions",
  "domain": "core",
  "version": "1.0.0",
  "flowVersion": "1.0.0",
  "tags": ["system", "core", "users", "lookup"],
  "attributes": {
    "scope": "I",
    "task": {
      "order": 1,
      "task": {
        "key": "get-user-info",
        "domain": "core",
        "version": "1.0.0",
        "flow": "sys-tasks"
      },
      "mapping": {
        "location": "./src/GetUserInfoMapping.csx",
        "code": "<BASE64>"
      }
    }
  }
}
```

**Mapping Example:**

```csharp
using System.Threading.Tasks;
using BBT.Workflow.Scripting;
using BBT.Workflow.Definitions;

public class GetUserInfoMapping : IMapping
{
    public Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
    {
        try
        {
            var httpTask = task as HttpTask;
            if (httpTask == null)
                throw new InvalidOperationException("Task must be an HttpTask");

            var userId = context.Body?.userId;

            // Update URL with userId
            httpTask.SetUrl(httpTask.Url.Replace("{userId}", userId?.ToString() ?? ""));

            // Set Headers
            var headers = new Dictionary<string, string?>
            {
                ["Content-Type"] = "application/json",
                ["Accept"] = "application/json",
                ["X-Request-Id"] = Guid.NewGuid().ToString()
            };

            httpTask.SetHeaders(headers);

            return Task.FromResult(new ScriptResponse());
        }
        catch (Exception ex)
        {
            return Task.FromResult(new ScriptResponse
            {
                Key = "user-info-error",
                Data = new { error = ex.Message }
            });
        }
    }

    public async Task<ScriptResponse> OutputHandler(ScriptContext context)
    {
        try
        {
            var statusCode = context.Body?.statusCode ?? 500;
            var responseData = context.Body?.data;

            if (statusCode >= 200 && statusCode < 300)
            {
                return new ScriptResponse
                {
                    Key = "user-info-success",
                    Data = new
                    {
                        user = responseData,
                        phoneNumber = responseData?.phoneNumber,
                        hasRegisteredDevices = ((object[])responseData?.registeredDevices).Length > 0,
                        language = responseData?.language ?? "tr-TR"
                    },
                    Tags = new[] { "users", "lookup", "success" }
                };
            }
            else
            {
                return new ScriptResponse
                {
                    Key = "user-info-failure",
                    Data = new
                    {
                        error = "Failed to get user information",
                        errorCode = "user_info_failed",
                        statusCode = statusCode,
                        hasRegisteredDevices = false
                    },
                    Tags = new[] { "users", "lookup", "failure" }
                };
            }
        }
        catch (Exception ex)
        {
            return new ScriptResponse
            {
                Key = "user-info-exception",
                Data = new
                {
                    error = "Internal processing error",
                    errorCode = "processing_error",
                    errorDescription = ex.Message,
                    hasRegisteredDevices = false
                },
                Tags = new[] { "users", "lookup", "error" }
            };
        }
    }
}
```

### Example 2: Account Balance Function

```json
{
  "key": "function-get-account-balance",
  "flow": "sys-functions",
  "domain": "banking",
  "version": "1.0.0",
  "flowVersion": "1.0.0",
  "tags": ["banking", "accounts", "balance"],
  "attributes": {
    "scope": "I",
    "task": {
      "order": 1,
      "task": {
        "key": "get-balance",
        "domain": "banking",
        "version": "1.0.0",
        "flow": "sys-tasks"
      },
      "mapping": {
        "location": "./src/GetBalanceMapping.csx",
        "code": "<BASE64>"
      }
    }
  }
}
```

---

## Best Practices

### 1. Function Design

| Practice | Description |
|----------|-------------|
| Single responsibility | Each function should do one thing |
| Meaningful naming | Descriptive names with `function-` prefix |
| Appropriate scope | Correct scope selection based on need (I, W, D) |
| Version management | Use semantic versioning |

### 2. Mapping Development

| Practice | Description |
|----------|-------------|
| Error handling | Catch errors with try-catch blocks |
| Null checking | Write null-safe code (`?.` operator) |
| Logging | Add appropriate log messages |
| Performance | Avoid unnecessary operations |

### 3. Security

| Practice | Description |
|----------|-------------|
| Authorization | Proper authorization checks |
| Data validation | Perform input validation |
| Sensitive data | Mask sensitive data |
| Rate limiting | Apply request limits |

### 4. Performance

| Practice | Description |
|----------|-------------|
| Caching | Use appropriate cache strategy |
| Async operations | Use async/await for asynchronous operations |
| Timeout | Set appropriate timeout values |
| Resource management | Properly release resources |

---

## Related Documentation

- [Function APIs](/docs/components/functions/built-in) - Built-in system functions (State, Data, View)
- [Instance Filtering](/docs/how-to/instance-filtering) - GraphQL-style filtering guide
- [Extension Management](/docs/components/extension) - Data enrichment components
- [Task Management](/docs/components/tasks/) - Task types and usage
- [Mapping Guide](/docs/components/mappings) - Comprehensive mapping guide