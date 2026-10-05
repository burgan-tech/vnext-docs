---
sidebar_position: 7
title: "Observability: Traces, Logs and Metrics"
description: Correlation carriers, reserved headers, the span tree, trace lanes and script/fan-out metrics
---

# Observability: Traces, Logs and Metrics

:::note
Translation pending — the Turkish page is the source of truth.
:::

This guide covers the four correlation carriers a client request travels through (W3C trace context, `X-Request-Id`, `X-Correlation-Id`, `X-Workflow-Instance-Id`), which headers a task binding can never override, and how to query Elastic/Kibana by `workflow.instance.id`, `correlation.id` and `x_request_id`. It documents the always-on (Business-level) span tree introduced in v0.0.87 — `TransitionJob.Execute/{key}`, `Step.{Name}`, `Task.Execute.{taskKey}`, `Cache.Get/{cacheKey}`, `Script.Compile/{identity}` and more — plus flat trace lanes and the synthetic activation-episode span. It closes with the script and fan-out Prometheus metrics (`script_compilations_total`, `script_execution_duration_seconds`, `workflow_fanout_batch_size`, …) and notes that `script_executions_total` is deprecated in favor of them. Since v0.0.99 `X-Request-Id` is no longer a reserved task-binding header (a non-empty mapping value wins, otherwise vNext's own request id is sent), credential headers (`sub`, `act_sub`, `position`, `client_id`, `role`) are forwarded fill-if-absent, and new read endpoints expose transition/state metrics per instance and opt-in function execution metrics (`executionLog: "E"`, `Workflow:FunctionExecutionJournal`).
