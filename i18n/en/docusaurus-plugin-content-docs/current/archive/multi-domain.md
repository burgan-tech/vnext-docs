---
sidebar_position: 3
title: Multi-Domain Setup (Archived)
description: Running multiple isolated domains on the vNext platform (archived guide)
---

# Multi-Domain Setup

:::warning[This document is archived]
Domain setup and local runtime management are now handled through the **vNext Forge** VS Code extension. Follow the up-to-date [Development Environment Setup (Forge)](/docs/getting-started/forge-setup) guide. This page is kept as a reference for those who want to manage the multi-domain setup manually (docker-compose/Make).
:::

vNext Runtime supports **running multiple domains simultaneously** on the same infrastructure. Teams can run isolated domain environments (`core`, `sales`, `hr`, etc.) sharing the same PostgreSQL, Redis, Vault, and Dapr services.

:::tip
Each domain has its own orchestration, execution, worker-inbox, worker-outbox, and init containers — but **shared infrastructure** (DB, Redis, Vault, Dapr) runs as a single instance.
:::

## Folder Structure

```
vnext/docker/
├── templates/                              # Template files for new domains
│   ├── .env                                # Main env template with {{PLACEHOLDERS}}
│   ├── .env.orchestration                  # Orchestration template
│   ├── .env.execution                      # Execution template
│   ├── .env.worker-inbox                   # Inbox worker template
│   ├── .env.worker-outbox                  # Outbox worker template
│   └── appsettings.*.Development.json      # App settings templates
├── domains/                                # Domain configurations
│   ├── core/                               # Domain: core
│   ├── sales/                              # Domain: sales
│   └── <domain_name>/                      # Your domain
│       ├── .env
│       ├── .env.orchestration
│       ├── .env.execution
│       ├── .env.worker-inbox
│       ├── .env.worker-outbox
│       └── appsettings.*.Development.json
├── config/                                 # Shared infrastructure config
├── docker-compose.yml
└── create-domain.sh                        # Script to create domains from templates
```

## Creating a New Domain

Use the `create-domain` command to generate domain configuration from templates:

```bash
# Create domain with port offset (to avoid port conflicts)
# Note: core (offset 0) and discovery (offset 5) are pre-configured
# Use offset 10 or higher for custom domains
make create-domain DOMAIN=sales PORT_OFFSET=10
make create-domain DOMAIN=hr PORT_OFFSET=20
make create-domain DOMAIN=finance PORT_OFFSET=30
```

This generates:

- Environment files with domain-specific DAPR store names, ports, and app IDs
- Appsettings files with domain-specific database connection strings
- Proper OTEL service names for observability

The database name is auto-generated from the domain name:

- `core` → `vNext_Core`
- `sales` → `vNext_Sales`
- `user-management` → `vNext_User_Management`

## Port Allocation

Each domain uses **unique ports** based on `PORT_OFFSET`:

| Offset | Domain (Example)     | App Port | Execution | Inbox | Outbox | Init |
|--------|----------------------|----------|-----------|-------|--------|------|
| 0      | core (reserved)      | 4201     | 4202      | 4203  | 4204   | 3005 |
| 5      | discovery (reserved) | 4206     | 4207      | 4208  | 4209   | 3010 |
| 10     | sales                | 4211     | 4212      | 4213  | 4214   | 3015 |
| 20     | hr                   | 4221     | 4222      | 4223  | 4224   | 3025 |
| 30     | finance              | 4231     | 4232      | 4233  | 4234   | 3035 |

Dapr ports use `offset * 100` to avoid conflicts.

:::warning[Reserved Offsets]
The `core` and `discovery` domains are pre-configured with offsets **0** and **5** respectively. **Do not use these offsets** for your custom domains. Start with offset 10 or higher for new domains.
:::

## Running Multiple Domains

```bash
# 1. Start shared infrastructure
make up-infra

# 2. Pre-configured domains (core and discovery) are ready to use
make up-vnext DOMAIN=core
make up-vnext DOMAIN=discovery

# 3. Create and start your own domain (use offset 10 or higher)
make create-domain DOMAIN=sales PORT_OFFSET=10
make db-create DOMAIN=sales
make up-vnext DOMAIN=sales

# 4. View all running services
make status-all-domains

# 5. Check health of a specific domain
make health DOMAIN=core
make health DOMAIN=sales
```

## Domain Management

```bash
# List all configured domains
make list-domains

# Stop a specific domain
make down-vnext DOMAIN=sales

# Restart a specific domain
make restart-vnext DOMAIN=sales

# Stop all domains but keep infrastructure
make down-all-vnext

# View logs for a specific domain
make logs-vnext DOMAIN=core
```

## Customizing Templates

Templates live in `vnext/docker/templates/`. They use `{{PLACEHOLDER}}` syntax:

| Placeholder | Description |
|---|---|
| `{{DOMAIN_NAME}}` | Domain name (e.g., `core`, `sales`) |
| `{{PORT_OFFSET}}` | Port offset value |
| `{{DB_NAME}}` | Database name (e.g., `vNext_Core`) |
| `{{VNEXT_APP_PORT}}` | Orchestration port |
| `{{DAPR_*_PORT}}` | Dapr sidecar ports |

**Auto-generated environment variables:**

| Variable | Description |
|---|---|
| `DAPR_STATE_STORE_NAME` | Dapr state store name (required) |
| `DAPR_SECRET_STORE_NAME` | Dapr secret store name |
| `DAPR_PUBSUB_STORE_NAME` | Dapr pubsub store name |
| `DAPR_APP_ID` | Unique Dapr app identifier per service |
| `OTEL_SERVICE_NAME` | OpenTelemetry service name |

## Legacy Single-Domain Mode

For backwards compatibility, the legacy `change-domain` command still works:

```bash
make change-domain DOMAIN=mycompany
```

This updates all domain-related settings but **does not support running multiple domains simultaneously**.

---

*Distilled from [`vnext-runtime/README.md`](https://github.com/burgan-tech/vnext-runtime/blob/main/README.md).*
