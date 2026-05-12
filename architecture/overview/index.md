---
sidebar_position: 1
title: Platform Overview
description: vNext platformunun yüksek seviyeli mimarisi — tek runtime, N flow, domain izolasyonu ve AI-native tasarım
---

# Platform Overview

vNext Platformu, **low-code, no-code ve full-code** desteği sunan bulut tabanlı bir uygulama geliştirme platformudur.

Platform, yatayda büyüyen bir servis kümesine sahiptir ve bu servislerle yönetilen önyüz uygulamaları aracılığıyla müşteri, çalışan ve sistemlere arayüz sunarak her türlü iş akışını ve fonksiyonu yüksek güvenlikle gerçekleştirebilir.

## Mimari Tezler

vNext mimarisinin temelini üç tez oluşturur:

### 1. Tek Runtime, N Flow

Kurumdaki tüm süreç-yoğun uygulamalar **aynı platform runtime'ını** paylaşır. İş mantığı her uygulama için ayrı bir codebase olarak değil, **flow tanımları** olarak yaşar. Operasyonel sonuç:

- Tek bir runtime + N flow = merkezi yönetim
- Aynı izleme, aynı güvenlik, aynı audit tüm uygulamalarda
- Yeni uygulama "yeni codebase" değil, "yeni tanım"

### 2. Domain = Runtime

Her iş alanı (onboarding, ödeme, bildirim, IDM) **bağımsız bir runtime instance'ına** sahiptir. Aynı platform yazılımı, domain başına ayrı deployment olarak çalışır:

- Kendi veritabanı, kendi state store, kendi pub/sub
- Hata, deployment ve performans bazında tam izolasyon
- Yatay büyüme her domain için bağımsız

### 3. AI-Native, Observable-by-Default

Süreç tasarımı AI ile yapılır; her transition, task ve dış çağrı **OpenTelemetry** ile uçtan uca izlenir. AI sağlayıcısı pluggable, gözlemlenebilirlik standart.

> İş ve ürün perspektifinden anlatımı için: [Business / Manifesto](/business/manifesto/), [Product / Direction-Scope](/product/direction-scope/).

## Platform Yapısı

### Mimari ve Topoloji

Platform mimarisi ve domain topolojisi için şu dökümanları inceleyebilirsiniz:

- **[Domain Topolojisi](/architecture/domain-model/topology)** — Domain kavramı, izolasyon ve çoklu-domain mimarisi
- **[Veritabanı Mimarisi](/architecture/data/database)** — Multi-schema yapısı, migration sistemi ve DB izolasyonu
- **[Runtime](/architecture/runtime/)** — Orchestration API ↔ Execution API ↔ Inbox/Outbox Workers
- **[Observability](/architecture/infrastructure/observability)** — OpenTelemetry, persistent metrics, health endpoints

### Temel Prensipler

Mimariyi şekillendiren 8 çekirdek prensip için: **[Çekirdek Prensipler](/architecture/overview/principles)**.

Özet:

1. Dual-Write Pattern
2. Domain-Driven Architecture
3. Microservice Ready (Dapr building blocks)
4. ETag-Based Concurrency Control
5. Semantic Versioning
6. Single Runtime, Many Flows
7. Observable by Default
8. AI-Native Design (Pluggable)

### Dapr Building Blocks

vNext, mikroservis altyapısını **Dapr** üzerinden standartlaştırır. Aşağıdaki building block'lar birinci sınıf vatandaşlardır:

| Building Block | Kullanım |
|----------------|----------|
| **Service Invocation** | Orchestration ↔ Execution + iç/dış REST çağrıları |
| **Pub/Sub** | Workflow event'leri, cross-domain entegrasyon (CloudEvents) |
| **State Store** | Distributed state, cache (Redis backend) |
| **Bindings** | Input/output bağlayıcılar (SMTP, S3, SFTP, Kafka, vb.) |
| **Secrets** | Credential yönetimi (Vault, Kubernetes secrets) |

Bu yaklaşım **sağlayıcı bağımsızlığı** sağlar: RabbitMQ ↔ Kafka ↔ Azure Service Bus geçişi tanım değişikliğiyle yapılır, kod değişikliğiyle değil.

### Operasyonel Garantiler

- **Inbox/Outbox pattern** — gelen ve giden event'lerin tam-bir-kez (exactly-once) işlenmesi; mesaj kaybına karşı transactional outbox
- **Background workers** — `BBT.Workflow.Workers.Inbox` ve `BBT.Workflow.Workers.Outbox`
- **Retry policy** — geçici hataların idempotent yeniden denenmesi
- **Hot reload (Init Service)** — bileşenlerin kesintisiz güncellenmesi

### İş Akışı Mantığı ve Tanımı

İş akışı bileşenleri (Workflow, Schema, Task, Function, View, Mappings, Extension) **tanım odaklı** modellenir. Her bileşen semantic versioning ile yönetilir; eski ve yeni sürüm yan yana çalışabilir.

Detay: [Technical / Components](/docs/intro)

### API Tanımları

vNext uygulamalarla sadece API'ler üzerinden etkileşir. İki ana host:

- **Orchestration API** (`BBT.Workflow.Orchestration.HttpApi.Host`) — istemci-yönlü workflow operasyonları
- **Execution API** (`BBT.Workflow.Execution.HttpApi.Host`) — iç görev yürütümü

> *Not: Asenkron API dönüşleri için aynı zamanda SignalR ve MQTT kanalı üzerinden etkileşim sunulmaktadır. Bu yapı (EventBus), API'lerin uzantısıdır.*

### AI ile Süreç Tasarımı

AI çağında doğru cevap "her ekibe daha hızlı kod yazdırmak" değil, **"herkes kod yazmasın — AI ile flow çizsin"**dir. vNext mimarisi bu paradigmayı destekler:

- Süreç sahibi AI ile flow tanımını üretir
- Kod yazımı vNext runtime'ında **sabit**; uygulamalar tanım çeşitliliğiyle elde edilir
- AI sağlayıcısı pluggable (OpenAI, Anthropic, Azure OpenAI, açık modeller, kurum-içi modeller)
- Her AI üretimi **insan-onaylı** pipeline'dan geçer (review + test + audit)

Detay: [Çekirdek Prensipler — AI-Native Design](/architecture/overview/principles#8-ai-native-design-pluggable)
