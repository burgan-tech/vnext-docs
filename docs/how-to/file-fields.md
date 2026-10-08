---
id: file-fields
title: Dosya Alanları (x-storage)
sidebar_label: Dosya Alanları
description: Bir FilePicker alanının runtime ile gidiş-dönüşü — x-storage yazma şekli, kalıcı handle, echo kuralı, functions/file ile görüntüleme, durum kodları ve sınırlar
---

# Dosya Alanları (`x-storage`)

Master schema'daki bir alan `x-storage` taşıyorsa, o alana gönderilen dosyanın baytları instance verisinin içinde **tutulmaz**; runtime baytları ayarlı bir blob deposuna (Dapr output binding) yazar ve alanın yerine küçük bir **handle** koyar. Client bu handle'ı veri olarak okur, formu düzenlerken geri gönderir ve dosyanın kendisini `functions/file` ile indirir. `x-storage` olmayan bir alanda davranış değişmez (baytlar eskisi gibi inline kalır).

Bu sayfa client geliştiricisine yöneliktir. Alanın şemada nasıl tanımlandığı için bkz. [Schema Tanımı](/docs/how-to/view-consept/schema-tanimi).

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
| `Content-Type` | kayıtlı `mimeType` |
| `ETag` | `"<eTag>"` (tırnaklı) |
| `Accept-Ranges` | `bytes` |
| `Cache-Control` | `private, max-age=31536000, immutable` |
| `X-Content-Type-Options` | `nosniff` |
| `Content-Disposition` | `inline; filename*=UTF-8''…` |

- **Koşullu istek:** `If-None-Match: "<eTag>"` gönderirseniz ve eşleşirse `304` döner; depoya gidilmez. `file` id'si içeriğe bağlı olduğundan yanıt `immutable` önbelleklenebilir.
- **Range:** `Range: bytes=…` ile `206 Partial Content` alırsınız; karşılanamayan aralık `416`. Dilim bellekte alınır (depodan dosya tamamen okunur), yani Range ağ trafiğini azaltır, depo okumasını değil.
- **HEAD:** yalnızca başlıkları döndürür.

## Durum kodları

| Kod | Hata kodu | Ne zaman | Ne yapmalı |
|-----|-----------|----------|-----------|
| `400` | `Instance:100048` (`FileReferenceInvalid`) | `content` ile `file` birlikte; bilinmeyen `file` referansı; `start`'ta referans; geçersiz base64; `functions/file`'da eksik/boş `file` sorgu parametresi | İsteği düzeltin; yeni dosya için `content`, mevcut dosya için kayıttan okuduğunuz handle/`{file}` gönderin. Yeniden denemek işe yaramaz. |
| `403` | — | `functions/file`: state'in `queryRoles` kuralı çağıranı reddediyor | Yetki sorunu; yeniden denemeyin. |
| `404` | `Instance:100049` (`FileNotFound`) | `file` bu instance'ın kayıtlı verisinde yok; ya da dosyanın yolu `x-roles` ile çağıran için gizli | `owner` instance'ını doğrulayın. Gizli yol ile var olmayan dosya bilerek ayırt edilmez. |
| `409` | `InstanceBusy` | Bir parent'ın subflow'u sonlanırken gelen yönlendirilmiş (forward) transition; ya da hedef instance meşgul | Kısa bir beklemeyle aynı isteği yeniden deneyin. |
| `413` | — | İstek gövdesi sınırı aşıldı (Kestrel veya sidecar) | Dosyayı küçültün ya da birden çok dosyaya bölün. Yeniden denemek işe yaramaz. |
| `503` | `Instance:100047` (`FileStoreUnavailable`) | Blob deposu (binding) yazarken ulaşılamıyor | Yeniden deneyin (backoff ile). İstek `202`'den önce, eşzamanlı döner; başarısız `start` instance oluşturmaz, başarısız transition kaydı değiştirmez. |

Parent'ın aktif bir subflow'u varsa, parent'a gönderilen transition leaf'e yönlendirilir ve dosya leaf'te depoya yazılır; client yine **parent'ın** id'sini ve parent'ın modunu alır (async ise `202`, sync ise `200`). Handle'daki `owner` yazan (leaf) instance'tır.

## Sınırlar

- **Gövde boyutu:** base64 baytları yaklaşık 4/3 büyütür. İki sınır vardır ve etkin olan küçüğüdür: orchestration host'unun Kestrel `MaxRequestBodySize` değeri (appsettings'te **10 MiB**, ham gövde tamponu da 10 MiB) ve Dapr sidecar'ının `--max-body-size` değeri (**64 MiB**). Host sınırı yükseltilmedikçe etkin sınır **10 MiB**'dır; bu da yaklaşık **7,5 MiB** dosya demektir. Aşılırsa `413` döner.
- **Silme yok:** dosya değiştirildiğinde veya alan temizlendiğinde eski nesne depoda kalır; runtime şimdilik silme/değiştirme temizliği yapmaz. Bir işlem geri alınırsa yazılmış nesne yetim kalabilir.
- **Yalnızca kayıtlı handle okunur:** dosyaya yalnızca instance verisindeki handle üzerinden erişilir; client depo/binding adı veremez.
- **Görev kayıtları korunmaz:** bir mapping baytları task isteğine koyarsa, bu task kaydında olduğu gibi saklanır (geliştirici kararı).

## İlgili

- [Schema Tanımı](/docs/how-to/view-consept/schema-tanimi) — `x-storage` bildirimi, `x-roles`
- [Instance Verisi](../concepts/instance-data)
- [Async / Sync](./async-sync)
