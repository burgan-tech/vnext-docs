---
sidebar_position: 2
title: Database Architecture
description: Multi-schema DB structure, migration system, isolation
---

# Database Architecture

## Database Isolation at Domain Level

In the vNext Runtime platform, each domain has its own independent database. This approach ensures complete data isolation between domains and is critical for security and data integrity.

### Database Isolation Principles

```mermaid
flowchart TB
  subgraph platform["vNext Platform"]
    subgraph onb["Loan Domain"]
      onb_db[("loan_db")]
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

**Core Principles:**
- Each domain = One database
- Direct database access between domains is prohibited
- Data sharing occurs only through API or Events
- Each domain implements its own data governance policies

## Multi-Flow Schema Structure

vNext Runtime uses a **multi-flow schema** (multi-schema) approach within the database. This structure organizes database objects for different flows and system components.

### System Schemas

When the platform starts, **6 fundamental system schemas** are automatically created:

#### 1. sys_flows
```sql
-- Schema where flow definitions are stored
sys_flows
```
**Content:** Workflow definitions, state structures, transition rules, version information.

#### 2. sys_views
```sql
-- Schema where view definitions are stored
sys_views
```
**Content:** UI view definitions, templates, platform overrides.

#### 3. sys_functions
```sql
-- Schema where function APIs are stored
sys_functions
```
**Content:** System functions (State, Data, View APIs), authorization rules.

#### 4. sys_tasks
```sql
-- Schema where task definitions are stored
sys_tasks
```
**Content:** Definitions of HTTP, Script, Timer, Condition, and other task types.

#### 5. sys_extensions
```sql
-- Schema where extensions and plugins are stored
sys_extensions
```
**Content:** System extensions, custom plugins, extension points.

#### 6. sys_schemas
```sql
-- Schema where schema metadata is stored
sys_schemas
```
**Content:** Registry of all schemas, migration history, version tracking.

## Flow-Specific Schemas (Dynamic Schemas)

Per-flow database schemas hold instance data and history. As of , schema **creation and migration** for a flow are driven by a **DB-Migrator job** at **deploy time**, not by running migration checks on every **start** or **transition** request.

### Deploy-time schema lifecycle

```mermaid
flowchart LR
  A["Flow / runtime<br/>deploy"] --> B["DB-Migrator<br/>job runs"] --> C["Schemas created<br/>or migrated"] --> D["Runtime serves<br/>traffic"]

  style A fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style B fill:#fef3c7,stroke:#b45309,color:#1e293b
  style C fill:#fae8ff,stroke:#86198f,color:#1e293b
  style D fill:#dcfce7,stroke:#15803d,color:#1e293b
```

**Example:**

```mermaid
flowchart TB
  S1["Deployment: loan-application flow (v1.0.0)"] --> S2["DB-Migrator job runs<br/>(deployment pipeline)"]
  S2 --> S3["loan_application schema<br/>created or updated"]
  S3 --> S4["Migration scripts<br/>run as needed"]
  S4 --> S5["Flow is ready<br/>(before first start/transition)"]

  style S1 fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style S2 fill:#fef3c7,stroke:#b45309,color:#1e293b
  style S3 fill:#fae8ff,stroke:#86198f,color:#1e293b
  style S4 fill:#fae8ff,stroke:#86198f,color:#1e293b
  style S5 fill:#dcfce7,stroke:#15803d,color:#1e293b
```

## Automatic Migration System

Schema changes are applied in a controlled way via the **migrator** and **`sys_schemas`** history—not by coupling migration to each API request.

### First deployment

```mermaid
flowchart TB
  D1["Flow deployed<br/>for the first time"] --> D2["Schema does<br/>not exist yet"]
  D2 --> D3["DB-Migrator job<br/>creates the schema"]
  D3 --> D4["Tables, indexes<br/>and seeds applied"]
  D4 --> D5["start/transition no longer<br/>triggers migrate checks"]

  style D1 fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style D2 fill:#f1f5f9,stroke:#475569,color:#1e293b
  style D3 fill:#fef3c7,stroke:#b45309,color:#1e293b
  style D4 fill:#fae8ff,stroke:#86198f,color:#1e293b
  style D5 fill:#dcfce7,stroke:#15803d,color:#1e293b
```

### System upgrade

```mermaid
flowchart TB
  U1["vNext Runtime<br/>new version"] --> U2["Deploy pipeline<br/>runs DB-Migrator"]
  U2 --> U3["Missing migrations<br/>detected"]
  U3 --> U4["Migration scripts<br/>executed"]
  U4 --> U5["Migration history<br/>updated per schema"]
  U5 --> U6["System is<br/>up to date"]

  style U1 fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style U2 fill:#fef3c7,stroke:#b45309,color:#1e293b
  style U3 fill:#f1f5f9,stroke:#475569,color:#1e293b
  style U4 fill:#fae8ff,stroke:#86198f,color:#1e293b
  style U5 fill:#fae8ff,stroke:#86198f,color:#1e293b
  style U6 fill:#dcfce7,stroke:#15803d,color:#1e293b
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
            flow1["loan_application<br/><i>Instances, data, history</i>"]
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

## Conclusion

vNext Runtime's multi-schema database architecture enables independent data management for each domain and each flow. The automatic schema creation and migration system allows developers to focus on workflows without dealing with database management.

## Related Documentation

- [Domain Topology](/architecture/domain-model/topology) - Domain-level isolation