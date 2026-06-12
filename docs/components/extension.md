---
sidebar_position: 5
title: Extension
description: vNext Extension component — instance data zenginleştirme mekanizması
---

# Extension

**Extension** bileşeni, **instance data zenginleştirme** için kullanılır. Data Function ve `GetInstanceData` endpoint'lerinde extension'lar çağrılır ve sonuçları response'da `extensions` objesinde yer alır.

> **Schema:** [`vnext-schema/extension-definition.schema.json`](https://github.com/burgan-tech/vnext-schema)

## Extension Stratejisi

Extension'lar instance data'ya **ek olarak** zenginleştirilmiş veri sunar. Temel amaç, client'ın veya view render eden yapıların **BFF ihtiyacını azaltmaktır**: instance data dönülürken, view'ın o anda ihtiyaç duyduğu veri extension ile birlikte zenginleştirilmiş halde sunulur, böylece client ek çağrılar yapmak zorunda kalmaz.

Bir extension veriyi iki yoldan üretebilir:

- **Mevcut instance data üzerinden hesaplama** — normalize/denormalize, türetilmiş (computed) alanlar.
- **Uzak (remote) task call** — dış sistemden veri çekerek instance verisine ekleme.

Her iki durumda da extension, instance data'yı kıymetlendirerek client'ın **anlık veri ihtiyacını** karşılar. Örneğin bir view render edilirken uzak bir sunucudan belirli bir veriyi alıp göstermek o state için gerekliyse, extension kullanımı uygundur.

:::tip[Extension mı, Function mı?]
- **Extension** → instance data **okunurken** otomatik zenginleştirme (view'ın hazır veriyle gelmesi, BFF azaltma).
- **Function** → form girdilerini besleyen `x-lov` (liste) ve `x-lookup` (tekil kayıt) gibi **girdi odaklı** veri kaynakları için daha uygundur. Bkz. [Functions](/docs/components/functions/) ve [Pseudo UI → Data Akışı](/docs/how-to/view-consept/data-akisi).
:::

## Tanım JSON Örneği

> **Schema:** `extension-definition.schema.json`

```json
{
  "key": "extension-customer-detail",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-extensions",
  "flowVersion": "1.0.0",
  "tags": ["core", "customer", "enrichment"],
  "_comment": "Müşteri detay bilgisini instance verisine ekleyen extension",
  "attributes": {
    "type": 3,
    "scope": 1,
    "task": {
      "order": 1,
      "task": {
        "key": "get-customer-detail",
        "domain": "core",
        "flow": "sys-tasks",
        "version": "1.0.0"
      },
      "mapping": {
        "type": "L",
        "location": "./src/CustomerDetailMapping.csx",
        "code": "<BASE64_ENCODED_CODE>",
        "encoding": "B64"
      }
    },
    "labels": [
      { "label": "Customer Detail", "language": "en-US" },
      { "label": "Müşteri Detay", "language": "tr-TR" }
    ]
  }
}
```

---

## Kullanım Modeli

Bir instance veri sorgulandığında veya bir Data Function çağrıldığında, workflow tanımındaki `extensions` listesi çalıştırılır ve sonuçlar response'a eklenir:

```json
{
  "id": "...",
  "key": "...",
  "metadata": { },
  "attributes": { },
  "extensions": {
    "customerDetail": { },
    "creditHistory": { }
  }
}
```

Her extension key'i, `extensions` objesinde **camelCase** property olarak yer alır (örn. `customer-detail` → `customerDetail`) ve içeriği extension'ın döndürdüğü veridir.

---

## Properties

### Top-Level Alanlar

| Alan | Tip | Zorunlu | Pattern / Kısıt | Açıklama |
|------|-----|---------|-----------------|----------|
| `$schema` | string | Hayır | URI formatı | JSON Schema referansı |
| `key` | string | **Evet** | `^[a-z0-9-]+$` | Extension'ın benzersiz tanımlayıcısı (response'da camelCase property adı olur) |
| `version` | string | **Evet** | `^\d+\.\d+\.\d+(-[a-zA-Z]+\.\d+)?$` | Semantic versioning (Major.Minor.Patch) |
| `domain` | string | **Evet** | `^[a-z0-9-]+$` | Extension'ın ait olduğu domain |
| `flow` | string | **Evet** | Sabit: `sys-extensions` | Flow tanımlayıcısı |
| `flowVersion` | string | **Evet** | `^\d+\.\d+\.\d+(-[a-zA-Z]+\.\d+)?$` | Flow versiyonu |
| `tags` | string[] | **Evet** | `minItems: 1` | Kategorilendirme ve arama etiketleri |
| `_comment` | string | Hayır | — | Açıklama / yorum |
| `attributes` | object | **Evet** | — | Extension davranış tanımı (aşağıda) |

### `attributes` Alanları

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `type` | integer | **Evet** | Extension tipi — aşağıdaki enum tablosuna bakın |
| `scope` | integer | **Evet** | Extension kapsamı — aşağıdaki enum tablosuna bakın |
| `task` | object | **Evet** | Extension'ın çalıştıracağı task tanımı (aşağıda) |
| `labels` | array | Hayır | Çoklu dil etiketleri. Her öğe: `label` (string) + `language` (pattern: `^[a-z]{2}-[A-Z]{2}$`) |

### `attributes.type` Enum Değerleri

| Değer | Ad | Açıklama |
|-------|----|----------|
| `1` | **Global** | Tüm akışlarda kayıt örnekleri dönerken çalışır |
| `2` | **GlobalAndRequested** | Tüm akışlarda ve kayıt örnekleri talep edildiğinde çalışır |
| `3` | **DefinedFlows** | Yalnızca tanımlandığı akışlarda çalışır |
| `4` | **DefinedFlowAndRequested** | Tanımlandığı akışlarda ve talep edildiğinde çalışır |

### `attributes.scope` Enum Değerleri

| Değer | Ad | Açıklama |
|-------|----|----------|
| `1` | **GetInstance** | `{domain}/workflows/{workflow}/instances/{instance}` endpoint'inde çalışır |
| `2` | **GetAllInstances** | `{domain}/workflows/{workflow}/instances` endpoint'inde çalışır |
| `3` | **Everywhere** | Tüm get endpoint'lerinde çalışır |

### `task` Yapısı

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `order` | integer | **Evet** | Task çalışma sırası (`minimum: 1`) |
| `task` | object | **Evet** | Task referansı — explicit (`key`, `domain`, `flow`, `version`) veya ref (`ref`) |
| `mapping` | object | **Evet** | Mapping kodu tanımı (aşağıda) |

### Mapping

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `type` | string | Hayır | `L` | `G` = Global, `L` = Local. Global ise `code` gerekmez |
| `location` | string | Hayır | — | Kod dosyası yolu (pattern: `^\.\/.*\.csx$`) |
| `code` | string \| object | **Koşullu** | — | Mapping kodu. `type` = `L` ise zorunlu. `encoding: "REF"` ise string yerine bir sys-mappings referans objesi (`{key, version, domain, flow}`) |
| `encoding` | string | Hayır | `B64` | Kodlama formatı: `B64` (Base64), `NAT` (Native) veya `REF` (sys-mappings referansı) |
| `scripts` <sup>New</sup> | object | Hayır | — | Helper referansları (`helpers[]`) ve izinli assembly'ler (`allowedAssemblies[]`) — bkz. [Mapping Bileşeni](/docs/components/mapping-component) |

---

## Tipik Kullanım Senaryoları

- **Customer enrichment**: müşteri ID'sinden tam müşteri bilgisi
- **Credit history**: instance ile ilişkili kredi geçmişi
- **External system data**: dış sistemlerden veri çekme
- **Computed fields**: instance verisi üzerinden hesaplanan alanlar

## İlgili

- [Functions](/docs/components/functions/) — function bileşenleri
- [Built-in Functions](/docs/components/functions/built-in) — Data Function entegrasyonu
- Schema kaynağı: [vnext-schema (GitHub)](https://github.com/burgan-tech/vnext-schema)
