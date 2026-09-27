---
sidebar_position: 3
title: Human Tasks and "My Pending Approvals"
description: Landing an approval step in the user's pending-approvals list — subType 6, queryRoles, the humanTask data block, channel-based views and the interaction.longPoll structure, client flow
---

# Human Tasks and "My Pending Approvals"

:::note
Translation pending — the Turkish page is the source of truth.
:::

Starting with v0.0.94, the human-task list (`GET /api/v1/{domain}/functions/human-task`) selects root instances whose deepest active level is a Human state (`subType: 6`), authorizes each one by the leaf state's `queryRoles` (a state without `queryRoles` is silently dropped), and reads the row's `title` and `description` from the `humanTask` object at the root of the leaf's latest data. The approval state itself declares `interaction.longPoll.terminate: false` without a rule, so every channel keeps polling and the state body stays cacheable; the post-decision state declares `terminate: true` with a `rule` (v0.0.94) and a short `fallbackTimeoutSeconds`, so only the channel that decided receives `interaction.terminateLongPoll` and acknowledges with `POST …/longpoll/ack`. See the Turkish page for the full state definitions, the `IConditionMapping` samples, the client call sequence, the list response shape and the silent-failure table.
