---
id: schema-tanimi
title: Schema Tanımı
sidebar_label: Schema Tanımı
sidebar_position: 4
description: schema.json'un anatomisi, JSON Schema temelleri ve x-* uzantıları
---

# Schema Tanımı

Schema, bir ekranın **veri sözleşmesini** tanımlar. Hangi alanlar var, hangi tiplerde, hangi validasyonlarla, hangi kaynaklardan besleniyor — bunların hepsi schema'dadır.

**Schema yazmak Backend ekibinin sorumluluğundadır.** Ancak bir UI tasarımcısının schema'yı okuyup anlayabilmesi, doğru view oluşturmanın ön koşuludur. Bu sayfa size schema'yı okuma becerisini kazandırır.

---

## schema.json Anatomisi

```json title="schema.json (kök yapı)"
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "urn:vnext:res:schema:customer:registration-form",
  "title": "Müşteri Kayıt Formu",
  "description": "...",
  "type": "object",
  "required": ["firstName", "lastName", "city"],
  "properties": {
    "firstName": { ... },
    "city": { ... }
  }
}
```

| Alan | Açıklama |
|------|----------|
| `$id` | Schema'nın benzersiz URN adresi — view'da `dataSchema` değeri olarak kullanılır |
| `title` | Schema'nın görünen adı |
| `type` | Her zaman `"object"` — form verisi bir nesne olarak taşınır |
| `required` | Zorunlu alan adlarının listesi |
| `properties` | Her bir alan tanımı |

---

## Her Alan Tanımının Yapısı

```json
"firstName": {
  "type": "string",
  "minLength": 2,
  "maxLength": 50,
  "x-labels": { "tr": "Ad", "en": "First Name", "ar": "الاسم الأول" },
  "x-errorMessages": {
    "required": { "tr": "Ad alanı zorunludur", "en": "First name is required" },
    "minLength": { "tr": "Ad en az 2 karakter olmalıdır", "en": "First name must be at least 2 characters" }
  }
}
```

---

## Standart JSON Schema Özellikleri

| Özellik | Değer | Açıklama |
|---------|-------|----------|
| `type` | `string`, `number`, `integer`, `boolean`, `object`, `array` | Veri tipi |
| `minLength` | sayı | Minimum karakter sayısı (string) |
| `maxLength` | sayı | Maksimum karakter sayısı (string) |
| `minimum` | sayı | Minimum değer (number/integer) |
| `maximum` | sayı | Maksimum değer (number/integer) |
| `pattern` | regex | Regex pattern doğrulaması |
| `format` | string | Önceden tanımlı format (aşağıya bkz.) |
| `enum` | dizi | İzin verilen değerler listesi |
| `const` | değer | Sabit değer (ör. checkbox için `true`) |
| `default` | değer | Varsayılan değer |

**`format` değerleri:** `email`, `uri`, `url`, `date`, `date-time`, `time`, `phone`, `iban`

---

## x-* Uzantıları

Pseudo UI, standart JSON Schema üzerine `x-` önekli uzantılar ekler. Bunlar label, LOV kaynağı, koşullu görünürlük gibi UI'ya özgü bilgileri taşır.

---

### `x-labels` — Çok Dilli Alan Etiketi

Alanın ekranda görünen etiketini tanımlar. Renderer aktif dile göre doğru etiketi seçer.

```json
"x-labels": {
  "tr": "Ad",
  "en": "First Name",
  "ar": "الاسم الأول"
}
```

:::tip
`x-labels` yoksa Renderer alan adını (ör. `firstName`) label olarak kullanır. Backend'den bu değerin mutlaka gelmesini bekleyin.
:::

---

### `x-errorMessages` — Hata Mesajları

Her validasyon kuralı için çok dilli hata mesajları tanımlar.

```json
"x-errorMessages": {
  "required": { "tr": "Ad alanı zorunludur", "en": "First name is required" },
  "minLength": { "tr": "Ad en az 2 karakter olmalıdır", "en": "First name must be at least 2 characters" },
  "pattern": { "tr": "Geçersiz format", "en": "Invalid format" },
  "format": { "tr": "Geçerli bir e-posta giriniz", "en": "Enter a valid email" }
}
```

Desteklenen anahtar isimleri: `required`, `minLength`, `maxLength`, `minimum`, `maximum`, `pattern`, `format`, `enum`, `const`

---

### `x-enum` — Enum Değerlerinin Etiketleri

`enum` alanlarının her değeri için görüntülenecek çok dilli metinleri tanımlar. Dropdown ve RadioGroup bu değerleri kullanır.

```json
"customerType": {
  "type": "string",
  "enum": ["individual", "corporate"],
  "x-enum": {
    "individual": { "tr": "Bireysel", "en": "Individual", "ar": "فردي" },
    "corporate": { "tr": "Kurumsal", "en": "Corporate", "ar": "شركات" }
  }
}
```

---

### `x-lov` — Dropdown Kaynağı (List of Values)

Bir dropdown veya seçim bileşeninin liste verilerini nereden çekeceğini tanımlar.

```json
"city": {
  "type": "string",
  "x-lov": {
    "source": "urn:vnext:fn:shared:get-cities",
    "valueField": "$.response.data.code",
    "displayField": "$.response.data.name"
  }
}
```

| Alan | Açıklama |
|------|----------|
| `source` | Veri kaynağının URN adresi |
| `valueField` | API yanıtında value'nun JSONPath adresi |
| `displayField` | API yanıtında görüntülenecek metnin JSONPath adresi |
| `filter` | Dinamik filtre parametreleri (cascade LOV için) |

**Filtreyle — cascade LOV örneği:**

```json
"district": {
  "type": "string",
  "x-lov": {
    "source": "urn:vnext:fn:shared:get-districts",
    "valueField": "$.response.data.code",
    "displayField": "$.response.data.name",
    "filter": [
      { "param": "cityCode", "value": "$form.city", "required": true }
    ]
  }
}
```

`"required": true` → `city` değeri boşken API çağrısı yapılmaz; `district` dropdown'ı devre dışı kalır.

Daha fazla bilgi için bkz. [Data Akışı → Cascade LOV](./data-akisi#cascade-lov).

---

### `x-lookup` — Tekil Kayıt Zenginleştirme

`x-lookup`, view render edilirken bir kaynaktan veri çekip `$lookup` namespace'ine yükler. `resultField` path'ine göre **hem tekil nesne hem de dizi** döndürebilir: tekil nesne (ör. seçilen şubenin adres/iletişim detayları) `$lookup.<ad>.<alan>` ile, dizi ise `ForEach` ile (`source: "$lookup.<ad>"`, eleman erişimi `$item.*`) kullanılır.

```json
"branchDetail": {
  "type": "object",
  "x-lookup": {
    "source": "urn:vnext:fn:shared:get-branch-detail",
    "resultField": "$.response.data",
    "filter": [
      { "param": "branchCode", "value": "$instance.selectedBranchCode", "required": true }
    ]
  }
}
```

View'da bu alanı aktifleştirmek için kök seviyeye `"lookups": ["branchDetail"]` eklenir. Veriyi kullanmak için `$lookup.branchDetail.address` gibi bir ifade kullanılır.

Daha fazla bilgi için bkz. [Data Akışı → Lookup](./data-akisi#lookup).

---

### `x-conditional` — Koşullu Görünürlük ve Etkinlik

Bir alanın başka bir alana göre gösterilmesini, gizlenmesini, etkinleştirilmesini veya devre dışı bırakılmasını sağlar.

```json
"tckn": {
  "type": "string",
  "x-conditional": {
    "showIf": {
      "field": "customerType",
      "operator": "equals",
      "value": "individual"
    }
  }
}
```

**Kullanılabilir kural tipleri:**

| Tip | Açıklama |
|-----|----------|
| `showIf` | Koşul sağlanırsa göster |
| `hideIf` | Koşul sağlanırsa gizle |
| `enableIf` | Koşul sağlanırsa etkinleştir |
| `disableIf` | Koşul sağlanırsa devre dışı bırak |

**Koşul operatörleri:**

| Operatör | Açıklama | Örnek Değer |
|----------|----------|-------------|
| `equals` | Eşit | `"individual"` |
| `notEquals` | Eşit değil | `"corporate"` |
| `in` | Listede var | `["a", "b"]` |
| `notIn` | Listede yok | `["x", "y"]` |
| `isEmpty` | Boş | — |
| `isNotEmpty` | Dolu | — |
| `contains` | İçeriyor | `"istanbul"` |
| `greaterThan` | Büyüktür | `18` |
| `lessThan` | Küçüktür | `65` |

**Bileşik koşullar:**

```json
"x-conditional": {
  "showIf": {
    "allOf": [
      { "field": "customerType", "operator": "equals", "value": "individual" },
      { "field": "consentKVKK", "operator": "equals", "value": true }
    ]
  }
}
```

| Anahtar | Mantık |
|---------|--------|
| `allOf` | AND — tüm koşullar sağlanmalı |
| `anyOf` | OR — en az bir koşul sağlanmalı |
| `not` | NOT — koşul sağlanmamalı |

---

### `x-binding` — Alt Bileşen Bağlama

Yalnızca alt bileşen (nested component) schema'larında kullanılır. Üst bileşenden gelmesi beklenen alanları işaretler.

```json
"cityCode": {
  "type": "string",
  "x-binding": "required"
}
```

| Değer | Açıklama |
|-------|----------|
| `"required"` | Üst bileşen bu değeri mutlaka `bind` ile sağlamalı |
| `"optional"` | Üst bileşen bu değeri sağlayabilir, sağlamazsa da çalışır |

---

### `x-roles` — Alan Bazlı Yetkilendirme

Bir alanın **rol değerlendirmesi (role evaluation)** ile yetkilendirilmesini sağlar. Özellikle **master şemada** önemlidir: hangi alanların kime görünür olacağını `x-roles` belirler — yani **alan (column) seviyesinde güvenlik** sağlar. Tanımı olmayan alanlar tüm yetkili çağıranlara görünür.

```json
"customerSecret": {
  "type": "string",
  "x-roles": [
    { "role": "morph-idm.initiator", "grant": "allow" },
    { "role": "$userBehalfOf.$.context.Instance.Data.initial.customer.ownerUserId", "grant": "deny" }
  ]
}
```

| Alan | Açıklama |
|------|----------|
| `role` | Statik rol adı (ör. `morph-idm.initiator`) **veya** dinamik JSONPath ifadesi (ör. `$userBehalfOf.$.context...`) |
| `grant` | `allow` veya `deny` — **DENY her zaman ALLOW'u geçersiz kılar** |

Rol değerlendirme semantiği (sistem rolleri, `$user` / `$userBehalfOf` / `$role` prefiksleri) için bkz. [Yetkilendirme](/docs/concepts/authorization).

v0.0.99 ile `x-roles` girdisi tek bir `role` yerine `allOf` / `anyOf` kombinatörü de taşıyabilir (`{ "allOf": [ { "role": "..." }, ... ], "grant": "allow" }`); semantik ve publish kuralları için bkz. [Yetkilendirme → Kombinatörler](/docs/concepts/authorization#kombinatörler-allof--anyof). Kombinatörler `x-masking` / `x-encryption` muafiyet listelerinde (`roles`) **kabul edilmez**. Hatalı `x-roles` girdileri (ör. `$.context.` ile başlamayan dinamik yol) artık publish'te reddedilir; önceden runtime bunları sessizce atlıyordu.

---

### `x-masking` — Maskeleme

`x-roles` ile aynı alan-yönetişim kapsamındadır ve workflow'un master (data) şemasında etkilidir (v0.0.99). Değer veritabanında **düz** saklanır; maskeleme yalnızca **okuma** sırasında uygulanır. `roles` listesindeki (muafiyet) çağıran ham değeri, diğer herkes maskelenmiş değeri görür.

```json
"iban": {
  "type": "string",
  "x-masking": {
    "operator": "mask",
    "params": { "keepFirst": 4, "keepLast": 2, "maskingChar": "*" },
    "roles": [ { "role": "morph-idm.ops", "grant": "allow" } ]
  }
},
"note": {
  "type": "string",
  "x-masking": { "operator": "replace", "params": { "value": "***" } }
}
```

| Alan | Açıklama |
|------|----------|
| `operator` | `mask` veya `replace` |
| `params` (`mask`) | `keepFirst`, `keepLast` (negatif olmayan tamsayı, varsayılan `0`), `maskingChar` (tam olarak bir karakter, varsayılan `*`) |
| `params` (`replace`) | `value` — zorunlu, boş olmayan string; değerin yerine bu metin döner |
| `roles` | Yalnızca `allow` kabul eden **muafiyet listesi** (bkz. aşağıda `x-encryption` altındaki `roles` açıklaması) |

`x-masking` içinde yalnızca bu üç anahtar (`operator`, `params`, `roles`) kabul edilir; bilinmeyen anahtar ya da diğer operatörün parametresi publish'te reddedilir.

- `mask` çıktısı girdiyle **aynı uzunluktadır**: ilk `keepFirst` ve son `keepLast` karakter korunur, aradakiler `maskingChar` ile değiştirilir. Uzunluk görünür kaldığı için uzunluğu da hassas olan değerlerde `replace` kullanın.
- `keepFirst + keepLast` değer uzunluğuna eşit ya da büyükse değer **değiştirilmeden** döner.
- Örnek: `TR330006100519786457841326` → `TR33********************26`.

`SchemaMasking:Enabled=false` yalnızca `x-masking`'i kapatır; `x-roles` ve `x-encryption` etkilenmez.

---

### `x-encryption` — Hash ve Şifreleme

`x-roles` ile aynı alan-yönetişim kapsamındadır ve workflow'un master (data) şemasında etkilidir. Yalnızca `type: "string"` olan ve iç içe `properties` üzerinden erişilen alanlarda kullanılabilir; aynı alanda `x-masking`, `x-filterOperators`, `x-sortable` veya `x-indexed` ile birlikte kullanılamaz.

```json
"email": {
  "type": "string",
  "x-encryption": {
    "type": "encrypt",
    "roles": [ { "role": "morph-idm.auditor", "grant": "allow" } ],
    "purpose": "PII"
  }
}
```

```json
"password": {
  "type": "string",
  "x-encryption": { "type": "hash", "params": { "algorithm": "sha256" } }
}
```

| Alan | Açıklama |
|------|----------|
| `type` | Zorunlu; küçük harfle `none`, `hash` veya `encrypt` |
| `params.algorithm` | Yalnızca `hash` için: `sha256` (varsayılan) veya `sha512`. `encrypt` parametre almaz |
| `roles` | Yalnızca `encrypt` için, opsiyonel `allow` muafiyet listesi; `hash` üzerinde reddedilir |
| `purpose` | Veri sınıflandırması (boş olmayan string, ör. `PII`, `KYC`) |
| `redactInLogs` | Değerin loglanmaması gerektiğini belirtir (boolean) |
| `retentionDays` | Saklama süresi (pozitif tamsayı) |

`purpose`, `redactInLogs` ve `retentionDays` publish'te biçim olarak doğrulanır ama runtime tarafından **uygulanmaz**.

| `type` | Ne yapar |
|--------|----------|
| `"none"` | Şifreleme yok |
| `"hash"` | Değer **yazılırken** özetlenir: veritabanında `HASHED:SHA256:<hex>` (veya `HASHED:SHA512:`) saklanır, ham değer tutulmaz. Özet, instance'a özgü tuzla anahtarlanmış bir **HMAC**'tir (`params.algorithm`: `sha256` varsayılan, `sha512`); aynı değer iki farklı instance'ta farklı özet üretir. Okuma yolu saklanan özeti gösterir. `roles` ve `pattern` / `format` / `minLength` / `maxLength` / `enum` / `const` kabul etmez |
| `"encrypt"` | Değer instance data'da **AES-256-GCM** ile şifreli saklanır: `ENCRYPTED:AES256:i1:…`. Script'ler (mapping, koşul, extension, output mapping) alanı `context.Instance.Data`'da — ve runtime'ın instance verisini koyduğu `context.Body`'de — **jeton** olarak görür; düz değere ihtiyaç duyan kod `await context.Instance.DecryptAsync("alan.yolu", cancellationToken)` çağırır. Okuma yüzeylerinde (instance GET, liste, data function, senkron yanıt, Get* task'leri) `roles` listesindeki çağıran düz metni, diğer herkes saklanan şifreli değeri görür |

Anahtar ve tuz **her instance için** runtime tarafından ilk korumalı yazmada üretilir ve flow şemasındaki `InstanceSecrets` tablosunda tutulur; config'te, Vault'ta ya da şemada yer almaz ve hiçbir API'den dönmez. Instance silinince anahtarı da silinir ve şifreli değerleri geri döndürülemez.

`roles` bir **muafiyet listesidir** ve yalnızca `allow` kabul eder (`x-masking.roles` için de aynısı): eşleşen çağıran değeri açık görür, eşleşmeyen (yanlış yazılmış, rolsüz, listede olmayan) herkes dönüştürülmüş değeri görür. `deny` publish'te reddedilir; dinamik roller `$.context.` ile başlamalıdır ve `allOf` / `anyOf` kombinatörleri burada kabul edilmez.

:::warning Kapsam
`x-roles`, `x-masking` ve `x-encryption` tek bir okuma servisinden geçen tüm yüzeylerde aynı şekilde uygulanır: **instance GET, instance liste, data function, senkron start/transition yanıtı** ve **GetInstance / GetInstances / GetInstanceData task'leri**. (v0.0.99 öncesinde instance GET ve liste veriyi filtresiz dönüyor, Get* task'leri sistem görünürlüğüyle — `SystemRead` — okuyordu; bu ayrıcalık kaldırıldı.) Task okumaları, task'in hedefe sunduğu başlık setiyle değerlendirilir: input mapping'deki başlıklar + request'te olup mapping'de verilmemiş ya da boş bırakılmış her credential başlığı (`sub`, `act_sub`, `position`, `client_id`, `role`). Mapping'de dolu bir değer varsa mapping kazanır; 1024 karakteri aşan ya da kontrol karakteri içeren değerler taşınmaz. Aynı kural tüm task türleri (HTTP, SOAP, DaprService, DaprHttpEndpoint, Start, SubProcess, DirectTrigger) için geçerlidir. `role` yalnız çağıranın gönderdiği haliyle taşınır; morph-idm'in çözdüğü roller taşınmaz, hedef bunları iletilen credential'dan kendisi çözer. Lokal ve cross-domain davranış aynıdır. Başlık vermeyen bir task çağıranı adına okur; başka bir kimlikle (örn. servis rolü) okumak için credential'ı input mapping'de verin. Şema okunamazsa düz metin değil saklanan biçim döner.

Task'in döndürdüğü şifreli bir değeri başka bir alana kopyalamak yazma sırasında reddedilir.

`DecryptAsync` instance'ın **kendi** verisinden **yol** alır, değer almaz: düz alan, bilinmeyen yol, açılamayan değer ya da yol yerine verilmiş bir jeton için `null` döner — dışarıdan gelen bir şifreli değer (istek gövdesi, task yanıtı, başka instance) çözülemez. İptal token'ı yalnız o çağrı için kullanılır; iptal edilirse `OperationCanceledException` fırlatılır. Instance verisi motorun her yerinde veritabanındaki ham haliyle durur: `context.Instance.LatestData.Data` de jeton taşır, dinamik rol grant'ları ve human-task metni de jetonu görür (rol ya da görev başlığı olarak kullanılan bir alan `encrypt` yapılmamalıdır). İstisna: SubFlow output mapping'inde child'ın verisi düz gelir — child kendi anahtarıyla açar. DynamicExpresso kuralları jeton görür ve çözemez — encrypt alan üzerindeki koşulu C# script kuralı olarak yazın.

Kapsam dışı (korumasız): transition geçmişi, `context.Related`, custom function'lar, human-task listesi, event ve iç endpoint'ler. `encrypt` yalnızca **instance data**'yı şifreler; transition gövdesi, task kayıtları, event ve cache kopyaları henüz düz metindir. Alan `encrypt`/`hash` yapılmadan önce yazılmış geçmiş satırlar da düz kalır. Şifreli alan filtrelenemez, sıralanamaz ve gruplanamaz.
:::

`"persisted"` ve `"transport"` kaldırıldı (hiçbir runtime tarafından uygulanmıyordu); bu değerleri taşıyan şema publish'te reddedilir — yerine `"encrypt"` kullanın.

#### Okuma sırası

Okuma yüzeylerinde dönüşümler sırayla uygulanır: önce `x-roles` (yetkisiz alan budanır), sonra `x-masking`, sonra `x-encryption`.

#### Publish kuralları

`x-masking` ve `x-encryption` publish'te doğrulanır; aşağıdaki durumlarda şema reddedilir:

| Kural | Açıklama |
|-------|----------|
| Yalnızca string | Property `type: "string"` (opsiyonel olarak `"null"` ile birlikte) olmalıdır |
| Yalnızca iç içe `properties` | Keyword yalnız iç içe `properties` üzerinden erişilen alanda geçerlidir; `items`, `$defs`, kombinatör ya da koşul (`if/then`) altında reddedilir |
| Alan başına tek dönüşüm | `x-masking`, aktif bir `x-encryption` (`hash` / `encrypt`) ile aynı alanda bulunamaz |
| Sorgu keyword'leri ile birlikte kullanılamaz | `x-filterOperators`, `x-sortable`, `x-indexed` ile birleştirilemez |
| `hash` kısıtları | `roles`, `pattern`, `format`, `minLength`, `maxLength`, `enum`, `const` kabul etmez; `params` yalnız `algorithm` (`sha256` / `sha512`) |
| `roles` | Yalnızca `allow`; `deny` reddedilir. Dinamik yollar `$.context.` ile başlamalıdır. `allOf` / `anyOf` kabul edilmez |
| Kaldırılan değerler | `persisted` / `transport` reddedilir (`"has been removed; use 'encrypt'"`) |
| Yazma şifrelemesi kapalı host | `SchemaEncryption:EncryptWrites=false` olan host'ta `hash` / `encrypt` içeren şema publish edilemez |

#### Hata kodları

| Kod | HTTP | Ne zaman |
|-----|------|----------|
| `Instance:100041` | 400 | İstek, ayrılmış `ENCRYPTED:` / `HASHED:` önekli bir değer getiriyor |
| `Instance:100043` | 503 | Instance korumalı değer taşırken şema çözümlenemiyor |
| `Instance:100040` | 503 | Yazma, gizli anahtarı artık bulunmayan bir değeri ileri taşıyacak |
| `Validation:900010` | 400 | Liste sorgusu bir `encrypt` yolu üzerinde filtreleme / sıralama / gruplama yapıyor |

#### Konfigürasyon

```json
"SchemaMasking": { "Enabled": true },
"SchemaEncryption": { "EncryptWrites": true, "SecretCacheEntries": 100000, "SecretCacheSlidingMinutes": 30 }
```

| Anahtar | Varsayılan | Açıklama |
|---------|------------|----------|
| `SchemaMasking:Enabled` | `true` | `false` yalnızca `x-masking`'i kapatır |
| `SchemaEncryption:EncryptWrites` | `true` | Geri dönüş anahtarı: `false` iken yeni değerler düz saklanır (mevcut şifreli değerler açılmaya devam eder) ve `hash` / `encrypt` içeren şema publish edilemez |
| `SchemaEncryption:SecretCacheEntries` | `100000` | Instance anahtarlarının süreç içi (in-process) önbellek kapasitesi; anahtarlar Redis'e yazılmaz |
| `SchemaEncryption:SecretCacheSlidingMinutes` | `30` | Önbellekteki anahtarın kayan (sliding) son kullanma süresi |

:::tip ETag
Aynı versiyonla yeniden publish edilen bir şema ETag'i değiştirmez. `x-roles`, `x-masking` veya `x-encryption` keyword'lerini değiştirdiğinizde **şema versiyonunu artırın**; aksi halde istemciler ve data function önbelleği eski yanıtı kullanmaya devam edebilir.
:::

---

### `x-filterOperators` — Filtrelenebilir Operatörler (Bilgi Amaçlı)

Bir alanın hangi filtre operatörleriyle sorgulanabileceğini belirler. **Boş veya yok ise alan filtrelenemez.** Genellikle master şemada tanımlanır; instance listeleme/sorgulama davranışını besler.

```json
"startDateTime": {
  "type": "string",
  "format": "date-time",
  "x-filterOperators": ["eq", "gt", "ge", "lt", "le", "between"]
}
```

İzin verilen değerler: `eq`, `ne`, `gt`, `ge`, `lt`, `le`, `between`, `match`, `like`, `startswith`, `endswith`, `in`, `nin`. Operatörlerin alan tipine göre davranışı ve kuralları için bkz. [Instance Filtering](/docs/how-to/instance-filtering).

---

### `x-sortable` — Sıralanabilirlik (Bilgi Amaçlı)

`true` ise alan sıralanabilir; tanımlı değilse sıralanamaz.

```json
"startDateTime": { "type": "string", "x-sortable": true }
```

---

### `x-displayFormat` — Görüntü Formatı

Alanın UI'da nasıl biçimlendirileceğine dair ipucu. Filtreleme/sıralamayı etkilemez.

```json
"startDateTime": { "type": "string", "x-displayFormat": "yyyy-MM-dd'T'HH:mm:ssXXX" }
```

---

### `x-validation` — Özel Validasyon (Bilgi Amaçlı)

Backend ekibi tarafından tanımlanır. Delegate aracılığıyla özel doğrulama kuralı çalıştırır.

```json
"email": {
  "x-validation": {
    "rule": "validateEmailDomain",
    "parameters": { "blockedDomains": ["tempmail.com"] },
    "errorMessages": { "tr": "Geçici e-postalar kabul edilmez" }
  }
}
```

---

## Koşullu Zorunlu Alanlar — `allOf`

Schema'da bazı alanlar yalnızca belirli koşulda zorunlu hale gelir. Bu JSON Schema'nın `if/then` yapısıyla sağlanır:

```json
"allOf": [
  {
    "if": {
      "properties": { "customerType": { "const": "individual" } },
      "required": ["customerType"]
    },
    "then": { "required": ["tckn", "birthDate"] }
  },
  {
    "if": {
      "properties": { "customerType": { "const": "corporate" } },
      "required": ["customerType"]
    },
    "then": { "required": ["taxNumber", "companyName"] }
  }
]
```

Bireysel müşteri seçildiğinde `tckn` ve `birthDate` zorunlu; kurumsal seçildiğinde `taxNumber` ve `companyName` zorunlu hale gelir.

---

## Sonraki Konular

- LOV ve lookup verilerinin nasıl yüklendiği → [Data Akışı](./data-akisi)
- View'da bu bilgileri kullanmak → [View Yapısı](./view-yapisi)
