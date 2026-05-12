---
slug: /intro
sidebar_position: 1
title: Architecture
description: vNext platformunun mimari dokümantasyonu — domain modeli, runtime, veri katmanı, altyapı, mimari kararlar
---

# Architecture

Bu bölüm vNext platformunun **mimari yönlerini** anlatır — domain modeli, runtime topolojisi, veri katmanı, altyapı ve geçmiş mimari kararlar. Hedef kitle: **architect, CTO, senior engineer**.

vNext'in mimarisi üç ana tezi destekleyecek şekilde tasarlanmıştır:

- **Tek runtime, N flow** — kurum başına tek bir platform runtime'ı; uygulama çeşitliliği flow tanımlarıyla elde edilir
- **Domain = Runtime** — her iş alanı bağımsız runtime, bağımsız veritabanı, bağımsız operasyonel yaşam döngüsü
- **AI-native, observable-by-default** — süreç tasarımı AI ile yapılır; her adım uçtan uca izlenebilir

> Bu tezlerin iş ve ürün perspektifi için: [Business / Manifesto](/business/manifesto/), [Product / Direction-Scope](/product/direction-scope/).

## Bölümler

1. **[Overview](./overview/)** — yüksek seviyeli platform mimarisi
2. **[Çekirdek Prensipler](./overview/principles)** — dual-write, domain-driven, Dapr, ETag, semver, single-runtime, observability, AI-native
3. **[Domain Model](./domain-model/)** — multi-domain yapısı, bounded context
4. **[Runtime](./runtime/)** — Orchestration API ↔ Execution API ↔ Inbox/Outbox Workers
5. **[Data](./data/)** — multi-schema DB topolojisi, persistence pattern'ları, dual-write, Inbox/Outbox
6. **[Infrastructure / Observability](./infrastructure/observability)** — OpenTelemetry, persistent metrics, health endpoints
7. **[Patterns](./patterns/)** — references, semantic versioning

## İlgili Bölümler

- Teknik geliştirme rehberi: [Technical Docs](/docs/intro)
- İş değeri ve senaryolar: [Business](/business/intro)
- Ürün yönü, persona ve roadmap: [Product](/product/intro)
