---
sidebar_position: 12
title: Dapr Binding Task
description: Dapr binding component'leri ile harici sistem entegrasyonu
---

# Dapr Binding Task (Type: `2`)

Dapr Binding Task, Dapr output binding'leri kullanarak harici sistemlerle entegrasyon sağlayan görev türüdür. Veritabanları, mesaj kuyrukları, blob storage ve diğer harici kaynaklar ile etkileşim kurmak için kullanılır.

## Görev Tanımı

> **Schema:** `task-definition.schema.json`

```json
{
  "key": "send-to-queue",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["dapr", "binding", "queue"],
  "attributes": {
    "type": "2",
    "config": {
      "bindingName": "order-queue",
      "operation": "create",
      "metadata": {
        "ttlInSeconds": "60",
        "priority": "high"
      },
      "data": {
        "orderId": "ORD-12345",
        "status": "pending"
      }
    }
  }
}
```

## Konfigürasyon Alanları

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `bindingName` | string | Evet | - | Dapr binding component adı |
| `operation` | string | Evet | - | Binding operasyonu (component'e bağlı: `create`, `get`, `delete`, `list` vb.) |
| `metadata` | object | Hayır | - | Binding metadata'sı (TTL, priority vb.) |
| `data` | object | Hayır | - | Binding'e gönderilecek veri |

## Dapr Binding Component Örnekleri

### Azure Blob Storage

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: blob-storage
spec:
  type: bindings.azure.blobstorage
  version: v1
  metadata:
  - name: storageAccount
    value: "mystorageaccount"
  - name: container
    value: "my-container"
  - name: storageAccessKey
    secretKeyRef:
      name: storage-secret
      key: accessKey
```

### RabbitMQ Queue

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-queue
spec:
  type: bindings.rabbitmq
  version: v1
  metadata:
  - name: queueName
    value: "orders"
  - name: host
    value: "amqp://rabbitmq:5672"
  - name: durable
    value: "true"
```

### AWS S3

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: s3-storage
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
  - name: bucket
    value: "my-bucket"
  - name: region
    value: "us-east-1"
```

## Property Erişimi

`DaprBindingTask` sınıfındaki property'ler:

| Property | Erişim | Açıklama |
|----------|--------|----------|
| `BindingName` | Read-only | Binding component adı |
| `Operation` | Read-only | Binding operasyonu |
| `Metadata` | Read-only | Binding metadata |
| `Data` | Read-only | Binding verisi |
