---
sidebar_position: 7
title: Schema
description: vNext Schema component — workflow ve transition data validation, master-data
---

# Schema

**Schema** bileşeni, **transition**, **flow** ve **master-data** için JSON şema tanımıdır. Hem ön uçta hem arka uçta istekler doğrulanır ve **instance data tutarlılığı** korunur.

> **Schema kaynağı:** [`vnext-schema/schema-definition.schema.json`](https://github.com/burgan-tech/vnext-schema)

## Tanım JSON Örneği

> **Schema:** `schema-definition.schema.json`

```json
{
  "key": "account-type-selection",
  "version": "1.0.0",
  "domain": "banking",
  "flow": "sys-schemas",
  "flowVersion": "1.0.0",
  "tags": ["banking", "account", "selection"],
  "_comment": "Hesap türü seçimi için transition schema",
  "attributes": {
    "type": "workflow",
    "schema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "$id": "https://schemas.vnext.com/banking/account-type-selection.json",
      "title": "Account Type Selection",
      "description": "Schema for account type selection input",
      "type": "object",
      "required": ["accountType"],
      "properties": {
        "accountType": {
          "type": "string",
          "title": "Account Type",
          "description": "Type of account to be opened",
          "oneOf": [
            { "const": "demand-deposit", "description": "Vadesiz Hesap" },
            { "const": "time-deposit", "description": "Vadeli Hesap" },
            { "const": "savings-account", "description": "Tasarruf Hesabı" }
          ]
        }
      },
      "additionalProperties": false
    },
    "labels": [
      { "label": "Account Type Selection", "language": "en-US" },
      { "label": "Hesap Türü Seçimi", "language": "tr-TR" }
    ]
  }
}
```

---

## Kullanım Türleri

| Tür | Atandığı Yer | Amacı |
|---|---|---|
| **Master Schema** | Workflow root (`attributes.schema`) | Instance data ana yapısı; her değişimde tutarlılık kontrolü |
| **Transition Schema** | Transition tanımı | Transition request body validation |

---

## Master Schema Davranışı

Master schema, flow'un kendisine tanımlanır ve **instance data'nın şablon yapısını** belirler. Amacı yalnızca doğrulama değil; aynı zamanda `x-roles` (alan bazlı yetkilendirme), `x-encryption`, `x-lookup` gibi vNext özelliklerini ve **instance filtering**'i etkin kılmaktır. Bir instance data merge uygulandığında flow'da master schema tanımlıysa runtime bunu valide eder; uygun değilse isteği **reject** eder.

:::caution[required kullanmayın, additionalProperties: true olmalı]
Instance data her state'de merge ile **genişler** ve farklı seviyelerde yeni alanlar kazanır. Bu nedenle master schema'da:

- **`required` kullanılmamalıdır** — aksi halde henüz oluşmamış alanlar erken merge'lerde reddedilir.
- **`additionalProperties: true` olmalıdır** — verinin genişlemesine izin verecek şekilde.

Zorunluluk ve sıkı doğrulama, master schema'da değil **transition schema**'larında (request body validation) yapılmalıdır.
:::

Buna karşılık master schema'da **`pattern`**, ana omurga şablonu, vocabulary tanımları (`x-*`) ve filtering tanımları kıymetlidir ve korunmalıdır.

### Filtering ve Data Function'daki Rolü

Data Function veriyi response ederken master schema **aktif rol alır**. [Instance filtering](/docs/how-to/instance-filtering) sırasında, instance data gibi dinamik alanların **tiplerini şemadan çözerek** gelişmiş (advance) filtre esnekliği kazandırır. Master schema olmadan dinamik alanlarda tip-duyarlı filtreleme mümkün olmaz.

Alan bazlı görünürlük, master şema property'lerinde **`x-roles`** keyword'ü ile tanımlanır (aşağıda); bkz. [Yetkilendirme → Master Şema Alan Görünürlüğü](/docs/concepts/authorization#master-şema-alan-bazlı-görünürlük).

### Alan Bazlı Yetkilendirme: `x-roles`

`x-roles`, bir JSON Schema property'sine (instance data field'ı) **rol değerlendirmesi (role evaluation)** ile yetkilendirme uygulayan vocabulary keyword'üdür. Özellikle **master şemada** önem kazanır: hangi field'ların kime görünür olacağını `x-roles` belirler — yani **alan (column) seviyesinde güvenlik** sağlar. Data Function ve veri dönen endpoint'ler authorize katmanını çalıştırıp yalnızca çağıranın görmesine izinli alanları döndürür.

```json
{
  "x-roles": [
    { "role": "morph-idm.initiator", "grant": "allow" },
    { "role": "$userBehalfOf.$.context.Instance.Data.initial.customer.ownerUserId", "grant": "deny" }
  ]
}
```

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `x-roles` | array | — | Property için rol grant listesi (`minItems: 1`). Tanımlı değilse field tüm yetkili çağıranlara görünür |
| `role` | string | **Evet** | Domain-qualified rol adı (ör. `morph-idm.initiator`) **veya** dinamik JSONPath ifadesi (ör. `$userBehalfOf.$.context...`) |
| `grant` | string | **Evet** | `allow` veya `deny`. **DENY her zaman ALLOW'u geçersiz kılar** |

`role` değeri statik bir ad ya da JSONPath ifadesi olabilir; sistem rolleri (`$InstanceStarter` vb.) ve JSONPath grant prefiksleri (`$user.` / `$userBehalfOf.` / `$role.`) burada da geçerlidir. Bu kalıpların çözümleme semantiği için bkz. [Yetkilendirme](/docs/concepts/authorization).

`x-encryption` de aynı alan-yönetişim kapsamındadır; bir field'ın şifreleme tipini (`persisted` / `transport`) belirtir. Tüm property seviyesi `x-*` uzantılarının ayrıntısı için bkz. [Schema Tanımı](/docs/how-to/view-consept/schema-tanimi).

### View ile Kullanımı

- **Read-only view** (girdi yoksa): master schema doğrudan view'a `dataSchema` olarak verilebilir; mevcut durumu özetleyen ekranlar için yeterlidir.
- **Girdi içeren view**: girdi alınan kısımlarda master schema değil, **transition'a özel schema** kullanılmalıdır.

vNext vocabulary'sinin (`x-labels`, `x-lov`, `x-lookup`, `x-conditional`, `x-encryption` vb.) ayrıntılı anlatımı için bkz. [Pseudo UI → Schema Tanımı](/docs/how-to/view-consept/schema-tanimi).

---

## Properties

### Top-Level Alanlar

| Alan | Tip | Zorunlu | Pattern / Kısıt | Açıklama |
|------|-----|---------|-----------------|----------|
| `$schema` | string | Hayır | — | JSON Schema referansı |
| `key` | string | **Evet** | `^[a-z0-9-]+$` | Schema'nın benzersiz tanımlayıcısı |
| `version` | string | **Evet** | `^\d+\.\d+\.\d+(-[a-zA-Z]+\.\d+)?$` | Semantic versioning (Major.Minor.Patch) |
| `domain` | string | **Evet** | `^[a-z0-9-]+$` | Schema'nın ait olduğu domain |
| `flow` | string | **Evet** | Sabit: `sys-schemas` | Flow tanımlayıcısı |
| `flowVersion` | string | **Evet** | `^\d+\.\d+\.\d+(-[a-zA-Z]+\.\d+)?$` | Flow versiyonu |
| `tags` | string[] | **Evet** | `minItems: 1` | Kategorilendirme ve arama etiketleri |
| `_comment` | string | Hayır | — | Açıklama / yorum |
| `attributes` | object | **Evet** | — | Schema davranış tanımı (aşağıda) |

### `attributes` Alanları

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `type` | string | **Evet** | Schema tipi — aşağıdaki enum tablosuna bakın |
| `schema` | object | **Evet** | JSON Schema tanımı (Draft 2020-12). Aşağıdaki iç yapı tablosuna bakın |
| `labels` | array | Hayır | Çoklu dil etiketleri. Her öğe: `label` (string) + `language` (pattern: `^[a-z]{2}-[A-Z]{2}$`) |

### `attributes.type` Enum Değerleri

| Değer | Açıklama |
|-------|----------|
| `workflow` | Workflow bileşeni tanımı |
| `task` | Task bileşeni tanımı |
| `function` | Function bileşeni tanımı |
| `view` | View bileşeni tanımı |
| `schema` | Schema bileşeni tanımı |
| `extension` | Extension bileşeni tanımı |
| `headers` | Headers schema tanımı |

### `attributes.schema` İç Yapısı (JSON Schema)

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `$schema` | string | **Evet** | JSON Schema spesifikasyon versiyonu. Sabit: `https://json-schema.org/draft/2020-12/schema` |
| `$id` | string | **Evet** | Schema tanımlayıcı URI'si |
| `title` | string | **Evet** | Schema başlığı (`minLength: 1`) |
| `type` | string | **Evet** | JSON tipi: `object`, `array`, `string`, `number`, `integer`, `boolean`, `null` |
| `description` | string | Hayır | Schema açıklaması |
| `properties` | object | Hayır | Obje property tanımları |
| `required` | string[] | Hayır | Zorunlu property listesi |
| `additionalProperties` | boolean | Hayır | Ek property'lere izin verilip verilmeyeceği |
| `items` | object | Hayır | Array elemanları schema tanımı |
| `enum` | array | Hayır | İzin verilen sabit değerler listesi |
| `oneOf` | array | Hayır | Alternatif schema seçenekleri (tam bir eşleşme) |
| `anyOf` | array | Hayır | Alternatif schema seçenekleri (en az bir eşleşme) |
| `allOf` | array | Hayır | Tüm schema gereksinimleri (tümü eşleşmeli) |
| `if` / `then` / `else` | object | Hayır | Koşullu schema tanımları |
| `format` | string | Hayır | String format doğrulaması (örn. `email`, `date-time`, `uri`) |
| `pattern` | string | Hayır | String regex doğrulaması |
| `minimum` / `maximum` | number | Hayır | Sayısal değer aralığı |
| `minLength` / `maxLength` | integer | Hayır | String uzunluk aralığı |
| `minItems` / `maxItems` | integer | Hayır | Array eleman sayısı aralığı |
| `const` | any | Hayır | Sabit değer |
| `default` | any | Hayır | Varsayılan değer |

Standart JSON Schema alanlarına ek olarak, property seviyesinde vNext **`x-*` vocabulary uzantıları** desteklenir — alan bazlı yetkilendirme (`x-roles`), şifreleme (`x-encryption`), etiketleme (`x-labels`), LOV (`x-lov`), lookup (`x-lookup`), koşullu görünürlük (`x-conditional`) vb. Tam liste ve örnekler için bkz. [Schema Tanımı](/docs/how-to/view-consept/schema-tanimi).

---

## Validation

Schema'lar **Ajv2019** ile doğrulanır. Front-end'de form validation için annotation'lar kullanılabilir; back-end'de transition/start request'lerinde otomatik valide edilir.

- Frontend: form annotation, real-time validation
- Backend: request body validation, instance data merge validation
- CI/CD: schema kendisi `vnext-schema` repo'da merkezi olarak doğrulanır

## Tipik Kullanım Senaryoları

- **Master schema** ile instance data'nın **immutable** ve **versionable** kalmasını garanti et
- **Transition schema** ile her transition için farklı request body validation

## İlgili

- [Instance Data](/docs/concepts/instance-data) — instance veri yapısı
- [Workflow component](/docs/components/workflow) — `attributes.schema` master schema referansı
- [Pseudo UI → Schema Tanımı](/docs/how-to/view-consept/schema-tanimi) — vNext vocabulary (`x-labels`, `x-lov`, `x-lookup`, `x-conditional`, `x-encryption`)
- [Yetkilendirme](/docs/concepts/authorization) — master şema alan bazlı görünürlük
- [Instance Filtering](/docs/how-to/instance-filtering) — master schema ile tip-duyarlı filtreleme
- [Mappings](/docs/components/mappings) — transition ve mapping kullanımı
- Schema kaynağı: [vnext-schema (GitHub)](https://github.com/burgan-tech/vnext-schema)
