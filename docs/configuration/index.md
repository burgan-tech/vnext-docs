---
sidebar_position: 0
title: Configuration
sidebar_label: Genel Bakış
description: vNext host'larının appsettings.json yapılandırma bölümlerine genel bakış
---

# Configuration

vNext platformunun her host'u (**Orchestration**, **Execution**, **DbMigrator**) standart .NET `appsettings.json` + ortam değişkeni katmanlamasıyla yapılandırılır. Ortam değişkeni biçimi her zaman `SectionName__SubKey__SubSubKey` şeklindedir (ör. `ComponentCache__GenerationMemoSeconds=5`).

Bu bölümdeki sayfalar, platformun başlıca yapılandırma bloklarını host bazında listeler:

| Sayfa | Özet | Host |
|-------|------|------|
| [URL Templates](./url-templates) | Gateway `BasePath` ve HATEOAS link şablonları | Orchestration |
| [Service Discovery](./service-discovery) | Cross-domain endpoint çözümleme (`http`/`dapr`), registry cache | Orchestration |
| [Caching](./caching) | Component/state/instance function cache TTL ve L1 katmanı | Orchestration |
| [Telemetry](./telemetry) | Tracing/metrics/logging detay seviyesi, OTLP, Dapr sidecar tracing | Orchestration, Execution, DbMigrator |
| [Workflow Execution](./workflow-execution) | Transition job timeout, fan-out eşzamanlılığı, InstanceData yazım budget'ı | Orchestration |
| [Task Invocation](./task-invocation) | Task'ların Orchestration içinde (Local) veya Execution'da (Remote) çalıştırılması, bağlantı ve timeout limitleri | Orchestration |
| [Caller Role Provider](./caller-role-provider) | Çağıran rollerinin çözümlenmesi — `default` / `morph-idm` | Orchestration, Execution |
| [Python](./python) | Trusted Python task çalıştırma modları ve limitleri | Execution |
| [Scripting / Sandbox](./scripting) | Script motoru helper ve sandbox güvenlik sınırları | Orchestration, Execution |
| [Sunucu Timeout](./server-timeout) | Init Service publish timeout'ları | Init Service |
| [Header Limitleri](./header-limits) | Kestrel request header boyut/sayı limitleri | Tüm host'lar |

Ayrı sayfası olmayan, ilgili konu sayfasında anlatılan bölümler:

| Bölüm | Özet | Anlatıldığı sayfa |
|-------|------|-------------------|
| `AttributeIndexes` | `x-indexed` alanlar için hazır index kataloğuna yönlendirme (`Enabled`, `DisabledFlows`, `CatalogCacheSeconds`) | [Attribute Index'leri](../how-to/attribute-indexes#runtime-yönlendirme) |
| `InstanceQueries` | Instance listeleme sorgularının okuma rotası (`IdentityPaging`, `LatestJoin`, `DisabledSchemas`); geri alınabilir, fiziksel index'lere dokunmaz | [Instance Filtering](../how-to/instance-filtering) |
| `HumanTaskFunction` | Human-task fonksiyonunun tarama limitleri (`PerSchemaLimit`, `ResultCap`, `MaxDescentDepth`, `FlowsPerScanStatement`, `FanoutParallelism`, `MaxConcurrentDescents`) | Orchestration `appsettings.json` varsayılanları |

:::note
Her sayfada geçen `appsettings.json` örnekleri, ilgili host'un varsayılan değerlerini yansıtır. Ortama özgü override'lar için standart .NET configuration katmanlaması (`appsettings.{Environment}.json`, ortam değişkenleri, Helm `values.yaml`) kullanılır.
:::
