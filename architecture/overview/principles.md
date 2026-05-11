---
sidebar_position: 2
title: Çekirdek Prensipler
description: vNext platformunun mimari prensipleri — dual-write, domain-driven, ETag, semantic versioning
---

# Çekirdek Prensipler

vNext platformunun tasarımını şekillendiren beş çekirdek prensip:

## 1. Dual-Write Pattern

Workflow durumu **iki yere** yazılır: birincil veritabanı (PostgreSQL) ve event store. Bu yaklaşım hem **transactional consistency** hem de **event sourcing** garantisi sağlar.

- **Birincil DB**: workflow instance state, metadata, audit
- **Event store**: state transition'lar event olarak yayınlanır
- **Replication desteği**: event'ler downstream consumer'lara akabilir (CDC + Dapr pub/sub)

> Daha fazla bilgi için: [Persistence Strategy](/architecture/data/persistence)

## 2. Domain-Driven Architecture

Her **domain** bağımsız bir bounded context'tir:

- Kendi runtime container'ları (orchestration, execution, workers)
- Kendi veritabanı (`vNext_<DomainName>`)
- Kendi konfigürasyon (`.env`, `appsettings.*`)
- Kendi component set'i (workflow, task, function, schema, view, extension)

Aynı altyapı (DB engine, Redis, Vault, Dapr) paylaşılır ama **veri ve runtime tamamen izole**.

> Daha fazla bilgi için: [Domain Topology](/architecture/domain-model/topology)

## 3. Microservice Ready (Dapr ile)

Runtime servisleri **Dapr sidecar'ları** üzerinden iletişim kurar:

- **Service invocation**: orchestration ↔ execution
- **Pub/sub**: workflow event'leri (state changes, transitions)
- **State store**: cross-service state sharing (Redis backend)
- **Secret store**: Vault entegrasyonu

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

## Bu Prensiplerin Pratik Etkisi

- Domain ekibi **bağımsız ilerleyebilir** (ayrı runtime, ayrı DB)
- Aynı workflow şemasının farklı versiyonları **paralel çalışabilir** (rolling deployment)
- Event'ler downstream sistemlere akabilir (CDC için hazır)
- Concurrent update conflict'leri **build-time'da değil runtime'da** yakalanır
- Component'ler güvenli şekilde **hot-reload** edilebilir (init-service)
