# vnext-docs Platform — Design Spec

- **Tarih**: 2026-04-24
- **Durum**: Draft (user review bekleniyor)
- **Sahip**: Proje sahibi (tayfun.yilmaz2@hotmail.com)
- **Kapsam**: vnext platformu için yeni, bağımsız bir dokümantasyon platformu tasarımı

---

## 1. Bağlam (Context)

vnext platformunun teknik ve business dokümanları şu anda `vnext-runtime` repo'su içinde dağınık bir şekilde duruyor:

- `doc/en/` + `doc/tr/` — 30 dosya, iki dilli ama senkronizasyonu belirsiz
- `release/` — 21 release notes dosyası (v0.0.13 → v0.0.43)
- `README.md` + `README.tr.md` — setup, multi-domain, platform architecture karışık (~33KB her biri)
- `doc/src/*.cs` — 7 C# interface dosyası (API reference kaynağı)
- `ai-docs/` — AI tooling context (kapsam dışı, gitignore'da)

Dokümanlar **üç farklı kullanıcı kitlesine** (Technical / Business / Product Manager) hitap edecek şekilde yeniden yapılandırılacak, ve **GitHub Pages üzerinden** yayınlanacak bir dokümantasyon platformuna taşınacak.

## 2. Hedefler (Goals)

- Teknik, mimari, business ve product dokümantasyonu için **tek bir kanonik platform**
- Her kullanıcı kitlesi (developer, architect, business lead, PM) kendi ilgi alanında **hızlıca navigasyon** yapabilsin
- TR birincil dil, EN ikincil olarak desteklensin
- Mevcut emek **çöpe gitmesin** — restructure edilerek evergreen'e damıtılsın
- Phase phase ilerlesin; her phase bağımsız değer üretsin
- GitHub Pages üzerinden **sıfır-maliyet** hosting

## 3. Non-Goals (Bu spec'te kapsam dışı)

- DocFX / otomatik C# → API doc pipeline (Phase 1'de manuel; otomasyon sonra)
- Figma embed / interactive diagrams
- **Versioning** (evergreen tercih edildi — vnext-runtime release'leri ile docs versiyonlanmayacak)
- `ai-docs/` klasörü içeriği
- PDF export / offline docs
- Auth / private docs
- vnext-runtime repo'sunda **otomatik temizlik** (kullanıcı manuel yapacak — bkz. Constraint C-2)

## 4. Constraints

- **C-1 (Repo strategy)**: Dokümantasyon **yeni, ayrı bir `vnext-docs` repo**'sunda yaşayacak. vnext-runtime sadece local dev (docker/compose) için kalacak.
- **C-2 (Read-only source)**: vnext-runtime'daki kaynak doküman klasörleri (`doc/`, `release/`, `README.md`, `doc/src/`) bu proje boyunca **yalnızca okunacak**. Silme, taşıma veya değiştirme yapılmayacak. Kullanıcı, migrasyon tamamlandıktan sonra manuel temizleyecek.
- **C-3 (AI-docs exclusion)**: `ai-docs/` klasörü AI tool context amaçlı kullanıldığı için migrasyon kapsamı dışındadır.
- **C-4 (Language baseline)**: Tüm içerik TR primary olarak yazılır. EN, çeviri olarak eklenir; eksikse Docusaurus fallback ile TR gösterilir.
- **C-5 (Tooling baseline)**: Docusaurus (multi-instance docs modu) kullanılacak; başka bir SSG değerlendirmesi kapsam dışı.

## 5. Kararlar (Decisions)

| # | Karar | Gerekçe |
|---|---|---|
| D-1 | Ayrı repo: `vnext-docs` | Dokümantasyon bağımsız evrim geçirir; runtime sadece dev env olarak kalır |
| D-2 | Docusaurus (multi-instance docs) | 3+ persona için native destek; mature i18n; React ekosistemi |
| D-3 | TR primary + EN fallback | İç ekip native TR; EN partner/external için kademeli |
| D-4 | 4 docs instance + blog | Technical / Architecture / Business / Product ayrı sidebar'lar; Blog release notes için |
| D-5 | Evergreen (no versioning) | Runtime versiyonuna bağlı değil; her sayfa her zaman güncel |
| D-6 | Restructure & Distill migration | Mevcut emeği koru, yeni yapıya yeniden organize et |
| D-7 | Phase-based delivery (6 phase) | Her phase bağımsız değer; erken feedback |

## 6. Information Architecture

### 6.1 Üst seviye yapı

```
vnext-docs/
├── docs/                    (Technical — default instance)
├── architecture/            (Architecture instance — cross-persona)
├── business/                (Business instance)
├── product/                 (Product instance)
├── blog/                    (release notes)
└── i18n/en/                 (EN mirror)
```

### 6.2 Instance bazında detay

**Technical** (`/docs`) — hedef: developer
- `getting-started/` — local dev kurulum, multi-domain, ilk workflow
- `concepts/` — workflow, state, transition, flow, schema, mapping
- `components/` — task types, mappings, views, extensions
- `services/` — orchestration, execution, workers (inbox/outbox), init-service
- `how-to/` — start instance, error boundary, instance filtering, custom function
- `api-reference/` — IMapping, IConditionMapping, ISubFlowMapping, ISubProcessMapping, ITimerMapping, ITransitionMapping, IOutputHandler

**Architecture** (`/architecture`) — hedef: architect / CTO / senior engineer (cross-persona)
- `overview/` — platform high-level component diagram
- `domain-model/` — multi-domain, bounded contexts, core/discovery/sales
- `runtime/` — orchestration ↔ execution ↔ worker-inbox ↔ worker-outbox flow
- `data/` — DB topology, persistence patterns, ETag concurrency, semantic versioning
- `infrastructure/` — Docker Compose, Dapr service mesh, Vault, Redis, PostgreSQL
- `patterns/` — dual-write, event sourcing, replication, CQRS
- `decisions/` — ADR (Architecture Decision Records)

**Business** (`/business`) — hedef: business lead / stakeholder
- `manifesto/` — platform vizyonu, prensipler
- `capabilities/` — platformun yetenekleri (use-case framing)
- `industries/` — bankacılık workflow örnekleri, senaryolar
- `value/` — ROI, time-to-market, agility
- `glossary/` — business ↔ technical term mapping

**Product** (`/product`) — hedef: product manager
- `overview/` — ürün konumlandırma
- `features/` — feature catalog (PM-level depth; Technical'a linkler)
- `roadmap/` — phased capabilities
- `personas-journeys/` — kim ne kullanıyor, nasıl
- `release-strategy/` — semantic versioning narrative, release cadence

**Blog** (`/blog`) — hedef: tüm kitleler
- Release notes (migrate from vnext-runtime/release/)
- Feature duyuruları
- Tarih + sürüm frontmatter

## 7. Migration Strategy — "Restructure & Distill"

| Kaynak (vnext-runtime) | Hedef (vnext-docs) | Yöntem |
|---|---|---|
| `doc/en/` + `doc/tr/` (30 dosya) | Technical + Architecture (split) | Restructure, kategori yeniden dağıt, consolidate |
| `README.md` — "Platform Architecture" + "Core Principles" bölümleri | `architecture/overview/` | Distill |
| `README.md` — "Multi-Domain Support", "Port Allocation", "Environment Configuration" | `docs/getting-started/multi-domain.md` | Topical page olarak ayır |
| `README.md` — "Running Multiple Domains", Makefile komutları | `docs/getting-started/local-dev.md` | Topical page |
| `README.tr.md` | TR mirror olarak yukarıdakiyle eşleş | Paralel migrate |
| `doc/src/*.cs` (7 dosya) | `docs/api-reference/` | Manuel migrate; her interface için ayrı .md sayfası |
| `release/*.md` (21 dosya) | `blog/` | Her biri ayrı post, tarih + sürüm frontmatter |
| `ai-docs/` | — | **Kapsam dışı** (C-3) |

**Distillation kuralı**: Release notes içindeki kalıcı feature açıklamaları (örn. v0.0.43'teki "Runtime Instance Subscription") → Technical/Architecture'daki kalıcı sayfaya konulur, blog post oraya link verir. **Çift yazım yok**.

## 8. Phase Plan

### Phase 0 — Foundation *(~1 hafta)*
**Kapsam**: Docusaurus scaffold; 4 instance konfigürasyonu; i18n (TR primary, EN fallback); GitHub Actions → GitHub Pages deploy pipeline; base tema, navbar, footer; her instance için placeholder sayfası; `CONTRIBUTING.md` ve PR template.

**Exit criteria**:
- `https://burgan-tech.github.io/vnext-docs/` (veya eşdeğer GitHub Pages URL'i) canlı (placeholder içerikle)
- 4 instance'ın tümü navigable, dil toggle çalışıyor
- CI: PR açıldığında preview build, merge'de auto-deploy

### Phase 1 — Technical Migration *(~2-3 hafta)*
**Kapsam**:
- `doc/en/` + `doc/tr/` içeriğini Technical instance'a restructure ederek taşı (kategori yeniden dağıtımı: fundamentals/principles içerikleri Phase 2'ye)
- `README` teknik bölümleri (multi-domain, Docker, Makefile) → `docs/getting-started/`
- `doc/src/*.cs` → `docs/api-reference/` (manuel migrate, TypeScript-benzeri syntax highlight)
- Internal link düzeltmeleri, image path migration

**Exit criteria**:
- Bir developer, sıfırdan local dev kurulumundan ilk workflow instance'ı başlatmaya kadar Technical instance üzerinden ilerleyebiliyor
- 7 API reference sayfası (IMapping, IConditionMapping vs.) yayında
- TR sayfalarının tamamı; EN için kritik sayfalar (getting-started, core concepts) migre

### Phase 2 — Architecture *(~1-2 hafta)*
**Kapsam**:
- `doc/fundamentals/` + `doc/principles/` → Architecture instance
- `README` "Platform Architecture" + "Core Principles" → `architecture/overview/`
- Infrastructure sayfası (Docker Compose topolojisi, Dapr, Vault, Redis, Postgres) yeni yazım
- Runtime flow diagram (orchestration ↔ execution ↔ workers)
- ADR iskeleti (boş `decisions/` klasörü + template; gerçek ADR'lar organic olarak eklenir)

**Exit criteria**:
- Bir architect, "bu platform neyden oluşuyor, nasıl çalışıyor" sorusunu Architecture instance üzerinden cevaplayabiliyor
- Infrastructure ve runtime için görsel diyagramlar (Mermaid) yayında

### Phase 3 — Blog (Release Notes) *(~3 gün)*
**Kapsam**:
- `release/*.md` (21 dosya) → Blog post'a dönüştür
- Her post için: tarih, sürüm, tags (feature|fix|breaking) frontmatter
- Kalıcı feature içeriklerini Technical/Architecture'daki sayfalara cross-link

**Exit criteria**:
- Tüm release notes blog'da yayında, chronological sidebar çalışıyor
- En az 3 release note'dan Technical/Architecture sayfasına cross-reference verildi

### Phase 4 — Business *(~2-3 hafta, yoğun yeni yazım)*
**Kapsam**:
- Manifesto (vizyon, prensipler) — yeni yazım, README'den tohum
- Capabilities (platform neler yapabiliyor — use-case framing) — yeni yazım
- Industries (bankacılık workflow örnekleri) — yeni yazım
- Value proposition (ROI, time-to-market) — yeni yazım
- Glossary (business ↔ technical term mapping) — yeni yazım

**Ön-gereksinim**: OQ-2 netleşmeli (yazarları kim?)

**Exit criteria**:
- Business lead / ürün yöneticisi tarafından review edilmiş
- Technical jargon olmadan platformu anlatabiliyor

### Phase 5 — Product *(~2-3 hafta, tamamen yeni)*
**Kapsam**: Vision, feature catalog, roadmap, personas & journeys, release strategy narrative.

**Ön-gereksinim**: PM'lerden birebir input (roadmap, personas)

**Exit criteria**:
- PM tarafından review edilmiş
- Feature catalog Technical/api-reference'a cross-link içeriyor

### Phase 6 — Polish & Scale *(~1 hafta, opsiyonel)*
**Kapsam**:
- Algolia DocSearch başvurusu ve entegrasyonu *(ya da local search fallback — OQ-1)*
- Analytics (Plausible / GA4)
- Custom diagram components (Mermaid / D2 / Excalidraw embed)
- Custom domain (ör. `docs.vnext.burgan.tech`) — OQ-3
- Performance audit, SEO, Open Graph

## 9. Open Questions

| # | Soru | Ne zaman cevaplanmalı | Sahip |
|---|---|---|---|
| OQ-1 | Algolia DocSearch başvurusu mu, local search mi? | Phase 6 başında | Proje sahibi |
| OQ-2 | Business + Product içeriğini kim yazacak? | Phase 4 başında | Proje sahibi |
| OQ-3 | Custom domain istenirse DNS erişimi var mı? | Phase 6 başında | Proje sahibi |

## 10. Risk & Mitigation

| Risk | Etki | Mitigation |
|---|---|---|
| EN çeviri yükü phase phase biriker | Sürdürülemez çift bakım | TR primary + fallback stratejisi; EN "priority page" listesi; kritik olmayan sayfalar EN-skip |
| Business / Product için yazar bulunamazsa | Phase 4-5 tıkanır | OQ-2 erken çözülür; gerekirse Phase 4-5 ayrı brainstorm'a döner |
| Mevcut doc'taki image path'leri breaks | Görselsiz sayfalar | Phase 1'de image'lar da migrate edilir, build-time link check |
| GitHub Pages rate/size limits | Site yavaşlar / deploy hataları | Static asset CDN opsiyonu Phase 6'da değerlendirilir |

## 11. İlerleme Sırası

Bu spec onaylandıktan sonra, her phase için **ayrı bir implementation plan** yazılacak (`writing-plans` skill ile). İlk plan Phase 0 (Foundation) için olacak — bu plan onaylanıp tamamlandığında Phase 1 planlanır, ve böyle devam eder.

Her phase sonunda mini retrospektif: sonraki phase için IA, kategorizasyon veya migration kurallarında ayar gerekirse bu spec güncellenir.
