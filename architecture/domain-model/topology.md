---
sidebar_position: 2
title: Domain Topology
description: Domain konsepti, runtime izolasyonu, multi-domain örneği
---

# Domain Topolojisi ve Mimari

## Platform Domain Kavramı

vNext Runtime platformu, **Domain** kavramını temel alır. Domain, bir iş alanını, ürün grubunu veya ekip sorumluluğunu temsil eden izole edilmiş bir runtime ortamıdır.

### Domain = Runtime Prensibi

**Her domain, kendi bağımsız runtime'ına sahiptir.** Bu prensip, platformun temel mimarisini oluşturur:

- Bir domain = Bir vNext Runtime instance
- Her domain tekil ve bağımsızdır
- Domainler arası izolasyon tam olarak sağlanır

## Domain Örnekleri

Bir kurumda domainler şu şekilde organize edilebilir:

### Ürün Grubu Bazlı Domain

```mermaid
graph LR
  OD["Onboarding Domain"]
  OD --> RT["vNext Runtime<br/>(onboarding)"]
  OD --> DB[("onboarding_db")]
  OD --> PS["PubSub<br/>(onboarding_events)"]
  OD --> SS["State Store<br/>(onboarding_state)"]

  style OD fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style RT fill:#e0f2fe,stroke:#0369a1,color:#1e293b
  style DB fill:#fae8ff,stroke:#86198f,color:#1e293b
  style PS fill:#fef3c7,stroke:#b45309,color:#1e293b
  style SS fill:#fef3c7,stroke:#b45309,color:#1e293b
```

**Örnek:** Müşteri kabul süreçlerini yöneten onboarding ekibinin kendi domain'i.

### Ekip Sorumluluğu Bazlı Domainler

```mermaid
graph LR
  Team["Entegrasyon Ekibi"]

  subgraph idm["IDM Domain"]
    IDM_RT["vNext Runtime (idm)"]
    IDM_INF["Infrastructure"]
  end

  subgraph notif["Notification Domain"]
    NOT_RT["vNext Runtime (notification)"]
    NOT_INF["Infrastructure"]
  end

  Team --> idm
  Team --> notif

  style Team fill:#dcfce7,stroke:#15803d,color:#1e293b
  style idm fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style notif fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style IDM_RT fill:#e0f2fe,stroke:#0369a1,color:#1e293b
  style IDM_INF fill:#f1f5f9,stroke:#475569,color:#1e293b
  style NOT_RT fill:#e0f2fe,stroke:#0369a1,color:#1e293b
  style NOT_INF fill:#f1f5f9,stroke:#475569,color:#1e293b
```

**Örnek:** Entegrasyon ekibi, sorumluluğundaki IDM ve Notification sistemlerini ayrı domainler olarak yönetir.

## Domain İzolasyonunun Faydaları

### 1. Altyapı İzolasyonu
Her domain kendi altyapı bileşenlerine sahiptir:
- **Database**: Domain'e özel veritabanı
- **PubSub**: Domain'e özel mesajlaşma kanalları
- **State Store**: Domain'e özel durum yönetimi
- **Secrets**: Domain'e özel güvenlik yapılandırması

### 2. Bağımsız Geliştirme
- Her domain ekibi kendi hızında gelişebilir
- Domain'ler arası bağımlılık minimum seviyededir
- Versiyon yönetimi domain bazlı yapılır
- Deployment bağımsız gerçekleştirilir

### 3. Ölçeklenebilirlik
- Her domain ihtiyacına göre ölçeklendirilir
- Yüksek yük alan domain'ler daha fazla kaynak alabilir
- Düşük yük alan domain'ler minimum kaynakla çalışır
- Kaynak kullanımı optimize edilir

### 4. Hata İzolasyonu
- Bir domain'deki sorun diğerlerini etkilemez
- Yedekleme ve geri yükleme domain bazlı yapılır
- Bakım ve güncelleme bağımsız planlanır

## Domainler Arası İletişim

Domainler birbirinden izole olmasına rağmen, iş gereksinimleri doğrultusunda iletişim kurabilirler:

### 1. API Gateway Üzerinden

```mermaid
flowchart LR
  OB["Onboarding<br/>Domain"] <-->|REST/HTTP| GW{{"API Gateway"}} <-->|REST/HTTP| IDM["IDM<br/>Domain"]

  style OB fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style GW fill:#fef3c7,stroke:#b45309,color:#1e293b
  style IDM fill:#dbeafe,stroke:#1e40af,color:#1e293b
```

- Senkron iletişim
- REST API çağrıları
- HTTP Task kullanımı

### 2. Event-Driven Yapılar

```mermaid
flowchart LR
  PAY["Payments<br/>Domain"] -->|Publish| EB{{"Event Bus<br/>(PubSub)"}} -->|Subscribe| NOT["Notification<br/>Domain"]

  style PAY fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style EB fill:#fef3c7,stroke:#b45309,color:#1e293b
  style NOT fill:#dbeafe,stroke:#1e40af,color:#1e293b
```

- Asenkron iletişim
- Event-based entegrasyon
- Gevşek bağlılık (Loose coupling)
- DaprPubSub Task kullanımı

## C4 Context Diagram - Multi-Domain Architecture

```mermaid
flowchart TB
  Customer["Musteri<br/><i>Mobil / Web</i>"]
  Employee["Calisan<br/><i>Backoffice</i>"]
  ExtSys["Dis Sistemler<br/><i>Banka, Odeme, KYC</i>"]

  GW{{"API Gateway"}}
  EvBus{{"Event Bus<br/>(PubSub)"}}

  subgraph platform["vNext Platform"]
    Onb["Onboarding Domain<br/><i>Musteri kabul surecleri</i>"]
    IDM["IDM Domain<br/><i>Kimlik ve yetkilendirme</i>"]
    Notif["Notification Domain<br/><i>Bildirim servisleri</i>"]
    Pay["Payment Domain<br/><i>Odeme surecleri</i>"]
  end

  Customer -->|HTTPS| GW
  Employee -->|HTTPS| GW
  GW -->|HTTP/REST| Onb
  GW -->|HTTP/REST| IDM
  GW -->|HTTP/REST| Notif
  GW -->|HTTP/REST| Pay

  Onb -->|"Kimlik dogrulama"| IDM
  Onb -->|"KYC sorgulamasi"| ExtSys
  Pay -->|"Odeme islemi"| ExtSys

  Onb -->|"Event yayinlar"| EvBus
  Pay -->|"Event yayinlar"| EvBus
  EvBus -->|"Event tuketir"| Notif

  style Customer fill:#dcfce7,stroke:#15803d,color:#1e293b
  style Employee fill:#dcfce7,stroke:#15803d,color:#1e293b
  style ExtSys fill:#fef3c7,stroke:#b45309,color:#1e293b
  style GW fill:#fef3c7,stroke:#b45309,color:#1e293b
  style EvBus fill:#fef3c7,stroke:#b45309,color:#1e293b
  style platform fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style Onb fill:#e0f2fe,stroke:#0369a1,color:#1e293b
  style IDM fill:#e0f2fe,stroke:#0369a1,color:#1e293b
  style Notif fill:#e0f2fe,stroke:#0369a1,color:#1e293b
  style Pay fill:#e0f2fe,stroke:#0369a1,color:#1e293b
```

## C4 Container Diagram - Domain Ici Yapi

```mermaid
flowchart TB
  User["Kullanici<br/><i>Domain kullanicisi</i>"]
  ExtSvc["Dis Servisler<br/><i>API, webhooks</i>"]

  subgraph domain["vNext Domain (orn: Onboarding)"]
    Orch["vnext-app<br/><i>Orchestration Service</i>"]
    Exec["vnext-execution-app<br/><i>Execution Service</i>"]
    Init["vnext-init<br/><i>Seed Service</i>"]
    DB[("Domain Database<br/><i>PostgreSQL</i>")]
    State[("State Store<br/><i>Redis / Dapr</i>")]
    PubSub["PubSub<br/><i>RabbitMQ / Dapr</i>"]
  end

  User -->|"HTTPS/REST"| Orch
  Orch -->|"Instance CRUD (SQL)"| DB
  Orch -->|"Task calistir (Dapr)"| Exec
  Orch -->|"State okur/yazar"| State
  Orch -->|"Event pub/sub"| PubSub

  Exec -->|"HTTP Task"| ExtSvc
  Exec -->|"Data okur (SQL)"| DB
  Exec -->|"Cache kullanir"| State

  Init -->|"Schema DDL, seed"| DB
  Init -->|"System flow deploy"| Orch

  style User fill:#dcfce7,stroke:#15803d,color:#1e293b
  style ExtSvc fill:#fef3c7,stroke:#b45309,color:#1e293b
  style domain fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style Orch fill:#e0f2fe,stroke:#0369a1,color:#1e293b
  style Exec fill:#e0f2fe,stroke:#0369a1,color:#1e293b
  style Init fill:#e0f2fe,stroke:#0369a1,color:#1e293b
  style DB fill:#fae8ff,stroke:#86198f,color:#1e293b
  style State fill:#fae8ff,stroke:#86198f,color:#1e293b
  style PubSub fill:#fef3c7,stroke:#b45309,color:#1e293b
```

## Domain Yönetimi Best Practices

### Domain Sınırlarını Doğru Belirleyin
- **İş alanına göre**: Her domain belirli bir iş fonksiyonunu temsil etmeli
- **Ekip sorumluluğuna göre**: Domain sahipliği net olmalı
- **Ölçek ihtiyacına göre**: Farklı yük karakteristiklerine sahip alanlar ayrı domain'ler olmalı

### Domain İzolasyonunu Koruyun
- Domain'ler arası doğrudan database erişimi yasaktır
- Tüm iletişim API veya Event üzerinden olmalı
- Shared infrastructure minimize edilmeli

### Monitoring ve Observability
- Her domain için ayrı monitoring dashboard'ları
- Domain bazlı metrik toplama
- Distributed tracing ile domain'ler arası çağrı takibi

### Versiyon Yönetimi
- Domain'ler bağımsız versiyonlanır
- API contract'ları semantic versioning ile yönetilir
- Breaking change'ler koordine edilir ancak deployment bağımsızdır

## Domain Lifecycle

### 1. Domain Oluşturma
```bash
# Infrastructure provisioning
- Domain database oluşturma
- Domain state store yapılandırması
- Domain PubSub konfigürasyonu

# vNext Runtime deployment
- vnext-init ile system kurulum
- vnext-app deployment
- vnext-execution-app deployment
```

### 2. Domain İşletimi
- Flow deployment ve yönetim
- Monitoring ve alerting
- Scaling ve optimization
- Backup ve disaster recovery

### 3. Domain Retirement
- Migration planlaması
- Dependency analizi
- Graceful shutdown
- Data archiving

## Sonuç

Domain topolojisi, vNext Runtime platformunun ölçeklenebilir, esnek ve yönetilebilir olmasını sağlayan temel mimari karardır. Her domain'in bağımsız runtime'a sahip olması, ekiplerin hızlı hareket etmesini, sistemin dayanıklı olmasını ve kaynakların verimli kullanılmasını mümkün kılar.

## İlgili Dökümanlar

- [Database Architecture](/architecture/data/database) - Domain seviyesinde veritabanı yapısı
- [Persistence](/architecture/data/persistence) - Veri saklama stratejileri