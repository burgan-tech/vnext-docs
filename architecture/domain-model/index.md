---
sidebar_position: 1
title: Domain Model
description: vNext'in multi-domain yapısı, bounded context'ler ve domain izolasyonu
---

# Domain Model

vNext platformunun çekirdek tezi: **Domain = Runtime**. Her iş alanı (onboarding, ödeme, bildirim, IDM gibi) **bağımsız bir runtime instance'ına** ve **bağımsız bir veritabanına** sahiptir. Aynı platform yazılımı, domain başına ayrı deployment olarak çalışır — kod sabit, topoloji değişkendir.

Bu yaklaşım üç sonuca götürür:

1. **İzolasyon** — bir domain'deki hata, deployment veya yük başka bir domain'i etkilemez
2. **Bağımsız evrim** — domain ekipleri kendi hızında ilerler, kendi component setini yönetir
3. **Aynı platform sözleşmesi** — tüm domain'ler aynı API yüzeyi, aynı güvenlik, aynı gözlemlenebilirliği paylaşır

## Bu Bölümde

| Sayfa | İçerik |
|-------|--------|
| **[Topology](./topology)** | Domain kavramı, izolasyon sınırı, çoklu-domain mimarisi, örnek domain'ler |

## Çapraz Bağlantılar

- **[Veritabanı Mimarisi](/architecture/data/database)** — domain başına DB, multi-schema topolojisi
- **[Runtime](/architecture/runtime/)** — bir domain'in runtime bileşen seti
- **[Çekirdek Prensipler — Domain-Driven](/architecture/overview/principles#2-domain-driven-architecture)** — mimari gerekçe
- **[Business / Capabilities](/business/capabilities/)** — domain'lerin iş yetenek haritası
- **[Product / Direction-Scope](/product/direction-scope/)** — domain yaklaşımının ürün stratejisindeki yeri
