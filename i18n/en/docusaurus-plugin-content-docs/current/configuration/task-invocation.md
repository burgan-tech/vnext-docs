---
sidebar_position: 5
title: Task Invocation Routing (TaskInvocation)
sidebar_label: Task Invocation
description: Workflow:TaskInvocation — whether tasks run in-process in Orchestration (Local) or in the Execution service (Remote), resolution order, connection and timeout limits
---

# Task Invocation Routing (TaskInvocation)

:::note
Translation pending — the Turkish page is the source of truth.
:::

Starting with v0.0.94, the Orchestration host runs `http`, `daprservice`, `soap` and `statestore` tasks in-process by default under `Workflow:TaskInvocation` (`DefaultMode: "Remote"` plus per-type `Modes`, `MaxConnectionsPerServer` 50 and `LocalInvocationTimeoutSeconds` 60 as code defaults); the router resolves a task-definition override stub, then the per-type entry, then `DefaultMode`, and always degrades to Remote when no local invoker exists, while `Custom` is rejected at startup. Changes take effect only after an Orchestration restart, local `statestore` (which, since v0.0.99, also carries Cache-Aside cache I/O — the `cacheaside` mode and `LocalCacheAsideTaskInvoker` were removed, so drop `Modes:cacheaside` from configuration) requires the Dapr `state` component on the orchestrator (custom `storeName` components must be scoped to it), the type-22 External HTTP task is deprecated, and errorBoundary rules using `errorTypes` now match on the remote path as well. See the Turkish page for the timeout layering, the cost of the local path, the `vnext.task.invocation.mode` span tag and how to revert a type to Remote.
