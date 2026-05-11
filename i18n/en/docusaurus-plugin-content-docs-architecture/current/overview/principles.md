---
sidebar_position: 2
title: Core Principles
description: vNext platform architectural principles — dual-write, domain-driven, ETag, semantic versioning
---

# Core Principles

Five core principles shape the vNext platform's design:

## 1. Dual-Write Pattern

Workflow state is written to **two places**: the primary database (PostgreSQL) and the event store. This guarantees both **transactional consistency** and **event sourcing**.

- **Primary DB**: workflow instance state, metadata, audit
- **Event store**: state transitions are published as events
- **Replication support**: events can flow to downstream consumers (CDC + Dapr pub/sub)

> Learn more: [Persistence Strategy](/architecture/data/persistence)

## 2. Domain-Driven Architecture

Each **domain** is an independent bounded context:

- Its own runtime containers (orchestration, execution, workers)
- Its own database (`vNext_<DomainName>`)
- Its own configuration (`.env`, `appsettings.*`)
- Its own component set (workflow, task, function, schema, view, extension)

The same infrastructure (DB engine, Redis, Vault, Dapr) is shared, but **data and runtime are fully isolated**.

> Learn more: [Domain Topology](/architecture/domain-model/topology)

## 3. Microservice Ready (with Dapr)

Runtime services communicate via **Dapr sidecars**:

- **Service invocation**: orchestration ↔ execution
- **Pub/sub**: workflow events (state changes, transitions)
- **State store**: cross-service state sharing (Redis backend)
- **Secret store**: Vault integration

Services are **stateless** and **horizontally scalable**.


## 4. ETag-Based Concurrent Update Control

Each read of a workflow instance produces an **ETag** (entity tag). Update requests **must** include this ETag in headers:

```http
PUT /api/v1.0/{domain}/workflows/{wf}/instances/{id}
If-Match: "abc123"
```

If the ETag doesn't match → **412 Precondition Failed**. This prevents the **lost update** problem.

## 5. Semantic Versioning

All components (workflow, task, function, schema, view, extension) are versioned with **SemVer** (`MAJOR.MINOR.PATCH`):

- **MAJOR** → backward-incompatible change
- **MINOR** → backward-compatible feature addition
- **PATCH** → bug fix

Reference resolution is **pinned to major version**: when a workflow references `v1.x`, the runtime resolves the latest `v1.x.y` instance.

> Learn more: [Semantic Versioning](/architecture/patterns/versioning), [References](/architecture/patterns/references)

## Practical Implications

- Domain teams can **progress independently** (separate runtime, separate DB)
- Different versions of the same workflow schema can **run in parallel** (rolling deployment)
- Events can flow to downstream systems (CDC-ready)
- Concurrent update conflicts are caught **at runtime, not build time**
- Components can be **hot-reloaded** safely (init-service)
