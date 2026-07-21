---
sidebar_position: 8
title: Get Instance Task
description: Diğer workflow'lardan tek bir instance'ın tam projeksiyonunu çekme task'ı
---

# GetInstance Task

GetInstance Task (`type: "19"`), hedef workflow'daki **tek bir instance'ın tam projeksiyonunu** — metadata ve data birlikte — döner. `GET /api/v1/{domain}/workflows/{workflow}/instances/{instance}` endpoint'inin task karşılığıdır ve trigger task ailesini tamamlar:

| Task | Tip | Ne döner |
| --- | --- | --- |
| [GetInstances](/docs/components/tasks/get-instances) | `15` | Instance **listesi** (sayfalama/filtreleme ile) |
| [GetInstanceData](/docs/components/tasks/trigger) | `13` | Yalnızca instance **data**'sı |
| **GetInstance** | `19` | Tek instance'ın **tam projeksiyonu** (metadata + data) |

Aynı domain'deki sorgular **in-process** çalışır (HTTP/Dapr atlaması yoktur); farklı domain'e giden sorgular aynı REST endpoint'ini HTTP veya Dapr üzerinden çağırır. Her iki yol da script context'e birebir aynı yanıt şeklini sunar — mapping, instance'ın nerede olduğundan bağımsız tek şekilde yazılır.

## Görev Tanımı

> **Schema:** `task-definition.schema.json`

```json
{
  "key": "fetch-order-instance",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["data-fetch", "workflow-communication"],
  "attributes": {
    "type": "19",
    "config": {
      "domain": "sales",
      "flow": "order-workflow",
      "key": "ORDER-001",
      "extensions": []
    }
  }
}
```

## Konfigürasyon Alanları

| Alan                  | Tip      | Zorunlu | Varsayılan | Açıklama                                                    |
| --------------------- | -------- | ------- | ---------- | ----------------------------------------------------------- |
| `domain`              | string   | Evet    | -          | Hedef workflow domain'i                                     |
| `flow`                | string   | Evet    | -          | Hedef workflow adı                                          |
| `key`                 | string   | Hayır   | -          | Hedef instance'ın business key'i                            |
| `instanceId`          | string   | Hayır   | -          | Hedef instance ID'si (GUID formatında)                      |
| `extensions`          | string[] | Hayır   | -          | Zenginleştirme için dahil edilecek data extension'ları      |
| `useDapr`             | boolean  | Hayır   | false      | Doğrudan HTTP yerine Dapr servis çağrısı kullan             |
| `headers`             | object   | Hayır   | -          | HTTP header'ları                                            |
| `timeoutSeconds`      | integer  | Hayır   | 30         | Timeout süresi (saniye, minimum: 1)                         |
| `validateSsl`         | boolean  | Hayır   | true       | SSL sertifika doğrulaması                                   |
| `acceptedStatusCodes` | string[] | Hayır   | -          | Başarılı kabul edilecek hata kodları (`"403"`, `"4xx"` vb.) |

> **Not:** Hedef instance `key` veya `instanceId` ile belirtilir. Bu değerler çoğunlukla statik konfigürasyon yerine input mapping içinde dinamik olarak atanır.

## Property Erişimi

| Property        | Setter Metodu                                     | Açıklama                          |
| --------------- | ------------------------------------------------- | --------------------------------- |
| `TriggerDomain` | `SetDomain(string domain)`                        | Hedef domain                      |
| `TriggerFlow`   | `SetFlow(string flow)`                            | Hedef flow                        |
| `Key`           | `SetKey(string? key)`                             | Hedef instance business key'i     |
| `InstanceId`    | `SetInstanceId(string? instanceId)`               | Hedef instance ID'si              |
| `Extensions`    | `SetExtensions(List<string>? extensions)`         | Data extension listesi            |
| `Headers`       | `SetHeaders(Dictionary<string, string?> headers)` | Tüm header'lar                    |
| -               | `AddHeader(string key, string? value)`            | Tekil header ekle                 |
| -               | `RemoveHeader(string key)`                        | Tekil header kaldır               |
| `UseDapr`       | `SetUseDapr(bool useDapr)`                        | Dapr service invocation           |
| `ValidateSSL`   | `SetValidateSSL(bool validateSSL)`                | SSL doğrulama                     |

Input mapping örneği:

```csharp
public class FetchOrderInstanceMapping : ScriptBase, IMapping
{
    public Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
    {
        var getInstanceTask = task as GetInstanceTask;
        getInstanceTask.SetDomain("sales");
        getInstanceTask.SetFlow("order-workflow");
        getInstanceTask.SetKey(context.Instance.Data.orderKey);
        return Task.FromResult(new ScriptResponse());
    }

    public Task<ScriptResponse> OutputHandler(ScriptContext context)
    {
        var order = context.Body?.data;
        return Task.FromResult(new ScriptResponse { Data = new { order } });
    }
}
```

## Standart Yanıt

```json
{
  "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "key": "ORDER-001",
  "flow": "order-workflow",
  "domain": "sales",
  "status": "A",
  "currentState": "active",
  "createdAt": "2026-07-15T09:30:00Z",
  "modifiedAt": "2026-07-20T14:05:00Z",
  "data": {
    "orderId": "ORDER-001",
    "status": "pending",
    "amount": 1500
  },
  "extensions": {}
}
```

### Yanıt Alanları

| Alan            | Açıklama                                        |
| --------------- | ----------------------------------------------- |
| `id`            | Instance ID'si                                  |
| `key`           | Instance business key'i                         |
| `flow`/`domain` | Instance'ın ait olduğu workflow ve domain       |
| `status`        | Instance durumu                                 |
| `currentState`  | Instance'ın bulunduğu state                     |
| `createdAt` / `modifiedAt` | Oluşturma / son değişiklik zamanı    |
| `data`          | Instance veri nesnesi                           |
| `extensions`    | Extension verileri (istendiyse)                 |

## İlgili Sayfalar

- [GetInstances Task](/docs/components/tasks/get-instances) — sayfalama ve filtreleme ile instance listesi
- [Trigger Task Ailesi](/docs/components/tasks/trigger) — StartFlow, TriggerTransition, GetInstanceData, SubProcess
- [Cache-Aside Task](/docs/components/tasks/cache-aside) — GetInstance'ı `sourceTask` olarak kullanarak instance projeksiyonunu cache'lemek için
- [Instance Filtreleme Kılavuzu](/docs/how-to/instance-filtering)
