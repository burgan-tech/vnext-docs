---
sidebar_position: 2
title: Service Discovery
description: Cross-domain endpoint çözümleme — http/dapr provider, registry, cache ve troubleshooting
---

# Service Discovery Yapılandırması

Service Discovery, bir domain adının çağrılabilir bir endpoint'e nasıl dönüştüğünü ve domain'in registry'e nasıl kayıt olduğunu kontrol eder. Tek kök: `ServiceDiscovery`.

```json
{
  "ServiceDiscovery": {
    "Enabled": false,
    "BaseUrl": "http://localhost:3001/api/v1",
    "Domain": "discovery",
    "RegistryFlow": "domain-registration",
    "Provider": "http",
    "TimeoutSeconds": 5,
    "MaxRetryAttempts": 3,
    "RetryDelayMilliseconds": 1000,
    "CircuitBreakerFailureThreshold": 5,
    "CircuitBreakerTimeoutSeconds": 30,
    "DiscoveryEndpointTemplate": "/discovery/functions/domain-lookup?key={0}",
    "ValidateSsl": true,
    "Dapr": {
      "NamespaceTemplate": "",
      "PreferRegistryAppId": true,
      "RequireRegistryEntry": false,
      "CacheSeconds": 60,
      "DomainOverrides": {}
    },
    "Cache": {
      "Enabled": false,
      "L1Enabled": true,
      "L1TtlSeconds": 60,
      "TickIntervalSeconds": 60,
      "RefreshIntervalSeconds": 0,
      "L2TtlSeconds": 0,
      "WarmupLockLeaseSeconds": 30,
      "UnreachableEvictionCooldownSeconds": 30,
      "DomainListEndpointTemplate": "/{0}/functions/domain-list",
      "DomainListExpectedMax": 500
    }
  }
}
```

Yukarıdaki değerler **kod varsayılanlarıdır**; Orchestration host'un `appsettings.json`'ı `Cache.Enabled=true` ve `L1TtlSeconds=600` ile gelir (bkz. [Cache](#cache)).

## Alanlar

| Anahtar | Tip | Varsayılan | Açıklama |
|---------|-----|------------|----------|
| `Enabled` | boolean | `false` | Uygulama başlangıçta registry'e otomatik kayıt olur mu |
| `BaseUrl` | string | `""` | Registry'yi barındıran vNext instance'ının base URL'i |
| `Domain` | string | `""` | `domain-registration` workflow'unun tanımlı olduğu domain (genelde `discovery`) |
| `RegistryFlow` | string | `""` | Registry workflow adı |
| `Provider` | `http` \| `dapr` | `http` | Aşağıdaki "Provider" bölümüne bakın |
| `TimeoutSeconds` | integer | `5` | HTTP istek timeout'u — `Cache:Enabled=false` iken her cross-domain çözümlemenin önünde durur |
| `MaxRetryAttempts` | integer | `3` | Başarısız isteklerde yeniden deneme sayısı |
| `RetryDelayMilliseconds` | integer | `1000` | Denemeler arası gecikme |
| `CircuitBreakerFailureThreshold` | integer | `5` | Circuit'in açılması için ardışık hata sayısı |
| `CircuitBreakerTimeoutSeconds` | integer | `30` | Circuit'in açık kaldığı süre |
| `DiscoveryEndpointTemplate` | string | `/discovery/functions/domain-lookup?key={0}` | Tekil domain çözümleme endpoint şablonu (`{0}` = domain adı) |
| `ValidateSsl` | boolean | `true` | TLS sertifika doğrulaması |

## Provider

`Provider`, bir domain adının nasıl çağrılabilir bir endpoint'e dönüştüğünü — ve dolayısıyla çağrının hangi taşıma üzerinden gideceğini — seçer.

| Değer | Açıklama |
|-------|----------|
| `http` | **Varsayılan.** Registry'nin sağladığı `baseUrl` üzerinden düz HTTP. Eski davranışla **birebir** aynıdır |
| `dapr` | `vnext-{domain}-app[.{namespace}]` konvansiyonuyla türetilen Dapr app-id; çağrı `DaprClient.CreateInvokeHttpClient()` üzerinden yerel sidecar'a gider (Name Resolution + mTLS) |

Tanınmayan bir `Provider` değeri `http`'ye geriler — okunaksız bir provider adı prod trafiğini sessizce yeni bir transport'a taşıyamaz.

### dapr provider

```json
{
  "ServiceDiscovery": {
    "Provider": "dapr",
    "Dapr": {
      "NamespaceTemplate": "stage-vnext-{domain}",
      "PreferRegistryAppId": true,
      "RequireRegistryEntry": false,
      "DomainOverrides": { "legacy-domain": "url" }
    }
  }
}
```

| Anahtar | Tip | Varsayılan | Açıklama |
|---------|-----|------------|----------|
| `Dapr.NamespaceTemplate` | string | `""` | Cross-namespace app-id'yi (`{appId}.{namespace}`) oluşturmak için şablon; tek token `{domain}`. Boş = tek-namespace (app-id çıplak kullanılır). Helm chart, `global.dapr.crossNamespaceTemplate` boşsa release namespace'inden (`stage-vnext-core` → `stage-vnext-{domain}`) türetip `ServiceDiscovery__Dapr__NamespaceTemplate` olarak render eder |
| `Dapr.PreferRegistryAppId` | boolean | `true` | Registry'den gelen boş olmayan bir `appId`'nin konvansiyonu override etmesine izin verir. Yalnızca `RequireRegistryEntry=true` iken anlamlıdır |
| `Dapr.RequireRegistryEntry` | boolean | `false` | `false`: registry **hiç okunmaz** — çözümleme saf konvansiyon (+ `DomainOverrides`), ağ çağrısı yok, registry kesintisine bağışık. `true`: registry her çözümlemede okunur (`CacheSeconds` boyunca cache'lenir), kayıtsız bir domain `DomainEndpointNotFound` ile başarısız olur |
| `Dapr.CacheSeconds` | integer | `60` | `RequireRegistryEntry=true` iken pozitif sonuç cache ömrü (`0` = kapalı). Hatalar asla cache'lenmez |
| `Dapr.DomainOverrides` | object | `{}` | Domain adına göre override. Değer `"url"` ise o domain **`http` provider'a geri döner**; başka bir değer verilirse doğrudan hedef app-id olarak kullanılır — rollout/rollback dial'ı |

**Helm chart ile Dapr name resolution** <sup>New</sup> v0.0.95 — Cross-namespace çağrıların çalışması için çağıran sidecar'ın app-id'yi `{appId}.{namespace}` biçiminde çözmesi gerekir. Helm chart **≥ 1.0.117**, `global.dapr.nameResolution` değerlerinden (`component: "kubernetes"`, `version: "v1"`, `template: "{{.ID}}-dapr.{{.Namespace}}.svc.cluster.local:{{.Port}}"`) her pod'un seçtiği `appconfig` Dapr Configuration'ına `spec.nameResolution` bloğunu render eder ve orchestrator sidecar'ı için `vnext-cross-domain-resiliency` (varsayılan circuit breaker + mutasyonlarda **retry yok**) kaynağını üretir. `Provider=dapr` yine ortam başına açıkça ayarlanır; chart bunu değiştirmez. Ayrıntı: [Helm Chart](/docs/deployment/helm-chart).

**Sidecar `ERR_*` hataları** `remote_network_error`'a normalize edilir: sidecar hedefe ulaşamadığında `HTTP 500` + `{"errorCode":"ERR_DIRECT_INVOKE",…}` döner, `DaprRemoteTransport` bunu `HttpRequestException`'a çevirir, böylece error boundary'ler transport hatası olarak görmeye devam eder.

**Retry profilleri**: okuma çağrıları (instance/data/state/view/instance-correlation/list) retry edilir; mutasyonlar (`start`, subflow-forward, transitions, `sub/*`, busy, retry) **tek deneme** ile çağrılır — bu, `RemotePolicyFactory`'de yaşar çünkü Dapr resiliency hedefleri yalnızca app-id ve status code'a göre filtreler, mutasyon-tekilliğini ifade edemez.

## registry (kayıt / health)

`Enabled: true` iken uygulama başlangıçta registry'e (yukarıdaki `BaseUrl`/`Domain`/`RegistryFlow` ve retry/circuit-breaker alanlarıyla) kayıt olmaya çalışır; başarısız olursa uygulama **başlamaz** (fail-fast).

**Üretimde localhost yasağı:** production ortamında `BaseUrl` (ve `vNextApi:BaseUrl`) `localhost` / `127.0.0.1` / `::1` gösteremez — uygulama başlangıçta reddeder. Development'ta izinlidir.

## Cache

Cache, **yalnızca `http` provider'da** çalışır. `dapr` provider zaten registry'yi çağırmadığından (varsayılan `RequireRegistryEntry=false`) burada bir kazancı yoktur; kendi kısa ömürlü app-id cache'ini kullanır.

```json
{
  "ServiceDiscovery": {
    "Cache": {
      "Enabled": true,
      "L1Enabled": true,
      "L1TtlSeconds": 600,
      "TickIntervalSeconds": 60,
      "RefreshIntervalSeconds": 0,
      "L2TtlSeconds": 0,
      "WarmupLockLeaseSeconds": 30,
      "UnreachableEvictionCooldownSeconds": 30,
      "DomainListEndpointTemplate": "/{0}/functions/domain-list",
      "DomainListExpectedMax": 500
    }
  }
}
```

<sup>New</sup> v0.0.95 — Cache artık **olay güdümlü** (event-driven) geçersiz kılınır: girişlerin TTL'i yoktur (`L2TtlSeconds=0`), periyodik yenileme yoktur (`RefreshIntervalSeconds=0`); registry, bir deployment'ın sonunda çağrılan `POST /api/v1/definitions/publish/completed` ile yeniden okunur ve ulaşılamayan bir domain'in girişi hata güdümlü olarak düşürülür. Warm-up <sup>New</sup> v0.0.94 tek istekle registry'nin `GET {BaseUrl}/{Domain}/functions/domain-list` fonksiyonunu okur — bu, **vnext-discovery-runtime ≥ 0.0.7** gerektirir; sayfalı bulk okuma (`BulkPageSize`, `MaxPages`, `BulkEndpointTemplate`, `BulkFilter`, `AcceptedStatuses`) kaldırılmıştır.

| Anahtar | Tip | Varsayılan | Açıklama |
|---------|-----|------------|----------|
| `Enabled` | boolean | Kod: `false`; Orchestration host'ta: `true` | Tek rollback anahtarı. `false`: eski (cache'siz) davranış **birebir** geri gelir |
| `L1Enabled` | boolean | `true` | Process-içi katman |
| `L1TtlSeconds` | integer | Kod: `60`; Orchestration host'ta: `600` <sup>New</sup> v0.0.94 | L1 girişinin ömrü — bir geçersiz kılmanın **diğer pod'lara ulaşma süresi** (her invalidation paylaşılan L2'yi yazar, L1 kopyaları bu süre içinde temizlenir). `> 0` olmalı; periyodik modda `RefreshIntervalSeconds`'tan küçük olmalı |
| `TickIntervalSeconds` | integer | `60` | **Başarısız** bir warm-up'ın ne sıklıkla yeniden denendiği — yenileme hızı değil |
| `RefreshIntervalSeconds` | integer | `0` <sup>New</sup> v0.0.95 | `0` = periyodik yenileme yok, geçersiz kılma olay güdümlü. Pozitif değer eski periyodik pencereyi geri getirir |
| `L2TtlSeconds` | integer | `0` <sup>New</sup> v0.0.95 | `0` = girişler süresiz yaşar. Pozitif değer dead-man's switch'i geri getirir ve pozitif bir `RefreshIntervalSeconds` **gerektirir** (`RefreshIntervalSeconds + WarmupLockLeaseSeconds`'tan büyük olmalı) |
| `UnreachableEvictionCooldownSeconds` | integer | `30` <sup>New</sup> v0.0.95 | Ulaşılamayan bir domain'in girişinin düşürülmesinden sonra aynı domain için bekleme süresi; `0` = hata güdümlü düşürme kapalı |
| `WarmupLockLeaseSeconds` | integer | `30` | Warm-up lock'unun lease süresi — periyodik modda `RefreshIntervalSeconds`'tan küçük olmalı |
| `DomainListEndpointTemplate` | string | `/{0}/functions/domain-list` <sup>New</sup> v0.0.94 | Warm-up'ın okuduğu registry fonksiyonu; `{0}` = registry domain'i. Boş bırakılamaz |
| `DomainListExpectedMax` | integer | `500` <sup>New</sup> v0.0.94 | Registry fonksiyonunun kendi sayfa boyutu — bu sayıya ulaşılırsa listenin kesilmiş olabileceği uyarısı loglanır |

Bu invaryantlar startup'ta doğrulanır (`ServiceDiscoveryOptionsValidator`): `L2TtlSeconds > 0` iken `RefreshIntervalSeconds = 0` her modda reddedilir (yenilenmeyen bir süre sonu, her domain'in ilk çağıranını sonsuza dek canlı registry'ye düşürür); periyodik modda `L1TtlSeconds`, `TickIntervalSeconds` ve `WarmupLockLeaseSeconds` `RefreshIntervalSeconds`'tan küçük olmalıdır. Uygulama bu kurallara aykırı bir konfigürasyonla **başlamaz**.

**Katmanlar**: L1 (in-process) → L2 (dağıtılmış) → registry. `FetchedAtUtc` her girişe damgalanır; `L2TtlSeconds > 0` ise okumada kontrol edilir (dağıtılmış cache'in kendi TTL desteği olmayabilir, sessizce yoksayabilir).

**`baseUrl` değişince** (bir domain taşındığında) `wf sync` / `update` / `reset` (CLI ≥ 1.0.14) veya CD pipeline'ınız publish döngüsünün sonunda `publish/completed`'ı çağırır; elle tetiklemek için:

```bash
curl -X POST localhost:4201/api/v1/definitions/publish/completed \
  -H 'Content-Type: application/json' \
  -d '{"domain":"core","packageName":"@burgan-tech/vnext-core","version":"1.2.2"}'
```

Yanıt her zaman `200`; `hooks[0].outcome` `Refreshed`, `SkippedNotOwner` (başka bir replica okuyor — başarı), `Disabled` (`ServiceDiscovery:Enabled=false`, `Provider=dapr` veya `Cache:Enabled=false`) veya `Failed` (yeniden deneyin; `success: false`) döner. Eski `GET /api/v1/definitions/re-initialize` endpoint'i **kaldırılmıştır** (`404`). Ayrıntı: [REST API → publish/completed](/docs/api-reference/rest-api).

Operatör kısayolu olarak `POST /api/v1/utilities/discovery/refresh` (OpenAPI'de listelenmez) de aynı zorla yenilemeyi tetikler; yanıtı `{"outcome": "Refreshed" | "SkippedNotOwner" | "Failed" | "disabled"}`.

**Gözlemlenebilirlik**: `Discovery.Resolve/{domain}` span'i `vnext.discovery.provider` (`http`|`dapr`) ve `vnext.discovery.resolution` (`convention`|`registry`|`cache`) tag'lerini taşır.

## Sorun Giderme

1. **Registry endpoint doğrulama:**
   ```bash
   curl https://discovery.production.com/health
   ```

2. **Ağ bağlantısı kontrolü:**
   ```bash
   ping discovery.production.com
   ```

3. **Uygulama loglarını inceleme:**
   ```bash
   docker logs vnext-app-core | grep "Service Discovery"
   ```

4. **Development'ta geçici devre dışı bırakma:**
   ```json
   { "ServiceDiscovery": { "Enabled": false } }
   ```

5. **Cache'i tamamen geri alma:**
   ```json
   { "ServiceDiscovery": { "Cache": { "Enabled": false } } }
   ```
   Restart sonrası düz registry client'ı devreye girer; flip öncesi yazılmış bir giriş bile artık okunamaz.

## İlgili

- [Caching](./caching) — component/state/instance function cache (bu sayfadaki registry cache'inden bağımsız)
- [Telemetry](./telemetry) — Dapr sidecar tracing yapılandırması
