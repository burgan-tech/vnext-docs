---
id: schema-roles
title: Schema Roles
sidebar_label: Schema Roles
description: The schema component's attributes.type role (master, transition, function, component), the annotation × role matrix and each role's rule set
---

# Schema Roles

<sup>New</sup> v0.0.100 / vnext-schema 0.0.56 — A schema component plays one **role**: a flow's stored record (master), the request body of a transition or function (input), or the data contract of an embedded view (component). The role is declared in the schema component's `attributes.type` and selects the **role vocabulary** the schema is validated against.

This page covers the roles, which `x-*` annotation is accepted in which role (the matrix) and each role's rule set. For the component's field reference see [Schema](/docs/components/schema); for each annotation in detail see [Schema Definition](/docs/how-to/view-consept/schema-tanimi).

## Why roles?

The same keyword means different things in different roles:

- `x-lov` offers choices in an **input** schema; in a **master** schema it resolves the stored key to its label.
- `x-encryption` in a master schema protects the value **at rest** (in the database); in a transition schema it asks the client to seal the value **in transit**.
- Record keywords such as `x-roles`, `x-masking`, `x-filterOperators` and `x-indexed` mean something only on the **stored record**. Written on a transition schema they do nothing, yet they give the author the impression of protection.

Without the role a validator cannot catch these mistakes. Once `attributes.type` names the role, a keyword outside that role is refused by package validation.

## Roles

| `attributes.type` | Role vocabulary | Used for | Read by |
|---|---|---|---|
| `master` | `record-vocab.json` | A flow's master (data) schema — the stored record | Runtime (write validation, read shaping, filter/sort, index, computed) and client |
| `transition` | `input-vocab.json` | A transition body | Runtime (body validation) and client (form) |
| `function` | `input-vocab.json` | A function `inputSchema` | Runtime (body validation) and client (form) |
| `component` | `component-vocab.json` | An embedded view's own dataSchema (input contract) | Client |
| absent / `""` | no role gate | A schema used in more than one role | Every keyword accepted; only `x-indexed` is refused |

The shared (base) keywords live in `data-base-vocab.json`; the view hints are a mixin added to every role (`view-hints-vocab.json`).

- For a value that is not a role (`workflow`, `schema`, `view` …):
  - the **schema package** (including the CLI and Forge) refuses it;
  - the **runtime** accepts it with a warning in this release and will refuse it in a future one. For which role a legacy value maps to, see [Schema → `attributes.type` values](/docs/components/schema#attributestype-values).
- A keyword written outside its role is refused by the package. The check is recursive: `properties`, `items`, combinators and `$defs` are scanned too.
- The record keywords the runtime applies (`x-roles`, `x-masking`, at-rest `x-encryption`, `x-filterOperators`, `x-sortable`, `x-indexed`, `x-storage`, `x-computed`) take effect only on the **master schema** the workflow's `schema` reference points to.

## Annotation × role matrix

✅ accepted · ❌ refused · ⚠️ accepted with a restriction

| Annotation | Group | master | transition | function | component | no type |
|---|---|:-:|:-:|:-:|:-:|:-:|
| `x-labels` | base | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-enum` | base | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-order` | base | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-displayFormat` | base | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-lov` | base | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-lookup` | base | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-errorMessages` | base | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-validation` | base | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-conditional` | base | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-helpText` | view hint | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-placeholder` | view hint | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-uiHint` | view hint | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-uiNote` | view hint | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-group` | view hint | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-roles` | record | ✅ | ❌ | ❌ | ❌ | ✅ |
| `x-masking` | record | ✅ | ❌ | ❌ | ❌ | ✅ |
| `x-encryption` `source: runtime` (default) | record | ✅ | ❌ | ❌ | ❌ | ✅ |
| `x-encryption` `source: client` | record + input | ⚠️ accepted, not handled by the runtime | ✅ | ✅ | ❌ | ✅ |
| `x-storage` | record | ✅ | ❌ | ❌ | ❌ | ✅ |
| `x-indexed` | record | ✅ | ❌ | ❌ | ❌ | ❌ |
| `x-filterOperators` | record | ✅ | ❌ | ❌ | ❌ | ✅ |
| `x-sortable` | record | ✅ | ❌ | ❌ | ❌ | ✅ |
| `x-computed` `evaluatedBy: runtime` | record | ✅ | ❌ | ❌ | ❌ | ✅ |
| `x-computed` `evaluatedBy: client` | record | ✅ | ❌ | ❌ | ❌ | ✅ |
| `x-context-target` | record | ✅ | ❌ | ❌ | ❌ | ✅ |
| `x-context-source` | input | ❌ | ✅ | ✅ | ❌ | ✅ |
| `x-binding` | component | ❌ | ❌ | ❌ | ✅ | ✅ |
| `x-persistance` | removed | ❌ | ❌ | ❌ | ❌ | ❌ |
| `x-encrypt` | removed → `x-encryption` `source: client` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Other `x-*` | – | ❌ | ❌ | ❌ | ❌ | ✅ (no gate) |

> The "no type" column describes package validation only. The runtime's publish rules (rule sets below) apply regardless of type. The one exception is `x-computed` `runtime`: it is refused on `transition`, `function` and `component` types.

## Rule sets

### Base and view hints: every role

| Annotation | Rule |
|---|---|
| `x-labels`, `x-enum`, `x-helpText`, `x-placeholder` | Localized text object (language code → text). `x-enum` gives one label per enum value. |
| `x-order` | Number. The field's position in a generated form (lower first). Needed because a stored schema does not keep property order (jsonb). |
| `x-displayFormat` | Non-empty string, a UI format hint (e.g. `dd.MM.yyyy`). |
| `x-lov` | Exactly **one** of `source` (a URN, fetched; supports `{{$form.x}}` interpolation) and `items` (an in-scope array expression, no request). `valueField` / `displayField` / `imageField`. `filter[].param` may carry an operator suffix (`status:in`); `filter[].value` may be a literal array. The meaning depends on the role: in an input role it offers choices, in the record role it resolves the stored key to its label. |
| `x-lookup` | A single-record enrichment source. |
| `x-errorMessages` | A localized message per validation keyword: `required`, `pattern`, `minLength`, `maxLength`, `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`, `minItems`, `maxItems`, `uniqueItems` etc. |
| `x-validation` | An extra validation rule (e.g. a function URN). The runtime runs the same validator on the transition body and on the merged record. |
| `x-conditional` | `showIf` / `hideIf` / `enableIf` / `disableIf` each take a condition: `field` + `operator` (+ `value`), or `allOf` / `anyOf` / `not`. Operators: `equals`, `notEquals`, `in`, `notIn`, `isEmpty`, `isNotEmpty`, `contains`, `greaterThan`, `lessThan`, `greaterThanOrEquals`, `lessThanOrEquals`, `startsWith`, `endsWith`. |
| `x-uiHint`, `x-uiNote`, `x-group` | Client only; the runtime does not read them. |

Details: [Schema Definition](/docs/how-to/view-consept/schema-tanimi).

### Master (record)

| Annotation | Rule (package and runtime publish) | Runtime behavior |
|---|---|---|
| `x-roles` | A `roleGrant` array: `{role, grant: allow\|deny}` or an `allOf`/`anyOf` combinator. Dynamic roles must start with `$.context.`. See [Authorization](/docs/concepts/authorization#master-schema-field-level-visibility). | Prunes, on read surfaces, a field the caller may not see. |
| `x-masking` | `operator: mask \| replace` with that operator's `params`. `roles` is an allow-only exemption list. Restrictions: <br/>• only on a `type: string` field; <br/>• the field must be reachable through nested `properties`, not the root; <br/>• not together with `x-filterOperators`, `x-sortable`, `x-indexed` or an active `x-encryption`. | Masks the value on read surfaces; the stored value is unchanged. |
| `x-encryption` (`source: runtime`) | `type: none \| hash \| encrypt`. <br/>• `hash`: only `params.algorithm` (`sha256` or `sha512`); no `roles`; not with `pattern`, `format`, `minLength`, `maxLength`, `enum` or `const`. <br/>• `encrypt`: no `params`; `roles` is an allow-only exemption list. <br/>• Common: the field must be `type: string` and reachable; not with filter, sort, index or masking; the host must have `SchemaEncryption:EncryptWrites` on. <br/>• Client members (`key`, `algorithm` …) are refused. | `hash` is applied on write. `encrypt` is stored with AES-256-GCM; on read an exempt caller gets the plaintext, everyone else the token. |
| `x-encryption` (`source: client`) | `key` and `algorithm` required (`HPKE-P256-SHA256-AES128GCM` or `RSA-OAEP-256`). Optional: `into`, `encoding` (`base64` or `base64url`), `nonce`, `envelope` (`publicKey`), `purpose`. At-rest members (`type`, `params`, `roles`, `redactInLogs`, `retentionDays`) are refused. | **Not handled.** No encryption, masking or filter refusal; the value is stored as the client sent it. |
| `x-storage` | `{ "binding": "<dapr-binding>" }`; `binding` must be non-empty, no other member. Restrictions: <br/>• the field must be `type: object`; <br/>• not at the root, inside another `x-storage` node or in a nested array; <br/>• reachable through `properties` (or the `items` of a single array); <br/>• no `content` property may be declared. See [File Fields](/docs/how-to/file-fields). | File bytes go to the Dapr binding; instance data and the transition record keep only the file handle. |
| `x-indexed` | Valid only with type `master`; boolean. When `true`: <br/>• the field must be scalar (`string`, `number`, `integer`, `boolean`); <br/>• the path must run through fixed `properties` and match `[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)*`; <br/>• not on or under `$ref`, combinator or conditional nodes. See [Attribute Indexes](/docs/how-to/attribute-indexes). | Index preparation for attribute indexes. |
| `x-filterOperators` | Each value must be one of 14 names: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `between`, `contains`, `startsWith`, `endsWith`, `in`, `nin`, `isNull`, `includes`. Query aliases (`ne`, `ge`, `le`, `like`, `match`, `startswith`, `endswith`, `isnull`) and case variants are **refused at publish**; the message names the right one. Duplicates and non-string values are refused too. See [Instance Filtering → Schema declaration vs. query token](/docs/how-to/instance-filtering#schema-declaration-vs-query-token). | Per-field operator permission on list queries. |
| `x-sortable` | Boolean. | Sort permission on list queries. |
| `x-computed` | `evaluatedBy: runtime \| client` (`server` fails with "has been renamed"). **Rules for `runtime`:** <br/>• only under nested `properties`; not at the root or under `items`/`$defs`; <br/>• not in the `required` list; <br/>• not together with `x-indexed`, `x-filterOperators`, `x-sortable`, `x-storage`, `x-roles`, `x-masking` or an at-rest `x-encryption`; <br/>• at least one of `cases` and `fallback`; each case and the fallback holds exactly one `join` (`fields` ≥ 1, `separator`) or one `arithmetic` (`op`: `add`/`subtract`/`multiply`/`divide`, `fields` ≥ 2); <br/>• `when` must be a valid condition; `whenAbsent` must be `empty` or `null`; <br/>• `fields` and `when.field` must name properties of the same object (a dotted nested path is allowed); not another runtime computed field (no chaining) and not an at-rest encrypted field. <br/>**For `client`:** the runtime does not inspect the content. | **runtime:** no flag, always on. Computed on every read surface over the data the caller can see (after roles, masking and encryption). Never stored; dropped on write. **client:** the runtime leaves it alone. |
| `x-context-target` | A root-level map: instance data path → context-store slot. See [Data Context Vocabulary](/docs/components/schema#data-context-vocabulary-data-vocab). | The client applies it on every instance read; the runtime does not read it. |

### Transition and function (input)

| Annotation | Rule | Behavior |
|---|---|---|
| `x-context-source` | The value comes from the client, not the user. One of three sources: `const` (literal), `context` (context-store slot) or `identity`. | The client draws no form field and fills the value itself. |
| `x-encryption` (`source: client`) | Same rules as the client row in the master section. The input role accepts **only** the `client` source; the `runtime` (at-rest) source is refused. | The client seals the value before sending; if it cannot seal it, it refuses the write. The runtime does nothing. |
| Record keywords | `x-roles`, `x-masking`, `x-storage`, `x-indexed`, `x-filterOperators`, `x-sortable`, `x-computed`, `x-context-target` are refused. | – |

An example transition schema: it reads the device id from the client context and seals the new password on the client.

```json title="Schemas/change-password-input.json"
{
  "key": "change-password-input",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-schemas",
  "flowVersion": "1.0.0",
  "tags": ["identity", "password"],
  "attributes": {
    "type": "transition",
    "schema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "$id": "urn:vnext:res:schema:core:change-password-input",
      "title": "Change Password",
      "type": "object",
      "required": ["newPassword"],
      "properties": {
        "deviceId": {
          "type": "string",
          "x-context-source": { "context": { "boundary": "device", "key": "device.id" } }
        },
        "newPassword": {
          "type": "string",
          "x-labels": { "tr": "Yeni şifre", "en": "New password" },
          "x-order": 1,
          "x-encryption": {
            "source": "client",
            "key": "urn:client:context:read:device:memory:device.hpke.publicKey",
            "algorithm": "HPKE-P256-SHA256-AES128GCM",
            "envelope": "publicKey"
          }
        }
      }
    }
  }
}
```

### Component

| Annotation | Rule | Behavior |
|---|---|---|
| `x-binding` | `required` or `optional`: whether the field of the component's input contract must be bound. | The host view binds its data into the component. |
| Role keywords | Every record and input keyword is refused, `x-encryption` included. Sending and recording behavior belongs to the host view's schema. | – |

## A schema used in two roles

Some schemas are used in more than one place — for example the same schema as a transition body and as a read-only view's `dataSchema`. There are two ways to handle it:

1. **Omit `attributes.type`** (or leave it `""`). No role gate applies; every keyword is accepted except `x-indexed`. The runtime's publish rules still apply regardless of type.
2. **Split the schema per role.** Write the shared fields into both schemas and give each its own role. This catches out-of-role keywords in package validation and is the preferred way.

A master schema left without a type cannot use `x-indexed`; a master schema that requests index preparation must have type `master`.

## The component role and `x-binding`

A component does **not inherit** the role of the view that embeds it. The host view **binds** its data into the component (`bind`); the component's schema carries only the contract of that binding (`x-binding: required | optional`) and the base / view-hint keywords.

Every role-specific behavior stays on the host's schema:

- What is sent and how: `x-context-source`, `x-encryption` (`source: client`).
- What the record exposes and copies out: `x-roles`, `x-masking`, `x-context-target`.

A component that submits uses a command the host passes in (`$param.submitCommand`), so the transition and its body still belong to the host. The `dataSchema` of a view that submits a transition of its own is in the `transition` role, not `component`.

## Package vs. runtime enforcement

The role rules are enforced in two layers, which differ in strictness in this release:

| Case | Schema package 0.0.56 (CLI `validate`, Forge) | Runtime v0.0.100 (publish) |
|---|---|---|
| `attributes.type` absent or `""` | Accepted (no role gate) | Accepted (before v0.0.100: `Schema type is required.`) |
| Legacy value (`workflow`, `schema`, `view`, `headers` …) | **Refused** | Accepted with a **warning**; to be refused later |
| A keyword outside its role (e.g. `x-roles` on a transition schema, `x-context-source` on a master) | **Refused** (recursive) | Not applied; the runtime validates only the keywords it applies |
| The shape of keywords the runtime applies (`x-masking`, `x-encryption`, `x-filterOperators`, `x-computed`, `x-storage`, `x-indexed`) | Shape validation | Full publish validation; refused with error messages |

The runtime's warning:

```
attributes.type 'workflow' is not a schema role (master, transition, component, function) and will be refused in a future release; use 'master' for a flow's data schema, 'transition' / 'function' for a request body, 'component' for an embedded view's dataSchema, or omit it.
```

`x-encrypt` and `x-persistance` never shipped. For client-side encryption use `x-encryption` with `source: "client"`.

## For tool authors: `addVocabularies(ajv)`

`schema-definition.schema.json` `$ref`s the role vocabularies by `$id`. A tool that uses the package with AJV (an editor plugin, a CI script …) must register the vocabularies before compiling, or compilation fails to resolve the `$ref`s:

```js
const Ajv = require('ajv');
const { addVocabularies, schemaDefinition } = require('@burgan-tech/vnext-schema');

const validate = addVocabularies(new Ajv({ strict: false })).compile(schemaDefinition);
```

A tool that wants to report rather than refuse can read each role vocabulary's `#/definitions/allowedKeywords` list as data.

## Related

- [Schema](/docs/components/schema) — component fields, `attributes.type` values and legacy-value migration
- [Schema Definition](/docs/how-to/view-consept/schema-tanimi) — each `x-*` annotation in detail
- [Authorization](/docs/concepts/authorization) — `x-roles` and the read order
- [Instance Filtering](/docs/how-to/instance-filtering) — `x-filterOperators` declarations and query tokens
- [Attribute Indexes](/docs/how-to/attribute-indexes) — `x-indexed`
- [File Fields](/docs/how-to/file-fields) — `x-storage`
- Schema package: [vnext-schema (GitHub)](https://github.com/burgan-tech/vnext-schema) — `vocabularies/*-vocab.json`
