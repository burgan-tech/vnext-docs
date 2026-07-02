---
sidebar_position: 13
title: State Store Task
description: Task that reads, writes, and deletes cache entries via a Dapr state store
---

# State Store Task (Type: `17`)

The State Store Task reads and writes a **Dapr state store** component from within the workflow / function pipeline. It is the **caching primitive** for flows: read a cached value, write/update one, or delete one or more entries. Command names mirror the Dapr state API verbs.

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
    "type": "17",
    "config": {
      "command": "set",
      "storeName": "vnext-state",
      "key": "customer:42:profile",
      "value": { "name": "Ada" },
      "ttlInSeconds": 300,
      "consistency": "Strong",
      "concurrency": "LastWrite"
    }
  }
}
```

## Configuration Fields

| Field | Type | Required | Applies to | Description |
|-------|------|----------|------------|-------------|
| `command` | string | Yes | — | Command to execute: `get`, `set`, `delete` |
| `storeName` | string | No | all | Dapr state store component name. When omitted, the executing runtime's `DAPR_STATE_STORE_NAME` configuration value is used |
| `key` | string | No | get / set / single delete | Cache key. Stored under the fixed `custom:` prefix (see below) |
| `keys` | string[] | No | delete | List of keys for bulk delete (each entry gets the `custom:` prefix) |
| `query` | object | No | delete | Dapr state **Query API** filter (JSON) for tag/pattern delete. Requires a query-capable store |
| `value` | any | No | set | Value to store (any JSON value) |
| `ttlInSeconds` | integer | No | set | Optional time-to-live (Dapr `ttlInSeconds` metadata, minimum: 1) |
| `etag` | string | No | get / set | ETag token for optimistic concurrency |
| `concurrency` | string | No | set | `FirstWrite` or `LastWrite` |
| `consistency` | string | No | get / set | `Eventual` or `Strong` |
| `metadata` | object | No | all | Additional metadata passed to the Dapr state store operation |

## `command` Values

| Command | Behavior | Dapr API |
|---------|----------|----------|
| `get` | Reads the value for `key`; returns ETag and `Found` metadata | `GetStateAndETagAsync` |
| `set` | Writes/updates the value for `key` | `SaveStateAsync`; `TrySaveStateAsync` when `etag` is set |
| `delete` | Deletes a single `key`, a bulk `keys[]` list, or entries matched by `query` | `DeleteStateAsync` / `DeleteBulkStateAsync` / `QueryStateAsync` + bulk delete |

## Key Naming Convention (`custom:` prefix)

The state store is shared with the engine's own cache consumers (component cache entries, the post-commit idempotency store, etc.). To prevent collisions, **every task-supplied key** is stored under the fixed **`custom:`** prefix:

- Task config `key: "customer:42"` → store key `custom:customer:42`
- Combined with the Redis component's `keyPrefix: "vnext"`, the physical Redis key becomes `vnext||custom:customer:42`

The prefix is applied by the invoker on `get`, `set`, and `delete` (single key and `keys[]`). Keys matched by a `query` are returned by the store already prefixed and are deleted as-is. The `Key` field in the result metadata reports the prefixed store key.

## Semantics

- **Cache miss**: a `get` for a missing key returns **success** with `data = null` and metadata `Found = false`. It does **not** trip the error boundary — the output mapping decides what a miss means.
- **TTL** is passed to Dapr as `ttlInSeconds` metadata on `set` only.
- **Query/tag delete** resolves matching keys via the Dapr state Query API and bulk deletes them. If the configured store does not support querying, the task returns an informative failure instead of throwing.
- When `storeName` is omitted, the store is resolved from the **Execution** runtime's `DAPR_STATE_STORE_NAME` value (`vnext-state` in the shipped environments). An explicit `storeName` must be exposed by the Execution sidecar.

## Examples

### `get` — read from cache

```json
"attributes": {
  "type": "17",
  "config": {
    "command": "get",
    "key": "customer:42:profile",
    "consistency": "Strong"
  }
}
```

### `delete` — bulk and query-based

```json
"attributes": {
  "type": "17",
  "config": {
    "command": "delete",
    "keys": ["customer:42:profile", "customer:42:limits"]
  }
}
```

```json
"attributes": {
  "type": "17",
  "config": {
    "command": "delete",
    "query": {
      "filter": { "EQ": { "value.tenant": "acme" } }
    }
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
    "Found": true,
    "ETag": "3",
    "Key": "custom:customer:42:profile"
  },
  "TaskType": "StateStore"
}
```

- `get` returns `Metadata.Found` and `Metadata.ETag`; on a miss, `Data = null` and `Found = false`.
- `delete` reports the number of removed entries in `Metadata.DeletedCount`.

## Related

- [Tasks Overview](/docs/components/tasks/) — task types and the reference mechanism
- [Dapr PubSub Task](/docs/components/tasks/dapr-pubsub) — other Dapr-based task types
- Runtime document: [state-store-task.md (vnext)](https://github.com/burgan-tech/vnext/blob/master/docs/runtime/state-store-task.md)
- Schema source: [task-definition.schema.json (vnext-schema)](https://github.com/burgan-tech/vnext-schema/blob/master/schemas/task-definition.schema.json)
