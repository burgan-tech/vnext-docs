---
sidebar_position: 6
title: Caller Role Provider
description: The provider that resolves the caller's role set for authorization decisions — default and morph-idm
---

# Caller Role Provider Configuration <sup>New</sup> v0.0.88

:::note
Translation pending — the Turkish page is the source of truth.
:::

vNext resolves the caller's role set — the input to `transition.roles`, `availableIn[].roles`, `queryRoles`, and schema `x-roles` — through a pluggable `CallerRoleProvider:Provider` setting: `default` (unchanged `ICurrentUser.Roles` / `role` header behavior) or `morph-idm` (one memoized HTTP call per request scope to an external IDM, sending `sub`/`act_sub`/`position` and never the `role` header, with the returned operation set evaluated by the same local grant engine). Since v0.0.96 the morph-idm provider fails **open to an empty role set**: an error status, timeout, transport failure, unparseable body or `204` resolves to `[]` (no longer a 403 `Authorization:110004`), and an empty set can only narrow what the caller sees. Since v0.0.97 a non-blank `role` header replaces the morph-idm answer (morph-idm is not called).

Since v0.0.88, `function.roles` is no longer a gate on direct custom function calls — only the `authorize` function evaluates it; the Domain/Flow/Instance scope check is unaffected.

## Gateway precondition: the `role` header

:::warning[A client-supplied `role` header is taken at face value]
Under both providers a client-supplied `role` header is accepted **as is**: under `default` that header is the role source, and under `morph-idm` a non-blank header replaces the service's answer. The gateway in front of the runtime must therefore **strip it or overwrite it from the token** (never pass it through or append to it). This is a deployment precondition; the runtime does not verify where the header came from.
:::
