---
sidebar_position: 5
title: Workflow Execution
description: Transition job timeout, fan-out concurrency, and InstanceData write budget configuration
---

# Workflow Execution Configuration

:::note
Translation pending — the Turkish page is the source of truth.
:::

The Orchestration host's `WorkflowExecution` section controls the transition job timeout budget (`TransitionJobTimeoutSeconds`, default 300), the initial-accept enqueue path (`DirectEnqueueContinuations`, default true), the status lock lease (`StatusLockLeaseSeconds`, default 5), retry policy, and InstanceData write behavior (`PreserveNumericPrecision`, `LegacyAppendPipeline`). `Workflow:FanOut:MaxConcurrentItems` (default 64) bounds Fan-Out task concurrency.

A startup-validated budget hierarchy applies: `Python:MaxTimeoutSeconds` < `ExecutionApi:InvocationTimeoutSeconds` < `WorkflowExecution:TransitionJobTimeoutSeconds` < the chain lock lease. Violating it fails the application at startup rather than surfacing as a production race window. `PreserveNumericPrecision` (opt-in, default false) makes InstanceData appends canonicalize numbers losslessly, at the cost of a one-time content-hash change per affected instance on its next append.

<sup>New</sup> v0.0.102 — `WorkflowExecution:Bookkeeping:AsynchronousCommit` (default `false`): when `true`, the task journal write and the transition record insert/completion commit with `SET LOCAL synchronous_commit = off` — visible immediately, no fsync on the request path. A database crash can lose the last few hundred milliseconds of those bookkeeping rows only, never instance state, data or outbox rows. The wrapper costs three extra round-trips, so it pays off only where fsync latency exceeds roughly three network round-trips: measure before enabling. `WorkflowExecution:SubItemTerminalLockRetry` (`MaxAttempts` / `BaseDelayMilliseconds`) now defaults to 10 × 20 ms (was 4 × 120 ms; same ~1 s budget, 20–40 ms first retry), and the wait is abandoned as soon as the other delivery has settled the work.

<sup>New</sup> v0.0.102 — `Workflow:SubFlow:CarriedHeaders` controls the headers a SubFlow child's settling request carries to the parent: `Emit` (`true`), `ExposeToOutputMapping` (`true`; the parent's SubFlow output mapping reads them as `context.Headers`), `ApplyToResume` (`true`; the parent's resumed hop runs with them on completion, fault and cancel — set `false` to keep the old empty-header resume), `AdditionalDenied` (`[]`; exact names added to the fixed floor of names containing `authorization`, `cookie`, `token`, `secret` or `session`), `MaxEntries` (`64`), `MaxValueLength` (`4096`). Environment variable form: `Workflow__SubFlow__CarriedHeaders__ApplyToResume=false`. See [Interfaces → ISubFlowMapping](/docs/components/interfaces#isubflowmapping).
