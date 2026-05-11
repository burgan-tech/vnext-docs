# Phase R — Documentation Refactoring Implementation Plan

> **For agentic workers:** Bu plan inline executing-plans pattern'ı ile ilerler. Her task TodoWrite ile izlenir, her task sonunda `npm run build` doğrulaması yapılır.

**Goal:** Mevcut Technical + Architecture dokümanlarını refactor et — naming standardizasyonu (vNext), version reference temizliği, Component sayfalarını schema'lardan distill, eksik concept/API/tooling/architecture sayfalarını ekle.

**Architecture:** `ai-docs/Refactoring_Docs.md` direktifleri kaynak alınır. ai-docs/ schemas ve helper md'ler ME (Claude) tarafından kaynak olarak okunur ama dokümanlarda **doğrudan referans verilmez** (gitignore'da). Dış tooling repos'ları için yerel klonlardaki README.md'ler kullanılır. vnext-release-viewer yerel değil → placeholder + GitHub link.

**Source paths:**
- Schemas + helpers: `ai-docs/{workflow,extension,function,schema,view,task}-definition.schema.json`, `ai-docs/{instance_filtering,schema_driven}.md`
- Forge docs: `/Users/U0B006/Documents/repos/burgan-tech/vnext-forge/docs/usage-guide/`
- CLI README: `/Users/U0B006/Documents/repos/burgan-tech/vnext-workflow-cli/README.md`
- Template README: `/Users/U0B006/Documents/repos/burgan-tech/vnext-template/README.md`
- Discovery README: `/Users/U0B006/Documents/repos/burgan-tech/vnext-domain-discovery/README.md`
- Helm Charts: `/Users/U0B006/Documents/repos/burgan-tech/vnext-helm-charts/charts/` (no README — write from chart structure)

**Tech Stack:** Docusaurus (Phase 0'da kurulu), bash + perl (transformations), npm run build (verification).

---

## Scope Decisions

1. **Naming "vnext" → "vNext"**: prose body text only. NOT in code identifiers (`vnext-app`, package names, env vars), NOT in URLs (`/api/v1/{domain}/...`).
2. **Version reference removal**: inline tags like `(v0.0.43+)`, `since v0.0.39`, "**v0.0.43**:" headers — REMOVE. Release notes (blog posts) themselves are version-tagged by definition — UNTOUCHED.
3. **Restructure Components** vs Concepts: definable, reusable units (Workflow, Extension, Function, Schema, View, Task) → **components/**. Behavioral/contextual concepts (States, Transitions, Async/Sync, User Integration, Instance Data) → **concepts/**.
4. **Tooling**: New top-level sub-category `docs/tooling/` for dev tools (CLI, Template, Helm, Forge, Release Viewer).
5. **Roadmap**: Strategic placement — `architecture/overview/roadmap.md`.
6. **Forge** (Internal): Published as part of tooling. Marked with `:::warning Internal` admonition.

---

## Target Structure Changes

```
docs/
├── concepts/
│   ├── workflow.md            (KEEP as conceptual overview, but matrix moves to components/workflow.md)
│   ├── states.md              (KEEP)
│   ├── transitions.md         (KEEP)
│   ├── schema.md              (KEEP)
│   ├── views.md               (KEEP)
│   ├── extensions.md          (KEEP)
│   ├── async-sync.md          (NEW — sync=true/false behavior)
│   ├── user-integration.md    (NEW — view loop, longpolling)
│   └── instance-data.md       (NEW — immutable data, versioning)
│
├── components/
│   ├── workflow.md            (NEW — matrix table from schema)
│   ├── extension.md           (NEW — data enrichment)
│   ├── function.md            (NEW — cross-domain BFF; rename existing functions/built-in if conflict)
│   ├── schema.md              (NEW — master-data validation)
│   ├── view.md                (NEW — UI integration)
│   ├── tasks/                 (KEEP — only tasks present in task-definition.schema)
│   ├── functions/             (RENAME functions/* if needed; keep built-in.md, custom.md)
│   ├── mappings.md            (KEEP)
│   └── interfaces.md          (KEEP)
│
├── tooling/                   (NEW category)
│   ├── index.md               (overview)
│   ├── workflow-cli.md        (from local cli README)
│   ├── template.md            (from local template README)
│   ├── helm-chart.md          (from local helm-charts/charts/)
│   ├── release-viewer.md      (placeholder + GitHub URL — not local)
│   └── forge.md               (from local forge/docs/usage-guide/)
│
├── api-reference/
│   ├── (existing 8 .cs interface pages)
│   ├── rest-api.md            (NEW — OpenAPI endpoints + DTOs)
│
├── services/
│   └── init-service.md        (KEEP)

architecture/
├── infrastructure/
│   ├── service-discovery.md   (NEW — vnext-domain-discovery)
│   └── url-templates.md       (NEW — HEOTAS pattern)
└── overview/
    └── roadmap.md             (NEW — Master Roadmap)
```

---

## Tasks

### R1: Naming Sweep + Version Reference Cleanup

- Sweep all `docs/`, `architecture/` markdown files
- Convert prose `vnext` → `vNext` (case-sensitive in body text, NOT in code/URLs)
- Remove inline version tags: `(v0.0.NN+)`, `since v0.0.NN`, `**v0.0.NN**:` heading prefixes, `(v0.0.43+)` inside parentheses
- Skip blog/ (release notes are inherently versioned)
- Skip code blocks (```...```)
- Build verification at end

### R2: Component Pages (Workflow + Extension + Function + Schema + View + Task)

- Read each schema → extract required fields, key sub-properties
- Write component page (TR + EN) with:
  - Definition (purpose)
  - Required fields table
  - Capability matrix (Workflow only — supports Shared Transitions, Views, Schema, Functions, Extensions, etc.)
  - Special transitions (Workflow only — UpdateData, Cancel, Exit, Timeout)
  - Schema GitHub link (https://github.com/burgan-tech/vnext-schema)
- Build per page

### R3: Concepts — Async/Sync + User Integration + Instance Data (3 NEW pages × TR + EN)

- async-sync.md (~50 lines)
- user-integration.md (~80 lines, includes view loop diagram in text form)
- instance-data.md (~60 lines, immutable + versioning)
- Build

### R4: REST API Reference

- New page `docs/api-reference/rest-api.md` with:
  - Endpoint table (Definition, Function, Instance — per refactoring doc)
  - DTOs (CreateInstanceDto, GetInstanceOutput, etc. — from OpenAPI)
- TR + EN
- Build

### R5: Tooling Pages (CLI, Template, Helm, Release Viewer)

- Create `docs/tooling/` directory + EN mirror
- Distill each tool's local README (or placeholder for release-viewer)
- 5 pages × TR + EN = 10 files
- Build

### R6: vNext Forge

- Create `docs/tooling/forge/` (sub-folder for multi-page tool)
- Copy + adapt from `vnext-forge/docs/usage-guide/`
- Image migration to `static/img/forge/`
- TR + EN
- Build

### R7: Architecture — Service Discovery + Url Templates

- `architecture/infrastructure/service-discovery.md` (TR + EN)
- `architecture/infrastructure/url-templates.md` (TR + EN)
- Build

### R8: Master Roadmap

- `architecture/overview/roadmap.md` (TR + EN)
- 3-bullet roadmap from refactoring doc

### R9: Final Verification

- `rm -rf build .docusaurus`
- `npm run build`
- Inventory check
- Dev server visual check
