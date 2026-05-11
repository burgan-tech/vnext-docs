---
slug: /intro
sidebar_position: 1
title: Architecture
description: vNext platformunun mimari dokümantasyonu — domain modeli, runtime, veri katmanı, altyapı, mimari kararlar
---

# Architecture

Bu bölüm vNext platformunun **mimari yönlerini** anlatır — domain modeli, runtime, veri katmanı, altyapı ve geçmiş mimari kararlar (ADR'ler). Hedef kitle: **architect, CTO, senior engineer**.

## Bölümler

1. **[Overview](./overview/)** — yüksek seviyeli platform mimarisi ve çekirdek prensipler
2. **[Domain Model](./domain-model/)** — multi-domain yapısı, bounded context
3. **[Runtime](./runtime/)** — orchestration ↔ execution ↔ worker akışı
4. **[Data](./data/)** — DB topolojisi, persistence pattern'ları
5. **[Infrastructure](./infrastructure/)** — Docker, Dapr, Vault, Redis, PostgreSQL
6. **[Patterns](./patterns/)** — dual-write, semantic versioning, reference resolution
