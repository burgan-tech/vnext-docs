---
sidebar_position: 8
title: Get Instance Task
description: Task for retrieving a full single-instance projection from other workflows
---

# GetInstance Task

GetInstance Task (`type: "19"`) returns the **full projection of a single instance** — metadata and data together — from a target workflow. It is the task-level equivalent of `GET /api/v1/{domain}/workflows/{workflow}/instances/{instance}` and completes the trigger task family:

| Task | Type | Returns |
| --- | --- | --- |
| [GetInstances](/docs/components/tasks/get-instances) | `15` | A **list** of instances (with paging/filtering) |
| [GetInstanceData](/docs/components/tasks/trigger) | `13` | Instance **data** only |
| **GetInstance** | `19` | The **full projection** of one instance (metadata + data) |

Same-domain queries run **in-process** (no HTTP/Dapr hop); cross-domain queries call the same REST endpoint over HTTP or Dapr. Both paths surface an identical response shape to the script context.

The target instance is addressed by `key` or `instanceId` (usually set dynamically in the input mapping via `SetKey` / `SetInstanceId`). The configuration mirrors GetInstances: `domain` and `flow` are required; `extensions`, `useDapr`, `headers`, `timeoutSeconds`, `validateSsl`, and `acceptedStatusCodes` are optional.

:::info[Field protection — v0.0.99]
The task reads with the **caller's presented credential** and applies the target master schema's `x-roles` / `x-masking` / `x-encryption` — the same read service as instance GET/list. The former system visibility (`SystemRead`) was removed. The presented header set is the input mapping's headers plus every credential header (`sub`, `act_sub`, `position`, `client_id`, `role`) the mapping leaves unset; to read as another identity (e.g. a service role), set it in the input mapping. `X-Request-Id` is forwarded fill-if-absent.
:::

:::note[Row security (`rowSecurity`) — v0.0.102]
When the target workflow declares `attributes.rowSecurity`, the task is filtered by the same row rules as the instance GET endpoint — same-domain and cross-domain — **with the credential and headers the task presents**. A header a rule reads (for example `x-branch-code`) is not forwarded automatically; set it in the task's input mapping, otherwise that rule contributes nothing. An instance the rules exclude answers the same `404` as a missing one.

Since v0.0.102 the task looks the target flow's definition up; when that lookup fails, the task fails with the same error — with or without `rowSecurity`: `Instance:100052` (409, invalid default-version pointer), `Instance:100053` (503, version registry unavailable), `Instance:100051` (404, flow version not activated). Details: [Row Security](/docs/concepts/row-security).
:::

> 🚧 Full English translation is pending. See the [Turkish page](/docs/components/tasks/get-instance) for the complete configuration tables, mapping example, and response reference.
