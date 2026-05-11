---
sidebar_position: 1
title: Tasks Genel Bakış
description: vNext task türleri, re-usable yapısı ve görev referans mekanizması
---

# Task (Görev) Belgesi

Görevler (Tasks), iş akışı çalışma zamanında belirli işlemleri gerçekleştiren **bağımsız ve yeniden kullanılabilir** bileşenlerdir. Her görev kendi özel amacına göre farklı türlerde tanımlanabilir ve iş akışının farklı noktalarında çalıştırılabilir.

:::tip[Re-usable Yapı]
Görevler bağımsız bir iş akışı olarak saklanır. Kullanılacakları noktaya **referans** olarak tanımlanırlar.
Her bir etki alanı dağıtımında `sys-tasks` adında bir flow oluşur. Domain içerisinde kullanılan tüm görevler bu flow'da birer kayıt örneğidir.

**Input ve output mapping'leri task tanımının parçası değildir.** Mapping'ler, görevin kullanıldığı yapıda (transition, state entry/exit, function vb.) ayrıca belirtilir.
:::

## Task Tanım Şablonu

Her task tanımı `task-definition.schema.json` şemasına uyar. Zorunlu alanlar:

> **Schema:** `task-definition.schema.json`

```json
{
  "key": "task-key-name",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["tag1", "tag2"],
  "attributes": {
    "type": "6",
    "config": {
      // task türüne göre değişir
    }
  }
}
```

### Üst Düzey Alanlar

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `key` | string | Evet | Task tanımlayıcı anahtarı (`^[a-z0-9-]+$` pattern) |
| `version` | string | Evet | Versiyon (Major.Minor.Patch formatı) |
| `domain` | string | Evet | Domain tanımlayıcısı |
| `flow` | string | Evet | Her zaman `sys-tasks` |
| `flowVersion` | string | Evet | Flow versiyonu |
| `tags` | string[] | Evet | Task etiketleri (en az 1) |
| `attributes.type` | string | Evet | Task türü numarası |
| `attributes.config` | object | Evet | Task türüne göre konfigürasyon |

## Görev Türleri

`task-definition.schema.json` toplamda **15 task türü** tanımlar:

| # | Görev Türü | Açıklama | Detay |
|---|---|---|---|
| 1 | **DaprHttpEndpoint** | Dapr HTTP endpoint çağrısı | [DaprHttpEndpoint](./dapr-http-endpoint) |
| 2 | **DaprBinding** | Dapr binding (input/output) | [DaprBinding](./dapr-binding) |
| 3 | **DaprService** | Dapr service invocation çağrıları | [DaprService](./dapr-service) |
| 4 | **DaprPubSub** | Dapr pub/sub mesajlaşma | [DaprPubSub](./dapr-pubsub) |
| 5 | **HumanTask** | İnsan müdahalesi gerektiren görev | *(detay belgesi sonraki phase'de)* |
| 6 | **HttpTask** | HTTP web servis çağrıları | [HTTP](./http) |
| 7 | **ScriptTask** | C# Roslyn script çalıştırma | [Script](./script) |
| 8 | **ConditionTask** | Koşullu mantık ve branch kararı | *(detay belgesi sonraki phase'de)* |
| 9 | **TimerTask** | Zamanlayıcı görevi | *(detay belgesi sonraki phase'de)* |
| 10 | **NotificationTask** | Bildirim gönderme | [Notification](./notification) |
| 11 | **StartFlowTask** | Yeni instance başlatma | [Trigger](./trigger) |
| 12 | **TriggerTransitionTask** | Mevcut instance üzerinde transition tetikleme | [Trigger](./trigger) |
| 13 | **GetInstanceDataTask** | Tek bir instance'ın verisini çekme | [Trigger](./trigger) |
| 14 | **SubProcessTask** | SubProcess çalıştırma | [Trigger](./trigger) |
| 15 | **GetInstancesTask** | Filtre ile birden fazla instance çekme | [GetInstances](./get-instances) |

## Görev Kullanımı

Görevler diğer modüller tarafından referans verilerek kullanılır. Her görev kullanımında `order` ve `task` referansı tanımlanır.

### Örnek Görev Referansı

```json
"onExecutionTasks": [
  {
    "order": 1,
    "task": {
      "key": "invalidate-cache",
      "domain": "core",
      "flow": "sys-tasks",
      "version": "1.0.0"
    }
  }
]
```

### Çalıştırma Sırası
- `order` değerleri kendi aralarında gruplanır
- Aynı sırada olanlar **paralel** çalıştırılır
- Farklı sıradakiler **sıralı** çalıştırılır

### Veri Yönetimi
- Task'ların çalışma sonucunda output data'sı varsa master data'yı patch version olarak yükseltir

### Görev Çalıştırma Noktaları

**İş akışı içinde:**
- `Transition.OnExecutionTasks`: Geçiş tetiklendiğinde çalışır
- `State.OnEntries`: Bir aşamaya ilk girişte çalışır
- `State.OnExits`: Bir aşamadan ilk çıkışta çalışır

**İş akışı dışında:**
- `Functions.OnExecutionTasks`: Platform servisleri içinde çalışır
- `Extensions.OnExecutionTasks`: İş akışı kayıt örneği görevleri
