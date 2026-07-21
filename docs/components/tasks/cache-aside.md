---
sidebar_position: 14
title: Cache-Aside Task
description: Bir kaynağın sonucunu read-through (cache-aside) deseni ile cache'leyen task
---

# Cache-Aside Task (Type: `18`)

Cache-Aside Task, **cache-aside (read-through)** desenini tek bir görev olarak sunar. Tasarımcının "cache'e bak → yoksa servisi çağır → cache'le" üçlüsünü elle kurmasına gerek kalmaz; motor bu akışı, TTL / consistency / cache-hata semantiğini tek yerde yönetir.

Çalışma mantığı:

1. Çözülen anahtar cache'te **varsa** (hit) → cache'teki değeri döner; `sourceTask` **çalıştırılmaz**.
2. Cache'te **yoksa** (miss) veya `forceRefresh: true` ise → `sourceTask` çalıştırılır, ham sonuç `ttlInSeconds` + `consistency` ile cache'e yazılır ve döner. Varsa `sourceMapping` sonucu okurken şekillendirir.

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
    "type": "18",
    "config": {
      "key": "customer:42:profile",
      "storeName": "vnext-state",
      "ttlInSeconds": 300,
      "consistency": "Eventual",
      "sourceTask": { "key": "get-customer-http", "domain": "core", "flow": "sys-tasks", "version": "1.0.0" },
      "sourceMapping": { "location": "./src/mappings/get-customer-cached.csx", "code": "<base64>" },
      "bypassOnCacheError": true,
      "forceRefresh": false
    }
  }
}
```

## Konfigürasyon Alanları

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `key` | string | Evet* | Cache anahtarı; **verbatim** kullanılır. Dinamik anahtar için transition mapping'inin `InputHandler`'ı `task.SetCacheKey(...)` çağırır (State Store task'ındaki standart mekanizmanın aynısı). *Statik `key` yoksa anahtar mapping ile set edilmelidir |
| `storeName` | string | Hayır | Cache olarak kullanılacak Dapr state store bileşen adı. Boş bırakılırsa çalışan runtime'ın `DAPR_STATE_STORE_NAME` konfigürasyon değeri kullanılır |
| `ttlInSeconds` | integer | Hayır | Cache kaydının time-to-live süresi (Dapr `ttlInSeconds` metadata'sı). Belirtilmezse veya `0` ise kayıt **süresizdir** |
| `consistency` | string | Hayır | `Eventual` (varsayılan) veya `Strong` — okuma ve yazmada state store'a geçirilir |
| `sourceTask` | object | Evet | Cache miss'te çalıştırılan task referansı (`key` / `domain` / `flow` / `version`). **Uzaktan invoke edilebilir** bir tip olmalıdır (HTTP / SOAP / Dapr / GetInstanceData). `flow` verilmezse runtime tasks şeması varsayılır |
| `sourceMapping` | object | Hayır | Cache'lenmiş (ham) sonucu döndürmeden önce şekillendiren `.csx` mapping (`location` + base64 `code`). Mapping'in `OutputHandler`'ı olarak, hem hit hem miss durumunda **okuma anında** çalışır |
| `bypassOnCacheError` | boolean | Hayır | `true` (varsayılan): cache okuma/yazma hataları pipeline'ı düşürmek yerine source task'a fallback yapar. `false`: cache hataları task başarısızlığı olarak yüzeye çıkar (error boundary uygulanır) |
| `forceRefresh` | boolean | Hayır | `true`: cache okuma atlanır; source task her zaman çalıştırılır ve kayıt üzerine yazılır |

## Read-Through Akışı

| Durum | Davranış |
|-------|----------|
| **Cache HIT** | Çözülen anahtar bulunur → cache'teki değer döner; `sourceTask` çalıştırılmaz |
| **Cache MISS** | `sourceTask` çalıştırılır → ham sonuç `ttlInSeconds` + `consistency` ile cache'e yazılır → döner |
| **`forceRefresh: true`** | Cache içeriğine bakılmaksızın miss gibi davranır; kaydı tazeler |

## Mimari

State Store task'ı ile **birebir aynı** bölünmeyi izler:

- **`CacheAsideTaskExecutor`** (Orchestration / Application) input mapping'i çalıştırır, `sourceTask`'ı bir envelope'a çözer, ardından `cacheaside` `TaskEnvelope`'unu `IRemoteInvokerService` ile Execution servisine gönderir ve çıkışta output mapping'i (`sourceMapping`) uygular.
- **`CacheAsideTaskInvoker`** (Execution) `DaprClient` üzerinden state store erişimini yapar (aynı `custom:` prefix / TTL / consistency — `StateStoreTaskInvoker` ile ortak `IStateStoreClient` üzerinden). Cache miss'te **önceden çözülmüş `sourceTask` envelope**'unu yerel invoker registry ile çalıştırır (ör. bir HTTP source, aynı Execution servisindeki HTTP invoker'ında koşar) ve ham sonucu cache'e yazar.

Scripting engine yalnızca Orchestration runtime'ında bulunduğundan, **cache ham source sonucunu saklar**; şekillendirme (`sourceMapping`) her okumada (hit ve miss) executor'ın çıkış aşamasında uygulanır. Task sonucu, diğer tüm task sonuçları gibi instance-data versiyonlamasına (Patch bump) katılır.

## Key İsimlendirme Konvansiyonu (`custom:` prefix)

Cache anahtarları, [State Store task](./state-store)'ı ile **aynı `custom:` prefix**'ini paylaşır. Böylece aynı mantıksal anahtarı hedefleyen bir `CacheAsideTask` ile bir `StateStoreTask` **aynı fiziksel kaydı** kullanır — tasarımcı bir cache-aside kaydını düz bir State Store `set`/`delete` task'ı ile önceden doldurabilir veya geçersiz kılabilir.

- Task config `key: "customer:42:profile"` → store anahtarı `custom:customer:42:profile`

## Semantik Notları

- **Cache infrastructure hatası + `bypassOnCacheError: true`**: uyarı loglanır, `sourceTask` çalıştırılır ve sonucu döner (cache yazma best-effort; başarısız yazma yok sayılır).
- **Cache infrastructure hatası + `bypassOnCacheError: false`**: task başarısız olur ve **error boundary chain**'e akar.
- **Source task business failure**: bu task'ın başarısızlığı olarak iletilir; **hiçbir şey cache'lenmez**.
- **`sourceTask` uzaktan invoke edilebilir bir tip olmalıdır** (HTTP / SOAP / Dapr / GetInstanceData). Miss'te Execution servisinde koştuğu için local-only Script / Condition source olamaz.
- `storeName` verilmediğinde store, **Execution** runtime'ının `DAPR_STATE_STORE_NAME` değeri üzerinden çözülür (hazır ortamlarda `vnext-state`).

## Dinamik Anahtar

Statik `key` yerine anahtar isteğe / bağlama göre üretilebilir. State Store task'ındaki standart mekanizmanın aynısı kullanılır: transition mapping'inin `InputHandler`'ı task'ı mutasyona uğratıp anahtarı set eder (bespoke bir şablon motoru **yoktur**):

```csharp title="cache-key-mapping.csx (InputHandler)"
public async Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
{
    var customerId = context.Headers["customerId"];
    ((CacheAsideTask)task).SetCacheKey($"customer:{customerId}:profile");
    return new ScriptResponse();
}
```

:::tip
Bir **function**'ın tüm çıktısını cache'lemek (tek task yerine) istiyorsanız, function tanımındaki `cache` bloğuna bakın — orada anahtar Dynamic Expresso `keyExpression` ile hesaplanabilir ve generation-namespace ile invalidation yapılabilir.
:::

## Örnekler

### Basit read-through (HTTP source)

```json
"attributes": {
  "type": "18",
  "config": {
    "key": "customer:42:profile",
    "storeName": "vnext-state",
    "ttlInSeconds": 300,
    "sourceTask": { "key": "get-customer-http", "domain": "core", "flow": "sys-tasks", "version": "1.0.0" }
  }
}
```

### `forceRefresh` — cache'i her zaman tazele

```json
"attributes": {
  "type": "18",
  "config": {
    "key": "customer:42:profile",
    "sourceTask": { "key": "get-customer-http", "domain": "core", "flow": "sys-tasks", "version": "1.0.0" },
    "forceRefresh": true
  }
}
```

### `sourceMapping` — ham sonucu şekillendirerek cache'le/dön

```json
"attributes": {
  "type": "18",
  "config": {
    "key": "customer:42:profile",
    "sourceTask": { "key": "get-customer-http", "domain": "core", "flow": "sys-tasks", "version": "1.0.0" },
    "sourceMapping": { "location": "./src/mappings/get-customer-cached.csx", "code": "<base64>" },
    "ttlInSeconds": 300
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
    "CacheHit": true,
    "Refreshed": false,
    "Key": "custom:customer:42:profile",
    "ETag": "3"
  },
  "TaskType": "CacheAside"
}
```

- `Metadata.CacheHit = true` → değer cache'ten geldi (source çalışmadı).
- `Metadata.CacheHit = false` ve `Metadata.Refreshed = true` → miss/forceRefresh; source çalıştı ve sonuç cache'lendi.
- `Metadata.Key` prefix'li store anahtarını raporlar.

## İlgili

- [Tasks Genel Bakış](/docs/components/tasks/) — task türleri ve referans mekanizması
- [State Store Task](/docs/components/tasks/state-store) — paylaşılan cache primitifi (get/set/delete); aynı `custom:` prefix ve state store
- Runtime dokümanı: [cache-aside-task.md (vnext)](https://github.com/burgan-tech/vnext/blob/master/docs/runtime/cache-aside-task.md)
- Schema kaynağı: [task-definition.schema.json (vnext-schema)](https://github.com/burgan-tech/vnext-schema/blob/master/schemas/task-definition.schema.json)
