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
  "$id": "urn:amorphie:res:schema:customer:registration-form",
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
    "source": "urn:amorphie:func:domain:shared:get-cities",
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
    "source": "urn:amorphie:func:domain:shared:get-districts",
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

LOV birden çok satır döndürürken, `x-lookup` seçilen bir değere göre tek bir nesne döndürür. Seçilen şubenin adres ve iletişim bilgileri gibi detayları çekmek için kullanılır.

```json
"branchDetail": {
  "type": "object",
  "x-lookup": {
    "source": "urn:amorphie:func:domain:shared:get-branch-detail",
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

### `x-encryption` — Şifreleme (Bilgi Amaçlı)

Tasarımcı bu alanı değiştirmez; ancak ekranda göreceğiniz bazı alanlarda şifreleme tipi belirtilmiş olabilir.

```json
"tckn": {
  "x-encryption": { "type": "persisted" }
}
```

| Değer | Anlam |
|-------|-------|
| `"persisted"` | Veritabanında şifreli saklanır |
| `"transport"` | Sadece iletim sırasında şifrelenir |

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
