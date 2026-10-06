---
sidebar_position: 11
title: Dapr HTTP Endpoint Task
description: Dapr HTTP Endpoint component üzerinden harici servis çağrısı
---

# Dapr HTTP Endpoint Task (Type: `1`)

Dapr HTTP Endpoint Task, Dapr'ın HTTPEndpoint component'i üzerinden harici servislere HTTP çağrısı yapmak için kullanılan görev türüdür. HTTPEndpoint component'inde tanımlanan `baseUrl`'e `path` eklenerek istek gönderilir.

## Görev Tanımı

> **Schema:** `task-definition.schema.json`

```json
{
  "key": "call-external-api",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["dapr", "http-endpoint", "external"],
  "attributes": {
    "type": "1",
    "config": {
      "endpointName": "external-payment-api",
      "path": "/api/v1/payments/process",
      "method": "POST",
      "body": {
        "amount": 1500,
        "currency": "TRY"
      }
    }
  }
}
```

## Konfigürasyon Alanları

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `endpointName` | string | Evet | - | Dapr HTTPEndpoint component adı |
| `path` | string | Evet | - | `baseUrl`'e eklenecek path |
| `method` | string | Evet | `GET` | HTTP metodu (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`) |
| `body` | object | Hayır | null | Request body |

## Dapr HTTPEndpoint Component

Task'ın çalışması için Dapr'da bir HTTPEndpoint component tanımlı olmalıdır:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: external-payment-api
spec:
  type: httpendpoints
  version: v1
  metadata:
  - name: baseUrl
    value: "https://payment.example.com"
```

## Property Erişimi

`DaprHttpEndpointTask` sınıfındaki property'ler:

| Property | Erişim | Açıklama |
|----------|--------|----------|
| `EndpointName` | Read-only | HTTPEndpoint component adı |
| `Path` | Read-only | Endpoint path |
| `Method` | Read-only | HTTP metodu (varsayılan: `GET`) |
| `Body` | Read-only | Request body |

:::info[Header iletimi — v0.0.99]
- **`X-Request-Id`** artık reserved değildir (**fill-if-absent**): mapping'de / `headers`'ta verilen boş olmayan değer olduğu gibi gönderilir; yoksa vNext'in kendi request id'si iletilir. Çağrı başına benzersiz UUID isteyen API'ler için mapping'de `Guid.NewGuid()` ile üretin.
- **Credential başlıkları** `sub`, `act_sub`, `position`, `client_id`, `role` mapping'de verilmemiş ya da boşsa çağıranın isteğinden iletilir; mapping'deki dolu değer kazanır. 1024 karakteri aşan ya da kontrol karakteri içeren değerler ve morph-idm'in çözdüğü roller iletilmez.

Ayrıntı: [Gözlemlenebilirlik → reserved header'lar](/docs/how-to/observability).
:::
