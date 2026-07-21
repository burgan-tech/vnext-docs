---
sidebar_position: 14
title: Cache-Aside Task
description: Task that caches a source's result using the read-through (cache-aside) pattern
---

# Cache-Aside Task (Type: `18`)

The Cache-Aside Task implements the **cache-aside (read-through)** pattern as a single task. Designers no longer hand-wire "check cache → call service → write cache" as three separate tasks; the engine centralizes that flow along with TTL, consistency and cache-failure semantics.

Behavior:

1. If the resolved key is **present** in the cache (hit) → the cached value is returned; the `sourceTask` is **not** executed.
2. On a **miss** (or `forceRefresh: true`) → the `sourceTask` runs, its raw result is written to the cache with `ttlInSeconds` + `consistency`, and returned. A `sourceMapping`, if present, shapes the result on read.

## Task Definition

> **Schema:** `task-definition.schema.json`

```json
{
  "key": "cache-customer-profile",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["cache", "customer"],
  "attributes": {
    "type": "18",
    "config": {
      "key": "customer:42:profile",
      "storeName": "vnext-state",
      "ttlInSeconds": 300,
      "consistency": "Eventual",
      "sourceTask": { "key": "get-customer-http", "domain": "core", "flow": "sys-tasks", "version": "1.0.0" },
      "sourceMapping": { "location": "./src/mappings/get-customer-cached.csx", "code": "<base64>" },
      "bypassOnCacheError": true,
      "forceRefresh": false
    }
  }
}
```

## Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | string | Yes* | Cache key, used **verbatim**. For a dynamic key, the transition mapping's `InputHandler` calls `task.SetCacheKey(...)` (the same standard mechanism as the State Store task). *If no static `key` is given, the key must be set by the mapping |
| `storeName` | string | No | Dapr state store component used as the cache. When omitted, the executing runtime's `DAPR_STATE_STORE_NAME` configuration value is used |
| `ttlInSeconds` | integer | No | Time-to-live for the cached entry (Dapr `ttlInSeconds` metadata). When absent or `0`, the entry has **no expiry** |
| `consistency` | string | No | `Eventual` (default) or `Strong` — passed to the state store on read and write |
| `sourceTask` | object | Yes | Reference (`key` / `domain` / `flow` / `version`) to the task executed on a cache miss. Must be a **remotely-invokable** type (HTTP / SOAP / Dapr / GetInstanceData). `flow` defaults to the runtime tasks schema when omitted |
| `sourceMapping` | object | No | `.csx` mapping (`location` + base64 `code`) applied to the cached (raw) result before it is returned. Runs as the mapping's `OutputHandler` on read — on both hits and misses |
| `bypassOnCacheError` | boolean | No | `true` (default): cache read/write failures fall back to the source task instead of failing the pipeline. `false`: cache errors surface as a task failure (error boundary applies) |
| `forceRefresh` | boolean | No | `true`: skip the cache read; always execute the source task and overwrite the entry |

## Read-Through Flow

| State | Behavior |
|-------|----------|
| **Cache HIT** | Resolved key found → the cached value is returned; `sourceTask` is not executed |
| **Cache MISS** | `sourceTask` runs → its raw result is written to the cache with `ttlInSeconds` + `consistency` → returned |
| **`forceRefresh: true`** | Behaves as a miss regardless of cache content; refreshes the entry |

## Architecture

Follows the **exact same** split as the State Store task:

- **`CacheAsideTaskExecutor`** (Orchestration / Application) runs the input mapping, resolves the `sourceTask` into an envelope, then sends a `cacheaside` `TaskEnvelope` to the Execution service via `IRemoteInvokerService`, and applies the output mapping (`sourceMapping`) on the way out.
- **`CacheAsideTaskInvoker`** (Execution) performs the state store access through `DaprClient` (same `custom:` prefix / TTL / consistency as `StateStoreTaskInvoker`, via the shared `IStateStoreClient`). On a miss it runs the **pre-resolved `sourceTask` envelope** through the local invoker registry (e.g. an HTTP source runs on the same Execution service's HTTP invoker) and writes the raw result to the cache.

Because the scripting engine exists only in the Orchestration runtime, the **cache stores the raw source result**; shaping (`sourceMapping`) is applied on every read (hit and miss) in the executor's output stage. The task result participates in instance-data versioning (Patch bump) like any other task result.

## Key Naming Convention (`custom:` prefix)

Cache keys share the **same `custom:` prefix** as the [State Store task](./state-store), so a `CacheAsideTask` and a `StateStoreTask` targeting the same logical key hit the **same physical entry** — a designer can pre-warm or invalidate a cache-aside entry with a plain State Store `set`/`delete` task.

- Task config `key: "customer:42:profile"` → store key `custom:customer:42:profile`

## Semantics

- **Cache infrastructure error + `bypassOnCacheError: true`**: a warning is logged, the `sourceTask` runs, and its result is returned (best-effort cache write; a failed write is ignored).
- **Cache infrastructure error + `bypassOnCacheError: false`**: the task fails and flows into the **error boundary chain**.
- **Source task business failure**: propagated as this task's failure; **nothing is cached**.
- **`sourceTask` must be a remotely-invokable type** (HTTP / SOAP / Dapr / GetInstanceData). Since it runs on the Execution service on a miss, a local-only Script / Condition cannot be a source.
- When `storeName` is omitted, the store is resolved from the **Execution** runtime's `DAPR_STATE_STORE_NAME` value (`vnext-state` in the shipped environments).

## Dynamic Key

Instead of a static `key`, the key can be computed per request/context. The same standard mechanism as the State Store task is used: the transition mapping's `InputHandler` mutates the task to set the key (there is **no** bespoke templating engine):

```csharp title="cache-key-mapping.csx (InputHandler)"
public async Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
{
    var customerId = context.Headers["customerId"];
    ((CacheAsideTask)task).SetCacheKey($"customer:{customerId}:profile");
    return new ScriptResponse();
}
```

:::tip
To cache an entire **function's** output (rather than a single task), see the `cache` block on the function definition — there the key can be computed with a Dynamic Expresso `keyExpression` and invalidated via a generation namespace.
:::

## Examples

### Simple read-through (HTTP source)

```json
"attributes": {
  "type": "18",
  "config": {
    "key": "customer:42:profile",
    "storeName": "vnext-state",
    "ttlInSeconds": 300,
    "sourceTask": { "key": "get-customer-http", "domain": "core", "flow": "sys-tasks", "version": "1.0.0" }
  }
}
```

### `forceRefresh` — always refresh the cache

```json
"attributes": {
  "type": "18",
  "config": {
    "key": "customer:42:profile",
    "sourceTask": { "key": "get-customer-http", "domain": "core", "flow": "sys-tasks", "version": "1.0.0" },
    "forceRefresh": true
  }
}
```

### `sourceMapping` — shape the raw result before caching/returning

```json
"attributes": {
  "type": "18",
  "config": {
    "key": "customer:42:profile",
    "sourceTask": { "key": "get-customer-http", "domain": "core", "flow": "sys-tasks", "version": "1.0.0" },
    "sourceMapping": { "location": "./src/mappings/get-customer-cached.csx", "code": "<base64>" },
    "ttlInSeconds": 300
  }
}
```

## Standard Response

```json
{
  "Data": { "name": "Ada" },
  "StatusCode": 200,
  "IsSuccess": true,
  "ErrorMessage": null,
  "Metadata": {
    "CacheHit": true,
    "Refreshed": false,
    "Key": "custom:customer:42:profile",
    "ETag": "3"
  },
  "TaskType": "CacheAside"
}
```

- `Metadata.CacheHit = true` → the value came from the cache (the source did not run).
- `Metadata.CacheHit = false` and `Metadata.Refreshed = true` → miss/forceRefresh; the source ran and the result was cached.
- `Metadata.Key` reports the prefixed store key.

## Related

- [Tasks Overview](/docs/components/tasks/) — task types and the reference mechanism
- [State Store Task](/docs/components/tasks/state-store) — the shared caching primitive (get/set/delete); same `custom:` prefix and state store
- Runtime doc: [cache-aside-task.md (vnext)](https://github.com/burgan-tech/vnext/blob/master/docs/runtime/cache-aside-task.md)
- Schema source: [task-definition.schema.json (vnext-schema)](https://github.com/burgan-tech/vnext-schema/blob/master/schemas/task-definition.schema.json)
