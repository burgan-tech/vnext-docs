---
sidebar_position: 5
title: Task Çalıştırma Yönlendirmesi (TaskInvocation)
sidebar_label: Task Invocation
description: Workflow:TaskInvocation — task'ların Orchestration içinde (Local) mi yoksa Execution servisinde (Remote) mi çalışacağı, çözümleme sırası, bağlantı ve timeout limitleri
---

# Task Çalıştırma Yönlendirmesi (TaskInvocation)

<sup>New</sup> v0.0.94 — Hazır binding'i olan task'lar (HTTP, Dapr service invocation, SOAP, State Store, Cache-Aside) iki yoldan biriyle çalışabilir:

- **Local**: Orchestration host'un içinde, task'ı tetikleyen pipeline adımıyla aynı process'te.
- **Remote**: `TaskEnvelope` olarak Dapr service invocation üzerinden Execution servisine gönderilerek — v0.0.94 öncesinde her task'ın çalıştığı yol.

Hangi task'ın hangi yolu kullanacağına, Orchestration host'ta `Workflow:TaskInvocation` bölümüyle beslenen `ITaskInvocationRouter` her çağrıda karar verir.

## Yapılandırma

Orchestration host `appsettings.json`, mevcut `Workflow` kökü altında (`InstanceFiltering` ve `FanOut` ile yan yana — ikinci bir `"Workflow"` anahtarı açmayın):

```json
{
  "Workflow": {
    "TaskInvocation": {
      "DefaultMode": "Remote",
      "Modes": {
        "http": "Local",
        "daprservice": "Local",
        "soap": "Local",
        "statestore": "Local",
        "cacheaside": "Local"
      }
    }
  }
}
```

| Anahtar | Tip | Varsayılan | Açıklama |
|---------|-----|------------|----------|
| `DefaultMode` | `Remote` \| `Local` | `Remote` | `Modes` içinde girişi olmayan her wire tipi için uygulanan mod. Yarın runtime'a eklenen yeni bir task tipi, `Modes`'a girilmediği sürece otomatik olarak Remote çalışır |
| `Modes` | dictionary | yukarıdaki beş giriş | Wire task tipine göre (büyük/küçük harf duyarsız) mod. Anahtarlar `BBT.Workflow.Execution.TaskTypes` sabitleridir: `http`, `daprservice`, `soap`, `statestore`, `cacheaside` |
| `MaxConnectionsPerServer` | integer, `≥ 1` | `50` (kod varsayılanı; dosyada yok) | Orchestration'ın kendi adlandırılmış HTTP client'ları için hedef başına bağlantı üst sınırı (`HttpClientHandler.MaxConnectionsPerServer`). Process-içi `http`/`soap` task'ları ve deprecated tip `22` External HTTP task'ı bu havuzu paylaşır. v0.0.94 öncesinde yalnızca tip 22 için sabit `10` idi. Execution host'un kendi client'ları ayrıdır ve hâlâ sabit `10`'dur |
| `LocalInvocationTimeoutSeconds` | integer, `≥ 1` | `60` (kod varsayılanı; dosyada yok) | `TaskInvocationDispatcher`'ın her process-içi task çağrısının etrafına koyduğu süre sınırı — Remote yoldaki `ExecutionApi:InvocationTimeoutSeconds`'ın Local karşılığı. `daprservice`, `statestore` ve `cacheaside` binding'lerinin kendi `timeoutSeconds` alanı **olmadığı** için bu üç tipte tek iç sınır budur |

Ortam değişkeni biçimi: `Workflow__TaskInvocation__Modes__http=Remote`, `Workflow__TaskInvocation__MaxConnectionsPerServer=100`.

:::warning
`ExecutionMode.Custom` değeri hem `DefaultMode` hem de her `Modes` girişi için **başlangıçta reddedilir** (`TaskInvocationOptionsValidator`, `ValidateOnStart`). Paylaşılan enum'da hiç inşa edilmemiş bir eklenti senaryosu için durur; kabul edilseydi sessizce Remote gibi davranırdı. Host `Custom` ile ayağa kalkmaz.
:::

## Çözümleme sırası

`TaskInvocationRouter.Resolve`, ilk eşleşen kazanır kuralıyla şu sırayı izler:

1. **Task tanımı override'ı** — task tanımında `config.executionMode` için ayrılmış bir kanca. Gelecek bir vnext-schema sürümü için yer tutucudur; bugün her zaman `null` döner ve karar vermez.
2. **Tipe göre host yapılandırması** — `Workflow:TaskInvocation:Modes:{wireTaskType}`.
3. **Yapılandırılmış varsayılan** — `Workflow:TaskInvocation:DefaultMode`.
4. **Yetenek kapısı** — her zaman en son ve koşulsuz: çözümlenen mod `Local` ise ama o wire tipi için kayıtlı bir `ILocalTaskInvoker` yoksa karar `Remote`'a **düşürülür**; task başarısız olmaz. Router yerine getiremeyeceği bir Local yolu vaat etmez.

Yetenek kapısı sayesinde yanlış bir yapılandırma (local invoker'ı olmayan bir tipi `Local` yapmak) kesinti değil, v0.0.94 öncesi davranışa sessiz geri dönüştür.

## Hangi tiplerin local invoker'ı var?

| Wire tipi | Task tipi | Local invoker | Not |
|-----------|-----------|---------------|-----|
| `http` | HTTP (tip `6`) | `LocalHttpTaskInvoker` | Execution'daki `HttpTaskInvoker` ve tip `22` `ExternalHttpTaskInvoker` ile aynı `HttpTaskInvocation` çekirdeği |
| `daprservice` | Dapr service invocation (tip `3`) | `LocalDaprServiceTaskInvoker` | Başka bir domain uygulamasını Execution'a uğramadan doğrudan Orchestration'dan çağırır |
| `soap` | SOAP (tip `16`) | `LocalSoapTaskInvoker` | `http` ile aynı adlandırılmış HTTP client'ları ve bağlantı sınırını paylaşır |
| `statestore` | State Store (tip `17`) | `LocalStateStoreTaskInvoker` | Paylaşımlı `IStateStoreClient` üzerinden çalışır; function response cache'ini de besler |
| `cacheaside` | Cache-Aside (tip `18`) | `LocalCacheAsideTaskInvoker` | Cache miss'te kaynak task envelope'unu aynı router'dan geçirir — `cacheaside` içinden çalışan bir `http` kaynak task'ı da bu tabloya tabidir |

Diğer tüm wire tipleri (`daprbinding`, `daprhttpendpoint`, `daprpubsub`, `daprconversation`, `python`, trigger/sorgu tipleri…) için local invoker yoktur; yapılandırmadan bağımsız olarak her zaman Remote çözümlenir.

### Tip 22 External HTTP deprecated

Tip `22` External HTTP task'ı, tip `6` HTTP'nin de varsayılan olarak Orchestration içinde çalışmasıyla gereksiz hale geldi ve **deprecated** (kaldırılmadı) durumundadır. Mevcut tanımlar çalışmaya devam eder; yeni tanımlarda tip `6` kullanın.

## Deploy etmeden önce: Dapr `state` bileşeni ve `storeName` kapsamı

`statestore` ve `cacheaside` artık varsayılan olarak **Orchestration sidecar'ında** çalıştığı için Orchestration host'un Dapr `state` bileşenine erişimi olmalıdır. Varsayılan store adı sorunsuzdur: Helm chart Orchestration'a `DAPR_STATE_STORE_NAME` verir ve `state` bileşenini orchestrator app id'sine kapsamlar. Sessizce kırılabilecek tek şey **özel `storeName`**'dir:

1. `DAPR_STATE_STORE_NAME` yerine açık `storeName` veren her `StateStoreTask` / `CacheAsideTask` tanımını ve her function `cache` bloğunu listeleyin.
2. Her biri için ilgili Dapr bileşeninin `scopes:` listesinin yalnızca execution değil, **orchestrator** app id'sini de içerdiğini doğrulayın. Yalnızca execution'a kapsamlı bir bileşen Remote yönlendirmede çalışır, Local varsayılanında ise publish veya startup sinyali olmadan ilk çalıştırmada başarısız olur.
3. Bileşen bu sürüm deploy edilmeden önce yeniden kapsamlanamıyorsa, kapsamlanana kadar `Modes` altında `"statestore": "Remote"` ve `"cacheaside": "Remote"` verin.

## Local yolun bedeli

1. **Dapr sidecar circuit breaker'ı yok.** Remote yolda Orchestration → Execution atlaması yalnızca circuit-breaker politikasıyla korunur (retry yok). Local çalışan task ile hedefi arasında böyle bir kesici yoktur; yavaş/hatalı bir downstream, orchestrator'ın kendi thread ve bağlantı havuzunda doğrudan hissedilir.
2. **`ExecutionApi:InvocationTimeoutSeconds` katmanı yok** — yerine `LocalInvocationTimeoutSeconds` (60 s) uygulanır. `http`/`soap` için kendi `timeoutSeconds`'larının arkasında bir yedek sınırdır; `daprservice`/`statestore`/`cacheaside` için ise ilk ve tek sınırdır. Bir task'ın `timeoutSeconds`'ının job bütçesine (`TransitionJobTimeoutSeconds`, 300 s) eşit ya da büyük olması publish'te reddedilmez — job bütçesi önce dolar, task'ın kendi timeout'u etkisiz kalır.
3. **State yolu havuzu paylaşır.** `statestore`, `cacheaside` ve function response cache artık orchestrator sidecar'ının Dapr `state` bileşenini ve Redis bağlantı havuzunu platformun kendi cache tüketicileriyle (`ComponentCacheStore`, `StateFunctionCache`, idempotency store) paylaşır. `MaxConnectionsPerServer` yalnızca HTTP/SOAP egress'ini sınırlar; state yolunda eşdeğer bir sınır yoktur. Cache-yoğun domain'lerde orchestrator'ın Dapr Redis `poolSize` değerini Helm chart üzerinden artırın.

Timeout katmanlaması özetle:

```
Remote: task timeoutSeconds ⊂ ExecutionApi:InvocationTimeoutSeconds (60s) ⊂ TransitionJobTimeoutSeconds (300s) ⊂ chain lock lease (330s)
Local : task timeoutSeconds (yalnızca http/soap) ⊂ LocalInvocationTimeoutSeconds (60s) ⊂ TransitionJobTimeoutSeconds (300s) ⊂ chain lock lease (330s)
```

Job bütçesi ve zincir kilidi için bkz. [Workflow Execution](./workflow-execution).

## ErrorBoundary `errorTypes` eşleşmesi

Local ve Remote yol, task hata metadata'sını farklı anahtar yazımıyla taşıyordu (`ExceptionType` / `exceptionType`); bu yüzden `errorTypes` ile eşleşen errorBoundary kuralları yalnızca bir yolda tutuyordu. v0.0.94 ile anahtar karşılaştırması her iki uçta da büyük/küçük harf duyarsız hale geldi: **`errorTypes` kuralları artık Remote yolda da eşleşir** ve çağırma modu hiçbir metadata ya da header aramasından gözlemlenemez. Daha önce Remote'ta sessizce atlanan `errorTypes` kuralları artık tetiklenir; mevcut errorBoundary tanımlarını bu davranış değişikliğine göre gözden geçirin (bkz. [Hata Yönetimi](../how-to/error-handling)).

## Bir tipi Remote'a geri almak

```json
{
  "Workflow": {
    "TaskInvocation": {
      "Modes": {
        "http": "Remote"
      }
    }
  }
}
```

Tüm tipleri birden geri almak için `DefaultMode: "Remote"` bırakıp `Modes` girişlerini kaldırın.

:::warning
Değişiklik **bir sonraki Orchestration host başlangıcında** etkili olur, bir sonraki istekte değil. `TaskInvocationRouter`, process ömrü boyunca bir kez bağlanan `IOptions<TaskInvocationOptions>` ile kurulur; hot-reload (`IOptionsMonitor`) bilinçli olarak yoktur. Yalnızca ConfigMap'i düzenlemek çalışan pod'da hiçbir şeyi değiştirmez — Orchestration deployment'ını rolling restart ile yenileyin. Execution servisinde değişiklik ya da yeniden deploy gerekmez.
:::

`http`/`soap`'ı yük altında Remote'a geri almak, hedef başına bağlantı tavanını `MaxConnectionsPerServer` (50) değerinden Execution host'un sabit `10`'una düşürür; tek hedefe yoğun trafik gönderen bir tipi geri alırken bu düşüşü hesaba katın.

## Gözlemlenebilirlik

- `TaskInvocationDispatcher`, task span'ına `vnext.task.invocation.mode` etiketini (`Local` | `Remote`) ekler; bir task'ın hangi yoldan gittiği trace'ten okunur. Geri alma sonrası yeni pod'ların ayarı aldığını bu etiketle doğrulayın.
- Karar gerekçesi (`task-override` / `type-config` / `default` / `no-local-invoker`) `TaskInvokedLocally` log'unda yer alır; ayrı bir span etiketi değildir.
- Ölçülen kazanım task başına yaklaşık 1,5–2,4 ms'dir (`Task.Invoke` p50, Local vs Remote); tek task'lı bir transition'da varyans içinde kalır, task sayısıyla çarpılarak görünür olur. Bunu transition-seviyesi bir hızlanma olarak okumayın.

## İlgili

- [Workflow Execution](./workflow-execution) — job timeout ve fan-out ayarları
- [Caching](./caching) — Orchestration'daki paylaşımlı cache katmanları
- [Service Discovery](./service-discovery) — cross-domain `daprservice` çağrıları
- [Hata Yönetimi](../how-to/error-handling) — errorBoundary ve `errorTypes`
