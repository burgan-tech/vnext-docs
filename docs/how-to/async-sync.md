---
sidebar_position: 4
title: Async / Sync Yöntemi
description: Instance veya transition isteklerinde sync=true/false davranışı
---

# Async / Sync Yöntemi

Instance veya transition çalıştırma istekleri **`sync` query parameter**'ı alır. Bu parametre, çalışma biçimini ve client'a dönen response'un içeriğini değiştirir.

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

Response: `{ "id": "...", "status": { "code": "InProgress" } }` — işleme başlandığını gösterir.

Sonra client `GET /api/v1/{domain}/workflows/{wf}/instances/{id}/functions/state` ile long-polling yapar; `status.code = "A"` (Active) olduğunda mevcut state'e geçilmiştir.

### Deklaratif long-poll sonlandırma (`interaction.longPoll`)

Bir state, açık tutulan long-poll isteğinin **ne zaman sonlandırılacağını** `interaction.longPoll` ile deklaratif olarak tanımlayabilir. Runtime, isteği bir transition gerçekleşene veya `fallbackTimeoutSeconds` dolana kadar açık tutar; `terminate` ise state'ten çıkıldığında isteğin kapatılıp kapatılmayacağını belirler. Böylece her client kendi long-poll sonlandırma mantığını uygulamak yerine, durak noktalarını süreç tasarımından okur. Tanım ve örnek için bkz. [Workflow → State Interaction (Long Poll)](/docs/components/workflow#state-interaction-long-poll).

### Continuation işletimi (durable)

Asenkron continuation'lar dayanıklılık için kuyruğa alınabilir: continuation **doğrudan Dapr üzerinden** enqueue edilir, bu yol kullanılamadığında transactional **outbox** fallback devreye girer. Bu, sağlıklı koşullarda gecikmeyi azaltırken dayanıklılık garantisini korur.

## Karar

| Ne zaman? | Tercih |
|---|---|
| Hızlı, deterministic süreçler (validation, hesaplama) | `sync=true` |
| Uzun süren süreçler, dış API çağrıları, human task'lar | `sync=false` |
| Mobile/Web client (long-polling kabiliyeti var) | `sync=false` |
| Backend-to-backend integration (request/response pattern) | `sync=true` |

## İlgili

- [User Integration](/docs/concepts/user-integration) — async + view loop akışı
- [Instance Data](/docs/concepts/instance-data) — instance lifecycle
- [Built-in Functions](/docs/components/functions/built-in) — State function
- [Workflow → State Interaction (Long Poll)](/docs/components/workflow#state-interaction-long-poll) — deklaratif long-poll sonlandırma
