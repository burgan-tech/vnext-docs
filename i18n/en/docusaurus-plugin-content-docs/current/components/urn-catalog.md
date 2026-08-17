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
- **command** — the operation. For `flow`: `start` / `transition` / `instances` / `transitions` / `history`; for `fn`: `get` / `post` / `patch` / `delete`.
- Whether the trailing segments exist (instance, transition/function key) depends on the operation; see the tables below.

### Flow Start

| | |
|---|---|
| **Format** | `urn:<namespace>:flow:start:<domain>:<flowName>` |
| **Example** | `urn:vnext:flow:start:demo:sample-flow` |
| **HTTP equivalent** | `POST /api/v1/{domain}/workflows/{flow}/instances/start` |

Starts a new instance of the given flow. It carries no `instanceId` because the instance does not exist yet.

:::info[`urn:client:flow:start` — opening the surface ≠ creating the record]
`urn:vnext:flow:start:<domain>:<flowName>` **creates a record now**. What a "New record" button usually does is something else: nothing exists until the user submits the first step, so the button only **opens the creation surface**. That behavior belongs to the client authority and is addressed as `urn:client:flow:start:<domain>:<flowName>`. The two forms carry the same words but different authorities — collapsing them would make a button that opens a wizard indistinguishable from one that silently creates a draft record.
:::

### Transition Request (instance-specific)

| | |
|---|---|
| **Format** | `urn:<namespace>:flow:transition:<domain>:<flowName>:<instanceId>:<transitionName>` |
| **Example** | `urn:vnext:flow:transition:demo:sample-flow:${param}:approved` |
| **HTTP equivalent** | `PATCH /api/v1/{domain}/workflows/{flow}/instances/{instance}/transitions/{transitionKey}` |

Triggers the named transition on a specific instance. `instanceId` is usually filled via [binding](#binding-formatting) (`${param}`).

### Current Transition Request (instance-less)

| | |
|---|---|
| **Format** | `urn:<namespace>:flow:transition:<domain>:<flowName>:<transitionName>` |
| **Example** | `urn:vnext:flow:transition:demo:sample-flow:approved` |

Triggers the transition in the active (current) instance context; carries no `instanceId`. Used when the client knows the instance it operates on from context.

### Instance Collection

| | |
|---|---|
| **Format** | `urn:<namespace>:flow:instances:<domain>:<flowName>` |
| **Example** | `urn:vnext:flow:instances:demo:sample-flow` |
| **HTTP equivalent** | `GET /api/v1/{domain}/workflows/{flow}/instances` |

Addresses a flow's **instance collection** — the record list every list screen is built on. It is deliberately `flow:start`'s sibling: the verb is the 3rd segment, the domain is 4th and positional. The domain segment is intentionally mandatory; cross-domain use (the app rendering the list and the records being listed living in different domains) is the ordinary case, and a URN without a domain would resolve differently depending on who happens to hold it.

**What the URN does NOT carry.** The URN is the **address**; paging, sort and the base filter are **policy** and live beside it as sibling fields:

```json
{
  "type": "Table",
  "source": "urn:vnext:flow:instances:demo:sample-flow",
  "pageSize": 20,
  "sort": { "field": "createdAt", "dir": "desc" },
  "filter": [{ "field": "branchCode", "operator": "eq", "value": "34001" }]
}
```

The same records paged differently are still the same records; stuffing `?page=2&size=20` into an identifier would produce two names for one thing.

**The URN decides the transport.** A list surface's `source` field accepts both an instance collection and a function URN; which transport is used is decided by the URN itself, not by a prop choice:

| `source` | Transport | What the surface gets |
|---|---|---|
| `urn:vnext:flow:instances:<domain>:<flow>` | Instance query | Server-side paging, attribute filters, sort, `hasNext`/`hasPrev`/`lastPage` |
| `urn:vnext:fn:<domain>:<key>` | Function | One fetch, every row it returns, no paging |

In the Pseudo UI context it interpolates like any other URN, which lets one generic surface be pointed at whatever record opened it:

```json
"source": "urn:vnext:flow:instances:{{$instance.parentDomain}}:{{$instance.parentFlow}}"
```

### Instance-Bound Collections (transitions / history)

A record's own runtime-derived lists are addressed with collection URNs in the same family:

| Format | Example | Meaning |
|---|---|---|
| `urn:<ns>:flow:transitions:<domain>:<flowName>:<instanceId>` | `urn:vnext:flow:transitions:demo:sample-flow:${param}` | The moves the runtime **advertises now** for the instance (available transitions) |
| `urn:<ns>:flow:history:<domain>:<flowName>:<instanceId>` | `urn:vnext:flow:history:demo:sample-flow:${param}` | The transitions the instance **has already made** |

Both are ordinary list sources: a definition renders them with any list surface such as `Menu` / `Table` — e.g. a row's "⋯" action panel becomes a view authored once, with no dedicated node behind it. To fire an advertised move, use the **Transition Request** form above.

### Function Request

Function URNs vary along two axes:

1. **Command** — written explicitly (`get` / `post` / `patch` / `delete`) or omitted. Since the **default is `get`**, the command-less form is valid.
2. **Scope** — whether the function is called in an instance context (`flow` + `instanceId`) or at the domain level (`domain` only).

| Scope | Command | Format | Example |
|-------|---------|--------|---------|
| Instance | Present | `urn:<ns>:fn:<command>:<domain>:<flow>:<instanceId>:<functionKey>` | `urn:vnext:fn:get:demo:sample-flow:${param}:custom-function` |
| Instance | Omitted (`get`) | `urn:<ns>:fn:<domain>:<flow>:<instanceId>:<functionKey>` | `urn:vnext:fn:demo:sample-flow:${param}:custom-function` |
| Domain | Present | `urn:<ns>:fn:<command>:<domain>:<functionKey>` | `urn:vnext:fn:get:demo:custom-function` |
| Domain | Omitted (`get`) | `urn:<ns>:fn:<domain>:<functionKey>` | `urn:vnext:fn:demo:custom-function` |

**HTTP equivalents:**

```text
# Instance-scoped function
urn:vnext:fn:get:demo:sample-flow:${param}:custom-function
  → GET /api/v1/demo/workflows/sample-flow/instances/{instance}/functions/custom-function

# Domain-scoped function
urn:vnext:fn:demo:custom-function
  → GET /api/v1/demo/functions/custom-function
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
"urn:vnext:flow:transition:demo:sample-flow:${param}:approved"

// Http — query parameter binding
{ "href": "https://example.com/detail?id=${param}" }

// Deeplink — full path binding
{ "href": "mock-app//sample-page/${param}" }
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
