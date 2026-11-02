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
2. **Kayıtta handle görünür.** Runtime baytları depoya yazar, alanı handle ile değiştirir ve kaydı bu haliyle saklar. İstek gövdesinin ham hali de baytlardan arındırılmış olarak tutulur. <sup>New</sup> v0.0.102 — Takas yalnızca `content`'i kaldırır ve yedi handle üyesini yazar; client'ın aynı nesneye koyduğu diğer üyeler (ör. bir FilePicker satırının `documentType`'ı, dosya başına metadata) **korunur** ve mapping'e ve kayda ulaşır. Önceden takas düğümü temizliyor, bu üyeler mapping çalışmadan düşüyordu. Dosya düğümünde `additionalProperties: false` olan sıkı bir master schema bu üyeleri düğümün `properties`'i altında bildirmelidir.
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

## Akışlı yükleme (`transport: stream`)

<sup>New</sup> v0.0.102 — Şemada `"transport": "stream"` veya `"any"` ile bildirilen bir alan baytlarını JSON gövdesindeki base64 string yerine **ayrı bir yükleme isteğinden** alır. Dosya base64 ile şişmez, bir JSON gövdesinde tutulmaz ve 10 MiB JSON gövde sınırı yerine `FileStorage:Upload:MaxBytes` ile sınırlanır (varsayılan 64 MiB). Bildirim için bkz. [Schema Tanımı → `x-storage`](/docs/how-to/view-consept/schema-tanimi).

| `transport` | Client baytları nasıl gönderir |
|-------------|--------------------------------|
| `inline` (varsayılan) | JSON gövdesinde base64 `content` ([Yazma şekli](#yazma-şekli)) |
| `stream` | Yalnızca akışlı yükleme; client'tan gelen inline `content` `400` `Instance:100048` ile reddedilir |
| `any` | İkisi de |

Büyük dosyalar (taranmış belgeler, TIFF, uzun PDF'ler) ya da yaklaşık 7,5 MiB'ı aşabilecek her dosya için `stream` seçin; küçük dosyalar için `inline` tek istekle yeterlidir.

**1. Yükle.** Ham baytları akışın `files` endpoint'ine gönderin:

```http
POST /api/v1/{domain}/workflows/{flow}/files?path=files[]&name=scan.tiff[&version=1.0.0]
Content-Type: image/tiff
Content-Length: 31457280

<raw bytes>
```

```json
201 Created
{ "file": "6f1c…", "component": "vnext-blob-s3", "path": "files[]", "name": "scan.tiff", "mimeType": "image/tiff",
  "size": 31457280, "eTag": "<sha256 of the bytes received>", "expiresAt": "2026-10-31T13:00:00+00:00" }
```

**2. Referans ver.** `expiresAt`'ten önce, alanın bulunduğu yerde, bir `start` veya transition gövdesinde yalnızca `file` id'sini gönderin:

```json
{ "attributes": { "files": [ { "file": "6f1c…", "documentType": "invoice" } ] } }
```

- **`path`**, şemanın katladığı alan yoludur: `passport`, `customer.tax`, `files[]`, `documents[].doc`. Bilinmeyen yol, `transport`'u `inline` olan bir alan ya da eksik `Content-Length` → `400` `Instance:100048`. Depo hatası → `503` `Instance:100047`.
- **Boyut sınırı.** `MaxBytes`'ı aşan bir gövde, depoya tek bayt yazılmadan `413` döner. `FileStorage:Upload:MaxBytes` (varsayılan 67108864 = 64 MiB) orchestration sidecar'ının `--max-body-size` değeriyle **aynı olmalıdır**; birini yükseltirken diğerini de yükseltin.
- **Bütünlük.** Gövde tam `Content-Length` baytlık tek bir tampona okunur, hash'lenir ve alanın Dapr binding'ine tek mesaj olarak verilir. `size` ve `eTag` alınan baytlardan hesaplanır, client'tan alınmaz; `Content-Length`'ten kısa veya uzun bir gövde saklanmaz.
- **Tek kullanımlık bilet.** Yükleme `FileStorage:Upload:TicketTtlMinutes` (varsayılan 60) dakika boyunca dağıtık önbellekte bekletilir; bu sürede henüz hiçbir instance'ta değildir. Bilet yalnızca yüklendiği **aynı akış, yol ve bileşen** için ve **bir kez** kabul edilir. Aynı yüklemeyi aynı anda talep eden iki istekten yalnızca biri başarılı olur (`200`/`202`), diğeri `400` alır. Talep sonrası başarısız olan bir istek (depo hatası) bileti süresi dolana kadar geri koyar. Aynı yükleme bir gövdede iki kez, süresi dolmuş veya bilinmeyen bir id, ya da başka bir yol için yapılmış bir yükleme → `400` `Instance:100048`.
- **Handle.** Takas, handle'ı bu instance'ı `owner` olarak yazar; düğümün diğer üyeleri (`documentType`) inline yüklemede olduğu gibi korunur.
- **Yetki.** GUID'i bilmek talebin kendisidir: rastgeledir ve yalnızca yükleyen alır. Yükleme route'u `start` gibi runtime yetkilendirmesi taşımaz; gateway'de `start` ile aynı şekilde koruyun.
- **Süresi dolan yüklemeler.** Bilet süresi dolmadan referans verilmeyen bir yükleme nesnesini depoda bırakır (bkz. [Bilinen kısıtlar](#bilinen-kısıtlar)).

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

### Okuma bütünlüğü

<sup>New</sup> v0.0.102 — Her okuma (`functions/file`, `internal/file`, `GetFileAsync`) depodan dönen baytları servis etmeden önce handle'a karşı doğrular:

| Depodan dönen baytlar | Sonuç |
|-----------------------|-------|
| Uzunluk = `size` ve sha256 = `eTag` | Servis edilir |
| Yükü handle ile eşleşen eksiksiz bir `aws-chunked` çerçeve | Yük (orijinal dosya) servis edilir; uyarı logu `20512` (`FileRecoveredFromChunkedFrame`) |
| Diğer her şey | `503` `Instance:100047` (`FileStoreUnavailable`); hata logu `20513` (`FileIntegrityMismatch`) saklanan ve beklenen boyutları içerir |

Çerçeve durumu, Dapr 1.17+ `bindings.aws.s3`'ün TLS üzerinden yaptığı yüklemelerden gelir (bkz. [S3 işletim notu](#s3-işletim-notu-aws-chunked)). Önceden depo ne döndürdüyse servis ediliyordu (ör. dosyadan 44+ bayt uzun, `ETag`'i orijinali gösteren çerçeveli bir nesne); artık eşleşmeyen baytlar bozuk gövde yerine `503` döner. Yanıt gövdesi doğrulanmış binding `get`'i üzerinden akış olarak yazılır; 4 MB'ın üzerindeki dosyalar da artık geri okunabilir (önceden runtime'ın Dapr client'ındaki gRPC alım sınırı nedeniyle `503` dönüyordu).

Endpoint'in referansı (yetki sırası, parametreler) için bkz. [Built-in Functions → File Fonksiyonu](/docs/components/functions/built-in#file-fonksiyonu). Sunucu tarafında (mapping betiğinde) dosyayı okumak için `ScriptBase.GetFileAsync` kullanılır — bkz. [Mappings → Dosya okuma](/docs/components/mappings#dosya-okuma-getfileasync).

## Durum kodları

| Kod | Hata kodu | Ne zaman | Ne yapmalı |
|-----|-----------|----------|-----------|
| `400` | `Instance:100048` (`FileReferenceInvalid`) | `content` ile `file` birlikte; bilinmeyen `file` referansı; `start`'ta referans; geçersiz base64; `functions/file`'da eksik/boş `file` sorgu parametresi | İsteği düzeltin; yeni dosya için `content`, mevcut dosya için kayıttan okuduğunuz handle/`{file}` gönderin. Yeniden denemek işe yaramaz. |
| `403` | — | `functions/file`: state'in `queryRoles` kuralı çağıranı reddediyor | Yetki sorunu; yeniden denemeyin. |
| `404` | `Instance:100049` (`FileNotFound`) | `file` bu instance'ın kayıtlı verisinde yok; ya da dosyanın yolu `x-roles` ile çağıran için gizli | `owner` instance'ını doğrulayın. Gizli yol ile var olmayan dosya bilerek ayırt edilmez. |
| `409` | `InstanceBusy` | Bir parent'ın subflow'u sonlanırken gelen yönlendirilmiş (forward) transition; ya da hedef instance meşgul | Kısa bir beklemeyle aynı isteği yeniden deneyin. |
| `413` | — | İstek gövdesi sınırı aşıldı (Kestrel veya sidecar); akışlı yüklemede gövde `FileStorage:Upload:MaxBytes`'ı aşıyor | Dosyayı küçültün, birden çok dosyaya bölün ya da büyük dosyalar için `transport: stream` kullanın. Yeniden denemek işe yaramaz. |
| `503` | `Instance:100047` (`FileStoreUnavailable`) | Blob deposu (binding) yazarken veya okurken ulaşılamıyor; depoda artık bulunmayan bir nesnenin okunması da bu kodu döner (bkz. [Bilinen kısıtlar](#bilinen-kısıtlar)); <sup>New</sup> v0.0.102 depodan dönen baytlar handle'ın `size`/`eTag`'iyle eşleşmiyorsa da (bkz. [Okuma bütünlüğü](#okuma-bütünlüğü)) | Yeniden deneyin (backoff ile). İstek `202`'den önce, eşzamanlı döner; başarısız `start` instance oluşturmaz, başarısız transition kaydı değiştirmez. |
| `503` | `Instance:100050` (`FileSchemaUnavailable`) | Akışın master schema'sı yüklenemiyor ve gövdede `content` veya `file` üyesi taşıyan bir nesne var (yazma), ya da `functions/file` ile okuma yapılıyor | Şema çözülünce yeniden deneyin. Hiçbir şey uygulanmamıştır; `content`/`file` üyesi taşımayan gövdeler etkilenmez. |

Parent'ın aktif bir subflow'u varsa, parent'a gönderilen transition leaf'e yönlendirilir ve dosya leaf'te depoya yazılır; client yine **parent'ın** id'sini ve parent'ın modunu alır (async ise `202`, sync ise `200`). Handle'daki `owner` yazan (leaf) instance'tır.

## Betikte dosya işleme

<sup>New</sup> v0.0.102 — Bir betik kayıtlı bir dosyayı okuyabilir, System.IO stream'leriyle bellekte işleyebilir ve sonucu bir `x-storage` dosyası olarak geri yazabilir:

```csharp
var source = await GetFileAsync(context.Runtime.Domain, context.Instance.Flow, context.Instance.Id.ToString(), handle.file);
using var input = source.OpenRead();                    // read-only, seekable MemoryStream over the verified bytes
var output = new MemoryStream();
// … hand input/output to a plugin library (PDF, TIFF, image) mounted in Scripting:Sandbox:PluginDirectory …
output.Position = 0;
var converted = await PutFileAsync(context.Runtime.Domain, context.Instance.Flow, context.Instance.Id.ToString(),
    "vnext-blob-s3", output, "converted.pdf", "application/pdf");
return new ScriptResponse { Data = new { convertedDocument = converted } };   // an x-storage path of the master schema
```

- **`ScriptFile.OpenRead()`** her çağrıda doğrulanmış baytlar üzerinde yeni, salt okunur, konumlanabilir bir stream açar.
- **`PutFileAsync(domain, flow, instance, component, byte[] | Stream, name?, mimeType?)`** baytları saklar ve kalıcı handle şeklinde bir `ScriptStoredFile` döner (`component`, `file`, `name`, `mimeType`, `size`, `eTag`, `owner`). `size` ve `eTag` yazılan baytlardan hesaplanır. Mapping veya task çıktısında bir `x-storage` yoluna konduğunda trusted takasta geçerli bir handle'dır ve olduğu gibi tutulur. Kurallar: domain bu runtime'da servis ediliyor olmalı; bileşen o akışın (son sürümünün) bir `x-storage` binding'i veya `FileStorage:AllowedBindings` içinde olmalı; boyut `FileStorage:Upload:MaxBytes` ile sınırlıdır. Ret veya depo hatası exception fırlatır (task, diğer helper hatalarında olduğu gibi başarısız olur). Uzunluğunu bildiremeyen bir stream önce tamponlanır.
- Bir betiğin yazdığı ama hiçbir çıktının tutmadığı nesne, referanssız her nesne gibi yetim kalır.

Sandbox açıkken betik yalnızca bellek içi stream türlerini kullanabilir; dosya sistemi kapalıdır:

| İzinli | Yasak |
|--------|-------|
| `System.IO`: `Stream`, `MemoryStream`, `BufferedStream`, `BinaryReader`, `BinaryWriter`, `TextReader`, `TextWriter`, `StringReader`, `StringWriter`, `StreamReader`, `StreamWriter`, `SeekOrigin`, `IOException`, `EndOfStreamException`, `InvalidDataException` | `File`, `FileStream`, `FileInfo`, `Directory`, `Path`, `DriveInfo`, `UnmanagedMemoryStream`, pipe'lar, memory-mapped dosyalar ve `System.IO`'nun geri kalanı |
| `System.IO.Compression`: `GZipStream`, `DeflateStream`, `BrotliStream`, `ZLibStream`, `CompressionLevel`, `CompressionMode`, `ZipArchive`, `ZipArchiveEntry`, `ZipArchiveMode` (`System.IO.Compression` assembly'si izinli olmalı) | `System.IO.Compression.ZipFile` |
| | `StreamReader(string path, …)` / `StreamWriter(string path, …)` (yol ile dosya açan constructor'lar) |

Ayrıntılı yasak listesi (reflection ve süreç sonlandırma üyeleri dahil) için bkz. [Scripting / Sandbox](/docs/configuration/scripting).

## Dosyaları silme ve listeleme

Runtime'ın silme endpoint'i yoktur ve hiçbir nesneyi silmez. <sup>New</sup> v0.0.102 — Saklama süresini yöneten bir akış nesneleri kendisi siler, okur veya listeler: deponun Dapr binding bileşeni üzerinde bir [Dapr Binding task'ı](/docs/components/tasks/dapr-binding) (type `2`) ile.

1. **Bileşene ulaşın.** `x-storage` bileşenleri orchestration app-id'sine scope'ludur, binding task'ları ise varsayılan olarak Execution servisinde çalışır. Ya `Workflow:TaskInvocation:Modes:daprbinding = Local` ayarlayın (task orchestration sidecar'ından çalışır; bkz. [Task Çalıştırma Yönlendirmesi](/docs/configuration/task-invocation)), ya da bileşeni Execution app-id'sine de scope'layın.
2. **Nesneyi adlandırın.** Input mapping'de çağrı başına şekli task üzerinde ayarlayın: `task.SetMetadata(new() { ["key"] = FileObjectKey(handle.file) })` (`bindings.aws.s3`; `bindings.localstorage` için `fileName`) ve tanım sabitlemiyorsa `task.SetOperation("delete" | "get" | "list")` / `task.SetData(…)`. `FileObjectKey(file)`, `FileStorage:KeyPrefix` + file id'dir (GUID olmayan değer reddedilir).
3. **Yanıtı okuyun.** Task yanıtı output mapping'e ulaşır: `Data`, binding gövdesinin ayrıştırılabiliyorsa JSON (ör. `list`), değilse metin, değilse base64 (ikili bir nesnenin `get`'i) halidir; `Metadata["DataEncoding"]` hangisi olduğunu söyler; `Headers` binding'in yanıt metadata'sını taşır. Hata durumunda genel Dapr client mesajı yerine sidecar'ın gerekçesi gelir (ör. `couldn't find output binding …`).
4. **Alanı temizleyin.** Silmeden sonra alanı `null` yapın (`updateData` veya bir mapping ile): nesnesi silinmiş bir handle okunurken `503` döner.

**Saklama deseni.** Instance'a bağlı saklama ("tamamlandıktan yedi gün sonra sil") tamamlanmış instance'ın kendisinde çalışamaz (tamamlanmış instance transition almaz). Ya tamamlanmış instance'ları sorgulayan (`GetInstances`) ve nesnelerini silen zamanlanmış bir housekeeping akışı çalıştırın, ya da instance'ı bitişinden önce timeout'lu bir saklama state'inde tutun.

## S3 işletim notu (aws-chunked)

Runtime depoya doğrudan bağlanmaz; her yazma, bileşenin Dapr binding'i üzerinde bir `create` çağrısıdır. Dapr 1.17'den itibaren `bindings.aws.s3`, `https://` üzerinden her yüklemeyi CRC32 trailer'lı `Content-Encoding: aws-chunked` olarak gönderir. AWS S3, MinIO, Ceph, LocalStack, s3mock, moto ve SeaweedFS bu kodlamayı çözer; çözmeyen bir depo çerçevenin kendisini nesne olarak saklar (6265 baytlık bir PDF 6309 baytlık nesne olur). Sidecar'da `AWS_REQUEST_CHECKSUM_CALCULATION=when_required` bunu **değiştirmez**; bir bileşen metadata'sı da yoktur.

Runtime bu nesneleri okurken doğrular ve yükü handle ile eşleşen çerçeveli nesneyi orijinal haliyle servis eder ([Okuma bütünlüğü](#okuma-bütünlüğü)); nesneyi çerçevesiz saklayamaz. Bucket'ı vNext dışında doğrudan okuyan bir tüketici çerçeveyi görür. Tercih sırasıyla seçenekler:

| Seçenek | Etki |
|---------|------|
| `aws-chunked` çözen bir depo kullanın (depoda trailer/streaming-signature desteğini açın) | Nesneler dosya olarak saklanır; başka bir şey değişmez |
| Güvenilir ağ içinde depoya `http://` ile ulaşın (`disableSSL: "true"`) | SDK tüm yükü imzalar, çerçeve yok; trafik şifresizdir |
| Orchestration sidecar'ını daprd 1.16.x'e sabitleyin (`dapr.io/sidecar-image`) | 1.16 çerçevesiz yükler; diğer tüm Dapr düzeltmelerini geride tutan geçici bir çözüm |

<sup>New</sup> v0.0.102 — Nesneler artık S3'e `Content-Type` metadata'sıyla yazılır (önceden `bindings.aws.s3`'ün okumadığı `contentType` anahtarı gönderiliyordu ve nesneler türsüz kalıyordu). Doğrudan S3 okuyucuları (presigned URL'ler, konsollar, yaşam döngüsü araçları) yeni yazımlarda gerçek türü görür; `functions/file` handle'daki `mimeType`'ı servis ettiği için hiç etkilenmemişti. Daha önce saklanmış nesneler yazıldıkları türü korur.

## Sınırlar

- **Gövde boyutu:** base64 baytları yaklaşık 4/3 büyütür. İki sınır vardır ve etkin olan küçüğüdür: orchestration host'unun Kestrel `MaxRequestBodySize` değeri (appsettings'te **10 MiB**, ham gövde tamponu da 10 MiB) ve Dapr sidecar'ının `--max-body-size` değeri (**64 MiB**). Host sınırı yükseltilmedikçe etkin sınır **10 MiB**'dır; bu da yaklaşık **7,5 MiB** dosya demektir. Aşılırsa `413` döner. <sup>New</sup> v0.0.102 — Daha büyük dosyalar için alanı `transport: stream` ile bildirin; [akışlı yükleme](#akışlı-yükleme-transport-stream) JSON gövde sınırına değil `FileStorage:Upload:MaxBytes`'a (64 MiB) tabidir.
- **Silme yok:** dosya değiştirildiğinde veya alan temizlendiğinde eski nesne depoda kalır; runtime şimdilik silme/değiştirme temizliği yapmaz. Bir işlem geri alınırsa yazılmış nesne yetim kalabilir.
- **Yalnızca kayıtlı handle okunur:** dosyaya yalnızca instance verisindeki handle üzerinden erişilir; client depo/binding adı veremez.
- **Görev kayıtları korunmaz:** bir mapping baytları task isteğine koyarsa, bu task kaydında olduğu gibi saklanır (geliştirici kararı).
- **`$schema`'sız master schema:** <sup>New</sup> v0.0.102 — `$schema` bildirmeyen bir master schema Draft 2020-12 olarak değerlendirilir ve `x-storage` gibi vocabulary keyword'lerini yok sayar. Önceden şema publish ediliyor, ancak ilk yazma dosyalar depoya yazıldıktan **sonra** `500` ile başarısız oluyordu (yetim nesne bırakarak). `$schema` bildirmek yine de önerilir.
- **Master schema'yı transition şeması olarak kullanmayın:** transition şeması **yazma** şeklini doğrular; master schema'daki `x-storage` düğümü ise kalıcı handle'ı tarif eder ve `content` tanımlayamaz. Aynı şema transition'da kullanılırsa sıkı (`additionalProperties: false`) bir düğüm yüklemeyi reddeder. Dosya alanı taşıyan transition'lara kendi şemalarını verin.

## Bilinen kısıtlar

<sup>New</sup> v0.0.100 Aşağıdaki kısıtlar runtime'ın `vnext-meta/known-issues.json` kaydında `>=0.0.100` için açık olarak listelenir (henüz düzeltilmiş sürüm yok). v0.0.102 ile eklenenler `>=0.0.102` için açıktır.

| Kısıt (known-issue id) | Etki | Ne yapmalı |
|------------------------|------|-----------|
| Rollback'te yetim nesne (`file-store-orphans-on-rollback`) | Nesne, unit of work commit edilmeden ve transition kabul edilmeden **önce** depoya yazılır. Sonrasında bir rollback ya da `409` (Busy, subflow tamamlanma penceresi) olursa depoda referanssız bir nesne kalır; runtime bunu izlemez/toplamaz. | Binding'in arkasındaki bucket/dizine bir yaşam döngüsü (expiry) kuralı uygulayın; kapsamı `FileStorage:KeyPrefix` ile daraltın. Yetim nesne instance verisine zarar vermez. |
| Silme yok (`file-store-no-delete`) | Alanı temizlemek (`null`/göndermemek) veya değiştirmek eski nesneyi **silmez**; retention ya da çöp toplama yoktur — instance için yazılmış her nesne depoda kalır. | Saklama süresini deponun kendi yaşam döngüsü kurallarıyla yönetin. `FileStorage:KeyPrefix`'i ilk yazımdan sonra değiştirmeyin, aksi halde kayıtlı nesnelere ulaşılamaz. |
| Task kaydında baytlar (`file-in-task-record`) | Task kayıtları (`InstanceTask.Request` / `Response`) `x-storage` takasının kapsamında değildir: dosya baytlarını (ör. base64 string) task isteğine/yanıtına koyan bir mapping bunları task kaydına olduğu gibi yazar. | Mapping'ler arasında içeriği değil handle'ı taşıyın; baytları yalnızca task'ın ihtiyaç duyduğu yerde `ScriptBase.GetFileAsync` ile okuyun ve task yanıtına geri yazmayın. |
| Domain'ler arası referans (`file-trusted-payload-cross-domain`) | Güvenilir (trusted) payload bayrağı domain sınırını geçmez: başka domain'i hedefleyen Start/SubProcess trigger task'ları, DirectTrigger ve proxy'lenen SubFlow forward'ları o domain'in public endpoint'lerini çağırır; gövdedeki `content`'siz bir handle orada `400` `Instance:100048` ile reddedilir. | Domain'ler arası gövdelerde handle yerine `content` (base64) gönderin ya da dosyayı sahibi olan domain'de `ScriptBase.GetFileAsync` ile okuyun. |
| Seed verisi depoya alınmaz (`file-seed-data-not-offloaded`) | Tanımın seed verisinden eklenen instance verisi yazma hattına workflow geçirmez; seed'deki `x-storage` içeriği depoya taşınmaz, instance verisinde **inline** kalır. | Seed verisine dosya içeriği koymayın; instance oluştuktan sonra bir transition ile yükleyin. |
| Örtüşen async proxy geri alması (`file-async-proxy-overlapping-revert`) | Aynı parent üzerinden aktif SubFlow'a proxy'lenen iki örtüşen async istekte, biri başarısız olup geri alındığında diğerinin koyduğu Busy damgasını temizleyebilir; child'ın bir sonraki bildirimi parent'ın durumunu düzeltir. | Normal işleyişte gerekmez (kendiliğinden düzelir). Client'lar aynı parent'a örtüşen async transition göndermemelidir. |
| Kayıp nesne `503` görünür (`file-missing-object-503`) | Depoda artık bulunmayan (lifecycle kuralı veya elle silinmiş) bir nesnenin okunması `503` `Instance:100047` döner; Dapr binding iki durumu da aynı hata olarak raporladığından depo kesintisinden ayırt edilemez. | Instance verisinin hâlâ referans verdiği nesneleri expire etmeyin. `503` yalnızca tek bir dosya için sürüyorsa depoda nesne anahtarını (`FileStorage:KeyPrefix` + `file`) kontrol edin. |
| Talep edilmeyen akışlı yüklemeler (`file-staged-upload-orphans`) <sup>New</sup> v0.0.102 | Bileti süresi dolmadan hiçbir `start` veya transition'ın talep etmediği bir akışlı yükleme nesnesini depoda bırakır; bekletme kaydının süresi dolar, nesnenin dolmaz. | Diğer `x-storage` yetimlerinde olduğu gibi deponun yaşam döngüsü kurallarını kullanın. |
| Dapr S3 binding'i TLS yüklemelerini çerçeveler (`dapr-s3-binding-frames-tls-uploads`) <sup>New</sup> v0.0.102 | daprd 1.17+ sidecar'ında `bindings.aws.s3` her `https` yüklemesini `aws-chunked` olarak gönderir; bu kodlamayı çözmeyen bir depo çerçeveyi nesne olarak saklar. Runtime okurken kurtarır; bucket'ı doğrudan okuyan tüketici çerçeveyi görür. Sidecar'da `AWS_REQUEST_CHECKSUM_CALCULATION` ve bileşen metadata'sı bunu değiştirmez. | `aws-chunked` çözen bir depo, güvenilir ağda `http` endpoint ya da components-contrib seçeneği sunana kadar sidecar'ı daprd 1.16.x'e sabitleme (bkz. [S3 işletim notu](#s3-işletim-notu-aws-chunked)). |
| İndirme yanıtı body-logging tarafından tamponlanır (`file-download-response-buffered-by-body-logging`) <sup>New</sup> v0.0.102 | Aether'in body-logging middleware'i `Telemetry:Logging:ExcludedPaths` içinde olmayan her yanıtı, body logging kapalıyken bile, göndermeden önce belleğe kopyalar; bu yüzden bir `functions/file` / `internal/file` indirmesi binding `get`'inden sonra bellekte bir kez daha tutulur. | İki route'u (`/functions/file$`, `/internal/file$`) `ExcludedPaths`'e eklemek kopyayı kaldırır, ancak Aether'in tracing filtresi aynı listeyi kullandığından bu route'ların HTTP server span'ları da kaybolur. Gönderilen yapılandırma span'ları korur; düzeltme Aether'dedir. |
| Yinelenen üye adları (`file-duplicate-property-names`) | `x-storage` düğümünde bir üye adı tekrarlanırsa (ör. iki `content` veya `file`) sonuç (takas, koruma veya ret) tanımsızdır. | Yinelenen üye adı olmayan, düzgün JSON gönderin; standart JSON serializer'lar bunu zaten üretmez. |

## İlgili

- [Schema Tanımı](/docs/how-to/view-consept/schema-tanimi) — `x-storage` bildirimi, `x-roles`
- [Instance Verisi](../concepts/instance-data)
- [Async / Sync](./async-sync)
- [Built-in Functions → File Fonksiyonu](/docs/components/functions/built-in#file-fonksiyonu) — endpoint referansı
- [Mappings → Dosya okuma (`GetFileAsync`)](/docs/components/mappings#dosya-okuma-getfileasync) — betikten dosya okuma
- [Dapr Binding Task](/docs/components/tasks/dapr-binding) — nesneleri silme, okuma ve listeleme
- [Scripting / Sandbox](/docs/configuration/scripting) — betikte izinli stream türleri ve yasak üyeler
- [REST API](/docs/api-reference/rest-api) — hata kodları
- [Helm Chart](/docs/deployment/helm-chart) — blob storage binding'i ve `FileStorage` ayarları
