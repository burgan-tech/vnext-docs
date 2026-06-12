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