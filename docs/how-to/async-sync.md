---
sidebar_position: 4
title: Async / Sync Yöntemi
description: Instance veya transition isteklerinde sync=true/false davranışı
---

# Async / Sync Yöntemi

Instance veya transition çalıştırma istekleri **`sync` query parameter**'ı alır. Bu parametre, çalışma biçimini ve client'a dönen response'un içeriğini değiştirir. <sup>New</sup> v0.0.99 itibarıyla flow veya transition tanımı `executionType` ile modu **kendisi** belirleyebilir; tanımda değer varsa `sync` parametresi yok sayılır — bkz. [Tanımla belirlenen mod (`executionType`)](#tanımla-belirlenen-mod-executiontype).

## `sync=true` — Senkron

İstek **senkron** çalışır:

- vNext işlemi tamamlanana kadar bekler
- Response'da işlem sonucu **veri ile birlikte** döner
- Client tek bir HTTP çağrısı ile sonucu alır
- Long-running işlemler için **timeout** riski vardır

**Örnek:**
```http
POST /api/v1/{domain}/workflows/{wf}/instances/start?sync=true
```

Response: instance ID + güncel state + tüm output data.

:::tip[Workflow `output` mapping]
Workflow tanımında [`attributes.output`](/docs/components/workflow#output-mapping) tanımlıysa, `sync=true` yanıtı standart zarf yerine **doğrudan output script'in ürettiği gövde** olur — script'in belirlediği status code ve header'lar ile. Flow böylece kendi API sözleşmesini şekillendirebilir. Subflow instance'ları hariçtir.
:::

## `sync=false` (default) — Asenkron

İstek **asenkron** çalışır:

- vNext sadece isteği **kabul eder** ve hemen response döner
- Response'da `id` ve `status` bilgisi vardır
- İşlem arka planda işlenir
- Client sonucu öğrenmek için **State Function** üzerinden **long-polling** yapar

**Örnek:**
```http
POST /api/v1/{domain}/workflows/{wf}/instances/start
```

Response: **`202 Accepted`** + `{ "id": "...", "status": { "code": "InProgress" } }` — işleme başlandığını gösterir.

:::info 202 Accepted
Asenkron (`sync=false`) start ve transition istekleri başarı durumunda artık `200` yerine **`202 Accepted`** döner — iş tamamlanmamış, durable arkaplan işlemesi için kuyruğa alınmıştır. `sync=true` istekler, hata sonuçları ve custom output-response yolu değişmemiştir.
:::

Sonra client `GET /api/v1/{domain}/workflows/{wf}/instances/{id}/functions/state` ile long-polling yapar; `status.code = "A"` (Active) olduğunda mevcut state'e geçilmiştir.

### Deklaratif long-poll sonlandırma (`interaction.longPoll`)

Bir state, açık tutulan long-poll isteğinin **ne zaman sonlandırılacağını** `interaction.longPoll` ile deklaratif olarak tanımlayabilir. Böylece her client kendi long-poll sonlandırma mantığını uygulamak yerine, durak noktalarını süreç tasarımından okur. Tanım, `rule` örneği ve tam davranış modeli için bkz. [Workflow → State Interaction (Long Poll)](/docs/components/workflow#state-interaction-long-poll).

**`terminate` semantiği (özet):**

- **`terminate: true`** → state'e girişte OnEntry tamamlandıktan sonra pipeline **duraklar**: instance `Busy` kalır, ack token'ı armlanır ve `fallbackTimeoutSeconds` (varsayılan 60) için fallback job'ı kurulur. Client `interaction` bloğunu görünce long-poll'u sonlandırır, ekranı render eder ve `ack` href'ine `POST` gönderir; ack gelmezse fallback pipeline'ı otomatik devam ettirir.
- **`terminate: false`** → pipeline **duraklamaz**, ack beklenmez, sunucu tarafında hiçbir şey armlanmaz. <sup>New</sup> v0.0.98 Instance bu state'te olduğu sürece (ve çağıran gate'i geçtiği sürece) `interaction` bloğu **her zaman** yayınlanır — `ack` olmadan. Client poll etmeye devam eder; `fallbackTimeoutSeconds` client'ın varsayılan long-poll penceresinin **yerine geçer** (varsayılan 60 sn; state `120` bildiriyorsa client 120 sn bekler). v0.0.95–v0.0.97 arasında bu blok hatalı olarak hiç yayınlanmıyordu.

State Function yanıtındaki `interaction` objesi iki biçimde gelir. `terminate: true` için **yalnızca instance gerçekten ack beklerken** (v0.0.95'ten beri değişmedi), `ack` ile:

```json
"interaction": {
  "terminateLongPoll": true,
  "fallbackTimeoutSeconds": 60,
  "ack": { "href": "/api/v1/core/workflows/account-opening/instances/{id}/longpoll/ack" }
}
```

`terminate: false` için instance state'te olduğu sürece, `ack` olmadan (v0.0.98):

```json
"interaction": { "terminateLongPoll": false, "fallbackTimeoutSeconds": 120 }
```

Yayın kuralının tam tablosu için bkz. [Built-in Functions → Interaction bloğunun yayın kuralı](/docs/components/functions/built-in).

- **Yetkilendirme kolu:** etkileşimi `roles` ile ya da <sup>New</sup> v0.0.94 bir `rule` (`IConditionMapping` koşul betiği) ile sınırlayabilirsiniz — tam olarak biri. `rule` fail-closed çalışır (false/hata/derlenemez → sinyal yok, ack 403).
- **Ack gate'i gateway'dedir** <sup>New</sup> v0.0.95: `POST …/longpoll/ack` yetkiyi in-process denetlemez; Internal Gateway isteği iletmeden önce [`authorize?ack=true`](/docs/components/functions/built-in#instance-authorize) fonksiyonunu çağırır. Önünde gateway olmayan bir runtime ack'i reddetmez.
- Parent bir subflow tüketicisi olarak child state'in `fallbackTimeoutSeconds` ve `roles` değerlerini override edebilir (`terminate` ve `rule` edilemez) — bkz. [SubFlow Overrides](./subflow-overrides).

### Continuation işletimi (durable)

Asenkron bir kabulün (start veya manuel/event transition) **yalnızca ilk** job'ı bu şekilde kuyruğa alınır: continuation **doğrudan Dapr üzerinden** enqueue edilir (`DirectEnqueueContinuations`, varsayılan `true`), bu yol başarısız olursa transactional **outbox** fallback devreye girer. Bu, sağlıklı koşullarda gecikmeyi azaltırken dayanıklılık garantisini korur.

**Auto-chain'in kendisi bu bayraktan bağımsızdır ve her zaman inline çalışır** — zincirdeki her otomatik hop, ilk job'ı başlatan çağıran tarafından **in-process** ve **awaited** olarak yürütülür; ayrı bir job enqueue edilmez. Eski **per-job** modu (her hop'un kendi job'ı, `EnqueueContinuationStrategy` / `ContinuationMode.Enqueue`) DI'dan kaldırılmıştır ve **erişilemez**; `TransitionPerJob` config alanı geriye dönük uyumluluk için okunur ama **inert**'tir (davranışsal etkisi yoktur). `DirectEnqueueContinuations`, yalnızca **ilk accept**'in enqueue yolunu değiştirir — auto-chain'in inline çalışıp çalışmayacağını asla etkilemez.

Runtime-üretilen subflow start ve forward çağrıları v0.0.91'den itibaren **senkron**dur (`sync=true`) — parent'ın orijinal request modundan bağımsız olarak child'ın mevcut pipeline aktivasyonu bir dinlenme noktasına kadar beklenir. Ayrıntı: [Transition Pipeline → Auto-Chain Yürütme](../concepts/transition-pipeline) ve [Async Transition Execution Modes](https://github.com/burgan-tech/vnext/blob/master/docs/architecture/async-transition-execution-modes.md).

## Tanımla belirlenen mod (`executionType`)

<sup>New</sup> v0.0.99 Bir flow veya transition tanımı, transition'ın nasıl çalışacağını **çağırandan bağımsız** olarak `executionType` ile bildirebilir:

| Değer | Anlamı | Yanıt |
|---|---|---|
| `"S"` | Senkron — istek pipeline bir dinlenme noktasına ulaşana kadar bekler | `200 OK` + tam instance |
| `"A"` | Asenkron — istek kabul edilir, pipeline arka planda çalışır | `202 Accepted` + `{ id, status }` |

Yalnızca büyük harfli `S` / `A` kabul edilir; geçersiz bir değer publish'te `Unknown execution type: X` hatasıyla reddedilir. Yanıta yeni bir alan eklenmez — yanıt şekli **etkin** modu izler.

**Nerede tanımlanır?**

- Flow seviyesinde: `attributes.executionType`
- Transition seviyesinde: state transition'ları, `sharedTransitions` ve `startTransition` üzerinde `executionType`

```json
{ "key": "submit", "target": "review", "triggerType": 0, "executionType": "S" }
```

**Öncelik** — tanım her zaman kazanır, içteki tanım dıştakini ezer:

```
etkin mod = transition.executionType   (varsa)
          ?? flow.executionType         (varsa)
          ?? çağıranın ?sync parametresi (varsayılan false = async)
```

Tanımda bir değer varsa `?sync` query parametresi o istek için **yok sayılır**. `executionType` tanımlamayan flow/transition'lar eskisi gibi davranır (migration gerekmez). Örnek: flow `A`, transition `S`, çağıran `?sync=false` gönderir → transition kazanır, istek senkron çalışır ve `200` döner.

**Uygulanmadığı yerler:**

- **Otomatik transition'lar** — auto-chain'in parçası olarak her zaman inline çalışır.
- **Runtime-internal yollar** — scheduled transition'lar, workflow timeout'ları, retry, subflow resume/cancel/fault, long-poll ack.
- **Subflow start / forward** — runtime'ın ürettiği child start ve aktif child'a forward çağrıları zorunlu `sync=true` ile çalışmaya devam eder.

**Gözlemlenebilirlik** — tanım çağıranın modunu değiştirdiğinde fark, mevcut istek span'ine tag olarak yazılır (yeni persist yok):

| Tag | Anlamı |
|---|---|
| `vnext.execution.requested` | Çağıranın istediği mod (`SYNC` / `ASYNC`, query parametresinden) |
| `vnext.execution.effective` | Tanım uygulandıktan sonra gerçekten çalışan mod (`SYNC` / `ASYNC`) |
| `vnext.execution.overridden` | Yalnızca tanım çağıranın modunu değiştirdiğinde `true` |

:::tip Client etkisi
`executionType` tanımlı bir transition'da client'ın `?sync` beklentisi tutmayabilir — `sync=false` gönderen bir client `200` + tam instance, `sync=true` gönderen bir client `202` alabilir. Client'lar yanıtı **HTTP status koduna göre** dallandırmalıdır.
:::

## Karar

| Ne zaman? | Tercih |
|---|---|
| Hızlı, deterministic süreçler (validation, hesaplama) | `sync=true` |
| Uzun süren süreçler, dış API çağrıları, human task'lar | `sync=false` |
| Mobile/Web client (long-polling kabiliyeti var) | `sync=false` |
| Backend-to-backend integration (request/response pattern) | `sync=true` |
| Modun çağırana bırakılmaması gereken transition'lar (ör. her zaman senkron bir doğrulama adımı) | Tanımda `executionType: "S"` / `"A"` |

## İlgili

- [User Integration](/docs/concepts/user-integration) — async + view loop akışı
- [Instance Data](/docs/concepts/instance-data) — instance lifecycle
- [Built-in Functions](/docs/components/functions/built-in) — State function
- [Workflow → State Interaction (Long Poll)](/docs/components/workflow#state-interaction-long-poll) — deklaratif long-poll sonlandırma
- [Transition Pipeline](/docs/concepts/transition-pipeline) — admission, lock modeli ve auto-chain yürütmesi
