---
sidebar_position: 3
title: Roadmap
description: vNext platformu faz bazlı yetenek planlaması ve gelecek vizyonu
---

# Product Roadmap

Bu sayfa, vNext platformunun geçmiş, mevcut ve gelecek yetenek planlamasını faz bazlı olarak sunar.

## Genel Bakış

```mermaid
gantt
    title vNext Platform Roadmap 2025-2027
    dateFormat  YYYY-Q
    axisFormat  %Y-Q%q

    section Foundation
    Core Engine           :done, 2025-Q1, 2025-Q3
    Multi-Domain          :done, 2025-Q2, 2025-Q4
    Task Ecosystem        :done, 2025-Q3, 2026-Q1

    section Growth
    Event-Driven          :done, 2025-Q4, 2026-Q1
    Versioning System     :done, 2026-Q1, 2026-Q2
    Monitoring v1         :active, 2026-Q2, 2026-Q3

    section Scale
    Visual Designer       :2026-Q3, 2026-Q4
    Template Library      :2026-Q3, 2027-Q1
    Self-Service Portal   :2026-Q4, 2027-Q1

    section Innovation
    AI-Assisted Design    :2027-Q1, 2027-Q3
    Marketplace           :2027-Q2, 2027-Q4
```

## Tamamlanan Fazlar

### Faz 1 — Foundation (2025 Q1-Q3)

**Hedef:** Platform çekirdeğini oluştur, temel workflow engine'i canlıya al.

| Yetenek | Açıklama | Durum |
|---------|----------|-------|
| Workflow Engine | State machine tabanlı akış yönetimi | ✅ |
| State Management | Instance durum takibi ve geçiş yönetimi | ✅ |
| Basic Tasks | HTTP, Condition, Script task desteği | ✅ |
| Single Domain | Tek domain ile çalışma | ✅ |
| REST API | Tüm işlemler API üzerinden | ✅ |

### Faz 2 — Multi-Domain & Integration (2025 Q2-Q4)

**Hedef:** Birden fazla iş alanını izole şekilde destekle, dış sistem entegrasyonunu güçlendir.

| Yetenek | Açıklama | Durum |
|---------|----------|-------|
| Multi-Domain | Domain bazında runtime izolasyonu | ✅ |
| Domain Database Isolation | Her domain'e özel veritabanı | ✅ |
| Dapr Integration | Service invocation, state store | ✅ |
| PubSub Events | Olay bazlı entegrasyon | ✅ |
| Timer & Notification Tasks | Zamanlayıcı ve bildirim görevleri | ✅ |

### Faz 3 — Enterprise Features (2025 Q4 - 2026 Q2)

**Hedef:** Kurumsal gereksinimleri karşıla — güvenlik, denetlenebilirlik, versiyonlama.

| Yetenek | Açıklama | Durum |
|---------|----------|-------|
| Semantic Versioning | Bileşen bazında MAJOR.MINOR.PATCH | ✅ |
| ETag Concurrency | Optimistic locking ile veri koruması | ✅ |
| Vault Secrets | Merkezi sır yönetimi | ✅ |
| Audit Trail | Tam denetlenebilirlik | ✅ |
| Sub-Flow / Sub-Process | Akış delegasyonu | ✅ |
| Hot Reload (Init Service) | Kesintisiz bileşen güncelleme | ✅ |

## Aktif Faz

### Faz 4 — Observability & Developer Experience (2026 Q2-Q3)

**Hedef:** Platform kullanımını kolaylaştır, izleme ve debug yeteneklerini artır.

| Yetenek | Açıklama | Durum |
|---------|----------|-------|
| Advanced Monitoring | Gerçek zamanlı instance izleme paneli | 🔄 Beta |
| Improved Error Handling | Detaylı hata mesajları ve recovery | 🔄 Beta |
| Developer Tooling | CLI araçları ve local dev iyileştirmeleri | 📋 Planlı |
| Documentation Platform | Kapsamlı teknik ve business dokümantasyon | 🔄 Devam ediyor |

## Gelecek Fazlar

### Faz 5 — Low-Code & Self-Service (2026 Q3-Q4)

**Hedef:** Teknik olmayan kullanıcıların da platforma katkı yapabilmesini sağla.

| Yetenek | Beklenen Etki |
|---------|---------------|
| Visual Workflow Designer | Sürükle-bırak ile akış tasarımı |
| Template Library | Sektörel hazır şablonlar |
| Self-Service Domain Portal | Yeni alan oluşturma ve yönetim arayüzü |
| Guided Onboarding | Adım adım platform tanıtımı |

### Faz 6 — Intelligence & Scale (2027+)

**Hedef:** AI destekli tasarım, ekosistem genişlemesi ve multi-cloud destek.

| Yetenek | Beklenen Etki |
|---------|---------------|
| AI-Assisted Flow Design | Doğal dil ile akış oluşturma |
| Process Mining | Mevcut süreçlerden otomatik akış çıkarımı |
| Marketplace | 3. parti bileşen ve connector mağazası |
| Multi-Cloud | AWS, Azure, GCP desteği |
| Advanced Analytics | Predictive process analytics |

## Roadmap İlkeleri

1. **Customer-driven**: Her faz müşteri geri bildirimi ile şekillenir
2. **Incremental delivery**: Küçük, sık ve değerli release'ler
3. **Backward compatible**: Mevcut kullanıcılar etkilenmez
4. **Production-first**: Her özellik production-ready olarak çıkar
5. **Measurable**: Her özelliğin başarı metriği tanımlıdır

## Feedback & Öneriler

Roadmap hakkında geri bildirim ve önerileriniz için:
- GitHub Issues üzerinden feature request açabilirsiniz
- Product ekibine doğrudan ulaşabilirsiniz

:::note
Bu roadmap tahmini bir planlama aracıdır. Tarihler ve öncelikler müşteri geri bildirimleri, pazar koşulları ve teknik bağımlılıklara göre değişebilir.
:::
