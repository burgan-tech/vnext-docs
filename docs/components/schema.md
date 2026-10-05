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

**Attribute index hazırlığı (`x-indexed`)** <sup>New</sup> v0.0.94 — Master şema (`attributes.type` değeri tam olarak `master` olan schema bileşeni) içindeki skaler alanlar `x-indexed: true` ile **manuel index hazırlığına** dahil edilebilir. Runtime bu işaretten index üretmez; `wf indexes generate` CLI komutu SQL üretir, DBA çalıştırır ve runtime `AttributeIndexes` etkinse `AttributeIndexCatalog` üzerinden bu kolonları filtre/sıralama sorgularında kullanır. `x-indexed` bir izin değildir: alanın filtrelenebilirliği yine `x-filterOperators` / `x-sortable` ile belirlenir. Master olmayan bir şemada `x-indexed` (değeri `false` olsa bile) publish sırasında reddedilir. Ayrıntı: [Attribute Index'leri](/docs/how-to/attribute-indexes).

### Filtering ve Data Function'daki Rolü

Data Function veriyi response ederken master schema **aktif rol alır**. [Instance filtering](/docs/how-to/instance-filtering) sırasında, instance data gibi dinamik alanların **tiplerini şemadan çözerek** gelişmiş (advance) filtre esnekliği kazandırır. Master schema olmadan dinamik alanlarda tip-duyarlı filtreleme mümkün olmaz. Bir alanın hangi operatörlerle filtrelenebileceği ve sıralanabilirliği `x-filterOperators` / `x-sortable` ile bildirilir (aşağıda).

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

v0.0.99 ile bir `x-roles` girdisi tek `role` yerine `allOf` / `anyOf` kombinatörü de olabilir (`{ "allOf": [ { "role": "..." }, ... ], "grant": "allow" }`); bkz. [Yetkilendirme → Kombinatörler](/docs/concepts/authorization#kombinatörler-allof--anyof). Hatalı `x-roles` girdileri artık publish'te reddedilir.

`x-masking` (v0.0.99) değeri düz saklar ve okuma sırasında dönüştürür: `operator: "mask"` (`keepFirst`, `keepLast`, `maskingChar`; çıktı girdiyle aynı uzunlukta) veya `operator: "replace"` (`params.value`). `roles` yalnızca `allow` kabul eden muafiyet listesidir (kombinatör kabul edilmez); eşleşen çağıran ham değeri görür. Okuma sırası `x-roles` → `x-masking` → `x-encryption`'dır; `x-masking` / `x-encryption` yalnızca iç içe `properties` altındaki `type: "string"` alanlarda, alan başına tek dönüşüm olarak ve `x-filterOperators` / `x-sortable` / `x-indexed` olmadan kullanılabilir.

`x-encryption` de aynı alan-yönetişim kapsamındadır: `hash` değeri yazarken instance'a özgü tuzla özetler (veritabanında özet saklanır), `encrypt` değeri instance data'da AES-256-GCM ile şifreli saklar ve okuma yüzeylerinde (instance GET, liste, data function, senkron yanıt, Get* task'leri — task'ler sundukları başlık setiyle) yalnızca `allow` muafiyet rolleri için çözer (`persisted` / `transport` kaldırıldı). Script'ler encrypt alanı jeton olarak görür ve `context.Instance.DecryptAsync(path)` ile açar. Tüm property seviyesi `x-*` uzantılarının ayrıntısı için bkz. [Schema Tanımı](/docs/how-to/view-consept/schema-tanimi).

### Filtreleme & Sıralama Vocabulary'si

Bir JSON (`attributes.*`) alanının **filtrelenip sıralanabilirliği** master şemada üç keyword ile bildirilir. Data Function ve instance listeleme endpoint'leri (`.../instances?filter=`, `.../functions/data`) bu vocabulary'e göre çalışır:

| Keyword | Tip | Zorunlu | Açıklama |
|---------|-----|---------|----------|
| `x-filterOperators` | string[] | Hayır | İzin verilen filtre operatörleri. **Boş veya yok ise alan filtrelenemez** |
| `x-sortable` | boolean | Hayır | `true` ise alan sıralanabilir. Yok ise sıralanabilir değil |
| `x-displayFormat` | string | Hayır | UI'a yönelik format ipucu (örn. `yyyy-MM-dd'T'HH:mm:ssXXX`) |
| `x-indexed` <sup>New</sup> v0.0.94 | boolean | Hayır | **Yalnızca master şemada** (`attributes.type: "master"`). `true` ise alan, `wf indexes generate` ile üretilen SQL'de stored generated column + index adayı olur. Sadece sabit `properties` yolları altındaki skaler `string` / `number` / `integer` / `boolean` alanlarda; dizi, obje, `$ref` ve koşullu/birleşik düğümlerde reddedilir. **İzin değildir** — filtre/sıralama yetkisini değiştirmez. Bkz. [Attribute Index'leri](/docs/how-to/attribute-indexes) |

**`x-filterOperators` değerleri:** `eq`, `ne`, `gt`, `ge`, `lt`, `le`, `between`, `match`, `like`, `startswith`, `endswith`, `in`, `nin` (`uniqueItems`).

```json
"startDateTime": {
  "type": "string",
  "format": "date-time",
  "x-filterOperators": ["eq", "gt", "ge", "lt", "le", "between"],
  "x-sortable": true,
  "x-displayFormat": "yyyy-MM-dd'T'HH:mm:ssXXX"
}
```

**Kurallar (özet):**

- `x-filterOperators` dolu ise alan filtrelenebilir; boş/yok ise filtrelenemez.
- `x-sortable: true` değilse alan sıralanamaz.
- Filtrelenemez bir alan veya izin verilmeyen bir operatör kullanıldığında **`SchemaFilterValidationException`** fırlatılır.

Operatörlerin alan tipine göre (numeric / tarih / metin / boolean / dizi) davranışı, JSON dizi alanları için `includes` operatörü ve `SchemaFilterValidationException` ayrıntıları için bkz. [Instance Filtering → Şema-Tabanlı Filtrelenebilirlik](/docs/how-to/instance-filtering#şema-tabanlı-filtrelenebilirlik-ve-sıralama).

### Data Context Vocabulary (data-vocab)

> **Vocabulary:** `vnext-schema/vocabularies/data-vocab.json`

`data-vocab`, **şema güdümlü client context-store bağlama** için iki anotasyon tanımlar. Amaç: generic bir client'ın, akış başına özel kod yazmadan — yalnızca backend şemalarından — girdi alanlarını client context-store'undan çözmesi ve yeniden kullanılabilir çıktıları oraya geri yazması.

| Anotasyon | Nerede tanımlanır | Yön | Ne zaman uygulanır |
|---|---|---|---|
| `x-context-source` | Transition input şemasının bir property'sinde | context-store → input | Start/transition payload'ı oluşturulurken |
| `x-context-target` | Workflow **master şemasında** | instance data → context-store | Her instance okumasında (start sonucu, her transition sonrası) |

**`x-context-source`** — property'yi **client tarafından çözülen** bir alan olarak işaretler; client bu alan için form field'ı render etmez. Değer üç kaynaktan birinden gelir:

| Form | Anlamı |
|---|---|
| `{ "const": <değer> }` | Şemaya gömülü literal değer (yalnız source) |
| `{ "context": { "boundary": "device\|user\|subject", "key": "<key-template>", "storage"?: "memory\|local\|secure" } }` | Context-store veri slot'u. `key` şablonu `{instance}` ve `{subject}` interpolasyonu destekler |
| `{ "identity": "subject" \| "user" }` | Context-store kimliği — aktif subject (JWT `sub`, örn. login'li userId) veya aktif user (yalnız source) |

```json
"properties": {
  "oldPassword": { "type": "string" },
  "channel":  { "type": "string", "x-context-source": { "const": "web" } },
  "deviceId": { "type": "string", "x-context-source": { "context": { "boundary": "device", "key": "device.id" } } },
  "userId":   { "type": "string", "x-context-source": { "identity": "subject" } }
}
```

**`x-context-target`** — master şema üzerinde, instance data alan yollarını (dot-notation) context-store slot'larına eşler. Client bunu **her instance okumasında** uygular; böylece bir transition'dan sonra ortaya çıkan değerler (token, cihaz kaydı, sertifika…) otomatik olarak context-store'a taşınır ve sonraki akışlar `x-context-source` ile okuyabilir. Hedefler yalnızca context slot'u olabilir (`const` ve `identity` source-only'dir):

```json
"x-context-target": {
  "deviceData.instanceId": { "context": { "boundary": "device", "key": "device.registration.{instance}" } },
  "certificate":           { "context": { "boundary": "device", "key": "device.cert.{instance}", "storage": "secure" } }
}
```

**`{instance}` şablonu:** Aynı mantıksal alan farklı instance'larda gelebilir (örn. cihaz başına bir device-manager instance'ı). Key'e `{instance}` (instance id) eklemek her instance'ın değerini ayrı bir konuma yazar. Akışlar arası **singleton** değerler için `{instance}` kullanmayın — sabit bir key'de kalsın ki sonraki akışın `x-context-source`'u bulabilsin. Kullanılabilir şablon değişkenleri: `{instance}`, `{subject}`.

:::note Geriye dönük uyumluluk
JSON Schema (draft 2020-12) bilinmeyen keyword'lere izin verir: standart validator'lar `x-context-*` anotasyonlarını yok sayar. Anotasyonsuz bir şema bugünkü gibi davranır — benimseme şema başına ve kademelidir.
:::

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
| `type` | string | **Evet** | Schema tipi — serbest metin (schema 0.0.54'ten itibaren enum yok). Tam olarak `master` değeri şemayı **master şema** olarak işaretler ve `x-indexed`'i etkinleştirir; aşağıya bakın |
| `schema` | object | **Evet** | JSON Schema tanımı (Draft 2020-12). Aşağıdaki iç yapı tablosuna bakın |
| `labels` | array | Hayır | Çoklu dil etiketleri. Her öğe: `label` (string) + `language` (pattern: `^[a-z]{2}-[A-Z]{2}$`). v0.0.99 ile schema ve master function yanıtlarında `labels` olarak döner (tüm diller; tanımlı değilse alan yazılmaz). Önceden yükleme sırasında atılıyordu; önbellekteki bileşenler republish ya da süre dolana kadar etiketsiz görünebilir |

### `attributes.type` Değerleri

<sup>New</sup> v0.0.94 — `attributes.type` **serbest metin** bir string'dir; schema paketi 0.0.54 ile önceki enum kaldırılmıştır. Eski ve özel değerler (`workflow`, `task`, `function`, `view`, `schema`, `extension`, `headers`, …) doğrulamadan geçer ve yalnızca sınıflandırma amaçlıdır. Tek özel değer **`master`**'dır:

| Değer | Anlamı |
|-------|--------|
| `master` | Şema **master şema** olarak işaretlenir; property'lerde `x-indexed` kullanımına izin verilir ([Attribute Index'leri](/docs/how-to/attribute-indexes)). Karşılaştırma tam eşleşmedir: `Master`, boş, `null` veya başka bir değer master anlamına gelmez |
| diğer | Serbest sınıflandırma etiketi. `x-indexed` (değeri `false` olsa bile) bu şemalarda publish sırasında reddedilir |

Bileşen kökünde (`key`/`version`/`domain` seviyesinde) bir `type` alanı **yoktur**; JSON Schema içindeki `type` keyword'ü (`object`, `string`, …) ise standart anlamını korur.

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

Standart JSON Schema alanlarına ek olarak, property seviyesinde vNext **`x-*` vocabulary uzantıları** desteklenir — alan bazlı yetkilendirme (`x-roles`), maskeleme (`x-masking`), şifreleme (`x-encryption`), filtreleme (`x-filterOperators`), sıralama (`x-sortable`), görüntü formatı (`x-displayFormat`), etiketleme (`x-labels`), LOV (`x-lov`), lookup (`x-lookup`), koşullu görünürlük (`x-conditional`), client context bağlama (`x-context-source`, `x-context-target`) vb. Tam liste ve örnekler için bkz. [Schema Tanımı](/docs/how-to/view-consept/schema-tanimi) ve [Data Context Vocabulary](#data-context-vocabulary-data-vocab).

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
