---
sidebar_position: 3
title: Human Task ve "Bekleyen Onaylarım"
description: Bir onay adımını kullanıcının Bekleyen Onaylarım listesine düşürmek — subType 6, queryRoles, humanTask veri bloğu, kanal bazlı view ve interaction.longPoll yapısı, client akışı
---

# Human Task ve "Bekleyen Onaylarım"

Kendi akışında bir onay adımı olan ve bu onayın kullanıcının **Bekleyen Onaylarım** listesinde görünmesini isteyen akış sahipleri ve bu listeyi tüketen client geliştiricileri için.

Hedeflenen deneyim — tek bir instance, iki farklı kanal:

| Adım | Web (işlemi başlatan) | Mobil (onaylayan) |
|---|---|---|
| Onay bekleniyor | "Onayınız bekleniyor" ekranı | Listeden tıklar → **işlem özeti** + Onayla/Reddet |
| Karar verildi | Akış kaldığı yerden devam eder | **Sonuç sayfası**, ardından dinlemeyi bırakır |

Onay ayrı bir akış değil, **ana akışın kendi state'idir**. İki kanal da aynı `domain + workflow + instanceId` üçlüsünü dinler; ne göreceklerini **rule** belirler.

:::note Ön koşul
Mobil ve web client'ları isteklerinde kanal bilgisi taşımalıdır. Bu rehber `x-channel` başlığını (`web` / `mobile`) varsayar; başlığın adı platforma değil sizin sözleşmenize aittir.
:::

Listenin runtime tarafı (tek tarama, leaf çözümü, cache, sınırlar) için bkz. [Human Task Fonksiyonu](../components/functions/built-in#human-task-fonksiyonu). Bu sayfa akış tasarımı ve client tarafını anlatır.

---

## 1. Onay state'i

```json
{
  "key": "waiting-approval",
  "stateType": 2,
  "subType": 6,
  "queryRoles": [ { "role": "payment.approver", "grant": "allow" } ],
  "views": [ "..." ],
  "interaction": { "longPoll": { "terminate": false } },
  "transitions": [
    { "key": "approve", "target": "approved-next", "triggerType": 0 },
    { "key": "reject",  "target": "rejected-next", "triggerType": 0 }
  ]
}
```

`subType: 6` (Human) bu state'i listeye aday yapan işarettir. Bir görevin listede görünmesi için instance'ın kolonları şu koşulları sağlamalıdır:

| Koşul | Anlamı |
|---|---|
| `Type` ∈ (`R`, `P`) | Kök instance ya da SubProcess çocuğu. Ana akış zaten `R`'dir — koşul kendiliğinden sağlanır |
| `Status` ∈ (`A`, `B`) | Instance canlı (Active ya da Busy) |
| `EffectiveStatus` = `A` | Zincirin en derin aktif seviyesi gerçekten beklemede |
| `EffectiveStateSubType` = `6` | O seviye bir Human state'te |

İptal edilmiş, tamamlanmış ya da fault olmuş bir case listeden kendiliğinden düşer. Onay bir SubFlow çocuğunda bekliyorsa liste **kök instance'ı** döndürür; başlık ve açıklama ise **leaf**'ten (bekleyen çocuktan) okunur.

### `interaction.longPoll.terminate: false` — bu state'te kimse dinlemeyi bırakmaz

`terminate: false` bu state'te **hiçbir client'ın dinlemeyi bırakmaması** gerektiğini açıkça söyler: mobil kullanıcının kararını, web ise sonucu bekliyor. Bu bildirim pipeline'a dokunmaz; duraklatma yalnızca `terminate: true` iken armlanır. `terminate: false` olan bir state'in state yanıtında `interaction` bloğu da bulunmaz (v0.0.95'ten itibaren blok yalnızca bir ack beklenirken üretilir).

:::warning Onay state'ine `rule` koymayın
Etkileşimi `rule` ile bildiren bir state'in gövdesi **paylaşımlı body cache'e yazılmaz** (kuralın girdileri — header, query, instance verisi — cache anahtarının parçası değildir). Onay state'i akışın en uzun ve en sık poll edilen state'idir; buraya konan bir kural gövdeyi her iki kanal için de cache dışına çıkarır. Kuralsız bildirim default-allow'dur: aynı direktif herkese gider ve cache korunur. Kural yalnızca karar sonrası state'te gereklidir (bkz. [§5](#5-karar-sonrası-sonuç-sayfası--dinlemeyi-durdurma)), çünkü verdict orada gerçekten kanala göre değişir.
:::

---

## 2. `queryRoles` — yazılmazsa görev listede hiç görünmez

En sık yapılan hata budur ve **hata vermez**, liste sadece kısa gelir. Runtime `HumanTaskQueryRolesUndeclared` (EventId 20459) log'u düşer ve leaf sessizce atlanır.

```json
"queryRoles": [
  { "role": "payment.approver", "grant": "allow" }
]
```

Bu, "bu görevden ben sorumlu muyum?" sorusunu yanıtlayan **tek** kapıdır. Platformun geri kalanında boş bir grant kümesi "izin ver" demektir; burada "gösterme" demektir — bir görev listesi, kural yazılmamış olmasının "herkes görsün" anlamına gelemeyeceği tek okuma yüzeyidir. Değerlendirme sırası: parent'ın damgaladığı `subFlow.overrides.states.<s>.queryRoles` → leaf state'in kendi `queryRoles`'u → leaf workflow'un kök `queryRoles`'u. Çağıranın **tüm rol kümesi** üzerinde `deny` önce ve AND ile, `allow` sonra ve OR ile değerlendirilir (v0.0.94).

Kullanılabilecek grant türleri:

- **Statik rol** — `"payment.approver"`. Onayı hangi rolün yapacağı akışta sabitse en yalın seçenek.
- **Predefined** — `"$InstanceBehalfOfStarter"` (işlem kimin adına başlatıldıysa o kişi; kendi işlemini kendi onaylayan kullanıcı), `"$InstanceStarter"` (işlemi fiilen yapan kişi).
- **Dinamik** — değerin istek bağlamından çözüldüğü durumlar (`$role.$.context.…`, `[*]` dizi yolu desteklenir).

Ayrıntı: [Yetkilendirme → Grant değerlendirme](../concepts/authorization).

---

## 3. Listede görünecek metin — `humanTask` veri bloğu

Liste, başlık ve açıklamayı instance'ın **en son data satırının kökündeki** `humanTask` nesnesinden okur:

```json
{
  "humanTask": {
    "title": "50.000 TL EFT onayı",
    "description": "Ahmet Yılmaz — TR33 0006 ..."
  }
}
```

| Alan | Tip | Açıklama |
|---|---|---|
| `humanTask.title` | string | Liste satırının başlığı |
| `humanTask.description` | string | Liste satırının alt metni |

Kurallar:

- Blok yalnızca **veri kökünde** aranır; başka bir yola gömülü `humanTask` okunmaz.
- Blok yoksa görev **yine listelenir**, ancak `title` ve `description` boş döner. Bu yüzden onay state'ine giren transition'ın mapping'inde bloğu doldurun (ya da state'in `onEntry` görevinde).
- Onay bir SubFlow çocuğunda bekliyorsa blok **çocuğun** verisinden okunur; kök instance'ın verisindeki `humanTask` kullanılmaz.
- Değer her state değişiminde güncellenebilir; liste TTL cache'i (varsayılan 60 sn) nedeniyle yeni değeri o süre içinde göstermeyebilir.

---

## 4. Onay state'inin view'ları — kanal bazlı rule

Aynı state, iki farklı ekran. `views[]` sırayla değerlendirilir, **ilk eşleşen kural kazanır**, kuralsız son giriş fallback'tir.

```json
"views": [
  { "rule": { "location": "./IsMobile.csx", "code": "<base64>" },
    "view": { "key": "payment-approval-summary", "domain": "...", "flow": "...", "version": "1.0.0" } },
  { "view": { "key": "payment-approval-waiting", "domain": "...", "flow": "...", "version": "1.0.0" } }
]
```

Mobil işlem özetini, diğer herkes (web dahil) bekleme ekranını görür.

```csharp title="IsMobile.csx"
// context.Headers DİNAMİK — indeksleyip cast edin; TryGetValue(out var …) dinamik alıcıda derlenmez (CS8197).
using System;
using System.Threading.Tasks;
using BBT.Workflow.Scripting;

public class IsMobile : IConditionMapping
{
    public Task<bool> Handler(ScriptContext context)
    {
        try
        {
            if (context.Headers == null) return Task.FromResult(false);
            string channel = (string)context.Headers["x-channel"];
            return Task.FromResult(channel == "mobile");
        }
        catch (Exception)
        {
            return Task.FromResult(false);
        }
    }
}
```

Bir view kuralı hata verirse loglanır ve **sonraki girdiye geçilir** — istek düşmez, kullanıcı başka bir ekran görür. Bu yüzden kuralları basit ve null-safe yazın ve fallback girdisini mutlaka koyun. View seçimi mekaniğinin tamamı: [Rule-based View Selection](./view-selection).

---

## 5. Karar sonrası: sonuç sayfası + dinlemeyi durdurma

`approve` / `reject` transition'larının girdiği state, mobil için hem **sonuç ekranını** hem de **"artık dinleme" direktifini** taşır.

```json
{
  "key": "approved-next",
  "stateType": 2,
  "views": [
    { "rule": { "location": "./IsMobile.csx", "code": "<base64>" },
      "view": { "key": "approval-success", "domain": "...", "flow": "...", "version": "1.0.0" } },
    { "view": { "key": "payment-processing", "domain": "...", "flow": "...", "version": "1.0.0" } }
  ],
  "interaction": {
    "longPoll": {
      "terminate": true,
      "fallbackTimeoutSeconds": 10,
      "rule": { "location": "./IsMobileInteraction.csx", "code": "<base64>" }
    }
  }
}
```

`reject` hedefi için de aynısı, kendi sonuç view'ıyla.

### `interaction.longPoll` alanları

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `terminate` | boolean | Evet | `true`: state'e girişte `OnEntry` çalıştıktan sonra pipeline **duraklar**, instance `Busy` kalır, ack token'ı armlanır ve fallback zamanlayıcısı kurulur. `false`: duraklama yok, direktif yok |
| `fallbackTimeoutSeconds` | integer ≥ 1 | Hayır | Ack gelmezse pipeline'ın kendiliğinden devam edeceği süre. Varsayılan **60** |
| `roles` | roleGrant[] | `rule` ile birlikte yazılamaz | Direktifi yalnızca bu grant'ları taşıyan çağıran alır ve ack'leyebilir |
| `rule` | scriptCode | `roles` ile birlikte yazılamaz | `IConditionMapping` koşul script'i; `true` dönerse direktif verilir. **Fail-closed** <sup>New</sup> v0.0.94 |

Ne olur:

1. Mobil Onayla'ya basar; pipeline `approved-next`'e girer, `interaction` armlanır ve **duraklar** — instance `Busy` kalır.
2. Mobil state'i çeker; kural mobili kabul ettiği için yanıtta `interaction.terminateLongPoll: true` ve bir `interaction.ack` href'i gelir. Mobil sonuç ekranını basar, polling'i keser ve `ack`'e `POST` atar.
3. Ack ile pipeline kaldığı yerden devam eder; web akışı izlemeye devam eder ve kendi ekranını (`payment-processing`) görür — mobile özel direktifi hiç almaz.

Mekaniğin tamamı (ack, fallback, SubFlow zincirinde kabarcıklanma, parent override'ları): [Workflow → State Interaction (Long Poll)](../components/workflow#state-interaction-long-poll).

### Interaction kuralı view kuralından farklıdır — kopyalamayın

Interaction kuralının context'inde **`context.Body` YOKTUR.** View kuralını kopyalayıp buraya koyarsanız ve içinde `context.Body.*` okuyorsa kural fırlatır ve **reddeder** (fail-closed). Instance verisini `context.Instance.Data` üzerinden okuyun.

```csharp title="IsMobileInteraction.csx"
using System;
using System.Threading.Tasks;
using BBT.Workflow.Scripting;

public class IsMobileInteraction : IConditionMapping
{
    public Task<bool> Handler(ScriptContext context)
    {
        try
        {
            if (context.Headers == null) return Task.FromResult(false);
            return Task.FromResult((string)context.Headers["x-channel"] == "mobile");
        }
        catch (Exception)
        {
            return Task.FromResult(false);
        }
    }
}
```

Diğer kurallar:

- `roles` ile `rule` **birlikte yazılamaz**; validator reddeder. Onaylayan ile başlatan aynı kişi olabildiği için bu senaryoda doğru arm `rule`'dur.
- Tek kural vardır — `views[]` gibi liste ve fallback yoktur.
- `false`, hata ya da derlenmeme → sinyal verilmez, ack `403` döner. Instance yine de asılı kalmaz: fallback zamanlayıcısı pipeline'ı her hâlükârda devam ettirir.
- Ack endpoint'i kurala **yalnızca header'ları** iletir. Ayırt edici bilgi bu yüzden query parametresi değil **header** olmalıdır — aksi hâlde sinyal gelir ama ack reddedilir.
- Ack'in yetki kararı v0.0.95'ten itibaren in-process değil, gateway'in çağırdığı `authorize?ack=true` ile verilir (bkz. [Yetkilendirme](../concepts/authorization)).
- `fallbackTimeoutSeconds` varsayılanı 60. Mobil ack'lemezse (uygulama kapandı, şebeke gitti) ana akış o kadar süre duraklar ve **web de bekler**. Bu senaryoda 5–10 saniye uygundur.

---

## 6. Client akışı (referans)

| Adım | Çağrı |
|---|---|
| Liste | `GET /api/v1/{domain}/functions/human-task` |
| Abonelik (long-poll) | `GET /api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/state` |
| Ekran | `GET /api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/view` |
| Karar | `PATCH /api/v1/{domain}/workflows/{workflow}/instances/{instance}/transitions/{transitionKey}` |
| Durdurma onayı | `POST /api/v1/{domain}/workflows/{workflow}/instances/{instance}/longpoll/ack` |

Her çağrıda kanal başlığı (`x-channel`) gönderilmelidir: transition, state ve ack — üçü de kuralı ayrı ayrı değerlendirir.

### Liste yanıtı

Gövde düz bir JSON dizisidir (zarf yok); en yeni önce sıralanır.

```json
[
  {
    "instanceId": "eft-2026-000123",
    "id": "3f2c9a1e-5b7d-4c1a-9e2f-0a1b2c3d4e5f",
    "workflow": "payment-order",
    "title": "50.000 TL EFT onayı",
    "description": "Ahmet Yılmaz — TR33 0006 ...",
    "createdAt": "2026-09-25T09:12:31Z",
    "vNext": true
  }
]
```

| Alan | Açıklama |
|---|---|
| `instanceId` | İş anahtarı (business key). **Tek başına benzersiz değildir**: SubProcess çocuğu parent'ının anahtarını devralır, aynı case'in iki satırı aynı değeri taşıyabilir |
| `id` | Instance'ın kendi kimliği; her zaman benzersiz. Satırları ayırt etmek ve state/ack çağrılarını adreslemek için bunu kullanın |
| `workflow` | Kök instance'ın workflow anahtarı — state çağrısındaki `{workflow}` |
| `title`, `description` | Leaf'in `humanTask` bloğundan; blok yoksa boş |
| `createdAt` | Kök instance'ın oluşturulma zamanı |
| `vNext` | Sabit `true` (tüketicinin eski platform görevleriyle ayırt etmesi için) |

Yanıt başlıkları: `X-VNext-HumanTask-Truncated: true` liste `ResultCap` (varsayılan 500) ile kırpıldıysa gelir; `X-VNext-Cache-Override` isteğe eklenirse TTL cache atlanır. Flow başına en fazla 200 aday değerlendirilir.

### Client'ın karar sonrası izlemesi gereken sinyal

State yanıtındaki `interaction` bloğu **yalnızca** bir ack beklenirken ve yalnızca kuralı/rolü geçen çağırana gelir:

```json
"interaction": {
  "terminateLongPoll": true,
  "fallbackTimeoutSeconds": 10,
  "ack": { "href": "/api/v1/{domain}/workflows/{workflow}/instances/{instance}/longpoll/ack" }
}
```

Client bu bloğu gördüğünde: sonuç ekranını render eder, polling'i keser ve `ack.href`'e aynı kanal başlığıyla `POST` atar. Bloğu görmeyen client (web) polling'e devam eder.

---

## Kontrol listesi

- [ ] Onay state'i `subType: 6`
- [ ] Onay state'inde **`queryRoles` var**
- [ ] Instance verisinin kökünde `humanTask.title` / `humanTask.description`
- [ ] Onay state'inde kanal bazlı `views` + kuralsız fallback girdisi
- [ ] Onay state'inde `interaction.longPoll.terminate: false` — **kuralsız**
- [ ] `approve` ve `reject` hedeflerinde kanal bazlı sonuç `views`
- [ ] Aynı hedeflerde `interaction.longPoll` — `rule` arm'ı, kısa `fallbackTimeoutSeconds`
- [ ] Interaction kuralı `context.Instance.Data` kullanıyor, `context.Body` değil
- [ ] Client kanal başlığını transition + state + ack çağrılarının hepsinde gönderiyor
- [ ] Client satırları `instanceId` ile değil `id` ile ayırt ediyor

## Sessiz başarısızlıklar

| Belirti | Sebep |
|---|---|
| Görev listede hiç yok | `queryRoles` bildirilmemiş (log 20459) |
| Görev listede hiç yok | Çağıranın rolleri state'in `queryRoles` grant'larıyla eşleşmiyor ya da bir `deny`'a takılıyor |
| Satır var, başlık boş | Veri kökünde `humanTask` bloğu yok |
| Mobilde bekleme ekranı çıkıyor | View kuralı `false` döndü — kanal başlığı gelmiyor olabilir |
| Mobil durmuyor, akışı izlemeye devam ediyor | Interaction kuralı reddetti; sık sebebi `context.Body` okuyan kopyalanmış kural |
| Sinyal geldi ama ack 403 | Ayırt edici bilgi query parametresinde — ack yalnızca header iletir |
| Ana akış onaydan sonra ~1 dk duraksadı | Mobil ack'lemedi, varsayılan `fallbackTimeoutSeconds` (60) bekleniyor |
| Tamamlanan görev listede bir süre daha görünüyor | Liste TTL cache'i (60 sn); `X-VNext-Cache-Override` ile atlanabilir |

## İlgili Konular

- [Human Task Fonksiyonu](../components/functions/built-in#human-task-fonksiyonu) — listenin runtime tarafı, yapılandırma ve header'lar
- [Workflow → State Interaction (Long Poll)](../components/workflow#state-interaction-long-poll) — interaction mekaniği, ack, fallback, SubFlow zinciri
- [SubFlow Overrides](./subflow-overrides) — parent'ın çocuğun long-poll penceresini ve rollerini değiştirmesi
- [Yetkilendirme](../concepts/authorization) — grant türleri ve değerlendirme
- [Rule-based View Selection](./view-selection) — kanal bazlı ekran seçimi
- [Kullanıcı Etkileşimi](../concepts/user-integration) — long-poll döngüsü
