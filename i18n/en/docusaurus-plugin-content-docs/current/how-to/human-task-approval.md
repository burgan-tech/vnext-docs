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

**Due date and priority** (<sup>New</sup> v0.0.104). Besides `title` and `description`, the `humanTask` block can carry two optional fields, and each list row returns them: `dueBy` — an ISO 8601 date (`2026-11-10`) or date-time (`2026-11-10T09:30:00+03:00`) string, served as a date-time with offset — and `priority` — a JSON number or a numeric string with a `.` decimal point (`"1.5"`; a comma-decimal `"1,5"` reads as absent), served as a number. A missing or malformed value (`"next week"`, an object) is served as `null` and the row is still listed. Ordering is unchanged: rows are still sorted by `createdAt`, newest first. The list cache key generation moved `human-task:v1` → `v2`, so the cache refills once after deploy.

```json
{
  "humanTask": {
    "title": "50.000 TL EFT onayı",
    "description": "Ahmet Yılmaz — TR33 0006 ...",
    "dueBy": "2026-11-10T17:00:00+03:00",
    "priority": 1
  }
}
```
