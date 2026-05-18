---
sidebar_position: 2
title: Core Principles
description: vNext platform architectural principles — dual-write, domain-driven, ETag, semantic versioning
---

# Core Principles

Eight core principles shape the vNext platform's design:

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

## 6. Single Runtime, Many Flows

vNext is designed as a **single platform runtime per organization**. Application diversity is achieved not through new codebases but through **flow definitions**.

**Architectural implications:**

- Platform runtime is a **single deployment artifact** (Orchestration API + Execution API + Workers); flow definitions are *data* that the runtime interprets
- Runtime updates improve all processes across the organization from a single point
- Security patches, telemetry standards, audit policies are **applied once**, effective across the ecosystem
- Marginal architectural cost of adding a new process = **new definition**, not new codebase
- Domain isolation (#2) allows this runtime to run as **multiple instances** in different domains — code is fixed, deployment topology is variable

## 7. Observable by Default

Observability is **not an afterthought** — it is a natural part of the architectural layer.

**Standard components:**

- **OpenTelemetry** — distributed tracing + structured logging + metrics
- **Custom spans & events** — instrumentation ready for transitions, task execution, external calls
- **Instance correlation** — parent-child workflow relationships, sub-flow / sub-process trace context propagation
- **Health endpoints** — Orchestration `4201/health`, Execution `4202/health`
- **Cache metrics (Redis)** — hit/miss, latency, key distribution
- **Database metrics (PostgreSQL)** — slow query, connection pool
- **Persistent metrics (ClickHouse)** — long-term metric storage, trend analysis, SLO reporting

A flow is observable the moment it goes live; no additional instrumentation is required.

> Details: [Observability](/architecture/infrastructure/observability)

## 8. AI-Native Design (Pluggable)

In the AI era, the right answer is not "make every team write code faster" but **"not everyone should write code — let them design flows with AI"**. vNext carries this paradigm at the architectural level:

- **Definition-oriented model** — workflow, schema, task definitions are natural targets for AI generation
- **Pluggable AI provider** — OpenAI, Anthropic, Azure OpenAI, open models, on-premise models; vNext is not a model provider
- **Human-approved pipeline** — AI output must pass review + test + audit before reaching production
- **AI-Assisted Flow Design** (roadmap) — natural language to flow draft, flow validation copilot
- **Process Mining** (roadmap) — automatic flow extraction from existing process logs

## Practical Implications

- Domain teams can **progress independently** (separate runtime, separate DB)
- Different versions of the same workflow schema can **run in parallel** (rolling deployment)
- Events can flow to downstream systems (CDC-ready)
- Concurrent update conflicts are caught **at runtime, not build time**
- Components can be **hot-reloaded** safely (init-service)
- New application = new flow definition, not new codebase
- Every step of every process is **automatically** observed
