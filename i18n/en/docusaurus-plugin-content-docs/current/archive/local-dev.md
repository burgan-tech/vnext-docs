---
sidebar_position: 2
title: Local Development (Archived)
description: Running vNext runtime locally with Docker Compose (archived guide)
---

# Local Development

:::warning[This document is archived]
The local development environment is now set up through the **vNext Forge** VS Code extension. Follow the up-to-date [Development Environment Setup (Forge)](/docs/getting-started/forge-setup) guide. This page is kept as a reference for those who want to set up the runtime manually (docker-compose/Make).
:::

This guide covers everything needed to run the vNext platform on your **local machine** via docker-compose. The `vnext-runtime` repo ships with ready-to-use templates for this setup.

:::tip
For a single-shot start: **`make dev`** sets up the environment, creates the network, starts PostgreSQL, then brings up vnext-app + init + component-publisher in healthy order.
:::

## Prerequisites

- Docker Desktop (or equivalent Docker Engine + Compose)
- Make
- Git

## Environment Configuration

The repo includes **template files** in `vnext/docker/templates/` for generating domain-specific configurations. When you create a domain with `make create-domain`, these templates are processed and the resulting configuration files are placed in `vnext/docker/domains/<domain_name>/`.

**Template Files:**

| File | Description |
|---|---|
| `.env` | Main environment file with versions and ports |
| `.env.orchestration` | Orchestration service configuration |
| `.env.execution` | Execution service configuration |
| `.env.worker-inbox` | Worker inbox service configuration |
| `.env.worker-outbox` | Worker outbox service configuration |
| `appsettings.*.Development.json` | Application settings |

To change defaults for **all new domains**, customize templates in `vnext/docker/templates/`. To customize a **specific domain**, edit files under `vnext/docker/domains/<domain_name>/`.

## Quick Start (Makefile, recommended)

The Makefile provides the most comfortable runtime for developers. It checks environment files and starts the dev environment with **a single command**:

```bash
# Check env files and start the dev environment
make dev

# Show help menu
make help

# Network setup and env check
make setup
```

### What does `make dev` do?

When you run `make dev`, the following happens automatically:

1. ✅ **Environment Setup** — `.env` files and Docker network created
2. ✅ **PostgreSQL** starts → `vNext_WorkflowDb` database auto-created
3. ✅ **vnext-app** starts → after postgres is healthy
4. ✅ **vnext-init** starts → after vnext-app is healthy
5. ✅ **vnext-component-publisher** runs → after vnext-init is healthy, auto-publishes components
6. ✅ All other services start

In one command:
- Database ready with schema
- Components loaded
- Full infrastructure running

## Manual Setup

If you prefer not to use the Makefile, you can set things up manually.

### 1. Verify Environment Files

Make sure `.env`, `.env.orchestration` and `.env.execution` are present in `vnext/docker/`; customize as needed.

### 2. Create Docker Network

```bash
docker network create vnext-development
```

### 3. Start Services

```bash
cd vnext/docker

# Start all services in the background
docker-compose up -d

# Tail logs
docker-compose logs -f vnext-app

# Restart a specific service
docker-compose restart vnext-app
```

### 4. Verify System Status

```bash
# Running services
docker-compose ps

# vnext-app health
curl http://localhost:4201/health
```

## VNext Core Runtime Initialization

The `vnext-init` service runs automatically after vnext-app becomes healthy. It performs:

1. Downloads the `@burgan-tech/vnext-core-runtime` npm package (version controlled via `.env`)
2. Reads system components from the `core` folder inside the package:
   - Extensions
   - Functions
   - Schemas
   - Tasks
   - Views
   - Workflows
3. Replaces all `"domain"` property values in JSON files with the `APP_DOMAIN` environment variable
   - Lets each developer work in their own domain locally
   - Default domain is `"core"`; override via `.env` with `APP_DOMAIN=mydomain`

## Database Management (Domain-Specific)

Each domain requires its own database. Database names are auto-derived from the domain name:

- `core` → `vNext_Core`
- `sales` → `vNext_Sales`
- `morph-idm` → `vNext_Morph_idm`

### Database Commands

```bash
# Database status (lists all databases)
make db-status

# List only vNext databases
make db-list

# Create database for a domain
make db-create DOMAIN=core
make db-create DOMAIN=sales

# Drop database (DESTRUCTIVE!)
make db-drop DOMAIN=core

# Reset (drop and recreate)
make db-reset DOMAIN=core

# Connect via psql
make db-connect DOMAIN=core
```

## Automatic Component Publishing

The `vnext-component-publisher` service runs automatically after `vnext-init` is healthy:

1. Waits for vnext-init to be ready
2. Publishes components with the configured version and domain
3. Completes and exits

To **manually** republish components:

```bash
# Re-run the component publisher
make republish-component

# Or use the script directly
make publish-component
```

## Makefile Commands Reference

### Core

| Command | Description |
|---|---|
| `make help` | List all available commands |
| `make dev` | Set up and start the dev environment |
| `make setup` | Check env files and create network |
| `make info` | Show project info and access URLs |

### Multi-Domain Management

| Command | Usage |
|---|---|
| `make create-domain` | `make create-domain DOMAIN=mycompany PORT_OFFSET=10` |
| `make list-domains` | List all configured domains |
| `make up-vnext` | `make up-vnext DOMAIN=mycompany` |
| `make down-vnext` | `make down-vnext DOMAIN=mycompany` |
| `make restart-vnext` | `make restart-vnext DOMAIN=mycompany` |
| `make status-vnext` | `make status-vnext DOMAIN=mycompany` |
| `make logs-vnext` | `make logs-vnext DOMAIN=mycompany` |
| `make status-all-domains` | Show all running vNext services |
| `make down-all-vnext` | Stop all domain services (keep infra) |
| `make health` | Health check; optional `DOMAIN=` |

### Infrastructure

| Command | Description |
|---|---|
| `make up-infra` | Start only infrastructure services |
| `make down-infra` | Stop only infrastructure services |
| `make status-infra` | Infrastructure status |
| `make logs-infra` | Infrastructure logs |

### Docker

| Command | Description |
|---|---|
| `make up` | Start services |
| `make up-build` | Build and start services |
| `make down` | Stop services |
| `make restart` | Restart services |
| `make build` | Build Docker images |

### Monitoring & Logs

| Command | Description |
|---|---|
| `make status` | Service status |
| `make health` | Service health check |
| `make logs` | All service logs |
| `make logs-orchestration` | Orchestration logs |
| `make logs-execution` | Execution logs |
| `make logs-init` | Init service logs |
| `make logs-dapr` | DAPR service logs |
| `make logs-db` | Database logs |

### Database

| Command | Usage |
|---|---|
| `make db-status` | DB status (all DBs) |
| `make db-list` | Only vNext DBs |
| `make db-create` | `make db-create DOMAIN=core` |
| `make db-drop` | `make db-drop DOMAIN=core` (destructive!) |
| `make db-reset` | `make db-reset DOMAIN=core` |
| `make db-connect` | `make db-connect DOMAIN=core` |

### Custom Components

| Command | Description |
|---|---|
| `make publish-component` | Publish component package |
| `make republish-component` | Re-run component publisher |

### Maintenance

| Command | Description |
|---|---|
| `make clean` | Clean stopped containers |
| `make clean-all` | ⚠️ Deletes ALL domains, infra, images, volumes |
| `make reset` | Reset env (stop, clean, setup) |
| `make update` | Pull latest images and restart |

## Common Workflows

```bash
# First-time project run
make dev

# Tail logs
make logs-orchestration

# Service status check
make status
make health

# Database operations
make db-status
make db-reset DOMAIN=core

# Restart during dev
make restart

# Republish components
make republish-component

# Cleanup and re-setup
make reset
make dev

# Container access
make shell-orchestration
make shell-postgres
```

---

*Distilled from [`vnext-runtime/README.md`](https://github.com/burgan-tech/vnext-runtime/blob/main/README.md). For multi-domain details see [Multi-Domain Setup](./multi-domain).*
