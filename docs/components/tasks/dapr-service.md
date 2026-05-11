---
sidebar_position: 9
title: Dapr Service Task
description: Dapr service invocation ile inter-service iletişim
---

# Dapr Service Task (Type: `3`)

Dapr Service Task, Dapr service invocation özelliği kullanarak mikroservislere çağrı yapmak için kullanılan görev türüdür. Doğrudan Dapr SDK üzerinden service invocation API'sini kullanır.

## Görev Tanımı

> **Schema:** `task-definition.schema.json`

```json
{
  "key": "invoke-user-service",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["service", "invocation", "user"],
  "attributes": {
    "type": "3",
    "config": {
      "appId": "user-service",
      "methodName": "GetUserProfile",
      "httpVerb": "GET",
      "body": {
        "userId": "user-123"
      },
      "headers": {
        "Content-Type": "application/json"
      },
      "queryString": "version=v1&include=profile",
      "timeoutSeconds": 30
    }
  }
}
```

## Konfigürasyon Alanları

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `appId` | string | Evet | - | Hedef service app ID |
| `methodName` | string | Evet | - | Çağrılacak method/endpoint |
| `httpVerb` | string | Hayır | - | HTTP metodu (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`) |
| `body` | object | Hayır | null | Request data |
| `headers` | object | Hayır | null | HTTP header'ları |
| `queryString` | string | Hayır | null | Query string parametreleri |
| `timeoutSeconds` | integer | Hayır | 30 | İstek timeout süresi (saniye, minimum: 1) |
| `acceptedStatusCodes` | string[] | Hayır | - | Başarılı kabul edilecek HTTP hata kodları. Exact kod (`"403"`, `"404"`) ve wildcard pattern (`"4xx"`, `"40x"`) destekler. |

## Property Erişimi

| Property | Setter Metodu | Açıklama |
|----------|---------------|----------|
| `AppId` | `SetAppId(string appId)` | Hedef service app ID |
| `MethodName` | `SetMethodName(string methodName)` | Çağrılacak method |
| `HttpVerb` | Read-only | Tanım dosyasında ayarlanır |
| `Body` | `SetBody(dynamic body)` | Request body |
| `Headers` | `SetHeaders(Dictionary<string, string?> headers)` | Tüm header'ları set eder |
| - | `AddHeader(string key, string? value)` | Tekil header ekler/günceller |
| - | `RemoveHeader(string key)` | Tekil header kaldırır |
| `QueryString` | `SetQueryString(string? queryString)` | Query string |
| `TimeoutSeconds` | Read-only | Tanım dosyasında ayarlanır |
| `AcceptedStatusCodes` | Read-only | Tanım dosyasında ayarlanır |

## Standart Yanıt

```json
{
  "data": {
    "profile": {
      "userId": "123",
      "name": "John Doe",
      "email": "john@example.com"
    }
  },
  "isSuccess": true,
  "errorMessage": null,
  "metadata": {
    "appId": "user-service",
    "methodName": "GetUserProfile",
    "httpVerb": "GET"
  },
  "executionDurationMs": 120,
  "taskType": "DaprServiceTask"
}
```

## Sık Karşılaşılan Sorunlar

| Problem | Çözüm |
|---------|-------|
| Service not found | App ID ve service discovery configuration'ını kontrol edin |
| Method not allowed | HTTP verb ve method name uyumunu kontrol edin |
| Circuit breaker open | Downstream service health'ini kontrol edin |
| Authentication failed | Token ve RBAC policies'i doğrulayın |
