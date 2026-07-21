---
sidebar_position: 2
title: Instance Filtering
description: Instance sorgulama, filtreleme kriterleri, query patterns
---

# Instance Filtreleme Kılavuzu

## Genel Bakış

vNext workflow sistemi, instance'ları sorgulamak için güçlü filtreleme yetenekleri sağlar. Hem **Instance tablo kolonları** hem de **JSON veri alanları** üzerinde legacy format veya GraphQL-stil JSON format kullanarak filtreleme yapabilirsiniz.

## Desteklenen Route'lar

### 1. Workflow instances route (önerilen, +)

**GetInstancesTask** ve workflow düzeyinde listeleme için bu route kullanılmalıdır:

```http
GET /{domain}/workflows/{workflow}/instances?filter={...}
```

### 2. Function/Data route (instance kapsamlı veri)

```http
GET /{domain}/workflows/{workflow}/instances/{instance}/functions/data?filter={...}
```

> **Not:** **Toplu / workflow düzeyi** sorgular için **`.../instances?filter=...`** tercih edin. **GetInstancesTask** için  itibarıyla kapsamsız `GET .../workflows/{workflow}/functions/data` yolu desteklenmez (*sürüm notları (Phase 3 — Release Notes)*).

Uygun olduğu yerlerde her iki giriş noktası da aynı `filter` sorgu parametresi semantiğini kullanır.

---

## Filtre Formatları

### Legacy Format

Basit anahtar-değer formatı: `field=operator:value`

### GraphQL Format (Önerilen)

Mantıksal operatör desteği olan JSON tabanlı format: `{"field":{"operator":"value"}}`

> ** breaking change:** Filter parametresi **tek bir ifade** (tek JSON nesnesi veya string) olmalıdır. Önceki dizi formatı `"filter": ["expr1", "expr2"]` artık desteklenmemektedir. Tek ifade kullanın; koşulları bu ifade içinde `and`/`or` ile birleştirin (örn. `{"and":[{"status":{"eq":"Active"}},{"attributes.amount":{"gt":"500"}}]}`).

---

## Filtrelenebilir Alanlar

### Instance Tablo Kolonları

Doğrudan veritabanı kolonları:

| Kolon | Tip | Açıklama | Desteklenen Operatörler |
|-------|-----|----------|-------------------------|
| `key` | string | Instance anahtarı | eq, ne, like, startswith, endswith, in, nin |
| `flow` | string | Workflow adı | eq, ne, like, startswith, endswith, in, nin |
| `status` | string | Instance durumu | eq, ne, in, nin |
| `currentState` (veya `state`) | string | Mevcut state | eq, ne, like, startswith, endswith, in, nin |
| `effectiveState` | string | Etkin state adı | eq, ne, like, startswith, endswith, in, nin |
| `effectiveStateType` | int | Etkin state tipi kodu | eq, ne, gt, ge, lt, le, in, nin |
| `effectiveStateSubType` | int | Etkin state alt tipi kodu (+;: **7** = İptal, **8** = Zaman aşımı) | eq, ne, gt, ge, lt, le, in, nin |
| `createdAt` | DateTime | Oluşturulma zamanı | eq, ne, gt, ge, lt, le, between |
| `modifiedAt` | DateTime | Değiştirilme zamanı | eq, ne, gt, ge, lt, le, between |
| `completedAt` | DateTime | Tamamlanma zamanı | eq, ne, gt, ge, lt, le, between |
| `isTransient` | boolean | Geçici işaret | eq, ne |

### JSON Veri Alanları (attributes)

Instance'ın JSON verisinde saklanan alanlar `attributes` prefix'i ile filtrelenebilir. Ancak bir JSON alanının **filtrelenebilir ve sıralanabilir** olması, **master şemada** o alan için tanımlı vocabulary'e (`x-filterOperators` / `x-sortable`) bağlıdır — bkz. [Şema-Tabanlı Filtrelenebilirlik ve Sıralama](#şema-tabanlı-filtrelenebilirlik-ve-sıralama).

---

## Şema-Tabanlı Filtrelenebilirlik ve Sıralama

Instance tablo kolonları (`key`, `status`, `createdAt` …) doğrudan filtrelenebilir/sıralanabilir. Buna karşılık **JSON (`attributes.*`) alanları** için bu yetenek, **master şemadaki** alan tanımının taşıdığı vocabulary keyword'leri ile belirlenir. Data Function ve instance listeleme endpoint'leri bu tanıma göre çalışır:

| Keyword | Etki |
|---------|------|
| `x-filterOperators` (string[]) | Alanda izin verilen filtre operatörleri. **Boş veya yok ise alan filtrelenemez** |
| `x-sortable` (boolean) | `true` ise alan sıralanabilir; yok ise sıralanamaz |
| `x-displayFormat` (string) | UI'a yönelik format ipucu (örn. `yyyy-MM-dd'T'HH:mm:ssXXX`) — filtreleme/sıralamayı etkilemez |

Keyword tanımları için bkz. [Schema → Filtreleme & Sıralama Vocabulary'si](/docs/components/schema#filtreleme--sıralama-vocabularysi) ve [Schema Tanımı](/docs/how-to/view-consept/schema-tanimi).

### Tip-Operatör İlişkisi

İzin verilen operatörlerin davranışı, alanın JSON Schema `type` değerine göre değişir:

| Schema `type` | Operatör kategorisi | SQL davranışı |
|---|---|---|
| `number` / `integer` | `gt`, `lt`, `ge`, `le`, `between` | `accessor::numeric {op} @param` |
| `string` + `gt`/`lt`/`ge`/`le`/`between` | tarih karşılaştırma | `accessor::timestamptz {op} @param` |
| `string` + `eq`/`like`/`startswith`/`endswith`/`match` | metin karşılaştırma | `accessor ILIKE @param` |
| `boolean` | `eq`, `ne` | equality |
| `array` (instance verisinde JSON dizi) | `includes` | `Data @> @param`; yaprak yolda tek elemanlı dizi + kısmi nesne deseni |

### Kurallar

1. `x-filterOperators` mevcut ve dolu ise alan filtrelenebilir. Boş veya yok ise alan filtrelenemez.
2. `x-sortable: true` ise alan sıralanabilir. Tanımlı değilse sıralanabilir değildir.
3. Filtrelenemez bir alan sorgulandığında veya izin verilmeyen bir operatör kullanıldığında **`SchemaFilterValidationException`** fırlatılır.
4. JSON dizisi alanlarında kullanılan GraphQL-only `includes` operatörü için, ilgili alanın `x-filterOperators` listesinde `includes` tanımlı olmalıdır (diğer operatörler gibi). Yük boyutu ve iç içe derinlik **`InputValidator`** limitleriyle sınırlıdır.

```json
"startDateTime": {
  "type": "string",
  "format": "date-time",
  "x-filterOperators": ["eq", "gt", "ge", "lt", "le", "between"],
  "x-sortable": true,
  "x-displayFormat": "yyyy-MM-dd'T'HH:mm:ssXXX"
}
```

---

## Desteklenen Operatörler

| Operatör | Açıklama | Örnek Değer |
|----------|----------|-------------|
| `eq` | Eşittir | `"1111"` |
| `ne` | Eşit değildir | `"test"` |
| `gt` | Büyüktür | `"100"` |
| `ge` | Büyük veya eşittir | `"100"` |
| `lt` | Küçüktür | `"100"` |
| `le` | Küçük veya eşittir | `"100"` |
| `between` | Arasında (dahil) | `["2024-01-01", "2024-12-31"]` |
| `like` | İçerir (büyük/küçük harf duyarsız) | `"workflow"` |
| `startswith` | İle başlar | `"payment"` |
| `endswith` | İle biter | `"flow"` |
| `in` | Listede | `["Active", "Busy"]` |
| `nin` | Listede değil | `["Completed", "Faulted"]` |
| `isnull` | Null veya null değil | `true` veya `false` |

---

## Status Değerleri

`status` alanı hem kod hem de isim kabul eder:

| Status İsmi | Kod | Açıklama |
|-------------|-----|----------|
| `Active` | `A` | Instance aktif |
| `Busy` | `B` | Instance işlem yapıyor |
| `Completed` | `C` | Instance başarıyla tamamlandı |
| `Faulted` | `F` | Instance hata aldı |
| `Passive` | `P` | Instance pasif |

> **:** `status` ve `state` (currentState) üzerinde filtreleme artık instance sorgularında doğru çalışmaktadır.

---

## OrderBy / Sort

Instance listesi ve data endpoint'leri `sort` veya `orderBy` query parametresi ile sıralama destekler.

### Tek alan

```
?sort={"field":"createdAt","direction":"desc"}
?orderBy={"field":"status","direction":"asc"}
```

### Çoklu alan

```
?sort={"fields":[{"field":"status","direction":"asc"},{"field":"createdAt","direction":"desc"}]}
```

- **direction**: `"asc"` veya `"desc"` (büyük/küçük harf duyarsız). Verilmezse varsayılan `"asc"`.

### Sıralanabilir alanlar

| Alan | Notlar |
|------|--------|
| `createdAt` | Oluşturulma zamanı |
| `modifiedAt` | Değiştirilme zamanı |
| `completedAt` | Tamamlanma zamanı |
| `status` | Instance durumu |
| `key` | Instance anahtarı |
| `currentState` / `state` | Mevcut state (`state` alias) |
| `attributes.fieldName` | Instance verisine JSON yolu; iç içe yollar desteklenir (örn. `attributes.nested.path`). Yalnızca master şemada **`x-sortable: true`** taşıyan alanlar sıralanabilir |

Instance kolonları veritabanında uygulanır; `attributes.*` sıralaması en güncel instance verisi JSON'u kullanır ve filtreleme ile aynı şema/güvenlik kurallarına tabidir (bkz. [Şema-Tabanlı Filtrelenebilirlik ve Sıralama](#şema-tabanlı-filtrelenebilirlik-ve-sıralama)).

---

## GraphQL Format Örnekleri

### 1. Basit Instance Kolon Filtresi

```http
GET /banking/workflows/payment-workflow/instances?filter={"key":{"eq":"payment-12345"}}
```

### 2. Çoklu Instance Kolon Filtreleri (AND Mantığı)

Aynı seviyedeki birden fazla alan AND mantığı ile birleştirilir:

```http
GET /banking/workflows/payment-workflow/instances?filter={"status":{"eq":"Active"},"createdAt":{"gt":"2024-01-01"}}
```

### 3. JSON Veri Alanı Filtresi (attributes)

`attributes` prefix'i kullanarak JSON veri alanlarını filtreleyin:

```http
GET /banking/workflows/payment-workflow/instances?filter={"attributes":{"customerId":{"eq":"CUST-123"}}}
```

### 4. Karışık Filtre (Instance + JSON Alanları)

```http
GET /banking/workflows/payment-workflow/instances?filter={"key":{"like":"payment"},"status":{"eq":"Active"},"attributes":{"amount":{"gt":"500"}}}
```

### 5. Tarih Aralığı Filtresi

```http
GET /banking/workflows/payment-workflow/instances?filter={"createdAt":{"between":["2024-01-01","2024-01-31"]}}
```

### 6. Status IN Filtresi

```http
GET /banking/workflows/payment-workflow/instances?filter={"status":{"in":["Active","Busy"]}}
```

### 7. EffectiveState Filtreleri

**Etkin State Adına Göre Filtreleme:**
```http
GET /banking/workflows/payment-workflow/instances?filter={"effectiveState":{"eq":"awaiting-approval"}}
```

**Etkin State Alt Tipine Göre Filtreleme (İnsan Görevleri):**
```http
GET /approvals/workflows/approval-flow/instances?filter={"effectiveStateSubType":{"eq":"6"}}
```

**Etkin State Alt Tipine Göre Filtreleme (Meşgul Görevler):**
```http
GET /processing/workflows/order-flow/instances?filter={"effectiveStateSubType":{"eq":"5"}}
```

**Birleşik Status ve EffectiveState Filtresi:**
```http
GET /core/workflows/payment/instances?filter={"status":{"eq":"Active"},"effectiveStateSubType":{"eq":"6"}}
```

**EffectiveState Alt Tip Değerleri:**
- `0` - Yok (None)
- `1` - Başarı (Success)
- `2` - Hata (Error)
- `3` - Sonlandırıldı (Terminated)
- `4` - Askıya Alındı (Suspended)
- `5` - Meşgul (Busy) - işlem devam ediyor
- `6` - İnsan (Human) - insan etkileşimi gerekli

---

## Mantıksal Operatörler

### AND Operatörü

Tüm koşulların doğru olması gereken birden fazla koşulu birleştirir:

```json
{
  "and": [
    {"status": {"eq": "Active"}},
    {"attributes": {"amount": {"gt": "500"}}}
  ]
}
```

### OR Operatörü

Herhangi birinin doğru olabileceği birden fazla koşulu birleştirir:

```json
{
  "or": [
    {"key": {"eq": "payment-12345"}},
    {"key": {"eq": "payment-12346"}}
  ]
}
```

### NOT Operatörü

Bir koşulu tersine çevirir:

```json
{
  "not": {"status": {"in": ["Completed", "Faulted"]}}
}
```

### Karmaşık İç İçe Örnek

```json
{
  "and": [
    {"status": {"eq": "Active"}},
    {
      "or": [
        {"attributes": {"priority": {"eq": "high"}}},
        {"attributes": {"amount": {"gt": "10000"}}}
      ]
    }
  ]
}
```

---

## Group By ve Aggregations

### Group By ile Count

```http
GET /banking/workflows/payment-workflow/instances?filter={"groupBy":{"field":"attributes.status","aggregations":{"count":true}}}
```

**Yanıt:**
```json
{
  "groups": [
    {"name": "pending", "count": 45},
    {"name": "approved", "count": 123},
    {"name": "rejected", "count": 12}
  ]
}
```

### Group By ile Çoklu Aggregation

```http
GET /banking/workflows/payment-workflow/instances?filter={"groupBy":{"field":"attributes.currency","aggregations":{"count":true,"sum":"attributes.amount","avg":"attributes.amount","min":"attributes.amount","max":"attributes.amount"}}}
```

**Yanıt:**
```json
{
  "groups": [
    {"name": "USD", "count": 150, "sum": 450000, "avg": 3000, "min": 10, "max": 50000},
    {"name": "EUR", "count": 75, "sum": 180000, "avg": 2400, "min": 50, "max": 25000}
  ]
}
```

### Desteklenen Aggregation'lar

| Aggregation | Açıklama |
|-------------|----------|
| `count` | Gruptaki öğe sayısı |
| `sum` | Sayısal alanın toplamı |
| `avg` | Sayısal alanın ortalaması |
| `min` | Minimum değer |
| `max` | Maksimum değer |

---

## Fluent InstanceQuery Builder

Script mapping'lerde (`.csx`) filter/sort JSON'ını elle string birleştirmek yerine **fluent `InstanceQuery` builder'ı** kullanılır. Tek bir builder, platformdaki tüm instance sorgularını tanımlar. `BBT.Workflow.Filtering` namespace'indedir ve script engine'in varsayılan import'larına dahildir — `.csx` dosyalarınızda `using` gerektirmez.

### Tek builder, iki terminal

Zinciri **nasıl bitirdiğiniz** ne elde ettiğinizi belirler:

| Terminal | Üretir | Kullanım yeri |
|---|---|---|
| `.First()` / `.Last()` | Tam olarak **bir** instance çözen filtre | Event korelasyonu (`EventMappingResult.Selector`) — bkz. [Event-Driven Workflow'lar](/docs/how-to/event-driven-workflows) |
| `.Build()` | `InstanceQuerySpec` — **liste/rapor** sorgusu | `GetInstancesTask.SetFilterSpec(...)` veya `DaprServiceTask` için wire string'leri |

Terminalden önceki her şey (`Where`, `OrGroup`, `Not`, `OrderBy`) iki kullanım için de aynıdır.

### Filtrelenebilir alanlar

İki tür alan vardır; geçilen isimle ayrışırlar:

- **Instance kolonları** — çıplak isimler, whitelist'lidir: `id`, `key`, `flow`, `status`, `currentState` (veya `state`), `effectiveState`, `effectiveStateType`, `effectiveStateSubType`, `stage`, `createdAt`, `modifiedAt`, `completedAt`. Yazım hatası sessizce boş sonuç dönmek yerine **hata fırlatır**.
- **Instance-data attribute'ları** — `attributes.` önekiyle, iç içe alanlar için noktalı: `attributes.amount`, `attributes.address.city`, `attributes.employment.department.name`. Her derinlik çalışır.

### Operatör referansı

Her operatörün fluent çağrısı ve ürettiği wire JSON (yukarıdaki [Desteklenen Operatörler](#desteklenen-operatörler) ile birebir aynıdır):

| Operatör | Fluent çağrı | Wire JSON |
|---|---|---|
| Eşit | `.Where("attributes.status", f => f.Eq("active"))` | `{"attributes":{"status":{"eq":"active"}}}` |
| Eşit değil | `.Where("attributes.status", f => f.Ne("cancelled"))` | `{"attributes":{"status":{"ne":"cancelled"}}}` |
| Büyük | `.Where("attributes.amount", f => f.Gt(1000))` | `{"attributes":{"amount":{"gt":1000}}}` |
| Büyük eşit | `.Where("attributes.age", f => f.Ge(18))` | `{"attributes":{"age":{"ge":18}}}` |
| Küçük | `.Where("attributes.amount", f => f.Lt(500))` | `{"attributes":{"amount":{"lt":500}}}` |
| Küçük eşit | `.Where("attributes.age", f => f.Le(65))` | `{"attributes":{"age":{"le":65}}}` |
| İçerir (case-insensitive) | `.Where("attributes.name", f => f.Like("Ada"))` | `{"attributes":{"name":{"like":"Ada"}}}` |
| İle başlar | `.Where("attributes.email", f => f.StartsWith("info"))` | `{"attributes":{"email":{"startswith":"info"}}}` |
| İle biter | `.Where("attributes.email", f => f.EndsWith("@x.com"))` | `{"attributes":{"email":{"endswith":"@x.com"}}}` |
| Liste içinde | `.Where("attributes.city", f => f.In("London", "Paris"))` | `{"attributes":{"city":{"in":["London","Paris"]}}}` |
| Liste dışında | `.Where("attributes.city", f => f.NotIn("Rome"))` | `{"attributes":{"city":{"nin":["Rome"]}}}` |
| Aralıkta (dahil) | `.Where("attributes.age", f => f.Between(18, 65))` | `{"attributes":{"age":{"between":[18,65]}}}` |
| Null / null değil | `.Where("attributes.phone", f => f.IsNull(false))` | `{"attributes":{"phone":{"isNull":false}}}` |
| Dizi içinde nesne | `.Where("attributes.participants", f => f.Includes(new { userId }))` | `{"attributes":{"participants":{"includes":{"userId":"..."}}}}` |

Notlar:

- `Includes`, bir JSON **dizisinin** elemanlarından birinin verilen kısmi objeyi içerip içermediğini kontrol eder (PostgreSQL `jsonb @>`). Yalnızca **liste sorgusu** özelliğidir — `First()/Last()` build aşamasında reddeder.
- Aralık operatörlerine tarihleri ISO-8601 string olarak geçin: `f.Ge("2026-07-01T00:00:00Z")`.

### Koşul birleştirme

**AND** — her üst seviye `Where` (ve `OrGroup`/`Not`) mantıksal AND olarak birleşir:

```csharp
InstanceQuery.Create()
    .Where("attributes.scopeGroup", f => f.Eq("bireysel-3"))
    .Where("currentState",          f => f.Eq("complete"))
// -> scopeGroup = "bireysel-3" AND currentState = "complete"
```

**OR** — `OrGroup` dallar alır; en az bir dal eşleşmelidir. Bir dal birden fazla koşul içerebilir; dal içinde AND'lenir:

```csharp
.OrGroup(
    q => q.Where("attributes.limitKey", f => f.Eq(p.limitKey))
          .Where("attributes.amount",   f => f.Eq(p.amount)),
    q => q.Where("attributes.scopeGroup", f => f.Eq(p.scopeGroup))
          .Where("attributes.scope",      f => f.Eq(p.scope)))
// -> (limitKey AND amount) OR (scopeGroup AND scope)
```

**NOT** — iç grubu olumsuzlar:

```csharp
.Not(q => q.Where("attributes.status", f => f.Eq("cancelled")))
```

**Aynı alanda birden fazla operatör** — zincirlenir, AND'lenir:

```csharp
.Where("attributes.age", f => f.Ge(18).Lt(65))
// -> age >= 18 AND age < 65
```

Gruplar serbestçe iç içe geçebilir; koşullar düz C# olduğu için `if` ile **koşullu olarak** da eklenebilir.

### Sıralama ve First/Last

```csharp
.OrderBy("createdAt")                            // artan
.OrderByDescending("attributes.startDateTime")   // azalan; iç içe attribute çalışır
```

- Hiçbir şey belirtilmezse varsayılan sıralama `createdAt` artan yönlüdür.
- `First()` etkin sıralamada en üstteki satırı, `Last()` en alttakini alır. "En yeni eşleşen instance" = `.OrderBy("createdAt").Last()` veya `.OrderByDescending("createdAt").First()` — aynı sonuç.
- Sayısal attribute'lar **sayısal** sıralanır (9 < 20 < 100), metin olarak değil.

### Tip semantiği (tekil çözümleme motoru)

`First()/Last()` motoru, geçilen operandın .NET tipine göre karşılaştırır:

| Geçilen operand | Nasıl karşılaştırılır |
|---|---|
| `Eq(30)`, `In(1, 2, 3)` — gerçek sayı/tarih | Tipli — `Eq(30)` saklanan `30.0` ile eşleşir |
| `Eq("123")`, `Eq("2026-04-27")` — string (sayı/tarih görünümlü olsa da) | **Metin** — ID ve kodlar için güvenli |
| `Gt("2026-07-01T00:00:00Z")`, `Between("2026-01-01", "2026-12-31")` | Aralık sınırları problanır: tarih benzeri string'ler timestamp, sayısal string'ler sayı olarak karşılaştırılır |
| `Gt("M")` — düz string | Metin — alfabetik aralıklar çalışır |

Pratik kural: **sayıları sayı, tarihleri ISO string, tanımlayıcıları string** olarak geçin.

### GroupBy ve Aggregation'lar (yalnız liste sorguları)

```csharp
var spec = InstanceQuery.Create()
    .Where("attributes.scopeGroup", f => f.Eq(scopeGroup))
    .GroupBy("attributes.limitKey")     // bir veya daha fazla alan
    .Sum("attributes.amount")           // aggregation'lar: Count(), Sum, Avg, Min, Max
    .Count()
    .Build();
```

- Gruplu sorgular instance yerine `GroupSummary` öğeleri döner.
- Gruplarken aggregation'lar groupBy'ın **içine** yerleşir; motorun desteklediği tek kombinasyon budur.
- `GroupBy` ve aggregation'lar `First()/Last()` ile **build aşamasında hata fırlatır** — liste özellikleridir.

### Build-time korumaları

| Kural | Sonuç |
|---|---|
| Sıfır koşulla `First()/Last()` | Hata — filtresiz tekil çözümlemeye izin verilmez |
| Sıfır koşulla `Build()` | Geçerli — liste/rapor için match-all olabilir |
| `First()/Last()` ile `Includes` | Hata — liste özelliği |
| `First()/Last()` ile `GroupBy`/aggregation | Hata — liste özelliği |
| Bilinmeyen kolon adı | Hata — kolonlar whitelist'lidir |
| Operatörsüz `Where` | Hata — en az bir operatör gerekli |

Değerler her zaman spec tarafından serialize edilir, asla string birleştirilmez — escaping ve injection sizin yerinize yönetilir.

### Tüketim noktaları

Aynı fluent dilin üç tüketim noktası vardır:

**1. Event Selector** — terminal `First()/Last()`. `action=transition` için payload'da key yokken `IEventMapping` içinde kullanılır. Detay: [Event-Driven Workflow'lar](/docs/how-to/event-driven-workflows).

**2. GetInstancesTask** — terminal `Build()` → `SetFilterSpec(...)` (**önerilen**). JSON yok, query string yok, endpoint URL'i yok; platform spec'i wire formatına kendisi çevirir. Aynı domain'e giden sorgular **in-process** çalışır. Detay ve örnek: [GetInstances Task → Fluent Filtreleme](/docs/components/tasks/get-instances#fluent-filtreleme-setfilterspec).

**3. DaprServiceTask** — terminal `Build()` → wire string'leri. Instances liste endpoint'i zaten GraphQL-stil filter string'leri kabul eder; spec bunları tip güvenli üretir:

```csharp
var spec = InstanceQuery.Create()
    .Where("status", f => f.Eq("A"))
    .OrderBy("attributes.startDateTime")
    .Build();

serviceTask.SetQueryString(
    "pageSize=100"
    + "&filter=" + Uri.EscapeDataString(spec.ToFilterJson())
    + "&sort="   + Uri.EscapeDataString(spec.ToSortJson()));
// Veya tek çağrıyla: serviceTask.SetQueryString(spec.ToQueryString(page: 1, pageSize: 100));
```

`InstanceQuerySpec` serializer'ları:

| Serializer | Ürettiği | Query parametresi |
|---|---|---|
| `ToFilterJson()` | GraphQL wire JSON filtresi (null = match-all) | `filter` |
| `ToSortJson()` | `{"fields":[{"field":"createdAt","direction":"desc"}]}` | `sort` |
| `ToGroupByJson()` | `{"fields":[...],"aggregations":{...}}` | `groupBy` |
| `ToAggregationsJson()` | Bağımsız aggregation'lar (yalnız groupBy yokken) | `aggregations` |
| `ToFilterRequestJson()` | Filtre veya groupBy/aggregation zarfı — `GetInstancesTask`'ın dahili kullandığı | `filter` |
| `ToQueryString(page, pageSize)` | Yukarıdakilerin tamamını içeren URL-encoded query string | hepsi |

**Hangisini kullanmalı?**

| Durum | Kullanın |
|---|---|
| Event transition, payload'da business key var | `InstanceKey` — selector gerekmez |
| Event transition, payload'da key yok | `Selector` + `First()/Last()` |
| Task instance listesine ihtiyaç duyuyor (yeni kod) | `GetInstancesTask` + `SetFilterSpec(query.Build())` |
| Task ham HTTP/Dapr liste endpoint'ini çağırmak zorunda (mevcut entegrasyonlar) | `DaprServiceTask` + `spec.ToFilterJson()/ToSortJson()/ToQueryString()` |

## En İyi Uygulamalar

### 1. Kompleks Sorgular için GraphQL Format Kullanın

GraphQL formatı daha okunabilir ve mantıksal operatörleri destekler.

**İyi:**
```json
{
  "and": [
    {"status": {"eq": "Active"}},
    {"attributes": {"amount": {"gt": "500"}}}
  ]
}
```

### 2. Daha İyi Performans için Spesifik Alanlar Kullanın

Mümkün olduğunda indekslenmiş Instance kolonlarını filtreleyin.

**Daha İyi Performans:**
```json
{"key": {"eq": "payment-12345"}}
```

**Daha Yavaş:**
```json
{"attributes": {"indekslenmemişAlan": {"eq": "değer"}}}
```

### 3. Okunabilirlik için Status İsimleri Kullanın

```json
{"status": {"eq": "Active"}}
```
şuna eşittir:
```json
{"status": {"eq": "A"}}
```

### 4. Analitik için Group By Kullanın

İstatistiklere ihtiyacınız olduğunda, tüm kayıtları çekmek yerine group by kullanın.

```json
{
  "groupBy": {
    "field": "attributes.status",
    "aggregations": {"count": true, "sum": "attributes.amount"}
  }
}
```

### 5. Daima Sayfalama Kullanın

Her zaman `page` ve `pageSize` parametrelerini kullanın:

```http
GET /banking/workflows/payment-workflow/instances?filter={...}&page=1&pageSize=20
```

---

## Hata Yönetimi

### Geçersiz Filtre Syntax

```json
{
  "error": {
    "code": "invalid_filter",
    "message": "Geçersiz filtre sözdizimi. Geçerli JSON bekleniyor."
  }
}
```

### Desteklenmeyen Operatör

```json
{
  "error": {
    "code": "unsupported_operator",
    "message": "'regex' operatörü desteklenmiyor",
    "supportedOperators": ["eq", "ne", "gt", "ge", "lt", "le", "between", "like", "startswith", "endswith", "in", "nin", "isnull"]
  }
}
```

### Geçersiz Kolon Adı

```json
{
  "error": {
    "code": "invalid_column",
    "message": "'gecersizKolon' geçerli bir Instance kolonu değil. JSON alanları için 'attributes.alanAdi' kullanın.",
    "validColumns": ["key", "flow", "status", "currentState", "createdAt", "modifiedAt", "completedAt", "isTransient"]
  }
}
```

### Şema Filtre Doğrulama Hatası

Master şemada **filtrelenemez** bir alan (`x-filterOperators` boş/yok) sorgulandığında veya alan için **izin verilmeyen bir operatör** kullanıldığında **`SchemaFilterValidationException`** fırlatılır. Aynı kural sıralama için `x-sortable` üzerinden geçerlidir. Bkz. [Şema-Tabanlı Filtrelenebilirlik ve Sıralama](#şema-tabanlı-filtrelenebilirlik-ve-sıralama).

---

## Performans İpuçları

1. **Sayfalama Kullanın**: Daima `page` ve `pageSize` parametrelerini kullanın
2. **İndeksli Kolonlarda Filtreleyin**: Daha iyi performans için `key`, `status`, `createdAt` tercih edin
3. **Group By Alanlarını Sınırlayın**: Optimal performans için maksimum 2-3 alanda group by yapın
4. **Tarih Aralıklarını Akıllıca Kullanın**: Dar tarih aralıkları sorgu performansını artırır
5. **Büyük Veri Setlerinde Wildcard Aramadan Kaçının**: Mümkün olduğunda `like` yerine `startswith` veya `endswith` kullanın

---

## İlgili Dökümanlar

- [Function API'leri](/docs/components/functions/built-in) - Yerleşik sistem fonksiyonları (State, Data, View)
- [Custom Functions](/docs/components/functions/custom) - Kullanıcı tanımlı fonksiyonlar
- [Instance Data](/docs/concepts/instance-data) - Instance veri yapısı ve yaşam döngüsü
- [Schema → Filtreleme & Sıralama Vocabulary'si](/docs/components/schema#filtreleme--sıralama-vocabularysi) - `x-filterOperators`, `x-sortable`, `x-displayFormat` tanımları
- [Schema Tanımı](/docs/how-to/view-consept/schema-tanimi) - tasarımcı bakışıyla `x-*` uzantıları