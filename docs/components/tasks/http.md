---
sidebar_position: 2
title: HTTP Task
description: HTTP istekleri ile REST API çağrısı yapan task
---

# HTTP Task (Type: `6`)

HTTP Task, harici web servislerine HTTP istekleri göndermek için kullanılan görev türüdür. Bu görev türü ile REST API'lere, web servislerine ve diğer HTTP endpoint'lerine çağrı yapabilirsiniz.

## Görev Tanımı

> **Schema:** `task-definition.schema.json`

```json
{
  "key": "get-user-info",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["users", "lookup", "information"],
  "attributes": {
    "type": "6",
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

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `url` | string | Evet | - | Hedef URL |
| `method` | string | Evet | - | HTTP metodu (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`) |
| `headers` | object | Hayır | null | HTTP header'ları |
| `body` | object | Hayır | null | Request body (GET dışında) |
| `timeoutSeconds` | integer | Hayır | 30 | İstek timeout süresi (saniye, minimum: 1) |
| `validateSsl` | boolean | Hayır | true | SSL sertifika doğrulaması |
| `acceptedStatusCodes` | string[] | Hayır | - | Başarılı kabul edilecek HTTP hata kodları. Exact kod (`"403"`, `"404"`) ve wildcard pattern (`"4xx"`, `"40x"`, `"5xx"`) destekler. Eşleşen status code'larda task başarılı sayılır ve ErrorBoundary tetiklenmez. |

## Property Erişimi

`HttpTask` sınıfındaki property'ler ve setter metodları:

| Property | Setter Metodu | Açıklama |
|----------|---------------|----------|
| `Url` | `SetUrl(string url)` | Hedef URL'i değiştirir |
| `Method` | Doğrudan atama | HTTP metodunu değiştirir |
| `Headers` | `SetHeaders(Dictionary<string, string?> headers)` | Tüm header'ları set eder |
| - | `AddHeader(string key, string? value)` | Tekil header ekler/günceller |
| - | `RemoveHeader(string key)` | Tekil header kaldırır |
| `Body` | `SetBody(dynamic body)` | Request body'yi set eder |
| `TimeoutSeconds` | Read-only | Tanım dosyasında ayarlanır |
| `ValidateSSL` | Read-only | Tanım dosyasında ayarlanır |
| `AcceptedStatusCodes` | Read-only | Tanım dosyasında ayarlanır |

## Standart Yanıt

```json
{
  "Data": { },
  "StatusCode": 200,
  "IsSuccess": true,
  "ErrorMessage": null,
  "Headers": {
    "content-type": "application/json",
    "content-length": "156"
  },
  "Metadata": {
    "Url": "https://api.example.com/users",
    "Method": "POST",
    "ReasonPhrase": "OK"
  },
  "ExecutionDurationMs": 245,
  "TaskType": "Http"
}
```

### Başarılı Yanıt
- `IsSuccess`: true
- `StatusCode`: 2xx HTTP status kodu
- `Data`: Deserialize edilmiş response verisi
- `Headers`: Response header'ları
- `ExecutionDurationMs`: İstek süresi

### Hatalı Yanıt
- `IsSuccess`: false
- `StatusCode`: HTTP hata kodu (4xx, 5xx)
- `ErrorMessage`: Hata açıklaması
- `Metadata`: Ek hata bilgileri

## Hata Senaryoları

### HTTP Hatası (4xx, 5xx)

```json
{
  "IsSuccess": false,
  "StatusCode": 404,
  "ErrorMessage": "HTTP request failed with status 404: Not Found",
  "Metadata": {
    "Url": "https://api.example.com/users/999",
    "Method": "GET",
    "ReasonPhrase": "Not Found",
    "ResponseContent": "{\"error\": \"User not found\"}"
  }
}
```

### Network Hatası

```json
{
  "IsSuccess": false,
  "ErrorMessage": "The remote name could not be resolved: 'invalid-domain.com'",
  "Metadata": {
    "Url": "https://invalid-domain.com/api",
    "Method": "POST"
  }
}
```

### Timeout Hatası

```json
{
  "IsSuccess": false,
  "ErrorMessage": "HTTP request was cancelled",
  "Metadata": {
    "Url": "https://slow-api.com/endpoint",
    "Method": "GET",
    "Cancelled": true
  }
}
```

## Sık Karşılaşılan Sorunlar

| Problem | Çözüm |
|---------|-------|
| SSL Certificate Error | `validateSsl: false` ayarlayın (sadece development için) |
| Timeout | `timeoutSeconds` değerini artırın |
| 401 Unauthorized | Authorization header'ını kontrol edin |
| JSON Parse Error | Response content-type ve formatını kontrol edin |
