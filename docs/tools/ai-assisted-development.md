---
sidebar_position: 5
title: AI Destekli Geliştirme
description: vNext AI Toolkit — vNext domain'i geliştiren ürün ekipleri için bileşenleri schema-first ve agent-güdümlü biçimde üreten, test eden ve denetleyen resmi Claude Code plugin'inin kurulumu, kullanımı ve komut setleri
---

# AI Destekli Geliştirme

**vNext AI Toolkit**, vNext workflow-domain bileşenlerini (`schema`, `workflow`, `task`, `view`, `function`, `extension`, `mapping`) AI yardımıyla üretmek için geliştirilmiş resmi bir **Claude Code plugin**'idir. Bir isteği analiz eder, tasarlar, JSON'unu yazar, doğrular, güvenlik incelemesinden geçirir ve dökümante eder; ardından entegrasyon testlerini uçtan uca koşturur ve domain'i runtime maliyeti açısından denetler — hepsi proje içinde, rehberli bir akışla.

> Plugin kaynağı: [`burgan-tech/vnext-ai-toolkit`](https://github.com/burgan-tech/vnext-ai-toolkit) · Kapsam: vNext runtime **0.0.100** / schema **0.0.56** (toolkit 0.0.8)

:::info[Kimin için?]
Toolkit, **vNext domain'i geliştiren ürün ekipleri** içindir. Bu ekipler kendi domain repolarında çalışır; vNext runtime, `vnext-schema`, `vnext-docs` ve `vnext-example` repolarına yazma yetkileri yoktur. Toolkit bu repoları yalnızca **okur**: `vnext-meta`'yı vnext `master`'dan canlı okur, çevrimdışıyken içindeki anlık görüntüye (snapshot) düşer. Sorun domain'de değil runtime'daysa, onu [`/vnext-ai-toolkit:report-issue`](#runtime-hatası-bildirme-report-issue) ile — onayınızdan sonra — `burgan-tech/vnext` üzerinde bir issue'ya dönüştürür.
:::

## Amaç

vNext platformunda bir domain, her biri bir JSON Schema'ya göre doğrulanan JSON bileşen dosyalarından oluşur. Bunları elle yazmak; çapraz referansları takip etmeyi, enum değerlerini doğru vermeyi, `.csx` mapping dosyalarını doğru C# arayüzlerine göre yazmayı ve her değişikliği `npm run validate`'ten geçirmeyi gerektirir. Toolkit, bu işi domain projeniz içinde **rehberli, agent-güdümlü** bir akışa dönüştürür.

:::tip[Schema-first yaklaşım]
Toolkit'in en temel kuralı: **hardcoded enum yok, varsayılan zorunlu alan yok, tahmini JSON yapısı yok.** Her bileşen, projenizin `package.json`'ında sabitlenmiş (`pinned`) [`@burgan-tech/vnext-schema`](https://github.com/burgan-tech/vnext-schema) içindeki JSON Schema'lara göre yazılır — varsayıma göre değil.
:::

Plugin şunları getirir:

- **Sekiz agent** — bir build pipeline'ı oluşturan yedi agent (`analyst → architect → component-author → validator → security-reviewer + doc-writer`, ayrıca PR kontrolü için `reviewer`) ve uçtan uca tasarım orkestratörü `vnext-architect`.
- **On dört skill** — bir şemsiye referans skill'i (`authoring-vnext-components`) ve on üç odaklı yazım, test ve inceleme skill'i.
- **On bir slash command** — giriş noktaları olarak `vnext-init`, `vnext-update`, `new-component`, `vnext-design-process`, `validate`, `review-components`, `build`, `e2e`, `security-audit`, `domain-check`, `report-issue`.

## Neden?

| Elle yazım | vNext AI Toolkit ile |
|------------|----------------------|
| Bileşen path'leri tahmin edilir, yanlış klasöre yazılır | Path'ler `vnext.config.json`'dan çözülür (domain-agnostic) |
| Enum/zorunlu alanlar uydurulur, validation'dan geçmez | Bileşenler pinned schema'ya göre, **ilk seferde** `npm run validate`'ten geçecek şekilde yazılır |
| `.csx` mapping'lerde double-wrap / yanlış kontrat hataları tekrarlar | `authoring-vnext-components` skill'i doğru `.csx` kontratını dayatır |
| Güvenlik ve dokümantasyon manuel/atlanır | Pipeline'da `security-reviewer` + `doc-writer` otomatik çalışır |
| Güncel olmayan eğitim verisinden çalışılır | Pinned schema → canlı `vnext-meta` → Context7 → vnext-docs sırasıyla güncel kaynak sorgulanır |
| Runtime hatası belirsiz bir mesajla iletilir | `report-issue` önce triage yapar, kanıt toplar, sırları maskeler ve onayla issue açar |

## Önkoşullar

Plugin, bir **vNext domain projesinin içinde** çalışır:

- **Claude Code** kurulu olmalı.
- Kökte **`vnext.config.json`** bulunan, [`@burgan-tech/vnext-template`](https://github.com/burgan-tech)'ten oluşturulmuş bir domain projesi.
- `node_modules` içinde sabitlenmiş **`@burgan-tech/vnext-schema`**.

Henüz bir projeniz yoksa, `/vnext-ai-toolkit:vnext-init` komutu temel projeyi (template üzerinden) ve toolkit dosyalarını sizin için kurar. Sıfırdan proje oluşturmak için ayrıca bkz. [Template CLI](./template-cli).

## Kurulum

Marketplace üzerinden kurun:

```bash
claude plugin marketplace add burgan-tech/vnext-ai-toolkit
claude plugin install vnext-ai-toolkit@burgan-tech
```

Daha sonra güncellemek için:

```bash
claude plugin marketplace update burgan-tech
```

Geliştirme amaçlı doğrudan klonlamak isterseniz:

```bash
git clone https://github.com/burgan-tech/vnext-ai-toolkit.git ~/.claude/plugins/vnext-ai-toolkit
```

## Hızlı Başlangıç

```bash
# 1. Workspace'i kur veya tazele. vnext.config.json yoksa temel projeyi
#    @burgan-tech/vnext-template ile iskeleler, ardından toolkit dosyalarını
#    (docker-compose + MockLab, CLAUDE.md, entegrasyon testleri ...) ekler.
#    Üzerine yazmadan önce diff gösterir.
claude /vnext-ai-toolkit:vnext-init

# 2a. Tek bir bileşeni agent pipeline'ı üzerinden uçtan uca iskeleler
#     (analyst → architect → component-author → validator, sonra security-reviewer + doc-writer)
claude /vnext-ai-toolkit:new-component workflow account-opening "Yeni vadesiz hesap aç"

# 2b. ...veya tüm bir workflow'u architect orkestratörü ile uçtan uca tasarla
claude /vnext-ai-toolkit:vnext-design-process "Hesap açılışı"

# 3. Her şeyi doğrula (ve hataları düzeltmeyi öner)
claude /vnext-ai-toolkit:validate

# 4. Domain paketini build et
claude /vnext-ai-toolkit:build
```

## Komut Setleri

Plugin on bir slash command sunar; hepsi `/vnext-ai-toolkit:` namespace'i altındadır.

| Komut | Ne yapar |
|-------|----------|
| `/vnext-ai-toolkit:vnext-init` | Workspace'i kurar veya tazeler. `vnext.config.json` yoksa temel projeyi `@burgan-tech/vnext-template` (npx) ile iskeler, sonra toolkit dosyalarını (docker-compose + MockLab, `CLAUDE.md`/`AGENTS.md`, `.claude/references`, entegrasyon testleri) ekler — üzerine yazmadan önce **diff** gösterir. `runtimeVersion`/`schemaVersion` yükseltmeyi önerir ve workspace'e toolkit versiyonunu damgalar (`.claude/vnext-toolkit.json`). |
| `/vnext-ai-toolkit:vnext-update [--force]` | Plugin güncellemesinden sonra toolkit'e ait dosyaları tazeler: workspace damgasını kurulu plugin versiyonuyla, `runtimeVersion`'ı toolkit'in bildiği runtime'la karşılaştırır, her dosyayı diff'leyip onay ister. |
| `/vnext-ai-toolkit:new-component <type> <key> [desc]` | Bir bileşeni agent pipeline'ı üzerinden uçtan uca iskeler. `<type>` ∈ `schema \| workflow \| task \| view \| function \| extension \| mapping`. |
| `/vnext-ai-toolkit:vnext-design-process [name]` | `vnext-architect` orkestratörü ile çok-turlu, uçtan uca workflow tasarımı (discovery → state'ler → bileşenler → testler). |
| `/vnext-ai-toolkit:validate` | `npm run validate` çalıştırır, hataları dosya bazında ihlal edilen schema kuralıyla özetler ve düzeltmeyi önerir. |
| `/vnext-ai-toolkit:review-components [type\|key]` | Mevcut bileşenleri hiyerarşik `reviewer` + `security-reviewer` alt-agent'larıyla denetler (workflow/function başına bir ana agent, alt bileşenler için alt-agent'lar). |
| `/vnext-ai-toolkit:build [runtime\|reference] [flags]` | Domain paketini `npm run build` / `build:reference` ile derler. |
| `/vnext-ai-toolkit:e2e [workflow\|--all]` | Entegrasyon testlerini uçtan uca koşturur — varsayılan olarak `runtimeVersion`'a sabitlenmiş Testcontainers ile. Bkz. [aşağısı](#uçtan-uca-test-e2e). |
| `/vnext-ai-toolkit:security-audit [scope]` | Dört fazlı OWASP tarzı güvenlik incelemesi (recon → hunt → verify → report); bulguları güven puanı ve CWE/OWASP referanslarıyla `security-report/SECURITY-REPORT.md`'ye yazar. |
| `/vnext-ai-toolkit:domain-check [root] [--config f]` | Salt-okunur runtime maliyeti denetimi; triage sonrası Türkçe rapor. Bkz. [aşağısı](#runtime-maliyeti-denetimi-domain-check). |
| `/vnext-ai-toolkit:report-issue [kısa açıklama]` | Şüpheli bir runtime sorununu triage eder, maskelenmiş İngilizce bir issue taslağı hazırlar ve onayınızdan sonra `burgan-tech/vnext` üzerinde açar. Bkz. [aşağısı](#runtime-hatası-bildirme-report-issue). |

Her komut, workspace'teki toolkit dosyaları plugin'den eskiyse bunu bir kez söyler ve `/vnext-ai-toolkit:vnext-update` önerir; bu kontrol hiçbir zaman engellemez.

### Uçtan uca test (`e2e`)

`/vnext-ai-toolkit:e2e`, `e2e-local` skill'ini çalıştırır:

- **Varsayılan mod:** Testcontainers, image `vnext.config.json`'daki `runtimeVersion`'a sabitlenir.
- **Lokal runtime:** Komut, zaten çalışan bir lokal vNext runtime'ınız olup olmadığını **sorar**; varsa port'unu sorar (varsayılan 4201), `/health` ve `domain` eşleşmesini kontrol eder ve `test.runsettings.local` dosyasını yalnızca onayınızla yazar.
- **Akış:** preflight → `npm run validate` + `dotnet build` → workflow başına `dotnet test` → her kırmızı testin ortam / fixture / domain / runtime olarak triage'ı. Runtime kaynaklı hatalarda `report-issue` önerilir. Sonuç `TEST-SCENARIOS.md`'ye bir satır ve `.claude/vnext-e2e.json` damgası olarak kaydedilir.
- **Kapsam beklentisi:** Her workflow'un bir entegrasyon testi olması beklenir. Eksik testler validator, reviewer, `review-components` ve `workflow-scaffold` tarafından **uyarı** olarak raporlanır — hiçbir komutu engellemez.

### Runtime maliyeti denetimi (`domain-check`)

`/vnext-ai-toolkit:domain-check`, domain paketini runtime maliyeti ve kullanılmayan runtime yetenekleri açısından inceler (CacheAside, GetInstances, error-boundary Retry, `P` vs `S`, aynı sıradaki paralellik, function scope, `history: none`, `x-indexed` …). Schema doğrulaması (`validate`), kural/referans incelemesi (`review-components`) veya OWASP (`security-audit`) ile karışmaz.

- **Salt-okunur:** bileşenleri düzenlemez, commit veya push yapmaz.
- Tarayıcı enum etiketlerini (task, trigger, error action, extension type/scope, function scope) projede **sabitlenmiş `@burgan-tech/vnext-schema`**'dan okur; çözülemeyen bir etikete dayanan bulgu üretilmez.
- Her aday bulgu dosyada doğrulanır ve önce sizinle **triage** edilir; ardından `## Yapılmalı` / `## Yapılsa iyi olur` başlıklı, her maddesi bir **Çözüm** satırıyla biten kısa bir **Türkçe** rapor yazılır.

### Runtime hatası bildirme (`report-issue`)

Ürün ekiplerinin runtime reposuna yazma yetkisi olmadığından, runtime kaynaklı sorunlar `/vnext-ai-toolkit:report-issue` ile iletilir:

1. **Triage** — bilinen schema↔runtime farkları, canlı `vnext-meta` known issue / deprecation / migration kayıtları, docs ve domain tarafı nedenler (rol header'ları, `queryRoles`, mapping'ler, schema rolü). Sorun biliniyorsa veya domain'deyse issue açılmaz; workaround ya da düzeltme önerilir.
2. **Duplicate araması** `burgan-tech/vnext` üzerinde.
3. **Kanıt** (versiyonlar, istek/yanıt, `X-Request-Id`, incident'lar) → secret, PII ve iç host'ların **zorunlu maskelenmesi** → İngilizce taslak (`.vnext/issues/` altına).
4. **Onay kapısı** — issue yalnızca açık bir "evet"ten sonra açılır. `gh` yoksa taslak dosyası ve önceden doldurulmuş bir new-issue URL'i verilir.

## Agent Pipeline

`/vnext-ai-toolkit:new-component` agent'ları sırayla orkestre eder; istenirse her biri doğrudan da çağrılabilir.

```mermaid
flowchart LR
    A[analyst] --> B[architect]
    B --> C[component-author]
    C --> D[validator]
    D --> E[security-reviewer]
    D --> F[doc-writer]
    R[reviewer<br/>PR kontrolü]
```

`validator` geçtikten sonra `security-reviewer` ve `doc-writer` **paralel** çalışır — çakışmazlar (doc-writer `docs/` altına yazar, security-reviewer yalnızca okur).

| Agent | Rolü | JSON yazar mı? |
|-------|------|:---:|
| `analyst` | Docs-first. `docs/<Type>/<key>.md`'yi kontrol eder, kapsamı netleştirir, kabul kriterleri ve sıralı görev listesi üretir. | Hayır |
| `architect` | Analizi teknik tasarıma çevirir — klasör yerleşimi, state/transition modeli, task/function bağlantıları, referanslar, export'lar. | Hayır |
| `component-author` | Tasarımı schema-valid bileşen JSON'u ve `.csx` mapping'leri olarak uygular. | **Evet** |
| `validator` | Bağımsız QA — `npm run validate` ve `npm test` çalıştırır, build'i kontrol eder. | Hayır |
| `security-reviewer` | Sızan secret, güvenilmeyen referans host'u, aşırı geniş export, güvensiz task/function/extension config avlar. | Hayır |
| `doc-writer` | `docs/<Type>/<key>.md` (bileşen başına bir dosya) ve `CHANGELOG.md` girdisini yazar/günceller. | Yalnız docs |
| `reviewer` | PR-kontrol rolü — schema uyumu, isim/versiyon kuralları, referans bütünlüğü, config/export doğruluğu. | Hayır |

Bileşen-bazlı pipeline'ın ötesinde, **`vnext-architect`** *tüm bir workflow*'u uçtan uca tasarlamak için çok-turlu bir orkestratördür (`/vnext-ai-toolkit:vnext-design-process` ile çağrılır). Discovery → state machine → bileşenler → testler yolunu yürür ve aşağıdaki skill'lere delege eder.

## Skill'ler

- **`authoring-vnext-components`** — çekirdek referans: ortak bileşen envelope'u, tipe özgü `attributes`, `.csx` `scriptCode` yapısı, transition trigger tipleri ve validate-fix döngüsü. Agent'lar ve komutlar alan kuralları için buna dayanır.
- **`workflow-scaffold`** — state/transition grafiğini planlar; workflow JSON + `.csx` mapping'leri + `.http` test dosyasını iskeler.
- **`view-design`** — renderer seçimi (pseudo-ui önerilir), vocabulary yükleme, view ağacı üretimi.
- **`schema-design`** — önce schema'nın rolünü sorar (`master`/`transition`/`function`/`component`), sonra alanları, lokalizasyonu (`x-labels`), her hassas alan için koruma kararını (`x-roles`/`x-masking`/`x-encryption`), dosya alanlarını (`x-storage`) ve filtrelenen/sıralanan alanlarda `x-indexed`'i toplar; JSON Schema draft 2020-12 üretir.
- **`component-task`** — schema enum'ından sürülen task `type` + tipe özgü `config`, `.csx` mapping, MockLab seed önerisi.
- **`component-function`** — scope `D`/`F`/`I`, tek vs çok task kompozisyonu, `IMapping`/`IOutputHandler` `.csx`.
- **`component-extension`** — performans uyarılarıyla type × scope matrisi.
- **`component-mapping`** — yeniden kullanılabilir `sys-mappings` C# yardımcı bileşenleri; tüketicilere `scripts.helpers` / `allowedAssemblies` veya `encoding: "REF"` ile bağlanır.
- **`integration-test`** — `VNext.Testing.Sdk`'ya karşı xUnit sınıfı (projeyi resmi `VNext.Testing.Template` ile iskeler); workflow yaşam döngüsünü yetkilendirme senaryolarıyla birlikte doğrular. Her workflow için beklenir; eksikliği uyarıdır, engel değildir.
- **`e2e-local`** — entegrasyon testlerini uçtan uca koşturur (`/vnext-ai-toolkit:e2e`).
- **`validate-and-fix`** — `npm run validate` çalıştırır, hataları kategorize eder, uygulamadan önce schema-referanslı düzeltmeler önerir; runtime kaynaklı hatalarda `report-issue` önerir.
- **`security-audit`** — dört fazlı OWASP tarzı güvenlik incelemesi (`/vnext-ai-toolkit:security-audit`).
- **`domain-check`** — salt-okunur runtime maliyeti denetimi (`/vnext-ai-toolkit:domain-check`).
- **`report-runtime-issue`** — runtime hatasını kanıtlı, maskelenmiş bir issue'ya dönüştürür (`/vnext-ai-toolkit:report-issue`).

## Tasarım Felsefesi

### Schema-first

Tek en önemli kural: **hardcoded enum yok, varsayılan zorunlu alan yok, tahmini JSON yapısı yok.** Agent'lar ve skill'ler, bir bileşeni yazmadan/düzenlemeden önce projenizde sabitlenmiş yetkili schema'yı okur:

```
node_modules/@burgan-tech/vnext-schema/schemas/<component>-definition.schema.json
```

Schema veya platform davranışı yerel schema ve mevcut bileşenlerden net değilse, bilgi erişim sırası şudur: **pinned local schema → vnext `master`'dan canlı `vnext-meta` → Context7 MCP** (`/burgan-tech/vnext-docs`, `/burgan-tech/vnext-example`) **→ vnext-docs sitesinin `WebFetch`'i**. Pinned schema ile çelişen bir docs iddiası kazanmaz — **schema kazanır**; çelişki runtime'dan kaynaklanıyorsa `/vnext-ai-toolkit:report-issue`'ya gider.

### Domain-agnostic

Plugin bir domain adı varsaymaz. `domain` ve `paths.*` değerlerini `vnext.config.json`'dan okur ve her bileşen klasörünü oradan çözer. `payments`, `lending`, `core` veya başka bir domain'de aynı şekilde çalışır.

### Schema-driven, schema-validated

Bileşenler `npm run validate`'i ilk seferde geçecek şekilde yazılır — çünkü yazan (author) ve doğrulayan (validator) tek bir doğruluk kaynağını, sabitlenmiş `@burgan-tech/vnext-schema`'yı paylaşır.

## `new-component` sonrası ne elde edersiniz?

`/vnext-ai-toolkit:new-component workflow <key>` sonrası tipik bir workflow için (path'ler `vnext.config.json`'dan çözülür):

- `Workflows/<key>.json` — state machine (zorunlu master payload schema referansıyla)
- `Workflows/.../src/*.csx` — C# mapping'ler (`IMapping`), auto-transition kuralları (`IConditionMapping`), timer'lar (`ITimerMapping`)
- `Workflows/<key>.http` — REST Client probe dosyası
- `Views/<key>-view.json`, `Schemas/<key>.json`, `Tasks/<key>.json`, `Functions/<key>.json`, `Extensions/<key>.json` — tasarımın gerektirdiği destekleyici bileşenler
- `docs/Workflows/<key>.md` — bileşen dokümantasyonu
- bir `CHANGELOG.md` girdisi

Hepsi `npm run validate`'ten geçer.

## Uyumluluk

| AI ajanı | Durum |
|----------|-------|
| Claude Code | Birincil hedef |
| Codex (`AGENTS.md` ile) | Destekleniyor — her `CLAUDE.md`, `AGENTS.md`'ye yansıtılır |
| Cursor (`.cursor/rules/*.mdc`) | Planlanıyor |

Enum değerleri, projenizin `package.json`'ında sabitlediğiniz `@burgan-tech/vnext-schema` versiyonundan okunur — vNext yeni bir state veya task tipi eklediğinde plugin bunu bir sonraki okumada görür. Davranış bilgisi (bir task tipinin ne yaptığı, `updateData` veya `authorize`'ın nasıl çalıştığı) ise toolkit'in bildiği runtime versiyonuna (şu an **0.0.100**) bağlıdır; workspace'iniz farklı bir `runtimeVersion` hedefliyorsa toolkit oturum başında uyarır.

:::tip[Context7 ile güncel bilgi]
Bu docs portalı da Context7'ye kayıtlıdır ([`context7.com/burgan-tech/vnext-docs`](https://context7.com/burgan-tech/vnext-docs)). Böylece AI asistanları bu sayfaları da güncel runtime bilgi kaynağı olarak sorgulayabilir.
:::

:::info[Runtime keşfi için MCP]
Doküman keşfi Context7 ile yapılırken, **canlı runtime ve bileşen keşfi** için ayrı bir [vnext-runtime MCP Server](./mcp-runtime) bulunur — bir domain'in bileşenlerini, instance verisini ve `vnext-meta`'sını MCP ajanlarına açar.
:::

## İlgili

- [`burgan-tech/vnext-ai-toolkit`](https://github.com/burgan-tech/vnext-ai-toolkit) — plugin'in kaynağı
- [`burgan-tech/vnext-example`](https://github.com/burgan-tech/vnext-example) — her bileşen tipinin çalışan örneklerini içeren referans domain
- [`burgan-tech/vnext-schema`](https://github.com/burgan-tech/vnext-schema) — kanonik JSON Schema'lar + vocabulary'ler (plugin'in kontrat kaynağı)
- [`burgan-tech/mocklab`](https://github.com/burgan-tech/mocklab) — HTTP task geliştirmede kullanılan mock API
- [`burgan-tech/vnext-integration-test`](https://github.com/burgan-tech/vnext-integration-test) — entegrasyon test SDK'sı + proje şablonu
- [Template CLI](./template-cli) — domain projesi oluşturma · [Workflow CLI](./workflow-cli) — `npm run validate` ve deploy
- [Workflow bileşeni](../components/workflow) — state machine kontratı
