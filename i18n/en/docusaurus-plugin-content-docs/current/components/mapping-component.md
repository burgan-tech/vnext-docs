---
sidebar_position: 6
title: Mapping Component
description: vNext Mapping component (sys-mappings) — reusable, versioned script helpers, scripts references and REF encoding
---

# Mapping Component (sys-mappings)

The **Mapping** component turns script mapping code into **reusable**, **versioned** helpers. Repeated transformation/utility code (JSON serialization, crypto, formatting, etc.) is defined once and referenced from many components. Via the **plugin** capability it can also embed third-party libraries/DLLs (assemblies) into the script context, removing the need for separate "utility APIs" in business cases.

> **Schema:** [`vnext-schema/mapping-definition.schema.json`](https://github.com/burgan-tech/vnext-schema) · Flow: `sys-mappings`

A Mapping component is consumed in two ways:

1. **`scripts.helpers[]`** — the helper class is included into the consuming component's script context and called directly (e.g. `JsonHelper.Serialize(...)`).
2. **`encoding: "REF"`** — a mapping object's code becomes a **reference** to this component instead of an inline string.

## Definition JSON Example

```json
{
  "key": "json-helper",
  "version": "1.0.0",
  "flow": "sys-mappings",
  "domain": "core",
  "flowVersion": "1.0.0",
  "tags": ["helper", "json"],
  "attributes": {
    "name": "JsonHelper",
    "location": "./src/JsonHelper.csx",
    "code": "using Newtonsoft.Json; public static class JsonHelper { public static string Serialize(object v) => JsonConvert.SerializeObject(v); }",
    "encoding": "NAT"
  }
}
```

## Properties

### `attributes`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | **Yes** | — | Helper/class name (e.g. `JsonHelper`), `minLength: 1` |
| `location` | string | No | — | Code file path (pattern `^\./.*\.csx$`) |
| `code` | string | **Yes** | — | Mapping code content (may be empty when sourced from `location`) |
| `encoding` | string | No | `B64` | `B64` (Base64) or `NAT` (native C#) |

:::caution[sys-mappings cannot be `REF`]
A Mapping component's `encoding` may only be `B64` or `NAT`. **`REF` is not allowed** — the sys-mappings component is itself the reference target and cannot reference itself.
:::

## Scripts: Helper References and Allowed Assemblies

Other components reference this component as a helper through the `scripts` object on their mapping objects (and on workflow flow-level `attributes`):

```json
"scripts": {
  "helpers": [
    { "key": "json-helper", "version": "1.0.0", "domain": "core", "flow": "sys-mappings" }
  ],
  "allowedAssemblies": ["Newtonsoft.Json"]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `helpers` | array | References to sys-mappings components (`key`, `version`, `domain`, `flow: "sys-mappings"`) |
| `allowedAssemblies` | string[] | Allowed .NET assemblies for the script context (added to the sandbox allow-list) |

For the allow-list and the default ban list, see [Scripting / Sandbox](/docs/configuration/scripting). For a flow-wide helper/assembly, use workflow [`attributes.scripts`](/docs/components/workflow#scripts-helpers--allowed-assemblies).

## REF Encoding

A mapping/scriptCode object can reference a sys-mappings component instead of carrying inline code. When `encoding: "REF"`, `code` is a **reference object**:

```json
"mapping": {
  "encoding": "REF",
  "code": { "key": "initial-mapping", "version": "1.0.0", "flow": "sys-mappings", "domain": "core" }
}
```

- `code` is a mappingRef: `key`, `version`, `domain`, `flow: "sys-mappings"`.
- sys-mappings itself cannot be `REF` (no self-reference).
- In **Forge Studio**, selecting `REF` opens a pickup dialog listing existing sys-mappings components (select / clear / create), like other reference fields (see [Forge Studio](/docs/tools/forge-studio)).

`REF` is valid in all mapping objects: transition mapping, rule, timer, viewRule, subflow mapping, task/extension/function mapping.

## Example Components

| Example | What it does | Allowed assembly |
|---------|--------------|------------------|
| [`json-helper`](https://github.com/burgan-tech/vnext-example/blob/master/core/Mappings/account-opening/json-helper.json) | `JsonHelper.Serialize(...)` (Newtonsoft.Json) | `Newtonsoft.Json` |
| [`rsa-crypto`](https://github.com/burgan-tech/vnext-example/blob/master/core/Mappings/account-opening/rsa-crypto.json) | `RsaCryptoHelper.Encrypt/Decrypt` (RSA OAEP-SHA256) | `System.Security.Cryptography` |
| [`initial-mapping`](https://github.com/burgan-tech/vnext-example/blob/master/core/Mappings/account-opening/initial-mapping.json) | `ITransitionMapping` start transition input mapping (REF target) | — |

## Component Tree and Configuration

Mapping components live under the domain's `Mappings/` folder; `vnext.config.json` adds `mappings` to `paths` and `exports`.

## Related

- [Mapping Guide](/docs/components/mappings) — inline mapping, `ScriptContext`, `ScriptBase`
- [Interfaces](/docs/components/interfaces) — `IMapping`, `ITransitionMapping`, `IOutputHandler`
- [Scripting / Sandbox](/docs/configuration/scripting) — `allowedAssemblies`, sandbox, ban list
- Schema source: [vnext-schema (GitHub)](https://github.com/burgan-tech/vnext-schema)
