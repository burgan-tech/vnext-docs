---
sidebar_position: 1
title: URL Templates
description: Gateway Base URL ve Hateoas link şablonları yapılandırması
---

# UrlTemplates Yapılandırması

vNext platformunu bir API gateway arkasında deploy ederken, HATEOAS tarzı response linklerinin (state fonksiyonundaki `href`'ler, transition/function/catalog linkleri vb.) gateway yönlendirme yapılandırmanızla eşleşmesi gerekir. v0.0.79 itibarıyla bu, endpoint başına şablon yazmak yerine **tek bir `BasePath`** ayarıyla yapılır.

## Yapılandırma

`appsettings.json` dosyanıza `UrlTemplates` bölümünü ekleyin:

```json
{
  "UrlTemplates": {
    "BasePath": "/api/v1"
  }
}
```

- Path'in altındaki bölüm (`/{domain}/workflows/…`) uygulamanın kendi controller route'ları tarafından sabitlenmiştir; deployment'a göre değişen tek şey **öndeki prefix**'tir. `BasePath` tam olarak bunu bildirir.
- Bölüm **tamamen atlanırsa** varsayılan `/api/v1` kullanılır — uygulamanın kendi servis ettiği prefix. Standart deployment'ta hiçbir `UrlTemplates` yapılandırması gerekmez.
- Baş/son slash normalize edilir (`api/v1/` ≡ `/api/v1`). **Boş string**, prefix'siz href üretir (root'a mount edilmiş host).

```json
// Monitor host örneği
{ "UrlTemplates": { "BasePath": "/api/v1/monitor" } }

// Gateway /api/{domain}/… servis ediyorsa
{ "UrlTemplates": { "BasePath": "/api" } }
```

## Çözümleme Kuralı

Her endpoint'in etkin şablonu şu şekilde hesaplanır:

```
Effective(X) = override(X) ?? Normalize(BasePath) + BuiltInRelative(X)
```

- `BuiltInRelative(X)` — uygulamanın kendi route şekli (ör. `/{0}/workflows/{1}/instances/{2}/transitions/{3}`).
- `override(X)` — isteğe bağlı, endpoint başına tam şablon. Tanımlıysa **verbatim (olduğu gibi)** kullanılır; `BasePath` **öne eklenmez**. Bu sayede önceki tüm-şablonlar-listeli stilde yazılmış herhangi bir değer — `UrlTemplates__Transition` gibi ortam değişkeni override'ları dahil — değişmeden çalışmaya devam eder.

```json
// Endpoint-bazlı override (nadiren gerekir) — tam yol olarak yazılır
{
  "UrlTemplates": {
    "BasePath": "/api/v1",
    "Transition": "/domains/{0}/flows/{1}/instances/{2}/execute/{3}"
  }
}
```

### Şablon Parametreleri

Override şablonları çalışma zamanında değiştirilen konumsal parametreler kullanır:

| Parametre | Açıklama | Örnek |
|-----------|----------|-------|
| `{0}` | Domain | `ecommerce` |
| `{1}` | Workflow/Flow adı | `payment-processing` |
| `{2}` | Instance ID | `18075ad5-e5b2-4437-b884-21d733339113` |
| `{3}` | Transition key veya bağlama özgü parametre | `approve`, `reject` |

## Kullanım Senaryoları

**Senaryo 1: Path prefix'li gateway** — gateway vNext API'yi belirli bir path üzerinden yönlendiriyorsa tek satır yeterlidir:

```json
{ "UrlTemplates": { "BasePath": "/vnext-api/v1" } }
```

**Senaryo 2: Route yapısı farklı gateway** — path'in prefix'ten sonrası da farklıysa ilgili endpoint'ler tek tek override edilir (verbatim):

```json
{
  "UrlTemplates": {
    "BasePath": "/api/v1",
    "Start": "/domains/{0}/flows/{1}/start",
    "Transition": "/domains/{0}/flows/{1}/instances/{2}/execute/{3}"
  }
}
```

**Senaryo 3: Root'a mount edilmiş host** — prefix'siz href için boş `BasePath`:

```json
{ "UrlTemplates": { "BasePath": "" } }
```

## Faydaları

- **Tek ayar**: 19 endpoint şablonunun host başına kopyalanması yerine bir satır; yeni eklenen bir endpoint şablonu `BasePath`'i **yapısal olarak** devralır — konfigürasyonda unutulduğu için prefix'siz href üretme hatası artık mümkün değildir.
- **Çapraz Domain Yönlendirme**: Tek bir gateway arkasında birden fazla domain desteği.
- **İstemci Basitliği**: İstemciler URL manipülasyonu yapmadan HATEOAS linklerini takip edebilir.
- **Gateway Esnekliği**: Override'lar herhangi bir gateway yönlendirme yapısına uyum sağlar.

## Kapsam

`UrlTemplates` yalnızca **client'a dönen href'leri** etkiler. Servisler arası (internal) çağrıların kullandığı `InstanceUrlTemplates` bu yapılandırmanın kapsamı dışındadır ve versiyonunu `vNextApi:ApiVersion` ayarından alır.

:::warning v0.0.79 davranış değişikliği
Orchestration host önceden `/api/{domain}/…` şablonlarıyla geliyordu — route'ların gerektirdiği `v1` segmenti eksikti ve üretilen href'ler uygulamanın kendisinin 404 verdiği bir yolu gösteriyordu. v0.0.79'da bölüm kaldırıldı ve href'ler `/api/v1/…` üretir. Gateway'iniz gerçekten `/api/{domain}/…` servis ediyorsa `"BasePath": "/api"` ayarlayın. Bkz. [Breaking Changes: v0.0.79](/blog/breaking-changes/breaking-changes-v0-0-79).
:::
