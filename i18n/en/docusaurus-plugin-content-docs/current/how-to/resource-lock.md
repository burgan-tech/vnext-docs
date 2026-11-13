---
id: resource-lock
title: Resource Lock
sidebar_label: Resource Lock
description: Protect a shared resource during a transition with a distributed lock
---

# Resource Lock

Resource Lock is a distributed lock that prevents **multiple instances from mutating the same shared resource** (a seat, time slot, daily limit, account, …) at the same time while a transition runs. By default the lock is managed through the Aether SDK's Dapr distributed-lock building block (`lock.redis`); since v0.0.106 a **Postgres lease** provider can be selected instead. It is **opt-in** per transition via a `resourceLock` block.

Key points:

- Runs in the pipeline as `ResourceLockStep` (**order 25**), **only in the Manual profile** (excluded from AutoChain / Scheduled / Event / ErrorBoundary).
- Valid on **start, state-level, and shared** transitions. The lock **owner** is always the `instanceId`.
- The lock key is produced at runtime by an `ITransitionMapping` script (`keyExpression`) returning a string. Locks are always **TTL-bounded**.
- **Recommended model:** `Acquire` on the check/entry transition and let the runtime release it — when the instance reaches a terminal state (Completed / Faulted / Cancelled) its locks are **released automatically**, so you don't add manual `Release` to every terminal transition.
- **Actions:** `Acquire`, `Release` (idempotent, best-effort — never rolls back a successful business transition), `Extend` (unreliable on the Dapr provider — Redis `SET NX` refuses even the owner, so size the TTL to cover the whole operation; on the `postgres` provider it renews the owner's lease). `Acquire` / `Extend` need `ttlSeconds` > 0 (publish error since v0.0.106).
- **Conflict policies (`onConflict`):**

  | Policy | Instance after the conflict | Caller gets | How to retry |
  |---|---|---|---|
  | `Abort` (default) | **Faulted** (`F`) | `409 Execution:200010` | Start a new instance |
  | `Reject` (v0.0.106, schema 0.0.61) | Unchanged, still Active in the same state | `409 Execution:200014` | Repeat the **same** call once the lock frees |

  The lock step runs before `OnExecute`, `OnExit`, the state change and `OnEntry`, so nothing has been written when the conflict is detected; under `Reject` the Busy reservation is handed back before the `409`.
- **Error-boundary routing (v0.0.106):** leave `onConflict` at `Abort` and add an `errorBoundary` rule (state level first, then global) with `errorCodes: ["Execution:200010"]` and a `transition` — the instance is rerouted instead of faulted, and an incident (`errorLayer: Pipeline`) records why. Publish validation rejects `Retry` on a rule naming a lock code and a state boundary that routes a lock code to a transition not available from that state; it warns when the target transition declares its own `resourceLock` (the ErrorBoundary profile skips the lock step).
- **Lock provider (v0.0.106):** `ResourceLock__Provider = dapr | postgres` (default `dapr`). `postgres` leases rows in `sys_queues."DistributedLocks"` (prefix `wfres:`), needs `ConnectionStrings:Default` and no Dapr lock component. An unknown value fails startup.
- **Release on commit (v0.0.106):** the finish step releases a terminal instance's locks right after the terminal state commits; the event-driven cleanup stays as an idempotent backstop.
- **Monitoring (v0.0.106):** `workflow_resource_lock_hold_duration_ms` (histogram, tags `vnext.domain`, `vnext.flow.key`) — alert when upper percentiles approach the TTL. Logs: `TransitionRejectedWithoutFaulting` (`10263`), `TransitionReroutedByErrorBoundary` (`10264`).
- Reference lab: [`resource-lock-lab`](https://github.com/burgan-tech/vnext-example/tree/master/core/Workflows/resource-lock-lab) (vnext-example).

> 🚧 Full English translation is pending. See the [Turkish page](/docs/how-to/resource-lock) for the complete configuration table, `keyExpression` examples, automatic-cleanup details, and best practices.
