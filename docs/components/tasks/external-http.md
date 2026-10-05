---
sidebar_position: 2.1
title: External HTTP Task
description: HTTP çağrısını Execution servisine gitmeden doğrudan Orchestrator içinde yürüten task
---

# External HTTP Task (Type: `22`)

:::warning Deprecated — v0.0.94
Type `22`, v0.0.94 ile **deprecated** edilmiştir. Aynı sürümden itibaren standart [HTTP Task](./http) (type `6`) varsayılan olarak zaten Orchestrator içinde çalışır (`Workflow:TaskInvocation:Modes:http = "Local"`), yani type `22`'nin tek farkı olan "hop'suz çağrı" artık type `6`'nın da davranışıdır. Yeni tanımlarda type `6` kullanın; mevcut type `22` tanımları çalışmaya devam eder ancak `@burgan-tech/vnext-schema` enum'una eklenmeyecektir. Ayrıntı: [Task Invocation Yapılandırması](../../configuration/task-invocation).
:::

<sup>New</sup> v0.0.88 ile eklendi.

External HTTP Task, [HTTP Task](./http) (type `6`) ile **birebir aynı konfigürasyon ve script yüzeyine** sahip bir HTTP çağrısı task'ıdır. Tek fark çalıştığı yerdir: type 6 çağrıyı Execution servisine `/execution/invoke/{type}/{key}` hop'u ile devrederken, type 22 çağrıyı **doğrudan Orchestrator process'i içinde** yürütür.

İki tip de aynı paylaşılan gönderim çekirdeğinden (`HttpTaskInvocation`) geçer; adlandırılmış HTTP client seçimi (`validateSsl: false` → SSL-bypass client), header/Content-Type semantiği, response parse ve `acceptedStatusCodes` eşleştirmesi **aynı koddan** çalıştığı için iki tip arasında davranış farkı yoktur — yalnızca hop farkı vardır.

## Görev Tanımı

> **Schema:** `task-definition.schema.json`

```json
{
  "key": "get-user-info-external",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["users", "lookup", "external-http"],
  "attributes": {
    "type": "22",
    "config": {
      "url": "http://api.example.com/api/users/{userId}",
      "method": "GET",
      "headers": {
        "Content-Type": "application/json"
      },
      "timeoutSeconds": 30,
      "validateSsl": true
    }
  }
}
```

## Konfigürasyon Alanları

`ExternalHttpTask`, `HttpTask`'tan türer — konfigürasyon alanları **birebir aynıdır**:

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `url` | string | Evet | - | Hedef URL |
| `method` | string | Evet | - | HTTP metodu (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`) |
| `headers` | object | Hayır | null | HTTP header'ları |
| `body` | object | Hayır | null | Request body (GET dışında) |
| `contentType` | string | Hayır | - | Request body için `Content-Type` header'ı (örn. `application/json`, `application/xml`, `text/plain`). Tanımlandığında body **byte-exact** korunur |
| `rawBody` | string | Hayır | null | Body'yi hiçbir JSON yeniden serileştirmesi yapmadan **byte-exact** gönderir (`body`'yi bypass eder ve `body`'ye önceliklidir). İmzalanan (JWS/mTLS) gövdeler için: gönderilen bytelar imzalanan bytelarla birebir aynı olmalıdır |
| `timeoutSeconds` | integer | Hayır | 30 | İstek timeout süresi (saniye, minimum: 1) — bu task için **tek sınır** budur, aşağıya bakın |
| `validateSsl` | boolean | Hayır | true | SSL sertifika doğrulaması |
| `acceptedStatusCodes` | string[] | Hayır | - | Başarılı kabul edilecek HTTP hata kodları. Exact kod (`"403"`, `"404"`) ve wildcard pattern (`"4xx"`, `"40x"`, `"5xx"`) destekler |

Property erişimi ve setter metodları (`SetUrl`, `SetHeaders`, `AddHeader`, `RemoveHeader`, `SetBody`, ...) [HTTP Task](./http#property-erişimi) ile aynıdır — mapping script'leri `task as HttpTask` cast'i ile **değişmeden** çalışır, çünkü `ExternalHttpTask` sınıfı `HttpTask`'ı extend eder.

## Standart Yanıt

Çıktı şekli type 6 ile **birebir aynıdır** — bkz. [HTTP Task → Standart Yanıt](./http#standart-yanıt) ve [Hata Senaryoları](./http#hata-senaryoları).

## HttpTask (Type 6) ile fark

| | HTTP Task (`6`) | External HTTP Task (`22`) |
|---|---|---|
| Çalıştığı yer | Execution servisi | Orchestrator process'i (in-process) |
| Ağ hop'u | `/execution/invoke/{type}/{key}` | Yok |
| Dapr sidecar circuit breaker | Devrede | Devrede **değil** |
| `ExecutionApi:InvocationTimeoutSeconds` katmanı | Devrede | Devrede **değil** — tek sınır task'ın kendi `timeoutSeconds`'ı (varsayılan 30) ve job bütçesidir |
| Mapping script yüzeyi | `task as HttpTask` | Aynı (`task as HttpTask`) |
| Çıktı şekli | Standart HTTP task çıktısı | Type 6 ile birebir aynı |
| Reserved trace header'ları | Task binding'den ezilemez | Aynı kural geçerli (aşağıya bakın) |

### Reserved trace header'ları

`traceparent`, `tracestate`, `baggage`, `X-Correlation-Id` ve `X-Workflow-Instance-Id` task binding'inin `headers` alanında tanımlanamaz — invoker bu anahtarları görmezden gelir (`InvokerHelpers.IsReservedTraceHeader`). Güncel değerler otomatik enjekte edilir: `traceparent`/`tracestate` .NET HttpClient instrumentasyonu ile, workflow-context çifti ise `InvokerHelpers.ApplyTrustedCorrelationHeaders` ile Activity baggage'dan. External HTTP task, orchestrator'ın kendi task span'leri `ActivityContext`'ten oluşturulduğu (in-process Activity-baggage zincirini kesen) bir konumda çalıştığı için pipeline'ın oluşturduğu `TaskTraceContext`'i açıkça taşır — type 6'nın invoke zarfında context taşımasıyla aynı gerekçe.

<sup>New</sup> v0.0.99 `X-Request-Id` bu listeden çıktı ve **fill-if-absent** çalışır: mapping'de / `headers`'ta verilen boş olmayan değer olduğu gibi gönderilir (v0.0.80–v0.0.97 arasında sessizce atılıyordu), yoksa vNext'in kendi request id'si iletilir. Çağrı başına benzersiz UUID isteyen API'ler (ör. OHVPS/BKM) için değeri mapping'de `Guid.NewGuid()` ile üretin. Credential başlıkları (`sub`, `act_sub`, `position`, `client_id`, `role`) mapping vermediyse ya da boş bıraktıysa çağıranın isteğinden iletilir; mapping'deki dolu değer kazanır, 1024 karakteri aşan / kontrol karakteri içeren değerler ve morph-idm'in çözdüğü roller iletilmez. External HTTP task artık `variableKey` slot'una da uyar.

### `6` mı `22` mi?

| Seçim kriteri | `6` (HTTP, Execution'da) | `22` (External HTTP, Orchestrator'da) |
|---|---|---|
| Hedef güvenilmez veya yüksek hacimli mi? | **Tercih edin** — Execution servisi arbitrary egress'i izole etmek için vardır | Kullanmayın |
| Execution servisinin kullanılabilirliğine bağımlı olmamalı mı? | Hayır (bağımlı) | **Tercih edin** — çağrı Execution'ın ayakta olmasına bağlı değildir |
| Ekstra ağ hop'u/gecikmesi kabul edilemez mi? | Hayır | **Tercih edin** — düşük gecikme |
| Dapr sidecar circuit breaker / remote-invocation timeout korumasına ihtiyaç var mı? | **Tercih edin** | Hayır — bu katmanlar devrede değil |
| Çağrı, veritabanını da barındıran host içinde mi çalışmalı? | Hayır (izole) | **Dikkat** — Orchestrator veritabanını da barındıran host'tur |

:::warning[Şema paketi type `22`'yi henüz taşımıyor]
`@burgan-tech/vnext-schema@0.0.54` paketindeki `task-definition.schema.json`, `attributes.type` enum'ında `22` değerini **içermiyor** (type `22` deprecated olduğundan eklenmesi planlanmamaktadır). Bu nedenle domain paketlerinde `npm run validate` bir External HTTP task tanımını **reddeder**; runtime tarafında `publish` ve çalıştırma sorunsuz çalışır.
:::

:::info
Kaynak dokümanda (`vnext/docs/runtime/task-executors-and-invokers.md`) External HTTP task'ın gecikme/izolasyon trade-off'larını anlatan bölümde task tipi yer yer "`21`" olarak yazılmıştır — bu bir **typo**'dur; `TaskEnums.cs` ve JSON discriminator'ı `22`'dir, bu sayfa doğru değeri kullanır.
:::

## Örnek Component

[`vnext-example` reposu](https://github.com/burgan-tech/vnext-example) içinde External HTTP task'a özel bir örnek henüz eklenmedi — HTTP Task (type `6`) örnekleri (`core/Tasks/` altında) config yüzeyi bakımından birebir uygulanabilir; örnek eklenecek.

## İlgili

- [Tasks Genel Bakış](/docs/components/tasks/) — task türleri ve referans mekanizması
- [HTTP Task](./http) — type `6`, aynı konfigürasyon yüzeyi
- [Fan-Out Task](./fan-out) — orchestrator-local çalışan bir diğer task türü
- [Mappings](/docs/components/mappings) — `.csx` mapping'lerin authoring edilmesi
- Runtime dokümanı: [task-executors-and-invokers.md (vnext) → External HTTP tasks](https://github.com/burgan-tech/vnext/blob/master/docs/runtime/task-executors-and-invokers.md)
