---
sidebar_position: 14
title: Cache-Aside Task
description: Bir kaynağın sonucunu read-through (cache-aside) deseni ile cache'leyen task
---

# Cache-Aside Task (Type: `18`)

Cache-Aside Task, **cache-aside (read-through)** desenini tek bir görev olarak sunar. Tasarımcının "cache'e bak → yoksa servisi çağır → cache'le" üçlüsünü elle kurmasına gerek kalmaz; motor bu akışı, TTL / consistency / cache-hata semantiğini tek yerde yönetir.

Çalışma mantığı:

1. Cache anahtarı çözülür — statik string, bir key script'i (Dynamic Expresso veya C#) ya da task-level mapping'in `InputHandler`'ındaki `SetCacheKey` ile.
2. Anahtar cache'te **varsa** (hit) → cache'teki değer döner; `sourceTask` **çalıştırılmaz**.
3. Cache'te **yoksa** (miss) veya `forceRefresh: true` ise → `sourceTask` **bir task olarak** çalıştırılır (`sourceMapping` onun mapping'idir: `InputHandler` → çağrı → `OutputHandler`), şekillendirilmiş çıktı `ttlInSeconds` + `consistency` ile cache'e yazılır ve döner.
4. Her iki durumda da task-level mapping'in (`onExecutionTasks[].mapping`) `OutputHandler`'ı sonuç üzerinde çalışır.

:::warning v0.0.99 breaking
v0.0.99'da Cache-Aside kontratı değişti:

- `keyExpression` alanı **kaldırıldı**; dinamik anahtar artık `key` alanına bir ScriptCode objesi olarak verilir.
- `sourceMapping` artık **source task'ın** `IMapping`'idir (InputHandler çağrıdan önce, OutputHandler sonra çalışır) ve cache'e yazılan değer onun **çıktısıdır**. Önceden ham source sonucu cache'lenip `sourceMapping` her okumada uygulanıyordu.
- `sourceTask` artık herhangi bir task tipi olabilir (CacheAside hariç); "uzaktan invoke edilebilir tip" kısıtı kalktı.
- `cacheaside` wire type'ı ve `Workflow:TaskInvocation:Modes:cacheaside` routing anahtarı kaldırıldı; cache I/O `Modes.statestore`'u izler.

**Geçiş adımları:**

1. `keyExpression` → `"key": { "location": "dynamicExpresso", "encoding": "NAT", "code": "..." }`.
2. Source'u yapılandıran kodu `sourceMapping.InputHandler`'a, cache'lenecek şekli `sourceMapping.OutputHandler`'a taşıyın; cache sonrası işlemleri task-level mapping'e (`onExecutionTasks[].mapping`) alın.
3. Ortam konfigürasyonundan `Workflow:TaskInvocation:Modes:cacheaside` anahtarını kaldırın.
4. Eski sürümün yazdığı kayıtlar **ham** değer tutar ve TTL dolana kadar okunur — cache'i boşaltın veya TTL'in dolmasını bekleyin.
5. Cache'i State Store `set` ile önceden dolduran (pre-warm) akışlar artık **şekillendirilmiş** değeri yazmalıdır.

Rolling deploy notu: yalnızca `cacheaside` **Remote** konfigüre edilmişse eski bir Orchestration pod'u yeni bir Execution pod'una `cacheaside` envelope'u gönderebilir; varsayılan Local kurulumda bu olmaz.

Ayrıntılar: [v0.0.99 Breaking Changes](/blog/breaking-changes/breaking-changes-v0-0-99)
:::

## Görev Tanımı

> **Schema:** `task-definition.schema.json` — `config` için `additionalProperties: false`; yalnızca `sourceTask` zorunludur.

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
      "sourceMapping": { "location": "./src/mappings/get-customer-source.csx", "code": "<base64>" },
      "bypassOnCacheError": true,
      "forceRefresh": false
    }
  }
}
```

## Konfigürasyon Alanları

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `key` | string \| ScriptCode | Hayır* | Cache anahtarı. **String** verilirse **verbatim** kullanılır. **ScriptCode** objesi (`location`, `code`, `encoding`, opsiyonel `type`, `scripts`) verilirse anahtar runtime'da hesaplanır — bkz. [Cache Anahtarı](#cache-anahtarı). *Statik/script `key` yoksa anahtar task-level mapping'in `InputHandler`'ında `SetCacheKey` ile set edilmelidir |
| `storeName` | string | Hayır | Cache olarak kullanılacak Dapr state store bileşen adı. Boş bırakılırsa çalışan runtime'ın `DAPR_STATE_STORE_NAME` değeri kullanılır |
| `ttlInSeconds` | integer (min `0`) | Hayır | Cache kaydının time-to-live süresi. Belirtilmezse veya `0` ise kayıt **süresizdir** |
| `consistency` | string | Hayır | `Eventual` (varsayılan) veya `Strong` — okuma ve yazmada state store'a geçirilir |
| `sourceTask` | object | **Evet** | Cache miss'te çalıştırılan task referansı: `key`, `domain`, `version` zorunlu; `flow` verilmezse `sys-tasks`. **CacheAside dışında herhangi bir task tipi** olabilir — bkz. [Source Task](#source-task) |
| `sourceMapping` | ScriptCode | Hayır | **Source task'ın** `IMapping`'i: `InputHandler` source çağrısından önce (URL/body ayarı, `SetKey` vb.), `OutputHandler` sonra çalışır. **Cache'e yazılan değer `OutputHandler` çıktısıdır**; verilmezse source'un ham `data`'sı cache'lenir |
| `bypassOnCacheError` | boolean | Hayır | `true` (varsayılan): cache okuma/yazma hataları source task'a fallback yapar (uyarı logu `10176`). `false`: cache hataları task başarısızlığı olarak yüzeye çıkar (error boundary uygulanır) |
| `forceRefresh` | boolean | Hayır | `true`: cache okuma atlanır; source task her zaman çalıştırılır ve kayıt üzerine yazılır. Varsayılan `false` |

## Cache Anahtarı

### Anahtar türleri

| `key` biçimi | Davranış |
|--------------|----------|
| `"customer:42:profile"` (string) | Verbatim statik anahtar |
| `{ "location": "dynamicExpresso", ... }` | `code` bir **Dynamic Expresso** ifadesidir (ör. `"customer:" + context.Headers.customerid + ":profile"`; header anahtarları küçük harfe çevrilir) |
| `{ "location": "<diğer>", ... }` | `code`, `ICacheKeyMapping` arayüzünü uygulayan bir **C# (Roslyn)** sınıfıdır |

### Encoding

| `encoding` | Anlamı |
|------------|--------|
| `B64` | **Varsayılan.** `code` Base64 kodlu metindir |
| `NAT` | `code` düz metindir. Düz bir ifade yazıyorsanız **`"encoding": "NAT"` vermelisiniz** — aksi halde varsayılan B64 çözülmeye çalışılır ve task başarısız olur |
| `REF` | `code` bir [sys-mappings bileşenine](/docs/components/mapping-component) referans objesidir: `{ "key", "domain", "flow": "sys-mappings", "version" }` |

### `ICacheKeyMapping` (C#)

```csharp title="customer-key.csx"
public class CustomerProfileKey : ICacheKeyMapping
{
    public Task<string?> Handler(ScriptContext context)
        => Task.FromResult<string?>($"customer:{context.Headers["customerid"]}:profile");
}
```

### Anahtar önceliği

1. Task-level mapping'in `InputHandler`'ı önce çalışır ve `SetCacheKey(...)` ile bir anahtar set edebilir.
2. Ardından `key` script'i çalışır; **boş olmayan** sonuç önceki anahtarı **ezer**.
3. Script `null` veya boş/whitespace dönerse önceki anahtar korunur.
4. Çağrı anında anahtar hâlâ boşsa task `CacheAside requires a non-empty 'key'.` hatasıyla başarısız olur.

```csharp title="cache-key-mapping.csx (task-level InputHandler)"
public async Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
{
    var customerId = context.Headers["customerid"];
    ((CacheAsideTask)task).SetCacheKey($"customer:{customerId}:profile");
    return new ScriptResponse();
}
```

## Source Task

- `sourceTask`, **CacheAside dışındaki her task tipi** olabilir (HTTP, Script, SOAP, Dapr, GetInstanceData, trigger task'ları vb.). Başka bir CacheAside task'ı source olarak verilirse **çalışma anında** reddedilir (log `10177`, mesaj: `...the source task 'x' cannot be a CacheAside task.`).
- Source, **kendi tipinin executor'ı** ile, `onExecutionTasks` içinde koşsaydı nasıl koşacaksa öyle çalışır ve yönlenir: aynı domain'deki trigger task'ları in-process gateway üzerinden, cross-domain olanlar discovery üzerinden.
- Source'un **kendi error boundary'si ve journal satırı yoktur**; error boundary yalnızca bir kez, CacheAside task'ı üzerinde uygulanır.
- `sourceMapping`, source için atılabilir (throwaway) bir context dalında çalışır: Body merge'leri, mutasyonlar ve response slot'ları gibi yan etkileri **atılır**; yalnızca döndürdüğü çıktı cache'lenir ve döner.

```csharp title="get-customer-source.csx (sourceMapping — source task'ın IMapping'i)"
public class GetCustomerSource : IMapping
{
    public Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
    {
        ((GetInstanceDataTask)task).SetKey(context.Headers["customerid"]);
        return Task.FromResult(new ScriptResponse());
    }

    public Task<ScriptResponse> OutputHandler(ScriptContext context)
        => Task.FromResult(new ScriptResponse { Data = /* source yanıtını şekillendirin; cache'lenen budur */ });
}
```

## Read-Through Akışı

| Durum | Davranış |
|-------|----------|
| **Cache HIT** | Cache'teki (şekillendirilmiş) değer döner; `sourceTask` çalıştırılmaz |
| **Cache MISS** | `sourceMapping.InputHandler` → source çağrısı → `sourceMapping.OutputHandler` → çıktı `ttlInSeconds` + `consistency` ile cache'e yazılır → döner |
| **`forceRefresh: true`** | Cache içeriğine bakılmaksızın miss gibi davranır; kaydı tazeler |
| **Her iki durum** | Task-level mapping `OutputHandler`'ı sonuç üzerinde çalışır |

## Task-Level OutputHandler ve `metadata`

Task-level mapping'in (`onExecutionTasks[].mapping`) `OutputHandler`'ı **hit ve miss'te** çalışır. `context.Body`, task sonucunu taşır; `context.Body.metadata` (PascalCase anahtarlar) cache bilgisini verir:

```json
{
  "isSuccess": true,
  "data": { "name": "Ada" },
  "statusCode": 200,
  "metadata": {
    "StoreName": "vnext-state",
    "Key": "custom:customer:42:profile",
    "CacheHit": true,
    "Refreshed": false,
    "ETag": "1"
  }
}
```

| `metadata` alanı | Tip | Açıklama |
|------------------|-----|----------|
| `CacheHit` | boolean | `true` → değer cache'ten geldi (source çalışmadı) |
| `Refreshed` | boolean | `true` → miss veya `forceRefresh` sonrası source çalıştı ve cache'e yazıldı |
| `Key` | string | `custom:` prefix'li store anahtarı |
| `StoreName` | string | Kullanılan state store bileşeni |
| `ETag` | string | State store kaydının ETag'i |

## Mimari

- **`CacheAsideTaskExecutor`** (Orchestration / Application) giriş aşamasını (task-level `InputHandler`, ardından `key` script'i), read-through'u ve çıkış aşamasını yönetir.
- **Cache get/set**, function response cache'iyle ortak **state-store cache gateway**'i üzerinden yapılır ve `Workflow:TaskInvocation:Modes.statestore` ayarını izler (Local: in-process, Remote: Execution servisi) — [State Store task](./state-store) ile aynı. Bkz. [Task Invocation Routing](/docs/configuration/task-invocation).
- **Source**, kendi tipinin executor'ı ile çalışır; yönlendirmeyi source'un tipi belirler (ör. HTTP Local, Python source Remote olabilir). Yalnızca cache I/O `statestore` modunu izler.
- Ayrı bir `cacheaside` wire type'ı, invoker'ı veya routing anahtarı **yoktur** (v0.0.99'da kaldırıldı).
- Task sonucu, diğer tüm task sonuçları gibi instance-data versiyonlamasına (Patch bump) katılır.

`storeName` verildiğinde bileşen, cache çağrısını yapan sidecar'a açık olmalıdır: varsayılan olarak Orchestration'ınkine, `statestore` Remote yönlendirildiyse Execution'ınkine.

## Key İsimlendirme Konvansiyonu (`custom:` prefix)

Cache anahtarları, [State Store task](./state-store)'ı ile **aynı `custom:` prefix**'ini paylaşır. Böylece aynı mantıksal anahtarı hedefleyen bir `CacheAsideTask` ile bir `StateStoreTask` **aynı fiziksel kaydı** kullanır — tasarımcı bir cache-aside kaydını düz bir State Store `set`/`delete` task'ı ile önceden doldurabilir veya geçersiz kılabilir.

- Task config `key: "customer:42:profile"` → store anahtarı `custom:customer:42:profile`

**Cache'te ne saklanır:** `sourceMapping` çıktısı (yoksa source'un ham `data`'sı). State Store `set` ile pre-warm yapan akışlar bu **şekillendirilmiş** değeri yazmalıdır.

## Semantik Notları

- **Cache infrastructure hatası + `bypassOnCacheError: true`**: uyarı loglanır (`10176`), `sourceTask` çalıştırılır ve sonucu döner (başarısız yazma yok sayılır).
- **Cache infrastructure hatası + `bypassOnCacheError: false`**: task başarısız olur ve **error boundary chain**'e akar.
- **Source task başarısızlığı**: bu task'ın başarısızlığı olarak iletilir; **hiçbir şey cache'lenmez**.
- **Error boundary** yalnızca bir kez, CacheAside task'ı üzerinde uygulanır.
- Boş input ile çalışan source'larda oluşan `/instances//data` hatası v0.0.99'da giderildi.

## Hatalar

| Durum | Mesaj / Log |
|-------|-------------|
| Çözülen anahtar boş | `CacheAside requires a non-empty 'key'.` |
| Cache okuma hatası, `bypassOnCacheError: false` | `CacheAside read failed: …` |
| Cache yazma hatası, `bypassOnCacheError: false` | `CacheAside write failed: …` |
| Cache hatası, `bypassOnCacheError: true` | Uyarı logu `10176`, source'a fallback |
| `sourceTask` bir CacheAside task'ı | Çalışma anında red, log `10177`: `...the source task 'x' cannot be a CacheAside task.` |
| Geçersiz `key` / `sourceMapping` script'i | Publish sırasında doğrulanır ve reddedilir |

## Tracing

Cache okuma/yazma işlemleri `Cache.Get` / `Cache.Set` span'leri olarak raporlanır; span'ler `cache.component_type=cacheaside` tag'ini taşır.

:::tip
Bir **function**'ın tüm çıktısını cache'lemek (tek task yerine) istiyorsanız, function tanımındaki `cache` bloğuna bakın — orada anahtar Dynamic Expresso `keyExpression` ile hesaplanabilir ve generation-namespace ile invalidation yapılabilir. (Function `cache.keyExpression` alanı değişmedi; kaldırılan yalnızca CacheAside task'ının `keyExpression`'ıdır.)
:::

## Örnekler

### Statik anahtar

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
      "sourceTask": { "key": "get-customer-http", "domain": "core", "flow": "sys-tasks", "version": "1.0.0" }
    }
  }
}
```

### Dynamic Expresso anahtarı

```json
{
  "key": "cache-customer-profile-dynamic",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["cache", "customer"],
  "attributes": {
    "type": "18",
    "config": {
      "key": {
        "location": "dynamicExpresso",
        "encoding": "NAT",
        "code": "\"customer:\" + context.Headers.customerid + \":profile\""
      },
      "storeName": "customer-cache-store",
      "ttlInSeconds": 300,
      "consistency": "Eventual",
      "sourceTask": { "key": "get-customer-instance", "domain": "core", "flow": "sys-tasks", "version": "1.0.0" },
      "sourceMapping": { "location": "./src/mappings/get-customer-source.csx", "code": "<base64>" },
      "bypassOnCacheError": true,
      "forceRefresh": false
    }
  }
}
```

### C# (`ICacheKeyMapping`) script anahtarı

```json
{
  "key": "cache-customer-profile-script",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["cache", "customer"],
  "attributes": {
    "type": "18",
    "config": {
      "key": { "location": "./src/mappings/customer-key.csx", "code": "<base64>" },
      "ttlInSeconds": 300,
      "sourceTask": { "key": "get-customer-http", "domain": "core", "flow": "sys-tasks", "version": "1.0.0" },
      "sourceMapping": { "location": "./src/mappings/get-customer-source.csx", "code": "<base64>" }
    }
  }
}
```

Aynı anahtar script'i bir sys-mappings bileşeninden de referansla alınabilir:

```json
"key": {
  "location": "./src/mappings/customer-key.csx",
  "encoding": "REF",
  "code": { "key": "customer-profile-key", "domain": "core", "flow": "sys-mappings", "version": "1.0.0" }
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

## İlgili

- [Tasks Genel Bakış](/docs/components/tasks/) — task türleri ve referans mekanizması
- [State Store Task](/docs/components/tasks/state-store) — paylaşılan cache primitifi (get/set/delete); aynı `custom:` prefix ve state store
- [Mapping Bileşeni](/docs/components/mapping-component) — `REF` encoding ile key script'ini paylaşma
- [Task Invocation](/docs/configuration/task-invocation) — `statestore` modu (cache I/O)
- [v0.0.99 Breaking Changes](/blog/breaking-changes/breaking-changes-v0-0-99)
- Runtime dokümanı: [cache-aside-task.md (vnext)](https://github.com/burgan-tech/vnext/blob/master/docs/runtime/cache-aside-task.md)
- Schema kaynağı: [task-definition.schema.json (vnext-schema)](https://github.com/burgan-tech/vnext-schema/blob/master/schemas/task-definition.schema.json)
