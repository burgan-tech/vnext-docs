---
id: schema-roles
title: Şema Rolleri
sidebar_label: Şema Rolleri
description: Schema bileşeninin attributes.type rolü (master, transition, function, component), annotation × rol matrisi ve her rolün kural seti
---

# Şema Rolleri

<sup>New</sup> v0.0.100 / vnext-schema 0.0.56 — Bir schema bileşeni tek bir **rol** oynar: bir flow'un saklanan kaydı (master), bir transition ya da function'ın istek gövdesi (input) veya gömülü bir view'ın veri sözleşmesi (component). Rol, schema bileşeninin `attributes.type` alanıyla bildirilir ve şemanın hangi **rol sözlüğüyle** (role vocabulary) doğrulanacağını seçer.

Bu sayfa rolleri, hangi `x-*` annotation'ının hangi rolde kabul edildiğini (matris) ve her rolün kural setini anlatır. Bileşenin alan referansı için bkz. [Schema](/docs/components/schema); annotation'ların ayrıntılı anlatımı için bkz. [Schema Tanımı](/docs/how-to/view-consept/schema-tanimi).

## Neden rol?

Aynı keyword farklı rollerde farklı anlam taşır:

- `x-lov` bir **input** şemasında kullanıcıya seçenek sunar; bir **master** şemada saklanan anahtarı etikete çözer.
- `x-encryption` bir master şemada değeri **at rest** (veritabanında) korur; bir transition şemasında ise değerin client'tan **in transit** mühürlenerek gelmesini ister.
- `x-roles`, `x-masking`, `x-filterOperators`, `x-indexed` gibi kayıt keyword'leri yalnız **saklanan kayıt** üzerinde anlamlıdır. Bir transition şemasına yazıldıklarında hiçbir şey yapmazlar ama yazan kişiye koruma varmış izlenimi verirler.

Rol bilgisi olmadan bir doğrulayıcı bu hataları yakalayamaz. `attributes.type` ile rol açıkça yazıldığında, rolünün dışındaki bir keyword paket doğrulamasında reddedilir.

## Roller

| `attributes.type` | Rol sözlüğü | Ne için | Kim okur |
|---|---|---|---|
| `master` | `record-vocab.json` | Bir flow'un master (data) şeması, yani saklanan kayıt | Runtime (yazma doğrulaması, okuma şekillendirmesi, filtre/sıralama, index, computed) ve client |
| `transition` | `input-vocab.json` | Bir transition'ın body şeması | Runtime (body doğrulaması) ve client (form) |
| `function` | `input-vocab.json` | Bir function'ın `inputSchema`'sı | Runtime (body doğrulaması) ve client (form) |
| `component` | `component-vocab.json` | Gömülü bir view'ın kendi dataSchema'sı (input kontratı) | Client |
| yok / `""` | rol kapısı yok | Birden fazla rolde kullanılan şema | Tüm keyword'ler kabul edilir; yalnız `x-indexed` yasak |

Ortak (base) keyword'ler `data-base-vocab.json`'da, view hint'leri ise her role eklenen `view-hints-vocab.json` mixin'inde tanımlıdır.

- Rol dışı bir değer (`workflow`, `schema`, `view` vb.) için:
  - **schema paketi** (CLI ve Forge dahil) reddeder;
  - **runtime** bu sürümde uyarıyla kabul eder, sonraki bir sürümde reddedecek. Eski değerlerin hangi role karşılık geldiği için bkz. [Schema → Eski değerlerden geçiş](/docs/components/schema#eski-değerlerden-geçiş).
- Bir keyword rolünün dışında yazılırsa paket reddeder. Kontrol recursive yapılır: `properties`, `items`, combinator'lar ve `$defs` altı da taranır.
- Runtime'ın uyguladığı record keyword'leri (`x-roles`, `x-masking`, at-rest `x-encryption`, `x-filterOperators`, `x-sortable`, `x-indexed`, `x-storage`, `x-computed`) yalnız workflow'un `schema` referansıyla gösterdiği **master şemada** etkilidir.

## Annotation × rol matrisi

✅ kabul · ❌ reddedilir · ⚠️ kısıtlı kabul

| Annotation | Grup | master | transition | function | component | type yok |
|---|---|:-:|:-:|:-:|:-:|:-:|
| `x-labels` | base | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-enum` | base | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-order` | base | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-displayFormat` | base | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-lov` | base | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-lookup` | base | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-errorMessages` | base | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-validation` | base | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-conditional` | base | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-helpText` | view hint | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-placeholder` | view hint | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-uiHint` | view hint | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-uiNote` | view hint | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-group` | view hint | ✅ | ✅ | ✅ | ✅ | ✅ |
| `x-roles` | record | ✅ | ❌ | ❌ | ❌ | ✅ |
| `x-masking` | record | ✅ | ❌ | ❌ | ❌ | ✅ |
| `x-encryption` `source: runtime` (varsayılan) | record | ✅ | ❌ | ❌ | ❌ | ✅ |
| `x-encryption` `source: client` | record + input | ⚠️ kabul edilir, runtime işlemez | ✅ | ✅ | ❌ | ✅ |
| `x-storage` | record | ✅ | ❌ | ❌ | ❌ | ✅ |
| `x-indexed` | record | ✅ | ❌ | ❌ | ❌ | ❌ |
| `x-filterOperators` | record | ✅ | ❌ | ❌ | ❌ | ✅ |
| `x-sortable` | record | ✅ | ❌ | ❌ | ❌ | ✅ |
| `x-computed` `evaluatedBy: runtime` | record | ✅ | ❌ | ❌ | ❌ | ✅ |
| `x-computed` `evaluatedBy: client` | record | ✅ | ❌ | ❌ | ❌ | ✅ |
| `x-context-target` | record | ✅ | ❌ | ❌ | ❌ | ✅ |
| `x-context-source` | input | ❌ | ✅ | ✅ | ❌ | ✅ |
| `x-binding` | component | ❌ | ❌ | ❌ | ✅ | ✅ |
| `x-persistance` | kaldırıldı | ❌ | ❌ | ❌ | ❌ | ❌ |
| `x-encrypt` | kaldırıldı → `x-encryption` `source: client` | ❌ | ❌ | ❌ | ❌ | ❌ |
| Diğer `x-*` | – | ❌ | ❌ | ❌ | ❌ | ✅ (kapı yok) |

> "type yok" sütunu yalnız paket doğrulaması içindir. Runtime'ın publish kuralları (aşağıdaki kural setleri) type'tan bağımsız uygulanır. Tek istisna `x-computed` `runtime`: `transition`, `function` ve `component` type'larında reddedilir.

## Kural setleri

### Ortak (base) ve view hint'ler: tüm roller

| Annotation | Kural |
|---|---|
| `x-labels`, `x-enum`, `x-helpText`, `x-placeholder` | Lokalize metin nesnesi (dil kodu → metin). `x-enum`, enum değeri başına bir etiket verir. Bkz. [`x-labels`](/docs/how-to/view-consept/schema-tanimi#x-labels--çok-dilli-alan-etiketi), [`x-enum`](/docs/how-to/view-consept/schema-tanimi#x-enum--enum-değerlerinin-etiketleri). |
| `x-order` | Sayı. Üretilen formdaki alan sırası (küçük olan önce gelir). Saklanan şema property sırasını korumadığı (jsonb) için gerekir. Bkz. [`x-order`](/docs/how-to/view-consept/schema-tanimi#x-order--form-alan-sırası). |
| `x-displayFormat` | Boş olmayan string, UI format ipucu (ör. `dd.MM.yyyy`). Bkz. [`x-displayFormat`](/docs/how-to/view-consept/schema-tanimi#x-displayformat--görüntü-formatı). |
| `x-lov` | `source` (URN; çağrılır, `{{$form.x}}` interpolasyonu desteklenir) ve `items` (kapsamdaki bir dizi ifadesi, istek atılmaz) alanlarından **tam olarak biri** yazılır. `valueField` / `displayField` / `imageField`. `filter[].param` bir operatör soneki alabilir (`status:in`). `filter[].value` literal bir dizi olabilir. Anlamı role göre değişir: input rolünde seçenekleri sunar, record rolünde saklanan anahtarı etikete çözer. Bkz. [`x-lov`](/docs/how-to/view-consept/schema-tanimi#x-lov--dropdown-kaynağı-list-of-values). |
| `x-lookup` | Tek kayıtlık zenginleştirme kaynağı. Bkz. [`x-lookup`](/docs/how-to/view-consept/schema-tanimi#x-lookup--tekil-kayıt-zenginleştirme). |
| `x-errorMessages` | Doğrulama keyword'ü başına lokalize mesaj: `required`, `pattern`, `minLength`, `maxLength`, `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`, `minItems`, `maxItems`, `uniqueItems` vb. Bkz. [`x-errorMessages`](/docs/how-to/view-consept/schema-tanimi#x-errormessages--hata-mesajları). |
| `x-validation` | Ek doğrulama kuralı (ör. function URN'si). Runtime aynı validator'ı hem transition body'sinde hem birleştirilmiş kayıtta çalıştırır. Bkz. [`x-validation`](/docs/how-to/view-consept/schema-tanimi#x-validation--özel-validasyon-bilgi-amaçlı). |
| `x-conditional` | `showIf` / `hideIf` / `enableIf` / `disableIf` alanları birer condition alır. Condition `field` + `operator` (+ `value`) ya da `allOf` / `anyOf` / `not` biçimindedir. Operatörler: `equals`, `notEquals`, `in`, `notIn`, `isEmpty`, `isNotEmpty`, `contains`, `greaterThan`, `lessThan`, `greaterThanOrEquals`, `lessThanOrEquals`, `startsWith`, `endsWith`. Bkz. [`x-conditional`](/docs/how-to/view-consept/schema-tanimi#x-conditional--koşullu-görünürlük-ve-etkinlik). |
| `x-uiHint`, `x-uiNote`, `x-group` | Yalnız client içindir; runtime okumaz. |

### Master (record)

| Annotation | Kural (paket ve runtime publish) | Runtime davranışı |
|---|---|---|
| `x-roles` | `roleGrant` dizisi: `{role, grant: allow\|deny}` veya `allOf`/`anyOf` combinator'ı. Dinamik roller `$.context.` ile başlamalı. Bkz. [Yetkilendirme](/docs/concepts/authorization#master-şema-alan-bazlı-görünürlük). | Okuma yüzeylerinde, çağıranın göremediği alanı budar. |
| `x-masking` | `operator: mask \| replace` ve operatörün kendi `params`'ı. `roles` yalnız `allow` içeren bir muafiyet listesidir. Kısıtlar: <br/>• yalnız `type: string` olan alanda; <br/>• alan nested `properties` üzerinden erişilebilir olmalı, kökte olamaz; <br/>• `x-filterOperators`, `x-sortable`, `x-indexed` ve aktif `x-encryption` ile birlikte kullanılamaz. <br/>Bkz. [`x-masking`](/docs/how-to/view-consept/schema-tanimi#x-masking--maskeleme). | Okuma yüzeylerinde değeri maskeler; saklanan değer değişmez. |
| `x-encryption` (`source: runtime`) | `type: none \| hash \| encrypt`. <br/>• `hash`: yalnız `params.algorithm` (`sha256` veya `sha512`); `roles` yok; `pattern`, `format`, `minLength`, `maxLength`, `enum` ve `const` ile birlikte kullanılamaz. <br/>• `encrypt`: `params` yok; `roles` yalnız `allow` içeren muafiyet listesi. <br/>• Ortak: alan `type: string` olmalı, erişilebilir olmalı; filter, sort, index ve masking ile birlikte kullanılamaz; host'ta `SchemaEncryption:EncryptWrites` açık olmalı. <br/>• Client alanları (`key`, `algorithm` vb.) yasak. <br/>Bkz. [`x-encryption`](/docs/how-to/view-consept/schema-tanimi#x-encryption--hash-ve-şifreleme). | `hash` yazma anında uygulanır. `encrypt` AES-256-GCM ile saklanır; okumada muaf çağırana plaintext, diğerlerine token döner. |
| `x-encryption` (`source: client`) | `key` ve `algorithm` zorunlu (`HPKE-P256-SHA256-AES128GCM` veya `RSA-OAEP-256`). Opsiyonel: `into`, `encoding` (`base64` veya `base64url`), `nonce`, `envelope` (`publicKey`), `purpose`. At-rest alanları (`type`, `params`, `roles`, `redactInLogs`, `retentionDays`) yasak. | **İşlenmez.** Şifreleme, maskeleme ve filtre reddi uygulanmaz; değer client'ın gönderdiği haliyle saklanır. |
| `x-storage` | `{ "binding": "<dapr-binding>" }`; `binding` boş olamaz ve başka alan kabul edilmez. Kısıtlar: <br/>• alan `type: object` olmalı; <br/>• kökte, iç içe bir `x-storage` düğümünde ya da nested dizide olamaz; <br/>• `properties` üzerinden (veya tek bir dizinin `items`'ı üzerinden) erişilebilir olmalı; <br/>• `content` alanı tanımlanamaz. <br/>Bkz. [`x-storage`](/docs/how-to/view-consept/schema-tanimi#x-storage--dosya-alanı-blob-deposuna-taşıma), [Dosya Alanları](/docs/how-to/file-fields). | Dosya byte'ları Dapr binding'e taşınır. Instance data'da ve transition kaydında yalnız dosya handle'ı kalır. |
| `x-indexed` | Yalnız `master` type'ta geçerli; boolean. `true` ise: <br/>• alan skaler tipte olmalı (`string`, `number`, `integer`, `boolean`); <br/>• yol sabit `properties` üzerinden gitmeli ve `[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z0-9_]+)*` desenine uymalı; <br/>• `$ref`, combinator ve conditional düğümlerde ya da onların altında olamaz. <br/>Bkz. [Attribute Index'leri](/docs/how-to/attribute-indexes). | Attribute index için hazırlık yapılır. |
| `x-filterOperators` | Değerler şu 14 addan biri olmalı: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `between`, `contains`, `startsWith`, `endsWith`, `in`, `nin`, `isNull`, `includes`. Sorgu takma adları (`ne`, `ge`, `le`, `like`, `match`, `startswith`, `endswith`, `isnull`) ve büyük-küçük harf varyantları **publish'te reddedilir**; mesaj doğru adı söyler. Tekrar eden ve string olmayan değerler de reddedilir. Bkz. [Instance Filtering → Şema beyanı ve sorgu token'ı](/docs/how-to/instance-filtering#şema-beyanı-ve-sorgu-tokenı). | List sorgusunda alan bazlı operatör izni. |
| `x-sortable` | Boolean. Bkz. [Instance Filtering](/docs/how-to/instance-filtering#şema-tabanlı-filtrelenebilirlik-ve-sıralama). | List sorgusunda sıralama izni. |
| `x-computed` | `evaluatedBy: runtime \| client` (`server` "yeniden adlandırıldı" hatası verir). **`runtime` için kurallar:** <br/>• yalnız nested `properties` altında olabilir; kökte veya `items`/`$defs` altında olamaz; <br/>• `required` listesinde olamaz; <br/>• `x-indexed`, `x-filterOperators`, `x-sortable`, `x-storage`, `x-roles`, `x-masking` ve at-rest `x-encryption` ile birlikte kullanılamaz; <br/>• `cases` ve `fallback` alanlarından en az biri olmalı; her case ve fallback tam olarak bir `join` (`fields` ≥ 1, `separator`) veya bir `arithmetic` (`op`: `add`/`subtract`/`multiply`/`divide`, `fields` ≥ 2) içerir; <br/>• `when` geçerli bir condition olmalı; `whenAbsent` değeri `empty` veya `null` olmalı; <br/>• `fields` ve `when.field` aynı nesnedeki property'leri göstermeli (nokta ile iç içe yol yazılabilir); başka bir runtime computed alanı (zincir) veya at-rest şifreli bir alanı gösteremez. <br/>**`client` için:** runtime içeriği incelemez. <br/>Bkz. [`x-computed`](/docs/how-to/view-consept/schema-tanimi#x-computed--hesaplanan-alan). | **runtime:** flag yok, her zaman çalışır. Tüm okuma yüzeylerinde, çağıranın görebildiği veri üzerinden hesaplanır (roles, masking ve encryption uygulandıktan sonra). Hiç saklanmaz; yazarken atılır. **client:** runtime dokunmaz. |
| `x-context-target` | Kök seviyesinde bir harita: instance data yolu → context-store slot'u. Bkz. [Data Context Vocabulary](/docs/components/schema#data-context-vocabulary-data-vocab). | Client her instance okumasında uygular; runtime okumaz. |

### Transition ve function (input)

| Annotation | Kural | Davranış |
|---|---|---|
| `x-context-source` | Alanın değeri kullanıcıdan değil client'tan gelir. Kaynak üçünden biri: `const` (literal), `context` (context-store slot'u) veya `identity`. Bkz. [Data Context Vocabulary](/docs/components/schema#data-context-vocabulary-data-vocab). | Client form alanı çizmez, değeri kendisi doldurur. |
| `x-encryption` (`source: client`) | Kurallar master bölümündeki client satırıyla aynı. Input rolü **yalnız** `client` kaynağını kabul eder; `runtime` (at-rest) kaynağı reddedilir. | Client değeri mühürleyerek gönderir; mühürleyemezse yazmayı reddeder. Runtime işlem yapmaz. |
| Record keyword'leri | `x-roles`, `x-masking`, `x-storage`, `x-indexed`, `x-filterOperators`, `x-sortable`, `x-computed`, `x-context-target` reddedilir. | – |

Örnek bir transition şeması: cihaz kimliğini client context'ten okur, yeni şifreyi client'ta mühürleyerek gönderir.

```json title="Schemas/change-password-input.json"
{
  "key": "change-password-input",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-schemas",
  "flowVersion": "1.0.0",
  "tags": ["identity", "password"],
  "attributes": {
    "type": "transition",
    "schema": {
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "$id": "urn:vnext:res:schema:core:change-password-input",
      "title": "Change Password",
      "type": "object",
      "required": ["newPassword"],
      "properties": {
        "deviceId": {
          "type": "string",
          "x-context-source": { "context": { "boundary": "device", "key": "device.id" } }
        },
        "newPassword": {
          "type": "string",
          "x-labels": { "tr": "Yeni şifre", "en": "New password" },
          "x-order": 1,
          "x-encryption": {
            "source": "client",
            "key": "urn:client:context:read:device:memory:device.hpke.publicKey",
            "algorithm": "HPKE-P256-SHA256-AES128GCM",
            "envelope": "publicKey"
          }
        }
      }
    }
  }
}
```

### Component

| Annotation | Kural | Davranış |
|---|---|---|
| `x-binding` | `required` veya `optional`: component'in input kontratındaki alanın zorunluluğu. Bkz. [`x-binding`](/docs/how-to/view-consept/schema-tanimi#x-binding--alt-bileşen-bağlama). | Host view veriyi component'e bağlar. |
| Rol keyword'leri | Record ve input keyword'lerinin hepsi reddedilir, `x-encryption` dahil. Gönderim ve kayıt davranışı host view'ın şemasına aittir. | – |

## İki rolde kullanılan şema

Bazı şemalar birden fazla yerde kullanılır; örneğin aynı şema hem bir transition'ın body'si hem de salt-okunur bir view'ın `dataSchema`'sı olabilir. Böyle bir şemada iki yol vardır:

1. **`attributes.type`'ı yazmayın** (veya `""` bırakın). Rol kapısı uygulanmaz; tüm keyword'ler kabul edilir, yalnız `x-indexed` yasaktır. Runtime'ın publish kuralları yine type'tan bağımsız çalışır.
2. **Şemayı rol başına bölün.** Ortak alanları her iki şemaya yazın ve her birine kendi rolünü verin. Bu yol, rol dışı keyword hatalarını paket doğrulamasında yakalar ve tercih edilir.

Master şema type'sız bırakılırsa `x-indexed` kullanılamaz; index hazırlığı isteyen bir master şemanın type'ı `master` olmalıdır.

## Component rolü ve `x-binding`

Bir component, onu gömen view'ın rolünü **devralmaz**. Host view, kendi verisini component'e **bağlar** (`bind`); component'in şeması yalnız bu bağlamanın sözleşmesini (`x-binding: required | optional`) ve ortak/view hint keyword'lerini taşır.

Role özgü davranışların hepsi host'un şemasında kalır:

- Ne gönderildiği ve nasıl gönderildiği: `x-context-source`, `x-encryption` (`source: client`).
- Kaydın neyi açığa çıkardığı ve neyi dışarı kopyaladığı: `x-roles`, `x-masking`, `x-context-target`.

Kendi başına gönderim yapan bir component, host'un ilettiği bir komutu (`$param.submitCommand`) kullanır; böylece transition ve body yine host'a ait olur. Kendi transition'ını gönderen bir view'ın `dataSchema`'sı ise `component` değil, `transition` rolündedir.

## Paket ve runtime denetimi

Rol kuralları iki katmanda uygulanır ve bu sürümde katmanlar farklı sertliktedir:

| Durum | Schema paketi 0.0.56 (CLI `validate`, Forge) | Runtime v0.0.100 (publish) |
|---|---|---|
| `attributes.type` yok veya `""` | Kabul (rol kapısı yok) | Kabul (v0.0.100 öncesinde `Schema type is required.` hatası) |
| Eski değer (`workflow`, `schema`, `view`, `headers` …) | **Red** | **Uyarı** ile kabul; ileride reddedilecek |
| Rolünün dışında bir keyword (ör. transition şemasında `x-roles`, master'da `x-context-source`) | **Red** (recursive) | Keyword'ü uygulamaz; yalnız uyguladığı keyword'leri doğrular |
| Runtime'ın uyguladığı keyword'lerin biçimi (`x-masking`, `x-encryption`, `x-filterOperators`, `x-computed`, `x-storage`, `x-indexed`) | Şekil doğrulaması | Tam publish doğrulaması; hata mesajlarıyla red |

Runtime'ın uyarı metni:

```
attributes.type 'workflow' is not a schema role (master, transition, component, function) and will be refused in a future release; use 'master' for a flow's data schema, 'transition' / 'function' for a request body, 'component' for an embedded view's dataSchema, or omit it.
```

`x-encrypt` ve `x-persistance` hiçbir sürümde yayımlanmadı. Client tarafı şifreleme için `x-encryption` + `source: "client"` kullanın.

## Araç yazarları için: `addVocabularies(ajv)`

`schema-definition.schema.json`, rol sözlüklerine `$id` üzerinden `$ref` verir. Bu nedenle paketi kendi aracında (editör eklentisi, CI script'i vb.) AJV ile kullanan biri, şemayı derlemeden önce sözlükleri kaydetmelidir; aksi halde derleme `$ref` çözümleme hatası verir:

```js
const Ajv = require('ajv');
const { addVocabularies, schemaDefinition } = require('@burgan-tech/vnext-schema');

const validate = addVocabularies(new Ajv({ strict: false })).compile(schemaDefinition);
```

Reddetmek yerine raporlamak isteyen bir araç, her rol sözlüğündeki `#/definitions/allowedKeywords` listesini veri olarak okuyabilir.

## İlgili

- [Schema](/docs/components/schema) — bileşen alanları, `attributes.type` değerleri ve eski değerlerden geçiş
- [Schema Tanımı](/docs/how-to/view-consept/schema-tanimi) — her `x-*` annotation'ının ayrıntısı
- [Yetkilendirme](/docs/concepts/authorization) — `x-roles` ve okuma sırası
- [Instance Filtering](/docs/how-to/instance-filtering) — `x-filterOperators` beyanı ve sorgu token'ları
- [Attribute Index'leri](/docs/how-to/attribute-indexes) — `x-indexed`
- [Dosya Alanları](/docs/how-to/file-fields) — `x-storage`
- Schema paketi: [vnext-schema (GitHub)](https://github.com/burgan-tech/vnext-schema) — `vocabularies/*-vocab.json`
