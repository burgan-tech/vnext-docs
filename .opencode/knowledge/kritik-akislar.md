# vnext-docs — Kritik Akışlar (en sık aranan vNext konuları → hangi doküman)

Bu dosya, `vnext-docs` sitesinde **en sık sorulan vNext konularının authoritative dokümanının
nerede olduğunu** uçtan uca (giriş bölümü → sayfa → ilişkili sayfalar → dış implementasyon
kaynağı) `dosya:satır` kanıtıyla verir. Buradaki "akış" bir kod yolu değil, **bir konuyu
dokümanda bulma yoludur**. Her akış kendi başına bağımsızdır. Not: dokümante edilen davranışın
gerçek implementasyonu dış repolardadır (özellikle `burgan-tech/vnext`) — doküman drift edebilir.

---

## 1. "Workflow nedir / bir workflow nasıl tanımlanır" (bileşen modeli)
- **Ana sayfa:** `docs/components/workflow.md` — Workflow'un platformdaki ana **definable unit**
  olduğunu ve JSON tanımlanıp `vnext-schema` ile doğrulandığını söyler (`docs/components/workflow.md:9`).
  Kanonik şema dış repoda: `vnext-schema/workflow-definition.schema.json` (`docs/components/workflow.md:11`).
- **Bölüm girişi:** Technical sidebar → "Workflow" kategorisi (`sidebars.ts:37-78`): workflow +
  Tasks + Functions + mappings + mapping-component + interfaces + extension + schema + view +
  urn-catalog. Yol haritası `docs/intro.md:16`.
- **İlişkili bileşen sayfaları** (hepsi `docs/components/` altında, dosya varlığı doğrulandı):
  `tasks/index.md`, `functions/index.md`, `schema.md`, `view.md`, `extension.md`, `mappings.md`,
  `interfaces.md`, `urn-catalog.md`.
- **DIŞ UÇ:** workflow tanımının gerçek şeması `burgan-tech/vnext-schema`, çalışan örnekleri
  `burgan-tech/vnext-example`, motor davranışı `burgan-tech/vnext` reposundadır → DURDU.

## 2. "Task türleri / dış sistem entegrasyonu (HTTP, Dapr)"
- **Bölüm girişi:** Technical sidebar → Workflow → "Tasks" alt kategorisi (`sidebars.ts:44-60`);
  giriş sayfası `docs/components/tasks/index.md`.
- **Task türü sayfaları** (`sidebars.ts:48-59`, tümü `docs/components/tasks/` altında):
  `http.md`, `soap.md`, `script.md`, `trigger.md`, `get-instances.md`, `notification.md`,
  `dapr-service.md`, `dapr-pubsub.md`, `dapr-binding.md`, `dapr-http-endpoint.md`.
- **Kavramsal karşılık:** glossary "Görev (Task)" → workflow step'te çalışan işlem birimi
  (`business/glossary/index.md:175-183`); "Entegrasyon" → HTTP/DaprService/DaprPubSub Task
  (`business/glossary/index.md:141-149`); "Olay (Event)" → Dapr pub/sub
  (`business/glossary/index.md:232-240`).
- **DIŞ UÇ:** her task türünün çalışan `.csx`/JSON örneği `vnext-example`; Dapr davranışı motor
  reposunda → DURDU: implementasyon dış repoda.

## 3. "Pseudo UI / View konsepti (kullanıcıya gösterilen ekran nasıl tanımlanır)"
- **Bölüm girişi:** Technical sidebar → Practical Guides → "Pseudo UI (View Concept)" alt
  kategorisi (`sidebars.ts:96-107`); giriş `docs/how-to/view-consept/index.md` (`id: giris`,
  `docs/how-to/view-consept/index.md:2`).
- **Alt sayfalar** (dikkat: sidebar id ≠ dosya adı — bkz. bilinen-tuzaklar):
  - Tasarımcı Rehberi → `docs/how-to/view-consept/designer-guide.md` (`id: tasarimci-rehberi`, `:2`)
  - View Yapısı → `.../view-structure.md` (`id: view-yapisi`)
  - Schema Tanımı → `.../schema-definition.md` (`id: schema-tanimi`)
  - Data Akışı → `.../data-flow.md` (`id: data-akisi`)
  - Aksiyonlar → `.../aksiyonlar.md`
- **Bileşen referansı:** `docs/components/view.md` (View component). Glossary "Görünüm (View)" →
  UI render tanımı (`business/glossary/index.md:318-326`).
- **DIŞ UÇ:** view'ı render eden gerçek renderer/istemci (örn. Flutter tarafı) bu repoda değil.

## 4. "Sürümde ne değişti / breaking change / migration" (release notes)
- **Güncel sürümler:** `blog/` — en yeni yazı `blog/2026-06-29-v0-0-66.md` (Release v0.0.66;
  frontmatter `slug: release-v0-0-66`, `:1-7`). Yazılar vNext issue'larını linkler
  (örn. `github.com/burgan-tech/vnext/issues/722`, `blog/2026-06-29-v0-0-66.md` gövdesi).
- **Eski sürümler:** `blog-archive/` (`/blog/archive`, `docusaurus.config.ts:99-104`) —
  v0.0.13…v0.0.44-50 aralığı.
- **Kırıcı değişiklikler:** `blog-breaking-changes/` (`/blog/breaking-changes`,
  `docusaurus.config.ts:114-119`).
- **Migration rehberleri:** `blog-migration/` (`/blog/migration`, `docusaurus.config.ts:129-134`);
  eski `/blog/v0055-neler-degisti` yolu buraya redirect'lenir (`docusaurus.config.ts:147-152`).
- **Navbar erişimi:** "Release Notes" dropdown → Latest/Archive/Breaking/Migration
  (`docusaurus.config.ts:223-232`). Aktif duyuru bar'ı announcementBar'da (`:201-208`).
- **DIŞ UÇ:** her release'in kod değişikliği `burgan-tech/vnext` issue/PR'larında; component
  schema sürümü (örn. 0.0.48) `vnext-schema`'da → DURDU.

## 5. "Mimari: domain topolojisi, veri katmanı, versiyonlama"
- **Bölüm girişi:** Architecture sidebar (`sidebars-architecture.ts:4-40`); giriş `architecture/intro.md`.
- **Sayfalar:** Domain Model topolojisi `architecture/domain-model/topology.md`; veri katmanı
  `architecture/data/database.md` + `architecture/data/persistence.md`; desenler
  `architecture/patterns/references.md` + `architecture/patterns/versioning.md`; çekirdek prensipler
  `architecture/overview/principles.md`.
- **Kavramsal karşılıklar (glossary):** "Domain" → izole runtime+db+messaging
  (`business/glossary/index.md:99-107`); "ETag" → optimistic concurrency
  (`business/glossary/index.md:151-159`); "Versiyon" → semantic versioning
  (`business/glossary/index.md:308-316`); host adları: Orchestration API =
  `BBT.Workflow.Orchestration.HttpApi.Host` (`:259`), Execution API =
  `BBT.Workflow.Execution.HttpApi.Host` (`:138`), Inbox/Outbox = `BBT.Workflow.Workers.Inbox/Outbox`
  (`:194`).
- **NOT / ORPHAN:** `architecture/runtime/index.md` ve `architecture/infrastructure/observability.md`
  dosyaları vardır ama `sidebars-architecture.ts`'de LİSTELİ DEĞİLDİR (navigasyonda görünmez;
  URL'den erişilir). Konu ararken sidebar'a güvenip bu sayfaları atlama (bkz. bilinen-tuzaklar).
- **DIŞ UÇ:** gerçek veritabanı şeması, runtime host'ları ve altyapı `burgan-tech/vnext` /
  `vnext-runtime` reposundadır → DURDU: implementasyon dış repoda.
