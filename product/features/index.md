---
sidebar_position: 3
title: Özellik Kataloğu
description: vNext platformunun özellik kataloğu — Definition/Schema/Task/Flow modelleme, transition pipeline, scripting, timer/event, caching, gözlemlenebilirlik
---

# Özellik Kataloğu

Bu sayfa, vNext platformunun **mevcut** ve **planlı** özelliklerini ürün yönetimi seviyesinde listeler. Yapı, örnek özellik şablonundaki altı eksene göre organize edilmiştir.

## Özellik Eksenleri (Özet)

| Eksen | Özet |
|-------|------|
| **Definition / Schema / Task / Flow Modelleme** | Süreçleri tanım odaklı (config-driven) modelleme |
| **Transition Pipeline ve Validasyon** | Deterministic, genişletilebilir transition lifecycle |
| **Scripting ve Dinamik Değerlendirme** | Roslyn tabanlı C# script yürütme |
| **Timer ve Event Tabanlı Tetikleme** | Cron + event-driven workflow başlatma |
| **Caching ve Performans Optimizasyonu** | Redis distributed cache, otomatik invalidation |
| **Metrics, Logging, Tracing** | OpenTelemetry ile uçtan uca gözlemlenebilirlik |

---

## 1) Definition / Schema / Task / Flow Tabanlı Modelleme

Süreçler **konfigürasyon** olarak modellenir; her bileşen ayrı bir tanım dosyasına karşılık gelir.

| Bileşen | Rol | Kullanıcı Etkisi |
|---------|-----|------------------|
| **Workflow Definition** | İş akışının state machine tanımı | Süreç yapısı tek bir yerde toplanır |
| **Schema** | Akışın kullandığı veri yapısı (JSON Schema) | Doğrulama merkezi, hata erken yakalanır |
| **Task** | Adımda çalışan iş birimi | Tek tek bileşenler yeniden kullanılır |
| **Function** | Yeniden kullanılabilir mantık parçası | Workflow'lar arası ortak hesaplama |
| **View** | UI render tanımı | Form ve butonlar tanım üzerinden |
| **Mappings** | State'ler arası geçiş kuralları | Akış mantığı açık ve okunabilir |

**Teknik referans:** [Architecture](/architecture/intro), [Workflow](/docs/intro)

## 2) Transition Pipeline ve Validasyon Adımları

vNext'in çekirdek desenlerinden biri **deterministic transition pipeline**'dır.

| Özellik | Açıklama | Kullanıcı Etkisi |
|---------|----------|------------------|
| Pipeline-based Execution | Her transition adımlar dizisi olarak çalışır | Davranış tahmin edilebilir |
| Dynamic Step Planning | Çalışma zamanında direktiflerle yol planlama | Esnek senaryolar mümkün |
| Trigger Handlers | Manual / Automatic / Scheduled / Event ayrımı | Her tetik türü uygun şekilde işlenir |
| Re-entry System | Otomatik ve zamanlanmış transition'ların yeniden girişi | Verimli yürütme |
| Validation Steps | Schema + business rule doğrulama | Hatalı veri akışa giremez |
| Sub-Flow / Sub-Process | Bloklayan / bloklamayan delegasyon | Modüler süreç tasarımı |
| Cross-Schema Support | Sub-flow farklı schema'da çalışabilir | Multi-tenant senaryolar |
| Instance Correlation | Parent-child otomatik takip | Hiyerarşik akışlar yönetilir |

## 3) Scripting ve Dinamik Değerlendirme

**Roslyn tabanlı** C# script motoru ile dinamik mantık platforma yerleşiktir.

| Özellik | Açıklama | Kullanıcı Etkisi |
|---------|----------|------------------|
| Dynamic C# Execution | Çalışma zamanında derlenip yürütülen scriptler | Özel hesaplama platforma sığar |
| Script Logging | Script içinden structured log | Debug ve audit kolaylığı |
| Configuration Access | Script'ten konfigürasyon erişimi | Parametreler dışarıdan yönetilir |
| Sandbox Sınırları | Güvenli yürütme bağlamı | Yan etkiler kontrollü |

**Teknik referans:** [Scripting Engine](/docs/intro)

## 4) Task Ekosistemi

Farklı işlem türlerini tek bir akış içinde birleştiren task tipleri:

| Task Türü | Ne Yapar | Kullanım Alanı |
|-----------|----------|----------------|
| **HTTP** | REST API çağrısı | Dış sistem entegrasyonu |
| **DaprService** | Servisler arası çağrı (service invocation) | Mikroservis iletişimi |
| **DaprPubSub** | Olay yayınlama/tüketme | Event-driven mimari |
| **Condition** | Veri bazlı karar | İş kuralı dallanması |
| **Timer** | Zaman bazlı bekleme/tetikleme | SLA, eskalasyon |
| **Notification** | Kullanıcıya bildirim | SMS, push, e-posta |
| **Script** | Özel hesaplama/dönüşüm (Roslyn) | Faiz, format dönüşümü |
| **SubFlow** | Bloklayan alt akış tetikleme | Hiyerarşik süreçler |
| **SubProcess** | Bloklamayan alt akış tetikleme | Paralel iş kalemleri |
| **Function** | Yeniden kullanılabilir mantık | Ortak hesaplama / validasyon |
| **Trigger** | Dışarıdan tetikleme bekleme | Webhook, callback |

## 5) Timer ve Event Tabanlı Tetikleme

| Özellik | Açıklama | Kullanıcı Etkisi |
|---------|----------|------------------|
| **Auto Transition** | Otomatik geçiş değerlendirmesi | İnsan müdahalesi olmadan ilerleme |
| **Timer Execution** | Cron + delay tabanlı zamanlama | Periyodik raporlama, hatırlatma |
| **Event-Driven Trigger** | Dapr pub/sub ile akış başlatma | Sistemler arası gevşek bağlı koordinasyon |
| **Scheduled Workflow** | Belirli zamanda başlayan akış | Gece sonu süreçleri |

**Teknik referans:** [Auto Transition](/docs/intro), [Timer Execution](/docs/intro)

## 6) Caching ve Performans Optimizasyonu

| Özellik | Açıklama | Kullanıcı Etkisi |
|---------|----------|------------------|
| **Distributed Cache (Redis)** | Sık erişilen tanımlar için merkezi cache | Düşük gecikme, yüksek throughput |
| **Automatic Invalidation** | Cache tutarlılığı otomatik yönetilir | Veri tutarlılığı korunur |
| **Task Factory & Pooling** | Task instance havuzu | Bellek optimizasyonu |
| **Caching Strategy** | Farklı katmanlar için cache pattern'leri | Yük altında stabil performans |

## 7) Metrics, Logging, Tracing

| Özellik | Açıklama | Kullanıcı Etkisi |
|---------|----------|------------------|
| **OpenTelemetry** | Distributed tracing + structured logging | Uçtan uca süreç görünürlüğü |
| **Cache Metrics** | Redis performans metriklerinin saklanması | Cache hit/miss izleme |
| **Database Metrics** | PostgreSQL performans metrikleri | DB darboğaz tespiti |
| **Persistent Metrics (ClickHouse)** | Uzun vadeli metrik saklama | Trend analizi, SLA raporu |
| **Custom Spans & Events** | Akış adımları için özel trace span'leri | Detaylı debugging |
| **Health Endpoints** | Her host için sağlık kontrolü | Operasyonel görünürlük |

## 8) Multi-Domain ve Multi-Schema

| Özellik | Açıklama | Kullanıcı Etkisi |
|---------|----------|------------------|
| **Domain Isolation** | Her iş alanı izole runtime + DB + messaging | Bağımsız geliştirme ve deploy |
| **Multi-Schema** | Dinamik schema oluşturma | Multi-tenant senaryolar |
| **Cross-Domain Events** | Alanlar arası olay iletişimi | Loosely-coupled entegrasyon |
| **Independent Scaling** | Alan bazında ölçeklendirme | Maliyet optimizasyonu |

## 9) Veri ve State Yönetimi

| Özellik | Açıklama | Kullanıcı Etkisi |
|---------|----------|------------------|
| **Instance State Tracking** | Her instance'ın anlık durumu | Gerçek zamanlı izleme |
| **ETag Concurrency** | Optimistic locking | Eşzamanlı erişimde veri kaybı önlenir |
| **Audit Trail** | Tüm state geçişleri loglanır | Denetlenebilirlik |
| **Instance Filtering** | Durum bazlı sorgulama (tek filter string) | Operasyonel raporlama |
| **Instance Hierarchy** | Subflow'lar ile parent-child ağacı | Hiyerarşik görünüm |

## 10) Versiyon Yönetimi

| Özellik | Açıklama | Kullanıcı Etkisi |
|---------|----------|------------------|
| **Semantic Versioning** | MAJOR.MINOR.PATCH | Değişiklik etkisi net |
| **Side-by-Side Versions** | Eski ve yeni paralel çalışır | Kesintisiz geçiş |
| **Reference Resolution** | Major'a sabit referans | Otomatik güncelleme |
| **Hot Reload (Init Service)** | Çalışan sisteme yeni sürüm | Zero-downtime deploy |
| **Breaking Changes Discipline** | Kırıcı değişiklik resmi duyurusu | Migration adımları açık |

## 11) Güvenlik ve Uyumluluk

| Özellik | Açıklama | Kullanıcı Etkisi |
|---------|----------|------------------|
| **Dapr Secrets Integration** | Merkezi sır yönetimi (Vault, K8s secrets) | Güvenli credential saklama |
| **Domain-Level Access** | Alan bazında erişim kontrolü | Veri izolasyonu |
| **Field-Level Visibility** | Master schema `roles` ile alan görünürlüğü | Hassas veri rol bazlı korunur |
| **Full Audit Log** | Her işlem kaydedilir | Düzenleyici uyum |
| **ETag Protection** | Optimistic locking | Concurrent conflict önleme |
| **QueryExtensions Security** | Injection koruması | Güvenli sorgular |

## 12) Background Processing

| Özellik | Açıklama | Kullanıcı Etkisi |
|---------|----------|------------------|
| **Inbox Worker** | Gelen olayların idempotent işlenmesi | Olay kaybı yok |
| **Outbox Worker** | Giden mesajların güvenli yayınlanması | Mesaj kaybı yok |
| **Dapr-based Job Scheduling** | Asenkron iş zamanlaması | Uzun süren işler arka planda |
| **Retry Policy** | Geçici hatalarda kontrollü yeniden deneme | Dış sistem dayanıklılığı |

---

## Planlı Özellikler (Roadmap Özeti)

| Faz | Özellik | Beklenen Etki |
|-----|---------|---------------|
| **Now (0-3 ay)** | Documentation platform, Operational metrik standardı, Citizen developer kılavuzları | Platform kullanımının olgunlaşması |
| **Next (3-6 ay)** | Visual Workflow Designer, Template Library, Geliştirici deneyimi iyileştirmeleri | Low-code yetenekleri |
| **Later (6+ ay)** | Self-Service Domain Portal, Multi-Cloud, AI-Assisted Flow Design, Marketplace | Global ölçek ve ekosistem |

> Detaylı roadmap için [Roadmap](../roadmap/) sayfasına bakın.

## Feature Status Legend

| Simge | Anlam |
|-------|-------|
| ✅ | GA — Production'da kullanılabilir |
| 🔄 | Beta — Test aşamasında |
| 📋 | Planlı — Roadmap'te |
| 💡 | Araştırma — Keşif aşamasında |

## İlgili Sayfalar

- [Ürün Vizyonu](../overview/)
- [Hedef Kullanıcılar (Persona)](../personas/)
- [Ürün Yönü ve Sınırlar](../direction-scope/)
- [Roadmap](../roadmap/)
- [Release Strategy](../release-strategy/)
