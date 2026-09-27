---
sidebar_position: 2
title: Attribute Indexes (x-indexed)
sidebar_label: Attribute Indexes
description: Generating index SQL for x-indexed master-schema fields with the CLI, DBA-run index preparation, and runtime routing to ready projections
---

# Attribute Indexes (`x-indexed`)

:::note
Translation pending — the Turkish page is the source of truth.
:::

Starting with v0.0.94, a master schema (`attributes.type` exactly `"master"`, no root-level `type` field) can mark scalar `string`/`number`/`integer`/`boolean` fields — including nested scalars and `date-time` strings, but not arrays, objects, `$ref` or conditional nodes — with `x-indexed: true` to request physical index preparation; `x-filterOperators` and `x-sortable` still own query permissions, and `x-indexed` anywhere in a non-master schema (even `false`) is a publish error. Publishing never creates indexes: `wf indexes generate --flow <key> --output ./index-sql` (CLI 1.0.14+, fully offline) writes a timestamped batch folder with one `<flow>.sql` per workflow, a `manifest.json` and `README.txt`, and the DBA runs each script in a maintenance window under an ACCESS EXCLUSIVE lock (5 s `lock_timeout`), adding `q_<hash>` stored generated columns, B-tree and trigram GIN indexes, reusing equivalent existing indexes and recording readiness in `AttributeIndexCatalog`; `--retire-obsolete` is a separate, explicit retirement step. Routing is opt-in via `AttributeIndexes:Enabled=true` (with `DisabledFlows` and `CatalogCacheSeconds=30`), and any catalog or cache failure falls back to the existing JSON expressions with warning 70021. See the Turkish page for supported field types, the full SQL steps, when to index a field and why not every field should be indexed.
