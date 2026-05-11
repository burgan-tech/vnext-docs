# Phase 1 — Technical Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** vnext-runtime/doc'daki Technical-kapsamlı içeriği (flow/, how-to/, services/init-service.md, README teknik bölümleri, doc/src/*.cs) vnext-docs/docs (Technical instance) ve i18n/en mirror'ına yeniden yapılandırılmış kategoriler altında taşı.

**Architecture:** Kaynak okunur (vnext-runtime read-only). Her kaynak dosya için (a) TR source `docs/{category}/...` altına kopyalanır, (b) EN eşdeğeri `i18n/en/docusaurus-plugin-content-docs/current/{category}/...` altına kopyalanır. Her dosya için frontmatter eklenir, custom admonition'lar (`:::highlight` vb.) Docusaurus standardına (`:::tip`) normalize edilir, internal linkler yeni yapıya göre güncellenir. Fundamentals ve principles klasörleri **Phase 2'ye bırakılır**.

**Tech Stack:** Docusaurus 3.x (Phase 0'da kurulu), bash shell (bulk copy), find/sed (text transformation), npm run build (verification).

---

## Scope

**Dahil olan kaynaklar** (`vnext-runtime/` altında):
- `doc/tr/flow/*.md` + `doc/tr/flow/tasks/*.md` (14 + 9 = 23 dosya)
- `doc/tr/how-to/start-instance.md`
- `doc/tr/services/init-service.md`
- `doc/en/` — yukarıdakilerin EN paraleli
- `README.md` — sadece "Environment Configuration", "Multi-Domain Support", Docker / Makefile bölümleri
- `README.tr.md` — yukarıdakinin TR paraleli
- `doc/src/*.cs` (7 interface + `Models.cs`)

**Phase 1 DIŞI** (Phase 2 / 3'e bırakıldı):
- `doc/tr/fundamentals/` + `doc/en/fundamentals/` (hepsi Phase 2 — Architecture)
- `doc/tr/principles/` + `doc/en/principles/` (hepsi Phase 2 — Architecture)
- README'nin "Platform Architecture", "Core Principles" bölümleri (Phase 2)
- `release/*.md` (Phase 3 — Blog)
- `ai-docs/` (tamamen kapsam dışı)

---

## Target File Structure (Phase 1 sonunda)

```
vnext-docs/docs/                            (TR primary)
├── intro.md                                 (rewrite as Technical landing)
├── getting-started/
│   ├── index.md                             (new — overview)
│   ├── local-dev.md                         (from README — Environment Config + Quick Start + Makefile)
│   ├── multi-domain.md                      (from README — Multi-Domain Support + Port Allocation)
│   └── first-instance.md                    (from doc/tr/how-to/start-instance.md)
├── concepts/
│   ├── workflow.md                          (from doc/tr/flow/flow.md)
│   ├── states.md                            (from doc/tr/flow/state.md)
│   ├── transitions.md                       (from doc/tr/flow/transition.md)
│   ├── schema.md                            (from doc/tr/flow/schema.md)
│   ├── views.md                             (from doc/tr/flow/view.md)
│   └── extensions.md                        (from doc/tr/flow/extension.md)
├── components/
│   ├── tasks/
│   │   ├── index.md                         (from doc/tr/flow/task.md — task types overview)
│   │   ├── http.md                          (from doc/tr/flow/tasks/http-task.md)
│   │   ├── script.md                        (from doc/tr/flow/tasks/script-task.md)
│   │   ├── condition.md                     (from condition-task.md)
│   │   ├── timer.md                         (from timer-task.md)
│   │   ├── trigger.md                       (from trigger-task.md)
│   │   ├── get-instances.md                 (from get-instances-task.md)
│   │   ├── notification.md                  (from notification-task.md)
│   │   ├── dapr-service.md                  (from dapr-service.md)
│   │   └── dapr-pubsub.md                   (from dapr-pubsub.md)
│   ├── functions/
│   │   ├── built-in.md                      (from doc/tr/flow/function.md)
│   │   └── custom.md                        (from doc/tr/flow/custom-function.md)
│   ├── mappings.md                          (from doc/tr/flow/mapping.md)
│   └── interfaces.md                        (from doc/tr/flow/interface.md)
├── how-to/
│   ├── error-handling.md                    (from doc/tr/flow/error-boundary.md)
│   ├── instance-filtering.md                (from doc/tr/flow/instance-filtering.md)
│   └── view-selection.md                    (from doc/tr/flow/rule-based-view-selection.md)
├── services/
│   └── init-service.md                      (from doc/tr/services/init-service.md)
└── api-reference/
    ├── index.md                             (new — overview)
    ├── i-mapping.md                         (from doc/src/IMapping.cs)
    ├── i-condition-mapping.md               (from doc/src/IConditionMapping.cs)
    ├── i-output-handler.md                  (from doc/src/IOutputHandler.cs)
    ├── i-sub-flow-mapping.md                (from doc/src/ISubFlowMapping.cs)
    ├── i-sub-process-mapping.md             (from doc/src/ISubProcessMapping.cs)
    ├── i-timer-mapping.md                   (from doc/src/ITimerMapping.cs)
    ├── i-transition-mapping.md              (from doc/src/ITransitionMapping.cs)
    └── models.md                            (from doc/src/Models.cs)

vnext-docs/i18n/en/docusaurus-plugin-content-docs/current/  (EN translations — aynı yapı)
└── ... (yukarıdaki yapının EN mirror'ı)
```

**Toplam Phase 1 sonunda:** 31 TR page + 31 EN page = 62 markdown dosyası (placeholder intro.md hariç replace edilmiş).

---

## Constants — Migration Tools

### Frontmatter Template (TR)

```yaml
---
sidebar_position: {N}
title: {Türkçe Başlık}
description: {Kısa özet, SEO için}
---
```

### Frontmatter Template (EN)

```yaml
---
sidebar_position: {N}
title: {English Title}
description: {Short summary for SEO}
---
```

### Admonition Normalization Rules

| Kaynaktaki | Docusaurus'a Çevir |
|---|---|
| `:::highlight green 💡` | `:::tip` |
| `:::highlight red` | `:::danger` |
| `:::highlight yellow` | `:::warning` |
| `:::highlight blue` | `:::info` |
| `:::highlight {renk}` (diğer) | `:::note` |

Çevirme bash one-liner (her dosya için çalıştırılacak):
```bash
sed -i '' -E \
  -e 's/:::highlight green[^$]*$/:::tip/' \
  -e 's/:::highlight red[^$]*$/:::danger/' \
  -e 's/:::highlight yellow[^$]*$/:::warning/' \
  -e 's/:::highlight blue[^$]*$/:::info/' \
  -e 's/:::highlight [a-z]+[^$]*$/:::note/' \
  "$file"
```

### Internal Link Rewrite Rules

Kaynak dosyadaki relative link'ler genellikle `[text](./other-file.md)` veya `[text](../flow/other.md)` formatında. Yeni yapıda dosya/klasör değiştiği için bu linkler kırılır. Link audit Task 11'de (final pass) yapılır — her kırık link için ya yeniden yazılır ya plain text'e dönüştürülür (Phase 2+ target'lar için).

### Standard Shell Helpers

Her task'ta aynı dizin yapısı hazırlanır. Bunu task başında çalıştır:

```bash
cd /Users/U0B006/Documents/repos/burgan-tech/vnext-docs
SOURCE_TR=/Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr
SOURCE_EN=/Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en
EN_MIRROR=i18n/en/docusaurus-plugin-content-docs/current
```

---

## Tasks

### Task 1: Replace Technical Intro + Create Category Skeleton

**Files:**
- Modify: `docs/intro.md` (Phase 0 placeholder → real Technical landing)
- Modify: `i18n/en/docusaurus-plugin-content-docs/current/intro.md`
- Create: `docs/getting-started/` (directory)
- Create: `docs/concepts/`, `docs/components/`, `docs/components/tasks/`, `docs/components/functions/`
- Create: `docs/how-to/`, `docs/services/`, `docs/api-reference/` (directories)
- Create: `i18n/en/docusaurus-plugin-content-docs/current/{getting-started,concepts,components,components/tasks,components/functions,how-to,services,api-reference}/` (directories)
- Create: `docs/getting-started/index.md`, `docs/api-reference/index.md` (placeholder index pages — will be filled by later tasks)
- Create: EN mirrors of above index pages

- [ ] **Step 1: Create directory skeleton for TR + EN mirrors**

```bash
cd /Users/U0B006/Documents/repos/burgan-tech/vnext-docs
mkdir -p docs/{getting-started,concepts,components/tasks,components/functions,how-to,services,api-reference}
mkdir -p i18n/en/docusaurus-plugin-content-docs/current/{getting-started,concepts,components/tasks,components/functions,how-to,services,api-reference}
```

- [ ] **Step 2: Replace `docs/intro.md` with Technical landing**

Overwrite `docs/intro.md`:

```markdown
---
slug: /intro
sidebar_position: 1
title: Technical Docs
description: vnext platformu üzerinde geliştirme yapacak yazılım mühendisleri için teknik dokümantasyon
---

# Technical Documentation

Bu bölüm, vnext platformu üzerinde **geliştirme yapan yazılım mühendisleri** içindir. Platformun nasıl kurulacağından, workflow bileşenlerinin nasıl tanımlanacağına kadar teknik referans burada.

## Başlangıç yolculuğu

1. **[Getting Started](./getting-started/)** — local dev ortamını kur, multi-domain setup, ilk workflow instance'ını başlat.
2. **[Concepts](./concepts/workflow)** — çekirdek kavramlar: workflow, state, transition, schema, view, extension.
3. **[Components](./components/tasks/)** — task türleri, functions, mappings, interfaces.
4. **[How-To](./how-to/error-handling)** — pratik rehberler: hata yönetimi, instance filtering, view selection.
5. **[Services](./services/init-service)** — init-service paket dağıtımı.
6. **[API Reference](./api-reference/)** — C# interface referansları (IMapping, IConditionMapping vb.).
```

- [ ] **Step 3: Replace `i18n/en/.../intro.md` with English mirror**

Overwrite `i18n/en/docusaurus-plugin-content-docs/current/intro.md`:

```markdown
---
slug: /intro
sidebar_position: 1
title: Technical Docs
description: Technical documentation for software engineers building on the vnext platform
---

# Technical Documentation

This section is for **software engineers** building on the vnext platform. From setup to workflow components, the technical reference lives here.

## Learning path

1. **[Getting Started](./getting-started/)** — local dev setup, multi-domain, first workflow instance.
2. **[Concepts](./concepts/workflow)** — core concepts: workflow, state, transition, schema, view, extension.
3. **[Components](./components/tasks/)** — task types, functions, mappings, interfaces.
4. **[How-To](./how-to/error-handling)** — practical guides: error handling, instance filtering, view selection.
5. **[Services](./services/init-service)** — init-service package distribution.
6. **[API Reference](./api-reference/)** — C# interface references (IMapping, IConditionMapping, etc.).
```

- [ ] **Step 4: Create `docs/getting-started/index.md` placeholder**

```markdown
---
sidebar_position: 1
title: Getting Started
description: vnext platformunda geliştirmeye başlamak için kurulum ve ilk adımlar
---

# Getting Started

Bu bölüm vnext platformunda geliştirmeye başlamak için pratik rehberleri içerir.

- **[Local Development](./local-dev)** — Docker Compose ile local runtime kurulumu.
- **[Multi-Domain Setup](./multi-domain)** — birden fazla domain'i izole olarak çalıştırma.
- **[First Instance](./first-instance)** — ilk workflow instance'ını başlatma.
```

EN mirror (`i18n/en/.../getting-started/index.md`):

```markdown
---
sidebar_position: 1
title: Getting Started
description: Setup and first steps for building on the vnext platform
---

# Getting Started

This section contains practical guides for starting development on the vnext platform.

- **[Local Development](./local-dev)** — Local runtime setup with Docker Compose.
- **[Multi-Domain Setup](./multi-domain)** — Running multiple isolated domains.
- **[First Instance](./first-instance)** — Starting your first workflow instance.
```

- [ ] **Step 5: Create `docs/api-reference/index.md` placeholder**

```markdown
---
sidebar_position: 1
title: API Reference
description: vnext platformu için C# interface referansları
---

# API Reference

Bu bölüm, vnext platformunun **C# API'sinin** referans dokümantasyonudur. Her interface bir extension point tanımlar — custom mapping, handler, timer logic yazarken bu interface'leri implement edersiniz.

- **[IMapping](./i-mapping)** — task input/output data binding
- **[IConditionMapping](./i-condition-mapping)** — auto-transition koşul mantığı
- **[IOutputHandler](./i-output-handler)** — function output mapping
- **[ISubFlowMapping](./i-sub-flow-mapping)** — subflow data binding
- **[ISubProcessMapping](./i-sub-process-mapping)** — subprocess data binding
- **[ITimerMapping](./i-timer-mapping)** — timer scheduling logic
- **[ITransitionMapping](./i-transition-mapping)** — transition handler
- **[Models](./models)** — response modelleri (ScriptResponse, StandardTaskResponse)
```

EN mirror:

```markdown
---
sidebar_position: 1
title: API Reference
description: C# interface references for the vnext platform
---

# API Reference

This section is the reference documentation for the **vnext platform C# API**. Each interface defines an extension point — you implement these when writing custom mappings, handlers, or timer logic.

- **[IMapping](./i-mapping)** — task input/output data binding
- **[IConditionMapping](./i-condition-mapping)** — auto-transition condition logic
- **[IOutputHandler](./i-output-handler)** — function output mapping
- **[ISubFlowMapping](./i-sub-flow-mapping)** — subflow data binding
- **[ISubProcessMapping](./i-sub-process-mapping)** — subprocess data binding
- **[ITimerMapping](./i-timer-mapping)** — timer scheduling logic
- **[ITransitionMapping](./i-transition-mapping)** — transition handler
- **[Models](./models)** — response models (ScriptResponse, StandardTaskResponse)
```

- [ ] **Step 6: Verify build still passes**

```bash
npm run build 2>&1 | tail -10
```
Expected: `[SUCCESS] Generated static files in "build".` — no new errors.

---

### Task 2: Getting-Started — Local Dev + Multi-Domain from README

**Files:**
- Create: `docs/getting-started/local-dev.md` (from `vnext-runtime/README.tr.md` — Environment Configuration + Quick Start + Makefile sections)
- Create: `docs/getting-started/multi-domain.md` (from README.tr.md — Multi-Domain Support + Port Allocation)
- Create: `docs/getting-started/first-instance.md` (from `vnext-runtime/doc/tr/how-to/start-instance.md`)
- Create: EN mirrors in `i18n/en/.../getting-started/`

- [ ] **Step 1: Copy first-instance TR source**

```bash
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/how-to/start-instance.md \
   docs/getting-started/first-instance.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/how-to/start-instance.md \
   i18n/en/docusaurus-plugin-content-docs/current/getting-started/first-instance.md
```

- [ ] **Step 2: Add frontmatter to first-instance TR**

Prepend to `docs/getting-started/first-instance.md`:

```yaml
---
sidebar_position: 4
title: İlk Instance'ı Başlatma
description: vnext platformunda ilk workflow instance'ını POST endpoint'i ile başlatma
---

```

- [ ] **Step 3: Add frontmatter to first-instance EN**

Prepend to `i18n/en/docusaurus-plugin-content-docs/current/getting-started/first-instance.md`:

```yaml
---
sidebar_position: 4
title: Starting Your First Instance
description: Starting your first workflow instance with the POST endpoint
---

```

- [ ] **Step 4: Normalize admonitions in first-instance files**

```bash
for f in docs/getting-started/first-instance.md i18n/en/docusaurus-plugin-content-docs/current/getting-started/first-instance.md; do
  sed -i '' -E \
    -e 's/^:::highlight green.*$/:::tip/' \
    -e 's/^:::highlight red.*$/:::danger/' \
    -e 's/^:::highlight yellow.*$/:::warning/' \
    -e 's/^:::highlight blue.*$/:::info/' \
    -e 's/^:::highlight [a-z]+.*$/:::note/' \
    "$f"
done
```

- [ ] **Step 5: Write `docs/getting-started/local-dev.md` from README.tr.md**

Create `docs/getting-started/local-dev.md`. Kaynak: `vnext-runtime/README.tr.md`. Aşağıdaki bölümleri distil:
- "Ortam Yapılandırması" (Environment Configuration)
- "Kolay Kurulum Makefile ile" (Quick Start)
- "vNext Core Runtime Başlatma"
- "Veritabanı Yönetimi"
- "Geliştirme İpuçları"
- "Makefile Komutları" tablosu

Frontmatter + içerik yapısı:

```markdown
---
sidebar_position: 2
title: Local Development
description: Docker Compose ile vnext runtime'ı local makinade çalıştırma
---

# Local Development

Bu rehber, vnext platformunu **local makinanda** docker-compose üzerinden çalıştırmak için gerekli tüm adımları içerir. vnext-runtime repo'su bu kurulum için hazır template'lerle gelir.

## Ön Koşullar

- Docker Desktop (veya eşdeğer Docker Engine + Compose)
- Make
- Git

## Ortam Yapılandırması

[README.tr.md — Ortam Yapılandırması bölümünü buraya kopyala; path referanslarını güncelle (`vnext/docker/templates/`, `vnext/docker/domains/<domain_name>/`)]

## Hızlı Başlangıç

[Makefile kurulumu, `make up-infra`, `make up` komutları]

## Veritabanı Yönetimi

[make migrate komutu ve db-migrator açıklaması]

## Makefile Komutları Referansı

[README.tr.md'deki Makefile komutları tablosu]

---

*Not: Bu sayfa `vnext-runtime/README.tr.md`'den distil edilmiştir. Orijinal için: [vnext-runtime README](https://github.com/burgan-tech/vnext-runtime/blob/main/README.tr.md).*
```

Bu task bir "yazım" görevidir — bash ile otomatik distill edilemez. README.tr.md'yi aç, yukarıdaki bölümleri kopyala, bu dosyaya yapıştır, path referanslarını ve link'leri güncelle.

- [ ] **Step 6: Write `i18n/en/.../getting-started/local-dev.md` from README.md**

Aynı yapıyı EN kaynak README.md'den yap:

```markdown
---
sidebar_position: 2
title: Local Development
description: Running vnext runtime locally with Docker Compose
---

# Local Development

[README.md — English equivalent content]
```

- [ ] **Step 7: Write `docs/getting-started/multi-domain.md` from README.tr.md**

Create `docs/getting-started/multi-domain.md`. Kaynak: README.tr.md'nin "🎯 Multi-Domain Destek" bölümü + Port Allocation tablosu + "Birden Fazla Domain Çalıştırma".

```markdown
---
sidebar_position: 3
title: Multi-Domain Kurulumu
description: vnext platformunda birden fazla domain'i izole olarak çalıştırma
---

# Multi-Domain Kurulumu

vnext Runtime, **aynı altyapı üzerinde birden fazla domain'i eşzamanlı çalıştırmayı** destekler. Ekipler izole domain ortamları (`core`, `sales`, `hr` gibi) aynı PostgreSQL, Redis, Vault ve Dapr servisleri üzerinde paylaşabilir.

## Klasör Yapısı

[README'den `vnext/docker/templates/`, `domains/` yapısı]

## Yeni Domain Oluşturma

[README'den `make create-domain DOMAIN=sales PORT_OFFSET=10` örneği ve açıklama]

## Port Dağılımı

[README'deki Port Allocation tablosu]

## Birden Fazla Domain Çalıştırma

[README'den komut sırası: `make up-infra`, sonra domain başlatma]

---

*Not: Bu sayfa `vnext-runtime/README.tr.md`'den distil edilmiştir.*
```

- [ ] **Step 8: Write EN mirror for multi-domain**

Create `i18n/en/.../getting-started/multi-domain.md`:

```markdown
---
sidebar_position: 3
title: Multi-Domain Setup
description: Running multiple isolated domains on the vnext platform
---

# Multi-Domain Setup

[README.md — "Multi-Domain Support (New!)" bölümü + Port Allocation + Running Multiple Domains]
```

- [ ] **Step 9: Update first-instance sidebar_position to 4**

Zaten Step 2'de `sidebar_position: 4` verdik. Doğrula:
```bash
head -5 docs/getting-started/first-instance.md
```
Expected: `sidebar_position: 4` görünür.

- [ ] **Step 10: Build verification**

```bash
npm run build 2>&1 | tail -15
```
Expected: `[SUCCESS]`. Eğer broken link warning çıkarsa, o link Phase 2 target'ına işaret ediyor olabilir — Task 11'de ele alınacak. Build'in PASS etmesi kritik.

---

### Task 3: Concepts — Workflow, States, Transitions, Schema, Views, Extensions

**Files:**
- Create: `docs/concepts/workflow.md` (from `doc/tr/flow/flow.md`)
- Create: `docs/concepts/states.md` (from `doc/tr/flow/state.md`)
- Create: `docs/concepts/transitions.md` (from `doc/tr/flow/transition.md`)
- Create: `docs/concepts/schema.md` (from `doc/tr/flow/schema.md`)
- Create: `docs/concepts/views.md` (from `doc/tr/flow/view.md`)
- Create: `docs/concepts/extensions.md` (from `doc/tr/flow/extension.md`)
- Create: EN mirrors

- [ ] **Step 1: Bulk copy TR source files**

```bash
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/flow.md       docs/concepts/workflow.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/state.md      docs/concepts/states.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/transition.md docs/concepts/transitions.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/schema.md     docs/concepts/schema.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/view.md       docs/concepts/views.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/extension.md  docs/concepts/extensions.md
```

- [ ] **Step 2: Bulk copy EN source files**

```bash
EN_DEST=i18n/en/docusaurus-plugin-content-docs/current/concepts
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/flow.md       $EN_DEST/workflow.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/state.md      $EN_DEST/states.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/transition.md $EN_DEST/transitions.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/schema.md     $EN_DEST/schema.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/view.md       $EN_DEST/views.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/extension.md  $EN_DEST/extensions.md
```

- [ ] **Step 3: Add frontmatter to TR concepts files**

Her dosyanın başına frontmatter ekle. Sidebar sırası: workflow=1, states=2, transitions=3, schema=4, views=5, extensions=6.

`docs/concepts/workflow.md` — prepend:
```yaml
---
sidebar_position: 1
title: Workflow (İş Akışı)
description: vnext'te workflow tanımlaması, türleri ve bileşenleri
---

```

`docs/concepts/states.md` — prepend:
```yaml
---
sidebar_position: 2
title: States (Durumlar)
description: Workflow state türleri ve yaşam döngüsü
---

```

`docs/concepts/transitions.md` — prepend:
```yaml
---
sidebar_position: 3
title: Transitions (Geçişler)
description: State geçişleri, otomatik ve manuel transition'lar, koşullar
---

```

`docs/concepts/schema.md` — prepend:
```yaml
---
sidebar_position: 4
title: Schema (Şema)
description: Workflow şema tanımı, veri yapıları, JSON deserialization
---

```

`docs/concepts/views.md` — prepend:
```yaml
---
sidebar_position: 5
title: Views (Görünümler)
description: View rendering, platform-specific content, dinamik UI
---

```

`docs/concepts/extensions.md` — prepend:
```yaml
---
sidebar_position: 6
title: Extensions (Eklentiler)
description: Extension management ve plugin mekanizması
---

```

- [ ] **Step 4: Add frontmatter to EN concepts files**

EN dosyalarına (aynı sidebar_position, TR'nin yerine EN başlık/açıklama):

`i18n/en/.../concepts/workflow.md`:
```yaml
---
sidebar_position: 1
title: Workflow
description: Workflow definition, types, and components in vnext
---

```

`states.md`:
```yaml
---
sidebar_position: 2
title: States
description: Workflow state types and lifecycle
---

```

`transitions.md`:
```yaml
---
sidebar_position: 3
title: Transitions
description: State transitions, automatic and manual, conditions
---

```

`schema.md`:
```yaml
---
sidebar_position: 4
title: Schema
description: Workflow schema definition, data structures, JSON deserialization
---

```

`views.md`:
```yaml
---
sidebar_position: 5
title: Views
description: View rendering, platform-specific content, dynamic UI
---

```

`extensions.md`:
```yaml
---
sidebar_position: 6
title: Extensions
description: Extension management and plugin mechanism
---

```

- [ ] **Step 5: Normalize admonitions in all 12 concepts files (TR + EN)**

```bash
for f in docs/concepts/*.md i18n/en/docusaurus-plugin-content-docs/current/concepts/*.md; do
  sed -i '' -E \
    -e 's/^:::highlight green.*$/:::tip/' \
    -e 's/^:::highlight red.*$/:::danger/' \
    -e 's/^:::highlight yellow.*$/:::warning/' \
    -e 's/^:::highlight blue.*$/:::info/' \
    -e 's/^:::highlight [a-z]+.*$/:::note/' \
    "$f"
done
```

- [ ] **Step 6: Build verification**

```bash
npm run build 2>&1 | tail -15
```
Expected: `[SUCCESS]`. Broken link warnings olabilir — Task 11'de toplu halledilecek. Build hard-fail etmemeli.

---

### Task 4: Components — Tasks (index + 9 task types)

**Files:**
- Create: `docs/components/tasks/index.md` (from `doc/tr/flow/task.md`)
- Create: `docs/components/tasks/http.md` (from `doc/tr/flow/tasks/http-task.md`)
- Create: `docs/components/tasks/script.md` (from `script-task.md`)
- Create: `docs/components/tasks/condition.md` (from `condition-task.md`)
- Create: `docs/components/tasks/timer.md` (from `timer-task.md`)
- Create: `docs/components/tasks/trigger.md` (from `trigger-task.md`)
- Create: `docs/components/tasks/get-instances.md` (from `get-instances-task.md`)
- Create: `docs/components/tasks/notification.md` (from `notification-task.md`)
- Create: `docs/components/tasks/dapr-service.md` (from `dapr-service.md`)
- Create: `docs/components/tasks/dapr-pubsub.md` (from `dapr-pubsub.md`)
- Create: EN mirrors of all above

- [ ] **Step 1: Bulk copy TR source**

```bash
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/task.md                      docs/components/tasks/index.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/tasks/http-task.md           docs/components/tasks/http.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/tasks/script-task.md         docs/components/tasks/script.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/tasks/condition-task.md      docs/components/tasks/condition.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/tasks/timer-task.md          docs/components/tasks/timer.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/tasks/trigger-task.md        docs/components/tasks/trigger.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/tasks/get-instances-task.md  docs/components/tasks/get-instances.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/tasks/notification-task.md   docs/components/tasks/notification.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/tasks/dapr-service.md        docs/components/tasks/dapr-service.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/tasks/dapr-pubsub.md         docs/components/tasks/dapr-pubsub.md
```

- [ ] **Step 2: Bulk copy EN source**

```bash
EN_DEST=i18n/en/docusaurus-plugin-content-docs/current/components/tasks
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/task.md                      $EN_DEST/index.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/tasks/http-task.md           $EN_DEST/http.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/tasks/script-task.md         $EN_DEST/script.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/tasks/condition-task.md      $EN_DEST/condition.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/tasks/timer-task.md          $EN_DEST/timer.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/tasks/trigger-task.md        $EN_DEST/trigger.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/tasks/get-instances-task.md  $EN_DEST/get-instances.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/tasks/notification-task.md   $EN_DEST/notification.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/tasks/dapr-service.md        $EN_DEST/dapr-service.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/tasks/dapr-pubsub.md         $EN_DEST/dapr-pubsub.md
```

- [ ] **Step 3: Add frontmatter to `docs/components/tasks/index.md` (TR + EN)**

TR (`docs/components/tasks/index.md`) — prepend:
```yaml
---
sidebar_position: 1
title: Tasks Genel Bakış
description: vnext task türleri, reference mekanizması ve mapping kullanımı
---

```

EN (`i18n/en/.../components/tasks/index.md`) — prepend:
```yaml
---
sidebar_position: 1
title: Tasks Overview
description: vnext task types, reference mechanism, and mapping usage
---

```

- [ ] **Step 4: Add frontmatter to 9 task files (TR)**

Her task dosyasının başına prepend:

`docs/components/tasks/http.md`:
```yaml
---
sidebar_position: 2
title: HTTP Task
description: HTTP istekleri ile REST API çağrısı yapan task
---

```

`script.md`:
```yaml
---
sidebar_position: 3
title: Script Task
description: C# Roslyn ile inline kod çalıştıran task
---

```

`condition.md`:
```yaml
---
sidebar_position: 4
title: Condition Task
description: Koşullu mantık ve branch decision-making task
---

```

`timer.md`:
```yaml
---
sidebar_position: 5
title: Timer Task
description: CRON ifadeleri ve delayed execution task
---

```

`trigger.md`:
```yaml
---
sidebar_position: 6
title: Trigger Task
description: Workflow orchestration ve instance başlatma task
---

```

`get-instances.md`:
```yaml
---
sidebar_position: 7
title: Get Instances Task
description: Diğer workflow'lardan instance fetch task
---

```

`notification.md`:
```yaml
---
sidebar_position: 8
title: Notification Task
description: Bildirim gönderme ve alert task
---

```

`dapr-service.md`:
```yaml
---
sidebar_position: 9
title: Dapr Service Task
description: Dapr service invocation ile inter-service iletişim
---

```

`dapr-pubsub.md`:
```yaml
---
sidebar_position: 10
title: Dapr Pub/Sub Task
description: Dapr pub/sub mesajlaşması ile event-driven flow
---

```

- [ ] **Step 5: Add frontmatter to 9 task files (EN)**

EN dosyalarına, TR ile aynı sidebar_position'lar, English başlık/description:

`http.md`:
```yaml
---
sidebar_position: 2
title: HTTP Task
description: REST API calls via HTTP requests
---

```

`script.md`:
```yaml
---
sidebar_position: 3
title: Script Task
description: Inline C# Roslyn script execution
---

```

`condition.md`:
```yaml
---
sidebar_position: 4
title: Condition Task
description: Conditional logic and branch decision-making
---

```

`timer.md`:
```yaml
---
sidebar_position: 5
title: Timer Task
description: CRON expressions and delayed execution
---

```

`trigger.md`:
```yaml
---
sidebar_position: 6
title: Trigger Task
description: Workflow orchestration and instance startup
---

```

`get-instances.md`:
```yaml
---
sidebar_position: 7
title: Get Instances Task
description: Fetching instances from other workflows
---

```

`notification.md`:
```yaml
---
sidebar_position: 8
title: Notification Task
description: Sending notifications and alerts
---

```

`dapr-service.md`:
```yaml
---
sidebar_position: 9
title: Dapr Service Task
description: Inter-service communication via Dapr service invocation
---

```

`dapr-pubsub.md`:
```yaml
---
sidebar_position: 10
title: Dapr Pub/Sub Task
description: Event-driven flows via Dapr pub/sub messaging
---

```

- [ ] **Step 6: Normalize admonitions in all 20 task files**

```bash
for f in docs/components/tasks/*.md i18n/en/docusaurus-plugin-content-docs/current/components/tasks/*.md; do
  sed -i '' -E \
    -e 's/^:::highlight green.*$/:::tip/' \
    -e 's/^:::highlight red.*$/:::danger/' \
    -e 's/^:::highlight yellow.*$/:::warning/' \
    -e 's/^:::highlight blue.*$/:::info/' \
    -e 's/^:::highlight [a-z]+.*$/:::note/' \
    "$f"
done
```

- [ ] **Step 7: Build verification**

```bash
npm run build 2>&1 | tail -15
```
Expected: `[SUCCESS]`.

---

### Task 5: Components — Functions + Mappings + Interfaces

**Files:**
- Create: `docs/components/functions/built-in.md` (from `doc/tr/flow/function.md`)
- Create: `docs/components/functions/custom.md` (from `doc/tr/flow/custom-function.md`)
- Create: `docs/components/mappings.md` (from `doc/tr/flow/mapping.md`)
- Create: `docs/components/interfaces.md` (from `doc/tr/flow/interface.md`)
- Create: EN mirrors

- [ ] **Step 1: Bulk copy TR + EN source**

```bash
# TR
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/function.md        docs/components/functions/built-in.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/custom-function.md docs/components/functions/custom.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/mapping.md         docs/components/mappings.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/interface.md       docs/components/interfaces.md

# EN
EN_COMP=i18n/en/docusaurus-plugin-content-docs/current/components
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/function.md        $EN_COMP/functions/built-in.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/custom-function.md $EN_COMP/functions/custom.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/mapping.md         $EN_COMP/mappings.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/interface.md       $EN_COMP/interfaces.md
```

- [ ] **Step 2: Add frontmatter to TR files**

`docs/components/functions/built-in.md`:
```yaml
---
sidebar_position: 1
title: Built-in Functions
description: Sistem API'si — State, Data, View functions; long-polling, ETag
---

```

`docs/components/functions/custom.md`:
```yaml
---
sidebar_position: 2
title: Custom Functions
description: Kullanıcı tanımlı fonksiyonlar ve C# scripting
---

```

`docs/components/mappings.md`:
```yaml
---
sidebar_position: 3
title: Mappings
description: IMapping interface, input/output handler kullanımı, audit logging
---

```

`docs/components/interfaces.md`:
```yaml
---
sidebar_position: 4
title: Interfaces
description: Workflow kaynak kod interface'leri ve graph visualization
---

```

- [ ] **Step 3: Add frontmatter to EN files**

`i18n/en/.../components/functions/built-in.md`:
```yaml
---
sidebar_position: 1
title: Built-in Functions
description: System API — State, Data, View functions; long-polling, ETag
---

```

`custom.md`:
```yaml
---
sidebar_position: 2
title: Custom Functions
description: User-defined functions and C# scripting
---

```

`../mappings.md`:
```yaml
---
sidebar_position: 3
title: Mappings
description: IMapping interface, input/output handler usage, audit logging
---

```

`../interfaces.md`:
```yaml
---
sidebar_position: 4
title: Interfaces
description: Workflow source code interfaces and graph visualization
---

```

- [ ] **Step 4: Normalize admonitions**

```bash
for f in docs/components/functions/*.md docs/components/{mappings,interfaces}.md \
         i18n/en/docusaurus-plugin-content-docs/current/components/functions/*.md \
         i18n/en/docusaurus-plugin-content-docs/current/components/{mappings,interfaces}.md; do
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
npm run build 2>&1 | tail -15
```
Expected: `[SUCCESS]`.

---

### Task 6: How-To — Error Handling, Instance Filtering, View Selection

**Files:**
- Create: `docs/how-to/error-handling.md` (from `doc/tr/flow/error-boundary.md`)
- Create: `docs/how-to/instance-filtering.md` (from `doc/tr/flow/instance-filtering.md`)
- Create: `docs/how-to/view-selection.md` (from `doc/tr/flow/rule-based-view-selection.md`)
- Create: EN mirrors

- [ ] **Step 1: Copy TR + EN sources**

```bash
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/error-boundary.md             docs/how-to/error-handling.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/instance-filtering.md         docs/how-to/instance-filtering.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/flow/rule-based-view-selection.md  docs/how-to/view-selection.md

EN_HOW=i18n/en/docusaurus-plugin-content-docs/current/how-to
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/error-boundary.md             $EN_HOW/error-handling.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/instance-filtering.md         $EN_HOW/instance-filtering.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/flow/rule-based-view-selection.md  $EN_HOW/view-selection.md
```

- [ ] **Step 2: Add frontmatter (TR + EN)**

TR `error-handling.md`:
```yaml
---
sidebar_position: 1
title: Hata Yönetimi
description: Error boundary, exception handling ve recovery mekanizmaları
---

```

TR `instance-filtering.md`:
```yaml
---
sidebar_position: 2
title: Instance Filtering
description: Instance sorgulama, filtreleme kriterleri, query pattern'ları
---

```

TR `view-selection.md`:
```yaml
---
sidebar_position: 3
title: View Selection
description: Kurala dayalı view seçimi ve conditional rendering
---

```

EN `error-handling.md`:
```yaml
---
sidebar_position: 1
title: Error Handling
description: Error boundary, exception handling, and recovery mechanisms
---

```

EN `instance-filtering.md`:
```yaml
---
sidebar_position: 2
title: Instance Filtering
description: Instance querying, filtering criteria, query patterns
---

```

EN `view-selection.md`:
```yaml
---
sidebar_position: 3
title: View Selection
description: Rule-based view selection and conditional rendering
---

```

- [ ] **Step 3: Normalize admonitions**

```bash
for f in docs/how-to/*.md i18n/en/docusaurus-plugin-content-docs/current/how-to/*.md; do
  sed -i '' -E \
    -e 's/^:::highlight green.*$/:::tip/' \
    -e 's/^:::highlight red.*$/:::danger/' \
    -e 's/^:::highlight yellow.*$/:::warning/' \
    -e 's/^:::highlight blue.*$/:::info/' \
    -e 's/^:::highlight [a-z]+.*$/:::note/' \
    "$f"
done
```

- [ ] **Step 4: Build verification**

```bash
npm run build 2>&1 | tail -15
```
Expected: `[SUCCESS]`.

---

### Task 7: Services — Init-Service

**Files:**
- Create: `docs/services/init-service.md` (from `doc/tr/services/init-service.md`)
- Create: `i18n/en/.../services/init-service.md`

- [ ] **Step 1: Copy TR + EN source**

```bash
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/tr/services/init-service.md \
   docs/services/init-service.md
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/en/services/init-service.md \
   i18n/en/docusaurus-plugin-content-docs/current/services/init-service.md
```

- [ ] **Step 2: Add TR frontmatter**

Prepend to `docs/services/init-service.md`:
```yaml
---
sidebar_position: 1
title: Init Service
description: Package deployment, NPM registry entegrasyonu, component dağıtımı
---

```

- [ ] **Step 3: Add EN frontmatter**

Prepend to `i18n/en/.../services/init-service.md`:
```yaml
---
sidebar_position: 1
title: Init Service
description: Package deployment, NPM registry integration, component distribution
---

```

- [ ] **Step 4: Normalize admonitions**

```bash
for f in docs/services/init-service.md i18n/en/docusaurus-plugin-content-docs/current/services/init-service.md; do
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
npm run build 2>&1 | tail -15
```
Expected: `[SUCCESS]`.

---

### Task 8: API Reference — IMapping

**Files:**
- Create: `docs/api-reference/i-mapping.md`
- Create: `i18n/en/.../api-reference/i-mapping.md`

Kaynak: `vnext-runtime/doc/src/IMapping.cs`. Manuel olarak C# XML doc comment'leri ve code'u Markdown'a aktarıyoruz. İnterface public API contract'ı olduğu için **en yüksek doğruluk** gereklidir.

- [ ] **Step 1: Read source C# file**

```bash
cat /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/src/IMapping.cs
```

- [ ] **Step 2: Create `docs/api-reference/i-mapping.md` (TR)**

```markdown
---
sidebar_position: 2
title: IMapping
description: Task input/output data binding interface; custom mapping logic
---

# IMapping

Workflow task execution sırasında **input ve output data binding** için temel interface. Task yürütmeden önce ve sonra veri dönüşümü yapma, doğrulama ve audit logging imkanı sağlar.

## Namespace

```csharp
namespace BBT.Workflow.Scripting;
```

## Definition

```csharp
public interface IMapping
{
    Task<ScriptResponse> InputHandler(ScriptContext context);
    Task<ScriptResponse> OutputHandler(ScriptContext context);
}
```

## Members

### InputHandler(ScriptContext context)

Task yürütülmeden önce çağrılır. Input verisini hazırlar, dönüştürür, audit kaydı oluşturur.

**Parameters:**
- `context: ScriptContext` — workflow context, instance data, task metadata

**Returns:** `Task<ScriptResponse>` — transformed input + audit data

### OutputHandler(ScriptContext context)

Task yürütüldükten sonra çağrılır. Output verisini final response'a dönüştürür.

**Parameters:**
- `context: ScriptContext` — task execution result, workflow context

**Returns:** `Task<ScriptResponse>` — transformed output

## Extension Points

1. **Data Transformation** — pre/post execution data shaping
2. **Validation** — input/output validation, business rules
3. **Audit Logging** — execution trail, compliance records

## İlgili

- [`IConditionMapping`](./i-condition-mapping) — auto-transition condition'ları için
- [`IOutputHandler`](./i-output-handler) — function output için
- [`Models`](./models) — `ScriptResponse`, `StandardTaskResponse` tanımları
- [Mappings (kavramsal)](../components/mappings)

## Kaynak

C# kaynak dosyası: `vnext-runtime/doc/src/IMapping.cs`
```

*Not: Yukarıdaki içerik, C# XML doc comment'lerinden distil edilmiştir. Step 1'de kaynak dosya okunup gerçek method signature'ları ve XML doc detayları bu template'e işlenir.*

- [ ] **Step 3: Create EN mirror**

```markdown
---
sidebar_position: 2
title: IMapping
description: Task input/output data binding interface; custom mapping logic
---

# IMapping

The primary interface for **task input and output data binding** during workflow execution. Enables data transformation, validation, and audit logging before and after task execution.

## Namespace

```csharp
namespace BBT.Workflow.Scripting;
```

## Definition

```csharp
public interface IMapping
{
    Task<ScriptResponse> InputHandler(ScriptContext context);
    Task<ScriptResponse> OutputHandler(ScriptContext context);
}
```

## Members

### InputHandler(ScriptContext context)

Called before task execution. Prepares and transforms input data, generates audit records.

**Parameters:**
- `context: ScriptContext` — workflow context, instance data, task metadata

**Returns:** `Task<ScriptResponse>` — transformed input + audit data

### OutputHandler(ScriptContext context)

Called after task execution. Transforms output data into the final response.

**Parameters:**
- `context: ScriptContext` — task execution result, workflow context

**Returns:** `Task<ScriptResponse>` — transformed output

## Extension Points

1. **Data Transformation** — pre/post execution data shaping
2. **Validation** — input/output validation, business rules
3. **Audit Logging** — execution trail, compliance records

## Related

- [`IConditionMapping`](./i-condition-mapping) — for auto-transition conditions
- [`IOutputHandler`](./i-output-handler) — for function outputs
- [`Models`](./models) — `ScriptResponse`, `StandardTaskResponse` definitions
- [Mappings (conceptual)](../components/mappings)

## Source

C# source: `vnext-runtime/doc/src/IMapping.cs`
```

- [ ] **Step 4: Build verification**

```bash
npm run build 2>&1 | tail -15
```
Expected: `[SUCCESS]`.

---

### Task 9: API Reference — Remaining 7 Files

Aynı Task 8 pattern'ı, her dosya için tekrar. **Sidebar position'lar**: i-condition-mapping=3, i-output-handler=4, i-sub-flow-mapping=5, i-sub-process-mapping=6, i-timer-mapping=7, i-transition-mapping=8, models=9.

- [ ] **Step 1: IConditionMapping**

Kaynak: `vnext-runtime/doc/src/IConditionMapping.cs`. Oku, `docs/api-reference/i-condition-mapping.md` ve EN mirror'ını Task 8 Step 2-3 pattern'iyle oluştur. Başlık: "IConditionMapping — auto-transition koşul mantığı". Definition:

```csharp
public interface IConditionMapping
{
    Task<bool> Handler(ScriptContext context);
}
```

Member: `Handler(context) → Task<bool>` — transition koşulunu değerlendirir, true ise transition tetiklenir.

- [ ] **Step 2: IOutputHandler**

Kaynak: `IOutputHandler.cs`. Oluştur `docs/api-reference/i-output-handler.md`. Definition:

```csharp
public interface IOutputHandler
{
    Task<dynamic> Handler(ScriptContext context);
}
```

Member: `Handler(context) → Task<dynamic>` — function sonucunu final response body'sine map eder.

- [ ] **Step 3: ISubFlowMapping**

Kaynak: `ISubFlowMapping.cs`. Definition:

```csharp
public interface ISubFlowMapping
{
    Task<ScriptResponse> InputHandler(ScriptContext context);
    Task<ScriptResponse> OutputHandler(ScriptContext context);
}
```

`InputHandler`: parent'tan subflow'a input; `OutputHandler`: subflow tamamlandığında sonucu parent'a merge. IMapping'e benzer ama subflow context'inde.

- [ ] **Step 4: ISubProcessMapping**

Kaynak: `ISubProcessMapping.cs`. Definition:

```csharp
public interface ISubProcessMapping
{
    Task<ScriptResponse> InputHandler(ScriptContext context);
}
```

**Sadece InputHandler** — subprocess fire-and-forget pattern (sonucu bekleme yok).

- [ ] **Step 5: ITimerMapping**

Kaynak: `ITimerMapping.cs`. Definition:

```csharp
public interface ITimerMapping
{
    Task<TimerSchedule> Handler(ScriptContext context);
}
```

`TimerSchedule` döndüren method: DateTime / Cron / Duration / Immediate schedule tiplerinden birini seçer.

- [ ] **Step 6: ITransitionMapping**

Kaynak: `ITransitionMapping.cs`. Definition:

```csharp
public interface ITransitionMapping
{
    Task<ScriptResponse> Handler(ScriptContext context);
}
```

Dynamic routing, transition data processing. Transition sırasında custom logic çalıştırmak için.

- [ ] **Step 7: Models**

Kaynak: `Models.cs`. Oluştur `docs/api-reference/models.md`. İki ana model:

```csharp
public class ScriptResponse
{
    public string Key { get; set; }
    public object Data { get; set; }
    public Dictionary<string, string> Headers { get; set; }
    public Dictionary<string, object> RouteValues { get; set; }
    public List<string> Tags { get; set; }
}

public class StandardTaskResponse
{
    public object Data { get; set; }
    public int StatusCode { get; set; }
    public Dictionary<string, string> Headers { get; set; }
}
```

Her alan için kısa açıklama ekle. Models sidebar_position=9.

- [ ] **Step 8: Build verification after each of Steps 1-7**

Her API reference dosyası ekledikten sonra `npm run build` çalıştır. Büyük patlama olmasın diye her file'dan sonra build check.

```bash
npm run build 2>&1 | tail -10
```
Expected: `[SUCCESS]`.

---

### Task 10: Image Migration

Kaynak dosyalarda `![alt](./img/something.png)` veya `![alt](../img/something.svg)` tarzı image referansları olabilir. Bu görsellerin `vnext-docs/static/img/` altına kopyalanması ve markdown link'lerinin güncellenmesi gerekir.

- [ ] **Step 1: Find all image references in migrated files**

```bash
grep -rn -E '!\[[^]]*\]\([^)]+\.(png|jpg|jpeg|svg|gif))' docs/ i18n/en/docusaurus-plugin-content-docs/current/ 2>/dev/null | head -30
```
Expected: image referans'larının listesi (veya boş liste — kaynakta image yoksa).

- [ ] **Step 2: Locate source images**

```bash
find /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc -type f \( -name '*.png' -o -name '*.jpg' -o -name '*.svg' -o -name '*.gif' \)
```

- [ ] **Step 3: Copy source images to vnext-docs/static/img/docs/**

```bash
mkdir -p static/img/docs
cp /Users/U0B006/Documents/repos/burgan-tech/vnext-runtime/doc/img/*.{png,svg,jpg,jpeg,gif} static/img/docs/ 2>/dev/null || echo "No images found"
```

- [ ] **Step 4: Update image references in migrated files**

Step 1'in çıktısı baz alınarak, her image referansı için `sed` ile link güncelle. Generic pattern:

```bash
# Örnek: [../img/architecture.png] → [/img/docs/architecture.png]
for f in $(find docs i18n/en/docusaurus-plugin-content-docs/current -name '*.md'); do
  sed -i '' -E 's|\.\./img/|/img/docs/|g; s|\./img/|/img/docs/|g' "$f"
done
```

*Not: Docusaurus'ta `/img/...` path'i `static/img/...`'e resolve olur (baseUrl relative).*

- [ ] **Step 5: Build verification**

```bash
npm run build 2>&1 | tail -15
```
Expected: `[SUCCESS]`. 404 image warning olursa o image ya yanlış path ya da kaynakta yok.

---

### Task 11: Internal Link Audit + Repair

Migration sırasında dosya adları değişti (örn. `flow.md` → `workflow.md`), klasör yapısı değişti (örn. `flow/` → `concepts/`, `components/`, `how-to/`). Kaynak dosyalardaki `[text](./other.md)` veya `[text](../flow/x.md)` linkleri artık kırık. Ayrıca bazı link'ler Phase 2 target'larına (fundamentals/principles) işaret ediyor — onlar için TODO marker bırakılır.

- [ ] **Step 1: Run full build to catch broken links**

```bash
npm run build 2>&1 | grep -E "Broken|ERROR|WARN" | head -30
```

- [ ] **Step 2: Collect all markdown link targets**

```bash
grep -rn -E '\[[^]]+\]\([^)h][^)]*\.md[^)]*\)' docs/ i18n/en/docusaurus-plugin-content-docs/current/ 2>/dev/null | head -40
```

- [ ] **Step 3: Build rewrite map**

Aşağıdaki rename kurallarını uygula (ilk eşleşen kazanır):

| Eski (kaynak yapısı) | Yeni (Phase 1 yapısı) |
|---|---|
| `./flow.md` veya `../flow/flow.md` | `../concepts/workflow` |
| `./state.md` | `../concepts/states` |
| `./transition.md` | `../concepts/transitions` |
| `./schema.md` | `../concepts/schema` |
| `./view.md` | `../concepts/views` |
| `./extension.md` | `../concepts/extensions` |
| `./task.md` veya `../flow/task.md` | `../components/tasks/` |
| `./tasks/http-task.md` | `./http` (eğer aynı klasördeyse) veya `../components/tasks/http` |
| `./tasks/{task}-task.md` | `./{task}` veya `../components/tasks/{task}` |
| `./function.md` | `../components/functions/built-in` |
| `./custom-function.md` | `../components/functions/custom` |
| `./mapping.md` | `../components/mappings` |
| `./interface.md` | `../components/interfaces` |
| `./error-boundary.md` | `../how-to/error-handling` |
| `./instance-filtering.md` | `../how-to/instance-filtering` |
| `./rule-based-view-selection.md` | `../how-to/view-selection` |
| `../fundamentals/*.md` veya `./fundamentals/*` | **TODO-Phase-2** — italicize and add note |
| `../principles/*.md` veya `./principles/*` | **TODO-Phase-2** — italicize and add note |

- [ ] **Step 4: Apply rename rewrites**

Phase 1 scope'daki rename'ler için bash one-liner:

```bash
for f in $(find docs i18n/en/docusaurus-plugin-content-docs/current -name '*.md'); do
  sed -i '' -E \
    -e 's|\./flow\.md|../concepts/workflow|g' \
    -e 's|\.\./flow/flow\.md|../concepts/workflow|g' \
    -e 's|\./state\.md|../concepts/states|g' \
    -e 's|\./transition\.md|../concepts/transitions|g' \
    -e 's|\./schema\.md|../concepts/schema|g' \
    -e 's|\./view\.md|../concepts/views|g' \
    -e 's|\./extension\.md|../concepts/extensions|g' \
    -e 's|\.\./flow/function\.md|../components/functions/built-in|g' \
    -e 's|\./function\.md|../components/functions/built-in|g' \
    -e 's|\./custom-function\.md|../components/functions/custom|g' \
    -e 's|\./mapping\.md|../components/mappings|g' \
    -e 's|\./interface\.md|../components/interfaces|g' \
    -e 's|\./error-boundary\.md|../how-to/error-handling|g' \
    -e 's|\./instance-filtering\.md|../how-to/instance-filtering|g' \
    -e 's|\./rule-based-view-selection\.md|../how-to/view-selection|g' \
    -e 's|\./tasks/([a-z-]+)-task\.md|../components/tasks/\1|g' \
    -e 's|\.\./flow/tasks/([a-z-]+)-task\.md|../components/tasks/\1|g' \
    "$f"
done
```

- [ ] **Step 5: Handle Phase 2 targets — convert to italicized TODO**

```bash
for f in $(find docs i18n/en/docusaurus-plugin-content-docs/current -name '*.md'); do
  # Fundamentals Phase 2 target: [text](../fundamentals/domain-topology.md) → *text (coming in Phase 2)*
  sed -i '' -E 's|\[([^]]+)\]\(\.\.?/fundamentals/[^)]+\)|*\1 (Phase 2)*|g' "$f"
  sed -i '' -E 's|\[([^]]+)\]\(\.\.?/principles/[^)]+\)|*\1 (Phase 2)*|g' "$f"
done
```

- [ ] **Step 6: Build — expect it to pass**

```bash
npm run build 2>&1 | tail -20
```
Expected: `[SUCCESS]`. Broken link warnings kalsa bile build pass etmeli (`onBrokenMarkdownLinks: 'warn'`). `onBrokenLinks: 'throw'` tetiklenirse o kritik bir route link bozulmuş demektir — manuel incele ve düzelt.

- [ ] **Step 7: If onBrokenLinks throws — iterate**

Build'in fail ettiği her broken link için:
1. Hata mesajındaki kaynak dosya + bozuk link'e git
2. Yeni hedef'i belirle (yukarıdaki tablo + Phase 1 yapısı)
3. Manual olarak `Edit` ile düzelt
4. Yeniden build

---

### Task 12: Sidebar Customization + Final Verification

Autogenerated sidebar şu ana kadar yeterliydi ama Phase 1 sonunda kategori başlıklarını (label) i18n'e taşımak + manuel düzenlemek daha iyi. YAGNI — autogenerated yeterli ise dokunma. Sadece final verification + start server.

- [ ] **Step 1: Regenerate i18n theme strings (yeni kategori label'ları için)**

```bash
npm run write-translations -- --locale en --override
```

Bu komut mevcut i18n JSON'larını overwrite ederek yeni kategori label'larını alır. **Yeni EN translation eklemeyi atlar**: sadece yeni keys eklenir, mevcutları kaybetmez (`--override` default'u: new keys only).

- [ ] **Step 2: Final clean build**

```bash
rm -rf build .docusaurus
npm run build 2>&1 | tail -20
```
Expected: `[SUCCESS] Generated static files in "build"` VE `[SUCCESS] Generated static files in "build/en"`. Warning olabilir — ERROR olmamalı.

- [ ] **Step 3: Start dev server and visually verify**

```bash
npm run start
```
Tarayıcıda `http://localhost:3000/vnext-docs/`:
- Landing page 4 persona kartı OK
- Technical kartına tıkla → `/docs/intro` açılır
- Sidebar'da 6 ana kategori görünür: Getting Started, Concepts, Components, How-To, Services, API Reference
- Her kategoriye tıklayıp içerisinde ≥1 sayfa olduğunu kontrol et
- 5 random sayfa aç, içerik yüklendiğini ve kırık link olmadığını doğrula (Mermaid diyagram varsa o da görünmeli)
- Locale dropdown'dan EN'e geç — aynı yapı EN'de görünür

Ctrl+C ile durdur.

- [ ] **Step 4: Update Phase 0 plan status / Phase 2 hazırlığı**

Phase 1 içerik migrasyonu tamamlandı. Sıradaki adım: **Phase 2 — Architecture migration**. Bu Phase 2 için ayrı bir `writing-plans` çağrısı yapılacak.

---

## Verification Summary (Phase 1 Exit Criteria)

- ✅ `docs/` altında 6 kategori: getting-started, concepts, components, how-to, services, api-reference
- ✅ Toplam 31 TR markdown + 31 EN markdown (her biri frontmatter'lı, admonitionlar normalize)
- ✅ `npm run build` hatasız, sadece beklenen "Phase 2 TODO" markdown warning'leri
- ✅ Developer, `docs/intro` → `getting-started/local-dev` → ... → `how-to/error-handling` yolculuğunu yapabiliyor
- ✅ 8 API reference page yayında (IMapping ailesi + Models)
- ✅ Autogenerated sidebar Phase 1'de yeterli; custom sidebar (opsiyonel) Phase 2+'a bırakıldı

## Out of Scope (Phase 2+)

- `doc/tr/fundamentals/` + `doc/en/fundamentals/` → Phase 2 Architecture
- `doc/tr/principles/` + `doc/en/principles/` → Phase 2 Architecture
- README "Platform Architecture" + "Core Principles" → Phase 2 Architecture
- Release notes migration → Phase 3 Blog
- Business + Product içerik → Phase 4/5
- DocFX otomatik C# API reference → Phase 6
