---
sidebar_position: 2
title: Database Architecture
description: Multi-schema DB yapısı, migration sistemi, izolasyon
---

# Veritabanı Mimarisi

## Domain Seviyesinde Veritabanı İzolasyonu

vNext Runtime platformunda her domain, kendi bağımsız veritabanına sahiptir. Bu yaklaşım, domain'ler arası tam veri izolasyonu sağlar ve güvenlik ile veri bütünlüğü açısından kritik öneme sahiptir.

### Veritabanı İzolasyonunun Prensipleri

```mermaid
flowchart TB
  subgraph platform["vNext Platform"]
    subgraph onb["Onboarding Domain"]
      onb_db[("onboarding_db")]
    end
    subgraph idm_d["IDM Domain"]
      idm_db[("idm_db")]
    end
    subgraph notif_d["Notification Domain"]
      notif_db[("notification_db")]
    end
    subgraph pay_d["Payment Domain"]
      pay_db[("payment_db")]
    end
  end

  style platform fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style onb fill:#e0f2fe,stroke:#0369a1,color:#1e293b
  style idm_d fill:#e0f2fe,stroke:#0369a1,color:#1e293b
  style notif_d fill:#e0f2fe,stroke:#0369a1,color:#1e293b
  style pay_d fill:#e0f2fe,stroke:#0369a1,color:#1e293b
  style onb_db fill:#fae8ff,stroke:#86198f,color:#1e293b
  style idm_db fill:#fae8ff,stroke:#86198f,color:#1e293b
  style notif_db fill:#fae8ff,stroke:#86198f,color:#1e293b
  style pay_db fill:#fae8ff,stroke:#86198f,color:#1e293b
```

**Temel Prensipler:**
- Her domain = Bir veritabanı
- Domain'ler arası direkt veritabanı erişimi yasaktır
- Veri paylaşımı sadece API veya Event üzerinden olur
- Her domain kendi data governance politikalarını uygular

## Multi-Flow Şema Yapısı

vNext Runtime, veritabanı içinde **multi-flow şema** (multi-schema) yaklaşımını kullanır. Bu yapı, farklı flow'ların ve sistem bileşenlerinin veritabanı objelerini organize eder.

### Sistem Şemaları (System Schemas)

Platform başlatıldığında otomatik olarak **6 temel sistem şeması** oluşturulur:

#### 1. sys_flows
```sql
-- Flow tanımlarının saklandığı şema
sys_flows
```
**İçerik:** Workflow tanımları, state yapıları, transition kuralları, versiyon bilgileri.

#### 2. sys_views
```sql
-- View tanımlarının saklandığı şema
sys_views
```
**İçerik:** UI view tanımları, şablonlar, platform override'ları.

#### 3. sys_functions
```sql
-- Function API'lerinin saklandığı şema
sys_functions
```
**İçerik:** Sistem function'ları (State, Data, View API'leri), yetkilendirme kuralları.

#### 4. sys_tasks
```sql
-- Task tanımlarının saklandığı şema
sys_tasks
```
**İçerik:** HTTP, Script, Timer, Condition ve diğer task türlerinin tanımları.

#### 5. sys_extensions
```sql
-- Extension ve plugin'lerin saklandığı şema
sys_extensions
```
**İçerik:** Sistem uzantıları, özel plugin'ler, genişletme noktaları.

#### 6. sys_schemas
```sql
-- Şema metadata'sının saklandığı şema
sys_schemas
```
**İçerik:** Tüm şemaların kaydı, migration geçmişi, versiyon takibi.

## Flow-Specific Şemalar (Dinamik Şemalar)

Flow başına veritabanı şemaları instance verisi ve geçmişi tutar. itibarıyla şema **oluşturma ve migration**, her **start** veya **transition** isteğinde kontrol çalıştırmak yerine **deploy** sırasında çalışan **DB-Migrator job** ile yönetilir.

### Deploy zamanı şema yaşam döngüsü

```mermaid
flowchart LR
  A["Flow / runtime<br/>deploy"] --> B["DB-Migrator<br/>job calisir"] --> C["Semalar olusturulur<br/>veya migrate edilir"] --> D["Runtime trafigi<br/>karsilar"]

  style A fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style B fill:#fef3c7,stroke:#b45309,color:#1e293b
  style C fill:#fae8ff,stroke:#86198f,color:#1e293b
  style D fill:#dcfce7,stroke:#15803d,color:#1e293b
```

**Örnek:**

```mermaid
flowchart TB
  S1["Deployment: customer-onboarding flow (v1.0.0)"] --> S2["DB-Migrator job calisir<br/>(deployment pipeline)"]
  S2 --> S3["customer_onboarding semasi<br/>olusturulur veya guncellenir"]
  S3 --> S4["Gerekli migration scriptleri<br/>calistirilir"]
  S4 --> S5["Flow hazir<br/>(ilk start/transition oncesi)"]

  style S1 fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style S2 fill:#fef3c7,stroke:#b45309,color:#1e293b
  style S3 fill:#fae8ff,stroke:#86198f,color:#1e293b
  style S4 fill:#fae8ff,stroke:#86198f,color:#1e293b
  style S5 fill:#dcfce7,stroke:#15803d,color:#1e293b
```

## Otomatik Migration Sistemi

Şema değişiklikleri **migrator** ve **`sys_schemas`** geçmişi üzerinden kontrollü uygulanır; her API isteğine migration bağlanmaz.

### İlk deploy

```mermaid
flowchart TB
  D1["Flow ilk kez deploy edilir"] --> D2["Sema henuz yok"]
  D2 --> D3["DB-Migrator job<br/>semayi olusturur"]
  D3 --> D4["Tablolar, index'ler<br/>ve seed uygulanir"]
  D4 --> D5["Instance start/transition<br/>migrate kontrolu tetiklemez"]

  style D1 fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style D2 fill:#f1f5f9,stroke:#475569,color:#1e293b
  style D3 fill:#fef3c7,stroke:#b45309,color:#1e293b
  style D4 fill:#fae8ff,stroke:#86198f,color:#1e293b
  style D5 fill:#dcfce7,stroke:#15803d,color:#1e293b
```

### Sistem yükseltmesi

```mermaid
flowchart TB
  U1["vNext Runtime<br/>yeni versiyon"] --> U2["Deploy pipeline<br/>DB-Migrator calistirir"]
  U2 --> U3["Eksik migration'lar<br/>tespit edilir"]
  U3 --> U4["Migration scriptleri<br/>calistirilir"]
  U4 --> U5["Sema basina<br/>migration history guncellenir"]
  U5 --> U6["Sistem guncel<br/>hale gelir"]

  style U1 fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style U2 fill:#fef3c7,stroke:#b45309,color:#1e293b
  style U3 fill:#f1f5f9,stroke:#475569,color:#1e293b
  style U4 fill:#fae8ff,stroke:#86198f,color:#1e293b
  style U5 fill:#fae8ff,stroke:#86198f,color:#1e293b
  style U6 fill:#dcfce7,stroke:#15803d,color:#1e293b
```

### Flow Versiyon Değişikliği

```mermaid
flowchart TB
  V1["Flow v1.0.0<br/>calisiyor"] --> V2["Flow v2.0.0<br/>deploy edilir"]
  V2 --> V3{"Sema degisikligi<br/>gerekli mi?"}
  V3 -->|Evet| V4["Migration<br/>calistirilir"]
  V3 -->|Hayir| V5["Her iki versiyon da desteklenir<br/>(Semantic Versioning)"]
  V4 --> V5

  style V1 fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style V2 fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style V3 fill:#f1f5f9,stroke:#475569,color:#1e293b
  style V4 fill:#fef3c7,stroke:#b45309,color:#1e293b
  style V5 fill:#dcfce7,stroke:#15803d,color:#1e293b
```

## Database Architecture Diagram

```mermaid
graph TB
    subgraph services["vNext Services"]
        orchestration["vnext-app<br/>(Orchestration)"]
        execution["vnext-execution-app<br/>(Execution)"]
        init["vnext-init<br/>(Initialization)"]
    end
    
    subgraph database["Domain Database (PostgreSQL)"]
        subgraph system["System Schemas"]
            sys_flows["sys_flows<br/><i>Workflow definitions</i>"]
            sys_views["sys_views<br/><i>View definitions</i>"]
            sys_functions["sys_functions<br/><i>Function APIs</i>"]
            sys_tasks["sys_tasks<br/><i>Task definitions</i>"]
            sys_extensions["sys_extensions<br/><i>Extensions</i>"]
            sys_schemas["sys_schemas<br/><i>Schema registry</i>"]
        end
        
        subgraph flows["Flow Schemas"]
            flow1["customer_onboarding<br/><i>Instances, data, history</i>"]
            flow2["payment_process<br/><i>Instances, data, history</i>"]
            flow3["document_approval<br/><i>Instances, data, history</i>"]
        end
    end
    
    orchestration -->|Read definitions| sys_flows
    orchestration -->|Read views| sys_views
    orchestration -->|Read tasks| sys_tasks
    orchestration -->|CRUD operations| flow1
    orchestration -->|CRUD operations| flow2
    orchestration -->|CRUD operations| flow3
    
    execution -->|Read data| flow1
    execution -->|Read data| flow2
    execution -->|Read data| flow3
    
    init -->|Schema DDL & Migration| sys_schemas
    init -->|Seed flows| sys_flows
    init -->|Seed tasks| sys_tasks
    init -->|Create on first run| flow1
    init -->|Create on first run| flow2
    init -->|Create on first run| flow3
    
    style database fill:#dbeafe,stroke:#1e40af,color:#1e293b
    style system fill:#fef3c7,stroke:#b45309,color:#1e293b
    style flows fill:#fae8ff,stroke:#86198f,color:#1e293b
    style services fill:#dcfce7,stroke:#15803d,color:#1e293b
```


## Sonuç

vNext Runtime'ın multi-schema veritabanı mimarisi, her domain'in ve her flow'un bağımsız veri yönetimine olanak tanır. Otomatik şema oluşturma ve migration sistemi, geliştiricilerin veritabanı yönetimiyle uğraşmadan iş akışlarına odaklanmasını sağlar.

## İlgili Dökümanlar

- [Domain Topology](/architecture/domain-model/topology) - Domain seviyesinde izolasyon
- [Persistence](/architecture/data/persistence) - Veri saklama prensipleri