---
id: file-fields
title: Dosya Alanları (x-storage)
sidebar_label: Dosya Alanları
description: Bir FilePicker alanının runtime ile gidiş-dönüşü — x-storage yazma şekli, kalıcı handle, echo kuralı, functions/file ile görüntüleme, durum kodları ve sınırlar
---

# Dosya Alanları (`x-storage`)

Master schema'daki bir alan `x-storage` taşıyorsa, o alana gönderilen dosyanın baytları instance verisinin içinde **tutulmaz**; runtime baytları ayarlı bir blob deposuna (Dapr output binding) yazar ve alanın yerine küçük bir **handle** koyar. Client bu handle'ı veri olarak okur, formu düzenlerken geri gönderir ve dosyanın kendisini `functions/file` ile indirir. `x-storage` olmayan bir alanda davranış değişmez (baytlar eskisi gibi inline kalır). <sup>New</sup> v0.0.100

Bu sayfa client geliştiricisine yöneliktir. Alanın şemada nasıl tanımlandığı için bkz. [Schema Tanımı](/docs/how-to/view-consept/schema-tanimi); binding bileşeninin (blob storage) kurulumu için bkz. [Helm Chart](/docs/deployment/helm-chart).

## Yazma şekli

Client dosyayı transition (veya `start`) gövdesinde, alan yolunda şu şekilde gönderir:

```json
{
  "identityDocument": {
    "name": "passport.pdf",
    "mimeType": "application/pdf",
    "size": 204800,
    "content": "<base64>"
  }
}
```

`content` yalnızca **gidiş** yönünde vardır; hiçbir okuma yüzeyi baytları geri döndürmez. `size` client'ın tahminidir ve yok sayılır — kayıtlı değer çözülmüş bayt sayısıdır. Dizi alanlarında (`items` üzerinde `x-storage`) her eleman ayrı bir dosyadır.

## Kalıcı handle

Kayıt (instance verisi, transition kaydı, her okuma) baytların yerine şunu taşır:

```json
{
  "component": "vnext-blob-s3",
  "file": "7c9e4c2a-5f7e-4a51-9c11-0b8b6c1d2e3f",
  "name": "passport.pdf",
  "mimeType": "application/pdf",
  "size": 204800,
  "eTag": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  "owner": { "domain": "onboarding", "flow": "kyc-main-flow", "instance": "8394783-..." }
}
```

| Alan | Anlamı |
|------|--------|
| `component` | Dosyanın yazıldığı binding'in adı. Bilgi amaçlıdır; client bunu bir yere göndermez. |
| `file` | Runtime'ın ürettiği GUID. Client dosya adı **değildir**. |
| `name`, `mimeType` | Client'ın gönderdiği ad ve tür. |
| `size` | Çözülmüş bayt sayısı (otoriter). |
| `eTag` | Baytların SHA-256'sı, küçük harf hex, 64 karakter. HTTP `ETag` başlığında tırnaklı döner. |
| `owner` | Dosyayı yazan instance (`domain`, `flow`, `instance`). `functions/file` çağrısını **hangi instance'a** yapacağınızı söyler. |

## Gidiş-dönüş

1. **Seç ve gönder.** Kullanıcı dosyayı seçer; client base64'ü `content` ile transition (veya `start`) gövdesine koyar.
2. **Kayıtta handle görünür.** Runtime baytları depoya yazar, alanı handle ile değiştirir ve kaydı bu haliyle saklar. İstek gövdesinin ham hali de baytlardan arındırılmış olarak tutulur.
3. **Formu düzenlerken geri gönder (echo).** Dosyayı değiştirmeyen bir kayıt güncellemesinde alanı iki şekilde geri gönderebilirsiniz: okuduğunuz handle'ı aynen, ya da yalnızca `{ "file": "<id>" }`. Runtime, aynı `file` id'sini instance'ın kayıtlı verisinde aynı alan yolunda arar (dizilerde aynı dizinin herhangi bir elemanında) ve bulursa alanı **kayıtlı handle** ile değiştirir; client'ın gönderdiği ad/tür/boyut/eTag dikkate alınmaz.
4. **Görüntüle / indir.** `functions/file` çağrısını handle'daki `owner` instance'ı üzerinden yapın (aşağıda).

Alanı `null` yapmak veya göndermemek alanı temizler; ancak depodan **hiçbir şey silinmez** (bkz. [Sınırlar](#sınırlar)).

### Echo kuralları

| Gövde | Sonuç |
|-------|-------|
| yalnızca `content` | Yeni dosya olarak yazılır |
| yalnızca `file` (+ isteğe bağlı metadata) | Kayıtlı veride varsa kayıtlı handle'a dönüşür; yoksa `400` |
| `content` ve `file` birlikte | `400` |
| `start` isteğinde `file` referansı | `400` (henüz kayıtlı veri yok) |

## Dosyayı okuma — `functions/file`

```
GET|HEAD {domain}/workflows/{workflow}/instances/{instance}/functions/file?file=<guid>
```

- `{workflow}` / `{instance}` olarak handle'daki `owner.flow` / `owner.instance` değerlerini kullanın. Bir parent'ın verisinde subflow'dan gelen bir handle görüyorsanız çağrıyı o subflow instance'ına (`owner`) yapın; parent üzerinden aşağıya inilmez.
- `file`, o instance'ın **kendi** kayıtlı verisinde bir `x-storage` alanında bulunmalıdır.
- Erişim, state'in `queryRoles` kuralları ve dosyanın yolundaki (ve üst yollarındaki) `x-roles` grant'leriyle denetlenir.

### Başlıklar ve önbellek

| Başlık | Değer |
|--------|-------|
| `Content-Type` | kayıtlı `mimeType` (ayrıştırılamıyorsa `application/octet-stream`) |
| `ETag` | `"<eTag>"` (tırnaklı) |
| `Accept-Ranges` | `bytes` |
| `Cache-Control` | `private, max-age=31536000, immutable` |
| `X-Content-Type-Options` | `nosniff` |
| `Content-Security-Policy` | `sandbox; default-src 'none'` (her zaman — tür client'ın beyanıdır, yanıt bu origin'de belge olarak çalışmaz) |
| `Content-Disposition` | `inline; filename*=UTF-8''…`; etkin içerik türlerinde (`text/html`, `application/xhtml+xml`, `image/svg+xml`, `text/xml`, `application/xml`, `text/javascript`, `application/javascript` ve her `+xml`) **`attachment`** |

- **Koşullu istek:** `If-None-Match: "<eTag>"` gönderirseniz ve eşleşirse `304` döner; depoya gidilmez. `file` id'si içeriğe bağlı olduğundan yanıt `immutable` önbelleklenebilir.
- **Range:** `Range: bytes=…` ile `206 Partial Content` alırsınız; karşılanamayan aralık `416`. Dilim bellekte alınır (depodan dosya tamamen okunur), yani Range ağ trafiğini azaltır, depo okumasını değil.
- **HEAD:** yalnızca başlıkları döndürür.

Endpoint'in referansı (yetki sırası, parametreler) için bkz. [Built-in Functions → File Fonksiyonu](/docs/components/functions/built-in#file-fonksiyonu). Sunucu tarafında (mapping betiğinde) dosyayı okumak için `ScriptBase.GetFileAsync` kullanılır — bkz. [Mappings → Dosya okuma](/docs/components/mappings#dosya-okuma-getfileasync).

## Durum kodları

| Kod | Hata kodu | Ne zaman | Ne yapmalı |
|-----|-----------|----------|-----------|
| `400` | `Instance:100048` (`FileReferenceInvalid`) | `content` ile `file` birlikte; bilinmeyen `file` referansı; `start`'ta referans; geçersiz base64; `functions/file`'da eksik/boş `file` sorgu parametresi | İsteği düzeltin; yeni dosya için `content`, mevcut dosya için kayıttan okuduğunuz handle/`{file}` gönderin. Yeniden denemek işe yaramaz. |
| `403` | — | `functions/file`: state'in `queryRoles` kuralı çağıranı reddediyor | Yetki sorunu; yeniden denemeyin. |
| `404` | `Instance:100049` (`FileNotFound`) | `file` bu instance'ın kayıtlı verisinde yok; ya da dosyanın yolu `x-roles` ile çağıran için gizli | `owner` instance'ını doğrulayın. Gizli yol ile var olmayan dosya bilerek ayırt edilmez. |
| `409` | `InstanceBusy` | Bir parent'ın subflow'u sonlanırken gelen yönlendirilmiş (forward) transition; ya da hedef instance meşgul | Kısa bir beklemeyle aynı isteği yeniden deneyin. |
| `413` | — | İstek gövdesi sınırı aşıldı (Kestrel veya sidecar) | Dosyayı küçültün ya da birden çok dosyaya bölün. Yeniden denemek işe yaramaz. |
| `503` | `Instance:100047` (`FileStoreUnavailable`) | Blob deposu (binding) yazarken veya okurken ulaşılamıyor; depoda artık bulunmayan bir nesnenin okunması da bu kodu döner (bkz. [Bilinen kısıtlar](#bilinen-kısıtlar)) | Yeniden deneyin (backoff ile). İstek `202`'den önce, eşzamanlı döner; başarısız `start` instance oluşturmaz, başarısız transition kaydı değiştirmez. |
| `503` | `Instance:100050` (`FileSchemaUnavailable`) | Akışın master schema'sı yüklenemiyor ve gövdede `content` veya `file` üyesi taşıyan bir nesne var (yazma), ya da `functions/file` ile okuma yapılıyor | Şema çözülünce yeniden deneyin. Hiçbir şey uygulanmamıştır; `content`/`file` üyesi taşımayan gövdeler etkilenmez. |

Parent'ın aktif bir subflow'u varsa, parent'a gönderilen transition leaf'e yönlendirilir ve dosya leaf'te depoya yazılır; client yine **parent'ın** id'sini ve parent'ın modunu alır (async ise `202`, sync ise `200`). Handle'daki `owner` yazan (leaf) instance'tır.

## Sınırlar

- **Gövde boyutu:** base64 baytları yaklaşık 4/3 büyütür. İki sınır vardır ve etkin olan küçüğüdür: orchestration host'unun Kestrel `MaxRequestBodySize` değeri (appsettings'te **10 MiB**, ham gövde tamponu da 10 MiB) ve Dapr sidecar'ının `--max-body-size` değeri (**64 MiB**). Host sınırı yükseltilmedikçe etkin sınır **10 MiB**'dır; bu da yaklaşık **7,5 MiB** dosya demektir. Aşılırsa `413` döner.
- **Silme yok:** dosya değiştirildiğinde veya alan temizlendiğinde eski nesne depoda kalır; runtime şimdilik silme/değiştirme temizliği yapmaz. Bir işlem geri alınırsa yazılmış nesne yetim kalabilir.
- **Yalnızca kayıtlı handle okunur:** dosyaya yalnızca instance verisindeki handle üzerinden erişilir; client depo/binding adı veremez.
- **Görev kayıtları korunmaz:** bir mapping baytları task isteğine koyarsa, bu task kaydında olduğu gibi saklanır (geliştirici kararı).
- **Master schema'yı transition şeması olarak kullanmayın:** transition şeması **yazma** şeklini doğrular; master schema'daki `x-storage` düğümü ise kalıcı handle'ı tarif eder ve `content` tanımlayamaz. Aynı şema transition'da kullanılırsa sıkı (`additionalProperties: false`) bir düğüm yüklemeyi reddeder. Dosya alanı taşıyan transition'lara kendi şemalarını verin.

## Bilinen kısıtlar

<sup>New</sup> v0.0.100 Aşağıdaki kısıtlar runtime'ın `vnext-meta/known-issues.json` kaydında `>=0.0.100` için açık olarak listelenir (henüz düzeltilmiş sürüm yok).

| Kısıt (known-issue id) | Etki | Ne yapmalı |
|------------------------|------|-----------|
| Rollback'te yetim nesne (`file-store-orphans-on-rollback`) | Nesne, unit of work commit edilmeden ve transition kabul edilmeden **önce** depoya yazılır. Sonrasında bir rollback ya da `409` (Busy, subflow tamamlanma penceresi) olursa depoda referanssız bir nesne kalır; runtime bunu izlemez/toplamaz. | Binding'in arkasındaki bucket/dizine bir yaşam döngüsü (expiry) kuralı uygulayın; kapsamı `FileStorage:KeyPrefix` ile daraltın. Yetim nesne instance verisine zarar vermez. |
| Silme yok (`file-store-no-delete`) | Alanı temizlemek (`null`/göndermemek) veya değiştirmek eski nesneyi **silmez**; retention ya da çöp toplama yoktur — instance için yazılmış her nesne depoda kalır. | Saklama süresini deponun kendi yaşam döngüsü kurallarıyla yönetin. `FileStorage:KeyPrefix`'i ilk yazımdan sonra değiştirmeyin, aksi halde kayıtlı nesnelere ulaşılamaz. |
| Task kaydında baytlar (`file-in-task-record`) | Task kayıtları (`InstanceTask.Request` / `Response`) `x-storage` takasının kapsamında değildir: dosya baytlarını (ör. base64 string) task isteğine/yanıtına koyan bir mapping bunları task kaydına olduğu gibi yazar. | Mapping'ler arasında içeriği değil handle'ı taşıyın; baytları yalnızca task'ın ihtiyaç duyduğu yerde `ScriptBase.GetFileAsync` ile okuyun ve task yanıtına geri yazmayın. |
| Domain'ler arası referans (`file-trusted-payload-cross-domain`) | Güvenilir (trusted) payload bayrağı domain sınırını geçmez: başka domain'i hedefleyen Start/SubProcess trigger task'ları, DirectTrigger ve proxy'lenen SubFlow forward'ları o domain'in public endpoint'lerini çağırır; gövdedeki `content`'siz bir handle orada `400` `Instance:100048` ile reddedilir. | Domain'ler arası gövdelerde handle yerine `content` (base64) gönderin ya da dosyayı sahibi olan domain'de `ScriptBase.GetFileAsync` ile okuyun. |
| Seed verisi depoya alınmaz (`file-seed-data-not-offloaded`) | Tanımın seed verisinden eklenen instance verisi yazma hattına workflow geçirmez; seed'deki `x-storage` içeriği depoya taşınmaz, instance verisinde **inline** kalır. | Seed verisine dosya içeriği koymayın; instance oluştuktan sonra bir transition ile yükleyin. |
| Örtüşen async proxy geri alması (`file-async-proxy-overlapping-revert`) | Aynı parent üzerinden aktif SubFlow'a proxy'lenen iki örtüşen async istekte, biri başarısız olup geri alındığında diğerinin koyduğu Busy damgasını temizleyebilir; child'ın bir sonraki bildirimi parent'ın durumunu düzeltir. | Normal işleyişte gerekmez (kendiliğinden düzelir). Client'lar aynı parent'a örtüşen async transition göndermemelidir. |
| Kayıp nesne `503` görünür (`file-missing-object-503`) | Depoda artık bulunmayan (lifecycle kuralı veya elle silinmiş) bir nesnenin okunması `503` `Instance:100047` döner; Dapr binding iki durumu da aynı hata olarak raporladığından depo kesintisinden ayırt edilemez. | Instance verisinin hâlâ referans verdiği nesneleri expire etmeyin. `503` yalnızca tek bir dosya için sürüyorsa depoda nesne anahtarını (`FileStorage:KeyPrefix` + `file`) kontrol edin. |
| Yinelenen üye adları (`file-duplicate-property-names`) | `x-storage` düğümünde bir üye adı tekrarlanırsa (ör. iki `content` veya `file`) sonuç (takas, koruma veya ret) tanımsızdır. | Yinelenen üye adı olmayan, düzgün JSON gönderin; standart JSON serializer'lar bunu zaten üretmez. |

## İlgili

- [Schema Tanımı](/docs/how-to/view-consept/schema-tanimi) — `x-storage` bildirimi, `x-roles`
- [Instance Verisi](../concepts/instance-data)
- [Async / Sync](./async-sync)
- [Built-in Functions → File Fonksiyonu](/docs/components/functions/built-in#file-fonksiyonu) — endpoint referansı
- [Mappings → Dosya okuma (`GetFileAsync`)](/docs/components/mappings#dosya-okuma-getfileasync) — betikten dosya okuma
- [REST API](/docs/api-reference/rest-api) — hata kodları
- [Helm Chart](/docs/deployment/helm-chart) — blob storage binding'i ve `FileStorage` ayarları
