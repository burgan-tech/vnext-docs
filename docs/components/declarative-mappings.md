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
| `input` | hop'u tetikleyen istek gövdesi (task payload'ı değil); timer, devam ve SubFlow resume'da `null` — bkz. [`input` ve `headers`](#input-ve-headers) | `input.amount` |
| `instance` | salt-okur görünüm, **camelCase**: `id`, `key`, `flow`, `version`, `currentState`, `effectiveState`, `effectiveStateType`, `effectiveStateSubType`, `effectiveStatus`, `type`, `data` | `instance.currentState` |
| `now` | mapping başına tek zaman damgası | `now` |
| `user` | çağıran: `available`, `roles`, `hasRole("x")` | `user.available && user.hasRole("approver")` |
| `context` | eski rule context'i (PascalCase, değişmedi) | `context.Instance.CurrentState` |
| `task` | task'ın `config`'i (JSON görünümü); output'ta input aşamasının bıraktığı hali | `task.url` |
| `config` | host yapılandırması, `GetConfigValue` ile aynı erişim | `config.get("Example:ApiBaseUrl", "http://localhost:3001")` |
| `result` | yalnız output: `body`, `headers`, `statusCode` | `result.body.score` |
| `headers` | **gelen isteğin** header'ları, salt-okur; adlar büyük-küçük harfe duyarsız | `headers["x-channel"]`, `headers.has("x-channel")` |

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

## `input` ve `headers`

`input`, **hop başına tek değerdir**: hop'u tetikleyen ham istek gövdesi. Hop'un tüm adımları aynı değeri okur; task çıktıları onu değiştirmez, birleşik instance verisi ya da task yanıtı da değildir.

| Tetikleyici | `input` |
|---|---|
| Manuel transition, instance start, `updateData`, retry | istek gövdesi (retry'da gövde yoksa `null`) |
| Event ile tetiklenen transition'da task mapping'leri | event bloğunun (ya da event `mapping` betiğinin) kurduğu **eşlenmiş gövde**; ham event payload'ı değil |
| Event bloğunun kendisi (`event.input`) | event payload'ı (CloudEvent açıldıktan sonra; boş gövdede `null`) — bkz. [Event `input`](#event-input) |
| Function'ın `output` bloğu ve task mapping'leri | function'ın istek gövdesi |
| Transition / start `schemas[]` kuralı | transition istek gövdesi, **gönderildiği gibi** (`x-storage` dosya takasından önce) |
| Çalışan timer, otomatik devam hop'u, SubFlow resume (tamamlanma, fault, iptal) | `null` |
| Okuma yolları (view seçimi, state/data function'ları) | `null` |

Bir kural `input == null` ile tetikleyen hop'u devamdan ayırır.

- **`x-encryption` alanları düz metin gelir** (`encrypt` ve `hash`): şifreleme/özetleme instance-data yazım hunisinde, `input` yakalandıktan sonra olur. Alanı **kendi path'ine** geri yazmak korumayı korur; **korumasız bir path'e** kopyalamak düz metni saklar ve runtime bunu engellemez ya da loglamaz. `data.email` ise saklanan token'dır ve başka path'e yazılamaz. Forge, master schema projedeyse bu kopyalar için uyarır.
- **`x-storage` alanları saklanan handle olarak gelir** (bayt değil). İstisna: transition / start `schemas[]` kuralı, yazım şeklinde `content` ile doğrulama yapmak için isteği **gönderildiği gibi** görür; dosya metadata'sıyla schema seçmeyin, dosyanın yanında istemcinin açıkça gönderdiği bir üyeyi okuyun.
- Header'lar ve query parametreleri `input`'a dahil değildir.

`headers` gelen isteğin header'larının salt-okur görünümüdür; `context.Headers` ile aynı sözlüğü okur, bu yüzden `Workflow:HeaderExposure:Deny` listesi aynen geçerlidir (yasaklı ad görünmez).

- Tireli ad için indeksleyici kullanın: `headers["x-channel"]` (yoksa `null`); `headers.has("x-channel")` bool döner. `headers.x-channel` çıkarma olarak ayrışır, derlenmez. Değer metindir.
- **`task.headers`, `headers` değildir**: `task.headers` task'ın kendi **giden** header'larıdır (`"$.headers.x-channel"` hedefleriyle yazılır); `headers` **gelen** isteğinkidir. İletmek için: `"set": { "$.headers.x-channel": "headers[\"x-channel\"]" }`.
- `headers` bir `select` kökü değildir (`"select": "$.headers.x"` publish hatasıdır); `set` ifadesiyle okuyun.

## Eksik değer ve hata

- Bulunamayan `select`, eksik yaprak, `?.` ya da eksik ara üye üzerinden okuma (`customer` yokken
  `data.customer.id`) o girişte **hiçbir şey yazmaz**, hata vermez.
- Diğer her hata (hatalı dönüşüm, yazılamaz path, sistem hop'unda rol okuma) **task'ı hatalı bitirir**:
  error boundary devreye girer, boundary yoksa instance fault olur; delta'nın hiçbir parçası yazılmaz.
- JSON olmayan yanıt gövdesi string'dir: `result.body.x` eksik sayılır, `into`'suz `select` hata verir.
- **JSON değerlerinde metot çağrılmaz; önce dönüştürün**: `input.name.ToString().Substring(0, 3)`, `data.amount.AsDouble()`. Mevcut bir değerde bilinmeyen metot çağrısı (`input.name.Substring(40)`, `.ToUpper()`) mapping'i hatalı bitirir; aynı çağrı eksik bir ara üye üzerinden (`data.missing.name.ToUpper()`) hâlâ eksik kaynaktır ve hiçbir şey yazmaz.

## Task binding dışındaki bloklar

Üç yer daha C# `mapping` betiği yerine bildirimsel blok kabul eder: transition `output`, SubFlow state `input` ve `output`. Blok dilbilgisi (`select`, `into`, `set`) ve ifade kuralları task binding'inkiyle aynıdır; değişen değişkenler, hedef doküman ve sonucun gittiği yerdir.

- `input` callee'ye **giden** veriyi kurar, `output` **dönen** veriyi yazar. Tek blok kabul eden yer diğerini publish'te reddeder (transition'da `input` üyesi publish hatasıdır: `'input' is not supported on a transition; use 'output'.`).
- `select`, sitenin `result`'ı varsa onu, yoksa `headers` hariç değişkenleri okur (`$.data…`, `$.input…`); `headers` hiçbir zaman `select` kökü değildir.
- Aynı yerde blok ve C# `mapping` birlikte publish hatasıdır.

| Yer | Hedef | Delta başlangıcı | Sonuç nereye gider |
|---|---|---|---|
| Transition `output` | instance verisi | boş; `"select": "$.input"` tüm isteği tutar | transition kaydı gövdesi, tek data append'i |
| SubFlow `input` | child'ın start dokümanı `{ attributes, headers, key, tags }` | boş | child start isteği |
| SubFlow `output` | instance verisi | boş | parent'ın tek data append'i |

Değişkenler: transition `output` ve SubFlow `input` için `data`, `input`, `instance`, `now`, `user`, `context`, `headers`. SubFlow `output` ayrıca `result` alır (`select` kökü, varsayılan `$.data`); orada `input` `null`'dır, `headers` / `user` child'ı kapatan tarafındır.

### Transition `output`

`transitions[]`, `startTransition`, paylaşılan transition'lar ve `cancel` / `updateData` / `exit` için geçerlidir. Otomatik ve zamanlanmış transition'lar `mapping` gibi `output`'u da reddeder: otomatik hop'un eşleyecek isteği yoktur. Boş delta yeni data sürümü oluşturmaz.

```json
{
  "key": "submit",
  "target": "review",
  "output": {
    "select": "$.input.customer",
    "into": "$.customer",
    "set": { "$.submittedAt": "now", "$.reviewedByAuditor": "user.available && user.hasRole(\"auditor\")" }
  }
}
```

### SubFlow `input`

Yalnız `type: S` için; `P` SubProcess iki bloğu da reddeder (kendi task'ıyla başlar). Hedef doküman `{ attributes, headers, key, tags }`:

- `select` için `into` gerekir; `key` string, `tags` string dizisi olmalıdır, aksi halde child oluşmadan start başarısız olur. Sayıyı `.ToString()` ile çevirin (`"\"kyc-\" + data.customer.id.ToString()"`).
- `$.headers.sub` boş yazılırsa boş kalır (instance-call credential kuralı).
- `input`, SubFlow state'ine giren hop'un isteğidir: otomatik zincirde ve retry yeniden başlatmasında `null`'dır (retry'da `user` ve `headers` yeniden deneyen istekçinindir).

```json
"subFlow": {
  "type": "S",
  "process": { "key": "kyc-check", "domain": "core", "version": "1.0.0", "flow": "sys-flows" },
  "input": {
    "set": {
      "$.attributes.customerId": "data.customer.id",
      "$.attributes.amount": "input.amount",
      "$.headers.x-channel": "\"web\"",
      "$.key": "\"kyc-\" + data.customer.id.ToString()",
      "$.tags": "new string[] { \"kyc\" }"
    }
  }
}
```

### SubFlow `output`

Tamamlanmada **ve** fault'ta çalışır; `result.status` (`"completed"` ya da `"faulted"`) ikisini ayırır. `result`, `{ data, status }`'tur. Child verisi düz metin gelir. Betikteki `Mutations`'ın blok karşılığı yoktur.

```json
"subFlow": {
  "type": "S",
  "process": { "key": "kyc-check", "domain": "core", "version": "1.0.0", "flow": "sys-flows" },
  "output": {
    "select": "$.data.score",
    "into": "$.kyc.score",
    "set": { "$.kyc.outcome": "result.status", "$.kyc.settledAt": "now" }
  }
}
```

Hata durumunda her yer kendi betiğinin hata koduyla başarısız olur (transition `output`: transition mapping hatası; SubFlow `input`: `SubFlowInputMappingFailed`; SubFlow `output`: `SubFlowOutputMappingFailed`). Rol sağlayıcı hatası `Authorization:110006` kalır; çağıransız bir okumada `user.roles` kalıcı hatadır.

## Event `input`, workflow `output` ve function `output`

Üç yer daha betiğinin yanında blok kabul eder: event'in `input`'u (`mapping` yanında), workflow'un ve function'ın `output`'u (`output` betiği yanında). Bu üç yerde `select` ve `into` **birlikte** yazılır (biri tek başına publish hatasıdır), boş blok (`{"set":{}}`) publish hatasıdır ve `headers` hiçbir zaman `select` kökü değildir. `select` değişkenleri okur (`$.input…`, `$.data…`); function `output`'ta ise `result`'ı okur ve varsayılanı yoktur.

| Yer | Değişkenler | Hedef doküman | Ne için |
|---|---|---|---|
| Event `input` | `input`, `now`, `context`, `headers` | `{ key, attributes }` | event teslimatının start / transition gövdesi |
| Workflow `output` | `data`, `input`, `instance`, `now`, `user`, `context`, `headers` | `{ data, statusCode, headers }` | senkron start / transition cevabı |
| Function `output` | `data`, `input`, `instance`, `now`, `context`, `headers`, `result` | `{ data, statusCode, headers }` | function cevabı |

### Event `input`

`input`, CloudEvent açıldıktan sonraki event payload'ıdır (boş gövdede `null`); `headers` event'in header'larıdır (yasaklı adlar süzülmüş görünüm). `data`, `instance` ve `user` burada yoktur: birini yazmak publish hatasıdır. `attributes` boş başlar; `key` string olur ya da hiç yazılmaz, başka tip eşleme hatasıdır. Filtreyle instance bulma (`Selector`) yalnız C# tarafındadır: blok `key` yazmayan bir transition event'i, eşleşmeyen event gibi yok sayılır. Aynı event'te `mapping` ve `input` birlikte publish hatasıdır (`event: 'mapping' and 'input' are mutually exclusive`); ikisini birden taşıyan saklı bir event betiği çalıştırır, hiçbirini taşımayan runtime'da `EventDefinitionMissing` olarak kalır. Kontrol, workflow `event`'i ile `event` taşıyan her transition'ı kapsar.

```json
"event": {
  "input": {
    "select": "$.input.payload",
    "into": "$.attributes",
    "set": { "$.key": "input.customerId.ToString()", "$.attributes.channel": "headers[\"x-channel\"]" }
  }
}
```

Hata, betikteki gibi `EventMappingFailed` (40993) olarak loglanır; hata kodu `EventMappingFailed`, span `Script.Execute` altında `eventMapping` türüdür.

### Workflow `output`

Yalnız senkron start / transition cevabını şekillendirir; sub-flow instance'ları için hiç çalışmaz. `output` JSON'unda `location` ya da `code` taşıyan nesne betiktir; `select` / `into` / `set` taşıyıp bunları taşımayan nesne bloktur; ikisinin üyeleri bir arada olursa publish 400 döner (`InvalidWorkflow`, mesaj `output`'u adlandırır). Betik `output` eskisi gibi bire bir saklanır.

- `data` instance'ın son verisidir (`x-encryption` alanları token olarak kalır). `input`, hop'u bu process çalıştırdıysa kabul edilen hop payload'ıdır: start'ta dosya offload'undan sonraki start attribute'ları, transition'da `x-storage` takasından sonraki payload (dosya üyesi saklanan handle'dır, hiçbir zaman satır içi base64 değil). Hop burada çalışmadıysa `null`'dır: mevcut instance'ı döndüren idempotent start, SubFlow'a proxy'lenen transition, aktif SubFlow'a iletilen parent transition'ı.
- `statusCode` tamsayı JSON sayısı, `headers` string değerli nesne olmalıdır; `data` yok ya da `null` ise cevap boştur.
- `statusCode` / `headers` tipi yanlışsa dahil her blok hatasında standart zarfa düşülür; `WorkflowOutputScriptFailed` loglanır ve span hata alır — hatalı betikle aynı.

```json
"output": {
  "select": "$.data.score",
  "into": "$.data.score",
  "set": { "$.statusCode": "201", "$.headers.x-score-band": "data.score > 700 ? \"high\" : \"low\"" }
}
```

### Function `output`

`result`, çalışan her task için `{ <variableKey>: { body, headers, statusCode } }`'tir (`variableKey` ya da task key'inin değişken adı); atlanan task yoktur. `instance` domain ya da flow kapsamlı function'da boştur.

- **Çağıran yoktur.** `user.available` `false`'tur ve `user` okuyan blok publish hatasıdır (`function output has no caller: the function response cache does not vary by role`); output betiğinin çağıranı da kapalıdır.
- Sıra: output betiği varsa o, yoksa blok, yoksa eski tek-task çıkarımı.
- `rawResponse: false`: cevap `{ <function key'i değişken adı olarak>: data }`'dır; `statusCode` ve `headers` yok sayılır, tip kontrolü yapılmaz ve blok bunları hedefliyorsa publish uyarı verir (mesaj `rawResponse`'u adlandırır). `rawResponse: true`: `data`, `statusCode` (tamsayı) ve `headers` (string değerli nesne) kullanılır; yanlış tip çağrıyı başarısız kılar. Aşağıdaki örnek `rawResponse: true` ister.
- İkili (binary) cevaplar (`byte[]`, `ScriptFile`) yalnız betikle üretilir.
- Function cevap cache'i blokla kurulan cevabı betikle kurulan gibi saklar.
- Hata `ExtensionExecutionFailed`'dır, mesaj `Function '{key}' output declarative output mapping failed: {detail}`; `FunctionOutputMappingFailed` (10280) ile bir kez loglanır (betik hataları da artık bunu kullanır).

```json
"rawResponse": true,
"output": {
  "select": "$.fetch.body.items",
  "into": "$.data.items",
  "set": { "$.data.count": "result.fetch.body.items.AsArrayLength()", "$.statusCode": "200" }
}
```

### Hatalar

| Yer | Hata kodu | Span türü | Log olayı |
|---|---|---|---|
| Event `input` | `EventMappingFailed` | `eventMapping` | 40993 `EventMappingFailed` |
| Workflow `output` | standart zarfa düşer | `Script.Execute` (hata) | `WorkflowOutputScriptFailed` |
| Function `output` | `ExtensionExecutionFailed` | `Script.Execute` (hata) | 10280 `FunctionOutputMappingFailed` |

## Örnek

Uçtan uca çalışan senaryo: [`vnext-example` · declarative-mapping-lab](https://github.com/burgan-tech/vnext-example/tree/master/tests/Core.IntegrationTests/Tests/DeclarativeMappingLab).

## İlgili

- [Mappings](./mappings) — `.csx` mapping rehberi
- [Interfaces](./interfaces) — `IMapping` ve diğer arabirimler
- [Workflow](./workflow) — task binding'lerinin yeri
