---
sidebar_position: 5
title: vnext-runtime MCP Server
description: Standalone Model Context Protocol server exposing vNext components, live runtime data, and vnext-meta to MCP agents
---

# vnext-runtime MCP Server

`vnext-runtime` is a standalone [Model Context Protocol](https://modelcontextprotocol.io) server that lets MCP-capable agents (Claude Code, Cursor, CI, hosted assistants) discover and read a vNext domain's **components**, **live runtime data**, and the static **`vnext-meta`** package over a single endpoint — so AI tooling can be wired directly against a domain's runtime.

It is **thin and decoupled**: it calls the Orchestration HTTP API via a typed `HttpClient` and has **no** DB / Redis / Dapr / Application references.

> **Note:** Documentation discovery is intentionally **not** in this server — use the **Context7 MCP** server (`burgan-tech/vnext-runtime` / `vnext-docs`), which already indexes the public docs with semantic search. See [AI-Assisted Development](./ai-assisted-development).

## Transports

| Mode | Command | Use |
|------|---------|-----|
| stdio (default) | `vnext-mcp` | Local IDE (Claude Code, Cursor) |
| Streamable HTTP | `... -- --transport http` | Hosted / remote / CI (`POST /` MCP endpoint) |

## Install

### A. dotnet tool (stdio, local IDE)

Published to NuGet as `BBT.Workflow.Mcp`, command `vnext-mcp`:

```bash
dotnet tool install -g BBT.Workflow.Mcp
claude mcp add vnext-runtime \
  --env Mcp__OrchestrationBaseUrl=http://localhost:4201 \
  --env Mcp__Domain=<your-domain> \
  -- vnext-mcp
```

stdio is not auth-gated (the local user launched the process), so `Mcp__ApiKey` is not needed here.

### B. Docker image (Streamable HTTP, hosted/CI)

`ghcr.io/burgan-tech/vnext/mcp-server`:

```bash
docker run --rm -p 5000:5000 \
  -e Mcp__OrchestrationBaseUrl=http://host.docker.internal:4201 \
  -e Mcp__Domain=<your-domain> \
  ghcr.io/burgan-tech/vnext/mcp-server:<tag>
```

The container defaults to `--transport http` on port 5000 (`ASPNETCORE_URLS=http://+:5000`); TLS is terminated upstream (ingress).

On the HTTP transport the MCP endpoint is served at the **root path** (`/`, via `MapMcp`) — the URL is just the server's base address, no `/mcp` suffix. When `Mcp__ApiKey` is set, the client must present a Bearer token:

```bash
claude mcp add --transport http --scope user vnext-runtime https://vnext-mcp.example.com/ \
  --header "Authorization: Bearer <Mcp:ApiKey value>"
```

## Configuration (`Mcp` section / `Mcp__*` env vars)

| Key | Default | Purpose |
|-----|---------|---------|
| `OrchestrationBaseUrl` | `http://localhost:4201` | Orchestration API base URL (domain-specific) |
| `Domain` | `null` | The single vNext domain this instance serves. **Required** for component/runtime tools |
| `AllowMutations` | `false` | Register mutating tools (start/transition/retry/publish/invalidate) |
| `AllowCodeRead` | `false` | Register `get_mapping_code` (returns executable `.csx`) |
| `ApiKey` | `null` | Fixed client key (HTTP `Authorization: Bearer`). **Empty ⇒ auth disabled** (local dev) |
| `MetaPackageName` | `@burgan-tech/vnext-meta` | npm package holding the `vnext-meta` JSON |
| `MetaPackageVersion` | (pinned) | **Pinned** meta version (never `latest`); bump to upgrade |

Each MCP instance is **single-domain** — `OrchestrationBaseUrl` points at one domain's runtime and a single fixed `ApiKey` gates the instance. To serve another domain, run another instance with its own config. Tools take **no** `domain` argument; each instance reads `Mcp:Domain` from config.

`vnext-meta` is fetched once at startup from the public npm registry and held in memory; if npm is unreachable the host still starts (live tools work) and retries in the background.

## Tool groups

- **ComponentTools** — `list_components`, `list_workflows` / `list_tasks` / `list_functions` / `list_views` / `list_extensions` / `list_schemas` / `list_mappings`, `get_component`, `get_mapping_code` *(gated by `AllowCodeRead`)*. Wraps the Orchestration **Component Discovery API** (`GET /{domain}/components/*`).
- **RuntimeTools** — `list_instances`, `get_instance`, `get_instance_data`, `get_instance_state`, `get_instance_history`, `get_instance_hierarchy`, `get_runtime_config`.
- **MetaTools** — `query_features`, `get_version_info`, `list_known_issues`, `get_deprecations`, `check_security_policy`, `list_meta_components`. Read the `vnext-meta` npm package.
- **MutatingRuntimeTools** *(gated by `AllowMutations`)* — `start_instance`, `run_transition`, `retry_instance`, `publish_definitions`, `invalidate_cache`.

## Authorization

- **HTTP transport:** the client sends `Authorization: Bearer <key>`; a missing/wrong key returns `401`.
- **stdio transport:** not gated — the process is launched by the trusted local user, so `ApiKey` only takes effect over HTTP.

Outbound calls to Orchestration carry `User-Agent: vnext-mcp/<version>` and **no** API key — the runtime has no inbound auth of its own; authorization lives entirely at the MCP server.

Verify with `claude mcp list` (expect **Connected**) or `/mcp` inside Claude Code. Tools appear as `mcp__vnext-runtime__*`.

## Related

- [AI-Assisted Development](./ai-assisted-development) — Context7 MCP for docs discovery and the AI Toolkit
- [Workflow CLI](./workflow-cli) — deploy / validation / mapping operations
