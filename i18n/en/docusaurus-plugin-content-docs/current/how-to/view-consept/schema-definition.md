---
id: schema-tanimi
title: Schema Definition
sidebar_label: Schema Definition
sidebar_position: 4
description: Anatomy of schema.json, JSON Schema basics and the x-* extensions
---

# Schema Definition

:::info[Translation pending]
Translation pending — the Turkish page is the source of truth.
:::

A schema defines a screen's **data contract**: its fields, types, validations and data sources, plus `x-*` extensions (`x-labels`, `x-errorMessages`, `x-enum`, `x-order`, `x-lov`, `x-lookup`, `x-conditional`, `x-binding`, `x-filterOperators`, `x-sortable`, `x-displayFormat`, `x-validation`, `x-computed`, `x-storage`). <sup>New</sup> v0.0.100 / vnext-schema 0.0.56 — which extension is valid depends on the schema's **role** (`attributes.type`: `master`, `transition`, `function`, `component`); an extension outside its role is refused by package validation — see [Schema Roles](/docs/concepts/schema-roles). Three of them govern field access on the workflow's master (data) schema:

- **`x-roles`** — field-level visibility (`allow` / `deny` grants; DENY wins). Since v0.0.99 an entry may also be an `allOf` / `anyOf` combinator; see [Authorization](/docs/concepts/authorization). Malformed entries are now rejected at publish.
- **`x-masking`** (v0.0.99) — read-time transform: `operator` `mask` (`keepFirst`, `keepLast`, `maskingChar`; output keeps the input length, value unchanged when `keepFirst + keepLast` ≥ length) or `replace` (`params.value`). `roles` is an allow-only exemption list.
- **`x-encryption`** — `source` selects who encrypts (<sup>New</sup> v0.0.100). `source: runtime` (the default, at rest): `hash` (HMAC under a per-instance salt on write, `params.algorithm` `sha256` | `sha512`) or `encrypt` (AES-256-GCM per-instance key, decrypted only for the allow-only `roles`); `persisted` / `transport` are rejected. Scripts see the token and open it with `context.Instance.DecryptAsync(path)`. `source: client` (in transit): the client seals the value to the recipient's public key before sending (`key` and `algorithm` — `HPKE-P256-SHA256-AES128GCM` | `RSA-OAEP-256` — required; optional `into`, `encoding`, `nonce`, `envelope`, `purpose`); the runtime never handles it (no at-rest encryption, no masking, no filter refusal) and stores the value as sent. Accepted on master, transition and function schemas. The proposed `x-encrypt` never shipped — use `x-encryption` with `source: "client"`.

Since v0.0.99 they apply on instance GET, instance list, the data function, sync start/transition responses and the GetInstance / GetInstances / GetInstanceData tasks (read with the caller's credential), in the order `x-roles` → `x-masking` → `x-encryption` (`source: runtime` only) → `x-computed` (`evaluatedBy: runtime`). The keywords are allowed only on nested `properties` of `type: "string"`, one transform per field, and never together with `x-filterOperators`, `x-sortable` or `x-indexed`. Bump the schema version when you change them. See the Turkish page for publish rules, error codes and configuration.

<sup>New</sup> v0.0.100 / vnext-schema 0.0.56 also brings:

- **`x-computed`** — a derived, never-stored master-schema field: `{ evaluatedBy: runtime | client, cases?, fallback?, whenAbsent? }`. Each case (`when` + one `join` or `arithmetic`) or the fallback works over sibling properties; the first matching case wins, an unresolvable result becomes `""` (`whenAbsent: "empty"`, default) or `null`. With `runtime` (always on, no flag) the runtime computes it on every read surface (instance GET/list, data function, data history, sync start/transition response, Get* tasks) over the caller's already-shaped view, and drops it on write. It is refused on `transition` / `function` / `component` schemas, at the root / under `items` / `$defs` / combinators, in `required`, and together with `x-indexed`, `x-filterOperators`, `x-sortable`, `x-storage`, `x-roles`, `x-masking` or an at-rest `x-encryption`; `evaluatedBy: "server"` is refused (`has been renamed; use 'runtime'`).
- **`x-filterOperators`** declares canonical names only — `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `between`, `contains`, `startsWith`, `endsWith`, `in`, `nin`, `isNull`, `includes`; query tokens (`ge`, `like`, `startswith` …) are refused at publish. Query syntax is unchanged; see [Instance Filtering](/docs/how-to/instance-filtering#schema-declaration-vs-query-token).
- **`x-order`** (number, a generated form's field order, lower first), **`x-lov.items`** (an in-scope array expression, no request; exactly one of `source` / `items`) and **`x-lov.imageField`**, a `filter[].param` operator suffix (`status:in`) and literal-array `filter[].value`, extra `x-errorMessages` keys (`exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`, `minItems`, `maxItems`, `uniqueItems`) and the `x-conditional` operators `greaterThanOrEquals`, `lessThanOrEquals`, `startsWith`, `endsWith`.

### `x-storage` — file field (offloaded to a blob store)

Makes the runtime write the bytes of a master-schema property (or of an array property's `items` schema) to a Dapr output binding (blob store) instead of the instance data; the record keeps only a small handle.

```json
"identityDocument": { "type": "object", "x-storage": { "binding": "vnext-blob-local" } },
"files": { "type": "array", "items": { "type": "object", "x-storage": { "binding": "vnext-blob-s3" } } }
```

`binding` is a required, non-empty string naming a binding component loaded on the orchestration sidecar; `x-storage` takes no other member. It is valid in the master role only, and only on paths reachable through nested `properties` (or on the `items` schema of a **single-level** array reached that way) — not at the root, inside another file node, under `$defs`, combinators, conditionals or nested arrays. The property schema describes the **persisted** shape: declaring `content` under `properties`/`required` is a publish error. For the client round trip, the handle shape and status codes, see [File Fields](../file-fields).

