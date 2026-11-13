---
id: resource-lock
title: Kaynak Kilitleme (Resource Lock)
sidebar_label: Kaynak Kilitleme
description: Transition sırasında paylaşılan bir kaynağı dağıtık kilitle koruma
---

# Kaynak Kilitleme (Resource Lock)

Resource Lock, bir transition çalışırken paylaşılan bir kaynağı (koltuk, zaman-slotu, günlük limit, hesap vb.) **birden fazla instance'ın aynı anda değiştirmesini** engelleyen dağıtık kilit mekanizmasıdır. Kilit varsayılan olarak Aether SDK'nın Dapr distributed-lock building block'u (`lock.redis`) üzerinden yönetilir; v0.0.106 ile alternatif olarak bir **Postgres lease** sağlayıcısı da seçilebilir (bkz. [Kilit sağlayıcısı](#kilit-sağlayıcısı)). Kilit, transition tanımına bağlı olarak **opt-in** çalışır.

## Genel Bakış

- Kilit, transition tanımındaki `resourceLock` bloğu ile **isteğe bağlı** olarak devreye girer. `resourceLock` tanımlı olmayan transition'lar bu adımı hiç çalıştırmaz.
- Pipeline'da **order 25** (`ResourceLockStep`) çalışır. Yalnızca **Manual** profilinde aktiftir; AutoChain / Scheduled / Event / ErrorBoundary profillerinde hariç tutulur. Tüm pipeline adımları ve profiller için bkz. [Transition Pipeline](../concepts/transition-pipeline).
- Kilit **sahibi (owner)** her zaman `instanceId`'dir. Yani bir kilit, onu alan instance'a aittir.
- Kilit anahtarı (`key`), her transition'da bir C# script'i (`ITransitionMapping`) çalıştırılarak runtime'da üretilir.
- **Kilit her zaman TTL'e sahiptir** — süresi dolunca otomatik serbest kalır. TTL, terkedilen kilitlere karşı nihai güvenlik ağıdır.

### Çalışma modeli (önerilen)

```
Acquire (check transition)  ──►  ... iş adımları ...  ──►  Terminal state (Success/Error/Cancel)
       │                                                            │
       └─ kilit alınır, key instance'a kaydedilir                  └─ kilit OTOMATİK bırakılır
```

Doğru kullanım: kilidi **giriş (check) transition'ında `Acquire`** ile al; bırakmayı runtime'a devret. Instance terminal duruma (Completed / Faulted / Cancelled) ulaştığında kilit **otomatik olarak** serbest bırakılır — her terminal transition'a manuel `Release` koymana gerek yoktur (bkz. [Otomatik kilit temizliği](#otomatik-kilit-temizliği)).

## Yapılandırma

`resourceLock` bloğu bir transition tanımına eklenir:

```json title="transition (resourceLock ile)"
{
  "key": "check-limit",
  "from": "draft",
  "target": "limit-reserved",
  "triggerType": 0,
  "versionStrategy": "Patch",
  "resourceLock": {
    "keyExpression": {
      "location": "./src/LimitLockKey.csx",
      "code": "<base64/native script>",
      "type": "L",
      "encoding": "NAT"
    },
    "action": "Acquire",
    "ttlSeconds": 300,
    "onConflict": "Abort"
  }
}
```

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|-----------|----------|
| `keyExpression` | ScriptCode (`ITransitionMapping`) | **Evet** | — | Kilit anahtarını üreten script. `Handler(ScriptContext)` bir string döndürmelidir. |
| `action` | `Acquire` \| `Release` \| `Extend` | **Evet** | — | Yapılacak kilit işlemi. |
| `ttlSeconds` | integer | Hayır | `300` | Acquire/Extend için kilidin yaşam süresi (saniye). Korunan işlemin tamamını kapsayacak şekilde boyutlandırılmalıdır. |
| `onConflict` | `Abort` \| `Reject` | Hayır | `Abort` | Kilit alınamadığında politika. `Reject` v0.0.106 / schema 0.0.61 ile gelir. Bkz. [Conflict politikaları](#conflict-politikaları). |

:::note[Publish doğrulaması — v0.0.106]
`Acquire` ve `Extend` için `ttlSeconds` **0'dan büyük** olmalıdır; `ttlSeconds: 0` (veya negatif) publish'te hata verir — süresi baştan dolmuş bir kilit hiçbir şeyi korumaz. `Release` TTL taşımadığı için muaftır.
:::

### keyExpression — kilit anahtarı üretimi

`keyExpression`, `ITransitionMapping` implemente eden bir C# script'idir. `Handler` metodu, `ScriptContext` üzerinden (`Headers`, `QueryParameters`, `Instance.Data`, `State`, `Transition`) kilit anahtarını hesaplar ve string olarak döndürür.

```csharp title="keyExpression örneği (ITransitionMapping)"
public class Mapping : ITransitionMapping
{
    public async Task<dynamic> Handler(ScriptContext context)
    {
        // Aynı hesabın aynı işlem-günü için tekilliği garanti eden kilit anahtarı.
        // ÖNEMLİ: tarihi UtcNow'dan YENİDEN hesaplama — instance verisinden oku (aşağıdaki uyarıya bak).
        string account = context.Instance.Data.accountId;
        string txnDate = context.Instance.Data.transactionDate; // kalıcı, akış boyunca değişmez
        return $"limit:{account}:{txnDate}";
    }
}
```

:::warning[Anahtar kararlılığı (gece-yarısı bug'ı)]
Kilit anahtarını üretirken `DateTime.UtcNow` gibi **her çağrıda değişen** değerler kullanma. Aksi halde 23:59'da alınan kilidin anahtarı ile 00:00'da hesaplanan anahtar farklı olabilir. Anahtarı, akış başında verilere yazılmış **kalıcı bir değerden** (ör. `transactionDate`) türet. Otomatik release, alım anındaki anahtarı instance'a kaydettiği için bu sınıf hataya karşı ayrıca korumalıdır — ama yine de deterministik anahtar üret.
:::

## Aksiyonlar

### Acquire

Kaynağı kilitler. Kilit başkasındaysa sonuç `onConflict` politikasına göre belirlenir: `Abort`'ta instance fault olur, `Reject`'te dokunulmadan kalır (bkz. [Conflict politikaları](#conflict-politikaları)). Başarılı alımda anahtar ve alım zamanı, otomatik temizlik ve metrik için instance'a kaydedilir.

### Release

Kilidi serbest bırakır. **Idempotent ve best-effort'tur** (HTTP DELETE gibi):

- **Success** veya **LockDoesNotExist** (TTL dolmuş / hiç kilitlenmemiş) → başarı sayılır. "Bu kilidi benim üzerimden kaldır" son-koşulu zaten sağlanmıştır.
- **LockBelongsToOthers** / altyapı hatası → gerçek anomali; warning olarak loglanır (metrik için), fakat **transition'ı fault etmez**.

Release **hiçbir durumda** başarılı bir iş transition'ını geri almaz. Kilit temizliği yüzünden doğru hesaplanmış bir işin fault olması engellenmiştir.

:::tip
Otomatik terminal release sayesinde çoğu akışta explicit `Release` transition'ına ihtiyaç yoktur. Akışın ortasında erken bırakmak istersen `Release` kullanabilirsin; idempotent olduğu için otomatik release ile çakışması zararsızdır.
:::

### Extend

Mevcut kilidin TTL'ini uzatmaya çalışır. Davranış [kilit sağlayıcısına](#kilit-sağlayıcısı) bağlıdır:

- **`dapr` (varsayılan):** Dapr lock API'sinin native extend'i yoktur ve Redis bileşeni `SET NX` kullandığından, kilit hâlâ tutulurken (aynı sahip dahil) re-acquire reddedilir. Pratikte Extend, kilit **zaten TTL ile düşene kadar başarısız olur**; düştükten sonra "başarı" dönmesi aslında yeni bir yarış (race) alımıdır. Bu sağlayıcıda **Extend'e güvenme** — `ttlSeconds`'i korunan işlemin tamamını kapsayacak şekilde boyutlandır.
- **`postgres`** <sup>New</sup> v0.0.106**:** Lease aynı sahip için yenilenir — Extend, kilit tutulurken TTL'i gerçekten uzatır. Korunan bölüm tek bir TTL'den uzun sürebiliyorsa bu sağlayıcıyı seç.

## Otomatik kilit temizliği

Bu, önerilen kullanım modelinin kalbidir. Bir instance **terminal** duruma ulaştığında (Completed / Faulted / Cancelled), o instance'ın tuttuğu tüm kilitler **otomatik olarak** bırakılır:

1. `Acquire` başarılı olduğunda, çözülen anahtar instance metadata'sına (`ExtraProperties` → `resource.locks`, JSON array) ve alım zamanı `resource.locks.acquiredAt`'a (anahtar → ISO-8601 map) kaydedilir.
2. <sup>New</sup> v0.0.106 Finish adımı, terminal state **commit edildikten hemen sonra** (unit of work'ün `OnCompleted`'ında) kaydedilmiş anahtarların her birini `owner=instanceId` ile aynı istek içinde serbest bırakır. Commit'ten önce bırakmak, hâlâ geri alınabilecek bir transition sürerken ikinci bir instance'ı korunan bölüme sokabilirdi.
3. Ortak temizlik noktası (`InstanceCancellationService.ProcessCancellationAsync`) event üzerinden aynı işi yapar; Finish adımına hiç uğramayan terminal yollar için **idempotent bir yedek**tir.

v0.0.106 öncesinde bırakma yalnızca temizlik event'iyle (outbox → Dapr → inbox) yapılıyordu; bu zincir takıldığında kilit TTL'e kadar duruyor, bekleyen her instance çoktan bitmiş bir sahibe karşı retry bütçesini tüketiyordu.

Bunun sağladıkları:

- **Terminal transition'ların her birine manuel `Release` koymaya gerek yok.** Yalnızca `Acquire` yeterlidir.
- **Fault/crash durumunda bile leak yok.** Instance beklenmedik şekilde fault etse (terminal transition çalışmasa) bile temizlik terminal statüde tetiklenir ve kilit TTL beklenmeden bırakılır.
- **En-az-bir-kez garanti.** Temizlik hem local hook (event publish anında) hem distributed endpoint (commit sonrası) yoluyla çalışır; release idempotent olduğu için çift çağrı zararsızdır.

:::note
Kilit alımı ile instance'ın commit'i arasında (nadir) bir rollback olursa anahtar kalıcı olmayabilir; bu dar pencerede kilit **TTL** ile temizlenir — bu da explicit `Release`'in çalışmadığı senaryoyla aynı güvenlik ağıdır.
:::

## Conflict politikaları

`Acquire` sırasında kaynak başka bir instance tarafından tutuluyorsa ne olacağını `onConflict` belirler. Kilit adımı (order 25) `OnExecute`, `OnExit`, state değişikliği ve `OnEntry`'den **önce** çalışır; yani conflict anında instance'a henüz hiçbir şey yazılmamıştır.

| Politika | Conflict sonrası instance | Çağıran | Nasıl tekrar denenir |
|---|---|---|---|
| `Abort` (varsayılan) | **Faulted** (`F`, DB'de kalıcı) | `409 Execution:200010` (`ResourceLockConflict`) | Yeni bir instance başlatılır — çekişilen iş kaybolmuştur |
| `Reject` <sup>New</sup> v0.0.106 | **Değişmez** — aynı state'te, Active | `409 Execution:200014` (`ResourceLockRejected`) | **Aynı çağrı**, kilit boşalınca tekrarlanır |

İki politika da çift-sayım (double-count) yarışını önler; fark kaybedenin akıbetidir. Kodların farklı olması bilinçlidir: istemci "instance'ın öldü, baştan başla" ile "kaynak şu an başkasında, aynı çağrıyı tekrarla" durumlarını ayırt edebilir.

### `Reject` — yarışı kaybet, instance'ı kaybetme

```json title="resourceLock — Reject"
"resourceLock": {
  "keyExpression": { "location": "./src/LimitLockKey.csx", "code": "<script>", "type": "L", "encoding": "NAT" },
  "action": "Acquire",
  "ttlSeconds": 300,
  "onConflict": "Reject"
}
```

- Instance fault edilmez, state değişmez; isteğin aldığı Busy rezervasyonu `409` dönmeden önce geri verilir.
- Runtime `TransitionRejectedWithoutFaulting` (EventId `10263`, Information) loglar.
- Yarışı kaybetmek normal ve tekrarlanabilir bir durumsa (ör. aynı hesaba eşzamanlı iki kullanıcı işlemi) `Reject` kullan. Çağıran taraf `Execution:200014`'te backoff ile aynı çağrıyı tekrarlamalıdır.
- `Reject` schema **0.0.61** gerektirir.

### Error boundary ile yönlendirme

<sup>New</sup> v0.0.106 Çağırana `409` dönmek yerine kaybedeni başka bir yola göndermek istiyorsan `onConflict`'i `Abort`'ta bırak ve `Execution:200010` için bir `errorBoundary` kuralı ekle. Kural bir `transition` belirtiyorsa instance **fault edilmez, o transition'a yönlendirilir**:

```json title="state errorBoundary — lock conflict'i bekleme state'ine yönlendir"
"errorBoundary": {
  "onError": [
    {
      "action": 0,
      "errorCodes": ["Execution:200010"],
      "transition": "wait-for-lock",
      "priority": 10
    }
  ]
}
```

- Önce state seviyesindeki, sonra workflow'un global boundary'si değerlendirilir — task hatalarıyla aynı zincir. Tek bir kural hem task hatalarını hem lock conflict'lerini karşılayabilir.
- Yönlendirme güvenlidir çünkü instance state'inden hiç ayrılmamıştır. Hedef transition otomatik bir zincir adımı gibi çalışır; nedeni bir incident (`errorLayer: Pipeline`) kaydeder ve yönlendirme tamamlanınca incident çözülür.
- Tipik hedef, instance'ı bir timer ile sonra tekrar deneyen bir **bekleme state'ine** park etmektir.
- Bugün yalnızca lock conflict bu yolla yönlendirilebilir; diğer pipeline-adımı hataları eskisi gibi fault eder.

Publish doğrulaması yanlış bağlantıları yakalar:

| Kural | Sonuç |
|---|---|
| `Execution:200010` veya `Execution:200014` adını veren bir kuralda `Retry` (`action: 1`) | **Hata** — retry, kilit hâlâ başkasındayken çalışır; her deneme aynı şekilde düşer. Bekleme state'ine yönlendir ya da `Reject` kullan |
| Lock kodu ele alan bir state boundary'si, o state'ten erişilemeyen bir transition'a yönlendiriyor | **Hata** (lock kodu içermeyen kurallarda **uyarı**) — transition'ı state'e ekle ya da `availableIn`'i o state'i içeren shared transition yap |
| Boundary hedefi olan transition kendi `resourceLock`'unu tanımlıyor | **Uyarı** — ErrorBoundary pipeline profili resource-lock adımını atlar; o kilit bu yoldan hiç çalışmaz |

Şeffaf serileştirme / `Wait` politikası hâlâ desteklenmiyor.

## Kilit sağlayıcısı

<sup>New</sup> v0.0.106 Kilidin hangi depoda tutulacağı host yapılandırmasıyla seçilir:

```
ResourceLock__Provider = dapr | postgres        (varsayılan: dapr)
```

| Sağlayıcı | Depo | `Extend` | Gereksinim |
|---|---|---|---|
| `dapr` (varsayılan) | Dapr lock bileşeni (`DAPR_LOCK_STORE_NAME`) | Kilit tutulurken çalışmaz | Lock bileşeni (eskisi gibi) |
| `postgres` | `sys_queues."DistributedLocks"` (anahtar öneki `wfres:`) | Sahibin lease'ini yeniler | `ConnectionStrings:Default`; Dapr lock bileşeni gerekmez |

- Varsayılan değişmedi: hiçbir şey ayarlamayan deployment Dapr ile çalışmaya devam eder.
- Bilinmeyen bir değer (ör. `postgress`) **startup'ı durdurur**: `Unknown ResourceLock:Provider '…'. Supported values are 'dapr' (default) and 'postgres'.` Boş değer "ayarlanmamış" sayılır. `postgres` connection string olmadan da startup'ta hata verir.
- Tablo runtime'ın mevcut migration'larıyla oluşur. Helm chart'ta henüz ayrı bir value yok; ortam değişkenini orchestrator'a ekle ve değer boşsa hiç render etme.
- `DAPR_LOCK_STORE_NAME` yalnızca Dapr sağlayıcısı ve Aether'in kendi dağıtık kilidi için anlamlı kalır.

## İzleme

<sup>New</sup> v0.0.106

| Metrik | Tip | Etiketler |
|---|---|---|
| `workflow_resource_lock_hold_duration_ms` | histogram | `vnext.domain`, `vnext.flow.key` |

Kilidin alımdan bırakılmaya kadar tutulduğu süre. Üst persentiller yapılandırılmış TTL'e yaklaşıyorsa kilitler bırakılarak değil **süresi dolarak** serbest kalıyor demektir — alarmı tek bir kilide değil persentillere kur. v0.0.106 öncesinde kilit almış instance'ların alım zamanı olmadığından ölçülmezler.

| Log | EventId | Anlamı |
|---|---|---|
| `TransitionRejectedWithoutFaulting` | `10263` | `Reject` ile reddedildi; instance değişmedi |
| `TransitionReroutedByErrorBoundary` | `10264` | Lock conflict error boundary ile başka transition'a yönlendirildi |

## Örnekler

Çalışan bir referans: [`resource-lock-lab`](https://github.com/burgan-tech/vnext-example/tree/master/core/Workflows/resource-lock-lab) (vnext-example).

### Örnek 1 — Günlük limit rezervasyonu (önerilen model)

```json title="check transition — sadece Acquire"
{
  "key": "reserve-daily-limit",
  "from": "draft",
  "target": "limit-reserved",
  "triggerType": 0,
  "versionStrategy": "Patch",
  "resourceLock": {
    "keyExpression": { "location": "./src/DailyLimitKey.csx", "code": "<script>", "type": "L", "encoding": "NAT" },
    "action": "Acquire",
    "ttlSeconds": 300,
    "onConflict": "Abort"
  }
}
```

```csharp title="keyExpression"
public class Mapping : ITransitionMapping
{
    public async Task<dynamic> Handler(ScriptContext context)
    {
        string account = context.Instance.Data.accountId;
        string day = context.Instance.Data.transactionDate; // akış başında yazılmış kalıcı değer
        return $"daily-limit:{account}:{day}";
    }
}
```

- Aynı `(hesap, gün)` için ikinci eşzamanlı istek → **409** (`Abort`: instance fault; `Reject` kullanılsaydı instance yerinde kalırdı).
- Instance başarıyla tamamlanınca **veya** fault olunca → kilit **otomatik** bırakılır. Terminal transition'lara `Release` eklemeye gerek yok.

### Örnek 2 — Koltuk rezervasyonu (uzun TTL)

```csharp title="keyExpression"
public class Mapping : ITransitionMapping
{
    public async Task<dynamic> Handler(ScriptContext context)
        => $"seat:{context.Instance.Data.eventId}:{context.Instance.Data.seatNo}";
}
```

- `ttlSeconds`'i, ödeme onayına kadar geçecek en uzun süreyi kapsayacak şekilde seç. Dapr sağlayıcısında Extend'e güvenme; uzun ve değişken süreler için `postgres` sağlayıcısı + `Extend` kullan.
- Kullanıcı akışı iptal ederse (Cancelled) veya tamamlarsa (Completed) kilit otomatik serbest kalır.

## En iyi pratikler

- **Sadece Acquire kullan, bırakmayı runtime'a bırak.** Otomatik temizlik daha güvenli ve daha az hataya açıktır.
- **Deterministik, kalıcı anahtar üret.** `UtcNow` / `Random` gibi değişen değerlerden kaçın (gece-yarısı bug'ı).
- **TTL'i işlemin tamamına göre boyutlandır.** Dapr sağlayıcısında Extend güvenilmez; TTL tek gerçek güvenlik ağıdır.
- **Anahtarı olabildiğince dar tut.** Kilit kapsamı gerçek yarış alanını yansıtmalı (ör. `hesap+gün`), tüm akışı değil.
- **Conflict politikasını bilinçli seç.** Kaybeden tekrar deneyebilmeliyse `Reject` (istemci `Execution:200014`'te aynı çağrıyı backoff ile tekrarlar); istemciye hiç dönmeden beklemek gerekiyorsa `Abort` + `Execution:200010` için error boundary yönlendirmesi. Boundary kuralında `Retry` kullanma.
- **Hold süresini izle.** `workflow_resource_lock_hold_duration_ms` üst persentilleri TTL'e yaklaşıyorsa bırakma yolu tıkanmıştır.

## İlgili

- [Workflow → Transition Yapısı](/docs/components/workflow) — `resourceLock` alanının tanımlandığı transition'lar
- [Error Boundary](/docs/how-to/error-handling) — lock conflict'i yönlendiren `errorBoundary` kuralları
- [Transition Pipeline](/docs/concepts/transition-pipeline) — order 25 ve pipeline profilleri
- [Interfaces → ITransitionMapping](/docs/components/interfaces) — `keyExpression` script sözleşmesi
- [Mapping Bileşeni](/docs/components/mapping-component) — script encoding, helper ve sandbox ayrıntıları
