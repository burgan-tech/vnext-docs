---
sidebar_position: 4
title: Telemetry
description: Tracing, metrics, and logging configuration — DetailLevel, OTLP endpoint, Dapr sidecar tracing
---

# Telemetry Configuration

:::note
Translation pending — the Turkish page is the source of truth.
:::

vNext configures tracing/metrics/logging on every host through the `Telemetry` section built on Aether. `Tracing:DetailLevel` (`Business` default, or `Verbose`) is read once at startup; `Tracing:AdditionalSources` lists the ActivitySources registered — a source missing from this list silently drops its spans, with no error. `Logging:Enrichers:Headers` lists request headers copied onto every log record (`X-Request-Id` is deliberately excluded).

Aether treats `Telemetry:Otlp:Endpoint` in `appsettings.json` as stronger than the `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable — containerized environments must override the config key. Console exporters default to off since v0.0.86. The Dapr sidecar's own tracing block (`config.yaml`) is separate from application telemetry and requires the exact key `otel` (not `otlp`), plus `protocol` and `isSecure`.
