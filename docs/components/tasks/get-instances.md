---
sidebar_position: 7
title: Get Instances Task
description: Diğer workflow'lardan instance listesi çekme task'ı
---

# GetInstances Task

GetInstances Task, sayfalama, sıralama ve filtreleme desteğiyle diğer workflow'lardan instance verilerini çekmeyi sağlar. Workflow'lar arası veri sorguları ve toplu görünümler oluşturmak için kullanılır.

## Görev Tanımı

> **Schema:** `task-definition.schema.json`

```json
{
  "key": "fetch-customer-orders",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["data-fetch", "workflow-communication", "pagination"],
  "attributes": {
    "type": "15",
    "config": {
      "domain": "sales",
      "flow": "order-workflow",
      "page": 1,
      "pageSize": 10,
      "sort": "-CreatedAt",
      "filter": ["{\"status\":{\"eq\":\"active\"}}"]
    }
  }
}
```

## Konfigürasyon Alanları


| Alan                  | Tip      | Zorunlu | Varsayılan | Açıklama                                                    |
| --------------------- | -------- | ------- | ---------- | ----------------------------------------------------------- |
| `domain`              | string   | Evet    | -          | Hedef workflow domain'i                                     |
| `flow`                | string   | Evet    | -          | Hedef workflow adı                                          |
| `page`                | integer  | Hayır   | 1          | Sayfa numarası (1 tabanlı)                                  |
| `pageSize`            | integer  | Hayır   | 10         | Sayfa başına öğe sayısı                                     |
| `sort`                | string   | Hayır   | -          | Sıralama alanı ve yönü (örn: `-CreatedAt`)                  |
| `filter`              | string[] | Hayır   | -          | Filtre ifadeleri                                            |
| `useDapr`             | boolean  | Hayır   | false      | Doğrudan HTTP yerine Dapr servis çağrısı kullan             |
| `headers`             | object   | Hayır   | -          | HTTP header'ları                                            |
| `timeoutSeconds`      | integer  | Hayır   | 30         | Timeout süresi (saniye, minimum: 1)                         |
| `validateSsl`         | boolean  | Hayır   | true       | SSL sertifika doğrulaması                                   |
| `acceptedStatusCodes` | string[] | Hayır   | -          | Başarılı kabul edilecek hata kodları (`"403"`, `"4xx"` vb.) |


### Sort Parametresi


| Format       | Açıklama        | Örnek        |
| ------------ | --------------- | ------------ |
| `FieldName`  | Artan sıralama  | `CreatedAt`  |
| `-FieldName` | Azalan sıralama | `-CreatedAt` |


Yaygın sıralama alanları: `CreatedAt`, `UpdatedAt`, `Key`

### Filter Parametresi

`filter` parametresi [Instance Filtreleme Kılavuzu](/docs/how-to/instance-filtering) ile uyumludur:

```json
{
  "filter": ["{\"and\":[{\"status\":{\"eq\":\"Active\"}},{\"attributes.amount\":{\"gt\":\"1000\"}}]}"]
}
```

## Property Erişimi


| Property        | Setter Metodu                                     | Açıklama                               |
| --------------- | ------------------------------------------------- | -------------------------------------- |
| `TriggerDomain` | `SetDomain(string domain)`                        | Hedef domain                           |
| `TriggerFlow`   | `SetFlow(string flow)`                            | Hedef flow                             |
| `Page`          | `SetPage(int page)`                               | Sayfa numarası                         |
| `PageSize`      | `SetPageSize(int pageSize)`                       | Sayfa boyutu                           |
| `Sort`          | `SetSort(string? sort)`                           | Sıralama                               |
| `Filter`        | `SetFilter(string? filter)`                       | Filtre (string)                        |
| `Filter`        | `SetFilter(object? filter)`                       | Filtre (object, JSON serialize edilir) |
| -               | `SetFilterSpec(InstanceQuerySpec spec)`           | Fluent `InstanceQuery` spec'i (önerilen) |
| `Headers`       | `SetHeaders(Dictionary<string, string?> headers)` | Tüm header'lar                         |
| -               | `AddHeader(string key, string? value)`            | Tekil header ekle                      |
| -               | `RemoveHeader(string key)`                        | Tekil header kaldır                    |
| `UseDapr`       | `SetUseDapr(bool useDapr)`                        | Dapr service invocation                |
| `ValidateSSL`   | `SetValidateSSL(bool validateSSL)`                | SSL doğrulama                          |

### Fluent Filtreleme: SetFilterSpec

Yeni kodda önerilen yol, filter/sort JSON'ını elle yazmak yerine fluent `InstanceQuery` builder'ını kullanıp spec'i task'a vermektir. Aynı domain'e giden sorgular **in-process** çalışır (HTTP/Dapr atlaması olmaz); cross-domain sorgular otomatik yönlendirilir:

```csharp
var query = InstanceQuery.Create()
    .OrGroup(
        q => q.Where("currentState", f => f.Eq("active")),
        q => q.Where("currentState", f => f.Eq("in-review")))
    .Where("status", f => f.Eq("A"))
    .OrderBy("attributes.dueDate");

getInstancesTask.SetFilterSpec(query.Build());
```

- `SetFilterSpec`, task'ın `Filter`/`Sort` string'lerini spec'ten üretir; lokal ve remote çalıştırma birebir aynı değerleri taşır.
- Sonradan yapılan bir `SetFilter(...)` / `SetSort(...)` çağrısı spec'i geçersiz kılar ve temizler.
- Operatörler, `OrGroup`/`Not`, `GroupBy` ve aggregation'ların tam referansı: [Fluent InstanceQuery Builder](/docs/how-to/instance-filtering#fluent-instancequery-builder).

## Standart Yanıt

```json
{
  "links": {
    "self": "/api/v1/core/workflows/order-workflow/instances?page=1&pageSize=10",
    "first": "/api/v1/core/workflows/order-workflow/instances?page=1&pageSize=10",
    "next": "/api/v1/core/workflows/order-workflow/instances?page=2&pageSize=10",
    "prev": ""
  },
  "items": [
    {
      "data": {
        "orderId": "ORDER-001",
        "status": "pending",
        "amount": 1500
      },
      "etag": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      "extensions": {}
    },
    {
      "data": {
        "orderId": "ORDER-002",
        "status": "active",
        "amount": 2300
      },
      "etag": "01ARZ3NDEKTSV4RRFFQ69G5FAW",
      "extensions": {}
    }
  ]
}
```

### Yanıt Alanları


| Alan                 | Açıklama                                 |
| -------------------- | ---------------------------------------- |
| `links.self`         | Mevcut sayfa URL'i                       |
| `links.first`        | İlk sayfa URL'i                          |
| `links.next`         | Sonraki sayfa URL'i (son sayfadaysa boş) |
| `links.prev`         | Önceki sayfa URL'i (ilk sayfadaysa boş)  |
| `items`              | Instance verileri dizisi                 |
| `items[].data`       | Instance veri nesnesi                    |
| `items[].etag`       | Eşzamanlılık kontrolü için ETag          |
| `items[].extensions` | Extension verileri (varsa)               |


