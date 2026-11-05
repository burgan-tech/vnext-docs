---
sidebar_position: 7
title: Python Runtime Configuration
description: The Orchestrator's Workflow:PythonRuntime settings, the runtime container's environment variables and the Helm pythonRuntime block for Python Task
---

# Python Runtime Configuration

:::warning[v0.0.103 — Execution `Python:*` settings removed]
From v0.0.88 to v0.0.102 [Python Task](/docs/components/tasks/python) was configured on the Execution host through the `Python:*` section (`Enabled`, `DefaultMode`, `EnabledModes`, `PythonNet`, `Process`, `Container`…). Since v0.0.103 the Execution host carries no Python and reads **none** of these keys — leftover overrides are silently ignored. Remove them from your environment values. Migration: [v0.0.103 Breaking Changes](/blog/breaking-changes/breaking-changes-v0-0-103).
:::

Python Task now runs in the domain's own runtime container and is configured in three places:

| Layer | Where | Set by |
|---|---|---|
| Orchestrator | `Workflow:PythonRuntime:*` appsettings | The Helm chart (when `pythonRuntime.enabled: true`) |
| Runtime container | `VNEXT_PYTHON_*` environment variables | The Helm chart (`pythonRuntime.config`) |
| Deployment | Helm `pythonRuntime` block | The domain owner |

## Orchestrator: `Workflow:PythonRuntime`

```json
{
  "Workflow": {
    "PythonRuntime": {
      "AppId": "vnext-core-python-runtime-app",
      "InvokeMethod": "v1/invoke",
      "TimeoutGraceSeconds": 5
    }
  }
}
```

| Field | Type | Default | Description |
|------|-----|------------|----------|
| `AppId` | string? | empty | Dapr app-id of the domain's Python runtime. **Empty = no runtime**; every Python task fails with `503` without a call |
| `InvokeMethod` | string | `v1/invoke` | Invoke route of the contract |
| `TimeoutGraceSeconds` | integer (`1`–`30`) | `5` | Extra wait on top of the handler timeout so the runtime's own `504` arrives before the Orchestrator gives up. If this is exceeded too, the task fails with `408` |

Environment variable form: `Workflow__PythonRuntime__AppId`. With `pythonRuntime.enabled: true` the Helm chart sets it to the runtime's app-id (`vnext-<appDomain>-python-runtime-app` or `pythonRuntime.dapr.appId`); you do not set it by hand.

The handler timeout (`timeoutSeconds`) lives in the task definition, is `1`–`50` and is validated at publish — there is no separate host-side cap.

## Runtime container: `VNEXT_PYTHON_*`

| Variable | Helm field | Default | Description |
|---|---|---|---|
| `VNEXT_PYTHON_PORT` | `pythonRuntime.service.port` | `8080` | Listen port (the Dapr app port) |
| `VNEXT_PYTHON_HANDLERS` | `pythonRuntime.config.handlersPackage` | `handlers` | Package whose modules register the handlers |
| `VNEXT_PYTHON_MAX_WORKERS` | `pythonRuntime.config.maxWorkers` | `4` | Concurrent handler calls per pod |
| `VNEXT_PYTHON_MAX_REQUEST_BYTES` | `pythonRuntime.config.maxRequestBytes` | `4194304` (4 MiB) | Request body limit — keep it within the Dapr body size |
| `VNEXT_PYTHON_MAX_OUTPUT_BYTES` | `pythonRuntime.config.maxOutputBytes` | `4194304` (4 MiB) | Response body limit |

The Orchestrator additionally caps the input after the input mapping at **2 MiB**; larger input fails with `413` without a call.

Use `pythonRuntime.extraEnvConfig` for the handlers' own settings. Secrets **do not** belong there — read them through the Dapr secret store.

## Deployment: Helm `pythonRuntime`

```yaml
pythonRuntime:
  enabled: true
  replicaCount: 1
  image:
    # The DOMAIN's image: FROM ghcr.io/burgan-tech/vnext/python-runtime:<version>
    repository: registry.example.com/core/python-runtime
    tag: "1.4.0"
  config:
    handlersPackage: handlers
    maxWorkers: 4
  networkPolicy:
    enabled: true   # ingress only from this release's orchestrator pods
```

All fields (security context, resources, HPA, NetworkPolicy, probes): [Helm Chart § Python Runtime](../deployment/helm-chart#python-runtime).

## Timeout Layering

```
handler timeoutMs (= timeoutSeconds) < Orchestrator wait (timeoutSeconds + TimeoutGraceSeconds) < WorkflowExecution:TransitionJobTimeoutSeconds
```

- The longest wait is 50 + 30 = **80 s**.
- This chain is **not validated** at startup: `WorkflowExecutionOptionsValidator` only enforces `ExecutionApi:InvocationTimeoutSeconds < WorkflowExecution:TransitionJobTimeoutSeconds < chain lock lease` (see [Workflow Execution](./workflow-execution)). Keep the job budget (default 300 s) above the longest Python wait in the flow.
- Since a Python call never goes to Execution, `ExecutionApi:InvocationTimeoutSeconds` does **not** apply to it.

## Local development

The [`labs/python-runtime/`](https://github.com/burgan-tech/vnext-example/tree/master/labs/python-runtime) lab in vnext-example attaches the domain image and its Dapr sidecar (`--app-id vnext-python-runtime-app`) to the local vNext infrastructure network; the Orchestrator starts with `Workflow__PythonRuntime__AppId=vnext-python-runtime-app`. The lab runs like the Helm chart does: read-only root filesystem, non-root user, dropped capabilities.

## Related

- [Python Task](/docs/components/tasks/python) — task fields, handler authoring, contract and error codes
- [Helm Chart § Python Runtime](../deployment/helm-chart#python-runtime)
- [Workflow Execution Configuration](./workflow-execution) — timeout budget hierarchy
- Runtime doc: [python-task.md (vnext)](https://github.com/burgan-tech/vnext/blob/master/docs/runtime/python-task.md)
