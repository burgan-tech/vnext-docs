---
sidebar_position: 4
title: Transition Pipeline
description: Admission, pipeline step order, profiles and the lock model — one canonical reference
---

# Transition Pipeline

:::note
Translation pending — the Turkish page is the source of truth.
:::

A transition request goes through admission (a short status lock does the Active→Busy compare-and-set), the pipeline (an ordered, deterministic sequence of steps), and post-commit work (subflow start/forward). This page is the single canonical step-order table, covering the five execution profiles (Manual, AutoChain, Scheduled, Event, ErrorBoundary) and the `+Self` profile composed on top for `updateData`.

It also documents the v0.0.90 reorder that evaluates Auto (order 80) before Schedule (order 90) so a winning automatic transition never arms timers that would immediately be torn down, the admission/lock model (a millisecond-scale status lock plus a Postgres compare-and-set, with `updateData` fully lock-free and accepting parallel requests since v0.0.86), the v0.0.80 accept-time subflow chain reserve that keeps long-polling clients from observing a stale `Active` leaf, and why automatic continuations always run inline and in-process rather than as separate queued jobs.

See the Turkish page for the full step table, profile exclusion tables, and worked examples.
