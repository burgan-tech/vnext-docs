---
sidebar_position: 4
title: Telemetry
description: Tracing, metrics ve logging yapılandırması — DetailLevel, OTLP endpoint, Dapr sidecar tracing
---

# Telemetry Yapılandırması

vNext, [Aether](https://github.com/burgan-tech) telemetry altyapısı üzerinden tracing/metrics/logging'i tüm host'larda (Orchestration, Execution, DbMigrator, Workers) `Telemetry` bölümüyle yapılandırır. Detaylı gözlemlenebilirlik rehberi için bkz. [Observability](../how-to/observability).

## Tracing

```json
{
  "Telemetry": {
    "Tracing": {
      "DetailLevel": "Business",
      "AdditionalSources": [
        "BBT.Workflow.Pipeline",
        "BBT.Workflow.BackgroundJobs",
        "BBT.Workflow.SubFlow",
        "BBT.Workflow.Tasks",
        "BBT.Workflow.Cache",
        "BBT.Workflow.Scripting",
        "BBT.Workflow.Authorization",
        "BBT.Workflow.Instances.Read",
        "BBT.Workflow.Functions",
        "BBT.Workflow.Extensions",
        "BBT.Workflow.Execution",
        "BBT.Workflow.Execution.Invokers"
      ]
    }
  }
}
```

| Anahtar | Tip | Varsayılan | Açıklama |
|---------|-----|------------|----------|
| `DetailLevel` | `Business` \| `Verbose` | `Business` | `Business`: production izlerini servis sınırları ve business span'lerine odaklar. `Verbose`: ek olarak task-phase span'leri (`BBT.Workflow.Tasks`), cache span'leri (`BBT.Workflow.Cache`), EF Core ve Dapr state-store span'lerini de üretir. Başlangıçta bir kez okunur — değişiklik restart gerektirir |
| `AdditionalSources` | string[] | (12 kaynak; yukarıya bakın) | ActivitySource olarak kaydedilecek ek kaynaklar. **Listede olmayan bir kaynağın span'leri sessizce düşer** — hiçbir hata/uyarı üretilmez |

:::warning
`AdditionalSources` listesinde eksik bir kaynak, o kaynağın ürettiği span'lerin **sessizce** kaybolmasına yol açar. Yeni bir `ActivitySource` eklerken bu listeye de eklemeyi unutmayın.
:::

## Metrics

```json
{
  "Telemetry": {
    "Metrics": {
      "AdditionalMeters": ["BBT.Workflow.Telemetry"]
    }
  }
}
```

| Anahtar | Tip | Açıklama |
|---------|-----|----------|
| `AdditionalMeters` | string[] | Kaydedilecek ek `Meter` adları — host'a göre değişir (ör. Execution host `BBT.Workflow.Execution.Python` metre'sini de ekler); ilgili host'un `appsettings.json` dosyasından doğrulayın |

## Logging Enrichers

```json
{
  "Telemetry": {
    "Logging": {
      "Enrichers": {
        "RequestHeaderKeyPrefix": "",
        "Headers": [
          "sub",
          "act_sub",
          "jti",
          "role",
          "X-Parent-Instance-Id",
          "X-Trace-Id",
          "User-Agent"
        ]
      }
    }
  }
}
```

| Anahtar | Tip | Varsayılan | Açıklama |
|---------|-----|------------|----------|
| `Enrichers.RequestHeaderKeyPrefix` | string | `""` | Log kaydına eklenen header alanlarının önüne konan prefix. vNext tüm host'larda boş bırakır, böylece alanlar `RequestHeader.act_sub` yerine düz `act_sub`/`sub`/`role`/`x_parent_instance_id` olarak düşer (Elasticsearch/OpenObserve gibi backend'ler noktalı alan adını `_` ile normalize eder) |
| `Enrichers.Headers` | string[] | (yukarıdaki liste) | Her inbound HTTP isteğinden log kaydına aktarılacak header'lar |

:::note
`X-Request-Id`, bu listede **bilerek yer almaz** — enrichment amaçları için ayrı ele alınır.
:::

Enricher yalnızca **mevcut** inbound HTTP isteğinde header varsa çalışır; `HttpContext` olmayan kod yollarında (background job'lar, Outbox worker) bu alanlar üretilmez. Instance-scoped log scope'ları bu durumlarda korelasyonu sağlamaya devam eder.

## OTLP Endpoint

```json
{
  "Telemetry": {
    "Otlp": {
      "Endpoint": "http://localhost:4318",
      "Protocol": "http/protobuf"
    }
  }
}
```

:::warning
Aether, yapılandırmayı ortam değişkeninden **daha güçlü** sayar: `appsettings.json`'da tanımlı bir `Telemetry:Otlp:Endpoint`, `OTEL_EXPORTER_OTLP_ENDPOINT` ortam değişkenini **sessizce ezer**. Uygulamaları container içinde çalıştıran ortamlar (ör. `etc/docker/.env.*`), bu yüzden `Telemetry__Otlp__Endpoint` config anahtarını override etmelidir — yalnızca `OTEL_EXPORTER_OTLP_ENDPOINT` ayarlamak, uygulamanın kendi localhost'una export etmesine ve verinin kaybolmasına yol açar.
:::

Console exporter'lar (`EnableConsoleExporter`) v0.0.86 itibarıyla tüm host'larda **varsayılan kapalıdır**.

Aether ≥ **1.0.39** gerektirir.

## Dapr Sidecar Tracing

Dapr sidecar'ının kendi tracing yapılandırması `config.yaml` üzerinden ayrı olarak yapılır (uygulama `Telemetry:Otlp` ayarından bağımsız):

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprConfig
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector:4317"
      protocol: "grpc"
      isSecure: false
```

:::danger
Anahtar **kesinlikle `otel` olmalıdır** — Dapr'ın `TracingSpec`'inde `otlp` alanı yoktur; bir `otlp:` bloğu **sessizce yoksayılır**: sampler yine başlatılır ve sidecar span id üretmeye/yaymaya devam eder, ama hiçbir exporter kurulmaz. `protocol` ve `isSecure` **ikisi de zorunludur** — Dapr, açık bir protokol olmadan exporter kurmaz ve `isSecure` varsayılan olarak TLS ister (düz metin bir collector bunu reddeder).
:::

## İlgili

- [Observability](../how-to/observability) — detaylı tracing/metrics/logging rehberi
- [Deployment](../deployment/helm-chart) — Helm chart üzerinden telemetry override'ları
