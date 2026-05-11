---
sidebar_position: 2
title: Instance Data Yapısı
description: vNext'in immutable, versioned, queryable instance data modeli
---

# Instance Data Yapısı

vNext platformu, **"Data Repository"** özelliğine sahiptir. Süreç bazında **tüm veriyi** kendi içinde **instance data** olarak tutar, **sorgulanabilir** kılar ve **servis katmanı** sağlar (Function üzerinden).

Bu yaklaşım, süreç tasarımında **harici veritabanında veri barındırma ihtiyacını minimize** eder.

## Temel Özellikler

### Immutable

Instance data **immutable** (değişmez) yapıdadır. Bir değişim olduğunda mevcut data değiştirilmez; **yeni bir versiyon** üretilir.

### Semantik Versiyonlama

Akışlarda belirtilen **VersionStrategy** yapısına uygun olarak instance data **semantik olarak versiyonlanır**:

- **Patch** — küçük değişiklikler (task sonuçları)
- **Minor** — geriye uyumlu data eklemeleri
- **Major** — geriye uyumsuz değişiklikler

### Task Sonuçları → Patch

Sistem, **task sonuçlarını her zaman Patch olarak versiyonlar**. Bu sayede her task çıktısı izlenebilir ve önceki versiyonlara geri dönülebilir.

### Full-Merge & Latest

Data her zaman **full-merge** mantığında versiyonlanarak **Latest** data işaretlenir. Yani her yeni versiyon önceki versiyonun tamamını içerir + delta'yı.

```
v1.0.0 → { customer: { id: "1" } }
v1.0.1 → { customer: { id: "1", name: "Alice" } }   ← Latest, full state
v1.0.2 → { customer: { id: "1", name: "Alice", age: 30 } }   ← Latest now
```

## Filtreleme ve Sorgulama

Instance data üzerinde **gelişmiş filtreleme** yapılabilir:

- JSONPath benzeri pattern'lar
- Master schema alanları üzerinden indeksli sorgu
- Pagination + sort
- Cross-instance arama

Detay için: [Instance Filtering](/docs/how-to/instance-filtering)

## Master Schema Etkisi

Workflow'un **`attributes.schema`** (master schema) alanı, instance data'nın **ana yapısını belirler**. Her data değişiminde master schema ile **tutarlılık kontrolü** yapılır.

Bkz. [Schema component](/docs/components/schema) — master schema kullanımı.

## Pratik Sonuçlar

- Süreç verisi **kendine yeten** bir data store olur
- Audit trail otomatik olarak elde edilir (her versiyon korunur)
- Geriye dönük analiz mümkün
- Cross-domain veri paylaşımı **Function** üzerinden — direkt DB erişimi gerekmez
- Master schema değişiklikleri **versionlanır** — eski instance'lar etkilenmez

## İlgili

- [Schema component](/docs/components/schema) — master schema
- [Instance Filtering](/docs/how-to/instance-filtering) — filtreleme syntax
- [Built-in Functions](/docs/components/functions/built-in) — Data Function
- [Versioning](/architecture/patterns/versioning) — semantik versiyonlama prensibi
