---
sidebar_position: 3
title: Caching
description: Component, State Function ve Instance Function cache yapılandırması — L1/L2 katmanları, generation memo, TTL'ler
---

# Caching Yapılandırması

vNext üç bağımsız cache katmanı çalıştırır: **ComponentCache** (workflow/task/schema/function/view/extension/mapping tanımları), **InstanceFunctionCache** (data/view/schema gibi built-in function yanıtları) ve **StateFunctionCache** (state fonksiyonu long-poll yanıtları). Üçü de Orchestration host'ta yapılandırılır.

## ComponentCache

Tanım bileşenleri için iki katmanlı önbellek: paylaşımlı (L2, Redis) ve process-içi (L1) envelope cache. L1, aynı Redis anahtarlarını kullanır ve **generation token**'a göre otomatik geçersizleşir — publish, bileşenin token'ını bump eder ve bu, o bileşene ait tüm eski çözümlemeleri (L1 dahil) anında erişilemez kılar.

```json
{
  "ComponentCache": {
    "L1Enabled": true,
    "L1SizeLimitMb": 64,
    "GenerationMemoSeconds": 5,
    "FullVersionTtlSeconds": 1800,
    "GenerationTtlSeconds": 3600,
    "ResolutionTtlSeconds": 3600,
    "NegativeTtlSeconds": 30,
    "PurgeLegacyKeysOnPublish": true
  }
}
```

| Anahtar | Tip | Varsayılan | Açıklama |
|---------|-----|------------|----------|
| `L1Enabled` | boolean | `true` | Process-içi envelope cache'i (dağıtılmış cache'in önünde) açar/kapatır. Kapatılırsa her erişim bir L2 okumasına düşer |
| `L1SizeLimitMb` | integer | `64` | L1'in bellek bütçesi (MB); tüm component tipleri arasında paylaşılır. Bütçe aşıldığında LRU tahliyesi yapılır (hata değil, L2'den yeniden okuma) |
| `GenerationMemoSeconds` | integer | `5` | Generation token'ının process içinde memoize edildiği süre (0–60 aralığı; `0` = kapalı). Aşağıdaki "Generation memo penceresi" bölümüne bakın |
| `FullVersionTtlSeconds` | integer | `1800` | Immutable full-version body'lerin TTL'i — yalnızca bellek sınırı, içerik hiç değişmediği için tazelik etkisi yoktur |
| `GenerationTtlSeconds` | integer | `3600` | Generation token'ının TTL'i — bir publish'in token yazımı başarısız olursa son çare yenileme mekanizması |
| `ResolutionTtlSeconds` | integer | `3600` | Sürüm çözümleme (`latest`, `1`, `1.2`) girdilerinin TTL'i — doğruluk değil, çöp toplama; generation bump zaten eski girdileri erişilemez kılar |
| `NegativeTtlSeconds` | integer | `30` | "Eşleşen sürüm yok" negatif yanıtlarının TTL'i — kısa tutulur ki yeni bir publish hemen görünür olsun |
| `PurgeLegacyKeysOnPublish` | boolean | `true` | Publish sırasında eski (`:latest`, `:artifact:{version}`) anahtar düzeninin de temizlenmesini sağlar — rolling deployment sırasında eski build'i çalıştıran pod'ların artık okumadığı anahtarlar |

**L1**, generation-anahtarlı in-process envelope cache'idir; publish'te token bump ile bayat girişler erişilemez hale gelir — ayrı bir invalidation protokolü yoktur.

### Generation memo penceresi

`GenerationMemoSeconds`, her sürüm çözümlemesinde gereken tek kalan uzak okumayı (generation token) process içinde N saniye boyunca memoize eder. Bunun bedeli, publish eden pod dışındaki pod'ların **≤N saniye** boyunca eski generation'ı sunabilmesidir:

| Yüzey | Davranış |
|-------|----------|
| Publish eden pod | **Anında taze** — bump işlemi kendi memo'sunu önce siler |
| Diğer pod'lar | Bump'tan sonra ≤N saniye eski generation'ı sunabilir |
| Pinned full version'lar (`1.0.0-pkg.*`) | Etkilenmez — immutable body, generation'a bağlı değil |
| Çalışan instance'lar | Etkilenmez — kendi `FlowVersion`'larına pinlenmiştir |

**CI/CD kuralı**: son publish çağrısından sonra `N + margin` (1–2 sn) kadar bekleyin, ardından smoke test / trafik geçişi / "release live" ilanı yapın. Rollback runbook'unda da aynı pencere geçerlidir — geri alınan bir sürüm diğer pod'larda ≤N saniye daha sunulabilir. `GenerationMemoSeconds: 0` anlık cluster-wide görünürlük sağlar (eski davranış).

Manuel geçersizleştirme için:

```http
POST /api/v1/utilities/invalidate
```

## InstanceFunctionCache

Built-in data/view/schema function'larının yanıtlarını caché'ler.

```json
{
  "InstanceFunctionCache": {
    "DefaultTtlSeconds": 60
  }
}
```

| Anahtar | Tip | Varsayılan | Açıklama |
|---------|-----|------------|----------|
| `DefaultTtlSeconds` | integer | `60` | Built-in function yanıtlarının varsayılan TTL'i |

Flow tanımı, kendi built-in function'ları için bu değeri override edebilir:

```json
{
  "attributes": {
    "config": {
      "functionCache": { "ttlSeconds": 120 }
    }
  }
}
```

Ayrıntı için bkz. [Workflow Bileşeni](../components/workflow).

## StateFunctionCache

State fonksiyonunun (long-poll) yanıtlarını caché'ler.

```json
{
  "StateFunctionCache": {
    "Enabled": true,
    "TtlSeconds": 60,
    "ActiveSubflowTtlMilliseconds": 500
  }
}
```

| Anahtar | Tip | Varsayılan | Açıklama |
|---------|-----|------------|----------|
| `Enabled` | boolean | `true` | Kill-switch — `false` her istekte tam değerlendirme yapar |
| `TtlSeconds` | integer | `60` | Cache girişinin TTL'i; client long-poll timeout'u ile aynı değerde tutulur |
| `ActiveSubflowTtlMilliseconds` | integer | `500` | Aktif bir SubFlow korelasyonu olan parent instance'ların poll yanıtları için kısa pencereli snapshot cache — parent-only fingerprint ETag ile doğrulanır, bir subflow değişikliği anında geçersizleştirir |

Aktif subflow'lu bir parent'ta poll, hem 304 fast-path'i hem de normal cache'i bypass ederdi (her poll'de tam parent yükü + canlı subflow gezinmesi). `ActiveSubflowTtlMilliseconds` bu pencerede kısa süreli bir snapshot tutar; aynı pencerede 304 artık mümkündür.

## İlgili

- [Workflow Bileşeni](../components/workflow) — flow-level `functionCache` override'ı
- [Service Discovery](./service-discovery) — Discovery registry cache (ayrı bir cache katmanı, bu sayfanın kapsamı dışında)
