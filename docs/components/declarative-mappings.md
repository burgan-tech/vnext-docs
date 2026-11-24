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
| Ortama göre değişen URL (`API_BASEURL` yer tutucusu, `GetConfigValue`) | URL yüzeyi ve config erişimi yok; input hedefleri yalnız `$.body`, `$.headers`, `$.query` |
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
| `into` | string | Yazma path'i. Input'ta bir istek yüzeyi; output'ta instance verisi (kök `$` değil) |
| `set` | object | Yazma path'i → ifade. `into`'dan sonra, bildirim sırasıyla uygulanır (sonraki kazanır) |

Sabit bir metin tırnaklı ifadedir: `"\"web\""`. İfade başına en fazla 8000 karakter.

**Path dili:** `$`, `.name` (tire serbest), `['name']`, `[n]`, `[*]`. `[n]` ve `[*]` yalnız okumada
kullanılır; yazma hedefinde index/wildcard olmaz, diziler bütün olarak yazılır. Filtre ve recursive
descent yoktur.

## Input bloğu — isteği şekillendirmek

- Hedefler bir istek yüzeyiyle başlar: `$.body`, `$.headers`, `$.query` (`$.route` reddedilir). Her yüzey
  task tanımındaki statik değerden başlar; hedeflenmeyen alanlar korunur.
- `select` ve `into` birlikte yazılır.

| Task tipi | body | headers | query |
|---|---|---|---|
| Http, DirectTrigger, Start, SubProcess | ✓ | ✓ | – |
| DaprService | ✓ | ✓ | ✓ |
| DaprHttpEndpoint, DaprBinding, DaprPubSub | ✓ | – | – |
| Soap, GetInstance, GetInstanceData, GetInstances | – | ✓ | – |
| Script, Python, MCP, CacheAside | yalnız output bloğu | | |

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
| `result` | yalnız output: `body`, `headers`, `statusCode` | `result.body.score` |

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
