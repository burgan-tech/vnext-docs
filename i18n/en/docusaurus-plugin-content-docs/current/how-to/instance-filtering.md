---
sidebar_position: 2
title: Instance Filtering
description: Instance querying, filtering criteria, query patterns
---

# Instance Filtering Guide

## Overview

The vNext workflow system provides powerful filtering capabilities for querying instances. You can filter on both **Instance table columns** and **JSON data fields** using either legacy format or GraphQL-style JSON format.

## Supported Routes

### 1. Workflow instances route (recommended, +)

Use this route for **listing and filtering** workflow instances (including **GetInstancesTask** and integrations that replaced the old workflow-level patterns):

```http
GET /{domain}/workflows/{workflow}/instances?filter={...}
```

### 2. Function/Data route (instance-scoped data)

```http
GET /{domain}/workflows/{workflow}/instances/{instance}/functions/data?filter={...}
```

> **Note:** For **bulk / workflow-level** queries, prefer **`.../instances?filter=...`**. The unscoped `GET .../workflows/{workflow}/functions/data` pattern is not the supported path for **GetInstancesTask** as of  (see *release notes (Phase 3 — Release Notes)*).

Both supported list/filter entry points use the same `filter` query parameter semantics where applicable.

---

## Filter Formats

### Legacy Format

Simple key-value format: `field=operator:value`

### GraphQL Format (Recommended)

JSON-based format with logical operator support: `{"field":{"operator":"value"}}`

> ** breaking change:** The filter parameter must be a **single expression** (one JSON object or string). The previous array format `"filter": ["expr1", "expr2"]` is no longer supported. Use a single expression; combine conditions with `and`/`or` inside that expression (e.g. `{"and":[{"status":{"eq":"Active"}},{"attributes.amount":{"gt":"500"}}]}`).

---

## Filterable Fields

### Instance Table Columns

Direct database columns:

| Column | Type | Description | Supported Operators |
|--------|------|-------------|---------------------|
| `key` | string | Instance key | eq, ne, like, startswith, endswith, in, nin |
| `flow` | string | Workflow name | eq, ne, like, startswith, endswith, in, nin |
| `status` | string | Instance status | eq, ne, in, nin |
| `currentState` (or `state`) | string | Current state | eq, ne, like, startswith, endswith, in, nin |
| `effectiveState` | string | Effective state name | eq, ne, like, startswith, endswith, in, nin |
| `effectiveStateType` | int | Effective state type code | eq, ne, gt, ge, lt, le, in, nin |
| `effectiveStateSubType` | int | Effective state subtype code (+;: **7** = Cancelled, **8** = Timeout) | eq, ne, gt, ge, lt, le, in, nin |
| `createdAt` | DateTime | Creation time | eq, ne, gt, ge, lt, le, between |
| `modifiedAt` | DateTime | Modification time | eq, ne, gt, ge, lt, le, between |
| `completedAt` | DateTime | Completion time | eq, ne, gt, ge, lt, le, between |
| `isTransient` | boolean | Transient flag | eq, ne |

### JSON Data Fields (attributes)

Fields stored in the instance's JSON data can be filtered using the `attributes` prefix. However, whether a JSON field is **filterable and sortable** depends on the vocabulary (`x-filterOperators` / `x-sortable`) declared for that field in the **master schema** — see [Schema-Driven Filterability & Sorting](#schema-driven-filterability--sorting).

---

## Schema-Driven Filterability & Sorting

Instance table columns (`key`, `status`, `createdAt` …) are directly filterable/sortable. For **JSON (`attributes.*`) fields**, this capability is determined by the keywords the field carries in the **master schema**. The Data Function and instance-listing endpoints honor this definition:

| Keyword | Effect |
|---------|--------|
| `x-filterOperators` (string[]) | Allowed filter operators. **Empty or absent means the field is not filterable** |
| `x-sortable` (boolean) | When `true`, the field is sortable; absent means not sortable |
| `x-displayFormat` (string) | UI-facing format hint (e.g. `yyyy-MM-dd'T'HH:mm:ssXXX`) — does not affect filtering/sorting |

For keyword definitions, see [Schema → Filter & Sort Vocabulary](/docs/components/schema#filter--sort-vocabulary).

### Type-Operator Relationship

The behavior of an allowed operator depends on the field's JSON Schema `type`:

| Schema `type` | Operator category | SQL behavior |
|---|---|---|
| `number` / `integer` | `gt`, `lt`, `ge`, `le`, `between` | `accessor::numeric {op} @param` |
| `string` + `gt`/`lt`/`ge`/`le`/`between` | date compare | `accessor::timestamptz {op} @param` |
| `string` + `eq`/`like`/`startswith`/`endswith`/`match` | text compare | `accessor ILIKE @param` |
| `boolean` | `eq`, `ne` | equality |
| `array` (JSON array in instance data) | `includes` | `Data @> @param`; single-element array + partial object pattern at the leaf path |

### Rules

1. If `x-filterOperators` is present and non-empty, the field is filterable. Empty or absent means not filterable.
2. If `x-sortable: true`, the field is sortable. Otherwise it is not.
3. Querying a non-filterable field, or using a disallowed operator, raises **`SchemaFilterValidationException`**.
4. For the GraphQL-only `includes` operator on JSON array fields, `includes` must also be listed in the field's `x-filterOperators`. Payload size and nesting depth are bounded by **`InputValidator`** limits.

```json
"startDateTime": {
  "type": "string",
  "format": "date-time",
  "x-filterOperators": ["eq", "gt", "ge", "lt", "le", "between"],
  "x-sortable": true,
  "x-displayFormat": "yyyy-MM-dd'T'HH:mm:ssXXX"
}
```

---

## Supported Operators

| Operator | Description | Example Value |
|----------|-------------|---------------|
| `eq` | Equals | `"1111"` |
| `ne` | Not equals | `"test"` |
| `gt` | Greater than | `"100"` |
| `ge` | Greater than or equal | `"100"` |
| `lt` | Less than | `"100"` |
| `le` | Less than or equal | `"100"` |
| `between` | Between (inclusive) | `["2024-01-01", "2024-12-31"]` |
| `like` | Contains (case insensitive) | `"workflow"` |
| `startswith` | Starts with | `"payment"` |
| `endswith` | Ends with | `"flow"` |
| `in` | In list | `["Active", "Busy"]` |
| `nin` | Not in list | `["Completed", "Faulted"]` |
| `isnull` | Null or not null | `true` or `false` |

---

## Status Values

The `status` field accepts both code and name:

| Status Name | Code | Description |
|-------------|------|-------------|
| `Active` | `A` | Instance is active |
| `Busy` | `B` | Instance is processing |
| `Completed` | `C` | Instance completed successfully |
| `Faulted` | `F` | Instance encountered an error |
| `Passive` | `P` | Instance is passive |

> **:** Filtering on `status` and `state` (currentState) now works correctly in instance queries.

---

## OrderBy / Sort

Instance list and data endpoints support sorting via the `sort` or `orderBy` query parameter.

### Single field

```
?sort={"field":"createdAt","direction":"desc"}
?orderBy={"field":"status","direction":"asc"}
```

### Multiple fields

```
?sort={"fields":[{"field":"status","direction":"asc"},{"field":"createdAt","direction":"desc"}]}
```

- **direction**: `"asc"` or `"desc"` (case-insensitive). Defaults to `"asc"` if omitted.

### Sortable fields

| Field | Notes |
|-------|-------|
| `createdAt` | Creation timestamp |
| `modifiedAt` | Modification timestamp |
| `completedAt` | Completion timestamp |
| `status` | Instance status |
| `key` | Instance key |
| `currentState` / `state` | Current state (`state` is alias) |
| `attributes.fieldName` | JSON path into instance data; nested paths supported (e.g. `attributes.nested.path`). Only fields carrying **`x-sortable: true`** in the master schema are sortable |

Instance columns are applied in the database; ordering by `attributes.*` uses the latest instance data JSON and is subject to the same schema/security as filtering (see [Schema-Driven Filterability & Sorting](#schema-driven-filterability--sorting)).

---

## GraphQL Format Examples

### 1. Simple Instance Column Filter

```http
GET /banking/workflows/payment-workflow/instances?filter={"key":{"eq":"payment-12345"}}
```

### 2. Multiple Instance Column Filters (AND Logic)

Multiple fields at the same level are combined with AND logic:

```http
GET /banking/workflows/payment-workflow/instances?filter={"status":{"eq":"Active"},"createdAt":{"gt":"2024-01-01"}}
```

### 3. JSON Data Field Filter (attributes)

Filter on JSON data fields using the `attributes` prefix:

```http
GET /banking/workflows/payment-workflow/instances?filter={"attributes":{"customerId":{"eq":"CUST-123"}}}
```

### 4. Mixed Filter (Instance + JSON Fields)

```http
GET /banking/workflows/payment-workflow/instances?filter={"key":{"like":"payment"},"status":{"eq":"Active"},"attributes":{"amount":{"gt":"500"}}}
```

### 5. Date Range Filter

```http
GET /banking/workflows/payment-workflow/instances?filter={"createdAt":{"between":["2024-01-01","2024-01-31"]}}
```

### 6. Status IN Filter

```http
GET /banking/workflows/payment-workflow/instances?filter={"status":{"in":["Active","Busy"]}}
```

### 7. EffectiveState Filters

**Filter by Effective State Name:**
```http
GET /banking/workflows/payment-workflow/instances?filter={"effectiveState":{"eq":"awaiting-approval"}}
```

**Filter by Effective State SubType (Human Tasks):**
```http
GET /approvals/workflows/approval-flow/instances?filter={"effectiveStateSubType":{"eq":"6"}}
```

**Filter by Effective State SubType (Busy Tasks):**
```http
GET /processing/workflows/order-flow/instances?filter={"effectiveStateSubType":{"eq":"5"}}
```

**Combined Status and EffectiveState Filter:**
```http
GET /core/workflows/payment/instances?filter={"status":{"eq":"Active"},"effectiveStateSubType":{"eq":"6"}}
```

**EffectiveState SubType Values:**
- `0` - None
- `1` - Success
- `2` - Error
- `3` - Terminated
- `4` - Suspended
- `5` - Busy (processing in progress)
- `6` - Human (human interaction required)

---

## Logical Operators

### AND Operator

Combines multiple conditions where all must be true:

```json
{
  "and": [
    {"status": {"eq": "Active"}},
    {"attributes": {"amount": {"gt": "500"}}}
  ]
}
```

### OR Operator

Combines multiple conditions where any can be true:

```json
{
  "or": [
    {"key": {"eq": "payment-12345"}},
    {"key": {"eq": "payment-12346"}}
  ]
}
```

### NOT Operator

Negates a condition:

```json
{
  "not": {"status": {"in": ["Completed", "Faulted"]}}
}
```

### Complex Nested Example

```json
{
  "and": [
    {"status": {"eq": "Active"}},
    {
      "or": [
        {"attributes": {"priority": {"eq": "high"}}},
        {"attributes": {"amount": {"gt": "10000"}}}
      ]
    }
  ]
}
```

---

## Group By and Aggregations

### Group By with Count

```http
GET /banking/workflows/payment-workflow/instances?filter={"groupBy":{"field":"attributes.status","aggregations":{"count":true}}}
```

**Response:**
```json
{
  "groups": [
    {"name": "pending", "count": 45},
    {"name": "approved", "count": 123},
    {"name": "rejected", "count": 12}
  ]
}
```

### Group By with Multiple Aggregations

```http
GET /banking/workflows/payment-workflow/instances?filter={"groupBy":{"field":"attributes.currency","aggregations":{"count":true,"sum":"attributes.amount","avg":"attributes.amount","min":"attributes.amount","max":"attributes.amount"}}}
```

**Response:**
```json
{
  "groups": [
    {"name": "USD", "count": 150, "sum": 450000, "avg": 3000, "min": 10, "max": 50000},
    {"name": "EUR", "count": 75, "sum": 180000, "avg": 2400, "min": 50, "max": 25000}
  ]
}
```

### Supported Aggregations

| Aggregation | Description |
|-------------|-------------|
| `count` | Count of items in group |
| `sum` | Sum of numeric field |
| `avg` | Average of numeric field |
| `min` | Minimum value |
| `max` | Maximum value |

---

## Best Practices

### 1. Use GraphQL Format for Complex Queries

GraphQL format is more readable and supports logical operators.

**Good:**
```json
{
  "and": [
    {"status": {"eq": "Active"}},
    {"attributes": {"amount": {"gt": "500"}}}
  ]
}
```

### 2. Use Specific Fields for Better Performance

Filter on indexed Instance columns when possible.

**Better Performance:**
```json
{"key": {"eq": "payment-12345"}}
```

**Slower:**
```json
{"attributes": {"unindexedField": {"eq": "value"}}}
```

### 3. Use Status Names for Readability

```json
{"status": {"eq": "Active"}}
```
is equivalent to:
```json
{"status": {"eq": "A"}}
```

### 4. Use Group By for Analytics

When you need statistics, use group by instead of fetching all records.

```json
{
  "groupBy": {
    "field": "attributes.status",
    "aggregations": {"count": true, "sum": "attributes.amount"}
  }
}
```

### 5. Always Use Pagination

Always use `page` and `pageSize` parameters:

```http
GET /banking/workflows/payment-workflow/instances?filter={...}&page=1&pageSize=20
```

---

## Error Handling

### Invalid Filter Syntax

```json
{
  "error": {
    "code": "invalid_filter",
    "message": "Invalid filter syntax. Valid JSON expected."
  }
}
```

### Unsupported Operator

```json
{
  "error": {
    "code": "unsupported_operator",
    "message": "'regex' operator is not supported",
    "supportedOperators": ["eq", "ne", "gt", "ge", "lt", "le", "between", "like", "startswith", "endswith", "in", "nin", "isnull"]
  }
}
```

### Invalid Column Name

```json
{
  "error": {
    "code": "invalid_column",
    "message": "'invalidColumn' is not a valid Instance column. Use 'attributes.fieldName' for JSON fields.",
    "validColumns": ["key", "flow", "status", "currentState", "createdAt", "modifiedAt", "completedAt", "isTransient"]
  }
}
```

### Schema Filter Validation Error

Querying a field that is **not filterable** in the master schema (`x-filterOperators` empty/absent), or using a **disallowed operator**, raises **`SchemaFilterValidationException`**. The same applies to sorting via `x-sortable`. See [Schema-Driven Filterability & Sorting](#schema-driven-filterability--sorting).

---

## Performance Tips

1. **Use Pagination**: Always use `page` and `pageSize` parameters
2. **Filter on Indexed Columns**: Prefer `key`, `status`, `createdAt` for better performance
3. **Limit Group By Fields**: Use maximum 2-3 fields for optimal performance
4. **Use Date Ranges Wisely**: Narrow date ranges improve query performance
5. **Avoid Wildcard Searches on Large Datasets**: Use `startswith` or `endswith` instead of `like` when possible

---

## Related Documentation

- [Function APIs](/docs/components/functions/built-in) - Built-in system functions (State, Data, View)
- [Custom Functions](/docs/components/functions/custom) - User-defined functions
- [Instance Lifecycle](/docs/concepts/instance-data) - Starting and managing instances
- [Schema → Filter & Sort Vocabulary](/docs/components/schema#filter--sort-vocabulary) - `x-filterOperators`, `x-sortable`, `x-displayFormat` definitions