# Phase 2 — Architecture Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** vnext-runtime'daki mimari kapsamlı içeriği (`fundamentals/`, `principles/`, README'nin "Servisler ve Portlar" + "Management Tools" bölümleri) **architecture instance**'ına yeniden yapılandırılmış kategoriler altında taşı; eksik high-level content'i (overview, principles, ADR template) yeni yazımla tamamla.

**Architecture:** Source-of-truth vnext-runtime read-only. Mevcut 6 markdown (3 fundamentals + 3 principles) yedi alt kategoriye dağıtılır: `overview`, `domain-model`, `data`, `runtime`, `infrastructure`, `patterns`, `decisions`. Her kategoride en az bir TR + EN page olur. Phase 1'in dersi: **internal linkler absolute path** (`/architecture/...`) olarak yazılır → relative-depth çakışmaları yaşanmaz.

**Tech Stack:** Docusaurus 3.x (Phase 0'da konfigüre edildi), bash (bulk copy), perl (text rewrite), npm run build (verification).

---

## Scope

**Phase 2 dahil olan kaynaklar** (`vnext-runtime/`):
- `doc/tr/fundamentals/{readme,domain-topology,database-architecture}.md` (3 TR)
- `doc/en/fundamentals/...` (3 EN paralel)
- `doc/tr/principles/{persistance,reference,versioning}.md` (3 TR)
- `doc/en/principles/...` (3 EN paralel)
- `README.tr.md` lines 718-754 ("Servisler ve Portlar" + "Management Tools") + EN paraleli
- `README.tr.md` opening (lines 1-10) — platform tanımı; high-level overview için tohum

**Phase 2 DIŞI**:
- `doc/tr|en/flow/*` → Phase 1'de migrate edildi
- `doc/tr|en/how-to/*`, `doc/tr|en/services/*` → Phase 1'de migrate edildi
- `doc/src/*.cs` → Phase 1'de api-reference olarak migrate edildi
- `release/*.md` → Phase 3 (Blog)
- `ai-docs/` → kapsam dışı

---

## Target File Structure (Phase 2 sonunda)

```
vnext-docs/architecture/                    (TR primary)
├── intro.md                                 (rewrite — Architecture landing)
├── overview/
│   ├── index.md                             (NEW — Platform overview, distilled from fundamentals/readme + README intro)
│   └── principles.md                        (NEW — Dual-Write, Event Sourcing, ETag, Semantic Versioning, Domain-Driven)
├── domain-model/
│   ├── index.md                             (NEW — short intro)
│   └── topology.md                          (from doc/tr/fundamentals/domain-topology.md)
├── data/
│   ├── index.md                             (NEW — short intro)
│   ├── database.md                          (from doc/tr/fundamentals/database-architecture.md)
│   └── persistence.md                       (from doc/tr/principles/persistance.md)
├── runtime/
│   └── index.md                             (NEW — placeholder noting future deep-dive)
├── infrastructure/
│   ├── index.md                             (NEW — short intro)
│   ├── services-and-ports.md                (from README.tr.md "Servisler ve Portlar")
│   └── management-tools.md                  (from README.tr.md "Management Tools")
├── patterns/
│   ├── index.md                             (NEW — short intro)
│   ├── references.md                        (from doc/tr/principles/reference.md)
│   └── versioning.md                        (from doc/tr/principles/versioning.md)
└── decisions/
    ├── index.md                             (NEW — ADR practice intro)
    └── _template.md                         (NEW — ADR template)

vnext-docs/i18n/en/docusaurus-plugin-content-docs-architecture/current/   (EN translations)
└── ... (yukarıdaki yapının EN mirror'ı)
```

**Phase 2 sonunda toplam:** ~16 TR + ~16 EN page = ~32 markdown dosyası.

---

## Constants — Migration Tools

### Frontmatter Templates

**TR:**
```yaml
---
sidebar_position: {N}
title: {Türkçe Başlık}
description: {Kısa özet}
---
```

**EN:**
```yaml
---
sidebar_position: {N}
title: {English Title}
description: {Short summary}
---
```

### Admonition Normalization (Phase 1'deki gibi)

```bash
sed -i '' -E \
  -e 's/^:::highlight green.*$/:::tip/' \
  -e 's/^:::highlight red.*$/:::danger/' \
  -e 's/^:::highlight yellow.*$/:::warning/' \
  -e 's/^:::highlight blue.*$/:::info/' \
  -e 's/^:::highlight [a-z]+.*$/:::note/' \
  "$file"
```

### Link Strategy

**Tüm cross-references absolute path** olarak yazılır:
- Architecture içinde: `/architecture/data/database`, `/architecture/patterns/versioning`, vb.
- Technical'a cross-link: `/docs/concepts/workflow`, `/docs/api-reference/i-mapping`, vb.

Bu yaklaşım Phase 1'deki rewrite döngülerini önler.

### Source Path Variables

```bash
cd /Users/U0B006/Documents/repos/burgan-tech/vnext-docs
SOURCE_TR=/Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr
SOURCE_EN=/Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en
ARCH_EN=i18n/en/docusaurus-plugin-content-docs-architecture/current
```

---

## Tasks

### Task 1: Replace Architecture Intro + Category Skeleton

**Files:**
- Modify: `architecture/intro.md` (Phase 0 placeholder → real Architecture landing)
- Modify: `i18n/en/docusaurus-plugin-content-docs-architecture/current/intro.md`
- Create: 7 directories under `architecture/` and EN mirror
- Create: `index.md` placeholders for `overview`, `domain-model`, `data`, `runtime`, `infrastructure`, `patterns`, `decisions` (TR + EN)

- [ ] **Step 1: Create directory skeleton (TR + EN)**

```bash
cd /Users/U0B006/Documents/repos/burgan-tech/vnext-docs
mkdir -p architecture/{overview,domain-model,data,runtime,infrastructure,patterns,decisions}
mkdir -p i18n/en/docusaurus-plugin-content-docs-architecture/current/{overview,domain-model,data,runtime,infrastructure,patterns,decisions}
```

- [ ] **Step 2: Replace `architecture/intro.md` (TR)**

Overwrite:
```markdown
---
slug: /intro
sidebar_position: 1
title: Architecture
description: vnext platformunun mimari dokümantasyonu — domain modeli, runtime, veri katmanı, altyapı, mimari kararlar
---

# Architecture

Bu bölüm vnext platformunun **mimari yönlerini** anlatır — domain modeli, runtime, veri katmanı, altyapı ve geçmiş mimari kararlar (ADR'ler). Hedef kitle: **architect, CTO, senior engineer**.

## Bölümler

1. **[Overview](./overview/)** — yüksek seviyeli platform mimarisi ve çekirdek prensipler
2. **[Domain Model](./domain-model/)** — multi-domain yapısı, bounded context
3. **[Runtime](./runtime/)** — orchestration ↔ execution ↔ worker akışı
4. **[Data](./data/)** — DB topolojisi, persistence pattern'ları
5. **[Infrastructure](./infrastructure/)** — Docker, Dapr, Vault, Redis, PostgreSQL
6. **[Patterns](./patterns/)** — dual-write, semantic versioning, reference resolution
7. **[Decisions](./decisions/)** — Architecture Decision Records (ADR)
```

- [ ] **Step 3: Replace EN mirror**

Overwrite `i18n/en/docusaurus-plugin-content-docs-architecture/current/intro.md`:
```markdown
---
slug: /intro
sidebar_position: 1
title: Architecture
description: vnext platform architecture — domain model, runtime, data, infrastructure, decisions
---

# Architecture

This section covers the **architectural aspects** of the vnext platform — domain model, runtime, data layer, infrastructure, and past architecture decisions (ADRs). Target audience: **architects, CTOs, senior engineers**.

## Sections

1. **[Overview](./overview/)** — high-level platform architecture and core principles
2. **[Domain Model](./domain-model/)** — multi-domain structure, bounded contexts
3. **[Runtime](./runtime/)** — orchestration ↔ execution ↔ worker flow
4. **[Data](./data/)** — DB topology, persistence patterns
5. **[Infrastructure](./infrastructure/)** — Docker, Dapr, Vault, Redis, PostgreSQL
6. **[Patterns](./patterns/)** — dual-write, semantic versioning, reference resolution
7. **[Decisions](./decisions/)** — Architecture Decision Records (ADRs)
```

- [ ] **Step 4: Create category index placeholders (TR)**

For each of `domain-model`, `data`, `runtime`, `infrastructure`, `patterns`, `decisions` create `index.md` with category intro. Overview gets its own index in Task 5.

`architecture/domain-model/index.md`:
```markdown
---
sidebar_position: 1
title: Domain Model
description: vnext'in multi-domain yapısı, bounded context'ler ve domain izolasyonu
---

# Domain Model

vnext platformu **domain-driven** mimaridedir: her domain kendi runtime, kendi veritabanı ve kendi konfigürasyon ile çalışır.

- **[Topology](./topology)** — domain konsepti, izolasyon, çoklu-domain mimarisi
```

`architecture/data/index.md`:
```markdown
---
sidebar_position: 1
title: Data
description: vnext'in veri katmanı — multi-schema DB, persistence pattern'ları, izolasyon
---

# Data

vnext platformunun veri katmanı **domain başına izole veritabanı** üzerine kurulu. Bu bölüm DB topolojisi, persistence stratejisi ve replikasyon konularını kapsar.

- **[Database Architecture](./database)** — multi-schema yapısı, migration sistemi
- **[Persistence Strategy](./persistence)** — Entity Framework, Master Data, CDC
```

`architecture/runtime/index.md`:
```markdown
---
sidebar_position: 1
title: Runtime
description: vnext runtime servisleri — orchestration, execution, worker'lar
---

# Runtime

vnext runtime üç ana servis tipinden oluşur: **Orchestration** (workflow durumu), **Execution** (task yürütme), **Workers** (inbox/outbox event processing).

:::note[Coming Soon]
Bu bölümün detaylı içeriği (her servisin sorumlulukları, mesajlaşma akışı, scaling karakteristikleri) sonraki phase'lerde yazılacak. Şimdilik [getting-started/local-dev](/docs/getting-started/local-dev) sayfasına bakabilirsin.
:::
```

`architecture/infrastructure/index.md`:
```markdown
---
sidebar_position: 1
title: Infrastructure
description: vnext'in altyapı bileşenleri — Docker, Dapr, Vault, Redis, PostgreSQL
---

# Infrastructure

vnext platformunun altyapı katmanı **Docker Compose** ile orchestrate edilir. Paylaşılan altyapı servisleri (PostgreSQL, Redis, Vault, Dapr placement/scheduler) tüm domain'ler tarafından paylaşılır.

- **[Services and Ports](./services-and-ports)** — altyapı + domain servis listesi
- **[Management Tools](./management-tools)** — OpenObserve, Vault UI erişim
```

`architecture/patterns/index.md`:
```markdown
---
sidebar_position: 1
title: Patterns
description: vnext platformunda kullanılan mimari pattern'lar
---

# Patterns

Bu bölüm vnext platformunda kullanılan mimari pattern'ları açıklar.

- **[References](./references)** — Foreign Key konsepti, version resolution, reference linking
- **[Versioning](./versioning)** — Semantic Versioning stratejisi, deployment, rollback
```

`architecture/decisions/index.md`:
```markdown
---
sidebar_position: 1
title: Architecture Decision Records
description: vnext'in mimari kararları — ADR pratiği ve kayıtları
---

# Architecture Decision Records (ADR)

Mimari kararlar **ADR** formatında kayıt altına alınır. Her ADR bir karar noktasını, alternatifleri, tradeoff'ları ve sonucu belgeler.

## Yeni ADR Oluşturma

[Template](./_template) dosyasını kopyala, yeni dosya adını `NNNN-kebab-case-title.md` formatında ver (örn. `0001-multi-domain-isolation.md`).

## Mevcut ADR'lar

> Henüz publish edilmiş ADR yok. İlk ADR yazıldığında buraya listelenecek.
```

- [ ] **Step 5: Create EN mirrors of category index pages**

For each of the above, create the EN equivalent in `i18n/en/docusaurus-plugin-content-docs-architecture/current/{category}/index.md` with English content. Same `sidebar_position`. Translate title and content faithfully.

Example for `domain-model/index.md` EN:
```markdown
---
sidebar_position: 1
title: Domain Model
description: vnext multi-domain structure, bounded contexts, and domain isolation
---

# Domain Model

The vnext platform is **domain-driven**: each domain runs with its own runtime, database, and configuration.

- **[Topology](./topology)** — domain concept, isolation, multi-domain architecture
```

(Repeat the pattern for `data`, `runtime`, `infrastructure`, `patterns`, `decisions` — translating each TR version.)

- [ ] **Step 6: Build verification**

```bash
npm run build 2>&1 | tail -10
```
Expected: `[SUCCESS] Generated static files in "build"` + `"build/en"`. Forward link warnings beklenir (henüz oluşturulmamış sayfalara işaret ediyor) — kritik değil.

---

### Task 2: Migrate Fundamentals (3 files → architecture/{overview,domain-model,data})

**Files:**
- Create: `architecture/overview/index.md` (from `doc/tr/fundamentals/readme.md`)
- Create: `architecture/domain-model/topology.md` (from `doc/tr/fundamentals/domain-topology.md`)
- Create: `architecture/data/database.md` (from `doc/tr/fundamentals/database-architecture.md`)
- Create: EN mirrors

- [ ] **Step 1: Bulk copy (TR + EN)**

```bash
SOURCE_TR=/Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr
SOURCE_EN=/Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en
ARCH_EN=i18n/en/docusaurus-plugin-content-docs-architecture/current

cp $SOURCE_TR/fundamentals/readme.md               architecture/overview/index.md
cp $SOURCE_TR/fundamentals/domain-topology.md      architecture/domain-model/topology.md
cp $SOURCE_TR/fundamentals/database-architecture.md architecture/data/database.md

cp $SOURCE_EN/fundamentals/readme.md               $ARCH_EN/overview/index.md
cp $SOURCE_EN/fundamentals/domain-topology.md      $ARCH_EN/domain-model/topology.md
cp $SOURCE_EN/fundamentals/database-architecture.md $ARCH_EN/data/database.md
```

- [ ] **Step 2: Add frontmatter (TR)**

Use the same `prepend()` helper from Phase 1.

```bash
prepend() {
  local file="$1"; local fm="$2"
  printf '%s\n%s' "$fm" "$(cat "$file")" > "$file"
}

prepend architecture/overview/index.md '---
sidebar_position: 1
title: Platform Overview
description: vnext platformunun yüksek seviyeli mimari ve temel kavramları
---
'

prepend architecture/domain-model/topology.md '---
sidebar_position: 2
title: Domain Topology
description: Domain konsepti, runtime izolasyonu, multi-domain örneği
---
'

prepend architecture/data/database.md '---
sidebar_position: 2
title: Database Architecture
description: Multi-schema DB yapısı, migration sistemi, izolasyon
---
'
```

- [ ] **Step 3: Add frontmatter (EN)**

```bash
prepend $ARCH_EN/overview/index.md '---
sidebar_position: 1
title: Platform Overview
description: High-level vnext platform architecture and core concepts
---
'

prepend $ARCH_EN/domain-model/topology.md '---
sidebar_position: 2
title: Domain Topology
description: Domain concept, runtime isolation, multi-domain example
---
'

prepend $ARCH_EN/data/database.md '---
sidebar_position: 2
title: Database Architecture
description: Multi-schema DB structure, migration system, isolation
---
'
```

- [ ] **Step 4: Normalize admonitions**

```bash
for f in architecture/overview/index.md \
         architecture/domain-model/topology.md \
         architecture/data/database.md \
         $ARCH_EN/overview/index.md \
         $ARCH_EN/domain-model/topology.md \
         $ARCH_EN/data/database.md; do
  sed -i '' -E \
    -e 's/^:::highlight green.*$/:::tip/' \
    -e 's/^:::highlight red.*$/:::danger/' \
    -e 's/^:::highlight yellow.*$/:::warning/' \
    -e 's/^:::highlight blue.*$/:::info/' \
    -e 's/^:::highlight [a-z]+.*$/:::note/' \
    "$f"
done
```

- [ ] **Step 5: Build verification**

```bash
npm run build 2>&1 | grep -E "(SUCCESS|FAIL|ERROR|Cause:|MDX compilation)" | head -10
```
Expected: `[SUCCESS]`.

---

### Task 3: Migrate Principles (3 files → architecture/{data,patterns})

**Files:**
- Create: `architecture/data/persistence.md` (from `doc/tr/principles/persistance.md`)
- Create: `architecture/patterns/references.md` (from `doc/tr/principles/reference.md`)
- Create: `architecture/patterns/versioning.md` (from `doc/tr/principles/versioning.md`)
- Create: EN mirrors

- [ ] **Step 1: Bulk copy**

```bash
SOURCE_TR=/Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr
SOURCE_EN=/Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en
ARCH_EN=i18n/en/docusaurus-plugin-content-docs-architecture/current

cp $SOURCE_TR/principles/persistance.md  architecture/data/persistence.md
cp $SOURCE_TR/principles/reference.md    architecture/patterns/references.md
cp $SOURCE_TR/principles/versioning.md   architecture/patterns/versioning.md

cp $SOURCE_EN/principles/persistance.md  $ARCH_EN/data/persistence.md
cp $SOURCE_EN/principles/reference.md    $ARCH_EN/patterns/references.md
cp $SOURCE_EN/principles/versioning.md   $ARCH_EN/patterns/versioning.md
```

- [ ] **Step 2: Add frontmatter (TR)**

```bash
prepend architecture/data/persistence.md '---
sidebar_position: 3
title: Persistence Strategy
description: Entity Framework, Master Data tabloları, CDC, replikasyon
---
'

prepend architecture/patterns/references.md '---
sidebar_position: 2
title: References
description: Foreign Key konsepti, version resolution, reference linking
---
'

prepend architecture/patterns/versioning.md '---
sidebar_position: 3
title: Semantic Versioning
description: SemVer stratejisi, deployment, test, rollback yaklaşımı
---
'
```

- [ ] **Step 3: Add frontmatter (EN)**

```bash
prepend $ARCH_EN/data/persistence.md '---
sidebar_position: 3
title: Persistence Strategy
description: Entity Framework, Master Data tables, CDC, replication
---
'

prepend $ARCH_EN/patterns/references.md '---
sidebar_position: 2
title: References
description: Foreign Key concept, version resolution, reference linking
---
'

prepend $ARCH_EN/patterns/versioning.md '---
sidebar_position: 3
title: Semantic Versioning
description: SemVer strategy, deployment, testing, rollback approach
---
'
```

- [ ] **Step 4: Normalize admonitions**

```bash
for f in architecture/data/persistence.md \
         architecture/patterns/references.md \
         architecture/patterns/versioning.md \
         $ARCH_EN/data/persistence.md \
         $ARCH_EN/patterns/references.md \
         $ARCH_EN/patterns/versioning.md; do
  sed -i '' -E \
    -e 's/^:::highlight green.*$/:::tip/' \
    -e 's/^:::highlight red.*$/:::danger/' \
    -e 's/^:::highlight yellow.*$/:::warning/' \
    -e 's/^:::highlight blue.*$/:::info/' \
    -e 's/^:::highlight [a-z]+.*$/:::note/' \
    "$f"
done
```

- [ ] **Step 5: Build verification**

```bash
npm run build 2>&1 | grep -E "(SUCCESS|FAIL|ERROR|Cause:|MDX compilation)" | head -10
```
Expected: `[SUCCESS]`.

---

### Task 4: Infrastructure Pages from README

**Files:**
- Create: `architecture/infrastructure/services-and-ports.md` (from README.tr.md lines 718-747)
- Create: `architecture/infrastructure/management-tools.md` (from README.tr.md lines 749-754)
- Create: EN mirrors (from README.md)

- [ ] **Step 1: Write `architecture/infrastructure/services-and-ports.md` (TR)**

Create file with this content:
```markdown
---
sidebar_position: 2
title: Servisler ve Portlar
description: vnext altyapı servisleri ve domain başına çalışan vnext servisleri
---

# Servisler ve Portlar

Bu sayfa vnext platformunda çalışan tüm servisleri ve port atamalarını listeler.

## Altyapı Servisleri (Paylaşılan)

Bu servisler tüm domain'ler tarafından paylaşılır ve **yalnızca bir kez** çalışır.

| Servis | Açıklama | Port | Erişim URL |
|---|---|---|---|
| **dapr-placement** | Dapr placement servisi | 50005 | - |
| **dapr-scheduler** | Dapr scheduler servisi | 50007 | - |
| **vnext-redis** | Redis cache | 6379 | - |
| **vnext-postgres** | PostgreSQL veritabanı | 5432 | - |
| **vnext-vault** | HashiCorp Vault | 8200 | http://localhost:8200 |
| **openobserve** | Observability dashboard | 5080 | http://localhost:5080 |
| **otel-collector** | OpenTelemetry Collector | 4317, 4318, 8888 | - |
| **mockoon** | API Mock Server | 3001 | http://localhost:3001 |

## VNext Domain Servisleri (Her Domain İçin)

Her domain bu servislerden **kendi instance'ına** sahiptir. Portlar `PORT_OFFSET` değerine göre değişir. Aşağıda varsayılan (offset 0) gösterilmiştir.

| Servis | Açıklama | Port | Container Adı |
|---|---|---|---|
| **vnext-app** | Orchestration uygulaması | 4201 | vnext-app-{domain} |
| **vnext-execution-app** | Execution servisi | 4202 | vnext-execution-app-{domain} |
| **vnext-worker-inbox** | Worker inbox servisi | 4203 | vnext-worker-inbox-{domain} |
| **vnext-worker-outbox** | Worker outbox servisi | 4204 | vnext-worker-outbox-{domain} |
| **vnext-init** | Init container | 3005 | vnext-init-{domain} |
| **vnext-orchestration-dapr** | Orchestration için Dapr sidecar | 42110/42111 | vnext-orchestration-dapr-{domain} |
| **vnext-execution-dapr** | Execution için Dapr sidecar | 43110/43111 | vnext-execution-dapr-{domain} |

`PORT_OFFSET=10` olan domain'ler için portlar 4211, 4212, 4213, 4214, 3015 vb. olur.

## İlgili

- [Multi-Domain Setup](/docs/getting-started/multi-domain) — domain oluşturma + port allocation tablosu
- [Local Development](/docs/getting-started/local-dev) — `make` komutları ile altyapı yönetimi

---

*Kaynak: [`vnext-runtime/README.tr.md`](https://github.com/burgan-tech/vnext-runtime/blob/main/README.tr.md#servisler-ve-portlar).*
```

- [ ] **Step 2: Write `architecture/infrastructure/services-and-ports.md` EN mirror**

Create `i18n/en/docusaurus-plugin-content-docs-architecture/current/infrastructure/services-and-ports.md`:
```markdown
---
sidebar_position: 2
title: Services and Ports
description: vnext infrastructure services and per-domain vnext services
---

# Services and Ports

This page lists all services running on the vnext platform and their port assignments.

## Infrastructure Services (Shared)

These services are shared across all domains and run **only once**.

| Service | Description | Port | Access URL |
|---|---|---|---|
| **dapr-placement** | Dapr placement service | 50005 | - |
| **dapr-scheduler** | Dapr scheduler service | 50007 | - |
| **vnext-redis** | Redis cache | 6379 | - |
| **vnext-postgres** | PostgreSQL database | 5432 | - |
| **vnext-vault** | HashiCorp Vault | 8200 | http://localhost:8200 |
| **openobserve** | Observability dashboard | 5080 | http://localhost:5080 |
| **otel-collector** | OpenTelemetry Collector | 4317, 4318, 8888 | - |
| **mockoon** | API Mock Server | 3001 | http://localhost:3001 |

## VNext Domain Services (Per Domain)

Each domain has its **own instance** of these services. Ports vary by `PORT_OFFSET`. Default (offset 0) shown below.

| Service | Description | Port | Container Name |
|---|---|---|---|
| **vnext-app** | Orchestration application | 4201 | vnext-app-{domain} |
| **vnext-execution-app** | Execution service | 4202 | vnext-execution-app-{domain} |
| **vnext-worker-inbox** | Worker inbox service | 4203 | vnext-worker-inbox-{domain} |
| **vnext-worker-outbox** | Worker outbox service | 4204 | vnext-worker-outbox-{domain} |
| **vnext-init** | Init container | 3005 | vnext-init-{domain} |
| **vnext-orchestration-dapr** | Dapr sidecar for orchestration | 42110/42111 | vnext-orchestration-dapr-{domain} |
| **vnext-execution-dapr** | Dapr sidecar for execution | 43110/43111 | vnext-execution-dapr-{domain} |

For domains with `PORT_OFFSET=10`, ports become 4211, 4212, 4213, 4214, 3015, etc.

## Related

- [Multi-Domain Setup](/docs/getting-started/multi-domain) — creating domains + port allocation table
- [Local Development](/docs/getting-started/local-dev) — `make` commands for infra management

---

*Source: [`vnext-runtime/README.md`](https://github.com/burgan-tech/vnext-runtime/blob/main/README.md#services-and-ports).*
```

- [ ] **Step 3: Write `architecture/infrastructure/management-tools.md` (TR)**

```markdown
---
sidebar_position: 3
title: Management Tools
description: OpenObserve dashboard ve Vault UI erişim bilgileri
---

# Management Tools

Local geliştirme ortamında platform işletimi için kullanılan **management UI'ları**.

| Tool | URL | Kullanıcı Adı | Şifre |
|---|---|---|---|
| **OpenObserve** | http://localhost:5080 | root@example.com | Complexpass#@123 |
| **Vault UI** | http://localhost:8200 | - | admin (token) |

:::warning[Güvenlik]
Yukarıdaki credential'lar **sadece local development** içindir. Production veya shared ortamlarda **değiştirilmelidir**.
:::

## OpenObserve

OpenObserve, vnext platformunun observability dashboard'ıdır. Loglar, metrikler ve trace'ler OTel Collector üzerinden buraya akar.

## Vault UI

HashiCorp Vault, platformun secret management katmanıdır. Konfigürasyon secret'ları, DB credential'ları ve API anahtarları burada saklanır.

---

*Kaynak: [`vnext-runtime/README.tr.md`](https://github.com/burgan-tech/vnext-runtime/blob/main/README.tr.md#management-tools).*
```

- [ ] **Step 4: Write `architecture/infrastructure/management-tools.md` EN mirror**

Create `i18n/en/docusaurus-plugin-content-docs-architecture/current/infrastructure/management-tools.md`:
```markdown
---
sidebar_position: 3
title: Management Tools
description: Access info for OpenObserve dashboard and Vault UI
---

# Management Tools

**Management UIs** used for platform operation in local development.

| Tool | URL | Username | Password |
|---|---|---|---|
| **OpenObserve** | http://localhost:5080 | root@example.com | Complexpass#@123 |
| **Vault UI** | http://localhost:8200 | - | admin (token) |

:::warning[Security]
The credentials above are for **local development only**. They **must be changed** in production or shared environments.
:::

## OpenObserve

OpenObserve is the observability dashboard for the vnext platform. Logs, metrics, and traces flow into it via the OTel Collector.

## Vault UI

HashiCorp Vault is the platform's secret management layer. Configuration secrets, DB credentials, and API keys are stored here.

---

*Source: [`vnext-runtime/README.md`](https://github.com/burgan-tech/vnext-runtime/blob/main/README.md#management-tools).*
```

- [ ] **Step 5: Build verification**

```bash
npm run build 2>&1 | grep -E "(SUCCESS|FAIL|ERROR|Cause:|MDX compilation)" | head -10
```
Expected: `[SUCCESS]`.

---

### Task 5: Write `overview/principles.md` — Core Architectural Principles

**Files:**
- Create: `architecture/overview/principles.md` (TR)
- Create: `i18n/en/.../overview/principles.md` (EN)

Bu sayfa **yeni yazımdır**. Kaynak tohumları:
- `vnext-runtime/README.md` opening "Core Principles" bahsedilen 5 madde
- `principles/versioning.md` Semantic Versioning bölümü
- Spec'in vurguladığı: Dual-Write, Domain-Driven, Microservice Ready, ETag, Semantic Versioning

- [ ] **Step 1: Write `architecture/overview/principles.md` (TR)**

```markdown
---
sidebar_position: 2
title: Çekirdek Prensipler
description: vnext platformunun mimari prensipleri — dual-write, domain-driven, ETag, semantic versioning
---

# Çekirdek Prensipler

vnext platformunun tasarımını şekillendiren beş çekirdek prensip:

## 1. Dual-Write Pattern

Workflow durumu **iki yere** yazılır: birincil veritabanı (PostgreSQL) ve event store. Bu yaklaşım hem **transactional consistency** hem de **event sourcing** garantisi sağlar.

- **Birincil DB**: workflow instance state, metadata, audit
- **Event store**: state transition'lar event olarak yayınlanır
- **Replication desteği**: event'ler downstream consumer'lara akabilir (CDC + Dapr pub/sub)

> Daha fazla bilgi için: [Persistence Strategy](/architecture/data/persistence)

## 2. Domain-Driven Architecture

Her **domain** bağımsız bir bounded context'tir:

- Kendi runtime container'ları (orchestration, execution, workers)
- Kendi veritabanı (`vNext_<DomainName>`)
- Kendi konfigürasyon (`.env`, `appsettings.*`)
- Kendi component set'i (workflow, task, function, schema, view, extension)

Aynı altyapı (DB engine, Redis, Vault, Dapr) paylaşılır ama **veri ve runtime tamamen izole**.

> Daha fazla bilgi için: [Domain Topology](/architecture/domain-model/topology)

## 3. Microservice Ready (Dapr ile)

Runtime servisleri **Dapr sidecar'ları** üzerinden iletişim kurar:

- **Service invocation**: orchestration ↔ execution
- **Pub/sub**: workflow event'leri (state changes, transitions)
- **State store**: cross-service state sharing (Redis backend)
- **Secret store**: Vault entegrasyonu

Servisler **stateless** ve **horizontally scalable**.


## 4. ETag-Based Concurrent Update Control

Workflow instance'ı her okunduğunda bir **ETag** (entity tag) üretilir. Update isteği bu ETag'ı header'da göndermek **zorundadır**:

```http
PUT /api/v1.0/{domain}/workflows/{wf}/instances/{id}
If-Match: "abc123"
```

ETag eşleşmezse → **412 Precondition Failed**. Bu mekanizma **lost update** problemini önler.

## 5. Semantic Versioning

Tüm component'ler (workflow, task, function, schema, view, extension) **SemVer** (`MAJOR.MINOR.PATCH`) ile versiyonlanır:

- **MAJOR** → backward-incompatible değişiklik
- **MINOR** → backward-compatible özellik eklemesi
- **PATCH** → bug fix

Reference resolution **major version'a sabittir**: bir workflow `v1.x` referansı verdiğinde, runtime en güncel `v1.x.y` instance'ını çözer.

> Daha fazla bilgi için: [Semantic Versioning](/architecture/patterns/versioning), [References](/architecture/patterns/references)

## Bu Prensiplerin Pratik Etkisi

- Domain ekibi **bağımsız ilerleyebilir** (ayrı runtime, ayrı DB)
- Aynı workflow şemasının farklı versiyonları **paralel çalışabilir** (rolling deployment)
- Event'ler downstream sistemlere akabilir (CDC için hazır)
- Concurrent update conflict'leri **build-time'da değil runtime'da** yakalanır
- Component'ler güvenli şekilde **hot-reload** edilebilir (init-service)
```

- [ ] **Step 2: Write EN mirror**

Create `i18n/en/docusaurus-plugin-content-docs-architecture/current/overview/principles.md`:
```markdown
---
sidebar_position: 2
title: Core Principles
description: vnext platform architectural principles — dual-write, domain-driven, ETag, semantic versioning
---

# Core Principles

Five core principles shape the vnext platform's design:

## 1. Dual-Write Pattern

Workflow state is written to **two places**: the primary database (PostgreSQL) and the event store. This guarantees both **transactional consistency** and **event sourcing**.

- **Primary DB**: workflow instance state, metadata, audit
- **Event store**: state transitions are published as events
- **Replication support**: events can flow to downstream consumers (CDC + Dapr pub/sub)

> Learn more: [Persistence Strategy](/architecture/data/persistence)

## 2. Domain-Driven Architecture

Each **domain** is an independent bounded context:

- Its own runtime containers (orchestration, execution, workers)
- Its own database (`vNext_<DomainName>`)
- Its own configuration (`.env`, `appsettings.*`)
- Its own component set (workflow, task, function, schema, view, extension)

The same infrastructure (DB engine, Redis, Vault, Dapr) is shared, but **data and runtime are fully isolated**.

> Learn more: [Domain Topology](/architecture/domain-model/topology)

## 3. Microservice Ready (with Dapr)

Runtime services communicate via **Dapr sidecars**:

- **Service invocation**: orchestration ↔ execution
- **Pub/sub**: workflow events (state changes, transitions)
- **State store**: cross-service state sharing (Redis backend)
- **Secret store**: Vault integration

Services are **stateless** and **horizontally scalable**.


## 4. ETag-Based Concurrent Update Control

Each read of a workflow instance produces an **ETag** (entity tag). Update requests **must** include this ETag in headers:

```http
PUT /api/v1.0/{domain}/workflows/{wf}/instances/{id}
If-Match: "abc123"
```

If the ETag doesn't match → **412 Precondition Failed**. This prevents the **lost update** problem.

## 5. Semantic Versioning

All components (workflow, task, function, schema, view, extension) are versioned with **SemVer** (`MAJOR.MINOR.PATCH`):

- **MAJOR** → backward-incompatible change
- **MINOR** → backward-compatible feature addition
- **PATCH** → bug fix

Reference resolution is **pinned to major version**: when a workflow references `v1.x`, the runtime resolves the latest `v1.x.y` instance.

> Learn more: [Semantic Versioning](/architecture/patterns/versioning), [References](/architecture/patterns/references)

## Practical Implications

- Domain teams can **progress independently** (separate runtime, separate DB)
- Different versions of the same workflow schema can **run in parallel** (rolling deployment)
- Events can flow to downstream systems (CDC-ready)
- Concurrent update conflicts are caught **at runtime, not build time**
- Components can be **hot-reloaded** safely (init-service)
```

- [ ] **Step 3: Build verification**

```bash
npm run build 2>&1 | grep -E "(SUCCESS|FAIL|ERROR|Cause:|MDX compilation)" | head -10
```
Expected: `[SUCCESS]`.

---

### Task 6: ADR Template + Decisions Index

**Files:**
- Create: `architecture/decisions/_template.md` (TR)
- Create: `i18n/en/.../decisions/_template.md` (EN)

Decisions/index.md zaten Task 1'de oluşturuldu. Bu task **template** dosyasını oluşturur. Underscore prefix (`_template.md`) Docusaurus'un sidebar'a dahil etmemesini sağlar.

- [ ] **Step 1: Write `architecture/decisions/_template.md` (TR)**

```markdown
---
sidebar_position: 999
title: ADR Template
description: Yeni ADR yazmak için kopyalanacak şablon
---

# ADR-NNNN: {Karar Başlığı}

- **Tarih**: YYYY-MM-DD
- **Durum**: {Proposed | Accepted | Deprecated | Superseded by ADR-XXXX}
- **Kararı verenler**: {kişi(ler) / komite}
- **Bağlam**: {teknik bağlam, etkilenen sistem(ler), domain}

## Bağlam

{Bu kararın alınmasını gerektiren bağlamı açıkla. Hangi problem var? Hangi kısıtlar/etkenler var?}

## Karar

{Verilen karar nedir? **Tek bir cümle** ile başla, sonra detayları açıkla.}

## Alternatifler

Aşağıdaki alternatifler değerlendirildi:

### Alternatif 1: {Adı}
- **Artılar**: ...
- **Eksiler**: ...
- **Neden seçilmedi**: ...

### Alternatif 2: {Adı}
- **Artılar**: ...
- **Eksiler**: ...
- **Neden seçilmedi**: ...

## Sonuçlar

### Olumlu
- {Bu kararın getirdiği faydalar}

### Olumsuz / Tradeoff
- {Bu kararın bedeli, ödün verilen şeyler}

### Riskler
- {Bilinen riskler, varsa mitigation stratejisi}

## Referanslar

- {Kaynak link'ler, ilgili PR'lar, diğer ADR'lar}
```

- [ ] **Step 2: Write EN mirror**

Create `i18n/en/docusaurus-plugin-content-docs-architecture/current/decisions/_template.md`:
```markdown
---
sidebar_position: 999
title: ADR Template
description: Template to copy when writing a new ADR
---

# ADR-NNNN: {Decision Title}

- **Date**: YYYY-MM-DD
- **Status**: {Proposed | Accepted | Deprecated | Superseded by ADR-XXXX}
- **Decided by**: {person(s) / committee}
- **Context**: {technical context, affected system(s), domain}

## Context

{Describe the context that necessitated this decision. What problem exists? What constraints/forces apply?}

## Decision

{What is the decision? Start with a **single sentence**, then explain the details.}

## Alternatives

The following alternatives were evaluated:

### Alternative 1: {Name}
- **Pros**: ...
- **Cons**: ...
- **Why not chosen**: ...

### Alternative 2: {Name}
- **Pros**: ...
- **Cons**: ...
- **Why not chosen**: ...

## Consequences

### Positive
- {Benefits this decision provides}

### Negative / Tradeoffs
- {Costs of this decision, things given up}

### Risks
- {Known risks, mitigation strategy if any}

## References

- {Source links, related PRs, other ADRs}
```

- [ ] **Step 3: Build verification**

```bash
npm run build 2>&1 | grep -E "(SUCCESS|FAIL|ERROR|Cause:|MDX compilation)" | head -10
```
Expected: `[SUCCESS]`. Underscore-prefixed dosyalar Docusaurus tarafından default'ta hariç tutulur.

---

### Task 7: Internal Link Audit + Repair

Phase 1 dersi: kaynak dosyalarındaki `./other.md` ve `../flow/x.md` tarzı relative link'ler yeni yapıda kırılır. Phase 2'de migration sonrası tüm link'leri **absolute Docusaurus path**'lerine çevir.

- [ ] **Step 1: Get broken link list from build**

```bash
npm run build 2>&1 | grep "linking to" | grep -v '^.*-> linking to #' | sort -u | head -40
```

Bu çıktıdaki **path-level** kırık link'leri (anchor-only olanları değil) Step 2'de düzeltilecek.

- [ ] **Step 2: Apply absolute-path rewrites for migrated content**

Architecture içinde olası kaynak link kalıpları + hedefler:

```bash
ARCH_EN=i18n/en/docusaurus-plugin-content-docs-architecture/current

for f in $(find architecture -name '*.md') $(find $ARCH_EN -name '*.md'); do
  perl -i -pe '
    # fundamentals/principles içi cross-reference'"'"'lar (./readme.md, ../principles/x.md, vb.)
    s|\(\.\.?/(?:fundamentals/)?readme\.md([#?][^)]*)?\)|(/architecture/overview/\1)|g;
    s|\(\.\.?/(?:fundamentals/)?domain-topology\.md([#?][^)]*)?\)|(/architecture/domain-model/topology\1)|g;
    s|\(\.\.?/(?:fundamentals/)?database-architecture\.md([#?][^)]*)?\)|(/architecture/data/database\1)|g;
    s|\(\.\.?/(?:principles/)?persistance\.md([#?][^)]*)?\)|(/architecture/data/persistence\1)|g;
    s|\(\.\.?/(?:principles/)?reference\.md([#?][^)]*)?\)|(/architecture/patterns/references\1)|g;
    s|\(\.\.?/(?:principles/)?versioning\.md([#?][^)]*)?\)|(/architecture/patterns/versioning\1)|g;

    # Phase 1'de migrate edilmiş content'e link'ler (flow/, how-to/, services/)
    s|\(\.\.?/(?:flow/)?flow\.md([#?][^)]*)?\)|(/docs/concepts/workflow\1)|g;
    s|\(\.\.?/(?:flow/)?state\.md([#?][^)]*)?\)|(/docs/concepts/states\1)|g;
    s|\(\.\.?/(?:flow/)?transition\.md([#?][^)]*)?\)|(/docs/concepts/transitions\1)|g;
    s|\(\.\.?/(?:flow/)?schema\.md([#?][^)]*)?\)|(/docs/concepts/schema\1)|g;
    s|\(\.\.?/(?:flow/)?view\.md([#?][^)]*)?\)|(/docs/concepts/views\1)|g;
    s|\(\.\.?/(?:flow/)?extension\.md([#?][^)]*)?\)|(/docs/concepts/extensions\1)|g;
    s|\(\.\.?/(?:flow/)?task\.md([#?][^)]*)?\)|(/docs/components/tasks/\1)|g;
    s|\(\.\.?/(?:flow/)?function\.md([#?][^)]*)?\)|(/docs/components/functions/built-in\1)|g;
    s|\(\.\.?/(?:flow/)?custom-function\.md([#?][^)]*)?\)|(/docs/components/functions/custom\1)|g;
    s|\(\.\.?/(?:flow/)?mapping\.md([#?][^)]*)?\)|(/docs/components/mappings\1)|g;
    s|\(\.\.?/(?:flow/)?interface\.md([#?][^)]*)?\)|(/docs/components/interfaces\1)|g;
    s|\(\.\.?/(?:flow/)?error-boundary\.md([#?][^)]*)?\)|(/docs/how-to/error-handling\1)|g;
    s|\(\.\.?/(?:flow/)?instance-filtering\.md([#?][^)]*)?\)|(/docs/how-to/instance-filtering\1)|g;
    s|\(\.\.?/(?:flow/)?rule-based-view-selection\.md([#?][^)]*)?\)|(/docs/how-to/view-selection\1)|g;
    s|\(\.\.?/(?:flow/)?tasks/([a-z-]+)-task\.md([#?][^)]*)?\)|(/docs/components/tasks/\1\2)|g;
    s|\(\.\.?/(?:how-to/)?start-instance\.md([#?][^)]*)?\)|(/docs/getting-started/first-instance\1)|g;
    s|\(\.\.?/(?:services/)?init-service\.md([#?][^)]*)?\)|(/docs/services/init-service\1)|g;

    # vnext-runtime cross-reference (README, src) — external GitHub URL
    s|\(\.\.?/(?:\.\./)+README\.md([#?][^)]*)?\)|(https://github.com/burgan-tech/vnext-runtime/blob/main/README.md\1)|g;

    # C# source ref → api-reference
    s|\[([^]]+)\]\(\.\.?/(?:\.\./)+src/IMapping\.cs\)|[\1](/docs/api-reference/i-mapping)|g;
    s|\[([^]]+)\]\(\.\.?/(?:\.\./)+src/IConditionMapping\.cs\)|[\1](/docs/api-reference/i-condition-mapping)|g;
    s|\[([^]]+)\]\(\.\.?/(?:\.\./)+src/IOutputHandler\.cs\)|[\1](/docs/api-reference/i-output-handler)|g;
    s|\[([^]]+)\]\(\.\.?/(?:\.\./)+src/ISubFlowMapping\.cs\)|[\1](/docs/api-reference/i-sub-flow-mapping)|g;
    s|\[([^]]+)\]\(\.\.?/(?:\.\./)+src/ISubProcessMapping\.cs\)|[\1](/docs/api-reference/i-sub-process-mapping)|g;
    s|\[([^]]+)\]\(\.\.?/(?:\.\./)+src/ITimerMapping\.cs\)|[\1](/docs/api-reference/i-timer-mapping)|g;
    s|\[([^]]+)\]\(\.\.?/(?:\.\./)+src/ITransitionMapping\.cs\)|[\1](/docs/api-reference/i-transition-mapping)|g;
    s|\[([^]]+)\]\(\.\.?/(?:\.\./)+src/Models\.cs\)|[\1](/docs/api-reference/models)|g;

    # Release notes → italicize Phase 3
    s|\[([^]]+)\]\(\.\.?/(?:\.\./)+release/[^)]+\)|*\1 (Phase 3 \xe2\x80\x94 Release Notes)*|g;
  ' "$f"
done
echo "Link rewrites applied"
```

- [ ] **Step 3: Re-run build**

```bash
npm run build 2>&1 | grep -E "(SUCCESS|FAIL|ERROR|Cause:|MDX compilation)" | head -10
```
Expected: `[SUCCESS]` (anchor warnings olabilir; page-level `throw` ama anchor `warn` ayarı Phase 1'den geliyor).

- [ ] **Step 4: If page-level broken links remain — manual fix**

Build hata verirse, hata mesajındaki kaynak dosyaya git, link'i manuel düzelt (`Edit` ile), sonra yeniden build.

---

### Task 8: Final Verification

- [ ] **Step 1: Clean build**

```bash
rm -rf build .docusaurus
npm run build 2>&1 | tail -10
```
Expected: `[SUCCESS] Generated static files in "build"` ve `"build/en"`.

- [ ] **Step 2: Inventory check**

```bash
echo "Architecture TR pages:"
find architecture -name '*.md' | sort
echo ""
echo "Architecture EN pages:"
find i18n/en/docusaurus-plugin-content-docs-architecture/current -name '*.md' | sort
echo ""
echo "Counts:"
echo "TR: $(find architecture -name '*.md' | wc -l)"
echo "EN: $(find i18n/en/docusaurus-plugin-content-docs-architecture/current -name '*.md' | wc -l)"
```
Expected: ~16 TR + ~16 EN; counts eşit.

- [ ] **Step 3: Start dev server, visual check**

```bash
npm run start
```
Tarayıcıda kontrol et:
- `/architecture/intro` → "Architecture" landing
- `/architecture/overview/` → Platform overview (fundamentals/readme'den)
- `/architecture/overview/principles` → 5 çekirdek prensip
- `/architecture/domain-model/topology` → domain topology
- `/architecture/data/database` → database architecture
- `/architecture/data/persistence` → persistence
- `/architecture/patterns/references` → reference concept
- `/architecture/patterns/versioning` → SemVer
- `/architecture/decisions/` → ADR intro
- Locale dropdown'dan EN'e geç → aynı yapı görünür

Ctrl+C ile durdur.

- [ ] **Step 4: Phase 3 hazırlığı**

Sıradaki: **Phase 3 — Blog (Release Notes Migration)**. Ayrı `writing-plans` çağrısı ile plan yazılacak.

---

## Verification Summary (Phase 2 Exit Criteria)

- ✅ `architecture/` altında 7 sub-category: overview, domain-model, data, runtime, infrastructure, patterns, decisions
- ✅ 16+ TR markdown + 16+ EN markdown (frontmatter'lı, admonition normalize)
- ✅ Migration: 6 fundamentals/principles + 2 README section = 8 page taşındı
- ✅ Yeni yazım: architecture/intro, principles, ADR template + 6 category index
- ✅ `npm run build` page-level link'ler için temiz (anchor warning'ler kabul edilebilir)
- ✅ Architect "platform mimarisi nedir" sorusunu Architecture instance üzerinden cevaplayabilir
- ✅ Phase 1 referansları (Technical instance) ile cross-link kuruldu

## Out of Scope (Phase 3+'a bırakılan)

- `architecture/runtime/` deep-dive sayfaları (orchestration / execution / workers ayrı pages) → ileri phase
- `architecture/patterns/dual-write.md` deep-dive (overview/principles içinde özet var)
- `architecture/infrastructure/dapr.md`, `observability.md` deep-dive
- Mermaid/D2 mimari diyagramları (Phase 6 — Polish)
- Release notes → Phase 3 (Blog)
- Business + Product içerik → Phase 4/5
