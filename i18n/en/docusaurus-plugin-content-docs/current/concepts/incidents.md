---
sidebar_position: 5
title: Instance Incidents
description: Persistent history of error-boundary failures in the InstanceIncidents table, the incident link block, and retry semantics
---

# Instance Incidents

:::note
Translation pending — the Turkish page is the source of truth.
:::

Starting with v0.0.92, every error-boundary or pipeline-level failure on a workflow instance is recorded as a structured **incident** in its own `InstanceIncidents` table, with unlimited history and a denormalized `HasActiveIncident` flag on the instance. The state function, `GET .../instances/{instance}`, and the instance list all expose the same `incident` link block (`hasActiveIncident`, `active.href`, `history.href`) instead of embedding incident content, so clients follow a link to read the newest unresolved incident (`GET .../incidents/active`, 404 is a normal "nothing open" answer) or the full paged history (`GET .../incidents`). One failure now produces exactly one incident row, a retry that faults again keeps the instance durably Faulted, and a successful retry closes every open incident and recomputes the flag. Since v0.0.95 the incident endpoints no longer evaluate `queryRoles` in-process — the Internal Gateway decides through `GET .../functions/authorize?queryRoles=true` — and a failed subflow start faults the parent with an incident instead of stranding it Busy, so `POST .../retry` restarts the subflow. See the Turkish page for the full field reference, retry semantics, and script-side `context.Incident` access.
