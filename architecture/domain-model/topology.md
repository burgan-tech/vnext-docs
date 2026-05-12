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
```
Onboarding Domain
├── vNext Runtime (onboarding)
├── Database (onboarding_db)
├── PubSub (onboarding_events)
└── State Store (onboarding_state)
```

**Örnek:** Müşteri kabul süreçlerini yöneten onboarding ekibinin kendi domain'i.

### Ekip Sorumluluğu Bazlı Domainler
```
Entegrasyon Ekibi
├── IDM Domain (Kimlik yönetimi)
│   ├── vNext Runtime (idm)
│   └── Infrastructure
└── Notification Domain (Bildirim servisleri)
    ├── vNext Runtime (notification)
    └── Infrastructure
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
```
┌─────────────┐      API Gateway      ┌─────────────┐
│  Onboarding │◄──────────────────────►│     IDM     │
│   Domain    │    REST/HTTP Calls     │   Domain    │
└─────────────┘                        └─────────────┘
```

- Senkron iletişim
- REST API çağrıları
- HTTP Task kullanımı

### 2. Event-Driven Yapılar
```
┌─────────────┐                        ┌─────────────┐
│  Payments   │──┐                  ┌──│Notification │
│   Domain    │  │  Event Bus       │  │   Domain    │
└─────────────┘  │  (PubSub)        │  └─────────────┘
                 │                  │
                 ├─────────┬────────┤
                 │         │        │
                 └────────Event────┘
```

- Asenkron iletişim
- Event-based entegrasyon
- Gevşek bağlılık (Loose coupling)
- DaprPubSub Task kullanımı

## Multi-Domain Architecture (Context Seviyesi)

C4 Context seviyesinde vNext platformunun farklı domain'leri, kullanıcılar ve dış sistemler arasındaki ilişki:

```mermaid
flowchart TB
    customer([Müşteri<br/>Mobil/Web])
    employee([Çalışan<br/>Backoffice])
    extapi[/Dış Sistemler<br/>Banka • Ödeme • KYC/]

    apigw{{API Gateway}}
    eventbus{{Event Bus<br/>Dapr Pub/Sub}}

    subgraph vnext [vNext Platform]
        onb[Onboarding Domain<br/>vNext Runtime]
        idm[IDM Domain<br/>vNext Runtime]
        notif[Notification Domain<br/>vNext Runtime]
        pay[Payment Domain<br/>vNext Runtime]
    end

    customer -->|HTTPS| apigw
    employee -->|HTTPS| apigw

    apigw -->|HTTP/REST| onb
    apigw -->|HTTP/REST| idm
    apigw -->|HTTP/REST| notif
    apigw -->|HTTP/REST| pay

    onb -->|Kimlik doğrulama<br/>HTTP/REST| idm
    onb -->|Bildirim<br/>Event| eventbus
    pay -->|SMS/Push<br/>Event| eventbus
    eventbus -->|Event tüketir| notif

    onb -->|KYC sorgu<br/>HTTPS| extapi
    pay -->|Ödeme<br/>HTTPS| extapi
```

> **Not:** Mermaid C4 sözdiziminin Docusaurus desteği sınırlı olduğu için `flowchart` ile C4-benzeri sunum yapılır; semantik aynıdır.

## Single Domain Internal Structure (Container Seviyesi)

Bir domain içinde çalışan vNext bileşenleri:

```mermaid
flowchart TB
    user([Kullanıcı<br/>Domain kullanıcısı])

    subgraph domain [vNext Domain — örn: Onboarding]
        orch[Orchestration API<br/>BBT.Workflow.Orchestration.HttpApi.Host<br/>:4201]
        exec[Execution API<br/>BBT.Workflow.Execution.HttpApi.Host<br/>:4202]
        wrkin[Inbox Worker<br/>BBT.Workflow.Workers.Inbox]
        wrkout[Outbox Worker<br/>BBT.Workflow.Workers.Outbox]
        init[Init Service<br/>Hot reload + seed]

        db[(Domain Database<br/>PostgreSQL)]
        state[(State Store<br/>Redis / Dapr)]
        psub{{Pub/Sub<br/>RabbitMQ • Kafka • ASB<br/>via Dapr}}
    end

    extsvc[/Dış Servisler<br/>API • Webhook • SMTP/]

    user -->|HTTPS REST| orch
    orch -->|Dapr service invocation| exec
    orch -->|Instance CRUD<br/>SQL| db
    orch -->|State<br/>Dapr State API| state
    orch -->|Event<br/>Dapr Pub/Sub| psub

    exec -->|HTTP / SMTP / S3 task| extsvc
    exec -->|Data okur/yazar<br/>SQL| db
    exec -->|Cache<br/>Dapr State API| state
    exec -->|outbox write<br/>SQL| db

    wrkout -->|drain| db
    wrkout -->|publish| psub
    psub -->|consume| wrkin
    wrkin -->|dedupe + apply<br/>SQL| db

    init -.->|Schema + seed<br/>SQL| db
    init -.->|System flow deploy<br/>Internal API| orch
    init -.->|Hot reload| exec
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

- [Database Architecture](/architecture/data/database) — Domain seviyesinde veritabanı yapısı
- [Persistence](/architecture/data/persistence) — Veri saklama stratejileri, Inbox/Outbox
- [Runtime](/architecture/runtime/) — Orchestration / Execution / Workers detayları
- [Observability](/architecture/infrastructure/observability) — Domain bazlı izleme
- [Çekirdek Prensipler — Domain-Driven](/architecture/overview/principles#2-domain-driven-architecture)