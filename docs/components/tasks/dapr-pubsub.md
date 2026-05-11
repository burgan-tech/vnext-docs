---
sidebar_position: 10
title: Dapr Pub/Sub Task
description: Dapr pub/sub mesajlaşması ile event-driven flow
---

# Dapr PubSub Task (Type: `4`)

Dapr PubSub Task, Dapr publish/subscribe özelliği kullanarak event-driven messaging yapısı için kullanılan görev türüdür. Asenkron mesajlaşma ve loose coupling sağlar.

## Görev Tanımı

> **Schema:** `task-definition.schema.json`

```json
{
  "key": "publish-user-event",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["pubsub", "messaging", "event"],
  "attributes": {
    "type": "4",
    "config": {
      "pubSubName": "messagebus",
      "topic": "user-events",
      "data": {
        "eventType": "UserRegistered",
        "userId": "user-123"
      },
      "metadata": {
        "priority": "high",
        "source": "user-service"
      }
    }
  }
}
```

## Konfigürasyon Alanları

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `pubSubName` | string | Evet | - | PubSub component adı |
| `topic` | string | Evet | - | Mesajın gönderileceği topic |
| `data` | object | Hayır | - | Mesaj içeriği |
| `metadata` | object | Hayır | - | Mesaj metadata'sı |

## Property Erişimi

| Property | Setter Metodu | Açıklama |
|----------|---------------|----------|
| `PubSubName` | `SetPubSubName(string pubSubName)` | PubSub component adı |
| `Topic` | `SetTopic(string topic)` | Hedef topic |
| `Data` | `SetData(dynamic data)` | Mesaj verisi |
| `Metadata` | `SetMetadata(Dictionary<string, string?> metadata)` | Mesaj metadata'sı |

## Desteklenen Message Broker'lar

### Redis Streams

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: redis-pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
```

### Apache Kafka

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: kafka-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka:9092"
```

### RabbitMQ

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rabbitmq-pubsub
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
  - name: host
    value: "amqp://rabbitmq:5672"
  - name: durable
    value: "true"
```

### Azure Service Bus

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: servicebus-pubsub
spec:
  type: pubsub.azure.servicebus
  version: v1
  metadata:
  - name: connectionString
    secretKeyRef:
      name: servicebus-secret
      key: connectionString
```

## Standart Yanıt

```json
{
  "data": {
    "Published": true,
    "Message": "Event published successfully"
  },
  "isSuccess": true,
  "errorMessage": null,
  "metadata": {
    "PubSubName": "messagebus",
    "Topic": "user-events"
  },
  "executionDurationMs": 45,
  "taskType": "DaprPubSub"
}
```

## Sık Karşılaşılan Sorunlar

| Problem | Çözüm |
|---------|-------|
| PubSub component not found | PubSub component configuration ve app ID'yi kontrol edin |
| Topic configuration error | Topic name ve pubsub component uyumunu kontrol edin |
| Message serialization failed | `SetData` metoduna valid object geçtiğinizden emin olun |
| Metadata format error | `SetMetadata` metoduna `Dictionary<string, string?>` formatında data gönderin |
