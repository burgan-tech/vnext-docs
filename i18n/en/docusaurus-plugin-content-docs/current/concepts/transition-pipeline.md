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

**A parked Busy continuation is claimed once** (<sup>New</sup> v0.0.105). Because `updateData` takes no lock, N parallel `updateData` requests that found an instance parked in Busy (an interaction wait with no live owner) all passed `HasLiveTransitionOwnerAsync` and all took the same continuation over: the automatic chain ran N times, the parent was notified and finalized more than once, and a late copy wrote a stale `Status=B` over the settled state. Before the takeover, `TransitionPipeline` now claims the continuation with one set-based `UPDATE` on the new nullable column `Instances.ContinuationClaimedAt` (`Status='B' AND CurrentState=@state AND` no claim younger than 60 s). The winner runs the chain and clears the claim in a `finally`; a loser drops its continuation and logs `10182` (`UpdateDataContinuationClaimLost`). A continuation that arrives after the chain moved on fails the `CurrentState` check instead of waiting out the TTL; a crashed owner's claim simply expires. A reserve from Active needs no claim, and the claim does not move `modifiedAt`. **Deploy:** the column comes with migration `20261109120000_AddInstanceContinuationClaim` — run DbMigrator before rolling out the hosts.

See the Turkish page for the full step table, profile exclusion tables, and worked examples.
