---
id: resource-lock
title: Kaynak Kilitleme (Resource Lock)
sidebar_label: Kaynak Kilitleme
description: Transition sırasında paylaşılan bir kaynağı dağıtık kilitle koruma
---

# Kaynak Kilitleme (Resource Lock)

Resource Lock, bir transition çalışırken paylaşılan bir kaynağı (koltuk, zaman-slotu, günlük limit, hesap vb.) **birden fazla instance'ın aynı anda değiştirmesini** engelleyen dağıtık kilit mekanizmasıdır. Kilit, Aether SDK'nın Dapr distributed-lock building block'u (`lock.redis`) üzerinden yönetilir ve transition tanımına bağlı olarak **opt-in** çalışır.

## Genel Bakış

- Kilit, transition tanımındaki `resourceLock` bloğu ile **isteğe bağlı** olarak devreye girer. `resourceLock` tanımlı olmayan transition'lar bu adımı hiç çalıştırmaz.
- Pipeline'da **order 25** (`ResourceLockStep`) çalışır. Yalnızca **Manual** profilinde aktiftir; AutoChain / Scheduled / Event / ErrorBoundary profillerinde hariç tutulur.
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
| `onConflict` | `Abort` | Hayır | `Abort` | Kilit alınamadığında politika. Şu an yalnızca `Abort` desteklenir. |

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

:::warning Anahtar kararlılığı (gece-yarısı bug'ı)
Kilit anahtarını üretirken `DateTime.UtcNow` gibi **her çağrıda değişen** değerler kullanma. Aksi halde 23:59'da alınan kilidin anahtarı ile 00:00'da hesaplanan anahtar farklı olabilir. Anahtarı, akış başında verilere yazılmış **kalıcı bir değerden** (ör. `transactionDate`) türet. Otomatik release, alım anındaki anahtarı instance'a kaydettiği için bu sınıf hataya karşı ayrıca korumalıdır — ama yine de deterministik anahtar üret.
:::

## Aksiyonlar

### Acquire

Kaynağı kilitler. Kilit başkasındaysa `ResourceLockConflict` hatası döner ve transition **abort** olur (bkz. [Conflict davranışı](#conflict--http-409)). Başarılı alımda anahtar, otomatik temizlik için instance'a kaydedilir.

### Release

Kilidi serbest bırakır. **Idempotent ve best-effort'tur** (HTTP DELETE gibi):

- **Success** veya **LockDoesNotExist** (TTL dolmuş / hiç kilitlenmemiş) → başarı sayılır. "Bu kilidi benim üzerimden kaldır" son-koşulu zaten sağlanmıştır.
- **LockBelongsToOthers** / altyapı hatası → gerçek anomali; warning olarak loglanır (metrik için), fakat **transition'ı fault etmez**.

Release **hiçbir durumda** başarılı bir iş transition'ını geri almaz. Kilit temizliği yüzünden doğru hesaplanmış bir işin fault olması engellenmiştir.

:::tip
Otomatik terminal release sayesinde çoğu akışta explicit `Release` transition'ına ihtiyaç yoktur. Akışın ortasında erken bırakmak istersen `Release` kullanabilirsin; idempotent olduğu için otomatik release ile çakışması zararsızdır.
:::

### Extend

Mevcut kilidin TTL'ini uzatmaya çalışır. **Dikkat:** Dapr lock API'sinin native extend'i yoktur ve Redis bileşeni `SET NX` kullandığından, kilit hâlâ tutulurken (aynı sahip dahil) re-acquire reddedilir. Pratikte Extend, kilit **zaten TTL ile düşene kadar başarısız olur**; düştükten sonra "başarı" dönmesi aslında yeni bir yarış (race) alımıdır. Bu nedenle **Extend'e güvenme** — `ttlSeconds`'i korunan işlemin tamamını kapsayacak şekilde boyutlandır.

## Otomatik kilit temizliği

Bu, önerilen kullanım modelinin kalbidir. Bir instance **terminal** duruma ulaştığında (Completed / Faulted / Cancelled), o instance'ın tuttuğu tüm kilitler **otomatik olarak** bırakılır:

1. `Acquire` başarılı olduğunda, çözülen anahtar instance metadata'sına (`ExtraProperties` → `resource.locks`, JSON array) kaydedilir.
2. Instance terminal olduğunda, ortak temizlik noktası (`InstanceCancellationService.ProcessCancellationAsync`) kaydedilmiş anahtarların her birini `owner=instanceId` ile serbest bırakır.

Bunun sağladıkları:

- **Terminal transition'ların her birine manuel `Release` koymaya gerek yok.** Yalnızca `Acquire` yeterlidir.
- **Fault/crash durumunda bile leak yok.** Instance beklenmedik şekilde fault etse (terminal transition çalışmasa) bile temizlik terminal statüde tetiklenir ve kilit TTL beklenmeden bırakılır.
- **En-az-bir-kez garanti.** Temizlik hem local hook (event publish anında) hem distributed endpoint (commit sonrası) yoluyla çalışır; release idempotent olduğu için çift çağrı zararsızdır.

:::note
Kilit alımı ile instance'ın commit'i arasında (nadir) bir rollback olursa anahtar kalıcı olmayabilir; bu dar pencerede kilit **TTL** ile temizlenir — bu da explicit `Release`'in çalışmadığı senaryoyla aynı güvenlik ağıdır.
:::

## Conflict → HTTP 409

`Acquire` sırasında kaynak başka bir instance tarafından tutuluyorsa:

- `ResourceLockConflict` hatası üretilir → transition **abort** edilir.
- Kaybeden istek **HTTP 409 Conflict** alır.
- Instance faulted (`F`) olarak işaretlenir (DB'de kalıcı), ancak çağırana temiz bir 409 döner — çift-sayım (double-count) yarışı önlenmiş olur.

İkinci eşzamanlı istek reddedilir; çağıran tarafın retry etmesi beklenir. (Şeffaf serileştirme / `Wait` politikası şu an desteklenmiyor; yalnızca `Abort`.)

## Örnekler

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

- Aynı `(hesap, gün)` için ikinci eşzamanlı istek → **409**.
- Instance başarıyla tamamlanınca **veya** fault olunca → kilit **otomatik** bırakılır. Terminal transition'lara `Release` eklemeye gerek yok.

### Örnek 2 — Koltuk rezervasyonu (uzun TTL)

```csharp title="keyExpression"
public class Mapping : ITransitionMapping
{
    public async Task<dynamic> Handler(ScriptContext context)
        => $"seat:{context.Instance.Data.eventId}:{context.Instance.Data.seatNo}";
}
```

- `ttlSeconds`'i, ödeme onayına kadar geçecek en uzun süreyi kapsayacak şekilde seç (Extend'e güvenme).
- Kullanıcı akışı iptal ederse (Cancelled) veya tamamlarsa (Completed) kilit otomatik serbest kalır.

## En iyi pratikler

- **Sadece Acquire kullan, bırakmayı runtime'a bırak.** Otomatik temizlik daha güvenli ve daha az hataya açıktır.
- **Deterministik, kalıcı anahtar üret.** `UtcNow` / `Random` gibi değişen değerlerden kaçın (gece-yarısı bug'ı).
- **TTL'i işlemin tamamına göre boyutlandır.** Extend güvenilmez; TTL tek gerçek güvenlik ağıdır.
- **Anahtarı olabildiğince dar tut.** Kilit kapsamı gerçek yarış alanını yansıtmalı (ör. `hesap+gün`), tüm akışı değil.
- **Conflict'i çağıran tarafta ele al.** 409 alındığında retry/backoff uygula.

## İlgili

- [Workflow → Transition Yapısı](/docs/components/workflow) — `resourceLock` alanının tanımlandığı transition'lar
- [Interfaces → ITransitionMapping](/docs/components/interfaces) — `keyExpression` script sözleşmesi
- [Mapping Bileşeni](/docs/components/mapping-component) — script encoding, helper ve sandbox ayrıntıları
