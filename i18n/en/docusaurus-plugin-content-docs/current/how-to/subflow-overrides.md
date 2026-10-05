---
id: subflow-overrides
title: SubFlow Overrides
sidebar_label: SubFlow Overrides
description: How a parent workflow tunes a child SubFlow's timeout, roles, long-poll and view selection through state.subFlow.overrides
---

# SubFlow Overrides

:::note
Translation pending — the Turkish page is the source of truth.
:::

Starting with v0.0.95 (schema 0.0.54), `state.subFlow.overrides` lets a parent tune a child SubFlow without editing it: `overrides.timeout` replaces the child's workflow timeout as a whole (annotations included) and is now actually honoured, `transitions.<t>.roles` and `states.<s>.queryRoles` replace grant lists, `states.<s>.interaction.longPoll.{fallbackTimeoutSeconds, roles}` is field-level (an omitted field keeps the child's value, `roles` replaces the whole list; `terminate` and `rule` are never overridable, no long-poll is added to a state without one — log 20305 — and a roles override is ignored when the child uses a rule — log 20306), and `states.<s>.views.<viewKey>` / `transitions.<t>.views.<viewKey>` swap the view after the child's own rules selected it, resolved child-side on `CurrentState` with one-hop scope. The legacy `overrides.views` / `viewOverrides` maps are deprecated and mixing them with scoped view overrides is a validation error; non-blocking findings are logged as 90006, and since v0.0.99 the `authorize` function decides query roles at the deepest active SubFlow leaf only (parent-stamped `states.<s>.queryRoles` override, else the leaf state's, else the leaf workflow's) — the override is how a parent restricts a leaf. See the Turkish page for the full JSON example and resolution details.
