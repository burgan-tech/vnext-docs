---
sidebar_position: 2
title: Domain Topology
description: Domain concept, runtime isolation, multi-domain example
---

# Domain Topology and Architecture

## Platform Domain Concept

The vNext Runtime platform is based on the **Domain** concept. A domain represents an isolated runtime environment that corresponds to a business area, product group, or team responsibility.

### Domain = Runtime Principle

**Each domain has its own independent runtime.** This principle forms the foundation of the platform architecture:

- One domain = One vNext Runtime instance
- Each domain is unique and independent
- Complete isolation is provided between domains

## Domain Examples

In an organization, domains can be organized as follows:

### Product Group-Based Domain

```mermaid
graph LR
  OD["Loan Domain"]
  OD --> RT["vNext Runtime<br/>(loan)"]
  OD --> DB[("loan_db")]
  OD --> PS["PubSub<br/>(loan_events)"]
  OD --> SS["State Store<br/>(loan_state)"]

  style OD fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style RT fill:#e0f2fe,stroke:#0369a1,color:#1e293b
  style DB fill:#fae8ff,stroke:#86198f,color:#1e293b
  style PS fill:#fef3c7,stroke:#b45309,color:#1e293b
  style SS fill:#fef3c7,stroke:#b45309,color:#1e293b
```

**Example:** The lending team managing loan processes has its own domain.

### Team Responsibility-Based Domains

```mermaid
graph LR
  Team["Integration Team"]

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

**Example:** The integration team manages IDM and Notification systems under their responsibility as separate domains.

## Benefits of Domain Isolation

### 1. Infrastructure Isolation
Each domain has its own infrastructure components:
- **Database**: Domain-specific database
- **PubSub**: Domain-specific messaging channels
- **State Store**: Domain-specific state management
- **Secrets**: Domain-specific security configuration

### 2. Independent Development
- Each domain team can develop at their own pace
- Inter-domain dependencies are minimal
- Version management is done per domain
- Deployment is performed independently

### 3. Scalability
- Each domain scales according to its needs
- High-load domains can receive more resources
- Low-load domains run with minimal resources
- Resource utilization is optimized

### 4. Fault Isolation
- Issues in one domain do not affect others
- Backup and restore are done per domain
- Maintenance and updates are planned independently

## Inter-Domain Communication

Although domains are isolated from each other, they can communicate according to business requirements:

### 1. Through API Gateway

```mermaid
flowchart LR
  OB["Loan<br/>Domain"] <-->|REST/HTTP| GW{{"API Gateway"}} <-->|REST/HTTP| IDM["IDM<br/>Domain"]

  style OB fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style GW fill:#fef3c7,stroke:#b45309,color:#1e293b
  style IDM fill:#dbeafe,stroke:#1e40af,color:#1e293b
```

- Synchronous communication
- REST API calls
- HTTP Task usage

### 2. Event-Driven Structures

```mermaid
flowchart LR
  PAY["Payments<br/>Domain"] -->|Publish| EB{{"Event Bus<br/>(PubSub)"}} -->|Subscribe| NOT["Notification<br/>Domain"]

  style PAY fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style EB fill:#fef3c7,stroke:#b45309,color:#1e293b
  style NOT fill:#dbeafe,stroke:#1e40af,color:#1e293b
```

- Asynchronous communication
- Event-based integration
- Loose coupling
- DaprPubSub Task usage

## C4 Context Diagram - Multi-Domain Architecture

```mermaid
flowchart TB
  Customer["Customer<br/><i>Mobile / Web</i>"]
  Employee["Employee<br/><i>Backoffice</i>"]
  ExtSys["External Systems<br/><i>Bank, Payment, KYC</i>"]

  GW{{"API Gateway"}}
  EvBus{{"Event Bus<br/>(PubSub)"}}

  subgraph platform["vNext Platform"]
    Onb["Loan Domain<br/><i>Loan processes</i>"]
    IDM["IDM Domain<br/><i>Identity & authorization</i>"]
    Notif["Notification Domain<br/><i>Notification services</i>"]
    Pay["Payment Domain<br/><i>Payment processes</i>"]
  end

  Customer -->|HTTPS| GW
  Employee -->|HTTPS| GW
  GW -->|HTTP/REST| Onb
  GW -->|HTTP/REST| IDM
  GW -->|HTTP/REST| Notif
  GW -->|HTTP/REST| Pay

  Onb -->|"Authentication"| IDM
  Onb -->|"KYC query"| ExtSys
  Pay -->|"Payment transaction"| ExtSys

  Onb -->|"Publishes events"| EvBus
  Pay -->|"Publishes events"| EvBus
  EvBus -->|"Consumes events"| Notif

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

## C4 Container Diagram - Domain Internal Structure

```mermaid
flowchart TB
  User["User<br/><i>Domain user</i>"]
  ExtSvc["External Services<br/><i>APIs, webhooks</i>"]

  subgraph domain["vNext Domain (e.g. Loan)"]
    Orch["vnext-app<br/><i>Orchestration Service</i>"]
    Exec["vnext-execution-app<br/><i>Execution Service</i>"]
    Init["vnext-init<br/><i>Seed Service</i>"]
    DB[("Domain Database<br/><i>PostgreSQL</i>")]
    State[("State Store<br/><i>Redis / Dapr</i>")]
    PubSub["PubSub<br/><i>RabbitMQ / Dapr</i>"]
  end

  User -->|"HTTPS/REST"| Orch
  Orch -->|"Instance CRUD (SQL)"| DB
  Orch -->|"Execute task (Dapr)"| Exec
  Orch -->|"Reads/writes state"| State
  Orch -->|"Event pub/sub"| PubSub

  Exec -->|"HTTP Task"| ExtSvc
  Exec -->|"Reads data (SQL)"| DB
  Exec -->|"Uses cache"| State

  Init -->|"Schema DDL, seed"| DB
  Init -->|"Deploy system flows"| Orch

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

## Domain Management Best Practices

### Define Domain Boundaries Correctly
- **By business area**: Each domain should represent a specific business function
- **By team responsibility**: Domain ownership should be clear
- **By scale requirements**: Areas with different load characteristics should be separate domains

### Maintain Domain Isolation
- Direct database access between domains is prohibited
- All communication should be through API or Events
- Shared infrastructure should be minimized

### Monitoring and Observability
- Separate monitoring dashboards for each domain
- Domain-based metric collection
- Distributed tracing for inter-domain call tracking

### Version Management
- Domains are versioned independently
- API contracts are managed with semantic versioning
- Breaking changes are coordinated but deployment is independent

## Domain Lifecycle

### 1. Domain Creation
```bash
# Infrastructure provisioning
- Create domain database
- Configure domain state store
- Configure domain PubSub

# vNext Runtime deployment
- System setup with vnext-init
- vnext-app deployment
- vnext-execution-app deployment
```

### 2. Domain Operations
- Flow deployment and management
- Monitoring and alerting
- Scaling and optimization
- Backup and disaster recovery

### 3. Domain Retirement
- Migration planning
- Dependency analysis
- Graceful shutdown
- Data archiving

## Conclusion

Domain topology is the fundamental architectural decision that makes the vNext Runtime platform scalable, flexible, and manageable. Each domain having its own independent runtime enables teams to move quickly, systems to be resilient, and resources to be used efficiently.

## Related Documentation

- [Database Architecture](/architecture/data/database) - Database structure at domain level
- [Persistence](/architecture/data/persistence) - Data storage strategies