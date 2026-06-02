# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when contributing to the **vNext documentation portal**.

> **Keep `AGENTS.md` in sync with this file** — both describe the same rules; `AGENTS.md` exists for Codex. When you change one, update the other.

## What this repo is

The public documentation portal for the vNext workflow platform, published at <https://burgan-tech.github.io/vnext-docs/>. It mirrors the conceptual model documented in the platform's reference repo, [`burgan-tech/vnext-example`](https://github.com/burgan-tech/vnext-example), and is the authoritative source for component contracts, vocabularies, and runtime APIs.

## Stack

- **Docusaurus 3.x** (TypeScript)
- Default locale: **`tr`** (Turkish). English (`en`) is the secondary locale under `i18n/en/`.
- Search: `@easyops-cn/docusaurus-search-local`
- Hosting: GitHub Pages
- AI search index: **Context7** (registered via `context7.json` at the repo root — see [`context7.com/burgan-tech/vnext-docs`](https://context7.com/burgan-tech/vnext-docs))

## Top-level structure

```
docs/                 # Technical reference (default sidebar)
architecture/         # Architecture deep-dives
business/             # Business-facing guides
product/              # Product documentation
blog/                 # Release notes, breaking changes, migration guides
i18n/en/              # English translations (mirror of tr structure)
src/                  # Custom React components and pages
static/               # Static assets
sidebars.ts           # Technical sidebar (single source of truth)
sidebars-architecture.ts
sidebars-business.ts
sidebars-product.ts
docusaurus.config.ts
context7.json         # AI search index manifest
.cursor/rules/        # Cursor MDC rules (existing pattern for AI guidance)
```

## Adding a new doc page

1. **Decide the section** — `docs/` (technical), `architecture/`, `business/`, or `product/`.
2. **Pick a slug** — kebab-case. Turkish-language slugs are kept Turkish (e.g. `view-consept`, `nasil-yapilir`); don't anglicize existing ones.
3. **Frontmatter** — every page needs at minimum:
   ```yaml
   ---
   id: page-slug
   title: Page Title
   sidebar_label: Sidebar Label
   ---
   ```
4. **Sidebar entry** — add the page to the matching `sidebars*.ts`. The sidebar file is the single source of truth for navigation.
5. **Translate** — add the mirror file under `i18n/en/docusaurus-plugin-content-docs/current/...`. If the translation is pending, still add the placeholder so the page exists in both locales.
6. **Cross-link** — if the topic has an example in `vnext-example`, link to the specific file (e.g. <https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/account-opening/account-opening-workflow.json>).
7. **Update `context7.json`** if the new page is in a section not yet indexed — Context7 reindexes automatically, but the manifest defines scope.

## Component reference page template

Pages under `docs/components/**` follow a fixed template so LLMs and humans can parse them quickly:

1. **Short prose intro** (1–2 paragraphs) — what the component is and when to use it.
2. **JSON schema example** (the canonical envelope + `attributes` shape).
3. **Field reference table** — one row per top-level field: name, type, required, description.
4. **Enum tables** — for every `attributes.*` field that has a fixed value set (e.g. workflow `type`, task `type`, view `renderer`), include the full enum table with each value's meaning.
5. **Example components** — link to working examples in `vnext-example`.
6. **Related** — links to sibling pages (e.g. workflow → states, transitions, mappings).

URL pattern: `/docs/components/{type}` for single-page types; `/docs/components/{group}/{subtype}` for grouped types (`tasks/http`, `functions/built-in`, etc.).

## Localization rules

- Default locale (`tr`) lives directly under `docs/`, `architecture/`, etc.
- English mirror lives under `i18n/en/docusaurus-plugin-content-docs-{plugin}/current/...`.
- **Turkish slugs are preserved** in English translations (the URL stays `/docs/how-to/view-consept/`, the content is translated). Don't rename `view-consept` to `view-concept`.
- Frontmatter `title` and `sidebar_label` are translated; `id` and `slug` are not.

## AI guidance files

This repo carries rules for multiple AI agents:

- **`CLAUDE.md`** (this file) — for Claude Code
- **`AGENTS.md`** — for Codex; keep in sync with `CLAUDE.md`
- **`.cursor/rules/*.mdc`** — for Cursor; uses MDC frontmatter (`description`, `alwaysApply`). When adding a new rule, follow the existing `.cursor/rules/ui-design-system.mdc` pattern.

When writing AI-facing rules:
- Lead with the **why** (what mistake the rule prevents).
- Give the **canonical example** — a working snippet, not just prose.
- Point to the **detail source** (the doc page or external schema URL) — rules should be concise indexes, not full content dumps.

## Verification before opening a PR

- `npm run build` succeeds (Docusaurus compiles both locales).
- New pages appear in the correct sidebar.
- Cross-links don't 404 (`npm run build` warns on broken links).
- If you added a new section, `context7.json` covers it.
- For component reference pages, all four template sections are present.

## Related repos

- **[`burgan-tech/vnext-example`](https://github.com/burgan-tech/vnext-example)** — Reference implementation of the `core` domain. Use it for canonical JSON shapes, working `.csx` mappings, and `.http` test files. The component reference pages in this docs portal should cite specific files from that repo when illustrating real usage.
