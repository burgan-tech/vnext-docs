---
sidebar_position: 4
title: Ürün Yönü ve Sınırlar
description: vNext'in ürün yönü — citizen developer enablement, Dapr connector ekosistemi, cloud-native SaaS hedefi, global ölçek vizyonu ve sınır notları
---

# Ürün Yönü ve Sınırlar

Bu sayfa, vNext'in **ürün yönünü** ve **sınırlarını** netleştirir: hangi yönlere yatırım yapılır, hangi sorumluluklar ürün dışında bırakılır?

## Ürün Yönünün Dört Ekseni

```mermaid
graph TB
    D1[Citizen Developer Enablement]
    D2[Dapr Connector Ekosistemi]
    D3[Cloud-Native SaaS Hedefi]
    D4[Global Ölçek Vizyonu]
    P[vNext Ürün Yönü]
    D1 --> P
    D2 --> P
    D3 --> P
    D4 --> P
```

## 1. Citizen Developer Enablement

**Hedef:** Teknik olmayan veya az kod yazan ekiplerin de süreç uygulamaları geliştirebilmesini sağlamak.

**Bunu mümkün kılan yatırımlar:**

- Tanım odaklı (config-driven) workflow modeli — kodlama yerine deklaratif tanım
- Hazır task tipleri (HTTP, Condition, Timer, Notification, Script, SubFlow, DaprPubSub, DaprService)
- Şablon kütüphanesi (planlı) — yaygın senaryolar için referans
- Visual workflow designer (roadmap'te) — sürükle-bırak tasarım
- Self-service domain portal (roadmap'te) — alan oluşturma ve yönetim arayüzü
- Doğrulama ve hata mesajları — analist seviyesinde okunabilir

**Sınır:** Citizen developer yaklaşımı, profesyonel geliştirici rolünü ortadan kaldırmaz. Karmaşık iş mantığı, özel scripting ve performans-kritik bileşenler hâlâ uygulama geliştiricilerinin sorumluluğundadır.

## 2. Dapr Connector Ekosistemi

**Hedef:** Dapr üzerinden hazır entegrasyon bileşenlerinden faydalanmak ve sağlayıcı bağımsızlığı sağlamak.

**vNext, Dapr building block'larını birinci sınıf olarak kullanır:**

| Building Block | vNext'te Kullanımı |
|----------------|-------------------|
| **Service Invocation** | İç ve dış REST servislerine standart çağrı (DaprService task) |
| **Pub/Sub** | Olay tabanlı entegrasyon — Kafka, RabbitMQ, Redis, Azure Service Bus (DaprPubSub task) |
| **Bindings** | Input/output bağlayıcılar — SMTP, S3, SFTP, Kafka, vb. |
| **State Management** | Durum bilgisinin sağlayıcı bağımsız saklanması |
| **Secrets** | Credential'ların merkezi yönetimi (Vault, Kubernetes secrets, vb.) |

**Avantajlar:**

- **Vendor lock-in yok** — sağlayıcı değişikliği tanım değişikliği gerektirir, kod değil
- **Açık standartlar** — CloudEvents formatı, gRPC/HTTP arayüzleri
- **Topluluk ekosistemi** — Dapr'ın aktif geliştirilen connector kütüphanesinden yararlanma
- **Operasyonel olgunluk** — production-ready, geniş gözlemlenebilirlik desteği

**Sınır:** vNext tüm Dapr connector'larını paketle birlikte sunmaz; her kurumun ihtiyaç duyduğu sağlayıcılar (broker, secret store, vb.) altyapı seviyesinde kurulur ve yapılandırılır.

## 3. Cloud-Native SaaS Hedefi

**Hedef:** Ürünü çok kiracılı (multi-tenant), yüksek erişilebilir ve operasyonel olarak ölçeklenebilir bir SaaS platforma dönüştürmek.

**Mevcut destekler:**

- Multi-schema mimarisi — tek instance üzerinde çoklu tenant
- Domain bazında izolasyon — runtime + database + messaging
- Konteynerleştirilmiş deployment (Docker, Kubernetes uyumlu)
- Stateless API host'ları — yatay ölçeklenmeye doğal uyum
- Asenkron worker'lar (Inbox/Outbox) — yük altında dayanıklılık
- Health endpoint'ler ve metric standardı

**Planlanan:**

- **Self-service onboarding** — yeni tenant oluşturma akışı
- **Operasyonel guardrail'ler** — tenant bazlı kota, rate limit, izolasyon kontrolleri
- **Kullanım bazlı ölçek (usage-based scaling)** — gerçek talebe göre otomatik kaynak ayarlama
- **Subscription & billing** entegrasyonları

**Sınır:** Cloud-native SaaS olgunlaşması bir süreçtir; mevcut kurumlar on-prem veya hybrid kurulumlarda da çalıştırabilir, ancak ürün yönü SaaS modelini önceliklendirir.

## 4. Global Ölçek Vizyonu

**Hedef:** Farklı coğrafyalarda çalışabilecek, regülasyon ve performans ihtiyaçlarına uyarlanabilir bir yapı.

**Bu yön kapsamında değerlendirilenler:**

- **Bölgesel dağıtım** — birden fazla coğrafi bölgede aktif kurulumlar
- **Veri yerelliği (data residency)** — KVKK, GDPR, sektörel regülasyonlara uyum
- **Multi-cloud desteği** — AWS, Azure, GCP arasında taşınabilirlik
- **Bölgesel performans** — düşük gecikmeli erişim için CDN/edge stratejileri
- **Lokalizasyon** — dil, takvim, para birimi farklılıkları
- **Disaster recovery** — bölgeler arası yedeklilik ve failover

**Sınır:** Global ölçek vizyonu uzun vadelidir (roadmap'te "Later"). İlk fazda Türkiye/bölgesel bankacılık odağı korunur, küresel açılım faz faz hayata geçirilir.

## Ürünün Açık Sınırları (Out of Scope)

Aşağıdaki sorumluluklar ürünün dışındadır ve **domain ekipleriyle birlikte yürütülür**:

| Konu | vNext'in Yaklaşımı |
|------|--------------------|
| **Kurumsal iş uygulaması geliştirme** | Ürün bir süreç orkestrasyon platformudur; kurumlara özel uçtan uca uygulama geliştirme sorumluluğu domain ekiplerinde kalır |
| **Özel UI / Frontend** | View tanımları platform tarafında, kurumsal frontend uygulamaları (mobil/web) ayrıdır |
| **Hesap muhasebesi, core banking** | Core sistem entegre edilir, içselleştirilmez |
| **CRM, ERP, ürün katalog** | Dış sistem olarak entegre edilir |
| **AI/ML model eğitimi** | Modeller dışarıda eğitilir, vNext tahmin servislerini çağırır |
| **Endüstri-özel iş mantığı** | Domain ekipleri kendi kurallarını tanımlar; platform genel motor sunar |
| **Custom connector geliştirme** | Dapr ekosistemindeki connector'lar kullanılır; özel ihtiyaçlar HTTP task ile karşılanır |

## Bu Yönlerin Birbiriyle İlişkisi

```mermaid
graph LR
    CD[Citizen Developer] -->|kullanır| DC[Dapr Connectors]
    CD -->|barınır| SaaS[Cloud-Native SaaS]
    DC -->|standardize eder| SaaS
    SaaS -->|genişler| GS[Global Ölçek]
    GS -->|bölgesel uyum| SaaS
```

- **Citizen developer**, hızlı süreç inşası için **Dapr connector**'larını kullanır
- **SaaS** modeli, citizen developer'ların self-service çalışmasını mümkün kılar
- **Global ölçek**, SaaS işletim modelini uluslararası seviyeye taşır

## İlgili Sayfalar

- [Ürün Vizyonu](../overview/) — Konumlandırma ve hedef pazar
- [Roadmap](../roadmap/) — Bu yönlerin zaman çizelgesi
- [Feature Catalog](../features/) — Mevcut yetenekler
- [Manifesto](/business/manifesto/) — Bu yönlerin felsefi temeli
