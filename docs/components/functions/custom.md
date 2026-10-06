---
sidebar_position: 2
title: Custom Functions
description: Kullanıcı tanımlı fonksiyonlar ve C# scripting
---

# Özel Fonksiyonlar (Custom Functions)

Özel fonksiyonlar, vNext platformunda BFF (Backend for Frontend) API kullanımını azaltmak için tasarlanmış bileşenlerdir. Instance verileri üzerinde çalışarak diğer domain'lere veya entegre servislere uç nokta sağlarlar.

## İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Function Tanımı](#function-tanımı)
3. [Function Özellikleri](#function-özellikleri)
4. [Fonksiyon Kontratı](#fonksiyon-kontratı)
5. [Fonksiyon Cache](#fonksiyon-cache)
6. [Tüketim Noktaları](#tüketim-noktaları)
7. [Fonksiyon Keşif Endpointleri](#fonksiyon-keşif-endpointleri)
8. [Sistem Fonksiyonları](#sistem-fonksiyonları)
9. [Kullanım Örnekleri](#kullanım-örnekleri)
10. [En iyi Uygulamalar](#en-iyi-uygulamalar)

---

## Genel Bakış

Özel fonksiyonlar şu amaçlarla kullanılır:

- **BFF API Azaltma**: Doğrudan veri erişimi sağlayarak aracı API katmanlarını azaltır
- **Veri Dönüşümü**: Instance verilerini mapping ile istenilen formatta sunar
- **Task Çalıştırma**: Fonksiyon çağrıldığında tanımlı task'ı çalıştırır
- **Servis Entegrasyonu**: Diğer domain'lere veya harici servislere uç nokta sağlar

:::tip
Her fonksiyon bir task çalıştırabilir ve task sonucundaki veri mapping ile istenilen formatta döndürülebilir.
:::

---

## Function Tanımı

### Temel Yapı

```json
{
  "key": "function-get-user-info",
  "flow": "sys-functions",
  "domain": "core",
  "version": "1.0.0",
  "flowVersion": "1.0.0",
  "tags": [
    "system",
    "core",
    "users",
    "lookup"
  ],
  "attributes": {
    "scope": "I",
    "task": {
      "order": 1,
      "task": {
        "key": "get-user-info",
        "domain": "core",
        "version": "1.0.0",
        "flow": "sys-tasks"
      },
      "mapping": {
        "location": "./src/GetUserInfoMapping.csx",
        "code": "<BASE64_ENCODED_MAPPING_CODE>"
      }
    }
  }
}
```

---

## Function Özellikleri

### Temel Özellikler (Top-Level)

| Özellik | Tip | Zorunlu | Pattern / Kısıt | Açıklama |
|---------|-----|---------|-----------------|----------|
| `key` | `string` | **Evet** | `^[a-z0-9-]+$` | Fonksiyon için benzersiz tanımlayıcı |
| `flow` | `string` | **Evet** | Sabit: `sys-functions` | Flow stream bilgisi |
| `domain` | `string` | **Evet** | `^[a-z0-9-]+$` | Fonksiyonun ait olduğu domain |
| `version` | `string` | **Evet** | `^\d+\.\d+\.\d+` | Versiyon bilgisi (semantic versioning) |
| `flowVersion` | `string` | **Evet** | `^\d+\.\d+\.\d+` | Flow versiyon bilgisi |
| `tags` | `string[]` | **Evet** | `minItems: 1` | Kategorilendirme ve arama için etiketler |
| `_comment` | `string` | Hayır | — | Açıklama / yorum |
| `attributes` | `object` | **Evet** | — | Fonksiyon konfigürasyonu |

### Attributes Özellikleri

| Özellik | Tip | Zorunlu | Açıklama |
|---------|-----|---------|----------|
| `scope` | `string` | **Evet** | Fonksiyon kapsamı (`I` = Instance, `F` = Flow, `D` = Domain) |
| `task` | `object` | **Koşullu** | Tek task tanımı. `task` veya `onExecutionTasks`'tan biri zorunlu |
| `onExecutionTasks` | `array` | **Koşullu** | Sıralı çalıştırılacak task'lar. `task` veya `onExecutionTasks`'tan biri zorunlu |
| `output` | `object` | **Koşullu** | Çıktı mapping betiği; `onExecutionTasks` tanımlıysa **zorunlu**. `IOutputHandler` uygular |
| `labels` | `array` | Hayır | Çoklu dil etiketleri. Her öğe: `label` (string) + `language` (pattern: `^[a-z]{2}-[A-Z]{2}$`). <sup>New</sup> v0.0.99 Artık yükleme sırasında düşürülmez; built-in [`catalog`](/docs/components/functions/built-in#catalog-fonksiyonu) yanıtında `functions[].labels` olarak döner |
| `roles` | `array` | Hayır | Yetkilendirme rolleri. Her öğe: `role` (string) + `grant` (`allow` / `deny`). DENY her zaman ALLOW'u geçersiz kılar |
| `rawResponse` | `boolean` | Hayır | `true`: mapped rawData doğrudan response olarak döndürülür. `false` (varsayılan): platform kendi pattern modeli üzerinden çıktı verir. Legacy API'lerden vnext'e geçiş senaryolarında kullanılır |
| `cache` | `object` | Hayır | Read-through response cache konfigürasyonu — bkz. [Fonksiyon Cache](#fonksiyon-cache) |
| `verbs` <sup>New</sup> | `string[]` | Hayır | Kabul edilen HTTP verb'leri (`GET`, `POST`, `PATCH`, `DELETE`) — bkz. [Fonksiyon Kontratı](#fonksiyon-kontratı) |
| `inputSchema` <sup>New</sup> | `object \| array` | Hayır | Request body'yi tanımlayan `sys-schemas` kontratı; runtime tarafından **valide edilir** — bkz. [Fonksiyon Kontratı](#fonksiyon-kontratı) |
| `outputSchema` <sup>New</sup> | `object \| array` | Hayır | Response body'yi tanımlayan `sys-schemas` kontratı; yalnızca deklaratif |
| `inputView` <sup>New</sup> | `object \| array` | Hayır | Input toplamak için render edilecek `sys-views` kontratı |
| `outputView` <sup>New</sup> | `object \| array` | Hayır | Output sunmak için render edilecek `sys-views` kontratı |
| `executionLog` <sup>New</sup> v0.0.99 | `string` | Hayır | Fonksiyon yürütme journal'ı için opt-in: `E` (enabled) her çağrıyı journal'a yazar ve [fonksiyon metrik endpoint'lerinden](/docs/components/functions/built-in#fonksiyon-metrikleri) okunur kılar; `D` (disabled) veya alanın olmaması hiçbir şey kaydetmez. Journal asenkron ve best-effort'tur, yürütme süresini etkilemez |

### Scope Değerleri

| Değer | Açıklama | Erişim Seviyesi |
|-------|----------|-----------------|
| `I` | Instance | Belirli bir instance için çalışır |
| `F` | Workflow | Workflow seviyesinde çalışır |
| `D` | Domain | Domain seviyesinde çalışır |

### Task Yapısı

```json
{
  "task": {
    "order": 1,
    "task": {
      "key": "task-key",
      "domain": "core",
      "version": "1.0.0",
      "flow": "sys-tasks"
    },
    "mapping": {
      "location": "./src/MappingFile.csx",
      "code": "<BASE64_ENCODED_CODE>"
    }
  }
}
```

| Özellik | Tip | Zorunlu | Açıklama |
|---------|-----|---------|----------|
| `order` | `integer` | **Evet** | Task çalışma sırası (`minimum: 1`) |
| `task` | `object` | **Evet** | Task referansı (explicit: `key`, `domain`, `flow`, `version` veya ref: `ref`) |
| `mapping` | `object` | **Evet** | Input/Output dönüşüm mapping'i (aşağıdaki tablo) |
| `variableKey` <sup>New</sup> v0.0.99 | `string` | Hayır | Task yanıtının `context.OutputResponse` / `context.TaskResponse` içindeki **slot adı**. Format `^[A-Za-z_][A-Za-z0-9_]*$`, en fazla 100 karakter; olduğu gibi (verbatim) kullanılır. Etkin slot = `variableKey ?? camelCase(task.key)` (ör. `send-notification` → `sendNotification`) |

#### Mapping Özellikleri

| Özellik | Tip | Zorunlu | Varsayılan | Açıklama |
|---------|-----|---------|------------|----------|
| `type` | `string` | Hayır | `L` | Mapping tipi: `G` (Global) veya `L` (Local). Global ise `code` gerekmez |
| `location` | `string` | Hayır | — | Kod dosyası yolu (pattern: `^\.\/.*\.csx$`) |
| `code` | `string \| object` | **Koşullu** | — | Mapping kodu içeriği. `type` = `L` ise zorunlu. `encoding: "REF"` ise string yerine bir sys-mappings referans objesi |
| `encoding` | `string` | Hayır | `B64` | Kodlama formatı: `B64` (Base64), `NAT` (Native/Ham) veya `REF` (sys-mappings referansı) |
| `scripts` <sup>New</sup> | `object` | Hayır | — | Helper referansları (`helpers[]`) ve izinli assembly'ler (`allowedAssemblies[]`) — bkz. [Mapping Bileşeni](/docs/components/mapping-component) |

### Çoklu task çalıştırma ve output mapping

Tek bir **`task`** yerine **`attributes.onExecutionTasks`** ile **sırayla** birden fazla task çalıştırılabilir. Her öğede **`order`**, **`task`** referansı ve isteğe bağlı **`mapping`** bulunur. Sonraki task'lar, aynı fonksiyon yürütmesinde önceki task çıktılarını kullanabilir.

İsteğe bağlı **`attributes.output`**, **`IOutputHandler`** uygulayan bir betiğe işaret eder. **`OutputHandler`** içinde sonuçlar **`context.OutputResponse`** üzerinden okunur. Her task'ın sonucu **etkin slot** adı altında tutulur: `variableKey` tanımlıysa o (verbatim), değilse task key'inin camelCase hali (`validate-account-policies` → `validateAccountPolicies`).

:::tip Response header & status code forward
Multi-task function'larda output handler'ın döndürdüğü `ScriptResponse`'un **`Headers`** ve **`StatusCode`** alanları, nihai function HTTP yanıtına **forward edilir**. Böylece output handler yalnızca gövdeyi değil, yanıt status'ünü (örn. `201`, `202`) ve `Location` / `ETag` gibi header'ları da belirleyebilir.
:::

```json
"attributes": {
  "scope": "I",
  "onExecutionTasks": [
    {
      "order": 1,
      "task": {
        "key": "validate-account-policies",
        "domain": "core",
        "flow": "sys-tasks",
        "version": "1.0.0"
      },
      "mapping": {
        "location": "./src/FunctionValidatePoliciesMapping.csx",
        "code": ""
      }
    },
    {
      "order": 2,
      "task": {
        "key": "get-data-from-workflow",
        "domain": "core",
        "flow": "sys-tasks",
        "version": "1.0.0"
      },
      "mapping": {
        "location": "./src/FunctionGetInstanceDataMapping.csx",
        "code": ""
      }
    }
  ],
  "output": {
    "location": "./src/FunctionOutputMapping.csx",
    "code": ""
  }
}
```

```csharp
using System.Threading.Tasks;
using BBT.Workflow.Scripting;

public class FunctionOutputMapping : IOutputHandler
{
    public Task<ScriptResponse> OutputHandler(ScriptContext context)
    {
        var policies = context.OutputResponse["validateAccountPolicies"].data;
        var instanceData = context.OutputResponse?["getDataFromWorkflow"].data;
        return Task.FromResult(new ScriptResponse
        {
            Key = "multi-task-function-output",
            Data = new { policyValidation = policies, instanceSnapshot = instanceData }
        });
    }
}
```

#### Aynı task'ı iki kez çalıştırma (`variableKey`)

<sup>New</sup> v0.0.99 Aynı task'ı bir fonksiyonda iki kez çalıştırmak için her girişe farklı bir `variableKey` verin; sonuçlar ayrı slot'lara yazılır:

```json
"onExecutionTasks": [
  {
    "order": 1,
    "task": { "key": "start-child", "domain": "core", "version": "1.0.0", "flow": "sys-tasks" },
    "variableKey": "primaryChild",
    "mapping": { "location": "./src/StartPrimaryChildMapping.csx", "code": "" }
  },
  {
    "order": 1,
    "task": { "key": "start-child", "domain": "core", "version": "1.0.0", "flow": "sys-tasks" },
    "variableKey": "secondaryChild",
    "mapping": { "location": "./src/StartSecondaryChildMapping.csx", "code": "" }
  }
]
```

```csharp
var primary   = context.OutputResponse["primaryChild"];
var secondary = context.OutputResponse["secondaryChild"];
```

:::warning Slot çakışması publish'te reddedilir
Fonksiyonlarda slot çakışması, `order` değerinden **bağımsız** olarak **tüm `onExecutionTasks`** genelinde denetlenir: iki giriş aynı etkin slot'a düşüyorsa (ör. aynı task iki kez, `variableKey` olmadan) tanım publish'te reddedilir. Bu durum önceden runtime'da `Parallel tasks produced conflicting output for key '...'` hatasıyla patlıyordu. Geçersiz formatlı bir `variableKey` de reddedilir: *"... variableKey 'x' is not a valid response slot name: use letters, digits and '_', starting with a letter or '_' (max 100 characters)."* (Workflow task listelerinde çakışma **order bazında** denetlenir — bkz. [Mapping Rehberi](/docs/components/mappings).)
:::

---

## Fonksiyon Kontratı

Bir fonksiyon, client'ların keşfedebileceği **deklaratif bir kontrat** taşıyabilir: hangi HTTP verb'lerini kabul ettiği, request/response body şemaları ve input/output için render edilecek view'lar. Kontrat alanlarının tamamı **opt-in**'dir — hiçbirini bildirmeyen fonksiyon eskisi gibi davranır.

```json
"attributes": {
  "scope": "F",
  "verbs": ["POST"],
  "inputSchema": { "key": "calc-limit-input", "domain": "core", "flow": "sys-schemas", "version": "1.0.0" },
  "outputSchema": { "key": "calc-limit-output", "domain": "core", "flow": "sys-schemas", "version": "1.0.0" },
  "inputView": [
    {
      "rule": { "location": "./src/IsMobile.csx", "code": "<BASE64>" },
      "view": { "key": "calc-limit-form-mobile", "domain": "core", "flow": "sys-views", "version": "1.0.0" }
    },
    {
      "view": { "key": "calc-limit-form", "domain": "core", "flow": "sys-views", "version": "1.0.0" }
    }
  ]
}
```

### Verb kısıtı (`verbs`)

- Deklare edilmemiş bir verb ile çağrı **405 Method Not Allowed** döner; `Allow` header'ı deklare edilen verb'leri listeler.
- `verbs` tanımsız veya boşsa her verb kabul edilir (önceki davranış).
- Denetim, scope ve rol kontrollerinden **sonra**, herhangi bir task çalışmadan **önce** yapılır — yetkisiz bir çağıran fonksiyonun şekli hakkında bilgi edinemez.

### Body doğrulama (`inputSchema` / `outputSchema`)

| Durum | Sonuç |
|-------|-------|
| `inputSchema` tanımsız veya request body yok | Doğrulama yapılmaz |
| `inputSchema` tanımlı ve body var | Body, çözümlenen şemaya karşı valide edilir; hata → **400** + alan bazlı hatalar |
| `outputSchema` | Hiçbir zaman valide edilmez — yalnızca deklaratiftir |

Şema ihlalleri, transition şema doğrulamasıyla **aynı formatta** raporlanır (culture çözümlemesi dahil).

### Rule-based slot'lar

`inputSchema`, `outputSchema`, `inputView` ve `outputView` alanlarının her biri üç biçimde yazılabilir:

1. **Tek referans** — doğrudan `{key, domain, flow, version}` (veya `ref`).
2. **Rule-based dizi** — her öğe `rule` (IConditionMapping uygulayan ScriptCode) + `view`/`schema` referansı taşır. Öğeler **bildirim sırasında** değerlendirilir, **ilk eşleşen kazanır**; `rule`'suz öğe her zaman eşleşir, bu yüzden **son öğe** olmalıdır (fallback).
3. **Sarmalı form** — `{ "views": [...] }` / `{ "schemas": [...] }`.

Değerlendirilemeyen bir rule loglanır ve **atlanır** (fatal değildir). Hiçbir öğe eşleşmezse slot "**kontrat yok**" olarak çözülür — bu bir hata değildir: doğrulama atlanır, `/info` `hasView`/`hasSchema` alanlarını `false` raporlar, içerik rotaları `404` döner.

:::warning Ölü inputSchema
Yalnızca body taşıyamayan verb'ler bildiren bir fonksiyonda (`"verbs": ["GET"]` gibi) `inputSchema` tanımlamak **doğrulama hatasıdır** — şema hiçbir zaman değerlendirilemez.
:::

---

## Fonksiyon Cache

Bir fonksiyon, isteğe bağlı **`attributes.cache`** bloğu ile **tüm yanıtını** bir Dapr state store'da cache'leyebilir. Cache **hit** olduğunda yanıt tek bir cache okumasıyla döner — task'lar hiç çalıştırılmaz; **miss** olduğunda fonksiyon normal çalışır ve sonuç cache'e yazılır (read-through). Gerçek bir konfigürasyon-değerlendirme fonksiyonunda yanıt süresi ~230ms'den ~93ms'ye düşmüştür.

:::warning Yalnızca yan etkisiz fonksiyonlar
Cache, fonksiyon başına **opt-in**'dir ve yalnızca **yan etkisiz (read) fonksiyonlar** için etkinleştirilmelidir. Yazma/aksiyon içeren bir fonksiyonu cache'lemek, task'ların atlanması nedeniyle yan etkilerin kaybolmasına yol açar.
:::

```json
"attributes": {
  "scope": "I",
  "task": { "...": "..." },
  "cache": {
    "keyExpression": {
      "location": "dynamicExpresso",
      "code": "\"config:\" + Instance.Key + \":\" + Instance.Version"
    },
    "ttlInSeconds": 300,
    "consistency": "Eventual",
    "bypassOnCacheError": true
  }
}
```

### Cache Alanları

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `keyExpression` | `object` | Hayır | — | Cache key'ini hesaplayan **Dynamic Expresso** ifadesi (`location: "dynamicExpresso"` olan bir ScriptCode). Script context üzerinden değerlendirilir ve string döner. `key`'den önceliklidir |
| `key` | `string` | Hayır | — | Statik cache key'i (`keyExpression` yoksa kullanılır) |
| `storeName` | `string` | Hayır | `DAPR_STATE_STORE_NAME` | Dapr state store component adı. Boşsa çalışan runtime'ın konfigürasyon değeri kullanılır |
| `ttlInSeconds` | `integer` | Hayır | — | Cache'lenen yanıtın yaşam süresi. Null veya pozitif olmayan değer: süresiz |
| `consistency` | `string` | Hayır | `Eventual` | Tutarlılık modu: `Eventual` veya `Strong` |
| `bypassOnCacheError` | `boolean` | Hayır | `true` | `true`: cache okuma/yazma hataları isteği bozmaz, fonksiyon normal çalıştırılır. `false`: cache hatası isteği başarısız kılar |
| `generationKeyExpression` | `object` | Hayır | — | Generation stamp'inin tutulduğu state key'ini çözen Dynamic Expresso ifadesi. `generationKey`'den önceliklidir |
| `generationKey` | `string` | Hayır | — | Generation stamp'ini tutan statik state key'i |
| `varyByHeaders` | `string[]` | Hayır | — | Sonucu değiştiren **tam (exact)** request-header adları. Belirtilen header'lar cache key'ine katılır |
| `varyByHeaderPrefixes` | `string[]` | Hayır | — | Sonucu değiştiren request-header adı **prefiksleri** (ör. bir prefix ile başlayan tüm header'lar) |

:::tip Vary-by header'lar (`#839`)
`varyByHeaders` ve `varyByHeaderPrefixes`, key-expression içinde kullanılabilen `varyKey(context)` yardımcı fonksiyonunun header-adı kümesini oluşturur (ikisi birleştirilir). Böylece runtime herhangi bir header konvansiyonuna bağlı kalmadan; aynı fonksiyonun farklı header değerleri için **ayrı cache varyantları** tutar. Instance `Instance.Data["varyBy"]` ile kendi kümesini sağlamazsa, domain'de tanımlı bu iki alan kullanılır.
:::

### Generation-Namespace Invalidation

`generationKey` / `generationKeyExpression` tanımlandığında, runtime state store'daki **generation stamp**'ini cache key'ine katlar. Stamp'i bir kez değiştirmek (örn. bir [StateStore Task](/docs/components/tasks/state-store) `set` komutu ile), o generation'a bağlı **tüm cache girdilerini tek seferde geçersiz kılar** — aktif silme gerekmez.

Ayrıca key expression'larında **`Instance.Version`** (instance'ın flow versiyonu) kullanılabilir; key'e versiyonu katlamak, yeni bir konfigürasyon versiyonunun kendi kendini geçersiz kılmasını sağlar:

```
"config:" + Instance.Key + ":" + Instance.Version
```

> Pipeline içi (task seviyesi) cache ihtiyaçları için [StateStore Task](/docs/components/tasks/state-store) ve [Cache-Aside Task](/docs/components/tasks/cache-aside) sayfalarına bakın; fonksiyon cache'i bunlardan farklı olarak **fonksiyonun tüm yanıtını** kapsar.

---

## Tüketim Noktaları

### Domain Seviyesi Fonksiyonlar

**Tüm domain instance ve verilerini döndürür:**

```http
GET /api/v1/{domain}/functions
```

**Belirli bir fonksiyonun sonucunu döndürür:**

```http
GET    /api/v1/{domain}/functions/{function}
POST   /api/v1/{domain}/functions/{function}
PATCH  /api/v1/{domain}/functions/{function}
DELETE /api/v1/{domain}/functions/{function}
```

### Instance Seviyesi Fonksiyonlar

**Belirli bir instance için fonksiyonu çalıştırır:**

```http
GET    /api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/{function}
POST   /api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/{function}
PATCH  /api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/{function}
DELETE /api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/{function}
```

:::info BFF Maliyeti
POST, PATCH ve DELETE verb desteği, function endpoint'lerinin tam CRUD operasyonlarını karşılamasına olanak tanır. Bu sayede ayrı BFF katmanı geliştirme ihtiyacı minimize edilir.
:::

---

## Fonksiyon Keşif Endpointleri

<sup>New</sup> Bir client, fonksiyonu çağırmadan önce *"bunu çalıştırabilir miyim, hangi verb ile, hangi URL'de ve şu an hangi view/şema geçerli?"* sorusunu keşif endpoint'leriyle yanıtlar:

```http
GET /api/v1/{domain}/functions/{function}/info
GET /api/v1/{domain}/functions/{function}/view?target=input|output
GET /api/v1/{domain}/functions/{function}/schema?target=input|output

GET /api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/{function}/info
GET /api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/{function}/view?target=input|output
GET /api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/{function}/schema?target=input|output
```

- **`/info`** — izin verilen verb'leri, çağırma URL'sini ve o an geçerli view/şema href'lerini state fonksiyonunun hyperlink stiliyle döner. `hasView` / `hasSchema` bayrakları href'i takip etmenin **şu an** içerik döndürüp döndürmeyeceğini söyler; rule request durumunu okuduğu için sonraki bir çağrıda eşleşebilir — href her durumda verilir.
- **`/view`** ve **`/schema`** — `target=input|output` parametresiyle çözümlenen kontrat içeriğini döner; slot çözümü boşsa `404`.
- Keşif, **execution ile aynı scope ve rol denetiminden** geçer: fonksiyonu çağıramayan bir kullanıcı şeklini de öğrenemez — yanıt `403`'tür (boş bir tanım değil).
- Built-in sistem fonksiyonlarının (`state`, `view`, `data`, …) `sys-functions` bileşeni yoktur; `/info` bunlar için `404` döner.
- Bu rotalarda ETag/304 desteği yoktur.

Workflow'un fonksiyon listesini keşfetmek için built-in [`catalog` fonksiyonuna](/docs/components/functions/built-in#catalog-fonksiyonu) bakın.

---

## Sistem Fonksiyonları

vNext platformu, her workflow instance'ı için hazır **sistem (built-in) fonksiyonları** sağlar: `state`, `data`, `view`, `schema`, `master`, `catalog`, `tasks`, `actions`, `instance-correlation`, `authorize`, `permissions` ve domain seviyesinde `human-task`. Bu fonksiyonların `sys-functions` bileşeni yoktur ve aynı adlı bir custom function'ı **gölgeler**. Tam endpoint, response ve alan referansı için bkz. [Built-in Functions](/docs/components/functions/built-in).

### State Function

Instance'ın mevcut durumunu, kullanılabilir transition'ları (rol filtreli, `labels` ve `target` ile), etkileşim (`interaction`), timeout ve correlation bilgilerini long-polling için döndürür:

```http
GET /api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/state
```

:::info State Alias (Rol Tabanlı Maskeleme)
`state` alanı, aktif state'te `alias` tanımlıysa **role göre maskelenmiş** etiketi döndürebilir. İstek yapan aktörün rolleri alias `roles` listesine göre değerlendirilir (DENY her zaman ALLOW'u geçersiz kılar) ve eşleşen alias için istek diline (Accept-Language) uygun `label` döner; o dilde label yoksa `alias.name` döner. `alias` tanımlı değilse veya hiçbir rol eşleşmezse ham `state.key` döner. Detay için bkz. [State Alias](/docs/components/workflow#state-alias-rol-tabanlı-state-maskeleme).
:::

Tam yanıt şekli için bkz. [Built-in Functions → State Fonksiyonu](/docs/components/functions/built-in#state-fonksiyonu).

### View ve Schema Function

`…/functions/view?transitionKey=&platform=` state veya transition view'ını, `…/functions/schema?transitionKey=` transition'ın JSON Schema'sını döndürür (v0.0.99 itibarıyla her ikisi de bileşen `labels` listesini taşır). Ayrıntı: [View Fonksiyonu](/docs/components/functions/built-in#view-fonksiyonu), [Schema Fonksiyonu](/docs/components/functions/built-in#schema-fonksiyonu).

---

## Kullanım Örnekleri

### Örnek 1: Kullanıcı Bilgisi Fonksiyonu

```json
{
  "key": "function-get-user-info",
  "flow": "sys-functions",
  "domain": "core",
  "version": "1.0.0",
  "flowVersion": "1.0.0",
  "tags": ["system", "core", "users", "lookup"],
  "attributes": {
    "scope": "I",
    "task": {
      "order": 1,
      "task": {
        "key": "get-user-info",
        "domain": "core",
        "version": "1.0.0",
        "flow": "sys-tasks"
      },
      "mapping": {
        "location": "./src/GetUserInfoMapping.csx",
        "code": "<BASE64>"
      }
    }
  }
}
```

**Mapping Örneği:**

```csharp
using System.Threading.Tasks;
using BBT.Workflow.Scripting;
using BBT.Workflow.Definitions;

public class GetUserInfoMapping : IMapping
{
    public Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
    {
        try
        {
            var httpTask = task as HttpTask;
            if (httpTask == null)
                throw new InvalidOperationException("Task must be an HttpTask");

            var userId = context.Body?.userId;

            // URL'yi userId ile güncelle
            httpTask.SetUrl(httpTask.Url.Replace("{userId}", userId?.ToString() ?? ""));

            // Header'ları ayarla
            var headers = new Dictionary<string, string?>
            {
                ["Content-Type"] = "application/json",
                ["Accept"] = "application/json",
                ["X-Request-Id"] = Guid.NewGuid().ToString()
            };

            httpTask.SetHeaders(headers);

            return Task.FromResult(new ScriptResponse());
        }
        catch (Exception ex)
        {
            return Task.FromResult(new ScriptResponse
            {
                Key = "user-info-error",
                Data = new { error = ex.Message }
            });
        }
    }

    public async Task<ScriptResponse> OutputHandler(ScriptContext context)
    {
        try
        {
            var statusCode = context.Body?.statusCode ?? 500;
            var responseData = context.Body?.data;

            if (statusCode >= 200 && statusCode < 300)
            {
                return new ScriptResponse
                {
                    Key = "user-info-success",
                    Data = new
                    {
                        user = responseData,
                        phoneNumber = responseData?.phoneNumber,
                        hasRegisteredDevices = ((object[])responseData?.registeredDevices).Length > 0,
                        language = responseData?.language ?? "tr-TR"
                    },
                    Tags = new[] { "users", "lookup", "success" }
                };
            }
            else
            {
                return new ScriptResponse
                {
                    Key = "user-info-failure",
                    Data = new
                    {
                        error = "Failed to get user information",
                        errorCode = "user_info_failed",
                        statusCode = statusCode,
                        hasRegisteredDevices = false
                    },
                    Tags = new[] { "users", "lookup", "failure" }
                };
            }
        }
        catch (Exception ex)
        {
            return new ScriptResponse
            {
                Key = "user-info-exception",
                Data = new
                {
                    error = "Internal processing error",
                    errorCode = "processing_error",
                    errorDescription = ex.Message,
                    hasRegisteredDevices = false
                },
                Tags = new[] { "users", "lookup", "error" }
            };
        }
    }
}
```

### Örnek 2: Hesap Bakiyesi Fonksiyonu

```json
{
  "key": "function-get-account-balance",
  "flow": "sys-functions",
  "domain": "banking",
  "version": "1.0.0",
  "flowVersion": "1.0.0",
  "tags": ["banking", "accounts", "balance"],
  "attributes": {
    "scope": "I",
    "task": {
      "order": 1,
      "task": {
        "key": "get-balance",
        "domain": "banking",
        "version": "1.0.0",
        "flow": "sys-tasks"
      },
      "mapping": {
        "location": "./src/GetBalanceMapping.csx",
        "code": "<BASE64>"
      }
    }
  }
}
```

---

## En iyi Uygulamalar

### 1. Fonksiyon Tasarımı

| Uygulama | Açıklama |
|----------|----------|
| Tek sorumluluk | Her fonksiyon tek bir iş yapmalı |
| Anlamlı isimlendirme | `function-` prefix'i ile başlayan açıklayıcı isimler |
| Uygun scope | İhtiyaca göre doğru scope seçimi (I, W, D) |
| Versiyon yönetimi | Semantic versioning kullanımı |

### 2. Mapping Yazımı

| Uygulama | Açıklama |
|----------|----------|
| Hata yönetimi | Try-catch blokları ile hata yakalama |
| Null kontrolü | Null-safe kod yazımı (`?.` operatörü) |
| Loglama | Uygun log mesajları ekleme |
| Performans | Gereksiz işlemlerden kaçınma |

### 3. Güvenlik

| Uygulama | Açıklama |
|----------|----------|
| Yetkilendirme | Uygun authorization kontrolleri |
| Veri doğrulama | Input validation yapılması |
| Hassas veri | Hassas verilerin maskelenmesi |
| Rate limiting | İstek limitleri uygulanması |

### 4. Performans

| Uygulama | Açıklama |
|----------|----------|
| Caching | Uygun cache stratejisi kullanımı |
| Async işlemler | Asenkron operasyonlar için async/await |
| Timeout | Uygun timeout değerleri belirleme |
| Resource yönetimi | Kaynakların düzgün serbest bırakılması |

---

## İlgili Dökümanlar

- [Function API'leri](/docs/components/functions/built-in) - Yerleşik sistem fonksiyonları (State, Data, View, Schema)
- [Instance Filtreleme](/docs/how-to/instance-filtering) - GraphQL-stil filtreleme kılavuzu
- [Extension](/docs/components/extension) - Veri zenginleştirme bileşenleri
- [Task Yönetimi](/docs/components/tasks/) - Görev türleri ve kullanımı
- [Mapping Rehberi](/docs/components/mappings) - Kapsamlı haritalama rehberi