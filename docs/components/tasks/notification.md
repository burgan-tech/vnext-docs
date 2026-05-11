---
sidebar_position: 8
title: Notification Task
description: Bildirim gönderme task'ı
---

# Notification Task (Type: `10`)

Notification Task, çeşitli kanallar (SignalR, MQTT, Kafka, HTTP webhook vb.) üzerinden bildirim göndermeyi sağlayan görev türüdür. Dapr binding altyapısını kullanarak hedef notification hub/socket'e mesaj iletir.

## Görev Tanımı

> **Schema:** `task-definition.schema.json`

```json
{
  "key": "notify-status-change",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["notification", "realtime"],
  "attributes": {
    "type": "10",
    "config": {
      "metadata": {
        "componentName": "notification-http-binding",
        "topic": "workflow-updates"
      }
    }
  }
}
```

## Konfigürasyon Alanları

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `metadata` | object | Evet | - | Bildirim gönderim metadata'sı (component adı, topic, header'lar vb.) |

## Property Erişimi

`NotificationTask` sınıfındaki property'ler ve setter metodları:

| Property | Setter Metodu | Açıklama |
|----------|---------------|----------|
| `Body` | `SetBody(object? body)` | Bildirim mesaj içeriği/payload |
| `Subject` | `SetSubject(string? subject)` | Bildirim başlığı |
| `To` | `SetTo(string[]? to)` | Alıcı listesi (user ID, email, topic adı vb.) |
| `To` | `SetTo(string? to)` | Tekil alıcı |
| `Metadata` | Read-only | Tanım dosyasındaki `config.metadata`'dan okunur |

:::info
`Body`, `Subject` ve `To` property'leri mapping tarafından runtime'da set edilir. `Metadata` ise task tanımından statik olarak gelir.
:::

## Dapr Binding Kurulumu

Notification Task'ın çalışabilmesi için Dapr HTTP binding component'i yapılandırılmalıdır.

### 1. Dapr Binding Component

`notification-http-binding.yaml`:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: notification-http-binding
spec:
  type: bindings.http
  version: v1
  metadata:
  - name: url
    value: "http://your-notification-hub:port/api/notifications"
  - name: method
    value: "POST"
  - name: headers
    value: "Content-Type: application/json"
```

### 2. Execution API Konfigürasyonu

`appsettings.json`:

```json
{
  "Dapr": {
    "NotificationBinding": {
      "Name": "notification-http-binding"
    }
  }
}
```
