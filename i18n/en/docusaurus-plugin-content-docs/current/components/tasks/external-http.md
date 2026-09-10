---
sidebar_position: 2.1
title: External HTTP Task
description: Runs the HTTP call directly inside the Orchestrator instead of hopping to the Execution service
---

# External HTTP Task (Type: `22`)

:::note
Translation pending — the Turkish page is the source of truth.
:::

External HTTP Task (type `22`, added in v0.0.88) shares the exact same configuration surface as HTTP Task (type `6`): `url`, `method`, `headers`, `body`, `contentType`, `rawBody`, `timeoutSeconds`, `validateSsl`, `acceptedStatusCodes`. The only difference is where it runs: instead of routing through the Execution service's `/execution/invoke/{type}/{key}` hop, the Orchestrator executes the call in-process through the same shared `HttpTaskInvocation` send core.

Because there is no Dapr hop, the Dapr sidecar circuit breaker and `ExecutionApi:InvocationTimeoutSeconds` layer do not apply — the task's own `timeoutSeconds` (default 30) and the job budget are the only bounds. Mapping scripts that cast `task as HttpTask` and call `SetUrl`/`SetHeaders`/`SetBody` work unchanged, since `ExternalHttpTask` derives from `HttpTask`. Reserved trace headers (`traceparent`, `tracestate`, `baggage`, `x-request-id`, `X-Correlation-Id`, `X-Workflow-Instance-Id`) cannot be overridden from the task binding, same as type 6.

The `@burgan-tech/vnext-schema@0.0.53` package does not yet recognize type `22` in its enum, so `npm run validate` rejects it while runtime publish and execution work fine.
