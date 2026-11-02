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

**Automatic transition evaluation order** (<sup>New</sup> v0.0.102). `RunAutomaticTransitionsStep` (order 80) evaluates the current state's automatic transitions in the order `State.AutoTransitions` returns them, and **the first transition whose rule is satisfied wins**; the rest are not evaluated. Non-default automatic transitions come first, by effective priority (`priority ?? 100`) ascending; equal priorities keep declaration order (stable sort); the default automatic transition (`triggerKind: 10`) is always last. Evaluation is sequential: if a rule's script throws, the step fails and later rules are not evaluated. Earlier runtimes evaluated a transition with no `triggerKind` before one with an explicit `triggerKind: 0`; that quirk is gone. Field definition, publish rules and example: [Workflow → Automatic Transition Order](/docs/components/workflow#automatic-transition-order).

See the Turkish page for the full step table, profile exclusion tables, and worked examples.
