---
id: event-driven-workflows
title: Event-Driven Workflow'lar
sidebar_label: Event-Driven Workflow'lar
description: Harici pub/sub event'leri ile workflow instance başlatma ve transition tetikleme
---

# Event-Driven Workflow'lar

vNext, harici event'lere tepki verebilir. Bir event, herhangi bir pub/sub topic'ine yayınlanan mesajdır. Event geldiğinde vNext iki şeyden birini yapabilir:

1. **Yeni bir workflow instance başlatır.** Event, **workflow** üzerinde tanımlıdır.
2. **Mevcut bir instance üzerinde transition çalıştırır.** Event, **transition** üzerinde tanımlıdır.

İkisi de opsiyonel ve birbirinden bağımsızdır; bir workflow ikisini birden, birini ya da hiçbirini destekleyebilir.

| Action | Ne yapar | Event nerede tanımlanır | Teslimat |
| --- | --- | --- | --- |
| `start` | Yeni instance oluşturur | Workflow üzerinde (`attributes.event`) | `?action=start` |
| `transition` | Aktif instance'ı ilerletir | Transition üzerinde (`transition.event`) | `?action=transition&transitionKey=<key>` |

## Sorumluluk sınırı

Sorumluluk ayrımı nettir:

- **vNext runtime** tek bir generic HTTP endpoint sunar ve mapping script'inizi çalıştırır. Hiçbir topic'e abone olmaz, topic'leri bilmez.
- **Domain servisi** tüm teslimat altyapısının sahibidir: topic'ler, Dapr Subscription YAML dosyaları, pub/sub component'i ve producer'lar.

Sonuç: yeni bir event devreye almak **runtime değişikliği ya da vNext deploy'u gerektirmez**. Bir YAML dosyası ekleyip Dapr sidecar'ını yeniden başlatırsınız.

## Event tanımlama

Bir event'in tek özelliği vardır: `mapping` script'i (task mapping'leri ile aynı şekil — `location` + base64 `code`).

**Workflow seviyesi** — event ile instance başlatmayı etkinleştirir:

```json
{
  "key": "order-flow",
  "attributes": {
    "type": "F",
    "event": {
      "mapping": { "location": "./src/StartEventMapping.csx", "code": "<base64>" }
    },
    "states": [ "..." ]
  }
}
```

**Transition seviyesi** — event ile tetiklenen transition'ları etkinleştirir. Transition **mutlaka** `"triggerType": 3` (Event) tanımlamalıdır; başka bir trigger tipine teslimat `NotAnEventTransition` hatasıyla reddedilir.

```json
{
  "key": "abort-order",
  "target": "aborted",
  "triggerType": 3,
  "event": {
    "mapping": { "location": "./src/AbortEventMapping.csx", "code": "<base64>" }
  }
}
```

> **Kural:** Event transition yalnızca **state transition'ları** ve **shared transition'lar** üzerinde tanımlanabilir. `startTransition`, `cancel`, `exit` ve `updateData` transition'ları manuel kalır. Bkz. [Workflow bileşeni → Transition Yapısı](/docs/components/workflow).

## Mapping sözleşmesi: IEventMapping

Mapping script'ini domain servisi yazar. Script, `IEventMapping` interface'ini implemente eder ve tek metodu vardır:

```csharp
public interface IEventMapping
{
    Task<EventMappingResult> Handler(ScriptContext context);
}
```

Ham event payload'ı `context.EventPayload` üzerinden erişilebilir. **CloudEvent zarfları script çalışmadan önce runtime tarafından açılır** — producer'ın `data`'sını görürsünüz, `{ specversion, source, ... }` zarfını değil. `context.Headers` ve `context.Workflow` da kullanılabilir.

Handler'ın yalnızca iki sorumluluğu vardır:

1. **Korelasyon** — bu event hangi instance hakkında?
2. **Payload şekillendirme** — workflow'a hangi veri girecek?

Script deterministik ve yan etkisiz olmalıdır; yalnızca payload'ı dönüştürür. İçinden harici servis çağırmayın.

`EventMappingResult` alanları:

| Alan | Kullanım | Anlamı |
| --- | --- | --- |
| `InstanceKey` | start + transition | Business key. Start için: yeni instance'ın key'i. Transition için: bu key'e sahip **aktif** instance'ı bulur. |
| `Body` | start + transition | Start için: yeni instance'ın başlangıç attribute'ları. Transition için: transition'ın input datası. |
| `Selector` | yalnız transition | Payload key taşımadığında devreye giren korelasyon. `InstanceKey` set edilmişse yok sayılır. `action=start` için etkisizdir. |

## Korelasyon kuralları

**`action=start` için:** selector'a gerek yoktur — bulunacak mevcut bir instance yoktur. `InstanceKey` (yeni instance'ın key'i olur) ve `Body` dönün:

```csharp
public class StartEventMapping : ScriptBase, IEventMapping
{
    public Task<EventMappingResult> Handler(ScriptContext context)
    {
        var p = context.EventPayload;
        return Task.FromResult(new EventMappingResult
        {
            InstanceKey = p.userId,                      // YENİ instance'ın key'i
            Body = new { name = p.name, amount = p.amount }
        });
    }
}
```

**`action=transition` için:** runtime hedef instance'ı bulmak zorundadır. İki yol vardır:

- **Yol 1 — key ile.** Event payload'ı business key taşıyorsa `InstanceKey` set edin. Runtime bu key'e sahip aktif instance'ı bulur.
- **Yol 2 — selector ile.** Payload key taşımıyorsa (veya producer gönderemiyorsa) bunun yerine bir `Selector` dönün. Runtime instance store'u filtreler (instance kolonları + instance-data JSON), tek eşleşen instance'ı çözer, **onun** key'ini alır ve transition'ı onun üzerinde çalıştırır.

Öncelik: `InstanceKey` set edilmişse `Selector` yok sayılır.

Selector örneği — payload'da key yok, veriye göre korelasyon:

```csharp
public class AbortEventMapping : ScriptBase, IEventMapping
{
    public Task<EventMappingResult> Handler(ScriptContext context)
    {
        var p = context.EventPayload;
        return Task.FromResult(new EventMappingResult
        {
            // InstanceKey bilinçli olarak boş -> runtime Selector'a düşer.
            Selector = InstanceQuery.Create()
                .Where("currentState",       f => f.Eq("waiting-payment"))
                .Where("attributes.userId",  f => f.Eq(p.userId))
                .OrderBy("createdAt")
                .Last(),                     // en yeni eşleşmeyi al
            Body = new { reason = p.reason }
        });
    }
}
```

> **Güvenlik:** Selector **hedef workflow'a otomatik scope'lanır** — `flow` koşulunu runtime kendisi ekler. Selector'ünüz başka bir flow'un instance'larıyla asla eşleşemez.

Selector'lerde kullanılan fluent sorgu dilinin (operatörler, `OrGroup`, `OrderBy`, tip semantiği) tam referansı için: [Instance Filtreleme → Fluent InstanceQuery Builder](/docs/how-to/instance-filtering#fluent-instancequery-builder).

## Teslimat: endpoint ve Dapr Subscription'lar

### Alıcı endpoint

Orchestration API üzerindeki tek bir internal endpoint tüm event teslimatını karşılar:

```
POST /api/v1/{domain}/workflows/{workflow}/instances/events
     ?action=start|transition
     [&transitionKey=<key>]   // action=transition için zorunlu
     [&sync=true]             // pipeline tamamlanana kadar bekle
```

Body, ham event payload'ıdır. CloudEvent zarfları otomatik açılır.

### Dapr Subscription YAML'ları (domain'e ait)

Her topic-action eşleşmesi için bir YAML. **Yönlendirme kararı** (hangi action, hangi transition) YAML'da; **veri kararı** (korelasyon, body) mapping script'indedir.

```yaml
# start: topic'e gelen her mesaj bir instance oluşturur
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: order-flow-start-subscription
spec:
  topic: my-domain.order-flow
  route: /api/v1/my-domain/workflows/order-flow/instances/events?action=start
  pubsubname: vnext-pubsub
```

```yaml
# transition: topic'e gelen her mesaj korele instance'ı abort eder
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: order-flow-abort-subscription
spec:
  topic: my-domain.order-flow.abort
  route: "/api/v1/my-domain/workflows/order-flow/instances/events?action=transition&transitionKey=abort-order&sync=true"
  pubsubname: vnext-pubsub
```

Kurallar:

- Topic adlandırma: start için `{domain}.{workflow}`, transition'lar için `{domain}.{workflow}.{purpose}`.
- `pubsubname`, kendi Dapr pub/sub component'inize işaret eder (Redis, Kafka, RabbitMQ...).
- Lokalde YAML'lar orchestration sidecar'ına mount edilen klasöre konur; Kubernetes'te namespace'inizdeki `Subscription` custom resource'larıdır ve orchestration app-id'sine scope'lanır.
- Deklaratif subscription'lar sidecar açılışında okunur. **YAML ekledikten/değiştirdikten sonra Dapr sidecar'ını yeniden başlatın.**

:::warning[Kafka altında domain topic'leri]
Bu sayfadaki `my-domain.order-flow` gibi adlar Redis/RabbitMQ gibi ACL'siz broker'lar içindir. <sup>New</sup> v0.0.100 — Domain'in kendi yazdığı topic'ler (Subscription `topic`'i, [DaprPubSub Task](/docs/components/tasks/dapr-pubsub) `topic`'i) **olduğu gibi** kullanılır, runtime önek eklemez. Kafka'da broker her domain kullanıcısına yalnız `vnext.{domain}.*` yetkisi verdiği için bu topic'ler de o kalıba uymalı (ya da domain'e açıkça yetkilendirilmiş olmalı). Runtime topic'leriyle aynı biçim önerilir: örneğin `vnext.my-domain.production.order-flow` ve `vnext.my-domain.production.order-flow.abort`. Bkz. [Runtime topic adları](#runtime-topic-adları).
:::

### Helm ile pub/sub ve subscription tanımlama

[vnext helm chart'ı](https://github.com/burgan-tech/vnext-helm-charts/pull/25), `global.pubsubComponents` ve `global.subscriptionComponents` values listeleri ile Dapr `Component` ve `Subscription` (v2alpha1) kaynaklarını orchestrator (`vnext-<appDomain>-app`) sidecar'ına scope'lu olarak render eder:

```yaml
global:
  pubsubComponents:
    - name: kafka-events
      spec:
        type: pubsub.kafka
        version: v1
        metadata:
          - name: brokers
            value: "kafka:9092"
          - name: authType
            value: none

  subscriptionComponents:
    - name: order-created-sub
      spec:
        pubsubname: kafka-events          # bir pubsubComponents[].name ile eşleşmeli
        topic: my-domain.order-flow
        routes:
          default: /api/v1/my-domain/workflows/order-flow/instances/events?action=start
        # deadLetterTopic: my-domain.order-flow.DLQ
        # metadata:
        #   rawPayload: "true"
```

Pub/sub component adı **birebir** kullanılır; subscription'ın `pubsubname`'i doğrudan onu referanslar.

### Producer'lar

Topic'e yayın yapabilen her producer, vNext hakkında hiçbir şey bilmeden çalışır:

- Başka bir servis, Dapr SDK ile: `PublishEventAsync("vnext-pubsub", "my-domain.order-flow", payload)`
- CLI'dan `dapr publish` (lokal test)
- **Başka bir vNext workflow'u**, [DaprPubSub Task](/docs/components/tasks/dapr-pubsub) ile — coupling olmadan event tabanlı workflow-to-workflow choreography.

## Runtime davranışları

| Durum | Yanıt | Broker davranışı |
| --- | --- | --- |
| Event işlendi (start veya transition çalıştı) | 200 | Tamam |
| Key/selector ile eşleşen aktif instance yok | 200 — loglanır, bilinçli yok sayılır | Yeniden teslim edilmez |
| Mapping script hata fırlattı veya null döndü | 500 | Resiliency policy'ye göre tekrar denenir |
| `transitionKey` workflow'da bulunamadı | 404 | Tekrar denenir |
| Transition var ama `triggerType != 3` | 400 `NotAnEventTransition` | Tekrar denenir |
| Workflow/transition'da `event` tanımı yok | 404 `EventDefinitionMissing` | Tekrar denenir |

Önemli noktalar:

- **Eşleşme olmaması bilinçli olarak 200 döner.** Tamamlanmış bir instance'a gelen abort event'i sonsuza kadar yeniden teslim edilmemeli, buharlaşmalıdır.
- `sync=true` olmadan event kabul edilir ve asenkron işlenir; `sync=true` ile teslimat pipeline tamamlanana kadar bloklanır.
- **Domain izolasyonu** her şeyden önce uygulanır: her domain yalnızca kendi şemasını sorgular. Yabancı bir domain'in event'i sizin instance'larınıza dokunamaz.
- Selector sorguları ek olarak hedef workflow'un flow'una scope'lanır.

### Dağıtık event teslimi: outbox ve post-commit relay <sup>New</sup> v0.0.88 / v0.0.92

Tüm dağıtık event'ler (bu sayfadaki pub/sub event'leri dahil) artık **transactional outbox** üzerinden gider: commit içinde yazılan bir outbox satırı → Outbox worker publish → broker → Inbox worker → handler. Eski senkron pre-commit/`OnCompleted` hook modeli tamamen kaldırıldı.

Bazı event'ler ek olarak **post-commit relay** ile anında iletilir — outbox akışına paralel, bağımsız bir komut çağrısı:

- **SubFlow terminal event'leri** (`completed`/`faulted`/`canceled`) ve **`sub:state-changed`**, commit'ten hemen sonra parent'a (aynı domain'de in-process, cross-domain'de Dapr service invocation ile) doğrudan iletilir; Inbox teslimi, dedup'lu bir **durable backup** olarak devam eder — relay başarısız olsa bile outbox satırı zaten commit edilmiştir.
- `sub:state-changed`, bir aktivasyon episode'unun **rest point**'inde (Active olma, finish state'e ulaşma, veya bilinçli Busy — `BusyParked`/Busy-subtype) **bir kez** yayınlanır; A→B→C→D gibi bir inline auto-chain tek episode'dur ve yalnızca zincirin sonunda bir event üretir.
- Parent'ın `effectiveState`'i, en derin aktif SubFlow halkasının state'idir — açık bir SubFlow korelasyonu varken parent'ın kendi state değişimi bu kanaldan **yayınlanmaz** (child'ın bildirimi zaten yukarı taşınır).

Bu, bu sayfadaki event-driven workflow'ların doğrudan pub/sub akışını değiştirmez — yalnızca runtime'ın SubFlow/state-değişikliği bildirimlerini nasıl ilettiğini açıklar.

### Runtime topic adları

<sup>New</sup> v0.0.100 — Runtime'ın kendi iç event'leri (outbox, inbox, SubFlow bildirimleri) için kullandığı topic'lerin hepsi tek bir biçimdedir:

```
vnext.{APP_DOMAIN}.{environment}.{event}.v{n}
```

- `{APP_DOMAIN}`: host'un domain'i. `APP_DOMAIN` tanımlı değilse host açılışta hata verir.
- `{environment}`: küçük harfe çevrilmiş `ASPNETCORE_ENVIRONMENT`; tanımsızsa `production` (.NET host'unun da varsayılanı).
- Örnek: `vnext.core.production.instance.sub.completed.v1`, `vnext.core.development.aether.outbox.wakeup.v1`.

| Event | Açıklama |
|---|---|
| `instance.canceled` | Instance iptal edildi |
| `instance.canceled.child` | Parent iptal edildi; aktif SubFlow child'ının da iptali istenir |
| `instance.completed.cleanup` | Instance tamamlandı; zamanlanmış job'ları iptal edilir |
| `instance.faulted.child` | Parent hataya düştü; aktif SubFlow child'ının da hataya düşmesi istenir |
| `instance.faulted.cleanup` | Instance hataya düştü; zamanlanmış job'ları iptal edilir |
| `instance.sub.canceled` | SubFlow iptal edildi (parent'a bildirim) |
| `instance.sub.completed` | SubFlow tamamlandı (parent'a bildirim) |
| `instance.sub.faulted` | SubFlow hataya düştü (parent'a bildirim) |
| `instance.sub.state.changed` | SubFlow state değişikliği (`sub:state-changed`) |
| `transition.continuation.requested` | Zincirdeki sonraki transition'ın arka plan job'ı olarak kuyruğa alınması istenir |
| `aether.outbox.wakeup` | Outbox worker'ı uyandıran sinyal (yükü boş) |

Önek, Kafka ACL'si içindir: broker her domain kullanıcısına topic ve consumer group'larda `vnext.{domain}.*` yetkisi verir, dışındaki topic reddedilir. Consumer group'u runtime değil, Helm chart'ın Kafka component'i belirler (bkz. [Helm Chart](/docs/deployment/helm-chart)).

:::warning[Topic adı değişikliği — rollout'tan önce outbox'ı boşaltın]
v0.0.100 ile **tüm runtime topic adları değişir**. Eski adlı topic'lerde kalan mesajlar yeni sürümde tüketilmez. Outbox satırı topic adını yazıldığı anda saklar; güncellemeden önce yazılmış satırlar eski ada gönderilir. Bu yüzden yeni sürüme geçmeden önce outbox'ı boşaltın.
:::

Domain'in kendi yazdığı topic'ler (`DaprPubSubTask.topic`, domain'e ait `Subscription`'lar) bu kurala tabi değildir: olduğu gibi kullanılır, runtime önek eklemez. Kafka altında yine de `vnext.{domain}.*` kalıbına uymaları gerekir (yukarıdaki uyarıya bakın).

## Devreye alma checklist'i

1. Workflow'da `attributes.event` (start) ve/veya bir transition'da `event` + `"triggerType": 3` (transition) tanımlayın.
2. Her event için bir `IEventMapping` `.csx`'i yazın. Korelasyona karar verin: payload key taşıyorsa `InstanceKey`, taşımıyorsa `Selector` (fluent `InstanceQuery` + `First()/Last()`). `Body`'yi şekillendirin.
3. Her topic-action eşleşmesi için bir Dapr Subscription YAML'ı ekleyin. Pub/sub component'inin var olduğunu doğrulayın.
4. Producer'ları topic'e yönlendirin.
5. Aşağıdan yukarıya test edin (sonraki bölüm).

## Test (en ucuzdan başlayarak)

Alıcı taraf düz HTTP olduğundan, mapping + korelasyon + pipeline broker olmadan test edilebilir:

```bash
curl -X POST "http://localhost:4201/api/v1/my-domain/workflows/order-flow/instances/events?action=start" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"ord-1","amount":250}'
```

Sonra YAML yönlendirmesini gerçek yol üzerinden doğrulayın:

```bash
dapr publish --publish-app-id vnext-app --pubsub vnext-pubsub \
  --topic my-domain.order-flow --data '{"orderId":"ord-1","amount":250}'
```

Ancak bundan sonra gerçek producer'ı topic'e yönlendirin.

## İlgili Sayfalar

- [Workflow Bileşeni](/docs/components/workflow) — `event` alanı ve `triggerType` enum'u
- [Interface'ler → IEventMapping](/docs/components/interfaces)
- [Instance Filtreleme → Fluent InstanceQuery Builder](/docs/how-to/instance-filtering#fluent-instancequery-builder)
- [DaprPubSub Task](/docs/components/tasks/dapr-pubsub)
