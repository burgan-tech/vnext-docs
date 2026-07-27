---
sidebar_position: 6
title: Trigger Task
description: Workflow orchestration ve instance yönetim task'ları
---

# Trigger Task Türleri

İş akışı instance yönetimi için dört ayrı task türü mevcuttur. Her task türü, farklı bir iş akışı etkileşim senaryosunu destekler ve kendi type numarasına sahiptir.

## Task Türleri

Bu sayfada belgelenen dört trigger task'ı (bağlantılar aynı sayfadaki ilgili bölüme gider):

- [**StartTask** (Type: `11`)](#1-starttask-type-11) - Yeni iş akışı instance'ları başlatır
- [**DirectTriggerTask** (Type: `12`)](#2-directtriggertask-type-12) - Mevcut instance'larda transition tetikler
- [**GetInstanceDataTask** (Type: `13`)](#3-getinstancedatatask-type-13) - Instance verilerini alır
- [**SubProcessTask** (Type: `14`)](#4-subprocesstask-type-14) - Bağımsız subprocess instance'ları başlatır

Aynı ailenin sorgu tarafındaki üyeleri ayrı sayfalarda belgelenmiştir:

- [**GetInstances Task** (Type: `15`)](/docs/components/tasks/get-instances) - Filtre ile instance listesi
- [**GetInstance Task** (Type: `19`)](/docs/components/tasks/get-instance) - Tek instance'ın tam projeksiyonu (metadata + data)

---

## 1. StartTask (Type: `11`)

Yeni bir iş akışı instance'ı oluşturur.

### Görev Tanımı

> **Schema:** `task-definition.schema.json`

```json
{
  "key": "start-approval-workflow",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["workflow", "instance", "start"],
  "attributes": {
    "type": "11",
    "config": {
      "domain": "approvals",
      "flow": "approval-flow",
      "sync": true,
      "body": {
        "documentId": "doc-12345",
        "requestedBy": "user-123"
      }
    }
  }
}
```

### Konfigürasyon Alanları

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `domain` | string | Evet | - | Hedef iş akışı domain'i |
| `flow` | string | Evet | - | Hedef iş akışı flow adı |
| `body` | object | Hayır | - | İstekle gönderilecek veri |
| `sync` | boolean | Hayır | true | Senkron çalıştırma |
| `version` | string | Hayır | - | Hedef iş akışı versiyonu |
| `key` | string | Hayır | - | Hedef iş akışı key'i |
| `tags` | string[] | Hayır | - | Instance tag'leri |
| `headers` | object | Hayır | - | HTTP header'ları |
| `timeoutSeconds` | integer | Hayır | 30 | Timeout süresi (saniye) |
| `validateSsl` | boolean | Hayır | true | SSL sertifika doğrulaması |
| `acceptedStatusCodes` | string[] | Hayır | - | Başarılı kabul edilecek hata kodları (`"403"`, `"4xx"` vb.) |

### Property Erişimi

| Property | Setter Metodu | Açıklama |
|----------|---------------|----------|
| `TriggerDomain` | `SetDomain(string domain)` | Hedef domain |
| `TriggerFlow` | `SetFlow(string flow)` | Hedef flow adı |
| `Body` | `SetBody(dynamic body)` | İstek body'si |
| `TriggerSync` | `SetSync(bool sync)` | Senkron flag |
| `TriggerVersion` | `SetVersion(string? version)` | Hedef versiyon |
| `TriggerKey` | `SetKey(string key)` | Hedef key |
| `TriggerTags` | `SetTags(string[] tags)` | Tag'ler |
| `Headers` | `SetHeaders(Dictionary<string, string?> headers)` | Tüm header'lar |
| - | `AddHeader(string key, string? value)` | Tekil header ekle |
| - | `RemoveHeader(string key)` | Tekil header kaldır |
| `UseDapr` | `SetUseDapr(bool useDapr)` | Dapr service invocation kullan |
| `ValidateSSL` | `SetValidateSSL(bool validateSSL)` | SSL doğrulama |

### Başarılı Yanıt

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "A"
}
```

---

## 2. DirectTriggerTask (Type: `12`)

Mevcut bir iş akışı instance'ında belirli bir transition'ı yürütür.

### Görev Tanımı

> **Schema:** `task-definition.schema.json`

```json
{
  "key": "trigger-approval-action",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["transition", "trigger"],
  "attributes": {
    "type": "12",
    "config": {
      "domain": "approvals",
      "flow": "approval-flow",
      "transitionName": "approve",
      "instanceId": "550e8400-e29b-41d4-a716-446655440000",
      "body": {
        "approvedBy": "manager123",
        "approvalDate": "2024-01-15T10:30:00Z"
      }
    }
  }
}
```

### Konfigürasyon Alanları

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `domain` | string | Evet | - | Hedef iş akışı domain'i |
| `flow` | string | Evet | - | Hedef iş akışı flow adı |
| `transitionName` | string | Evet | - | Çalıştırılacak transition adı |
| `key` | string | Koşullu | - | Hedef instance key'i (`instanceId` yoksa kullanılır) |
| `instanceId` | string (uuid) | Koşullu | - | Hedef instance ID'si (öncelikli) |
| `body` | object | Hayır | - | İstekle gönderilecek veri |
| `sync` | boolean | Hayır | true | Senkron çalıştırma |
| `version` | string | Hayır | - | ~~Hedef versiyon~~ (Deprecated) |
| `tags` | string[] | Hayır | - | Instance tag'leri |
| `headers` | object | Hayır | - | HTTP header'ları |
| `timeoutSeconds` | integer | Hayır | 30 | Timeout süresi (saniye) |
| `validateSsl` | boolean | Hayır | true | SSL sertifika doğrulaması |
| `acceptedStatusCodes` | string[] | Hayır | - | Başarılı kabul edilecek hata kodları (`"403"`, `"4xx"` vb.) |

:::info
`instanceId` veya `key` alanlarından biri sağlanmalıdır. `instanceId` önceliklidir. İkisi de yoksa mevcut instance ID kullanılır.
:::

### Property Erişimi

| Property | Setter Metodu | Açıklama |
|----------|---------------|----------|
| `TriggerDomain` | `SetDomain(string domain)` | Hedef domain |
| `TriggerFlow` | `SetFlow(string flow)` | Hedef flow adı |
| `TransitionName` | `SetTransitionName(string transitionName)` | Transition adı |
| `TriggerInstanceId` | `SetInstance(string? instanceId)` | Hedef instance ID |
| `TriggerKey` | `SetKey(string? key)` | Hedef instance key |
| `Body` | `SetBody(dynamic body)` | İstek body'si |
| `TriggerSync` | `SetSync(bool sync)` | Senkron flag |
| `TriggerTags` | `SetTags(string[] tags)` | Tag'ler |
| `Headers` | `SetHeaders(Dictionary<string, string?> headers)` | Tüm header'lar |
| - | `AddHeader(string key, string? value)` | Tekil header ekle |
| - | `RemoveHeader(string key)` | Tekil header kaldır |
| `UseDapr` | `SetUseDapr(bool useDapr)` | Dapr service invocation kullan |
| `ValidateSSL` | `SetValidateSSL(bool validateSSL)` | SSL doğrulama |

### Başarılı Yanıt

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "A"
}
```

---

## 3. GetInstanceDataTask (Type: `13`)

Başka bir iş akışı instance'ından veri alır. Opsiyonel extension desteği vardır.

### Görev Tanımı

> **Schema:** `task-definition.schema.json`

```json
{
  "key": "get-user-profile-data",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["instance", "data", "fetch"],
  "attributes": {
    "type": "13",
    "config": {
      "domain": "users",
      "flow": "user-profile",
      "instanceId": "660e8400-e29b-41d4-a716-446655440001",
      "extensions": ["profile", "preferences"]
    }
  }
}
```

### Konfigürasyon Alanları

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `domain` | string | Evet | - | Hedef iş akışı domain'i |
| `flow` | string | Evet | - | Hedef iş akışı flow adı |
| `key` | string | Koşullu | - | Hedef instance key'i (`instanceId` yoksa kullanılır) |
| `instanceId` | string (uuid) | Koşullu | - | Hedef instance ID'si (öncelikli) |
| `extensions` | string[] | Hayır | - | Alınacak extension'lar |
| `headers` | object | Hayır | - | HTTP header'ları |
| `timeoutSeconds` | integer | Hayır | 30 | Timeout süresi (saniye) |
| `validateSsl` | boolean | Hayır | true | SSL sertifika doğrulaması |
| `acceptedStatusCodes` | string[] | Hayır | - | Başarılı kabul edilecek hata kodları (`"403"`, `"4xx"` vb.) |

:::info
`instanceId` veya `key` alanlarından biri sağlanmalıdır. `instanceId` önceliklidir. İkisi de yoksa mevcut instance ID kullanılır.
:::

### Property Erişimi

| Property | Setter Metodu | Açıklama |
|----------|---------------|----------|
| `TriggerDomain` | `SetDomain(string domain)` | Hedef domain |
| `TriggerFlow` | `SetFlow(string flow)` | Hedef flow adı |
| `TriggerInstanceId` | `SetInstance(string? instanceId)` | Hedef instance ID (GUID ise `TriggerInstanceId`'ye, değilse `TriggerKey`'e atanır) |
| `TriggerKey` | `SetKey(string? key)` | Hedef instance key |
| `Extensions` | `SetExtensions(string[] extensions)` | Extension listesi |
| `Headers` | `SetHeaders(Dictionary<string, string?> headers)` | Tüm header'lar |
| - | `AddHeader(string key, string? value)` | Tekil header ekle |
| - | `RemoveHeader(string key)` | Tekil header kaldır |
| `UseDapr` | `SetUseDapr(bool useDapr)` | Dapr service invocation kullan |
| `ValidateSSL` | `SetValidateSSL(bool validateSSL)` | SSL doğrulama |

### Başarılı Yanıt

```json
{
  "isSuccess": true,
  "data": {
    "userId": "user123",
    "profile": {
      "name": "John Doe",
      "email": "john.doe@example.com"
    },
    "preferences": {
      "language": "tr-TR",
      "theme": "dark"
    }
  }
}
```

---

## 4. SubProcessTask (Type: `14`)

Ana iş akışı ile paralel çalışan bağımsız bir subprocess instance'ı başlatır.

### Görev Tanımı

> **Schema:** `task-definition.schema.json`

```json
{
  "key": "start-audit-subprocess",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["subprocess", "audit"],
  "attributes": {
    "type": "14",
    "config": {
      "domain": "audit",
      "flow": "transaction-audit",
      "key": "txn-audit-001",
      "version": "1.0.0",
      "sync": false,
      "body": {
        "transactionId": "txn-12345",
        "userId": "user-123"
      }
    }
  }
}
```

### Konfigürasyon Alanları

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `domain` | string | Evet | - | Hedef iş akışı domain'i |
| `flow` | string | Evet | - | Hedef iş akışı flow adı |
| `body` | object | Hayır | - | İstekle gönderilecek veri |
| `sync` | boolean | Hayır | false | `sync` query parametresine pass-through |
| `version` | string | Hayır | - | SubFlow versiyonu |
| `key` | string | Hayır | - | Hedef iş akışı key'i |
| `tags` | string[] | Hayır | - | Instance tag'leri |
| `headers` | object | Hayır | - | HTTP header'ları |
| `timeoutSeconds` | integer | Hayır | 30 | Timeout süresi (saniye) |
| `validateSsl` | boolean | Hayır | true | SSL sertifika doğrulaması |
| `acceptedStatusCodes` | string[] | Hayır | - | Başarılı kabul edilecek hata kodları (`"403"`, `"4xx"` vb.) |

### Property Erişimi

| Property | Setter Metodu | Açıklama |
|----------|---------------|----------|
| `TriggerDomain` | `SetDomain(string domain)` | Hedef domain |
| `TriggerFlow` | `SetFlow(string flow)` | Hedef flow adı |
| `Body` | `SetBody(dynamic body)` | İstek body'si |
| `TriggerSync` | `SetSync(bool sync)` | Sync flag |
| `TriggerVersion` | `SetVersion(string version)` | SubFlow versiyonu |
| `TriggerKey` | `SetKey(string? key)` | Hedef key |
| `TriggerTags` | `SetTags(string[] tags)` | Tag'ler |
| `Headers` | `SetHeaders(Dictionary<string, string?> headers)` | Tüm header'lar |
| - | `AddHeader(string key, string? value)` | Tekil header ekle |
| - | `RemoveHeader(string key)` | Tekil header kaldır |
| `UseDapr` | `SetUseDapr(bool useDapr)` | Dapr service invocation kullan |
| `ValidateSSL` | `SetValidateSSL(bool validateSSL)` | SSL doğrulama |

:::tip[SubProcess vs StartTask]

- **SubProcess**: Fire-and-forget, bağımsız çalışır, ana iş akışını bloke etmez (`sync` varsayılanı `false`)
- **StartTask**: Senkron çalışır, yanıt döner, gelecekte etkileşim için `instanceId` alınabilir (`sync` varsayılanı `true`)

:::

---

## Hata Senaryoları

Tüm trigger task'ları aşağıdaki hata yanıtlarını döndürebilir:

### İş Akışı Bulunamadı

```json
{
  "IsSuccess": false,
  "ErrorMessage": "'approvals' domain'inde 'approval-flow' iş akışı bulunamadı",
  "Metadata": {
    "ErrorCode": "WORKFLOW_NOT_FOUND"
  }
}
```

### Instance Bulunamadı

```json
{
  "IsSuccess": false,
  "ErrorMessage": "'550e8400-e29b-41d4-a716-446655440000' instance'ı bulunamadı",
  "Metadata": {
    "ErrorCode": "INSTANCE_NOT_FOUND"
  }
}
```

### Transition Kullanılamıyor

```json
{
  "IsSuccess": false,
  "ErrorMessage": "'approve' transition'ı mevcut state'te kullanılamıyor",
  "Metadata": {
    "ErrorCode": "TRANSITION_NOT_AVAILABLE",
    "CurrentState": "draft"
  }
}
```

## Konfigürasyon vs Dinamik Ayarlama

Task'lar için gerekli alanlar iki şekilde sağlanabilir:

1. **Statik Konfigürasyon**: Task JSON tanımında `config` bölümünde belirtilir
2. **Dinamik Ayarlama**: Mapping'deki InputHandler içinde setter metodları ile runtime'da ayarlanır

**Öncelik Kuralı:** Hem JSON config'te hem de InputHandler'da aynı alan tanımlanmışsa, **InputHandler'da set edilen değer önceliğe sahiptir**.
