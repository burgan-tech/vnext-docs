---
sidebar_position: 2.1
title: External HTTP Task
description: Runs the HTTP call directly inside the Orchestrator instead of hopping to the Execution service
---

# External HTTP Task (Type: `22`)

:::warning Deprecated — v0.0.94
Type `22` is **deprecated** since v0.0.94. From that version the standard [HTTP Task](./http) (type `6`) already runs inside the Orchestrator by default (`Workflow:TaskInvocation:Modes:http = "Local"`), so the hop-free call that was type `22`'s only difference is now type `6`'s behaviour too. Use type `6` for new definitions; existing type `22` definitions keep working but the type will not be added to the `@burgan-tech/vnext-schema` enum. Details: [Task Invocation](../../configuration/task-invocation).
:::

:::note
Translation pending — the Turkish page is the source of truth.
:::

External HTTP Task (type `22`, added in v0.0.88) shares the exact same configuration surface as HTTP Task (type `6`): `url`, `method`, `headers`, `body`, `contentType`, `rawBody`, `timeoutSeconds`, `validateSsl`, `acceptedStatusCodes`. The only difference is where it runs: instead of routing through the Execution service's `/execution/invoke/{type}/{key}` hop, the Orchestrator executes the call in-process through the same shared `HttpTaskInvocation` send core.

Because there is no Dapr hop, the Dapr sidecar circuit breaker and `ExecutionApi:InvocationTimeoutSeconds` layer do not apply — the task's own `timeoutSeconds` (default 30) and the job budget are the only bounds. Mapping scripts that cast `task as HttpTask` and call `SetUrl`/`SetHeaders`/`SetBody` work unchanged, since `ExternalHttpTask` derives from `HttpTask`. Reserved trace headers (`traceparent`, `tracestate`, `baggage`, `x-request-id`, `X-Correlation-Id`, `X-Workflow-Instance-Id`) cannot be overridden from the task binding, same as type 6.

The `@burgan-tech/vnext-schema@0.0.54` package does not recognize type `22` in its enum, so `npm run validate` rejects it while runtime publish and execution work fine.
