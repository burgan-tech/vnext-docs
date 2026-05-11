---
sidebar_position: 2
title: Feature Catalog
description: vNext platformunun mevcut ve planlı özelliklerinin ürün yönetimi seviyesinde kataloğu
---

# Feature Catalog

Bu sayfa, vNext platformunun mevcut ve planlı özelliklerini **ürün yönetimi seviyesinde** listeler. Her özellik için iş değeri, kullanıcı etkisi ve teknik referans bilgisi verilmiştir.

## Mevcut Özellikler (GA)

### Workflow Engine

| Özellik | Açıklama | Kullanıcı Etkisi |
|---------|----------|------------------|
| State Machine | Çok adımlı iş akışlarını durum makinesi olarak modelleme | Karmaşık süreçler görsel ve anlaşılır hale gelir |
| Conditional Branching | Veri bazlı koşullu dallanma | İş kuralları akış içinde tanımlanır |
| Parallel Execution | Birden fazla görevi eşzamanlı çalıştırma | Süreç süresi kısalır |
| Sub-Flow Delegation | Bir akıştan başka bir akışı tetikleme | Modüler, tekrar kullanılabilir süreçler |
| Timer & Scheduling | Bekleme, hatırlatma ve periyodik tetikleme | SLA takibi, otomatik eskalasyon |

**Teknik referans:** [Workflow](/docs/components/workflow), [Mappings](/docs/components/mappings)

### Task Ecosystem

| Task Türü | Ne Yapar | Kullanım Alanı |
|-----------|----------|----------------|
| HTTP Task | REST API çağrısı | Dış sistem entegrasyonu |
| Condition Task | Veri bazlı karar | İş kuralı dallanması |
| Timer Task | Zaman bazlı bekleme/tetikleme | SLA, eskalasyon |
| Notification Task | Kullanıcıya bildirim | SMS, push, e-posta |
| Script Task | Özel hesaplama/dönüşüm | Faiz hesabı, format dönüşümü |
| DaprService Task | Servisler arası çağrı | Mikroservis iletişimi |
| DaprPubSub Task | Olay yayınlama/tüketme | Event-driven mimari |
| Trigger Task | Dışarıdan tetikleme bekleme | Webhook, callback |

**Teknik referans:** [Task Types](/docs/components/tasks/), [HTTP Task](/docs/components/tasks/http)

### Multi-Domain Architecture

| Özellik | Açıklama | Kullanıcı Etkisi |
|---------|----------|------------------|
| Domain Isolation | Her iş alanı izole runtime | Bağımsız geliştirme ve deploy |
| Per-Domain Database | Alan bazında ayrı veri | Veri güvenliği ve uyumluluk |
| Independent Scaling | Alan bazında ölçeklendirme | Maliyet optimizasyonu |
| Cross-Domain Events | Alanlar arası olay iletişimi | Loosely-coupled entegrasyon |

**Teknik referans:** [Domain Topology](/architecture/domain-model/topology), [Multi-Domain Setup](/docs/getting-started/multi-domain)

### Data & State Management

| Özellik | Açıklama | Kullanıcı Etkisi |
|---------|----------|------------------|
| Instance State Tracking | Her instance'ın anlık durumu | Gerçek zamanlı izleme |
| ETag Concurrency | Eşzamanlılık koruması | Veri kaybı önlenir |
| Audit Trail | Tüm state geçişleri loglanır | Denetlenebilirlik |
| Instance Filtering | Durum bazlı sorgulama | Operasyonel raporlama |

**Teknik referans:** [Instance Data](/docs/concepts/instance-data), [Instance Filtering](/docs/how-to/instance-filtering)

### Version Management

| Özellik | Açıklama | Kullanıcı Etkisi |
|---------|----------|------------------|
| Semantic Versioning | MAJOR.MINOR.PATCH | Değişiklik etkisi net |
| Side-by-Side Versions | Eski ve yeni paralel çalışır | Kesintisiz geçiş |
| Reference Resolution | Major'a sabit referans | Otomatik güncelleme |
| Hot Reload | Çalışan sisteme yeni versiyon | Zero-downtime deploy |

**Teknik referans:** [Versioning](/architecture/patterns/versioning), [References](/architecture/patterns/references)

### Security & Compliance

| Özellik | Açıklama | Kullanıcı Etkisi |
|---------|----------|------------------|
| Vault Integration | Merkezi sır yönetimi | Güvenli credential saklama |
| Domain-Level Access | Alan bazında erişim kontrolü | Veri izolasyonu |
| Full Audit Log | Her işlem kaydedilir | Düzenleyici uyum |
| ETag Protection | Optimistic locking | Concurrent conflict önleme |

**Teknik referans:** [Principles](/architecture/overview/principles)

---

## Planlı Özellikler (Roadmap)

### Kısa Vadeli (Q2-Q3 2026)

| Özellik | Beklenen Etki | Öncelik |
|---------|---------------|---------|
| Visual Workflow Designer | Low-code akış tanımlama arayüzü | 🔴 Yüksek |
| Advanced Monitoring Dashboard | Gerçek zamanlı süreç izleme paneli | 🔴 Yüksek |
| Template Library | Hazır akış şablonları (onboarding, kredi vb.) | 🟡 Orta |

### Orta Vadeli (Q4 2026 - Q1 2027)

| Özellik | Beklenen Etki | Öncelik |
|---------|---------------|---------|
| Self-Service Domain Provisioning | Portal üzerinden yeni domain oluşturma | 🟡 Orta |
| A/B Workflow Testing | Akış versiyonları arası performans karşılaştırma | 🟡 Orta |
| Advanced Analytics | İş süreci analitiği ve darboğaz tespiti | 🟡 Orta |

### Uzun Vadeli (2027+)

| Özellik | Beklenen Etki | Öncelik |
|---------|---------------|---------|
| AI-Assisted Flow Design | Doğal dil ile akış tanımlama | 🟢 Düşük |
| Marketplace | 3. parti bileşen ve entegrasyon mağazası | 🟢 Düşük |
| Multi-Cloud Support | Farklı bulut sağlayıcıları desteği | 🟢 Düşük |

---

## Feature Status Legend

| Simge | Anlam |
|-------|-------|
| ✅ | GA — Production'da kullanılabilir |
| 🔄 | Beta — Test aşamasında |
| 📋 | Planlı — Roadmap'te |
| 💡 | Araştırma — Keşif aşamasında |
