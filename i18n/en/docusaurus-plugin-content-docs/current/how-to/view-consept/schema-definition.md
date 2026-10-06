---
id: schema-tanimi
title: Schema Definition
sidebar_label: Schema Definition
sidebar_position: 4
description: Anatomy of schema.json, JSON Schema basics and the x-* extensions
---

# Schema Definition

:::info Translation pending
Translation pending — the Turkish page is the source of truth.
:::

A schema defines a screen's **data contract**: its fields, types, validations and data sources, plus `x-*` extensions (`x-labels`, `x-errorMessages`, `x-enum`, `x-lov`, `x-lookup`, `x-conditional`, `x-binding`, `x-filterOperators`, `x-sortable`, `x-displayFormat`, `x-validation`). Three of them govern field access on the workflow's master (data) schema:

- **`x-roles`** — field-level visibility (`allow` / `deny` grants; DENY wins). Since v0.0.99 an entry may also be an `allOf` / `anyOf` combinator; see [Authorization](/docs/concepts/authorization). Malformed entries are now rejected at publish.
- **`x-masking`** (v0.0.99) — read-time transform: `operator` `mask` (`keepFirst`, `keepLast`, `maskingChar`; output keeps the input length, value unchanged when `keepFirst + keepLast` ≥ length) or `replace` (`params.value`). `roles` is an allow-only exemption list.
- **`x-encryption`** — `hash` (HMAC under a per-instance salt on write, `params.algorithm` `sha256` | `sha512`) or `encrypt` (AES-256-GCM per-instance key, decrypted only for the allow-only `roles`); `persisted` / `transport` are rejected. Scripts see the token and open it with `context.Instance.DecryptAsync(path)`.

Since v0.0.99 they apply on instance GET, instance list, the data function, sync start/transition responses and the GetInstance / GetInstances / GetInstanceData tasks (read with the caller's credential), in the order `x-roles` → `x-masking` → `x-encryption`. The keywords are allowed only on nested `properties` of `type: "string"`, one transform per field, and never together with `x-filterOperators`, `x-sortable` or `x-indexed`. Bump the schema version when you change them. See the Turkish page for publish rules, error codes and configuration.
