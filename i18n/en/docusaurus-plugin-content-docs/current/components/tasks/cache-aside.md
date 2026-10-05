---
sidebar_position: 14
title: Cache-Aside Task
description: Task that caches a source's result using the read-through (cache-aside) pattern
---

# Cache-Aside Task (Type: `18`)

The Cache-Aside Task implements the **cache-aside (read-through)** pattern as a single task. Designers no longer hand-wire "check cache → call service → write cache" as three separate tasks; the engine centralizes that flow along with TTL, consistency and cache-failure semantics.

Behavior:

1. The cache key is resolved — a static string, a key script (Dynamic Expresso or C#), or `SetCacheKey` in the task-level mapping's `InputHandler`.
2. If the key is **present** in the cache (hit) → the cached value is returned; `sourceTask` is **not** executed.
3. On a **miss** (or `forceRefresh: true`) → `sourceTask` runs **as a task** (`sourceMapping` is its mapping: `InputHandler` → call → `OutputHandler`), the shaped output is written to the cache with `ttlInSeconds` + `consistency`, and returned.
4. In both cases the task-level mapping's (`onExecutionTasks[].mapping`) `OutputHandler` runs on the result.

:::warning v0.0.99 breaking
The Cache-Aside contract changed in v0.0.99:

- The `keyExpression` field is **removed**; a dynamic key is now a ScriptCode object in `key`.
- `sourceMapping` is now the **source task's** `IMapping` (InputHandler before the call, OutputHandler after) and what is cached is its **output**. Previously the raw source result was cached and `sourceMapping` was applied on every read.
- `sourceTask` may be any task type (except CacheAside); the "remotely invokable type" restriction is gone.
- The `cacheaside` wire type and the `Workflow:TaskInvocation:Modes:cacheaside` routing key are removed; cache I/O follows `Modes.statestore`.

**Migration steps:**

1. `keyExpression` → `"key": { "location": "dynamicExpresso", "encoding": "NAT", "code": "..." }`.
2. Move source-configuring code into `sourceMapping.InputHandler`, the cached shape into `sourceMapping.OutputHandler`, and post-cache work into the task-level mapping (`onExecutionTasks[].mapping`).
3. Remove `Workflow:TaskInvocation:Modes:cacheaside` from environment configuration.
4. Entries written by the old version hold **raw** values and are read until their TTL expires — flush the cache or wait for expiry.
5. Flows that pre-warm the cache with a State Store `set` must now write the **shaped** value.

Rolling deploy: only if `cacheaside` was configured **Remote** can an old Orchestration pod send a `cacheaside` envelope to a new Execution pod; the default Local setup never does.

Details: [v0.0.99 Breaking Changes](/blog/breaking-changes/breaking-changes-v0-0-99)
:::

## Task Definition

> **Schema:** `task-definition.schema.json` — `config` has `additionalProperties: false`; only `sourceTask` is required.

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
      "sourceMapping": { "location": "./src/mappings/get-customer-source.csx", "code": "<base64>" },
      "bypassOnCacheError": true,
      "forceRefresh": false
    }
  }
}
```

## Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `key` | string \| ScriptCode | No* | The cache key. A **string** is used **verbatim**. A **ScriptCode** object (`location`, `code`, `encoding`, optional `type`, `scripts`) computes it at runtime — see [Cache Key](#cache-key). *Without a static/script `key`, the task-level mapping's `InputHandler` must set it via `SetCacheKey` |
| `storeName` | string | No | Dapr state store component used as the cache. When empty, the executing runtime's `DAPR_STATE_STORE_NAME` is used |
| `ttlInSeconds` | integer (min `0`) | No | Time-to-live of the cache entry. Absent or `0` → **no expiry** |
| `consistency` | string | No | `Eventual` (default) or `Strong` — passed to the state store on read and write |
| `sourceTask` | object | **Yes** | Task executed on a miss: `key`, `domain`, `version` required; `flow` defaults to `sys-tasks`. **Any task type except CacheAside** — see [Source Task](#source-task) |
| `sourceMapping` | ScriptCode | No | The **source task's** `IMapping`: `InputHandler` runs before the source call (URL/body, `SetKey`, …), `OutputHandler` after it. **The `OutputHandler` output is what gets cached**; without it the raw source `data` is cached |
| `bypassOnCacheError` | boolean | No | `true` (default): cache read/write failures fall back to the source (warning log `10176`). `false`: cache errors surface as a task failure (error boundary applies) |
| `forceRefresh` | boolean | No | `true`: skip the cache read, always run the source and overwrite the entry. Default `false` |

## Cache Key

### Key kinds

| `key` form | Behavior |
|------------|----------|
| `"customer:42:profile"` (string) | Verbatim static key |
| `{ "location": "dynamicExpresso", ... }` | `code` is a **Dynamic Expresso** expression (e.g. `"customer:" + context.Headers.customerid + ":profile"`; header keys are lowercased) |
| `{ "location": "<other>", ... }` | `code` is a **C# (Roslyn)** class implementing `ICacheKeyMapping` |

### Encoding

| `encoding` | Meaning |
|------------|---------|
| `B64` | **Default.** `code` is Base64 text |
| `NAT` | `code` is plain text. For a plain expression you **must set `"encoding": "NAT"`** — otherwise the default B64 decode fails the task |
| `REF` | `code` is a reference to a [sys-mappings component](/docs/components/mapping-component): `{ "key", "domain", "flow": "sys-mappings", "version" }` |

### `ICacheKeyMapping` (C#)

```csharp title="customer-key.csx"
public class CustomerProfileKey : ICacheKeyMapping
{
    public Task<string?> Handler(ScriptContext context)
        => Task.FromResult<string?>($"customer:{context.Headers["customerid"]}:profile");
}
```

### Key precedence

1. The task-level mapping's `InputHandler` runs first and may set a key with `SetCacheKey(...)`.
2. The `key` script then runs; a **non-blank** result **overrides** the earlier key.
3. A `null` or blank result keeps the earlier key.
4. If the key is still blank at invoke time, the task fails with `CacheAside requires a non-empty 'key'.`

```csharp title="cache-key-mapping.csx (task-level InputHandler)"
public async Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
{
    var customerId = context.Headers["customerid"];
    ((CacheAsideTask)task).SetCacheKey($"customer:{customerId}:profile");
    return new ScriptResponse();
}
```

## Source Task

- `sourceTask` may be **any task type except CacheAside** (HTTP, Script, SOAP, Dapr, GetInstanceData, trigger tasks, …). Another CacheAside task as the source is rejected **at execution time** (log `10177`, message `...the source task 'x' cannot be a CacheAside task.`).
- The source runs through **its own type's executor**, exactly as it would in `onExecutionTasks`: same-domain trigger tasks via the in-process gateway, cross-domain via discovery.
- The source has **no error boundary or journal row of its own**; the boundary applies once, on the CacheAside task.
- `sourceMapping` runs on a throwaway context branch: side effects (Body merges, mutations, response slots) are **discarded**; only its returned output is cached and returned.

```csharp title="get-customer-source.csx (sourceMapping — the source task's IMapping)"
public class GetCustomerSource : IMapping
{
    public Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
    {
        ((GetInstanceDataTask)task).SetKey(context.Headers["customerid"]);
        return Task.FromResult(new ScriptResponse());
    }

    public Task<ScriptResponse> OutputHandler(ScriptContext context)
        => Task.FromResult(new ScriptResponse { Data = /* shape the source response; this is what is cached */ });
}
```

## Read-Through Flow

| Case | Behavior |
|------|----------|
| **Cache HIT** | The cached (shaped) value is returned; `sourceTask` does not run |
| **Cache MISS** | `sourceMapping.InputHandler` → source call → `sourceMapping.OutputHandler` → output written with `ttlInSeconds` + `consistency` → returned |
| **`forceRefresh: true`** | Behaves as a miss regardless of cache content; refreshes the entry |
| **Both** | The task-level mapping's `OutputHandler` runs on the result |

## Task-Level OutputHandler and `metadata`

The task-level mapping's (`onExecutionTasks[].mapping`) `OutputHandler` runs on **hits and misses**. `context.Body` carries the task result; `context.Body.metadata` (PascalCase keys) carries cache information:

```json
{
  "isSuccess": true,
  "data": { "name": "Ada" },
  "statusCode": 200,
  "metadata": {
    "StoreName": "vnext-state",
    "Key": "custom:customer:42:profile",
    "CacheHit": true,
    "Refreshed": false,
    "ETag": "1"
  }
}
```

| `metadata` field | Type | Description |
|------------------|------|-------------|
| `CacheHit` | boolean | `true` → value came from the cache (source did not run) |
| `Refreshed` | boolean | `true` → after a miss or `forceRefresh` the source ran and the entry was written |
| `Key` | string | Store key including the `custom:` prefix |
| `StoreName` | string | State store component used |
| `ETag` | string | ETag of the state store entry |

## Architecture

- **`CacheAsideTaskExecutor`** (Orchestration / Application) runs the input stage (task-level `InputHandler`, then the `key` script), the read-through and the output stage.
- **Cache get/set** goes through the **state-store cache gateway** shared with the function response cache and follows `Workflow:TaskInvocation:Modes.statestore` (Local in-process, or Remote through Execution) — exactly like the [State Store task](./state-store). See [Task Invocation Routing](/docs/configuration/task-invocation).
- **The source** runs through its own type's executor; its own type decides routing (e.g. HTTP Local, a Python source Remote). Only the cache I/O follows `statestore`.
- There is **no** separate `cacheaside` wire type, invoker or routing key (removed in v0.0.99).
- The task result participates in instance-data versioning (Patch bump) like any other task result.

An explicit `storeName` must be exposed to whichever sidecar performs the cache call: Orchestration's by default, Execution's if `statestore` is routed Remote.

## Key Naming Convention (`custom:` prefix)

Cache keys share the **same `custom:` prefix** as the [State Store task](./state-store), so a `CacheAsideTask` and a `StateStoreTask` targeting the same logical key hit **the same physical entry** — a designer can pre-warm or invalidate a cache-aside entry with a plain State Store `set`/`delete` task.

- Task config `key: "customer:42:profile"` → store key `custom:customer:42:profile`

**What is stored:** the `sourceMapping` output (or the raw source `data` without one). Pre-warming writes must store this **shaped** value.

## Semantics

- **Cache infrastructure error + `bypassOnCacheError: true`**: a warning is logged (`10176`), `sourceTask` runs and its result is returned (a failed write is ignored).
- **Cache infrastructure error + `bypassOnCacheError: false`**: the task fails and flows into the **error boundary chain**.
- **Source task failure**: propagated as this task's failure; **nothing is cached**.
- **Error boundary** applies once, on the CacheAside task.
- The `/instances//data` failure for sources run with empty input was fixed in v0.0.99.

## Errors

| Case | Message / Log |
|------|---------------|
| Resolved key is blank | `CacheAside requires a non-empty 'key'.` |
| Cache read failure, `bypassOnCacheError: false` | `CacheAside read failed: …` |
| Cache write failure, `bypassOnCacheError: false` | `CacheAside write failed: …` |
| Cache failure, `bypassOnCacheError: true` | Warning log `10176`, fallback to source |
| `sourceTask` is a CacheAside task | Rejected at execution, log `10177`: `...the source task 'x' cannot be a CacheAside task.` |
| Invalid `key` / `sourceMapping` script | Validated and rejected at publish |

## Tracing

Cache reads/writes are reported as `Cache.Get` / `Cache.Set` spans tagged `cache.component_type=cacheaside`.

:::tip
To cache a **function's** whole output (instead of a single task), use the `cache` block on the function definition — there the key can be computed with a Dynamic Expresso `keyExpression` and invalidated via generation-namespace. (The function `cache.keyExpression` field is unchanged; only the CacheAside task's `keyExpression` was removed.)
:::

## Examples

### Static key

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
      "sourceTask": { "key": "get-customer-http", "domain": "core", "flow": "sys-tasks", "version": "1.0.0" }
    }
  }
}
```

### Dynamic Expresso key

```json
{
  "key": "cache-customer-profile-dynamic",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["cache", "customer"],
  "attributes": {
    "type": "18",
    "config": {
      "key": {
        "location": "dynamicExpresso",
        "encoding": "NAT",
        "code": "\"customer:\" + context.Headers.customerid + \":profile\""
      },
      "storeName": "customer-cache-store",
      "ttlInSeconds": 300,
      "consistency": "Eventual",
      "sourceTask": { "key": "get-customer-instance", "domain": "core", "flow": "sys-tasks", "version": "1.0.0" },
      "sourceMapping": { "location": "./src/mappings/get-customer-source.csx", "code": "<base64>" },
      "bypassOnCacheError": true,
      "forceRefresh": false
    }
  }
}
```

### C# (`ICacheKeyMapping`) script key

```json
{
  "key": "cache-customer-profile-script",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["cache", "customer"],
  "attributes": {
    "type": "18",
    "config": {
      "key": { "location": "./src/mappings/customer-key.csx", "code": "<base64>" },
      "ttlInSeconds": 300,
      "sourceTask": { "key": "get-customer-http", "domain": "core", "flow": "sys-tasks", "version": "1.0.0" },
      "sourceMapping": { "location": "./src/mappings/get-customer-source.csx", "code": "<base64>" }
    }
  }
}
```

The same key script can be referenced from a sys-mappings component:

```json
"key": {
  "location": "./src/mappings/customer-key.csx",
  "encoding": "REF",
  "code": { "key": "customer-profile-key", "domain": "core", "flow": "sys-mappings", "version": "1.0.0" }
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

## Related

- [Tasks Overview](/docs/components/tasks/) — task types and the reference mechanism
- [State Store Task](/docs/components/tasks/state-store) — shared cache primitive (get/set/delete); same `custom:` prefix and state store
- [Mapping Component](/docs/components/mapping-component) — sharing a key script via `REF` encoding
- [Task Invocation](/docs/configuration/task-invocation) — `statestore` mode (cache I/O)
- [v0.0.99 Breaking Changes](/blog/breaking-changes/breaking-changes-v0-0-99)
- Runtime doc: [cache-aside-task.md (vnext)](https://github.com/burgan-tech/vnext/blob/master/docs/runtime/cache-aside-task.md)
- Schema source: [task-definition.schema.json (vnext-schema)](https://github.com/burgan-tech/vnext-schema/blob/master/schemas/task-definition.schema.json)
