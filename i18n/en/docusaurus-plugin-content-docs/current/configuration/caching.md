---
sidebar_position: 3
title: Caching
description: Component, State Function and Instance Function cache configuration — L1/L2 layers, generation memo, TTLs
---

# Caching Configuration

:::note
Translation pending — the Turkish page is the source of truth.
:::

vNext runs three independent cache layers, all configured on the Orchestration host: **ComponentCache** (definition components — workflows, tasks, schemas, functions, views, extensions, mappings), **InstanceFunctionCache** (built-in data/view/schema function responses), and **StateFunctionCache** (state-function long-poll responses).

ComponentCache combines a distributed L2 layer with an in-process L1 envelope cache (`L1Enabled`, `L1SizeLimitMb`, default 64 MB) that invalidates automatically via a per-component generation token bumped on publish. `GenerationMemoSeconds` (default 5) additionally memoizes that token in-process, trading a ≤N-second cross-pod publish-visibility window for near-zero resolution cost — CI/CD pipelines must wait `N + margin` after the last publish before smoke tests or cutover. Since v0.0.106 floating resolution (`latest`, `1`, `1.2`, artifact `1.0.0`) and the publish path read **version strings only** and load at most one body (through the full-version path L1 → L2 → one row) instead of every stored version; the cache key shape moved from `s2` to `s3`, so each component resolves once per pod from the database after the upgrade and wrong answers cached by older pods are never read. No configuration change is needed.

StateFunctionCache adds `ActiveSubflowTtlMilliseconds` (default 500 ms), a short snapshot window for parent instances with an active SubFlow correlation, validated by a parent-only fingerprint ETag.
