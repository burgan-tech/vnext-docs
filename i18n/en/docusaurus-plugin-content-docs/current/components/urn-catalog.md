---
id: urn-catalog
title: URN Catalog & Binding
sidebar_label: URN & Binding
sidebar_position: 9
description: vNext URN addressing scheme — urn:vnext / urn:client prefixes, flow/transition/function formats and ${param} binding
---

# URN Catalog & Binding

A **URN** (Uniform Resource Name) is the standard way to address a resource in the vNext platform — starting a flow, triggering a transition, calling a function — as a single portable, human-readable string. Views, pseudo-ui actions (`command`), schema data sources (`x-lov`, `x-lookup`) and client deeplinks all use this catalog as a shared contract.

This page is the **single source of truth** for URNs. Whenever another page (View, Pseudo UI, Functions) needs a URN format, it references this page.

:::danger[Breaking change — `urn:amorphie` removed]
The legacy `urn:amorphie:...` addressing scheme has been **completely removed** and is no longer supported. All URNs must follow the new structure below. The migration is not backward compatible (forced migration).
:::

---

## Prefix (Namespace)

The second segment of a URN is the **namespace**, which determines which authority resolves the address.

| Prefix | Authority | Usage |
|--------|-----------|-------|
| `urn:vnext` | vNext runtime | All server-resolved resources — flow, transition, function |
| `urn:client` | Client application | The client's **local** behaviors (e.g. local navigation, device action). The runtime does not resolve these; the client interprets them itself |

---

## URN Formats

General skeleton:

```text
urn:<namespace>:<type>:<command>:<domain>:<flow>[:<instanceId>[:<key>]]
```

- **type** — resource family: `flow` (flow operations), `fn` (function) or `res` (system component resource — has its own format, see below).
- **command** — the operation. For `flow`: `start` / `transition`; for `fn`: `get` / `post` / `patch` / `delete`.
- Whether the trailing segments exist (instance, transition/function key) depends on the operation; see the tables below.

### Flow Start

| | |
|---|---|
| **Format** | `urn:<namespace>:flow:start:<domain>:<flowName>` |
| **Example** | `urn:vnext:flow:start:onboarding:kyc-main-flow` |
| **HTTP equivalent** | `POST /api/v1/{domain}/workflows/{flow}/instances/start` |

Starts a new instance of the given flow. It carries no `instanceId` because the instance does not exist yet.

### Transition Request (instance-specific)

| | |
|---|---|
| **Format** | `urn:<namespace>:flow:transition:<domain>:<flowName>:<instanceId>:<transitionName>` |
| **Example** | `urn:vnext:flow:transition:onboarding:kyc-main-flow:${param}:approved` |
| **HTTP equivalent** | `PATCH /api/v1/{domain}/workflows/{flow}/instances/{instance}/transitions/{transitionKey}` |

Triggers the named transition on a specific instance. `instanceId` is usually filled via [binding](#binding-formatting) (`${param}`).

### Current Transition Request (instance-less)

| | |
|---|---|
| **Format** | `urn:<namespace>:flow:transition:<domain>:<flowName>:<transitionName>` |
| **Example** | `urn:vnext:flow:transition:onboarding:kyc-main-flow:approved` |

Triggers the transition in the active (current) instance context; carries no `instanceId`. Used when the client knows the instance it operates on from context.

### Function Request

Function URNs vary along two axes:

1. **Command** — written explicitly (`get` / `post` / `patch` / `delete`) or omitted. Since the **default is `get`**, the command-less form is valid.
2. **Scope** — whether the function is called in an instance context (`flow` + `instanceId`) or at the domain level (`domain` only).

| Scope | Command | Format | Example |
|-------|---------|--------|---------|
| Instance | Present | `urn:<ns>:fn:<command>:<domain>:<flow>:<instanceId>:<functionKey>` | `urn:vnext:fn:get:onboarding:kyc-main-flow:${param}:custom-function` |
| Instance | Omitted (`get`) | `urn:<ns>:fn:<domain>:<flow>:<instanceId>:<functionKey>` | `urn:vnext:fn:onboarding:kyc-main-flow:${param}:custom-function` |
| Domain | Present | `urn:<ns>:fn:<command>:<domain>:<functionKey>` | `urn:vnext:fn:get:onboarding:custom-function` |
| Domain | Omitted (`get`) | `urn:<ns>:fn:<domain>:<functionKey>` | `urn:vnext:fn:onboarding:custom-function` |

**HTTP equivalents:**

```text
# Instance-scoped function
urn:vnext:fn:get:onboarding:kyc-main-flow:${param}:custom-function
  → GET /api/v1/onboarding/workflows/kyc-main-flow/instances/{instance}/functions/custom-function

# Domain-scoped function
urn:vnext:fn:onboarding:custom-function
  → GET /api/v1/onboarding/functions/custom-function
```

#### Function Command Values

| Command | HTTP method | Description |
|---------|-------------|-------------|
| `get` | GET | Read data (default — assumed when omitted) |
| `post` | POST | Create a new resource |
| `patch` | PATCH | Partial update |
| `delete` | DELETE | Delete |

### Resource Request

Used to return the **definition data** of system components (schema, flow, view, task, etc.). `res` stands for **Resource**; `res-key` indicates which system component it is. This URN actually invokes a **data function** behind the scenes and returns the data of the corresponding definition.

| | |
|---|---|
| **Format** | `urn:<namespace>:res:<res-key>:<domain>:<key>` |
| **Example** | `urn:vnext:res:schema:core:input-schema` |

Unlike the other formats, it carries no `command`, `flow` or `instanceId` segments; it addresses the system component directly via `<res-key>:<domain>:<key>`.

#### `res-key` Values

Each `res-key` corresponds to the system flow where the related component is stored:

| `res-key` | System flow | Component |
|-----------|-------------|-----------|
| `schema` | `sys-schemas` | [Schema](/docs/components/schema) |
| `flow` | `sys-flows` | [Workflow](/docs/components/workflow) |
| `extension` | `sys-extensions` | [Extension](/docs/components/extension) |
| `function` | `sys-functions` | [Function](/docs/components/functions/) |
| `view` | `sys-views` | [View](/docs/components/view) |
| `task` | `sys-tasks` | [Task](/docs/components/tasks/) |

:::tip[View `dataSchema` usage]
This structure is also used to address the schema a view is bound to in its `dataSchema` field — e.g. `urn:vnext:res:schema:customer:registration-form`. For details in the Pseudo UI context, see [Schema Definition](/docs/how-to/view-consept/schema-tanimi).
:::

---

## Binding Formatting

To inject values at runtime into URN, HTTP and Deeplink structures, **binding** is used. The only accepted format:

```text
${param}
```

The renderer / client replaces `${param}` expressions with the relevant value from context (e.g. the active `instanceId`, the selected record).

| Structure | Binding support | Note |
|-----------|-----------------|------|
| **URN** | ✅ `${param}` | Usually in the `instanceId` segment |
| **Http** | ✅ `${param}` | In query or path |
| **Deeplink** | ✅ `${param}` | Currently only **full path** is supported |

Examples:

```jsonc
// URN — instanceId binding
"urn:vnext:flow:transition:onboarding:kyc-main-flow:${param}:approved"

// Http — query parameter binding
{ "href": "https://example.com/detail?id=${param}" }

// Deeplink — full path binding
{ "href": "on-burgan//onboarding/${param}" }
```

:::tip[Raw JSON + field input]
The `content` fields of view types (Http / Urn / Deeplink) support both a structured input field and raw JSON entry. `${param}` binding is valid in both. For content shapes, see [View → Content Types](/docs/components/view).
:::

---

## Related

- [View component](/docs/components/view) — Http / Deeplink / URN view content shapes
- [Pseudo UI → Actions and Hooks](/docs/how-to/view-consept/aksiyonlar) — using URNs in Button `command`
- [Functions](/docs/components/functions/) — function components and call endpoints
- [Authorization](/docs/concepts/authorization) — transition/function authorization
- [REST API](/docs/api-reference/rest-api) — HTTP endpoints URNs resolve to
