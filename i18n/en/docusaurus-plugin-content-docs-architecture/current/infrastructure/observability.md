---
sidebar_position: 1
title: Observability
description: vNext observability architecture — OpenTelemetry, Elastic APM and OpenObserve, Redis and PostgreSQL metrics, health endpoints
---

# Observability

:::note
Translation pending — the Turkish page is the source of truth.
:::

vNext is designed to be **observable by default**: a flow is observable the moment it goes live, with no extra instrumentation. This page covers the telemetry data flow (OpenTelemetry Collector fanning traces, logs and metrics out to Elastic APM/Kibana, OpenObserve and Prometheus), the distributed-tracing and structured-logging signals, service health endpoints, and how these map to the platform's operational SLOs. It links to the [Observability: Traces, Logs and Metrics](/docs/how-to/observability) how-to guide for domain-team-facing correlation carriers, the span tree, trace lanes and script/fan-out metrics.
