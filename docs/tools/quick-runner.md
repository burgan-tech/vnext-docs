---
sidebar_position: 4
title: Flow Quick Runner
description: Forge Quick Run ile workflow instance'larını başlatma, transition tetikleme, state view render'ı ve instance inceleme
---

# Flow Quick Runner

Quick Runner, workflow'larınızı **çalışan bir environment üzerinde** anlık test etmenizi sağlayan Forge modülüdür: instance başlatır, transition tetikler, aktif state'in view'ını render eder ve instance verisini (data, history, correlations, raw) canlı izler.

Açmanın iki yolu:

- Explorer'da `Workflows/` altındaki bir workflow JSON'ına sağ tık → **Open Quick Run**
- Command Palette → **Forge: Quick Run** → listeden workflow seçin

Bu sayfadaki örnekler `core/money-transfer` (Para Transferi) akışıyla, aktif bir **Local (core)** environment üzerinde alınmıştır.

## Ana Ekran

![Quick Runner ana ekran — numaralandırılmış](/img/tools/forge/quick-run-overview-annotated.png)

| # | Bölge | Amacı |
|---|-------|-------|
| 1 | **+ New Run** | Yeni instance başlatma diyaloğunu (Start Flow Run) açar. |
| 2 | **Headers** | Tüm isteklere eklenen global header'ları yönetir (ör. kimlik/tenant header'ları). Settings panelindeki *Quick Run → Global Headers* ayarının karşılığıdır. |
| 3 | **Brand JSON** | Tenant marka/stil yapılandırması — pseudo-ui render'ının kurum temasıyla görünmesini sağlar. |
| 4 | **Flow Instances başlığı** | Filtre panelini açan filtre ikonu ve listeyi elle yenileyen refresh ikonu. |
| 5 | **Filter & Sort** | Instance alanına veya `attributes.*` alanlarına göre filtre tanımlama, sıralama ölçütü (Created At) ve yönü; **Apply/Clear**. |
| 6 | **Instance listesi** | **ACTIVE** (canlı izlenen) ve **RECENT** instance'lar. Her satırda kısa instance ID, güncel state ve oluşturulma zamanı; sağda durum rozeti: **A** (Active, mavi), **C** (Completed, yeşil), **F** (Faulted, kırmızı). |
| 7 | **Instance kimliği** | Workflow etiketi (aktif dilde), durum rozeti, environment, instance ID (kopyala + ⓘ **Instance Details** modalı), başlangıç zamanı ve step göstergesi (ör. *Transfer Bilgileri `INITIAL` — Step 1 of 3*). |
| 8 | **Status kartı** | Instance durumu; **Cancel** (instance'ı iptal eder) ve **Retry State** (mevcut state'i yeniden çalıştırır — hatalı state'lerde kullanışlıdır). |
| 9 | **Trace headers** | `X-Trace-Id` ve diğer yanıt header'ları (**Show N more headers**). Trace ID, runtime loglarıyla eşleştirme için birebirdir. |
| 10 | **Available Transitions** | Güncel state'ten çıkan transition'lar, tetikleme tipine göre gruplu: **STATE** (instance'ı ilerletir — ör. *Devam Et*) ve **CANCEL** (ör. *cancel-transfer*). **+ Manual** ile listede olmayan bir transition adı elle tetiklenebilir. Butona tıklamak Fire Transition diyaloğunu açar. |
| 11 | **Functions** | Workflow'a bağlı function'ları seçip **Open** ile [Function Quick Runner](#function-quick-runner)'da açar. |
| 12 | **View Data / History** | Sağ paneldeki Data ve History sekmelerine hızlı erişim. |
| 13 | **State View** | Aktif state'in view'ı: view key'i, içerik tipi (**Json**) ve renderer (**pseudo-ui**) rozetleri, dil seçimi (**TR/EN/+**) ve **Preview / JSON** anahtarı. |
| 14 | **Instance paneli** | **Data / History / Correlations / Raw** sekmeleri (aşağıda). |

## Instance Başlatma (Start Instance)

**+ New Run** → **Start Flow Run** diyaloğu:

![Start Flow Run diyaloğu](/img/tools/forge/quick-run-new-run.png)

- **Instance Key** — instance'ın anahtarı; **Generate** ile GUID üretilir.
- **Stage / Tags** — instance'ı etiketlemek için opsiyonel alanlar.
- **Synchronous execution** — senkron çalıştırma; yanıt, akış ilk bekleyen state'e ulaşana kadar döner.
- **Version** — hedef workflow sürümü (varsayılan `latest`).
- **Headers** — bu çalıştırmaya özel ek header'lar.
- **Attributes (JSON)** — başlangıç verisi. Workflow'un start transition'ına şema bağlıysa form olarak; değilse (*No start schema attached — manual edit only*) JSON editörü olarak gelir. **Preset/Save** ile payload'ları kaydedip yeniden kullanabilirsiniz; **Auto-Fix** JSON hatalarını düzeltir.
- **Update saved config** işaretliyse girilen değerler bir sonraki çalıştırma için saklanır.

**Start Run** instance'ı başlatır; instance listeye düşer ve detay paneli açılır.

## Transition Tetikleme (Fire Transition)

**Available Transitions** altındaki bir butona tıklayınca transition diyaloğu açılır:

![Fire Transition diyaloğu — şemadan üretilmiş payload](/img/tools/forge/quick-run-fire-transition.png)

- Transition'a şema bağlıysa payload **form olarak** gelir (alan tipleri, zorunluluk işaretleri ve select'lerle); **Switch to JSON** ile ham JSON'a geçilebilir.
- **✨ Generate** şemadan örnek payload üretir — hızlı test için birebir (yukarıdaki ekranda alanlar Generate ile doldurulmuştur).
- **Clear / Paste / Preset / Save** — payload'ı temizleme, panodan yapıştırma, kayıtlı preset'leri kullanma.
- **Fire Transition** transition'ı tetikler.

Tetikleme sonrası panel **long poll** ile kendini günceller: step göstergesi ve state adı ilerler, yeni state'in transition'ları gelir (örnekte *Devam Et* → *Onayla*), State View yeni view'ı render eder ve History'ye kayıt düşer.

## State View — pseudo-ui Render

Aktif state'in view'ı **Preview** modunda gerçek bir form/ekran olarak render edilir — ancak bu yalnızca view'ın renderer'ı **`pseudo-ui`** olduğunda mümkündür:

![State View — pseudo-ui render (input formu)](/img/tools/forge/quick-run-state-view.png)

- **TR / EN / +** — view'ın `labels` tanımındaki diller arasında geçiş; **+** yeni dil önizlemesi ekler.
- **Preview / JSON** — render ile ham view JSON'u arasında geçiş.
- Renderer pseudo-ui **değilse** (özel bir front-end vocabulary kullanılıyorsa) Forge görsel render üretemez; yalnızca **JSON** sekmesindeki içerik gösterilir.
- State'e bağlı view yoksa (Raw yanıtındaki `view.hasView: false`) State View bölümü boş kalır.

Transition sonrası aynı bölüm yeni state'in view'ını yükler — örnekte özet/onay ekranı:

![State View — transition sonrası özet ekranı](/img/tools/forge/quick-run-summary-view.png)

## Data / History / Correlations / Raw

Sağ paneldeki dört sekme instance'ın farklı kesitlerini gösterir:

- **Data** — instance data'sının JSON ağacı (workflow'un o ana kadar biriktirdiği veri).
- **History** — her transition'ın kaydı: transition adı, süresi, `kaynak state → hedef state`, tetikleme tipi (`manual`, `auto`, …) ve zamanı.

![History — transition kayıtları](/img/tools/forge/quick-run-history.png)

- **Correlations** — instance'ın aktif correlation bağları (event/subflow ilişkileri); yoksa *No active correlations*.
- **Raw** — runtime'ın döndürdüğü **STATE RESPONSE**'un tamamı: `data` / `view` / `master` function href'leri, `state`, `stateType`, `status`, `activeCorrelations` ve mevcut `transitions[]` dizisi (her transition'ın `kind` ve view bilgileriyle). Hata ayıklamada başvurulacak birincil kaynaktır.

![Raw — STATE RESPONSE](/img/tools/forge/quick-run-raw.png)

## Instance Details Modalı

Instance ID'nin yanındaki **ⓘ** ikonu ayrıntı modalını açar:

![Instance Details modalı](/img/tools/forge/quick-run-instance-details.png)

- **Key** ve **Flow Version** — instance'ın çalıştığı workflow sürümü, deploy edilen paket sürümüyle birlikte (ör. `1.0.0-pkg.0.0.20+core`).
- **State** — Current/Effective State, Status, State Type ve Sub-Type.
- **Audit** — Created At / Modified At.

## Long Poll ve Canlı İzleme

Quick Runner, aktif instance'ları **long poll** ile izler: transition tetiklendiğinde veya arka planda otomatik transition'lar çalıştığında ekran (state, transitions, State View, History) elle yenilemeye gerek kalmadan güncellenir. Yoklama davranışı **Forge Tools → Settings → Quick Run** altındaki **Retry Count** ve **Interval (ms)** ayarlarıyla yönetilir.

Alt durum çubuğu her an güncel bağlamı gösterir: aktif environment, `domain/workflow`, güncel **State** ve sağda **N instances active** sayacı.

## Function Quick Runner

Function'ları tek başına çalıştırıp test etmek için ayrı bir panel vardır. Açma yolları:

- `Functions/` altındaki function JSON'ına sağ tık → **Open Function Quick Run**
- Command Palette → **Forge: Function Quick Run** → listeden function seçin
- Quick Run instance detayındaki **Functions** bölümünden (instance bağlamıyla)

![Function Quick Runner — get-branches-func](/img/tools/forge/function-quick-run.png)

- Üst çubukta **HTTP verb** seçimi, function **endpoint**'i (`/api/v1/{domain}/functions/{key}`), **Headers** ve **Send**.
- **Params / Headers** sekmeleri — her isteğe eklenen query parametreleri (**Add param**) ve header'lar; **Table/Raw** iki görünüm sunar.
- **INPUT VIEW** — function'a bağlı input view'ın render'ı (pseudo-ui ise Preview).

**Send** isteği atar ve yanıt bölümü açılır:

![Function Quick Runner — yanıt](/img/tools/forge/function-quick-run-response.png)

- Durum satırı: **HTTP status**, süre, boyut, content-type ve **trace** ID (runtime loglarına gitmek için kopyalayın).
- **Body / Headers** sekmeleri — ham yanıt gövdesi ve header'lar.
- **OUTPUT VIEW** — function'ın output handler view'ı varsa render edilir.
- Hata durumunda runtime `application/problem+json` döner (yukarıdaki örnekte backend bağımlılığı kapalı olduğu için **500**); trace ID ile [runtime loglarından](/docs/getting-started/forge-setup#5-environment-ekleyin) ayrıntıya inilir.

## İlgili Sayfalar

- [Forge Kullanım Kılavuzu](./forge-usage) — Forge Tools panelleri, context menüler, tasarımcılar
- [Geliştirme Ortamı Kurulumu (Forge)](/docs/getting-started/forge-setup) — environment ekleme ve yönetimi
- [Functions](/docs/components/functions/) — function bileşeni referansı
- [Pseudo UI Rehberi](/docs/how-to/view-consept) — view render vocabulary'si
