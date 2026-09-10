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
      "RefreshIntervalSeconds": 3600,
      "L2TtlSeconds": 7200,
      "WarmupLockLeaseSeconds": 30,
      "BulkPageSize": 100,
      "MaxPages": 20
    }
  }
}
```

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
| `Dapr.NamespaceTemplate` | string | `""` | Cross-namespace app-id'yi (`{appId}.{namespace}`) oluşturmak için şablon; tek token `{domain}`. Boş = tek-namespace (app-id çıplak kullanılır). Helm chart, release namespace'inden render eder |
| `Dapr.PreferRegistryAppId` | boolean | `true` | Registry'den gelen boş olmayan bir `appId`'nin konvansiyonu override etmesine izin verir. Yalnızca `RequireRegistryEntry=true` iken anlamlıdır |
| `Dapr.RequireRegistryEntry` | boolean | `false` | `false`: registry **hiç okunmaz** — çözümleme saf konvansiyon (+ `DomainOverrides`), ağ çağrısı yok, registry kesintisine bağışık. `true`: registry her çözümlemede okunur (`CacheSeconds` boyunca cache'lenir), kayıtsız bir domain `DomainEndpointNotFound` ile başarısız olur |
| `Dapr.CacheSeconds` | integer | `60` | `RequireRegistryEntry=true` iken pozitif sonuç cache ömrü (`0` = kapalı). Hatalar asla cache'lenmez |
| `Dapr.DomainOverrides` | object | `{}` | Domain adına göre override. Değer `"url"` ise o domain **`http` provider'a geri döner**; başka bir değer verilirse doğrudan hedef app-id olarak kullanılır — rollout/rollback dial'ı |

**Sidecar `ERR_*` hataları** `remote_network_error`'a normalize edilir: sidecar hedefe ulaşamadığında `HTTP 500` + `{"errorCode":"ERR_DIRECT_INVOKE",…}` döner, `DaprRemoteTransport` bunu `HttpRequestException`'a çevirir, böylece error boundary'ler transport hatası olarak görmeye devam eder.

**Retry profilleri**: okuma çağrıları (instance/data/state/view/hierarchy/list) retry edilir; mutasyonlar (`start`, subflow-forward, transitions, `sub/*`, busy, retry) **tek deneme** ile çağrılır — bu, `RemotePolicyFactory`'de yaşar çünkü Dapr resiliency hedefleri yalnızca app-id ve status code'a göre filtreler, mutasyon-tekilliğini ifade edemez.

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
      "L1TtlSeconds": 60,
      "TickIntervalSeconds": 60,
      "RefreshIntervalSeconds": 3600,
      "L2TtlSeconds": 7200,
      "WarmupLockLeaseSeconds": 30,
      "BulkPageSize": 100,
      "MaxPages": 20
    }
  }
}
```

| Anahtar | Tip | Varsayılan | Açıklama |
|---------|-----|------------|----------|
| `Enabled` | boolean | Kod: `false`; Orchestration host'ta: `true` | Tek rollback anahtarı. `false`: eski (cache'siz) davranış **birebir** geri gelir |
| `L1Enabled` | boolean | `true` | Process-içi katman |
| `L1TtlSeconds` | integer | `60` | L1 girişinin ömrü — `RefreshIntervalSeconds`'tan **küçük** olmalı |
| `TickIntervalSeconds` | integer | `60` | Her pod'un ne sıklıkla yenileme değerlendirdiği — **yenileme hızı değil** |
| `RefreshIntervalSeconds` | integer | `3600` | İki cluster-wide bulk yenileme arasındaki minimum süre — bir shared marker ile cluster genelinde tekilleştirilir |
| `L2TtlSeconds` | integer | `7200` | Bir kaydın "yok" sayılmadan önceki maksimum yaşı — dead-man's switch, `RefreshIntervalSeconds`'ın en az `+ WarmupLockLeaseSeconds` fazlası olmalı |
| `WarmupLockLeaseSeconds` | integer | `30` | Bulk-refresh lock'unun lease süresi — `RefreshIntervalSeconds`'tan küçük olmalı |
| `BulkPageSize` | integer | `100` | Bulk okuma sayfa boyutu (API maksimumu ile aynı) |
| `MaxPages` | integer | `20` | Bir yenilemede çekilecek maksimum sayfa sayısı (runaway koruması) |

Bu invaryantlar startup'ta doğrulanır (`ServiceDiscoveryOptionsValidator`) — her biri bozulduğunda cache'i **sessizce** ya durdurur ya da penceresini genişletir; bu yüzden bir yorum değil, bir sözleşmedir.

**Katmanlar**: L1 (in-process) → L2 (dağıtılmış) → registry. `FetchedAtUtc` her girişe damgalanır ve okumada kontrol edilir (dağıtılmış cache'in kendi TTL desteği olmayabilir, sessizce yoksayabilir). Saatte bir (varsayılan) tüm kayıtlar bir distributed lock altında bulk okunur.

**`baseUrl` değişince** (bir domain taşındığında) cache'in bir saatlik penceresini beklemek yerine senkron zorla yenileme yapın:

```bash
curl -X POST localhost:4201/api/v1/utilities/discovery/refresh
```

Yanıt: `{"outcome": "Refreshed"}` (veya `SkippedNotOwner`, `Failed`, `disabled`).

:::warning
`Cache.AcceptedStatuses` varsayılanı `["A"]`'dır, ama `metadata.status` **registration workflow instance'ının** durumudur, bir health sinyali değildir. Registration flow'unuz bir Finish state'e ulaşıyorsa instance'lar `C`'ye geçer ve warm-up bu domain'leri atlar (yine de bir miss canlı registry'ye düşer, sadece warm-up'ın kazancı olmaz).
:::

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
