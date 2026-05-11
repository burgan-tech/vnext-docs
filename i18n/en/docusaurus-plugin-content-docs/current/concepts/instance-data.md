---
sidebar_position: 9
title: Instance Data Structure
description: vNext's immutable, versioned, queryable instance data model
---

# Instance Data Structure

The vNext platform has a **"Data Repository"** capability. It holds **all process data** as **instance data** internally, makes it **queryable**, and provides a **service layer** (via Functions).

This approach **minimizes the need to host data in external databases** during process design.

## Core Properties

### Immutable

Instance data is **immutable**. When a change occurs, the existing data is not mutated; a **new version** is produced.

### Semantic Versioning

Per the **VersionStrategy** specified in flows, instance data is **versioned semantically**:

- **Patch** — minor changes (task results)
- **Minor** — backward-compatible data additions
- **Major** — backward-incompatible changes

### Task Results → Patch

The system **always versions task results as Patch**. This makes every task output traceable and rollback to prior versions possible.

### Full-Merge & Latest

Data is always versioned with **full-merge** semantics, marking the **Latest**. Every new version contains the entirety of the previous version plus the delta.

```
v1.0.0 → { customer: { id: "1" } }
v1.0.1 → { customer: { id: "1", name: "Alice" } }   ← Latest, full state
v1.0.2 → { customer: { id: "1", name: "Alice", age: 30 } }   ← Latest now
```

## Filtering and Querying

Instance data supports **advanced filtering**:

- JSONPath-like patterns
- Indexed queries on master-schema fields
- Pagination + sort
- Cross-instance search

For detail: [Instance Filtering](/docs/how-to/instance-filtering)

## Master Schema Impact

The workflow's **`attributes.schema`** (master schema) defines the **main structure** of instance data. Every data change is validated for **consistency** against the master schema.

See [Schema component](/docs/components/schema) — master schema usage.

## Practical Implications

- Process data becomes a **self-contained** data store
- Audit trail is automatic (every version is preserved)
- Retroactive analysis is possible
- Cross-domain data sharing happens via **Functions** — no direct DB access needed
- Master schema changes are **versioned** — old instances are not affected

## Related

- [Schema component](/docs/components/schema) — master schema
- [Instance Filtering](/docs/how-to/instance-filtering) — filtering syntax
- [Built-in Functions](/docs/components/functions/built-in) — Data Function
- [Versioning](/architecture/patterns/versioning) — semantic versioning principle
