---
sidebar_position: 8
title: View
description: vNext View component — Backend-Driven UI definitions
---

# View

The **View** component holds UI structures defined for **User Integration** on the front-end. With **Backend-Driven View** semantics, it **minimizes** platform release cycles (Mobile, Web, etc.).

> **Schema:** [`vnext-schema/view-definition.schema.json`](https://github.com/burgan-tech/vnext-schema)

## Usage Model

View definitions are made at the state or transition level. The **vNext Client Workflow Manager SDK** delivers the **correct view** to the user during state and transition cycles. The view is **rendered** by requesting required data from the Data Function.

For the detailed flow: [User Integration (conceptual)](/docs/concepts/user-integration).

## Required Fields

| Field | Type | Description |
|---|---|---|
| `key` | string | Unique view identifier |
| `version` | string | View version (SemVer) |
| `domain` | string | Owning domain |
| `flow` | string | Associated flow |
| `flowVersion` | string | Flow version |
| `tags` | string[] | Tags |
| `attributes` | object | View definition (template, platform overrides, etc.) |

## Platform Overrides

A single view can include platform-specific overrides:

- `default` — fallback render
- `web` — web-specific
- `mobile-ios` — iOS-specific
- `mobile-android` — Android-specific

The Client SDK reads the platform header and renders the correct variant.

## Typical Use Cases

- **State view**: main screen rendered when arriving at a state
- **Transition view**: pre-transition popup/modal confirmation
- **Form rendering**: form generation together with Schema
- **Backend-driven UI**: screen changes shipped via backend deploy only

## Related

- [Views (conceptual)](/docs/components/view) — conceptual explanation
- [User Integration](/docs/concepts/user-integration) — view loop flow
- [Schema component](/docs/components/schema) — form validation integration
- Schema source: [vnext-schema (GitHub)](https://github.com/burgan-tech/vnext-schema)
