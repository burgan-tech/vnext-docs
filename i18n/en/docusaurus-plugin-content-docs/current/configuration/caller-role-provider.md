---
sidebar_position: 6
title: Caller Role Provider
description: The provider that resolves the caller's role set for authorization decisions — default and morph-idm
---

# Caller Role Provider Configuration <sup>New</sup> v0.0.88

:::note
Translation pending — the Turkish page is the source of truth.
:::

vNext resolves the caller's role set — the input to `transition.roles`, `availableIn[].roles`, `queryRoles`, and schema `x-roles` — through a pluggable `CallerRoleProvider:Provider` setting: `default` (unchanged `ICurrentUser.Roles` / `role` header behavior) or `morph-idm` (one memoized HTTP call per request scope to an external IDM, sending `sub`/`act_sub`/`position` and never the `role` header, with the returned operation set evaluated by the same local grant engine). The morph-idm provider is fail-closed: a provider error is memoized as a 403 for the rest of the scope.

Since v0.0.88, `function.roles` is no longer a gate on direct custom function calls — only the `authorize` function evaluates it; the Domain/Flow/Instance scope check is unaffected.
