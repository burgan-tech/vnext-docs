---
sidebar_position: 4
title: Python Task
description: Task that calls a named handler in the domain's own Python runtime container over Dapr
---

# Python Task (Type: `23`)

:::warning[v0.0.103 — breaking change]
Since v0.0.103 Python Task **no longer carries inline script**. `config.script` and `config.executionMode` are gone; a task now names a **handler** registered in the domain's Python runtime image. The Execution host's `Python:*` settings and the `pythonNet` / `process` / `container` modes are removed as well. Migration steps: [v0.0.103 Breaking Changes](/blog/breaking-changes/breaking-changes-v0-0-103).
:::

Python Task calls a named handler registered in the **domain's own Python runtime container**. vNext acts as a wrapper: it builds the request from the standard task mapping, calls the runtime with a versioned contract, applies the timeout and turns the answer into a standard task result. The error boundary and the transition pipeline do not know that the task was Python.

```
Orchestration ──(InputHandler → invoke → OutputHandler)──▶ Dapr invoke {app-id} POST v1/invoke
                                                              │
                                     python-runtime Deployment (opt-in, per domain)
                                     FROM ghcr.io/burgan-tech/vnext/python-runtime
                                     + domain handlers + pinned requirements
```

- **No Execution hop.** The Orchestration host calls the runtime directly from its own sidecar.
- **No Python in vNext images.** No vNext image carries CPython, `pythonnet` or a Kubernetes client. A domain that does not use Python deploys nothing extra.
- **Code lives in the image, not in the task.** Handlers and their packages are installed when the domain builds its runtime image; nothing is installed at container start.

When to use it: domain-owned, **trusted** code that needs the Python ecosystem (NumPy, pandas, scikit-learn…) — calculations, scoring, data transformation. For simple transformations a [Script Task](./script) or a mapping is enough.

## A working Python task from zero

Running a Python task in a domain takes four steps:

1. [Write a handler](#1-write-a-handler) (`@handler("name")`).
2. [Build the domain image](#2-build-the-domain-image) (`FROM ghcr.io/burgan-tech/vnext/python-runtime`).
3. [Enable `pythonRuntime` in Helm](#3-enable-the-runtime-in-helm).
4. [Define and publish the task](#4-define-the-task).

### 1. Write a handler

A handler is a function decorated with `@handler("name")`. It receives the JSON input, and optionally a read-only context, and returns a strict-JSON value:

```python
# handlers/calculations.py
from vnext_runtime import HandlerContext, handler

@handler("sum_values")
def sum_values(input):
    return {"total": sum(input["values"])}

@handler("risk_score")
def risk_score(input, context: HandlerContext):
    return {"score": min(100, input["income"] // 1000), "instanceId": context.instance_id}
```

- The return value must pass `json.dumps(..., allow_nan=False)`. Convert NumPy and pandas values with `.tolist()`, `.item()` or `.to_dict()`; `NaN` / `Infinity` fail with `invalid_output`.
- An exception raised by the handler becomes a `handler_error` failure.
- `HandlerContext` fields: `domain`, `workflow`, `workflow_version`, `instance_id`, `task_key`, `correlation_id`, `timeout_ms`.
- The input is raw instance data and **may contain personal data** — do not log it.
- Every module under the `handlers` package is imported at start (`VNEXT_PYTHON_HANDLERS` names a different package).

### 2. Build the domain image

```dockerfile
ARG VNEXT_PYTHON_RUNTIME=ghcr.io/burgan-tech/vnext/python-runtime:<version>
FROM ${VNEXT_PYTHON_RUNTIME}

USER root
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --only-binary :all: --require-hashes -r /tmp/requirements.txt && rm /tmp/requirements.txt
COPY handlers /opt/vnext-python/app/handlers
USER 65532:65532
```

Pin every requirement (preferably with hashes, `pip-compile --generate-hashes`) so the image is reproducible and can be scanned before it ships. The base image carries only the stdlib-only `vnext_runtime` package — the domain adds packages such as NumPy itself. The image version belongs to the **domain**, not to vNext.

### 3. Enable the runtime in Helm

```yaml
pythonRuntime:
  enabled: true
  image:
    repository: registry.example.com/core/python-runtime
    tag: "1.4.0"
  config:
    handlersPackage: handlers
    maxWorkers: 4
```

With `enabled: true` the chart deploys the runtime and hands the Orchestrator `Workflow__PythonRuntime__AppId`. All fields: [Python Runtime Configuration](../../configuration/python) and [Helm Chart § Python Runtime](../../deployment/helm-chart#python-runtime).

### 4. Define the task

> **Schema:** `task-definition.schema.json` — type `23` entered the schema with `@burgan-tech/vnext-schema@0.0.59`.

```json
{
  "key": "calculate-risk",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["python", "risk"],
  "attributes": {
    "type": "23",
    "config": {
      "handler": "risk_score",
      "input": { "income": 85000 },
      "timeoutSeconds": 20
    }
  }
}
```

## Configuration Fields

| Field | Type | Required | Default | Description |
|------|-----|---------|------------|----------|
| `handler` | string | Yes | - | Name of a handler registered with `@handler("name")` in the runtime image. Pattern: `^[A-Za-z_][A-Za-z0-9_.-]{0,127}$` (also checked at publish) |
| `input` | any (JSON) | No | - | Default JSON input passed to the handler (null, scalar, array, object). An input mapping may replace it with `SetInput`. At most 2 MiB as authored |
| `timeoutSeconds` | integer | No | `30` | Handler timeout, `1`–`50`. The Orchestrator waits `timeoutSeconds + Workflow:PythonRuntime:TimeoutGraceSeconds` |

The config is **closed** (`additionalProperties: false`): the old `script` and `executionMode` fields are rejected by schema validation and at publish.

## Mapping

Python Task uses the standard `IMapping` like every other task. `InputHandler` shapes the request by calling `SetInput` on the task; `OutputHandler` reads the handler output from the task response:

```csharp
public class RiskScoreMapping : IMapping
{
    public Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
    {
        ((PythonTask)task).SetInput(new { income = context.Instance.Data.income });
        return Task.FromResult(new ScriptResponse());
    }

    public Task<ScriptResponse> OutputHandler(ScriptContext context) =>
        Task.FromResult(new ScriptResponse { Data = new { risk = context.Body?.data } });
}
```

Without a mapping the task result is the handler output as is.

## Runtime Contract (version 1)

Every endpoint answers `application/json`. The Orchestrator builds the contract; the domain only writes handlers.

### `POST v1/invoke`

Request (sent by the Orchestrator):

```json
{
  "contractVersion": "1",
  "handler": "risk_score",
  "input": { "income": 85000 },
  "timeoutMs": 20000,
  "context": {
    "domain": "core",
    "workflow": "loan-application",
    "workflowVersion": "1.2.0",
    "instanceId": "8f1c…",
    "taskKey": "calculate-risk",
    "correlationId": "…"
  }
}
```

Success (`200`):

```json
{ "contractVersion": "1", "status": "success", "output": { "score": 85 }, "durationMs": 12 }
```

Failure:

```json
{ "contractVersion": "1", "status": "error", "error": { "code": "handler_error", "message": "KeyError: 'income'" } }
```

### `GET v1/health` and `GET v1/manifest`

`health` answers `{"status":"ok"}` for liveness and readiness probes. `manifest` lists the contract version, runtime version, Python version and the registered handler names.

## Error Codes

On success `output` becomes the task result. A failure is a **failed task result** whose `StatusCode` is the HTTP status and whose `ErrorMessage` is `"<code>: <message>"` — [error boundary](/docs/how-to/error-handling) rules can match on either.

| HTTP | `error.code` | Source | Meaning |
|---|---|---|---|
| 400 | `bad_request`, `unsupported_contract` | Runtime | The body is not JSON / not an object, or `contractVersion` is not `1` |
| 404 | `unknown_handler` | Runtime | No handler with that name is registered in the image |
| 413 | `request_too_large` | Runtime | Body larger than `VNEXT_PYTHON_MAX_REQUEST_BYTES` (4 MiB) |
| 413 | `request_too_large` | Orchestrator | The input after the input mapping exceeds 2 MiB — **no call is made** (publish checks only the authored `config.input`) |
| 422 | `handler_error` | Runtime | The handler raised |
| 422 | `invalid_output`, `output_too_large` | Runtime | The result is not strict JSON, or larger than `VNEXT_PYTHON_MAX_OUTPUT_BYTES` (4 MiB) |
| 504 | `timeout` | Runtime | The handler did not finish within `timeoutMs` |
| 408 | - | Orchestrator | The runtime did not answer within `timeoutSeconds + TimeoutGraceSeconds` |
| 503 | - | Orchestrator | The domain has no runtime (`Workflow:PythonRuntime:AppId` is empty) — **no call is made** |

```json
"errorBoundary": {
  "onError": [
    {
      "action": 1,
      "errorCodes": ["Task:504", "Task:408"],
      "priority": 10,
      "retryPolicy": { "maxRetries": 2, "initialDelay": "PT2S", "backoffType": 1, "backoffMultiplier": 2.0 }
    },
    { "action": 0, "errorCodes": ["Task:422"], "transition": "manual-review", "priority": 20 }
  ]
}
```

`Task:503` (no runtime) is a configuration error; a retry does not fix it.

## Operating Notes

- **Isolation.** Calls share one process per pod. A handler that leaks memory or keeps global state affects the calls after it. A timed-out call keeps its worker thread until it returns (Python cannot kill a thread); keep handlers inside their timeout and size `maxWorkers` and replicas for the slowest handler. CPU-bound work is limited by the GIL: scale with **replicas**, not threads.
- **Security.** Handler code is trusted domain code. The runtime runs with a read-only root filesystem, a non-root user (UID 65532), dropped capabilities, no service-account token and a NetworkPolicy that admits only the Orchestrator sidecar (chart defaults). Secrets come from the Dapr secret store or the pod environment, **never from the task definition**.
- **Load limits.** At most `maxWorkers` calls run at once; further calls wait in the pod's queue, and that wait counts against their own timeout.
- **Timeout layering.** Handler `timeoutMs` < Orchestrator wait (`+ TimeoutGraceSeconds`) < transition job budget. The wait is at most 50 + 30 = 80 s and is **not validated** against `WorkflowExecution:TransitionJobTimeoutSeconds` (default 300) — keep the job budget above the longest Python wait in the flow.
- **Observability.** The call is a Dapr service invocation from the Orchestrator and is traced like any `daprservice` call (`Invoke.Prepare` span plus the sidecar's spans). Payloads are not logged on either side.

## Example Components

- Base-image example: [`runtimes/python/example/`](https://github.com/burgan-tech/vnext/tree/master/runtimes/python/example) (vnext) — `Dockerfile`, `handlers/calculations.py`, `requirements.txt`
- End-to-end lab: [`labs/python-runtime/`](https://github.com/burgan-tech/vnext-example/tree/master/labs/python-runtime) (vnext-example) — domain image + Dapr sidecar (`docker-compose.yml`, `lab.sh`)
- Task definitions: [`core/Tasks/python-task-lab/`](https://github.com/burgan-tech/vnext-example/tree/master/core/Tasks/python-task-lab) — e.g. [`ptl-sum.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Tasks/python-task-lab/ptl-sum.json); `ptl-fail`, `ptl-nan`, `ptl-slow`, `ptl-unknown` for the failure paths
- Workflow: [`core/Workflows/python-task-lab/python-task-lab.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/python-task-lab/python-task-lab.json)
- Integration test: [`PythonTaskLabTests.cs`](https://github.com/burgan-tech/vnext-example/blob/master/tests/Core.IntegrationTests/Tests/PythonTaskLab/PythonTaskLabTests.cs)

## Related

- [Tasks Overview](/docs/components/tasks/) — task types and the reference mechanism
- [Python Runtime Configuration](../../configuration/python) — `Workflow:PythonRuntime:*` and runtime environment variables
- [Helm Chart § Python Runtime](../../deployment/helm-chart#python-runtime) — the `pythonRuntime` block
- [Error Handling](/docs/how-to/error-handling) — `errorBoundary` rules
- Runtime doc: [python-task.md (vnext)](https://github.com/burgan-tech/vnext/blob/master/docs/runtime/python-task.md)
