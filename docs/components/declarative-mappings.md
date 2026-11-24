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
