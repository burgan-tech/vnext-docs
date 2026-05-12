---
sidebar_position: 2
title: Çekirdek Prensipler
description: vNext platformunun 8 mimari prensibi — dual-write, domain-driven, Dapr, ETag, semver, single-runtime, observability, AI-native
---

# Çekirdek Prensipler

vNext platformunun tasarımını şekillendiren sekiz çekirdek prensip:

## 1. Dual-Write Pattern

Workflow durumu **iki yere** yazılır: birincil veritabanı (PostgreSQL) ve event store. Bu yaklaşım hem **transactional consistency** hem de **event sourcing** garantisi sağlar.

- **Birincil DB**: workflow instance state, metadata, audit
- **Event store**: state transition'lar event olarak yayınlanır
- **Replication desteği**: event'ler downstream consumer'lara akabilir (CDC + Dapr pub/sub)
- **Outbox tablosu**: yayınlanacak event'ler transactional outbox'a yazılır; outbox worker tarafından idempotent şekilde işlenir

> Daha fazla bilgi için: [Persistence Strategy](/architecture/data/persistence)

## 2. Domain-Driven Architecture

Her **domain** bağımsız bir bounded context'tir:

- Kendi runtime container'ları (orchestration, execution, workers)
- Kendi veritabanı (`vNext_<DomainName>`)
- Kendi konfigürasyon (`.env`, `appsettings.*`)
- Kendi component set'i (workflow, task, function, schema, view, extension)

Aynı altyapı (DB engine, Redis, Vault, Dapr) paylaşılır ama **veri ve runtime tamamen izole**.

> Daha fazla bilgi için: [Domain Topology](/architecture/domain-model/topology)

## 3. Microservice Ready (Dapr Building Blocks)

Runtime servisleri **Dapr sidecar'ları** üzerinden iletişim kurar ve aşağıdaki building block'ları birinci sınıf vatandaş olarak kullanır:

| Building Block | vNext Kullanımı |
|----------------|-----------------|
| **Service Invocation** | Orchestration ↔ Execution + iç/dış REST çağrıları (DaprService task) |
| **Pub/Sub** | Workflow event'leri, cross-domain entegrasyon (DaprPubSub task, CloudEvents) |
| **State Store** | Distributed state, cache (Redis backend) |
| **Bindings** | Input/output bağlayıcılar (SMTP, S3, SFTP, Kafka, vb.) |
| **Secrets** | Credential yönetimi (Vault, Kubernetes secrets) |

**Sağlayıcı bağımsızlığı:** RabbitMQ ↔ Kafka ↔ Azure Service Bus geçişi konfigürasyon değişikliğiyle yapılır, kod değişikliğiyle değil.

Servisler **stateless** ve **horizontally scalable**.

## 4. ETag-Based Concurrent Update Control

Workflow instance'ı her okunduğunda bir **ETag** (entity tag) üretilir. Update isteği bu ETag'ı header'da göndermek **zorundadır**:

```http
PUT /api/v1.0/{domain}/workflows/{wf}/instances/{id}
If-Match: "abc123"
```

ETag eşleşmezse → **412 Precondition Failed**. Bu mekanizma **lost update** problemini önler.

## 5. Semantic Versioning

Tüm component'ler (workflow, task, function, schema, view, extension) **SemVer** (`MAJOR.MINOR.PATCH`) ile versiyonlanır:

- **MAJOR** → backward-incompatible değişiklik
- **MINOR** → backward-compatible özellik eklemesi
- **PATCH** → bug fix

Reference resolution **major version'a sabittir**: bir workflow `v1.x` referansı verdiğinde, runtime en güncel `v1.x.y` instance'ını çözer.

> Daha fazla bilgi için: [Semantic Versioning](/architecture/patterns/versioning), [References](/architecture/patterns/references)

## 6. Single Runtime, Many Flows

vNext **kurum başına tek bir platform runtime'ı** olarak tasarlanmıştır. Uygulama çeşitliliği "yeni codebase" ile değil, **flow tanımları** ile sağlanır.

**Mimari sonuçları:**

- Platform runtime'ı bir **tek deployment artifact**'tır (Orchestration API + Execution API + Workers); flow tanımları runtime'ın *yorumladığı* veridir
- Runtime güncellemesi tüm kurumdaki süreçleri tek noktadan iyileştirir
- Güvenlik yaması, telemetri standardı, audit politikası **bir kez uygulanır**, ekosistem genelinde geçerli olur
- Yeni süreç eklemenin marjinal mimari maliyeti = **yeni tanım**, yeni codebase değil
- Domain izolasyonu (#2) bu runtime'ın **çoklu instance** olarak farklı domain'lerde çalışmasına izin verir — kod sabit, deployment topolojisi değişken

> İş ve ürün karşılığı: [Business / Manifesto](/business/manifesto/), [Product / Direction-Scope](/product/direction-scope/)

## 7. Observable by Default

Gözlemlenebilirlik **sonradan eklenen bir özellik değil**, mimari katmanın doğal parçasıdır.

**Standart bileşenler:**

- **OpenTelemetry** — distributed tracing + structured logging + metrics
- **Custom spans & events** — transition, task execution, dış çağrı için instrumentation hazır
- **Instance correlation** — parent ↔ child workflow ilişkileri, sub-flow / sub-process trace context propagation
- **Health endpoints** — Orchestration `4201/health`, Execution `4202/health`
- **Cache metrics (Redis)** — hit/miss, latency, key dağılımı
- **Database metrics (PostgreSQL)** — slow query, connection pool
- **Persistent metrics (ClickHouse)** — uzun vadeli metrik saklama, trend analizi, SLO raporu

Bir akış canlıya çıktığı an gözlemlenmektedir; ek enstrümantasyon gerekmez.

> Detay: [Observability](/architecture/infrastructure/observability)

## 8. AI-Native Design (Pluggable)

AI çağında doğru cevap "her ekibe daha hızlı kod yazdırmak" değil, **"herkes kod yazmasın — AI ile flow çizsin"**dir. vNext bu paradigmayı mimari düzeyde taşır:

- **Tanım odaklı model** — workflow, schema, task tanımları AI üretimi için doğal hedef
- **Pluggable AI sağlayıcı** — OpenAI, Anthropic, Azure OpenAI, açık modeller, kurum-içi modeller; vNext model sağlayıcısı değildir
- **İnsan-onaylı pipeline** — AI üretimi production'a çıkmadan önce review + test + audit zorunlu
- **AI-Assisted Flow Design** (roadmap) — doğal dil → flow taslağı, akış doğrulama copilot
- **Process Mining** (roadmap) — mevcut süreç loglarından otomatik flow çıkarımı

**Mimari etki:** AI üretimi flow tanımına yönlendirildiğinde, kurum çapında üretkenlik artar ve **kod miktarı sabit kalır** (#6 ile birlikte).

> Detay: [Product / Direction-Scope — AI-Native](/product/direction-scope/), [Product / Roadmap](/product/roadmap/)

## Bu Prensiplerin Pratik Etkisi

- Domain ekibi **bağımsız ilerleyebilir** (ayrı runtime, ayrı DB)
- Aynı workflow şemasının farklı versiyonları **paralel çalışabilir** (rolling deployment)
- Event'ler downstream sistemlere akabilir (CDC için hazır)
- Concurrent update conflict'leri **build-time'da değil runtime'da** yakalanır
- Component'ler güvenli şekilde **hot-reload** edilebilir (init-service)
- Yeni uygulama → yeni codebase değil, yeni flow tanımı
- Her sürecin her adımı **otomatik** gözlemlenir
- AI flow tasarımı **mimari first-class** olarak desteklenir
