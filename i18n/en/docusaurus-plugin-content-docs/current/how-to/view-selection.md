---
sidebar_position: 3
title: View Selection
description: Rule-based view selection and conditional rendering
---

# Rule-Based View Selection

## Overview

Rule-based view selection allows you to dynamically select different views based on runtime conditions. This feature enables platform-specific UIs, role-based views, and conditional UI rendering without modifying workflow logic.

## Use Cases

- **Platform-specific views**: Show different views for iOS, Android, and Web clients
- **Role-based views**: Display different interfaces based on user roles
- **Conditional UI**: Render views based on instance data or state
- **A/B Testing**: Serve different views based on experiment conditions

## JSON Schema

The `views` property accepts an array of view entries. Each entry can have an optional `rule` that determines when it should be selected.

```json
{
  "views": [
    {
      "rule": {
        "location": "inline",
        "code": "using System.Threading.Tasks;\nusing BBT.Workflow.Scripting;\npublic class ViewIosRule : IConditionMapping\n{\n    public async Task<bool> Handler(ScriptContext context)\n    {\n        try\n        {\n            if (context.Headers?[\"x-platform\"] == \"ios\")\n            {\n                return true;\n            }\n            return false;\n        }\n        catch (Exception ex)\n        {\n            return false;\n        }\n    }\n}",
        "encoding": "NAT"
      },
      "view": {
        "domain": "my-domain",
        "key": "ios-view",
        "version": "1.0.0",
        "flow": "sys-views"
      },
      "loadData": true,
      "extensions": ["ext1", "ext2"]
    },
    {
      "view": {
        "domain": "my-domain",
        "key": "default-view",
        "version": "1.0.0",
        "flow": "sys-views"
      },
      "loadData": true
    }
  ]
}
```

## ViewEntry Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `rule` | ScriptCode | No | C# script implementing IConditionMapping for conditional evaluation. If omitted, acts as fallback. |
| `view` | Reference | Yes | Reference to the view component to load. |
| `loadData` | boolean | No | Whether to load instance data with the view. Default: false. |
| `extensions` | string[] | No | List of extensions to execute when this view is selected. |

### Rule (ScriptCode) Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `location` | string | No | Script location. Use `"inline"` for embedded code. |
| `code` | string \| object | Yes | C# code implementing IConditionMapping interface. When `encoding: "REF"`, a sys-mappings reference object. |
| `encoding` | string | No | `"NAT"` for plain text, `"B64"` for Base64, `"REF"` for a sys-mappings reference. |
| `scripts` <sup>New</sup> | object | No | Helper references and allowed assemblies — see [Mapping Component](/docs/components/mapping-component). |

### View (Reference) Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `domain` | string | Yes | Domain where the view is registered. |
| `key` | string | Yes | Unique key of the view. |
| `version` | string | Yes | Version of the view (semver format). |
| `flow` | string | Yes | Flow type, typically `"sys-views"`. |

## Rule Evaluation

### Evaluation Order

1. Views are evaluated **in array order** (first to last)
2. The **first matching rule** wins and its view is returned
3. An entry **without a rule** acts as a fallback/default
4. Always place the default view **last** in the array

### Available ScriptContext Properties

Inside the `Handler` method, you have access to `ScriptContext` with:

| Property | Type | Description |
|----------|------|-------------|
| `context.Headers` | Dictionary | HTTP request headers |
| `context.QueryParameters` | Dictionary | URL query parameters |
| `context.Instance.Data` | dynamic | Current instance data |
| `context.Instance.Key` | string | Instance key |
| `context.State` | string | Current state key |
| `context.Transition` | string | Current transition key (if applicable) |
| `context.CurrentTransition.Data` | dynamic | Original transition request body |
| `context.CurrentTransition.Header` | dynamic | Original transition request headers |
| `context.Caller` | ICallerAccessor | <sup>New</sup> v0.0.105 The caller's roles as resolved by the runtime (`HasRoleAsync`, `RolesAsync`, `IsAvailable`, …) — see [Example 4](#example-4-selecting-by-the-callers-role-contextcaller) |

## Examples

### Example 1: Platform-Based View Selection

Select different views based on the `x-platform` header:

```json
{
  "key": "checkout-state",
  "stateType": 1,
  "views": [
    {
      "rule": {
        "location": "inline",
        "code": "using System.Threading.Tasks;\nusing BBT.Workflow.Scripting;\npublic class CheckoutIosRule : IConditionMapping\n{\n    public async Task<bool> Handler(ScriptContext context)\n    {\n        try\n        {\n            if (context.Headers?[\"x-platform\"] == \"ios\")\n            {\n                return true;\n            }\n            return false;\n        }\n        catch (Exception ex)\n        {\n            return false;\n        }\n    }\n}",
        "encoding": "NAT"
      },
      "view": {
        "domain": "ecommerce",
        "key": "checkout-ios",
        "version": "1.0.0",
        "flow": "sys-views"
      },
      "loadData": true
    },
    {
      "rule": {
        "location": "inline",
        "code": "using System.Threading.Tasks;\nusing BBT.Workflow.Scripting;\npublic class CheckoutAndroidRule : IConditionMapping\n{\n    public async Task<bool> Handler(ScriptContext context)\n    {\n        try\n        {\n            if (context.Headers?[\"x-platform\"] == \"android\")\n            {\n                return true;\n            }\n            return false;\n        }\n        catch (Exception ex)\n        {\n            return false;\n        }\n    }\n}",
        "encoding": "NAT"
      },
      "view": {
        "domain": "ecommerce",
        "key": "checkout-android",
        "version": "1.0.0",
        "flow": "sys-views"
      },
      "loadData": true
    },
    {
      "view": {
        "domain": "ecommerce",
        "key": "checkout-web",
        "version": "1.0.0",
        "flow": "sys-views"
      },
      "loadData": true
    }
  ]
}
```

### Example 2: Role-Based View Selection

Show different views based on user role from instance data:

```json
{
  "key": "approval-state",
  "stateType": 2,
  "views": [
    {
      "rule": {
        "location": "inline",
        "code": "using System.Threading.Tasks;\nusing BBT.Workflow.Scripting;\npublic class ApprovalAdminRule : IConditionMapping\n{\n    public async Task<bool> Handler(ScriptContext context)\n    {\n        try\n        {\n            if (context.Instance.Data.userRole == \"admin\")\n            {\n                return true;\n            }\n            return false;\n        }\n        catch (Exception ex)\n        {\n            return false;\n        }\n    }\n}",
        "encoding": "NAT"
      },
      "view": {
        "domain": "hr",
        "key": "approval-admin-view",
        "version": "1.0.0",
        "flow": "sys-views"
      },
      "loadData": true,
      "extensions": ["adminActions"]
    },
    {
      "view": {
        "domain": "hr",
        "key": "approval-default-view",
        "version": "1.0.0",
        "flow": "sys-views"
      },
      "loadData": true
    }
  ]
}
```

### Example 3: Transition Views

The same `views` array format can be used in transitions:

```json
{
  "key": "submit-transition",
  "target": "review-state",
  "triggerType": 0,
  "views": [
    {
      "rule": {
        "location": "inline",
        "code": "using System.Threading.Tasks;\nusing BBT.Workflow.Scripting;\npublic class SubmitMobileRule : IConditionMapping\n{\n    public async Task<bool> Handler(ScriptContext context)\n    {\n        try\n        {\n            string platform = context.Headers?[\"x-platform\"];\n            if (platform == \"ios\" || platform == \"android\")\n            {\n                return true;\n            }\n            return false;\n        }\n        catch (Exception ex)\n        {\n            return false;\n        }\n    }\n}",
        "encoding": "NAT"
      },
      "view": {
        "domain": "forms",
        "key": "submit-mobile-view",
        "version": "1.0.0",
        "flow": "sys-views"
      },
      "loadData": true
    },
    {
      "view": {
        "domain": "forms",
        "key": "submit-desktop-view",
        "version": "1.0.0",
        "flow": "sys-views"
      },
      "loadData": true
    }
  ]
}
```

### Example 4: Selecting by the Caller's Role (`context.Caller`)

<sup>New</sup> v0.0.105 Instead of parsing roles out of instance data or the `role` header, a rule can read the role set the runtime resolved. It is the same set the runtime uses for its own role decisions (`default` provider: token claims, else the gateway's `role` header; `morph-idm`: the identity service).

```csharp
public class IsApprover : ScriptBase, IConditionMapping
{
    public async Task<bool> Handler(ScriptContext context) =>
        await context.Caller.HasRoleAsync("morph-idm.approver");
}
```

```json
{
  "views": [
    {
      "rule": { "location": "./src/IsApprover.csx", "code": "<BASE64>", "encoding": "B64" },
      "view": { "domain": "hr", "key": "approval-approver-view", "version": "1.0.0", "flow": "sys-views" },
      "loadData": true
    },
    {
      "view": { "domain": "hr", "key": "approval-default-view", "version": "1.0.0", "flow": "sys-views" },
      "loadData": true
    }
  ]
}
```

- Roles are resolved **lazily**: a rule that never reads them makes no provider call, and a request makes at most one.
- If the role provider cannot answer, the selection does **not** fall through to the fallback view: the request fails with `503` `Authorization:110006` (retryable).
- **Selection is not authorization.** Picking a view by role is a UX decision; it protects nothing. Write rules as positive tests and make the rule-less fallback the least privileged view.

For the API, per-surface availability and outage behaviour see [Mapping Guide → ScriptContext](/docs/components/mappings). Working example: [vnext-example `rule-schema-lab/src/IsApproverRole.csx`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/rule-schema-lab/src/IsApproverRole.csx).

## The Same Selection for Transition Schemas (`schemas`)

<sup>New</sup> v0.0.105 The selection semantics on this page — **declaration order**, **first match wins**, **a rule-less entry is the fallback and must be last** — also apply to a transition's payload schema. Every transition kind (state, shared, `startTransition`, `cancel`, `updateData`, `exit`) can declare `schema`/`schemas` the way it declares `view`/`views`; entries carry a `schema` reference instead of `view`, with no `loadData` or `extensions`.

```json
"schemas": [
  { "rule": { "location": "./src/IsCorporate.csx", "code": "<BASE64>", "encoding": "B64" },
    "schema": { "key": "corporate-payload", "domain": "core", "flow": "sys-schemas", "version": "1.0.0" } },
  { "schema": { "key": "retail-payload", "domain": "core", "flow": "sys-schemas", "version": "1.0.0" } }
]
```

How it differs from view selection:

- With no matching entry the transition is **rejected** with `400` `Transition:100025` (the instance keeps its state and is not faulted); with no schema declared at all the request is accepted.
- The rule context has **no query parameters**; `body` is the instance's latest data (`{}` when none), not the request payload.
- Automatic and scheduled transitions cannot declare `schemas`.

Full reference: [Workflow → Transition structure](/docs/components/workflow).

## Best Practices

1. **Always include a default view**: Place an entry without a `rule` at the end of the array as a fallback.
2. **Order rules from specific to general**: More specific rules should come before general ones.
3. **Keep rules simple**: Complex logic should be handled in extensions or backend services.
4. **Use meaningful view keys**: Name views descriptively (e.g., `checkout-ios`, `approval-admin-view`).
5. **Test all paths**: Ensure each rule path is tested with appropriate conditions.

## Error Handling

- If no rule matches and no default view exists, an error is returned
- Failed rule evaluation is logged and the next rule is evaluated
- <sup>New</sup> v0.0.105 Exception: when a rule read roles through `context.Caller` and the role provider could not answer, the selection does not move on to the next rule or the fallback; the request fails with `503` `Authorization:110006` (even if the rule swallowed the exception and returned `true`)
- Invalid rule syntax causes the rule to fail (continues to next)

## Related Documentation

- [View Management](/docs/components/view) - View definition and reference schema
- [Function APIs](/docs/components/functions/built-in) - View function endpoint and selection logic
- [Instance Filtering](/docs/how-to/instance-filtering) - Query parameter usage
- [Mapping Guide](/docs/components/mappings) - ScriptContext and mapping interfaces