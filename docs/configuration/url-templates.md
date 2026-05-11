---
sidebar_position: 1
title: URL Templates
description: Gateway Base URL ve Hateoas link şablonları yapılandırması
---

# UrlTemplates Yapılandırması

vNext platformu bir API gateway arkasında deploy ederken, Hateoas tarzı response linkleri için özel URL şablonları yapılandırabilirsiniz. Bu, API response'larında dönen instance URL'lerinin gateway yönlendirme yapılandırmanızla eşleşmesini sağlar.

## Yapılandırma

`appsettings.json` dosyanıza `UrlTemplates` bölümünü ekleyin:

```json
{
  "UrlTemplates": {
    "Start": "/api/{0}/workflows/{1}/instances/start",
    "Transition": "/api/{0}/workflows/{1}/instances/{2}/transitions/{3}",
    "FunctionList": "/api/{0}/workflows/{1}/functions/{2}",
    "InstanceList": "/api/{0}/workflows/{1}/instances",
    "Instance": "/api/{0}/workflows/{1}/instances/{2}",
    "InstanceHistory": "/api/{0}/workflows/{1}/instances/{2}/transitions",
    "Data": "/api/{0}/workflows/{1}/instances/{2}/functions/data",
    "View": "/api/{0}/workflows/{1}/instances/{2}/functions/view",
    "Schema": "/api/{0}/workflows/{1}/instances/{2}/functions/schema?transitionKey={3}"
  }
}
```

## Şablon Parametreleri

Her şablon, çalışma zamanında değiştirilen konumsal parametreler kullanır:

| Parametre | Açıklama | Örnek |
|-----------|----------|-------|
| `{0}` | Domain | `ecommerce` |
| `{1}` | Workflow/Flow adı | `payment-processing` |
| `{2}` | Instance ID | `18075ad5-e5b2-4437-b884-21d733339113` |
| `{3}` | Transition key veya bağlama özgü parametre | `approve`, `reject` |

## Şablon Açıklamaları

| Şablon | Amaç | Oluşturulan URL Örneği |
|--------|------|------------------------|
| **Start** | Yeni instance başlatma endpoint'i | `/api/ecommerce/workflows/payment-processing/instances/start` |
| **Transition** | Instance üzerinde transition tetikleme | `/api/ecommerce/workflows/payment-processing/instances/abc-123/transitions/approve` |
| **FunctionList** | HATEOAS fonksiyon keşfi şablonu (+: key ile `GET .../workflows/{workflow}/functions/{function}` **kaldırıldı**—**InstanceList** ve instance kapsamlı **Data** / **View** / **State** kullanın) | `/api/ecommerce/workflows/payment-processing/functions/view` |
| **InstanceList** | Workflow instance'larını listeleme | `/api/ecommerce/workflows/payment-processing/instances` |
| **Instance** | Belirli bir instance getirme | `/api/ecommerce/workflows/payment-processing/instances/abc-123` |
| **InstanceHistory** | Instance transition geçmişi | `/api/ecommerce/workflows/payment-processing/instances/abc-123/transitions` |
| **Data** | Instance verisi getirme | `/api/ecommerce/workflows/payment-processing/instances/abc-123/functions/data` |
| **View** | Instance görünümü getirme | `/api/ecommerce/workflows/payment-processing/instances/abc-123/functions/view` |
| **Schema** | Transition şeması getirme | `/api/ecommerce/workflows/payment-processing/instances/abc-123/functions/schema?transitionKey=approve` |

## Kullanım Senaryoları

**Senaryo 1: Path Prefix'li Gateway**

Gateway'iniz vNext API'yi belirli bir path üzerinden yönlendiriyorsa:

```json
{
  "UrlTemplates": {
    "Start": "/vnext-api/v1/{0}/workflows/{1}/instances/start",
    "Instance": "/vnext-api/v1/{0}/workflows/{1}/instances/{2}"
  }
}
```

**Senaryo 2: Farklı Domain Yapısı**

Gateway'iniz route'ları farklı organize ediyorsa:

```json
{
  "UrlTemplates": {
    "Start": "/domains/{0}/flows/{1}/start",
    "Transition": "/domains/{0}/flows/{1}/instances/{2}/execute/{3}"
  }
}
```

**Senaryo 3: Subdomain Tabanlı Yönlendirme**

Domain'ler gateway seviyesinde subdomain'lere eşleniyorsa:

```json
{
  "UrlTemplates": {
    "Start": "/api/workflows/{1}/instances/start",
    "Instance": "/api/workflows/{1}/instances/{2}"
  }
}
```

> **Not:** Gateway'iniz domain yönlendirmesini subdomain'ler üzerinden yapıyorsa, domain parametresi (`{0}`) şablonlardan çıkarılabilir.

## Faydaları

- **Çapraz Domain Yönlendirme**: Tek bir gateway arkasında birden fazla domain desteği
- **İstemci Basitliği**: İstemciler URL manipülasyonu yapmadan Hateoas linklerini takip edebilir
- **Gateway Esnekliği**: Herhangi bir gateway yönlendirme yapılandırmasına uyum
- **API Versiyonlama**: Hateoas kullanan istemcileri bozmadan URL yapısı değişiklikleri

## Varsayılan Davranış

`UrlTemplates` yapılandırılmazsa, platform standart vNext API yapısıyla eşleşen varsayılan şablonları kullanır:

```
/api/{domain}/workflows/{workflow}/instances/...
```
