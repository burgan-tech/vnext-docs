# Phase 0 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Boş ama deploy edilebilir bir Docusaurus sitesi kur — `vnext-docs/` repo'sunda, 4 docs instance (Technical / Architecture / Business / Product), TR-primary + EN i18n, custom branding ve GitHub Pages CI/CD ile.

**Architecture:** Docusaurus 3.x kullanılacak. Default `docs` instance Technical için `@docusaurus/preset-classic` ile kurulur; ek 3 instance (architecture, business, product) `@docusaurus/plugin-content-docs` plugin'i olarak konfigüre edilir. i18n: `defaultLocale: 'tr'`, `locales: ['tr', 'en']`. Bir EN çeviri dosyası eksikse Docusaurus otomatik olarak TR kaynak dosyasına fallback yapar (built-in davranış). Deploy: GitHub Actions → GitHub Pages (`actions/deploy-pages`).

**Tech Stack:** Node.js LTS (≥18), npm, TypeScript, Docusaurus 3.x (latest stable), GitHub Actions.

---

## File Structure

Bu phase sonunda repo yapısı:

```
vnext-docs/
├── .github/
│   ├── workflows/
│   │   ├── deploy.yml                # main → gh-pages auto deploy
│   │   └── pr-preview.yml            # PR build verification
│   └── PULL_REQUEST_TEMPLATE.md
├── .gitignore
├── package.json
├── package-lock.json
├── tsconfig.json
├── docusaurus.config.ts              # Multi-instance + i18n config
├── sidebars.ts                       # Default (Technical) sidebar
├── sidebars-architecture.ts          # Architecture sidebar
├── sidebars-business.ts              # Business sidebar
├── sidebars-product.ts               # Product sidebar
├── README.md
├── CONTRIBUTING.md
├── docs/                             # Technical instance (TR source)
│   ├── intro.md
│   └── superpowers/                  # (existing — spec & plan files, kept)
├── architecture/                     # Architecture instance (TR source)
│   └── intro.md
├── business/                         # Business instance (TR source)
│   └── intro.md
├── product/                          # Product instance (TR source)
│   └── intro.md
├── blog/                             # Release notes
│   └── 2026-04-24-welcome.md         # Placeholder welcome post
├── i18n/
│   └── en/
│       ├── code.json                 # Theme strings
│       ├── docusaurus-theme-classic/
│       │   ├── navbar.json
│       │   └── footer.json
│       ├── docusaurus-plugin-content-docs/
│       │   ├── current.json          # Sidebar category translations
│       │   └── current/intro.md      # EN translation of docs/intro.md
│       ├── docusaurus-plugin-content-docs-architecture/
│       │   └── current/intro.md
│       ├── docusaurus-plugin-content-docs-business/
│       │   └── current/intro.md
│       ├── docusaurus-plugin-content-docs-product/
│       │   └── current/intro.md
│       └── docusaurus-plugin-content-blog/
│           └── 2026-04-24-welcome.md
├── src/
│   ├── css/
│   │   └── custom.css                # Brand colors, typography overrides
│   └── pages/
│       └── index.tsx                 # Custom landing page (4 persona portals)
├── static/
│   ├── .nojekyll                     # GH Pages: skip Jekyll processing
│   └── img/
│       ├── favicon.ico
│       ├── logo.svg
│       └── logo-dark.svg
└── docs/superpowers/specs/
    └── 2026-04-24-vnext-docs-platform-design.md  (already exists)
```

**File responsibilities:**
- `docusaurus.config.ts`: Tek konfigürasyon merkezi — i18n, instance'lar, navbar, footer, deploy bilgileri
- `sidebars*.ts`: Her instance için ayrı sidebar (auto-generation veya manuel; başlangıçta auto)
- `src/pages/index.tsx`: 4 persona için landing page (her birine giden büyük kartlar)
- `src/css/custom.css`: Renk şeması, font, brand overrides
- `i18n/en/`: EN çevirileri — eksikse TR source kullanılır
- `.github/workflows/deploy.yml`: main branch'e merge'de auto deploy
- `.github/workflows/pr-preview.yml`: PR'larda sadece build verification (deploy yok)

---

## Tasks

### Task 1: Initialize Git Repository

**Files:**
- Create: `vnext-docs/.gitignore`

- [ ] **Step 1: Verify directory state**

Run:
```bash
cd /Users/U0B006/Documents/repos/burgan-tech/vnext-docs
ls -la
```
Expected: `.code-review-graph` ve `docs/superpowers/specs/...md` dosyaları görünür; `.git` klasörü YOK.

- [ ] **Step 2: Initialize git**

Run:
```bash
git init
git branch -M main
```
Expected: "Initialized empty Git repository ..."

- [ ] **Step 3: Create .gitignore**

Create `vnext-docs/.gitignore`:
```
# Dependencies
/node_modules
.pnp
.pnp.js

# Production build
/build
.docusaurus
.cache-loader

# Misc
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local

npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.idea/
.vscode/
*.swp
*.swo

# Code review graph (local artifact)
.code-review-graph/
```

- [ ] **Step 4: Initial commit**

```bash
git add .gitignore docs/superpowers/specs/2026-04-24-vnext-docs-platform-design.md docs/superpowers/plans/2026-04-24-phase-0-foundation.md
git commit -m "chore: initialize vnext-docs repo with design spec and phase-0 plan"
```
Expected: 1 commit created on `main`.

---

### Task 2: Scaffold Docusaurus Project

**Files:**
- Create: `vnext-docs/package.json`, `vnext-docs/tsconfig.json`, `vnext-docs/docusaurus.config.ts`, `vnext-docs/sidebars.ts`, `vnext-docs/src/css/custom.css`, `vnext-docs/src/pages/index.tsx`, `vnext-docs/docs/intro.md`, `vnext-docs/blog/*` (placeholder), `vnext-docs/static/img/*`

- [ ] **Step 1: Verify Node version**

Run:
```bash
node --version
```
Expected: `v18.x` veya daha yeni. Eski ise `nvm install --lts && nvm use --lts`.

- [ ] **Step 2: Run Docusaurus initializer in a temp folder, then move files**

Sebep: `create-docusaurus` boş olmayan bir klasörde çalışmaz. Mevcut `docs/superpowers/` ve `.git` korunmalı.

```bash
cd /Users/U0B006/Documents/repos/burgan-tech/vnext-docs
npx create-docusaurus@latest _scaffold classic --typescript
```
Expected: `_scaffold/` altında Docusaurus proje yapısı oluşur (~30 saniye).

- [ ] **Step 3: Move scaffold files into repo root**

```bash
# Move config + source files
mv _scaffold/package.json _scaffold/tsconfig.json _scaffold/docusaurus.config.ts _scaffold/sidebars.ts ./
mv _scaffold/src ./src
mv _scaffold/static ./static
mv _scaffold/babel.config.js ./

# Merge blog and docs (don't clobber our specs)
mkdir -p docs blog
mv _scaffold/docs/intro.md ./docs/intro.md  # default Docusaurus intro page
cp -r _scaffold/blog/* ./blog/  # default blog posts as placeholders

# Cleanup scaffold leftovers
rm -rf _scaffold
```
Expected: Repo root'ta `package.json`, `tsconfig.json`, `docusaurus.config.ts`, `sidebars.ts`, `src/`, `static/` görünür. `docs/superpowers/` korunmuş.

- [ ] **Step 4: Install dependencies**

```bash
npm install
```
Expected: `node_modules/` oluşur, `package-lock.json` yazılır. Hata yok.

- [ ] **Step 5: Verify scaffold builds and runs locally**

```bash
npm run build
```
Expected: `Compiled successfully.` ve `build/` klasörü oluşur.

```bash
npm run start
```
Expected: `Docusaurus website is running at: http://localhost:3000/`. Tarayıcıda aç, default Docusaurus tutorial sitesini gör. Ctrl+C ile durdur.

- [ ] **Step 6: Commit scaffold**

```bash
git add .
git commit -m "feat: scaffold docusaurus 3 with typescript classic preset"
```

---

### Task 3: Configure Site Metadata, i18n, and Multi-Instance Docs

**Files:**
- Modify: `vnext-docs/docusaurus.config.ts` (rewrite)
- Create: `vnext-docs/sidebars-architecture.ts`, `vnext-docs/sidebars-business.ts`, `vnext-docs/sidebars-product.ts`
- Create: `vnext-docs/architecture/intro.md`, `vnext-docs/business/intro.md`, `vnext-docs/product/intro.md`

- [ ] **Step 1: Replace `docusaurus.config.ts`**

Overwrite with:
```typescript
import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'vNext Docs',
  tagline: 'vnext platform için teknik, mimari, business ve ürün dokümantasyonu',
  favicon: 'img/favicon.ico',

  url: 'https://burgan-tech.github.io',
  baseUrl: '/vnext-docs/',

  organizationName: 'burgan-tech',
  projectName: 'vnext-docs',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'tr',
    locales: ['tr', 'en'],
    localeConfigs: {
      tr: { label: 'Türkçe', htmlLang: 'tr-TR' },
      en: { label: 'English', htmlLang: 'en-US' },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          // Default instance = Technical
          path: 'docs',
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/burgan-tech/vnext-docs/tree/main/',
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/burgan-tech/vnext-docs/tree/main/',
          blogTitle: 'Release Notes & Updates',
          blogDescription: 'vnext platformu sürüm notları ve duyurular',
          postsPerPage: 10,
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'architecture',
        path: 'architecture',
        routeBasePath: 'architecture',
        sidebarPath: './sidebars-architecture.ts',
        editUrl: 'https://github.com/burgan-tech/vnext-docs/tree/main/',
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'business',
        path: 'business',
        routeBasePath: 'business',
        sidebarPath: './sidebars-business.ts',
        editUrl: 'https://github.com/burgan-tech/vnext-docs/tree/main/',
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'product',
        path: 'product',
        routeBasePath: 'product',
        sidebarPath: './sidebars-product.ts',
        editUrl: 'https://github.com/burgan-tech/vnext-docs/tree/main/',
      },
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    navbar: {
      title: 'vNext Docs',
      logo: {
        alt: 'vNext Logo',
        src: 'img/logo.svg',
        srcDark: 'img/logo-dark.svg',
      },
      items: [
        { to: '/docs/intro', label: 'Technical', position: 'left' },
        { to: '/architecture/intro', label: 'Architecture', position: 'left' },
        { to: '/business/intro', label: 'Business', position: 'left' },
        { to: '/product/intro', label: 'Product', position: 'left' },
        { to: '/blog', label: 'Release Notes', position: 'left' },
        { type: 'localeDropdown', position: 'right' },
        {
          href: 'https://github.com/burgan-tech/vnext-docs',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Technical', to: '/docs/intro' },
            { label: 'Architecture', to: '/architecture/intro' },
            { label: 'Business', to: '/business/intro' },
            { label: 'Product', to: '/product/intro' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'Release Notes', to: '/blog' },
            { label: 'GitHub', href: 'https://github.com/burgan-tech/vnext-docs' },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Burgan Bank. vNext Platform Documentation.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['csharp', 'bash', 'json', 'yaml'],
    },
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
```

- [ ] **Step 2: Create `sidebars-architecture.ts`**

```typescript
import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  architectureSidebar: [{ type: 'autogenerated', dirName: '.' }],
};

export default sidebars;
```

- [ ] **Step 3: Create `sidebars-business.ts`**

```typescript
import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  businessSidebar: [{ type: 'autogenerated', dirName: '.' }],
};

export default sidebars;
```

- [ ] **Step 4: Create `sidebars-product.ts`**

```typescript
import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  productSidebar: [{ type: 'autogenerated', dirName: '.' }],
};

export default sidebars;
```

- [ ] **Step 5: Create `architecture/intro.md`**

```markdown
---
slug: /intro
sidebar_position: 1
title: Architecture'a Hoş Geldin
---

# Architecture

Bu bölüm vnext platformunun mimarisini anlatır — domain modeli, runtime, veri katmanı, altyapı, mimari kararlar (ADR).

> **Phase 0 placeholder.** Bu sayfa Phase 2'de gerçek içerik ile değiştirilecek.
```

- [ ] **Step 6: Create `business/intro.md`**

```markdown
---
slug: /intro
sidebar_position: 1
title: Business'a Hoş Geldin
---

# Business

Bu bölüm vnext platformunun iş değerini anlatır — manifesto, capabilities, kullanım senaryoları, value proposition, glossary.

> **Phase 0 placeholder.** Bu sayfa Phase 4'te gerçek içerik ile değiştirilecek.
```

- [ ] **Step 7: Create `product/intro.md`**

```markdown
---
slug: /intro
sidebar_position: 1
title: Product'a Hoş Geldin
---

# Product

Bu bölüm vnext platformu için ürün dokümantasyonudur — vizyon, feature catalog, roadmap, personalar ve release stratejisi.

> **Phase 0 placeholder.** Bu sayfa Phase 5'te gerçek içerik ile değiştirilecek.
```

- [ ] **Step 8: Update `docs/intro.md` for Technical placeholder**

Overwrite:
```markdown
---
slug: /intro
sidebar_position: 1
title: Technical Docs'a Hoş Geldin
---

# Technical Documentation

Bu bölüm vnext platformu üzerinde geliştirme yapacak yazılım mühendisleri içindir — local dev kurulumu, çekirdek kavramlar, components, services, how-to rehberleri ve API referansı.

> **Phase 0 placeholder.** Bu sayfa Phase 1'de mevcut `vnext-runtime/doc/` içerikleri ile değiştirilecek.
```

- [ ] **Step 9: Build to verify config + 4 instance routes**

```bash
npm run build
```
Expected: `Compiled successfully.`. Hatasız.

- [ ] **Step 10: Run dev server and verify all routes**

```bash
npm run start
```
Tarayıcıda kontrol et:
- `http://localhost:3000/vnext-docs/docs/intro` → "Technical Docs'a Hoş Geldin"
- `http://localhost:3000/vnext-docs/architecture/intro` → "Architecture'a Hoş Geldin"
- `http://localhost:3000/vnext-docs/business/intro` → "Business'a Hoş Geldin"
- `http://localhost:3000/vnext-docs/product/intro` → "Product'a Hoş Geldin"
- Navbar'da 4 instance linki + locale dropdown var.

Ctrl+C ile durdur.

- [ ] **Step 11: Commit**

```bash
git add docusaurus.config.ts sidebars-architecture.ts sidebars-business.ts sidebars-product.ts \
  architecture/intro.md business/intro.md product/intro.md docs/intro.md
git commit -m "feat: configure 4 docs instances (technical/architecture/business/product) with i18n"
```

---

### Task 4: Generate i18n Skeleton and EN Placeholder Translations

**Files:**
- Create: `vnext-docs/i18n/en/...` (auto-generated + manual EN translations)

- [ ] **Step 1: Auto-generate i18n JSON skeletons for EN**

```bash
npm run write-translations -- --locale en
```
Expected output (örnek):
```
N translations written at i18n/en/code.json
N translations written at i18n/en/docusaurus-theme-classic/footer.json
N translations written at i18n/en/docusaurus-theme-classic/navbar.json
N translations written at i18n/en/docusaurus-plugin-content-docs/current.json
N translations written at i18n/en/docusaurus-plugin-content-docs-architecture/current.json
N translations written at i18n/en/docusaurus-plugin-content-docs-business/current.json
N translations written at i18n/en/docusaurus-plugin-content-docs-product/current.json
N translations written at i18n/en/docusaurus-plugin-content-blog/options.json
```

- [ ] **Step 2: Translate navbar items in `i18n/en/docusaurus-theme-classic/navbar.json`**

Auto-generated dosyada `"item.label.X": { "message": "Technical", ... }` gibi alanlar var. Bu Phase 0 için zaten İngilizce olduğundan dokunulmaz. **Sadece footer copyright gibi TR içerik varsa override edilir** — şimdilik default OK.

- [ ] **Step 3: Create EN translation for `docs/intro.md`**

Create `vnext-docs/i18n/en/docusaurus-plugin-content-docs/current/intro.md`:
```markdown
---
slug: /intro
sidebar_position: 1
title: Welcome to Technical Docs
---

# Technical Documentation

This section is for software engineers building on the vnext platform — local dev setup, core concepts, components, services, how-to guides, and API reference.

> **Phase 0 placeholder.** This page will be replaced in Phase 1 with content migrated from `vnext-runtime/doc/`.
```

- [ ] **Step 4: Create EN translations for the other 3 instances**

Create `vnext-docs/i18n/en/docusaurus-plugin-content-docs-architecture/current/intro.md`:
```markdown
---
slug: /intro
sidebar_position: 1
title: Welcome to Architecture
---

# Architecture

This section describes vnext platform architecture — domain model, runtime, data layer, infrastructure, ADRs.

> **Phase 0 placeholder.** This page will be replaced in Phase 2.
```

Create `vnext-docs/i18n/en/docusaurus-plugin-content-docs-business/current/intro.md`:
```markdown
---
slug: /intro
sidebar_position: 1
title: Welcome to Business
---

# Business

This section describes the business value of the vnext platform — manifesto, capabilities, use cases, value proposition, glossary.

> **Phase 0 placeholder.** This page will be replaced in Phase 4.
```

Create `vnext-docs/i18n/en/docusaurus-plugin-content-docs-product/current/intro.md`:
```markdown
---
slug: /intro
sidebar_position: 1
title: Welcome to Product
---

# Product

This section is for product documentation of the vnext platform — vision, feature catalog, roadmap, personas, and release strategy.

> **Phase 0 placeholder.** This page will be replaced in Phase 5.
```

- [ ] **Step 5: Verify EN locale builds**

```bash
npm run build -- --locale en
```
Expected: `Compiled successfully.`. Hata yok.

- [ ] **Step 6: Verify EN locale serves correctly**

```bash
npm run start -- --locale en
```
Tarayıcıda `http://localhost:3000/vnext-docs/en/docs/intro` → "Welcome to Technical Docs". Ctrl+C ile durdur.

- [ ] **Step 7: Verify TR fallback for missing EN translations**

Test edelim: Geçici olarak `i18n/en/docusaurus-plugin-content-docs-business/current/intro.md` dosyasını sil:
```bash
mv i18n/en/docusaurus-plugin-content-docs-business/current/intro.md /tmp/test-fallback.md
npm run build -- --locale en
```
Expected: Build başarılı (warning olabilir). `build/en/business/intro/` veya benzeri yolda TR source içerik servis edilir.

Geri yükle:
```bash
mv /tmp/test-fallback.md i18n/en/docusaurus-plugin-content-docs-business/current/intro.md
```

- [ ] **Step 8: Commit**

```bash
git add i18n/
git commit -m "feat: add english i18n skeleton and intro translations for all 4 instances"
```

---

### Task 5: Build Custom Landing Page (4 Persona Portals)

**Files:**
- Modify: `vnext-docs/src/pages/index.tsx` (rewrite)
- Delete: `vnext-docs/src/components/HomepageFeatures/` (Docusaurus default tutorial component, no longer needed)
- Modify: `vnext-docs/src/css/custom.css` (add persona card styles)

- [ ] **Step 1: Delete unused Docusaurus tutorial component**

```bash
rm -rf src/components/HomepageFeatures
```

- [ ] **Step 2: Replace `src/pages/index.tsx`**

Overwrite:
```tsx
import type { ReactNode } from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

type Persona = {
  title: string;
  description: string;
  to: string;
  emoji: string;
};

const PERSONAS: Persona[] = [
  {
    emoji: '⚙️',
    title: 'Technical',
    description: 'Local dev kurulumu, çekirdek kavramlar, components, services, API reference.',
    to: '/docs/intro',
  },
  {
    emoji: '🏛️',
    title: 'Architecture',
    description: 'Domain modeli, runtime, veri katmanı, altyapı, mimari kararlar (ADR).',
    to: '/architecture/intro',
  },
  {
    emoji: '💼',
    title: 'Business',
    description: 'Manifesto, capabilities, kullanım senaryoları, value proposition.',
    to: '/business/intro',
  },
  {
    emoji: '🎯',
    title: 'Product',
    description: 'Ürün vizyonu, feature catalog, roadmap, persona ve release stratejisi.',
    to: '/product/intro',
  },
];

function PersonaCard({ persona }: { persona: Persona }): ReactNode {
  return (
    <Link className={styles.personaCard} to={persona.to}>
      <div className={styles.personaEmoji}>{persona.emoji}</div>
      <Heading as="h3" className={styles.personaTitle}>
        {persona.title}
      </Heading>
      <p className={styles.personaDescription}>{persona.description}</p>
    </Link>
  );
}

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <header className={styles.hero}>
        <div className="container">
          <Heading as="h1" className={styles.heroTitle}>
            {siteConfig.title}
          </Heading>
          <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
        </div>
      </header>
      <main>
        <section className={styles.personasSection}>
          <div className="container">
            <div className={styles.personasGrid}>
              {PERSONAS.map((p) => (
                <PersonaCard key={p.title} persona={p} />
              ))}
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
```

- [ ] **Step 3: Create `src/pages/index.module.css`**

```css
.hero {
  padding: 4rem 0;
  text-align: center;
  background: linear-gradient(135deg, var(--ifm-color-primary-darker), var(--ifm-color-primary));
  color: #fff;
}

.heroTitle {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.heroSubtitle {
  font-size: 1.25rem;
  opacity: 0.9;
  max-width: 700px;
  margin: 0 auto;
}

.personasSection {
  padding: 4rem 0;
}

.personasGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1.5rem;
}

.personaCard {
  display: block;
  padding: 2rem;
  border: 1px solid var(--ifm-color-emphasis-300);
  border-radius: 12px;
  text-decoration: none;
  color: inherit;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.personaCard:hover {
  border-color: var(--ifm-color-primary);
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  text-decoration: none;
}

.personaEmoji {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.personaTitle {
  margin-bottom: 0.5rem;
  color: var(--ifm-color-primary);
}

.personaDescription {
  margin: 0;
  color: var(--ifm-color-emphasis-700);
  font-size: 0.95rem;
  line-height: 1.5;
}
```

- [ ] **Step 4: Update `src/css/custom.css` with brand colors**

Overwrite (Docusaurus default'u değişmez, sadece brand palette):
```css
/**
 * vNext Docs — brand customization
 * Default Docusaurus Infima variables overridden for brand palette.
 */

:root {
  --ifm-color-primary: #1f6feb;
  --ifm-color-primary-dark: #1862d4;
  --ifm-color-primary-darker: #175dc8;
  --ifm-color-primary-darkest: #134ca5;
  --ifm-color-primary-light: #3781ee;
  --ifm-color-primary-lighter: #4488ef;
  --ifm-color-primary-lightest: #6aa1f3;
  --ifm-code-font-size: 95%;
  --docusaurus-highlighted-code-line-bg: rgba(0, 0, 0, 0.1);
}

[data-theme='dark'] {
  --ifm-color-primary: #58a6ff;
  --ifm-color-primary-dark: #3a96ff;
  --ifm-color-primary-darker: #2a8eff;
  --ifm-color-primary-darkest: #0072e6;
  --ifm-color-primary-light: #76b6ff;
  --ifm-color-primary-lighter: #86beff;
  --ifm-color-primary-lightest: #b6d7ff;
  --docusaurus-highlighted-code-line-bg: rgba(0, 0, 0, 0.3);
}
```

- [ ] **Step 5: Build and serve**

```bash
npm run build
npm run start
```
Tarayıcıda `http://localhost:3000/vnext-docs/` → 4 persona kartı, hero başlık görünür. Her karta tıkla, doğru intro sayfasına gittiğini doğrula. Ctrl+C ile durdur.

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.tsx src/pages/index.module.css src/css/custom.css
git rm -r src/components/HomepageFeatures
git commit -m "feat: replace default landing page with 4-persona portal grid"
```

---

### Task 6: Replace Default Blog Posts with Welcome Placeholder

**Files:**
- Delete: Existing default blog posts in `vnext-docs/blog/` (2019/2021 Docusaurus templates)
- Create: `vnext-docs/blog/2026-04-24-welcome.md`
- Create: `vnext-docs/blog/authors.yml`

- [ ] **Step 1: Remove default Docusaurus blog content**

```bash
ls blog/
```
Expected: Birkaç default `.md` dosyası (örn. `2019-05-28-first-blog-post.md`, `2021-08-26-welcome/`).

```bash
rm -rf blog/*
```

- [ ] **Step 2: Create `blog/authors.yml`**

```yaml
vnext-team:
  name: vNext Team
  title: Burgan Bank Engineering
  url: https://github.com/burgan-tech
  image_url: https://github.com/burgan-tech.png
```

- [ ] **Step 3: Create `blog/2026-04-24-welcome.md`**

```markdown
---
slug: welcome
title: vNext Docs'a Hoş Geldiniz
authors: [vnext-team]
tags: [duyuru]
---

vNext Platform dokümantasyon sitesi yayında! Bu site 4 ana bölümden oluşuyor: **Technical**, **Architecture**, **Business** ve **Product**.

<!-- truncate -->

İlerleyen haftalarda mevcut `vnext-runtime/release/` altındaki release notes bu sayfaya migrate edilecek. Yeni özellikler ve sürüm notları burada paylaşılacak.

Şu anda Phase 0 (Foundation) tamamlandı. Sıradaki adım Phase 1: Technical Migration.
```

- [ ] **Step 4: Verify blog renders**

```bash
npm run build
npm run start
```
Tarayıcıda `http://localhost:3000/vnext-docs/blog` → Welcome post görünür. Ctrl+C ile durdur.

- [ ] **Step 5: Commit**

```bash
git add blog/
git commit -m "feat: replace default blog posts with vnext welcome placeholder"
```

---

### Task 7: Add Logo and Favicon Placeholders

**Files:**
- Replace: `vnext-docs/static/img/logo.svg`
- Create: `vnext-docs/static/img/logo-dark.svg`
- Keep: `vnext-docs/static/img/favicon.ico` (Docusaurus default — gerçek favicon ileride eklenir)

- [ ] **Step 1: Create `static/img/logo.svg` (light mode placeholder)**

Overwrite:
```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40" width="120" height="40">
  <text x="0" y="28" font-family="ui-sans-serif, system-ui" font-size="24" font-weight="700" fill="#1f6feb">vNext</text>
  <text x="78" y="28" font-family="ui-sans-serif, system-ui" font-size="24" font-weight="300" fill="#374151">Docs</text>
</svg>
```

- [ ] **Step 2: Create `static/img/logo-dark.svg` (dark mode placeholder)**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 40" width="120" height="40">
  <text x="0" y="28" font-family="ui-sans-serif, system-ui" font-size="24" font-weight="700" fill="#58a6ff">vNext</text>
  <text x="78" y="28" font-family="ui-sans-serif, system-ui" font-size="24" font-weight="300" fill="#e6edf3">Docs</text>
</svg>
```

- [ ] **Step 3: Verify logos render in light/dark mode**

```bash
npm run start
```
Tarayıcıda navbar'da logo gözüksün. Sağ üst köşeden tema toggle ile dark mode'a geç — logo değişsin. Ctrl+C ile durdur.

- [ ] **Step 4: Commit**

```bash
git add static/img/logo.svg static/img/logo-dark.svg
git commit -m "feat: add placeholder vnext docs logos for light and dark mode"
```

---

### Task 8: Add `.nojekyll` Static File

**Files:**
- Create: `vnext-docs/static/.nojekyll`

GitHub Pages default'ta Jekyll çalıştırır; underscore'la başlayan klasörleri (örn. `_next/`) atlar. Docusaurus'un build çıktısında bu tür klasörler olabilir, bu yüzden Jekyll'i devre dışı bırakırız.

- [ ] **Step 1: Create empty `.nojekyll`**

```bash
touch static/.nojekyll
```

- [ ] **Step 2: Verify build copies it**

```bash
npm run build
ls -la build/.nojekyll
```
Expected: `build/.nojekyll` mevcut (boş dosya).

- [ ] **Step 3: Commit**

```bash
git add static/.nojekyll
git commit -m "ci: add .nojekyll to disable github pages jekyll processing"
```

---

### Task 9: Add GitHub Actions Deploy Workflow

**Files:**
- Create: `vnext-docs/.github/workflows/deploy.yml`

- [ ] **Step 1: Create workflow file**

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    name: Build Docusaurus
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build website (all locales)
        run: npm run build

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: build

  deploy:
    name: Deploy to GitHub Pages
    needs: build
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
mkdir -p .github/workflows
# (the file is already created at .github/workflows/deploy.yml above)
git add .github/workflows/deploy.yml
git commit -m "ci: add github actions workflow for github pages deploy"
```

> **Note**: Bu workflow ilk kez başarıyla çalışsın diye GitHub repo settings'te **Pages → Source: GitHub Actions** seçilmeli. Bu manuel adım Task 12'de listelenir.

---

### Task 10: Add PR Preview / Build Verification Workflow

**Files:**
- Create: `vnext-docs/.github/workflows/pr-preview.yml`

PR'larda deploy yapılmaz; sadece build ve broken-link check yapılır. Böylece bozuk PR'lar production'a çıkmaz.

- [ ] **Step 1: Create workflow file**

```yaml
name: PR Build Check

on:
  pull_request:
    branches: [main]

jobs:
  build:
    name: Verify Docusaurus build
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Build website (TR + EN, fail on broken links)
        run: npm run build
        env:
          # docusaurus.config.ts has onBrokenLinks: 'throw' — build will fail on broken internal links
          CI: true
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/pr-preview.yml
git commit -m "ci: add pr build verification workflow"
```

---

### Task 11: Add CONTRIBUTING.md and PR Template

**Files:**
- Create: `vnext-docs/CONTRIBUTING.md`
- Create: `vnext-docs/.github/PULL_REQUEST_TEMPLATE.md`
- Replace: `vnext-docs/README.md`

- [ ] **Step 1: Create `CONTRIBUTING.md`**

```markdown
# Contributing to vNext Docs

vNext Platform dokümantasyonuna katkıda bulunduğun için teşekkürler! Bu rehber dokümanları nasıl yazacağını ve PR sürecini açıklar.

## Local Development

```bash
npm install
npm run start                  # Dev server (TR, default locale)
npm run start -- --locale en   # Dev server (EN)
npm run build                  # Production build (catches broken links)
npm run serve                  # Serve production build locally
```

## Klasör Yapısı (özet)

| Klasör | İçerik |
|---|---|
| `docs/` | Technical instance — developer docs |
| `architecture/` | Architecture instance — architect/CTO docs |
| `business/` | Business instance — business stakeholder docs |
| `product/` | Product instance — PM docs |
| `blog/` | Release notes ve duyurular |
| `i18n/en/` | EN çeviriler — eksikse TR fallback |

## Yeni Sayfa Ekleme

1. İlgili instance klasörüne TR markdown dosyası ekle. Örnek: `docs/getting-started/my-page.md`
2. Frontmatter ekle:
   ```yaml
   ---
   sidebar_position: 1
   title: Sayfa Başlığı
   ---
   ```
3. EN çevirisi gerekiyorsa: `i18n/en/docusaurus-plugin-content-docs/current/getting-started/my-page.md`
4. Local'de test et: `npm run start`
5. Build'i doğrula: `npm run build` (broken link kontrolü için)

## Dil Stratejisi

- **TR primary, EN secondary.** Yeni içerik önce TR yazılır.
- EN çevirisi eksikse Docusaurus otomatik olarak TR source'u servis eder.
- Priority pages (getting-started, concepts) için EN zorunludur; geri kalanı kademeli.

## PR Süreci

1. Feature branch oluştur: `git checkout -b feat/my-change`
2. Commit'lerini conventional commits formatında yaz: `feat:`, `fix:`, `docs:`, `chore:`, `ci:`
3. PR aç. CI build'i otomatik çalışır.
4. CI yeşil olduktan sonra review iste.
5. Merge sonrası `main` → GitHub Pages otomatik deploy olur.
```

- [ ] **Step 2: Create `.github/PULL_REQUEST_TEMPLATE.md`**

```markdown
## Özet

<!-- 1-2 cümlede ne yaptığını özetle. -->

## Etkilenen Bölüm

- [ ] Technical (`docs/`)
- [ ] Architecture (`architecture/`)
- [ ] Business (`business/`)
- [ ] Product (`product/`)
- [ ] Blog (`blog/`)
- [ ] Tooling / CI / Config

## Dil

- [ ] TR yazıldı
- [ ] EN çevirisi eklendi
- [ ] EN sonradan eklenecek (priority değil)

## Local Doğrulama

- [ ] `npm run build` başarılı
- [ ] `npm run start` ile gözle kontrol edildi
- [ ] Internal linkler kırık değil

## İlgili Phase / Issue

<!-- Örnek: Phase 1 — Technical Migration; closes #N -->
```

- [ ] **Step 3: Replace `README.md`**

Overwrite:
```markdown
# vnext-docs

[vNext Platform](https://github.com/burgan-tech) için dokümantasyon sitesi.

🌐 **Live**: https://burgan-tech.github.io/vnext-docs/

Bu site 4 bölümden oluşur:

- **Technical** — Developer dokümantasyonu (local dev, kavramlar, components, API)
- **Architecture** — Mimari dokümantasyon (domain, runtime, veri, altyapı, ADR)
- **Business** — İş değeri dokümantasyonu (manifesto, capabilities, value)
- **Product** — Ürün dokümantasyonu (vizyon, features, roadmap, personas)

## Local Development

```bash
npm install
npm run start
```

`http://localhost:3000/vnext-docs/` adresinde açılır.

## Daha Fazla Bilgi

- [CONTRIBUTING.md](CONTRIBUTING.md) — katkı rehberi
- [docs/superpowers/specs/](docs/superpowers/specs/) — design spec'leri
- [docs/superpowers/plans/](docs/superpowers/plans/) — phase implementation plan'ları

## Tech Stack

- [Docusaurus 3.x](https://docusaurus.io/) — static site generator
- TypeScript
- GitHub Pages — hosting
- GitHub Actions — CI/CD
```

- [ ] **Step 4: Commit**

```bash
git add CONTRIBUTING.md .github/PULL_REQUEST_TEMPLATE.md README.md
git commit -m "docs: add contributing guide, pr template, and project readme"
```

---

### Task 12: Final Verification + GitHub Pages Setup Checklist

Bu task **manuel adımlar** içerir; GitHub repo'su henüz yoksa burada oluşturulur.

- [ ] **Step 1: Local clean build verification (production simülasyonu)**

```bash
rm -rf build node_modules .docusaurus
npm install
npm run build
npm run serve
```
Tarayıcıda `http://localhost:3000/vnext-docs/` → site tam olarak yüklenir, navbar çalışır, 4 instance erişilebilir, locale dropdown'dan EN'e geçince EN içerik gelir.

Beklenen: Hata yok, tüm 4 instance + blog + landing page çalışıyor.

- [ ] **Step 2: GitHub'da repo oluştur (manuel — kullanıcı onayı gerekir)**

`burgan-tech` org altında `vnext-docs` adıyla **public** repo oluştur. README/gitignore/license eklemeden boş kalsın.

- [ ] **Step 3: Remote ekle ve push et**

```bash
git remote add origin git@github.com:burgan-tech/vnext-docs.git
git push -u origin main
```

- [ ] **Step 4: GitHub Pages source'u "GitHub Actions" olarak ayarla**

GitHub repo → Settings → Pages → **Source: GitHub Actions** seç. (Branch tabanlı değil, Actions tabanlı deploy.)

- [ ] **Step 5: Deploy workflow'u tetikle**

Push sonrası `Deploy to GitHub Pages` workflow'u otomatik çalışır. Actions tab'ından izle. Yaklaşık 2-3 dakika sürer.

- [ ] **Step 6: Canlı URL'i doğrula**

`https://burgan-tech.github.io/vnext-docs/` adresine git. Local'deki ile aynı içerik görünmeli:
- 4 persona kartı landing page'de
- Her persona'nın intro sayfası erişilebilir
- Locale dropdown'dan EN'e geçilebilir
- Blog'da welcome post

Bu noktada **Phase 0 tamamlanmış sayılır**.

- [ ] **Step 7: Phase 1 hazırlığı**

`docs/superpowers/plans/` altına Phase 1 (Technical Migration) için yeni plan yazılması gerekir. Bu, ayrı bir `writing-plans` çağrısıyla yapılacak.

---

## Verification Summary (Phase 0 Exit Criteria)

Tüm task'lar tamamlandığında şunlar sağlanmış olur:

- ✅ Yerel `npm run build` hatasız geçer
- ✅ Yerel `npm run start` ile site açılabilir
- ✅ 4 instance (Technical/Architecture/Business/Product) navigable
- ✅ Locale dropdown TR/EN arası geçiş yapar
- ✅ Eksik EN dosyaları için TR fallback çalışır
- ✅ Blog welcome post yayında
- ✅ Landing page'de 4 persona kartı tıklanabilir
- ✅ GitHub Actions workflow başarıyla tamamlanır
- ✅ `https://burgan-tech.github.io/vnext-docs/` canlı

## Out of Scope for Phase 0 (Phase 1+'a bırakılan)

- Gerçek içerik (placeholder'lar bırakılır)
- Algolia DocSearch (Phase 6)
- Analytics (Phase 6)
- Custom domain (Phase 6)
- Custom Mermaid/D2 components (Phase 6)
- API reference auto-generation (Phase 1'de manuel)
- Release notes migrasyonu (Phase 3)
