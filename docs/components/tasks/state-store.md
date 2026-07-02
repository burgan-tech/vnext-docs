---
sidebar_position: 13
title: State Store Task
description: Dapr state store üzerinden cache okuma/yazma/silme yapan task
---

# State Store Task (Type: `17`)

State Store Task, workflow / function pipeline'ı içinden bir **Dapr state store** bileşenini okuyup yazan görev türüdür. Flow'lar için **cache primitifi**dir: cache'lenmiş bir değeri okuma, yazma/güncelleme veya bir ya da birden fazla kaydı silme işlemlerini karşılar. Komut adları Dapr state API fiilleri ile birebir aynıdır.

## Görev Tanımı

> **Schema:** `task-definition.schema.json`

```json
{
  "key": "cache-customer-profile",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["cache", "customer"],
  "attributes": {
    "type": "17",
    "config": {
      "command": "set",
      "storeName": "vnext-state",
      "key": "customer:42:profile",
      "value": { "name": "Ada" },
      "ttlInSeconds": 300,
      "consistency": "Strong",
      "concurrency": "LastWrite"
    }
  }
}
```

## Konfigürasyon Alanları

| Alan | Tip | Zorunlu | Geçerli Komut | Açıklama |
|------|-----|---------|---------------|----------|
| `command` | string | Evet | — | Çalıştırılacak komut: `get`, `set`, `delete` |
| `storeName` | string | Hayır | tümü | Dapr state store bileşen adı. Boş bırakılırsa çalışan runtime'ın `DAPR_STATE_STORE_NAME` konfigürasyon değeri kullanılır |
| `key` | string | Hayır | get / set / tekil delete | Cache anahtarı. `custom:` prefix'i ile saklanır (aşağıya bakınız) |
| `keys` | string[] | Hayır | delete | Bulk delete için anahtar listesi (her öğe `custom:` prefix'i alır) |
| `query` | object | Hayır | delete | Tag/pattern bazlı silme için Dapr state **Query API** filtresi (JSON). Query destekleyen bir store gerektirir |
| `value` | any | Hayır | set | Yazılacak değer (herhangi bir JSON değeri) |
| `ttlInSeconds` | integer | Hayır | set | Opsiyonel time-to-live (Dapr `ttlInSeconds` metadata'sı, minimum: 1) |
| `etag` | string | Hayır | get / set | Optimistic concurrency için ETag token'ı |
| `concurrency` | string | Hayır | set | `FirstWrite` veya `LastWrite` |
| `consistency` | string | Hayır | get / set | `Eventual` veya `Strong` |
| `metadata` | object | Hayır | tümü | Dapr state store operasyonuna geçirilen ek metadata |

## `command` Değerleri

| Komut | Davranış | Dapr API |
|-------|----------|----------|
| `get` | `key` için değeri okur; ETag ve `Found` bilgisi döner | `GetStateAndETagAsync` |
| `set` | `key` değerini yazar/günceller | `SaveStateAsync`; `etag` tanımlıysa `TrySaveStateAsync` |
| `delete` | Tekil `key`, bulk `keys[]` ya da `query` ile eşleşen kayıtları siler | `DeleteStateAsync` / `DeleteBulkStateAsync` / `QueryStateAsync` + bulk delete |

## Key İsimlendirme Konvansiyonu (`custom:` prefix)

State store, engine'in kendi cache tüketicileri ile paylaşılır (component cache kayıtları, post-commit idempotency store'u vb.). Çakışmayı önlemek için task'ın verdiği **her anahtar** sabit **`custom:`** prefix'i altında saklanır:

- Task config `key: "customer:42"` → store anahtarı `custom:customer:42`
- Redis bileşenindeki `keyPrefix: "vnext"` ile birlikte fiziksel Redis anahtarı `vnext||custom:customer:42` olur

Prefix, invoker tarafından `get`, `set` ve `delete` (tekil key ve `keys[]`) işlemlerinde uygulanır. `query` ile eşleşen anahtarlar store'dan zaten prefix'li döner ve olduğu gibi silinir. Sonuç metadata'sındaki `Key` alanı prefix'li store anahtarını raporlar.

## Semantik Notları

- **Cache miss**: eksik bir anahtar için `get` **başarılı** döner — `data = null` ve metadata `Found = false`. Error boundary **tetiklenmez**; miss'in ne anlama geldiğine output mapping karar verir.
- **TTL** yalnızca `set` işleminde Dapr'a `ttlInSeconds` metadata'sı olarak geçirilir.
- **Query/tag delete**, eşleşen anahtarları Dapr state Query API ile çözer ve bulk delete uygular. Konfigüre edilen store query desteklemiyorsa task exception fırlatmak yerine açıklayıcı bir hata sonucu döner.
- `storeName` verilmediğinde store, **Execution** runtime'ının `DAPR_STATE_STORE_NAME` değeri üzerinden çözülür (hazır ortamlarda `vnext-state`). Açık bir `storeName` verilecekse bileşenin Execution sidecar'ında tanımlı olması gerekir.

## Örnekler

### `get` — cache okuma

```json
"attributes": {
  "type": "17",
  "config": {
    "command": "get",
    "key": "customer:42:profile",
    "consistency": "Strong"
  }
}
```

### `delete` — bulk ve query ile silme

```json
"attributes": {
  "type": "17",
  "config": {
    "command": "delete",
    "keys": ["customer:42:profile", "customer:42:limits"]
  }
}
```

```json
"attributes": {
  "type": "17",
  "config": {
    "command": "delete",
    "query": {
      "filter": { "EQ": { "value.tenant": "acme" } }
    }
  }
}
```

## Standart Yanıt

```json
{
  "Data": { "name": "Ada" },
  "StatusCode": 200,
  "IsSuccess": true,
  "ErrorMessage": null,
  "Metadata": {
    "Found": true,
    "ETag": "3",
    "Key": "custom:customer:42:profile"
  },
  "TaskType": "StateStore"
}
```

- `get` sonucunda `Metadata.Found` ve `Metadata.ETag` döner; miss durumunda `Data = null`, `Found = false`.
- `delete` sonucunda `Metadata.DeletedCount` silinen kayıt sayısını raporlar.

## İlgili

- [Tasks Genel Bakış](/docs/components/tasks/) — task türleri ve referans mekanizması
- [Dapr Binding Task](/docs/components/tasks/dapr-binding) — diğer Dapr tabanlı task türleri
- Runtime dokümanı: [state-store-task.md (vnext)](https://github.com/burgan-tech/vnext/blob/master/docs/runtime/state-store-task.md)
- Schema kaynağı: [task-definition.schema.json (vnext-schema)](https://github.com/burgan-tech/vnext-schema/blob/master/schemas/task-definition.schema.json)
