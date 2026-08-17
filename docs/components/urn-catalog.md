---
id: urn-catalog
title: URN Kataloğu ve Binding
sidebar_label: URN & Binding
sidebar_position: 9
description: vNext URN adresleme şeması — urn:vnext / urn:client prefiksleri, flow/transition/function formatları ve ${param} binding
---

# URN Kataloğu ve Binding

**URN** (Uniform Resource Name), vNext platformunda bir kaynağı — flow başlatma, transition tetikleme, function çağırma — taşınabilir ve okunabilir tek bir string ile adreslemenin standart yoludur. View'lar, pseudo-ui aksiyonları (`command`), schema veri kaynakları (`x-lov`, `x-lookup`) ve client deeplink'leri bu kataloğu ortak bir sözleşme olarak kullanır.

Bu sayfa URN'lerin **tek doğruluk kaynağıdır**. Diğer dökümanlar (View, Pseudo UI, Functions) bir URN formatına ihtiyaç duyduğunda buraya referans verir.

---

## Prefiks (Namespace)

URN'in ikinci segmenti **namespace**'tir ve adresin hangi otorite tarafından çözüleceğini belirler.

| Prefix | Otorite | Kullanım |
|--------|---------|----------|
| `urn:vnext` | vNext runtime | Sunucu tarafında çözülen tüm kaynaklar — flow, transition, function |
| `urn:client` | Client uygulaması | Client'ın **local** davranışları (ör. yerel navigasyon, cihaz aksiyonu). Runtime bu adresleri çözmez; client kendi yorumlar |

---

## URN Formatları

Genel iskelet:

```text
urn:<namespace>:<type>:<command>:<domain>:<flow>[:<instanceId>[:<key>]]
```

- **type** — kaynak ailesi: `flow` (akış işlemleri), `fn` (function) veya `res` (sistem bileşeni kaynağı — kendine özgü formatı vardır, aşağıda).
- **command** — yapılacak işlem. `flow` için `start` / `transition` / `instances` / `transitions` / `history`; `fn` için `get` / `post` / `patch` / `delete`.
- Sondaki segmentlerin varlığı (instance, transition/function key) işleme göre değişir; aşağıdaki tablolara bakın.

### Flow Başlatma

| | |
|---|---|
| **Format** | `urn:<namespace>:flow:start:<domain>:<flowName>` |
| **Örnek** | `urn:vnext:flow:start:demo:sample-flow` |
| **HTTP karşılığı** | `POST /api/v1/{domain}/workflows/{flow}/instances/start` |

Belirli bir flow'un yeni bir instance'ını başlatır. Instance henüz oluşmadığı için `instanceId` taşımaz.

:::info[`urn:client:flow:start` — yüzeyi açmak ≠ kaydı oluşturmak]
`urn:vnext:flow:start:<domain>:<flowName>` **şimdi bir kayıt oluşturur**. Bir "Yeni kayıt" butonunun yaptığı ise genellikle başka bir şeydir: kullanıcı ilk adımı submit edene kadar ortada kayıt yoktur, buton yalnızca **oluşturma yüzeyini açar**. Bu, client otoritesinde bir davranıştır ve `urn:client:flow:start:<domain>:<flowName>` ile adreslenir. İki form aynı kelimeleri taşır ama otoriteleri farklıdır — ikisini tek forma indirmek, sihirbaz açan bir butonla sessizce taslak kayıt oluşturan bir butonu ayırt edilemez yapar.
:::

### Transition İsteği (instance'a özel)

| | |
|---|---|
| **Format** | `urn:<namespace>:flow:transition:<domain>:<flowName>:<instanceId>:<transitionName>` |
| **Örnek** | `urn:vnext:flow:transition:demo:sample-flow:${param}:approved` |
| **HTTP karşılığı** | `PATCH /api/v1/{domain}/workflows/{flow}/instances/{instance}/transitions/{transitionKey}` |

Belirli bir instance üzerinde adı verilen transition'ı tetikler. `instanceId` genellikle [binding](#binding-formatlama) ile (`${param}`) doldurulur.

### Current Transition İsteği (instance'sız)

| | |
|---|---|
| **Format** | `urn:<namespace>:flow:transition:<domain>:<flowName>:<transitionName>` |
| **Örnek** | `urn:vnext:flow:transition:demo:sample-flow:approved` |

Aktif (current) instance bağlamında transition'ı tetikler; `instanceId` taşımaz. Client, üzerinde çalıştığı instance'ı bağlamdan bildiğinde kullanılır.

### Instance Koleksiyonu

| | |
|---|---|
| **Format** | `urn:<namespace>:flow:instances:<domain>:<flowName>` |
| **Örnek** | `urn:vnext:flow:instances:demo:sample-flow` |
| **HTTP karşılığı** | `GET /api/v1/{domain}/workflows/{flow}/instances` |

Bir flow'un **instance koleksiyonunu** — her liste ekranının üzerine kurulduğu kayıt listesini — adresler. `flow:start`'ın kardeşidir: verb 3. segmenttedir, domain 4. segmentte pozisyoneldir. Domain segmenti bilinçli olarak zorunludur; cross-domain kullanım (listeyi render eden uygulama ile listelenen kayıtların farklı domain'lerde olması) olağan durumdur ve domain'siz bir URN, onu kimin tuttuğuna göre farklı çözülürdü.

**URN'in taşımadıkları.** URN **adres**tir; sayfalama, sıralama ve taban filtre **policy**'dir ve URN'in yanında kardeş alanlar olarak yaşar:

```json
{
  "type": "Table",
  "source": "urn:vnext:flow:instances:demo:sample-flow",
  "pageSize": 20,
  "sort": { "field": "createdAt", "dir": "desc" },
  "filter": [{ "field": "branchCode", "operator": "eq", "value": "34001" }]
}
```

Aynı kayıtların farklı sayfalanmışı yine aynı kayıtlardır; `?page=2&size=20` gibi bilgiyi identifier'a koymak tek şey için iki isim üretirdi.

**Transport'u URN seçer.** Bir liste yüzeyinin `source` alanı hem instance koleksiyonu hem function URN'i alabilir; hangi taşıma yolunun kullanılacağına prop seçimi değil URN'in kendisi karar verir:

| `source` | Transport | Yüzeyin aldığı |
|---|---|---|
| `urn:vnext:flow:instances:<domain>:<flow>` | Instance query | Sunucu taraflı sayfalama, attribute filtreleri, sıralama, `hasNext`/`hasPrev`/`lastPage` |
| `urn:vnext:fn:<domain>:<key>` | Function | Tek fetch, dönen tüm satırlar, sayfalama yok |

Pseudo UI bağlamında diğer URN'ler gibi interpolasyona girer; böylece tek bir generic yüzey, kendisini açan kayda göre hedeflenebilir:

```json
"source": "urn:vnext:flow:instances:{{$instance.parentDomain}}:{{$instance.parentFlow}}"
```

### Instance'a Bağlı Koleksiyonlar (transitions / history)

Bir kaydın runtime'dan türeyen kendi listeleri de aynı ailede koleksiyon URN'iyle adreslenir:

| Format | Örnek | Anlamı |
|---|---|---|
| `urn:<ns>:flow:transitions:<domain>:<flowName>:<instanceId>` | `urn:vnext:flow:transitions:demo:sample-flow:${param}` | Runtime'ın instance için **şu an ilan ettiği** geçişler (available transitions) |
| `urn:<ns>:flow:history:<domain>:<flowName>:<instanceId>` | `urn:vnext:flow:history:demo:sample-flow:${param}` | Instance'ın **bugüne kadar yaptığı** geçişler |

Her ikisi de sıradan liste kaynağıdır: bir tanım bunları `Menu` / `Table` gibi herhangi bir liste yüzeyiyle render edebilir — ör. bir satırın "⋯" aksiyon paneli, arkasında özel bir node olmadan, bir kez yazılmış bir view haline gelir. İlan edilen bir geçişi tetiklemek için yukarıdaki **Transition İsteği** formu kullanılır.

### Function İsteği

Function URN'leri iki eksende değişir:

1. **Command** — açıkça yazılır (`get` / `post` / `patch` / `delete`) veya hiç yazılmaz. **Varsayılan `get`** olduğu için command'sız form geçerlidir.
2. **Kapsam** — function bir instance bağlamında mı (`flow` + `instanceId`), yoksa domain seviyesinde mi (yalnız `domain`) çağrılıyor.

| Kapsam | Command | Format | Örnek |
|--------|---------|--------|-------|
| Instance | Var | `urn:<ns>:fn:<command>:<domain>:<flow>:<instanceId>:<functionKey>` | `urn:vnext:fn:get:demo:sample-flow:${param}:custom-function` |
| Instance | Yok (`get`) | `urn:<ns>:fn:<domain>:<flow>:<instanceId>:<functionKey>` | `urn:vnext:fn:demo:sample-flow:${param}:custom-function` |
| Domain | Var | `urn:<ns>:fn:<command>:<domain>:<functionKey>` | `urn:vnext:fn:get:demo:custom-function` |
| Domain | Yok (`get`) | `urn:<ns>:fn:<domain>:<functionKey>` | `urn:vnext:fn:demo:custom-function` |

**HTTP karşılıkları:**

```text
# Instance-scoped function
urn:vnext:fn:get:demo:sample-flow:${param}:custom-function
  → GET /api/v1/demo/workflows/sample-flow/instances/{instance}/functions/custom-function

# Domain-scoped function
urn:vnext:fn:demo:custom-function
  → GET /api/v1/demo/functions/custom-function
```

#### Function Command Değerleri

| Command | HTTP metodu | Açıklama |
|---------|-------------|----------|
| `get` | GET | Veri okuma (varsayılan — yazılmazsa bu kabul edilir) |
| `post` | POST | Yeni kaynak oluşturma |
| `patch` | PATCH | Kısmi güncelleme |
| `delete` | DELETE | Silme |

### Kaynak (Resource) İsteği

Sistem bileşenlerinin (schema, flow, view, task vb.) **tanım datasını** döndürmek için kullanılır. `res`, **Resource** (kaynak) anlamına gelir; `res-key` ise hangi sistem bileşeni olduğunu belirtir. Bu URN arka planda aslında bir **data function** çağırır ve ilgili tanımın verisini döner.

| | |
|---|---|
| **Format** | `urn:<namespace>:res:<res-key>:<domain>:<key>` |
| **Örnek** | `urn:vnext:res:schema:core:input-schema` |

Diğer formatlardan farklı olarak `command`, `flow` ve `instanceId` segmentleri taşımaz; doğrudan `<res-key>:<domain>:<key>` ile sistem bileşenini adresler.

#### `res-key` Değerleri

Her `res-key`, ilgili sistem bileşeninin saklandığı sistem flow'una karşılık gelir:

| `res-key` | Sistem flow'u | Bileşen |
|-----------|---------------|---------|
| `schema` | `sys-schemas` | [Schema](/docs/components/schema) |
| `flow` | `sys-flows` | [Workflow](/docs/components/workflow) |
| `extension` | `sys-extensions` | [Extension](/docs/components/extension) |
| `function` | `sys-functions` | [Function](/docs/components/functions/) |
| `view` | `sys-views` | [View](/docs/components/view) |
| `task` | `sys-tasks` | [Task](/docs/components/tasks/) |

:::tip[View `dataSchema` kullanımı]
Bu yapı, view'ların `dataSchema` alanında bağlı oldukları şemayı adreslemek için de kullanılır — ör. `urn:vnext:res:schema:customer:registration-form`. Pseudo UI bağlamında ayrıntı için bkz. [Schema Tanımı](/docs/how-to/view-consept/schema-tanimi).
:::

---

## Binding Formatlama

URN, HTTP ve Deeplink yapılarında çalışma zamanında değer enjekte etmek için **binding** kullanılır. Kabul edilen tek format:

```text
${param}
```

Renderer / client, `${param}` ifadelerini bağlamdaki ilgili değerle (ör. aktif `instanceId`, seçili kayıt) değiştirir.

| Yapı | Binding desteği | Not |
|------|-----------------|-----|
| **URN** | ✅ `${param}` | Genellikle `instanceId` segmentinde |
| **Http** | ✅ `${param}` | Query veya path içinde |
| **Deeplink** | ✅ `${param}` | Şu an yalnızca **full path** desteklenir |

Örnekler:

```jsonc
// URN — instanceId binding
"urn:vnext:flow:transition:demo:sample-flow:${param}:approved"

// Http — query parametresi binding
{ "href": "https://example.com/detail?id=${param}" }

// Deeplink — full path binding
{ "href": "mock-app//sample-page/${param}" }
```

:::tip[Raw JSON + alan girişi]
View tiplerinin `content` alanlarında (Http / Urn / Deeplink) hem yapılandırılmış bir input alanı hem de ham JSON girişi desteklenir. Her iki yolda da `${param}` binding'i geçerlidir. Content shape'leri için bkz. [View → İçerik Tipleri](/docs/components/view).
:::

---

## İlgili

- [View component](/docs/components/view) — Http / Deeplink / URN view içerik shape'leri
- [Pseudo UI → Aksiyonlar ve Hook'lar](/docs/how-to/view-consept/aksiyonlar) — Button `command` içinde URN kullanımı
- [Functions](/docs/components/functions/) — function bileşenleri ve çağrı endpoint'leri
- [Authorization](/docs/concepts/authorization) — transition/function yetkilendirmesi
- [REST API](/docs/api-reference/rest-api) — URN'lerin çözüldüğü HTTP endpoint'leri
