---
id: declarative-mappings
title: Bildirimsel Task Mapping'leri
sidebar_label: Bildirimsel Mapping'ler
description: Task binding'inde .csx yerine input/output blokları — select, into, set ve Dynamic Expresso ifadeleri
---

# Bildirimsel Task Mapping'leri

Bir task binding'i (state `onEntries` / `onExits`, transition `onExecutionTasks`, function `task` /
`onExecutionTasks`, extension `task`) isteği şekillendirmek ve sonucu yazmak için C# `IMapping` dosyası
yerine iki JSON bloğu taşıyabilir: **`input`** ve **`output`**. Her blok `select`, `into` ve `set`
alanlarından oluşur; `set` değerleri [Dynamic Expresso](https://github.com/dynamicexpresso/DynamicExpresso)
ifadeleridir. Roslyn derlemesi yoktur; ifadeler publish anında derlenir ve hata JSON konumuyla döner.

:::info Sürüm
0.0.106'dan sonraki ilk runtime sürümü ve `inputMappingBlock` / `outputMappingBlock` tanımlarını içeren
vnext-schema sürümü gerekir. Daha eski sürümlerde binding `mapping` ister.
:::

## Ne zaman blok, ne zaman `.csx`?

Yeni bir binding için önce blokları kullanın; adımlar "bu değeri şuraya kopyala" ya da "bu değeri tek
ifadeyle hesapla" düzeyindeyse yeterlidir. Aşağıdaki durumlarda [`IMapping`](./interfaces) `.csx` yazın:

| İhtiyaç | Neden blokla olmaz |
|---|---|
| Secret, dosya okuma, ilişkili instance okuma | İfadeler yalnız değişken görür, I/O yapmaz |
| Döngü, çok adımlı dallanma, yardımcı sınıflar | Hedef başına tek ifade |
| FanOut, Notification ve Human task'ları | Runtime bu task'larda blokları **reddeder** |

Bir binding'de `mapping` **ya da** bloklar bulunur; ikisi birlikte (veya hiçbiri) şema ve publish
tarafından reddedilir.

## Yapı

```json
{
  "order": 1,
  "task": { "key": "score-task", "domain": "core", "version": "1.0.0", "flow": "sys-tasks" },
  "input": {
    "select": "$.data.customer",
    "into": "$.body.customer",
    "set": { "$.body.customerId": "data.customer.id", "$.headers.x-channel": "\"web\"" }
  },
  "output": {
    "select": "$.body.score",
    "into": "$.kyc.score",
    "set": { "$.kyc.checkedAt": "now", "$.kyc.state": "instance.currentState" }
  }
}
```

| Alan | Tip | Açıklama |
|---|---|---|
| `select` | string | Okuma path'i. Input'ta bir değişkenle başlar (`$.data.customer`); output'ta `result`'tan okur (varsayılan `$.body`) |
| `into` | string | Yazma path'i. Input'ta task `config`'inin bir alanı; output'ta instance verisi (kök `$` değil) |
| `set` | object | Yazma path'i → ifade. `into`'dan sonra, bildirim sırasıyla uygulanır (sonraki kazanır) |

Sabit bir metin tırnaklı ifadedir: `"\"web\""`. İfade başına en fazla 8000 karakter.

**Path dili:** `$`, `.name` (tire serbest), `['name']`, `[n]`, `[*]`. `[n]` ve `[*]` yalnız okumada
kullanılır; yazma hedefinde index/wildcard olmaz, diziler bütün olarak yazılır. Filtre ve recursive
descent yoktur.

## Input bloğu — isteği şekillendirmek

- **Hedefler task'ın kendi `config` alanlarıdır**, task JSON'undaki adlarıyla: `$.url`, `$.method`,
  `$.body.customer`, `$.headers.x-channel`, `$.timeoutSeconds`, DaprService'te `$.queryString`. C#
  `InputHandler`'ın değiştirebildiği her alana erişilir; kök `$` reddedilir.
- Blok, tanımdaki `config`'in bir kopyasını düzenler (dokunulmayan alanlar değerini korur) ve sonucu task
  tipinin kendi parser'ına verir; task tanımı bu değeri taşısaydı ne olacaksa o olur. Parser'ın reddettiği
  bir değer (`"$.url": "42"`) task'ı hatalı bitirir.
- Nesne olmayan bir alanın içine path (dizi gövdede `$.body.x`) hatadır; değiştirmek için alanı bütün olarak
  hedefleyin. Olmayan ya da `null` alan nesne olur. Header değerleri string olarak yazılır.
- Task tipinin okumadığı bir alan, task tanımında olduğu gibi **yok sayılır**; alan adlarını task'ın
  şemasıyla karşılaştırın.
- `select` ve `into` birlikte yazılır; `select` bir JSON değişkeniyle başlar (`$.data.x`, `$.task.body`).

### Birden fazla header

Her header için bir `set` anahtarı yazılır. Task tanımında
`"headers": { "Content-Type": "application/json", "x-channel": "mobile" }` olsun:

```json
"input": {
  "set": {
    "$.headers.x-channel": "\"web\"",
    "$.headers.x-customer-id": "data.customer.id",
    "$.headers.x-request-id": "instance.id",
    "$.headers.x-amount": "data.amount",
    "$.headers['x-correlation.id']": "instance.key",
    "$.headers.Accept-Language": "data.lang ?? \"tr-TR\"",
    "$.headers.x-approver": "user.available && user.hasRole(\"approver\") ? \"yes\" : \"no\""
  }
}
```

Task'a giden header'lar:

```json
{
  "Content-Type": "application/json",
  "x-channel": "web",
  "x-customer-id": "c-42",
  "x-request-id": "8b1f…",
  "x-amount": "1250.5",
  "x-correlation.id": "BASVURU-001",
  "Accept-Language": "tr-TR",
  "x-approver": "no"
}
```

| Durum | Sonuç |
|---|---|
| Tanımda olup bloğun dokunmadığı header (`Content-Type`) | Korunur |
| Tanımda olup blokta da yazılan header (`x-channel`) | Bloktaki değer kazanır |
| String olmayan değer (`data.amount`) | JSON metniyle gider (`1250.5` → `"1250.5"`; nesne → JSON'u) |
| Adında tire var | Düz yazılır: `$.headers.x-channel` |
| Adında nokta ya da boşluk var | Köşeli parantez: `$.headers['x-correlation.id']` |
| İfade `null` döner ya da eksik değeri okur | Hiçbir şey yazılmaz; tanımdaki değer kalır |
| Tanımda `headers` yok (ya da `null`) | Önce nesne oluşturulur |
| Tanımdaki `headers` nesne değil | Task hatalı biter |

- **`into: "$.headers"` nesnenin tamamını değiştirir** — `{ "select": "$.data.outgoingHeaders", "into": "$.headers" }`
  `Content-Type`'ı düşürür. `into` hedefini olduğu gibi yazar, birleştirmez; header'ları tek tek `set` ile ekleyin.
- Bir header silinemez: `null` "yazma" demektir. Boş değer için `"\"\""` gönderin ya da header'ı task tanımına koymayın.

### Config'ten URL

`.csx`'in `GetConfigValue` ile çözdüğü `API_BASEURL` yer tutucusu tek ifadedir:

```json
"input": {
  "set": {
    "$.url": "task.url.ToString().Replace(\"API_BASEURL\", config.get(\"Example:ApiBaseUrl\", \"http://localhost:3001\")) + \"/\" + urlEncode(data.customer.id)"
  }
}
```

- `task.url` bir JSON görünümüdür; string metotlarından önce `.ToString()` çağırın. `$"..."` interpolasyonu
  yoktur: `+` ya da `string.Format` kullanın.
- Veriyi path ya da query'ye `urlEncode(...)` ile ekleyin. `data.amount.AsDouble().ToString("0.00")` sunucu
  kültürüne uyar; `urlEncode(data.amount)` ya da `"" + data.amount` JSON metnini kullanır.

## Output bloğu — sonucu yazmak

- `select`, `result` = `{ body, headers, statusCode }` üzerinden okur.
- `into` seçilen değeri bir veri path'ine yazar. `into` yoksa seçilen **nesne** verinin köküne merge edilir;
  `select` yoksa `into` `result.body`'yi alır.
- Workflow'da tüm yazımlar **tek** instance-data append'idir (x-encryption, sürümleme ve ETag aynen geçerli).
  Function ve extension'da blok sonucu, bir `OutputHandler`'ın döndüreceği task çıktısıdır.

### Hangi parça neyi okur, neyi yazar

| Parça | Okuduğu | Yazdığı |
|---|---|---|
| `select` | Yalnız task cevabı: `result` = `{ body, headers, statusCode }`; `$` = `result`, varsayılan `$.body` | — |
| `into` | `select`'in bulduğu değer | Delta (instance verisi değil) |
| `set` anahtarı | — | Aynı delta |
| `set` değeri | Tüm değişkenler: `result`, `data`, `input`, `instance`, `now`, `user`, `task`, `config`, `context` | — |

Blok instance verisini doğrudan değiştirmez: bir delta kurar, delta en sonda tek seferde merge edilir. Bu yüzden
`set` içindeki `data`, task'tan **önceki** veridir — `into`'nun delta'ya yazdığı değer `data`'dan görünmez; onu
`result`'tan okuyun.

### Adım adım örnek

Task'tan önceki instance verisi ve task cevabı:

```json
{ "customer": { "id": "c-42", "name": "Ayşe" },
  "kyc": { "level": "basic", "score": 10, "history": [1, 2] } }
```

```json
{ "statusCode": 200,
  "headers": { "x-request-id": "r-991" },
  "body": { "score": 87, "band": "A", "checks": ["id", "address"] } }
```

Blok:

```json
"output": {
  "select": "$.body.score",
  "into": "$.kyc.score",
  "set": { "$.kyc.checkedAt": "now", "$.kyc.state": "instance.currentState" }
}
```

1. Delta boş başlar.
2. `select` + `into`: `result.body.score` = `87`, `$.kyc.score`'a yazılır (olmayan nesneler açılır) →
   `{ "kyc": { "score": 87 } }`.
3. `set`, yazılış sırasıyla →
   `{ "kyc": { "score": 87, "checkedAt": "2026-11-24T10:15:03.123Z", "state": "kyc-check" } }`.
4. Delta son veriye merge edilir ve yeni bir veri sürümü olarak saklanır:

```json
{ "customer": { "id": "c-42", "name": "Ayşe" },
  "kyc": { "level": "basic", "score": 87, "history": [1, 2],
           "checkedAt": "2026-11-24T10:15:03.123Z", "state": "kyc-check" } }
```

`kyc.level` ve `kyc.history` korunur (delta'da yoklar), `kyc.score` 10 → 87 olur, `band` ve `checks` yazılmaz
(`select` yalnız `score`'u aldı).

### `select` / `into` kombinasyonları

Yukarıdaki cevapla:

| Yazılan | Davranış | Delta |
|---|---|---|
| `select` + `into` | Seçilen değer `into`'ya | `"select": "$.body.band", "into": "$.kyc.band"` → `{ "kyc": { "band": "A" } }` |
| Yalnız `into` | `select` varsayılanı `$.body` | `"into": "$.kyc.response"` → `{ "kyc": { "response": { "score": 87, "band": "A", "checks": [...] } } }` |
| Yalnız `select` | Seçilen **nesnenin alanları** verinin köküne merge edilir | `"select": "$.body"` → `{ "score": 87, "band": "A", "checks": [...] }` |
| Yalnız `select`, değer nesne değil | Task hatalı biter | `"select": "$.body.score"` → `87` köke merge edilemez |
| İkisi de yok | Yalnız `set` çalışır | `set` ne yazarsa |

Cevabın header'ları ve durum kodu da okunabilir:

```json
"set": {
  "$.audit.requestId": "result.headers[\"x-request-id\"]",
  "$.audit.httpStatus": "result.statusCode",
  "$.kyc.approved": "result.body.score.AsInt32() >= 70"
}
```

### Çakışmalar ve sınır durumları

- **Sonraki kazanır:** `into: "$.kyc.score"` ardından `set: { "$.kyc.score": "result.body.score.AsInt32() * 2" }` → `174`.
- **Üst path delta'daki alt ağacın tamamını değiştirir:** `"$.kyc"` anahtarlı bir `set`, `into`'nun `kyc` altına
  yazdığını değiştirir; saklı `kyc.level` yine korunur, çünkü son merge derindir.
- **Nesne olmayanın içine yazılamaz:** `into` `$.kyc.score`'a `87` yazdıktan sonra `"$.kyc.score.detail"` anahtarı task'ı
  hatalı bitirir (`'score' exists and is not a JSON object`).
- **`data` önceki değerdir:** `{ "$.kyc.previousScore": "data.kyc.score" }` → `10` yazar.
- **Hata ya hep ya hiç:** eksik değer dışındaki her hata ([Eksik değer ve hata](#eksik-değer-ve-hata)) delta'nın hiçbir
  parçasını yazmaz.

### Instance verisine etkisi

1. **Nesneler anahtar anahtar, derinlemesine merge edilir**; delta'da olmayan alan silinmez.
2. **Diziler bütün olarak değiştirilir**: `{ "$.kyc.history": "result.body.checks" }`, `[1, 2]` yerine
   `["id", "address"]` yazar. Yazma path'lerinde `[n]` / `[*]` olmamasının nedeni budur; `select` `"$.body.checks[0]"` okuyabilir.
3. **Alan silinemez**: `set`'ten gelen `null` hiçbir şey yazmaz, merge de var olan bir anahtarı `null` ile temizlemez.
   "Temizlendi" anlamı gerekiyorsa bir değer kullanın (`""`, `false`, `"cleared"`).
4. **Hiçbir şey yazılmazsa yeni sürüm oluşmaz.**

## İfade değişkenleri

| Değişken | Anlamı | Örnek |
|---|---|---|
| `data` | instance'ın son verisi | `data.customer.id` |
| `input` | transition istek gövdesi | `input.amount` |
| `instance` | salt-okur görünüm, **camelCase**: `id`, `key`, `flow`, `version`, `currentState`, `effectiveState`, `effectiveStateType`, `effectiveStateSubType`, `effectiveStatus`, `type`, `data` | `instance.currentState` |
| `now` | mapping başına tek zaman damgası | `now` |
| `user` | çağıran: `available`, `roles`, `hasRole("x")` | `user.available && user.hasRole("approver")` |
| `context` | eski rule context'i (PascalCase, değişmedi) | `context.Instance.CurrentState` |
| `task` | task'ın `config`'i (JSON görünümü); output'ta input aşamasının bıraktığı hali | `task.url` |
| `config` | host yapılandırması, `GetConfigValue` ile aynı erişim | `config.get("Example:ApiBaseUrl", "http://localhost:3001")` |
| `result` | yalnız output: `body`, `headers`, `statusCode` | `result.body.score` |

- `urlEncode(value)` tek bir URL parçasını yüzde-kodlar. `task`, `config` ve `urlEncode` yalnız task
  mapping'lerinde vardır, koşul kurallarında yoktur.
- Adlar **büyük-küçük harfe duyarlıdır**; `instance.CurrentState` publish hatasıdır.
- JSON değerleri karşılaştırma ve aritmetikte dönüşüm ister: `data.amount.AsDouble() > 1000`,
  `.AsInt32()`, `.AsBoolean()`, `.AsArrayLength()`.
- Atama kapalıdır (`data.x = 1` publish hatası); yalnız `into` / `set` yazar.
- Yalnız ifadenin kullandığı değişkenler kurulur.

**`user`:** Sistem hop'larında (timer, SubFlow resume) `user.available` `false` olur ve `user.roles` /
`user.hasRole` okumak task'ı hatalı bitirir — her zaman koruyun: `user.available ? user.hasRole("x") : false`.
Function ve extension'da `available` her zaman `false`'tur.

## Eksik değer ve hata

- Bulunamayan `select`, eksik yaprak, `?.` ya da eksik ara üye üzerinden okuma (`customer` yokken
  `data.customer.id`) o girişte **hiçbir şey yazmaz**, hata vermez.
- Diğer her hata (hatalı dönüşüm, yazılamaz path, sistem hop'unda rol okuma) **task'ı hatalı bitirir**:
  error boundary devreye girer, boundary yoksa instance fault olur; delta'nın hiçbir parçası yazılmaz.
- JSON olmayan yanıt gövdesi string'dir: `result.body.x` eksik sayılır, `into`'suz `select` hata verir.

## Örnek

Uçtan uca çalışan senaryo: [`vnext-example` · declarative-mapping-lab](https://github.com/burgan-tech/vnext-example/tree/master/tests/Core.IntegrationTests/Tests/DeclarativeMappingLab).

## İlgili

- [Mappings](./mappings) — `.csx` mapping rehberi
- [Interfaces](./interfaces) — `IMapping` ve diğer arabirimler
- [Workflow](./workflow) — task binding'lerinin yeri
