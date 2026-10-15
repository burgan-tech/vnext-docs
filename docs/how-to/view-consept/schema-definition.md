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

<sup>New</sup> v0.0.100 / vnext-schema 0.0.56 — Her uzantı her şemada geçerli değildir: schema bileşeninin `attributes.type` alanı şemanın **rolünü** (`master`, `transition`, `function`, `component`) bildirir ve rolünün dışında yazılan bir uzantı paket doğrulamasında reddedilir. Örneğin `x-roles`, `x-masking`, `x-filterOperators`, `x-computed` ve `x-storage` yalnız master şemada; `x-context-source` yalnız transition/function şemasında; `x-binding` yalnız component şemasında geçerlidir. Tam matris: [Şema Rolleri](/docs/concepts/schema-roles).

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

Desteklenen anahtar isimleri: `required`, `minLength`, `maxLength`, `minimum`, `maximum`, `pattern`, `format`, `enum`, `const`. <sup>New</sup> vnext-schema 0.0.56 ile `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`, `minItems`, `maxItems` ve `uniqueItems` de eklendi. Runtime başarısız olan keyword'ü adıyla arar; bu yüzden doğruladığı her keyword bir mesaj taşıyabilir.

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

### `x-order` — Form Alan Sırası

<sup>New</sup> vnext-schema 0.0.56 — Şemadan form üreten bir client için alanın sırasını belirleyen sayı; küçük olan önce gelir, `x-order` taşımayan alanlar sıralı alanların hepsinden sonra gelir. Saklanan şema property sırasını korumaz (PostgreSQL `jsonb` nesne anahtarlarını normalize eder); bu yüzden alan sırası önemliyse `x-order` yazın. Tüm rollerde geçerlidir.

```json
"properties": {
  "firstName": { "type": "string", "x-order": 1 },
  "lastName":  { "type": "string", "x-order": 2 },
  "city":      { "type": "string", "x-order": 3 }
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
| `source` | Veri kaynağının URN adresi. `{{$form.x}}` / `{{$instance.x}}` / `{{$param.x}}` interpolasyonu ile **hangi** kaynağın çağrılacağı seçilebilir; çözülemeyen yer tutucu yüklemeyi atlar |
| `items` <sup>New</sup> | Kapsamda zaten bulunan bir diziyi gösteren ifade (`$instance.<yol>` / `$form.<yol>`); seçenekler **istek atılmadan** bu diziden üretilir |
| `valueField` | Value'nun yolu: `source` ile API yanıtında JSONPath; `items` ile eleman içinde düz property adı (boş = elemanın kendisi) |
| `displayField` | Görüntülenecek metnin yolu (`valueField` ile aynı iki biçim) |
| `imageField` <sup>New</sup> | Her seçenek için görsel yolu (görsel çizen seçiciler için; `valueField` ile aynı biçim) |
| `filter` | Dinamik filtre parametreleri (cascade LOV için) |

<sup>New</sup> vnext-schema 0.0.56 — `source` ve `items` alanlarından **tam olarak biri** yazılır. `filter[].param` liste sorgusu operatörünü iki noktadan sonra taşıyabilir (`"status:in"`; yoksa eşitlik uygulanır). `filter[].value` literal bir **dizi** olabilir; `in` / `nin` operatörlerine ulaşmanın tek yolu budur (referans ifadeleri her zaman string'dir).

**Kapsamdaki diziden — `items` örneği:**

```json
"selectedAccount": {
  "type": "string",
  "x-lov": {
    "items": "$instance.accounts",
    "valueField": "iban",
    "displayField": "name",
    "imageField": "bankLogo"
  }
}
```

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
| `greaterThanOrEquals` <sup>New</sup> | Büyük veya eşittir | `18` |
| `lessThanOrEquals` <sup>New</sup> | Küçük veya eşittir | `65` |
| `startsWith` <sup>New</sup> | İle başlar | `"TR"` |
| `endsWith` <sup>New</sup> | İle biter | `".pdf"` |

Son dört operatör vnext-schema 0.0.56 ile eklendi. Aynı condition yapısı `x-computed` case'lerinin `when` alanında da kullanılır.

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

Yalnızca alt bileşen (nested component) schema'larında kullanılır. Üst bileşenden gelmesi beklenen alanları işaretler. Rol olarak `attributes.type: "component"` şemaya aittir; component, onu gömen view'ın rolünü devralmaz (bkz. [Şema Rolleri → Component rolü](/docs/concepts/schema-roles#component-rolü-ve-x-binding)).

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

<sup>New</sup> v0.0.100 / vnext-schema 0.0.56 — `source` alanı şifrelemeyi **kimin** yaptığını seçer:

| `source` | Ne zaman | Kim uygular | Kabul edildiği roller (paket doğrulaması) |
|---|---|---|---|
| `runtime` (varsayılan; yazılmazsa bu) | **At rest** — veritabanında | Runtime: yazarken hash'ler ya da şifreler, okurken muaf çağırana açar | Yalnız `master` (ve type'sız şema) |
| `client` | **In transit** — client → backend | Client: değeri alıcının public key'iyle mühürleyip gönderir; runtime hiçbir şey yapmaz | `master`, `transition`, `function` (ve type'sız şema); `component` hiçbirini kabul etmez |

`source` değeri büyük/küçük harfe duyarlıdır; `runtime` ya da `client` dışındaki bir değer publish'te `x-encryption.source must be 'runtime' or 'client'.` hatasıyla reddedilir. İki dalın alanları karıştırılamaz: runtime kuralında `key` / `algorithm` vb., client kuralında `type` / `params` / `roles` vb. reddedilir. Rol matrisi için bkz. [Şema Rolleri](/docs/concepts/schema-roles).

#### Runtime kaynağı (at rest)

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
| `source` | Opsiyonel; `runtime` (varsayılan) |
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

#### Client kaynağı (in transit)

<sup>New</sup> v0.0.100 / vnext-schema 0.0.56 — Client, değeri istek çıkmadan önce **alıcının public key'iyle mühürler**; yalnız private key'i tutan servis açabilir. Client mühürleyemezse yazmayı **reddeder**, değeri asla düz metin göndermez.

```json
"password": {
  "type": "string",
  "format": "password",
  "x-encryption": {
    "source": "client",
    "key": "urn:client:context:read:device:memory:device.hpke.publicKey",
    "algorithm": "HPKE-P256-SHA256-AES128GCM",
    "into": "passwordEnc",
    "envelope": "publicKey"
  }
}
```

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| `source` | Evet | `client` |
| `key` | Evet | Alıcının public key adresi: bir context okuma adresi (`urn:client:context:read:<boundary>:<storage>:<key>`) veya `$instance.<yol>` |
| `algorithm` | Evet | Mühürleme takımı: `HPKE-P256-SHA256-AES128GCM` (RFC 9180; DHKEM P-256 / HKDF-SHA256 / AES-128-GCM) veya `RSA-OAEP-256` |
| `into` | Hayır | Ciphertext'in gönderileceği alan; yoksa değer yerinde değiştirilir |
| `encoding` | Hayır | Ciphertext kodlaması: `base64` veya `base64url` |
| `nonce` | Hayır | Mühürlenen metne bağlanan kayıt başına değer (`{value}:{nonce}`); tekrar oynatmaya (replay) karşı koruma |
| `envelope` | Hayır | `publicKey`: `{publicKeyB64}.{ciphertextB64}` biçiminde gönderir |
| `purpose` | Hayır | Veri sınıflandırması (boş olmayan string) |

**Runtime bu kurala hiçbir şey yapmaz:** at-rest şifreleme, okuma maskelemesi ya da filtre reddi uygulanmaz; değer client'ın gönderdiği haliyle (ciphertext) saklanır ve döner. Bu yüzden `source: client` kuralı master şema dahil her şemada kabul edilir ve `x-filterOperators` / `x-sortable` ile çakışma kuralları ona uygulanmaz. Publish'te yalnız alanlar doğrulanır; örneğin `key` eksikse: `x-encryption.key is required for source 'client': the address of the recipient's public key.`

:::note `x-encrypt`
Daha önce önerilen `x-encrypt` keyword'ü hiçbir sürümde yayımlanmadı. Client tarafı şifreleme için `x-encryption` + `"source": "client"` kullanın; `x-encrypt` paket doğrulamasında reddedilir.
:::

#### Okuma sırası

Okuma yüzeylerinde dönüşümler sırayla uygulanır: önce `x-roles` (yetkisiz alan budanır), sonra `x-masking`, sonra `x-encryption` (yalnız `source: runtime` kuralları), en son `x-computed` (`evaluatedBy: runtime`, <sup>New</sup> v0.0.100). Computed alanlar bu üç adımdan geçmiş görünüm üzerinden hesaplanır.

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
| `source` <sup>New</sup> v0.0.100 | Yalnız `runtime` veya `client` (büyük/küçük harf duyarlı) |
| Dalların karıştırılması | Runtime kuralında client alanları (`key`, `algorithm`, `into`, `encoding`, `nonce`, `envelope`), client kuralında at-rest alanları (`type`, `params`, `roles`, `redactInLogs`, `retentionDays`) reddedilir |
| `source: client` | `key` ve `algorithm` zorunlu. Yukarıdaki string / yerleşim / sorgu keyword'ü kuralları uygulanmaz; master dahil her şemada kabul edilir |
| `x-filterOperators` <sup>New</sup> v0.0.100 | Sorgu token'ları, bilinmeyen ve tekrar eden değerler reddedilir; bkz. [`x-filterOperators`](#x-filteroperators--filtrelenebilir-operatörler-bilgi-amaçlı) |

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

### `x-storage` — Dosya Alanı (Blob Deposuna Taşıma)

Master schema'daki bir özelliğin (ya da bir dizi özelliğin `items` şemasının) baytlarını instance verisi yerine bir Dapr output binding'e (blob deposu) yazdırır; kayıtta yalnızca küçük bir handle kalır.

```json
"identityDocument": { "type": "object", "x-storage": { "binding": "vnext-blob-local" } },
"files": { "type": "array", "items": { "type": "object", "x-storage": { "binding": "vnext-blob-s3" } } }
```

`binding` zorunlu, boş olmayan bir string'dir ve orchestration sidecar'ında yüklü bir binding bileşenini adlandırır; `x-storage` başka alan kabul etmez. Yalnızca master rolünde geçerlidir ve yalnızca iç içe `properties` ile erişilen yollarda (ya da öyle erişilen **tek seviyeli** bir dizinin `items` şemasında) izinlidir; kökte, başka bir dosya düğümünün içinde, `$defs`, birleştiriciler, koşullular ve iç içe dizilerde publish hatasıdır. Özellik şeması **kalıcı** şekli tanımlar: `properties`/`required` altında `content` bildirmek publish hatasıdır. Client tarafı gidiş-dönüş, handle şekli ve durum kodları için bkz. [Dosya Alanları](../file-fields).

---

### `x-computed` — Hesaplanan Alan

<sup>New</sup> v0.0.100 / vnext-schema 0.0.56 — Master şemada **türetilmiş, hiç saklanmayan** bir alan tanımlar. Değer, aynı nesnedeki kardeş property'lerden bir birleştirme (`join`) ya da aritmetik işlemle (`arithmetic`) üretilir.

```json
"customer": {
  "type": "object",
  "properties": {
    "firstName": { "type": "string" },
    "lastName": { "type": "string" },
    "companyName": { "type": "string" },
    "customerType": { "type": "string", "enum": ["individual", "corporate"] },
    "displayName": {
      "type": "string",
      "readOnly": true,
      "x-computed": {
        "evaluatedBy": "runtime",
        "cases": [
          {
            "when": { "field": "customerType", "operator": "equals", "value": "corporate" },
            "join": { "fields": ["companyName"] }
          }
        ],
        "fallback": { "join": { "fields": ["firstName", "lastName"], "separator": " " } },
        "whenAbsent": "empty"
      }
    },
    "principal": { "type": "number" },
    "interest": { "type": "number" },
    "totalDue": {
      "type": "number",
      "readOnly": true,
      "x-computed": {
        "evaluatedBy": "runtime",
        "fallback": { "arithmetic": { "op": "add", "fields": ["principal", "interest"] } },
        "whenAbsent": "null"
      }
    }
  }
}
```

| Alan | Açıklama |
|------|----------|
| `evaluatedBy` | `runtime`: runtime her okuma yüzeyinde hesaplar. `client`: client bu tanımdan kendisi hesaplar; runtime içeriğe dokunmaz. `server` değeri yeniden adlandırıldı ve reddedilir |
| `cases` | Opsiyonel, boş olmayan dizi. Her case: opsiyonel `when` (bir condition) ve tam olarak bir `join` veya `arithmetic`. `when`'i sağlanan **ilk** case kazanır |
| `fallback` | Opsiyonel. Hiçbir case eşleşmezse kullanılır; tam olarak bir `join` veya `arithmetic` içerir. `cases` ve `fallback`'ten en az biri olmalıdır |
| `whenAbsent` | Sonuç çözümlenemediğinde dönen değer: `empty` (varsayılan, `""`) veya `null` |

| İşlem | Şekil | Davranış |
|-------|-------|----------|
| `join` | `{ "fields": [...], "separator": " " }` — `fields` ≥ 1; `separator` varsayılanı tek boşluk | Mevcut ve boş olmayan değerleri sırayla birleştirir; eksik/boş alanlar atlanır. Hiç değer yoksa sonuç çözümlenemez |
| `arithmetic` | `{ "op": "add" \| "subtract" \| "multiply" \| "divide", "fields": [...] }` — `fields` ≥ 2 | JSON sayıları üzerinde decimal hesap, soldan sağa. Eksik ya da sayısal olmayan operand, sıfıra bölme veya taşma sonucu çözümlenemez yapar |

`when` condition'ı `x-conditional` ile aynı yapıdadır: `{ "field", "operator", "value" }` ya da `allOf` / `anyOf` / `not`; operatörler `equals`, `notEquals`, `in`, `notIn`, `isEmpty`, `isNotEmpty`, `contains`, `greaterThan`, `lessThan`, `greaterThanOrEquals`, `lessThanOrEquals`, `startsWith`, `endsWith`. `fields` ve `when.field` yolları computed property'yi taşıyan nesneye görelidir (iç içe üye için noktalı yol yazılabilir). Üst nesnesi veride bulunmayan bir computed alan atlanır, yaratılmaz.

**Runtime (`evaluatedBy: runtime`) davranışı:**

- Flag yoktur, her zaman açıktır.
- Instance verisi dönen her okuma yüzeyinde hesaplanır: instance GET ve liste, data function, data geçmişi, senkron start/transition yanıtı, GetInstance / GetInstances / GetInstanceData task'leri.
- Hesap, çağıranın **zaten gördüğü** görünüm üzerinden yapılır (`x-roles` → `x-masking` → `x-encryption` sonrası). Bu yüzden computed bir değer, çağıranın göremediği bir alanı açığa çıkaramaz.
- Değer **hiç saklanmaz**: yazma sırasında istekte gelen computed alan atılır. Bilinen kısıt: transition kaydı (`InstanceTransitions.Body`) istek gövdesini gönderildiği haliyle tutar.
- Saklanmadığı için filtre, sıralama ve index'te kullanılamaz.

**Publish kuralları (`evaluatedBy: runtime`)** — ihlal edilen kural şu mesajlarla reddedilir (`Field '<yol>': ...` önekiyle):

| Kural | Hata mesajı |
|-------|-------------|
| `server` değeri | `x-computed.evaluatedBy 'server' has been renamed; use 'runtime'.` |
| Geçersiz `evaluatedBy` | `x-computed.evaluatedBy must be 'runtime' or 'client'.` |
| `transition` / `function` / `component` type'lı şema | `x-computed evaluatedBy 'runtime' is evaluated on the master schema's data; a '<type>' schema is a request or component contract — use evaluatedBy 'client'.` |
| Yerleşim: yalnız iç içe `properties` | `x-computed evaluatedBy 'runtime' is only supported on a property reachable through nested 'properties'; it is not evaluated at the root, under items, $defs, combinators or conditional schemas.` |
| `cases` ya da `fallback` yok | `x-computed needs 'cases' or a 'fallback'.` |
| Case/fallback'te ikisi birden ya da hiçbiri | `x-computed.cases[0] must declare exactly one of 'join' or 'arithmetic'.` |
| Geçersiz `op` | `x-computed.cases[0].arithmetic.op must be 'add', 'subtract', 'multiply' or 'divide'.` |
| Geçersiz `whenAbsent` | `x-computed.whenAbsent must be 'empty' or 'null'.` |
| `required` içinde | `a field with x-computed evaluatedBy 'runtime' is never stored and cannot be 'required'.` |
| `x-indexed` ile | `x-computed cannot be combined with x-indexed; the index is built from stored data and a computed field is never stored.` |
| `x-filterOperators` ile | `x-computed cannot be combined with x-filterOperators; list filters run on stored data and a computed field is never stored.` |
| `x-sortable` ile | `x-computed cannot be combined with x-sortable; sorting runs on stored data and a computed field is never stored.` |
| `x-storage` ile | `x-computed cannot be combined with x-storage.` |
| `x-roles` / `x-masking` ile | `x-computed cannot be combined with x-roles; the value is computed from what the caller already sees, so it takes no visibility rule of its own.` |
| At-rest `x-encryption` ile | `x-computed cannot be combined with an at-rest x-encryption; a computed field is never stored.` |
| Kardeş olmayan alan | `x-computed.fallback.join references 'x', which is not a property of the same object.` |
| Zincir | `... references 'x', which is itself a runtime computed field; computed fields do not chain.` |
| At-rest şifreli alan | `... references 'x', which is encrypted at rest; a caller who is not exempt would see the token in the computed value.` |

`evaluatedBy: client` için runtime yalnız `evaluatedBy` değerini doğrular; içeriği client'ın sözleşmesidir. Paket doğrulamasında `x-computed` her iki modda da yalnız master rolünde kabul edilir (bkz. [Şema Rolleri](/docs/concepts/schema-roles)).

---

### `x-filterOperators` — Filtrelenebilir Operatörler (Bilgi Amaçlı)

Bir alanın hangi filtre operatörleriyle sorgulanabileceğini belirler. **Boş veya yok ise alan filtrelenemez.** Genellikle master şemada tanımlanır; instance listeleme/sorgulama davranışını besler.

```json
"startDateTime": {
  "type": "string",
  "format": "date-time",
  "x-filterOperators": ["eq", "gt", "gte", "lt", "lte", "between"]
}
```

İzin verilen değerler (beyan adları): `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `between`, `contains`, `startsWith`, `endsWith`, `in`, `nin`, `isNull`, `includes`. <sup>New</sup> v0.0.100 — Sorgu token'ları (`ne`, `ge`, `le`, `like`, `match`, `startswith`, `endswith`, `isnull`), büyük/küçük harf varyantları, bilinmeyen ve tekrar eden değerler **publish'te reddedilir**; örneğin `Field 'startDateTime': x-filterOperators value 'ge' is not a declaration name; declare 'gte'.` Sorgu sözdizimi değişmedi: istemciler `ge`, `like` gibi token'ları göndermeye devam eder. Eşleme tablosu, operatörlerin alan tipine göre davranışı ve kurallar için bkz. [Instance Filtering → Şema beyanı ve sorgu token'ı](/docs/how-to/instance-filtering#şema-beyanı-ve-sorgu-tokenı).

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
- Hangi uzantının hangi şema rolünde geçerli olduğu → [Şema Rolleri](/docs/concepts/schema-roles)
