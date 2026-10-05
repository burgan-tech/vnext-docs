---
sidebar_position: 7
title: "Gözlemlenebilirlik: Trace, Log ve Metrikler"
description: Correlation carrier'ları, reserved header'lar, span ağacı, trace lane'leri ve script/fan-out metrikleri
---

# Gözlemlenebilirlik: Trace, Log ve Metrikler

Bu sayfa, domain ekiplerinin kendi workflow'larını üretimde izlerken kullanacağı dört correlation taşıyıcısını, task binding'lerde nelerin ezildiğini, Elastic/Kibana'da hangi alanları sorgulayacaklarını, runtime'ın ürettiği span ağacını ve script/fan-out metriklerini tek yerde toplar.

## Dört taşıyıcı

vNext bir istemci isteğini uçtan uca izlerken dört farklı kimliği **kasıtlı olarak ayrı** tutar — hiçbiri diğerinin yerine kullanılmaz:

| Taşıyıcı | Header | Alan / Kapsam |
|---|---|---|
| W3C trace context | `traceparent` / `tracestate` | Tek bir APM trace ağacı (Elastic, OpenObserve, Jaeger) |
| Request id | `X-Request-Id` | `x_request_id` — **tek bir client HTTP isteği**, tüm servisler boyunca |
| Business correlation | `X-Correlation-Id` | `correlation.id` — **bir transition execution zinciri**; client-tetiklemeli her execution için üretilir, async job hop'ları ve auto-chain transition'lar boyunca **sabit** kalır; geçerli bir korelasyon yoksa güncel W3C trace id'sinden, o da yoksa üretilen bir GUID'den türetilir |
| Instance id | `X-Workflow-Instance-Id` | `workflow.instance.id` — vNext'e özgü olmayan, vendor-neutral instance kimliği (vNext-içi eksen `vnext.instance.id`'dir) |

Kimlik claim'leri `sub` ve `act_sub` da korelasyon metadata'sı olarak taşınır; **`act` claim'inin tamamı asla taşınmaz veya loglanmaz** — yalnızca acting subject (`act_sub`) geçer.

### Format kuralları

- `workflow.instance.id` **canonical lowercase UUID** formatındadır.
- `correlation.id` sıfır olmayan, 32 karakterlik UUID **`N` formatındadır** (tire yok).
- Identity değerleri (`sub`, `act_sub`) yalnızca şu koşullarda kabul edilir: `A-Z`, `a-z`, `0-9`, `_`, `-` karakterleri, en fazla 128 karakter, ve **vNext trace context'inden gelmiş olmaları** (task mapping header'ından değil).

:::note
`X-Request-Id` / `X-Correlation-Id` / `X-Workflow-Instance-Id` birbirinin yerine geçmez: `X-Request-Id` tek bir HTTP çağrısını, `X-Correlation-Id` bir transition zincirinin tamamını, `X-Workflow-Instance-Id` ise instance'ın kendisini tanımlar.
:::

## Task binding'de reserved header'lar <sup>New</sup> v0.0.80

Task tanımlarındaki (`http`, `soap`, `daprservice`, `daprhttpendpoint`, `trigger`) `headers` bloğu aşağıdaki header'ları **set edemez** — runtime bu anahtarları görmezden gelir ve canlı değerle ezer:

```text
traceparent
tracestate
baggage
X-Correlation-Id
X-Workflow-Instance-Id
```

Canlı değerler otomatik enjekte edilir: `traceparent` / `tracestate` .NET HttpClient enstrümantasyonu tarafından, workflow-context çifti (`X-Correlation-Id`, `X-Workflow-Instance-Id`) ise güncel Activity baggage'ından. Bir task tanımına kopyalanmış eski bir `traceparent` veya sahte bir korelasyon değeri, workflow bağlamını koparır ya da taklit eder — reserved-header kuralı tam olarak bunu engeller.

`sub` / `act_sub` kasıtlı olarak reserved **değildir**: binding bu alanları set edebilir ve o değer kazanır (**fill-if-absent**) — yoksa gateway token'ından (baggage) doldurulur.

<sup>New</sup> v0.0.99 **`X-Request-Id` artık reserved değildir — mapping kazanır, vNext doldurur.** v0.0.80–v0.0.97 arasında reserved listesindeydi: mapping'deki değer sessizce atılıyor ve hiçbir şey gönderilmiyordu (ör. OHVPS/BKM `400 TR.OHVPS.Resource.InvalidFormat`). Şimdi kural fill-if-absent'tir: task'in `headers` bloğunda ya da input mapping'inde verilen boş olmayan değer olduğu gibi (tek sefer) gönderilir; verilmemiş ya da boşsa vNext'in kendi request id'si değiştirilmeden gönderilir; vNext'in request id'si yoksa (ör. request id yakalanmamış timer / event hop'u) hiçbir şey üretilmez. Kural Http, ExternalHttp, Soap, DaprService, DaprHttpEndpoint, DirectTrigger, GetInstance / GetInstances / GetInstanceData, StartTrigger ve SubProcess task'lerinde geçerlidir (StartTrigger ve SubProcess hâlâ başka workflow / kimlik header'ı damgalamaz).

:::tip Çağrı başına benzersiz UUID
vNext'in request id'si **client isteği başınadır**; client bir id göndermediyse Aether `HttpContext.TraceIdentifier`'a düşer (UUID değildir). Her çağrıda benzersiz UUID isteyen API'ler için değeri mapping'de üretin:

```csharp
httpTask.AddHeader("X-Request-Id", Guid.NewGuid().ToString());
```
:::

**Credential header'ları** (v0.0.99): her dışa giden task türü `sub`, `act_sub`, `position`, `client_id`, `role` request header'larını, task mapping'i bunları vermediyse ya da boş bıraktıysa iletir; mapping'deki dolu değer kazanır. 1024 karakteri aşan ya da kontrol karakteri içeren değerler iletilmez; morph-idm'in çözdüğü roller hiçbir zaman iletilmez. Ayrıntı: [Schema Tanımı → `x-encryption`](/docs/how-to/view-consept/schema-tanimi).

:::warning
Cross-domain internal çağrılarda (`internal/subflow-forward`, `internal/busy-release`, `related-data` ve remote app-service çağrıları) da aynı kural geçerli: `traceparent`, `tracestate` ve `baggage` **koşulsuz** atlanır — çünkü `HttpClient`'ın `DiagnosticsHandler`'ı `traceparent`'ı fill-if-absent ekler; eski bir kopya, canlı `Activity`'nin önüne geçip çağrılan tarafı yanlış span'a bağlardı.
:::

## Elastic / Kibana

### Alan eşlemesi

| OpenTelemetry attribute | Elastic alanı |
|---|---|
| `workflow.instance.id` | `labels.workflow_instance_id` |
| `correlation.id` | `labels.correlation_id` |
| `sub` | `labels.sub` |
| `act.sub` | `labels.act_sub` |
| W3C trace id | `trace.id` (native alan) |
| Request id | `x_request_id` (hem log hem span'lerde aynı isim) |

:::note
String tag'ler `labels.*` altında (`keyword`), sayısal tag'ler `numeric_labels.*` altında yaşar — örn. `vnext.script.context.memo.hits` → `numeric_labels.vnext_script_context_memo_hits`. `labels.*` altında aramak sayısal alanlarda hiçbir sonuç döndürmez.
:::

### Örnek sorgular

Bir workflow instance'ına ait tüm telemetriyi bulma:

```text
labels.workflow_instance_id : "<workflow-instance-id>"
```

Orchestration ve Execution servislerini korelasyon ID'siyle eşleştirme:

```text
labels.correlation_id : "<correlation-id>"
  and service.name : ("vnext-app-<domain>" or "vnext-execution-app-<domain>")
```

Birincil ve acting subject'e göre filtreleme:

```text
labels.sub : "<subject>"
  and labels.act_sub : "<acting-subject>"
```

Bir isteğin tüm servislerdeki log satırlarını tek sorguda bulma (önerilen birincil anahtar):

```text
x_request_id : "<the X-Request-Id you sent>"
```

Tam dağıtık trace'i açma:

```text
trace.id : "<trace-id>"
```

### APISIX ön koşulu

Edge gateway'in iki plugin'i etkinleştirmesi gerekir:

1. **`request-id` plugin'i** — client'ın `X-Request-Id`'sini geçirir, yoksa üretir. vNext bunu her response'ta echo eder.
2. **`opentelemetry` plugin'i** — gateway'i trace root yapar ve `traceparent`'ı downstream'e enjekte eder; vNext'in ASP.NET Core enstrümantasyonu gelen `traceparent`'a saygı gösterir.

### Dashboard'lar için prefix değişimi

Aether ≥ 1.0.35 ile `Telemetry:Logging:Enrichers:RequestHeaderKeyPrefix` boş string (`""`) olarak ayarlanır; bu, alanların `RequestHeader.` prefix'i olmadan düz isimlerle (`sub`, `act_sub`, `jti`, `role`, `x_parent_instance_id`, `user_agent`) yazılmasını sağlar. Elasticsearch/OpenObserve gibi backend'ler noktayı flatten ettiği için eski davranışta bu alan `requestheader_act_sub` olarak görünüyordu. **Kayıtlı Kibana sorguları / dashboard'lar `requestheader_act_sub` → `act_sub` olacak şekilde güncellenmelidir.**

## Span ağacı <sup>New</sup> v0.0.87

v0.0.87'den itibaren transition pipeline'ının önemli her adımı **her zaman açık** (always-on business) span üretir — `Telemetry:Tracing:DetailLevel = Business` (varsayılan) altında bile. Kural: Business modda export'ta filtrelenecek bir span asla **oluşturulmamalıdır** (oluşturulup filtrelenirse altındaki child span'ler de trace'de kopar).

Transaction (async yolda), transition anahtarıyla adlandırılır: **`TransitionJob.Execute/{key}`** — bu sayede APM job'ları job tipine göre değil transition'a göre gruplar; artık ayrı bir `transition/{key}` span'i yoktur.

| Span | Kapsam / önemli tag'ler |
|---|---|
| `Step.{Name}` | Bir iş yapan her pipeline step'i (`vnext.step.order`, `vnext.step.outcome`). İş yapmayan bir step (`StepOutcome.ContinueNoWork()`) span üretmez. |
| `Transition.LoadContext` | `TransitionContextFactory` — context kurulumu; altında `Cache.Get`/`Instance.Load` |
| `Transition.Validate` | Şema + policy doğrulama |
| `Task.Execute.{taskKey}` | Aether `[Trace]` aspect'i — task yürütmesinin gövdesi |
| `Task.Invoke` | Task'ın invoke aşaması (`Task.PrepareInput`/`Task.ProcessOutput` ile birlikte) |
| `Invoke.{taskType}/{taskKey}` | Execution tarafında `TaskInvokerRegistry.InvokeAsync` |
| `Script.Compile/{identity}` | Her compile çağrısı (hit dahil); `vnext.script.cache.hit`, miss'te `vnext.script.key` |
| `Script.Execute` | Compile + invocation; `vnext.script.kind` (`lockKey` \| `subflowInputMapping` \| `subflowOutputMapping` \| `functionOutput`) |
| `Script.ResolveHelpers` | Helper-set resolve + compile (`vnext.script.helper.count`) |
| `Cache.Get/{cacheKey}` | `cache.hit`, `cache.l1.hit`, `cache.source` (`l1`\|`l2`\|`backend`) |
| `Cache.GenerationGet/{redisKey}` | Her component resolution'dan önceki generation-token okuması |
| `Lock.Acquire/{lockKey}` / `Lock.Release/{lockKey}` | `vnext.lock.kind` (`status` \| `chain`), `vnext.lock.acquired` |
| `Instance.AppendData` | Instance data persist (`vnext.data.version`, `vnext.data.size_bytes`) |
| `Uow.Commit` | Transaction commit |
| `PostCommit.*` | Commit sonrası iş (`PostCommit.Coordinate`, `PostCommit.Settle`, `PostCommit.Fault`, …) |
| `SubFlow.Start/{domain}/{flow}` | Subflow başlatma operasyonu (input mapping dahil) |
| `Subflow.Descend/{targetFlow}` | Bir built-in function'ın açık subflow korelasyonuna bir seviye inişi; `vnext.subflow.depth`, `vnext.descent.transport` (`local`\|`remote`) |
| `Auth.ResolveRoles` | Caller-role resolution (`vnext.auth.provider`, `vnext.auth.outcome` = `resolved` \| `empty` \| `failed` \| `header` <sup>New</sup> v0.0.97, `vnext.auth.roles.count`). <sup>New</sup> v0.0.96: `failed` ise `vnext.auth.failure_kind` (`http_status` \| `timeout` \| `transport` \| `parse`), `empty` ise `vnext.auth.empty_reason` (`no_content` \| `empty_body` \| `empty_array`) — morph-idm artık hata durumunda boş rol kümesine **fail-open** düşer ve bu tag'ler nedenini söyler. `header`: `CallerRoleProvider:Provider=morph-idm` altında boş olmayan `role` header'ı (veya `authorize?role=`) morph-idm yerine kullanıldı |
| `Discovery.Resolve/{domain}` | Cross-domain discovery çözümü (`vnext.discovery.domain`, `vnext.discovery.endpoint_kind`) |
| `FanOut.Item` | Fan-out batch'inin her öğesi için bir span (`vnext.fanout.item.index`, `.key`, `.alias`, `.queue_wait_ms`) |

:::tip Business vs Verbose
`Telemetry:Tracing:DetailLevel`: **`Business`** (varsayılan) yukarıdaki tabloda listelenen tüm span'leri (`span.category=business`) üretim ortamında görünür kılar. **`Verbose`** bunlara ek olarak düşük seviye tanı span'leri ekler (ör. Aether'in kendi `BackgroundJob.Schedule*` span'leri gibi Verbose-gated olanlar). Bu değer başlangıçta okunur — değiştirmek restart gerektirir.
:::

Detaylı span referansı ve her span'in `ActivitySource`'u için kaynak: `vnext/docs/runtime/trace-span-tree.md`.

### AdditionalSources kaydı

Yeni bir `ActivitySource` tanımlayan her değişiklik, **aynı commit'te** o kaynağı dört host'un (`Orchestration`, `Execution`, `Workers.Inbox`, `Workers.Outbox`) `appsettings.json`'undaki `Telemetry:Tracing:AdditionalSources` dizisine eklemelidir. Kayıtlı olmayan bir kaynak, span'leri in-process üretmeye devam eder ama `TracerProvider` onları export etmez — hatasız, sessiz bir boşluk oluşur.

<sup>New</sup> v0.0.93 — Her host açılışta **`ActivitySourceRegistrationCheck`** çalıştırır: runtime'ın bildirdiği her kaynağın, process'in çözdüğü **birleşik** konfigürasyonda kayıtlı olduğunu doğrular ve eksikleri **uyarı** olarak loglar (asla fırlatmaz — telemetri boşluğu trafiği durdurmamalı). Repo'daki `appsettings.json` testinin göremediği durumu yakalar: .NET dizileri index'e göre birleştirdiği için chart'ın env bloğundaki tek bir `Telemetry__Tracing__AdditionalSources__0` girdisi ilk kaynağı **sessizce değiştirir**. Aynı sürümde span ağacı pipeline dışı her rotaya (function, instance GET/list, incidents …) yayılmıştır ve collector filtresi `^/dapr.proto` ile sidecar'ın kendi gRPC gürültüsü düşürülür.

## Trace lane'leri ve activation episode

**Trace lane.** Bir instance'ın hop'ları (auto-chain adımları) trace ağacında **düz kardeşler** (flat siblings) olarak render edilir; derinlik zincir uzunluğuna değil, yalnızca **subflow iç içeliğine** bağlıdır. Yeni bir lane yalnızca bir subflow handoff'unda açılır — önceki hop, `vnext.hop.predecessor` tag'i ile nedensellik açısından aranabilir kalır ama üst span olarak kullanılmaz.

**Deferred job'lar ayrı trace açar.** Timer transition'ları, workflow timeout ve long-poll ack-timeout job'ları **yeni bir trace** başlatır; tetikleyen (arming) trace, yalnızca `vnext.origin.trace_id` / `vnext.origin.span_id` tag'leri ile aranabilir şekilde bağlı kalır. Bu kasıtlıdır: bu job'lar dakikalar-günler sonra ateşlenir ve süresi dolmuş bir trace'i diriltmemelidir.

**Activation episode**, bir tetikleyicinin kabul edildiği andan instance'ın dinlenme (rest) noktasına ulaştığı ana kadarki bütünü kapsayan sentetik bir ölçümdür: `Instance.Activation/{key}` span'i, episode'un başlangıcına geriye dönük (backdated) bir `startTime` ile ve son `Uow.Commit`'i bir `ActivityLink` olarak taşıyarak, ayarlanma anını ("request → flow kullanılabilir oldu" süresini) ölçülebilir kılar. Fleet-genelinde persentiller span'den değil `workflow_activation_duration_ms` metriğinden (`BBT.Workflow.Telemetry` meter'ı) okunur.

## Metrikler

| Metrik | Tip | Etiketler |
|---|---|---|
| `script_compilations_total` | counter | `result=hit\|miss`, `status` |
| `script_compilation_duration_seconds` | histogram | `cache` |
| `script_execution_duration_seconds` | histogram | `script_type`, `language`, `status` |
| `script_runtime_errors_total` | counter | `script_type`, `language`, `error_type` |
| `workflow_fanout_batch_size` | histogram | `task_key`, `workflow` |
| `workflow_fanout_batch_duration_seconds` | histogram | `task_key`, `workflow` |
| `workflow_fanout_item_failures_total` | counter | `task_key`, `workflow` — batch başına **bir kez**, başarısız öğe sayısı kadar artar (öğe başına değil) |

:::danger Deprecated: `script_executions_total`
`script_executions_total` her zaman **compile** yolunda artırılmıştır (cache hit'ler dahil) — script'in gerçekten **çalıştırılmasında** değil. Geriye dönük uyumluluk için değişmeden emitlenmeye devam eder. Grafana panellerini şuna taşıyın:
- Compile oranı → `rate(script_compilations_total[5m])`
- Temiz compile latency'si → `script_compilation_duration_seconds{cache="miss"}`
- Gerçek yürütme sayısı → `script_execution_duration_seconds_count`

Acil bir aksiyon gerekmiyor — eski metrik hâlâ emit ediliyor, ancak yeni panolar yukarıdaki metriklere göre kurulmalı.
:::

### Metrik Endpoint'leri

<sup>New</sup> v0.0.99 — "Bu akışta zaman nereye gidiyor?" ve "Bu function yavaş mı, hata mı veriyor?" sorularını yanıtlayan salt-okunur endpoint'ler. Diğer okuma yüzeyleri gibi in-process `queryRoles` gate'i taşımazlar; yetki Internal Gateway → `authorize?queryRoles=true` ile verilir.

**Transition ve state metrikleri** — tek bir instance için, mevcut `InstanceTransitions` / `InstanceTasks` kayıtlarını **attempt** modeline gruplar (`{instance}` = id veya key):

| Endpoint | Gruplama | Bir attempt |
|---|---|---|
| `GET /{domain}/workflows/{workflow}/instances/{instance}/transitions/{transitionKey}/metrics` | transition key | Bir tetiklenme (firing) |
| `GET /{domain}/workflows/{workflow}/instances/{instance}/states/{stateKey}/metrics` | state | Bir ziyaret (giriş → çıkış) |

```json
{
  "element": { "kind": "transition", "key": "to-review" },
  "count": 1,
  "attempts": [
    {
      "seq": 1,
      "startedAt": "…", "finishedAt": "…",
      "durationMs": 1104.0,
      "triggerType": "manual",
      "triggeredBy": "alice",
      "tasks": [
        {
          "id": "6f9c…", "taskKey": "risk-recalc", "hook": "onExecute", "order": 1,
          "status": "completed", "businessStatus": "success",
          "startedAt": "…", "durationMs": 511.0, "faultedTaskRef": null, "error": null
        }
      ]
    }
  ]
}
```

- Her attempt döner (retry ve yeniden tetiklenmeler dahil); filtreleme istemcinin seçimidir.
- `transition` için `durationMs` transition'ın **yürütme** süresidir; `state` için ziyaretin **bekleme (dwell)** süresidir (state'ten henüz çıkılmadıysa `null`).
- `hook` (`onExecute` / `onEntry` / `onExit`) ve `order` (eşit order ⇒ paralel grup) yeni `InstanceTasks` kolonlarından gelir (migration `AddInstanceTaskTriggerAndOrderColumns`); migration öncesi satırlarda `null`'dır. Aynı kolonlar `tasks` function öğelerinde de döner. Payload'lar (`Request` / `Response`) hiçbir zaman dönmez.

**Function metrikleri** — domain function çağrılarının sayfalı yürütme serisi:

| Endpoint | Kapsam |
|---|---|
| `GET /{domain}/functions/{function}/metrics` | Domain function |
| `GET /{domain}/workflows/{workflow}/functions/{function}/metrics` | Flow kapsamlı kardeş route |

| Query parametresi | Varsayılan | Açıklama |
|---|---|---|
| `page` | `1` | Sayfa numarası |
| `pageSize` | `20` | Sayfa boyutu (en fazla `100`) |
| `from` / `to` | — | Zaman penceresi |
| `succeeded` | — | `true` / `false` ile sonuca göre filtre |

```json
{
  "links": { "self": "…", "first": "…", "next": "…", "prev": null },
  "items": [
    {
      "executionId": "…", "functionVersion": "1.0.0", "invokedAt": "…", "durationMs": 42.0,
      "scope": "I", "workflow": "account-opening", "instanceId": "…",
      "succeeded": true, "status": "completed", "statusCode": 200, "fromCache": false,
      "traceId": "…", "invokedBy": "alice"
    }
  ],
  "summary": { "count": 128, "p50Ms": 38.0, "p95Ms": 120.0, "failureRate": 0.02 }
}
```

`summary` filtrelenmiş pencerenin tamamını özetler (sayım, p50 / p95 gecikme, hata oranı).

**Function journal'ı opt-in'dir.** Yalnızca tanımında `attributes.executionLog: "E"` (enabled) olan function'lar kaydedilir; `"D"` ya da alanın yokluğu hiçbir şey kaydetmez. Built-in instance okuma function'ları (`state`, `data`, `view`, …) hiç journal'lanmaz — telemetrileri APM span'lerindedir.

```json
{ "key": "get-customer-summary", "attributes": { "executionLog": "E" } }
```

Kayıt asenkron ve best-effort'tur: function yolu satırı yazmaz, sınırlı bir süreç içi kuyruğa bırakır; arka plan yazıcı toplu (batch) insert yapar. Kuyruk doluysa kayıt düşürülür (`WorkflowLogs` **80008**). Tablo sabit **`sys_metrics`** şemasındadır (migration `MetricsDb/AddFunctionExecutionsJournal`); bu fazda saklama süresi / temizlik işi yoktur.

```json
"Workflow": {
  "FunctionExecutionJournal": { "QueueCapacity": 50000, "BatchSize": 1000 }
}
```

| Anahtar | Varsayılan | Açıklama |
|---|---|---|
| `Workflow:FunctionExecutionJournal:QueueCapacity` | `50000` | Kuyruk kapasitesi (ani yük emici); değişiklik süreç yeniden başlatılınca uygulanır |
| `Workflow:FunctionExecutionJournal:BatchSize` | `1000` | `SaveChanges` başına satır sayısı (verim ayarı) |

## Yapılandırma

Telemetri konfigürasyon anahtarları (OTLP endpoint, `DetailLevel`, `AdditionalSources`, propagator) için bkz. [Telemetri Yapılandırması](../configuration/telemetry).

:::warning WorkflowLogs EventId'leri yeniden numaralandı — v0.0.94 / v0.0.95
`WorkflowLogs`'ta aynı `EventId`'yi paylaşan mesajlar ayrıştırıldı; eski numaraya bağlı Kibana sorguları / alarmlar **güncellenmelidir**:

| Sürüm | Taşınan | Eski → Yeni |
|---|---|---|
| v0.0.94 ([#1017](https://github.com/burgan-tech/vnext/pull/1017)) | 18 çakışma: `DynamicExpressoCondition*` / `TransitionJobArmedAfterLock` | 10076 / 10077 / 10098 → 10158–10160 |
| | Multi-Channel Notification bölgesi (8 mesaj) | 10090–10097 → 10161–10168 |
| | Instance Query Filtering | 20440–20442 → 20460–20462 |
| | `InstanceCanceledEventIgnoredDomainMismatch`, `TimeoutMapping{Fallback,Resolved}`, `SubFlowStartFailed`, `ChildSubflowCancelEventIgnoredDomainMismatch` | 40021 → 40105, 40100/40101 → 40106/40107, 40080 → 40135, 40030 → 40136 |
| v0.0.95 ([#1024](https://github.com/burgan-tech/vnext/pull/1024)) | Local task invocation mesajları (`TaskInvokedLocally`, `LocalTaskInvocationFailed`, `…Cancelled`, `…SslValidationDisabled`, `LocalCacheAsideBypassedCacheError`, `LocalTaskInvocationTimedOut`) | 10160–10165 → 10169–10174 |

`JobFailed` (40075) iki overload'lı tek olaydır ve bilerek korunmuştur. Boşluklar doldurulmaz (emekli bir id'ye kayıtlı sorgu olabilir). Aether **1.0.41** (v0.0.93) / **1.0.42** (v0.0.95) ile birlikte gelir.
:::

## Bilinen sınırlar

- **System-triggered job'lar** (timer transition, workflow timeout, long-poll ack-timeout) client isteğinden bağımsız ayrı trace'lerdir çünkü payload'ları hiçbir header taşımaz — bunları `vnext.instance.id` veya `correlation.id` ile korelasyonlayın.
- **Outbox worker'ın publish loop'u** bir `BackgroundService` içinde, request context'i olmadan çalışır; kendi publish log satırları request id taşımaz. Request id, published event içinde (`RequestId`) seyahat etmeye devam eder ve Inbox tarafında yeniden ortaya çıkar.

## İlgili Başlıklar

- [Async / Sync Yöntemi](./async-sync)
- [Kaynak Kilitleme (Resource Lock)](./resource-lock)
- [Olay Odaklı Workflow'lar](./event-driven-workflows)
