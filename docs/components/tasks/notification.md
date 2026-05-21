---
sidebar_position: 8
title: Notification Task
description: Çok kanallı bildirim gönderme task'ı — Dapr binding tabanlı multi-channel dispatch
---

# Notification Task (Type: `10`)

Notification Task, iş akışı içinde birden fazla kanal üzerinden (SMS, e-posta, push, state vb.) eş zamanlı bildirim göndermeyi sağlayan görev türüdür. Her kanal bir Dapr output binding component'ine eşlenir ve bildirim içeriği mapping scripti ile şekillendirilir.

## Görev Tanımı

```json
{
  "key": "notify-status-change",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["notify", "state"],
  "attributes": {
    "type": "10",
    "config": {
      "channels": ["sms", "email"],
      "includeStateChannel": true
    }
  }
}
```

## Konfigürasyon Alanları

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `type` | string | Evet | — | `"10"` (Notification Task tipi) |
| `channels` | string[] | Hayır | `[]` | Hedef kanal listesi: `"sms"`, `"email"`, `"push"`, `"hub"` vb. |
| `includeStateChannel` | boolean | Hayır | `true` | `true` ise platform yönetimli `state` kanalı otomatik olarak listeye eklenir |

:::info
`channels` listesinde `"state"` açıkça belirtilebilir veya `includeStateChannel: true` ile otomatik eklenebilir. Her iki durumda da `state` kanalı yalnızca bir kez dispatch edilir.
:::

## Kanal Eşleme

Her kanal adı convention-based olarak bir Dapr binding component'ine eşlenir:

```
kanal adı  →  Dapr binding component adı
─────────────────────────────────────────
sms        →  vnext-notification-sms
email      →  vnext-notification-email
push       →  vnext-notification-push
hub        →  vnext-notification-hub
state      →  vnext-notification-state
```

Eşleme formatı:

```
{BindingPrefix}-{channel}
```

Varsayılan prefix `vnext-notification` olup `appsettings.json` üzerinden değiştirilebilir.

Configuration:
```json
{
  "Dapr": {
    "Notification":  {
      "BindingPrefix": "vnext-notification",
      "DefaultOperation": "create",
      "TimeoutSeconds": 30
    }
  }
}
```

## Kanal Tipleri

| Tip | Mesaj Kaynağı | Mapping Gerekli mi? |
|-----|---------------|---------------------|
| `sms`, `email`, `push`, `hub` ve diğerleri | `INotificationMapping` scripti | Evet |
| `state` | Platform (State Function çıktısı) | Hayır (opsiyonel metadata zenginleştirme) |

## State Kanalı

`state` kanalı diğer kanallardan farklı davranır ve platformca yönetilir:

- **Veri**: State Function çıktısı otomatik olarak alınır ve CloudEvent zarfına sarılır.
- **Metadata**: Platform varsayılan olarak `instanceId` ve `state` header'larını ekler.
- **Zenginleştirme**: `IStateNotificationMapping` implement edilmişse, script ile ek metadata (örn. `X-Device-Id`) eklenebilir.

:::tip
State kanalı yalnızca platform tarafından üretilen bildirimler içindir. Harici bir kanala ihtiyaç duymadan sadece state bildirimi göndermek isterseniz `channels` dizisini boş bırakıp `includeStateChannel: true` ayarlayın:

```json
{
  "key": "notify-state-only",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["notify", "state"],
  "attributes": {
    "type": "10",
    "config": {
      "channels": [],
      "includeStateChannel": true
    }
  }
}
```

Bu durumda `INotificationMapping` scripti gerekmez.
:::

### Varsayılan State Metadata

| Header | Değer |
|--------|-------|
| `instanceId` | Instance GUID |
| `state` | Mevcut state adı |
| `Content-Type` | `application/json` |

## Dapr Binding Kurulumu

Her kanal için bir Dapr HTTP output binding component'i oluşturulmalıdır.

```yaml title="vnext-notification-sms.yaml"
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vnext-notification-sms
spec:
  type: bindings.http
  version: v1
  metadata:
    - name: url
      value: http://sms-gateway:8080/api/send
```

```yaml title="vnext-notification-email.yaml"
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vnext-notification-email
spec:
  type: bindings.http
  version: v1
  metadata:
    - name: url
      value: http://email-service:8080/api/send
```

```yaml title="vnext-notification-state.yaml"
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vnext-notification-state
spec:
  type: bindings.http
  version: v1
  metadata:
    - name: url
      value: https://notification-hub.example.com/sendMessage/public
```

:::warning
Binding component adı `vnext-notification-{channel}` convention'ına uymalıdır. Farklı bir prefix kullanılıyorsa `appsettings.json` üzerinden yapılandırılmalıdır.
:::

## Koşullu Gönderim

`INotificationMapping.ChannelHandler` metodu `null` döndürerek ilgili kanalı atlayabilir. Bu sayede runtime'da koşullu bildirim mantığı kurulabilir — örneğin yalnızca tamamlanmış işlemler için SMS göndermek.

## Hata Yönetimi

- Her kanal **bağımsız olarak** dispatch edilir; bir kanalda oluşan hata diğerlerini engellemez.
- Kanal hataları loglanır ve task sonucunun metadata'sına eklenir.
- State channel build hatası durumunda `state` kanalı atlanır, diğer kanallar çalışmaya devam eder.

### Task Sonuç Metadata'sı

```json
{
  "dispatched": ["sms", "state"],
  "skipped": ["email"],
  "errors": ["push: Dapr sidecar not available"]
}
```

## İlgili Konular

- [Mappings — Notification mapping örnekleri](../mappings#notification-mapping)
- [Interfaces — INotificationMapping & IStateNotificationMapping](../interfaces#inotificationmapping)
- [Dapr Binding Task](./dapr-binding)
