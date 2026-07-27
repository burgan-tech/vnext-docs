---
id: resource-lock
title: Resource Lock
sidebar_label: Resource Lock
description: Protect a shared resource during a transition with a distributed lock
---

# Resource Lock

Resource Lock is a distributed lock that prevents **multiple instances from mutating the same shared resource** (a seat, time slot, daily limit, account, …) at the same time while a transition runs. The lock is managed through the Aether SDK's Dapr distributed-lock building block (`lock.redis`) and is **opt-in** per transition via a `resourceLock` block.

Key points:

- Runs in the pipeline as `ResourceLockStep` (**order 25**), **only in the Manual profile** (excluded from AutoChain / Scheduled / Event / ErrorBoundary).
- Valid on **start, state-level, and shared** transitions. The lock **owner** is always the `instanceId`.
- The lock key is produced at runtime by an `ITransitionMapping` script (`keyExpression`) returning a string. Locks are always **TTL-bounded**.
- **Recommended model:** `Acquire` on the check/entry transition and let the runtime release it — when the instance reaches a terminal state (Completed / Faulted / Cancelled) its locks are **released automatically**, so you don't add manual `Release` to every terminal transition.
- **Actions:** `Acquire` (conflict → transition abort → **HTTP 409**, instance faulted `F`), `Release` (idempotent, best-effort — never rolls back a successful business transition), `Extend` (unreliable — there is no native Dapr extend; size the TTL to cover the whole operation instead).
- Only the `Abort` conflict policy is supported today; the caller is expected to retry on 409.

> 🚧 Full English translation is pending. See the [Turkish page](/docs/how-to/resource-lock) for the complete configuration table, `keyExpression` examples, automatic-cleanup details, and best practices.
