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
