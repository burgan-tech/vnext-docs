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

ComponentCache combines a distributed L2 layer with an in-process L1 envelope cache (`L1Enabled`, `L1SizeLimitMb`, default 64 MB) that invalidates automatically via a per-component generation token bumped on publish. `GenerationMemoSeconds` (default 5) additionally memoizes that token in-process, trading a ≤N-second cross-pod publish-visibility window for near-zero resolution cost — CI/CD pipelines must wait `N + margin` after the last publish before smoke tests or cutover.

StateFunctionCache adds `ActiveSubflowTtlMilliseconds` (default 500 ms), a short snapshot window for parent instances with an active SubFlow correlation, validated by a parent-only fingerprint ETag.
