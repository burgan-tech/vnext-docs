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

<sup>New</sup> v0.0.102 — Input mapping çağrı başına şekli task üzerinde ayarlayabilir: `SetOperation(…)`, `SetData(…)` ve `SetMetadata(…)`. Tanım `operation`/`data`'yı sabitlemiyorsa veya her çağrıda farklı bir nesne adlandırılacaksa (ör. bir `x-storage` dosyasının nesne anahtarı) bunları kullanın:

```csharp
public Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
{
    var binding = task as DaprBindingTask;
    var handle = context.Instance.Data.identityDocument;          // kalıcı x-storage handle'ı
    binding.SetOperation("delete");
    binding.SetMetadata(new() { ["key"] = FileObjectKey((string)handle.file) });   // bindings.aws.s3; bindings.localstorage için "fileName"
    return Task.FromResult(new ScriptResponse());
}
```

`FileObjectKey(file)`, `FileStorage:KeyPrefix` + file id'yi döner (GUID olmayan değer reddedilir); bkz. [Mappings](/docs/components/mappings).

## Yanıt (output mapping)

<sup>New</sup> v0.0.102 — Task'ın yanıtı binding'in cevabını output mapping'e taşır (önceden yanıtta veri yoktu, yalnızca `BindingName`/`Operation` metadata'sı vardı):

| Alan | İçerik |
|------|--------|
| `Data` | Binding gövdesi: ayrıştırılabiliyorsa JSON (ör. `list`), değilse metin, değilse base64 (ikili bir nesnenin `get`'i) |
| `Metadata["DataEncoding"]` | `Data`'nın biçimi: `json` \| `text` \| `base64` \| `none` |
| `Headers` | Binding'in yanıt metadata'sı |

Başarısız bir çağrı, genel Dapr client mesajı yerine sidecar'ın gerekçesini taşır (ör. `couldn't find output binding …`). Output mapping'i olmayan bir binding task'ı instance verisine yine hiçbir şey eklemez.

## Local mod

Binding task'ları varsayılan olarak Execution servisinde çalışır (Remote). <sup>New</sup> v0.0.102 — `Workflow:TaskInvocation:Modes:daprbinding = Local` ile task orchestration sidecar'ından, Orchestration host'un içinde çalışır (`LocalDaprBindingTaskInvoker`; Remote yolla aynı çekirdek). Bu ayar gönderilen yapılandırmada **yoktur**: yalnızca Execution app-id'sine scope'lu binding bileşenleri Local'de bulunamaz. Bileşenleri orchestration app-id'sine scope'lu olan `x-storage` depolarındaki nesneleri okuyan, listeleyen veya silen akışlar Local modu açmalı ya da bileşeni Execution app-id'sine de scope'lamalıdır. Bkz. [Task Çalıştırma Yönlendirmesi](/docs/configuration/task-invocation) ve [Dosya Alanları](/docs/how-to/file-fields).

