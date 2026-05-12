---
sidebar_position: 1
title: Patterns
description: vNext platformunda kullanılan mimari pattern'lar
---

# Patterns

Bu bölüm vNext platformunda kullanılan mimari pattern'ları açıklar.

- **[References](./references)** — Foreign Key konsepti, version resolution, reference linking
- **[Versioning](./versioning)** — Semantic Versioning stratejisi, deployment, rollback

## İlgili Pattern'lar

**Inbox / Outbox pattern**, operasyonel garantiler (mesaj kaybı yok + exactly-once işleme) için kullanılır — detay için [Persistence](/architecture/data/persistence).

**Dual-Write pattern** ve **ETag-Based Concurrency Control** mimari prensipler olarak [Çekirdek Prensipler](/architecture/overview/principles) sayfasında ele alınır.
