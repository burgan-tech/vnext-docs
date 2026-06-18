---
sidebar_position: 5
title: vnext-runtime MCP Server
description: vNext bileşenlerini, canlı runtime verisini ve vnext-meta'yı MCP ajanlarına sunan standalone Model Context Protocol sunucusu
---

# vnext-runtime MCP Server

`vnext-runtime`, MCP uyumlu ajanların (Claude Code, Cursor, CI, hosted asistanlar) bir vNext domain'inin **bileşenlerini**, **canlı runtime verisini** ve statik **`vnext-meta`** paketini tek bir uç üzerinden keşfedip okumasını sağlayan standalone bir [Model Context Protocol](https://modelcontextprotocol.io) sunucusudur. Böylece AI toolları doğrudan runtime bazında yapılandırılabilir.

Sunucu **ince ve decoupled**'dır: Orchestration HTTP API'yi tiplenmiş bir `HttpClient` ile çağırır; **DB / Redis / Dapr / Application** referansı yoktur.

> **Not:** Doküman keşfi bu sunucuda **yer almaz** — bunun için public docs'u semantik aramayla indeksleyen **Context7 MCP** sunucusu (`burgan-tech/vnext-runtime` / `vnext-docs`) kullanılır. Bkz. [AI Destekli Geliştirme](./ai-assisted-development).

## Transport'lar

| Mod | Komut | Kullanım |
|-----|-------|----------|
| stdio (varsayılan) | `vnext-mcp` | Lokal IDE (Claude Code, Cursor) |
| Streamable HTTP | `... -- --transport http` | Hosted / remote / CI (`POST /` MCP endpoint) |

## Kurulum

### A. dotnet tool (stdio, lokal IDE)

NuGet'te `BBT.Workflow.Mcp` olarak yayınlanır, komut adı `vnext-mcp`:

```bash
dotnet tool install -g BBT.Workflow.Mcp
claude mcp add vnext-runtime \
  --env Mcp__OrchestrationBaseUrl=http://localhost:4201 \
  --env Mcp__Domain=<your-domain> \
  -- vnext-mcp
```

stdio transport auth-gated değildir (process'i güvenilen lokal kullanıcı başlatır), bu yüzden burada `Mcp__ApiKey` gerekmez.

### B. Docker image (Streamable HTTP, hosted/CI)

`ghcr.io/burgan-tech/vnext/mcp-server`:

```bash
docker run --rm -p 5000:5000 \
  -e Mcp__OrchestrationBaseUrl=http://host.docker.internal:4201 \
  -e Mcp__Domain=<your-domain> \
  ghcr.io/burgan-tech/vnext/mcp-server:<tag>
```

Container varsayılan olarak port 5000'de `--transport http` çalışır (`ASPNETCORE_URLS=http://+:5000`); TLS upstream (ingress) tarafında sonlandırılır.

HTTP transport'ta MCP endpoint **kök yolda** (`/`, `MapMcp` ile) sunulur — URL yalnızca sunucunun base adresidir, `/mcp` eki yoktur. `Mcp__ApiKey` set edildiğinde client, Bearer token sunmalıdır:

```bash
claude mcp add --transport http --scope user vnext-runtime https://vnext-mcp.example.com/ \
  --header "Authorization: Bearer <Mcp:ApiKey değeri>"
```

## Yapılandırma (`Mcp` bölümü / `Mcp__*` env değişkenleri)

| Anahtar | Varsayılan | Amaç |
|---------|-----------|------|
| `OrchestrationBaseUrl` | `http://localhost:4201` | Orchestration API base URL (domain'e özel) |
| `Domain` | `null` | Bu instance'ın hizmet verdiği tek vNext domain'i. Bileşen/runtime araçları için **zorunlu** |
| `AllowMutations` | `false` | Mutasyon araçlarını (start/transition/retry/publish/invalidate) kaydeder |
| `AllowCodeRead` | `false` | `get_mapping_code` aracını (çalıştırılabilir `.csx` döner) kaydeder |
| `ApiKey` | `null` | Sabit client anahtarı (HTTP `Authorization: Bearer`). **Boş ⇒ auth kapalı** (lokal dev) |
| `MetaPackageName` | `@burgan-tech/vnext-meta` | `vnext-meta` JSON'unu barındıran npm paketi |
| `MetaPackageVersion` | (pinli) | **Pinlenmiş** meta sürümü (asla `latest`); yükseltmek için artırın |

Her MCP instance'ı **tek domain**'dir — `OrchestrationBaseUrl` tek bir domain'in runtime'ına işaret eder; tek bir sabit anahtar (`ApiKey`) instance'ı korur. Başka bir domain'e hizmet için kendi config'iyle ayrı bir instance çalıştırın. Araçlar `domain` argümanı **almaz**; her instance `Mcp:Domain`'i config'ten okur.

`vnext-meta` başlangıçta public npm registry'den bir kez çekilip bellekte tutulur; npm erişilemezse host yine başlar (canlı araçlar çalışır) ve arka planda yeniden denenir.

## Tool grupları

- **ComponentTools** — `list_components`, `list_workflows` / `list_tasks` / `list_functions` / `list_views` / `list_extensions` / `list_schemas` / `list_mappings`, `get_component`, `get_mapping_code` *(`AllowCodeRead` ile gated)*. Orchestration **Component Discovery API**'yi (`GET /{domain}/components/*`) sarar.
- **RuntimeTools** — `list_instances`, `get_instance`, `get_instance_data`, `get_instance_state`, `get_instance_history`, `get_instance_hierarchy`, `get_runtime_config`.
- **MetaTools** — `query_features`, `get_version_info`, `list_known_issues`, `get_deprecations`, `check_security_policy`, `list_meta_components`. `vnext-meta` npm paketini okur.
- **MutatingRuntimeTools** *(`AllowMutations` ile gated)* — `start_instance`, `run_transition`, `retry_instance`, `publish_definitions`, `invalidate_cache`.

## Yetkilendirme

- **HTTP transport:** client `Authorization: Bearer <key>` gönderir; eksik/yanlış anahtar `401` döner.
- **stdio transport:** gated değildir — process'i güvenilen lokal kullanıcı başlatır; `ApiKey` yalnızca HTTP üzerinde etkilidir.

Orchestration'a giden çağrılar `User-Agent: vnext-mcp/<version>` taşır ve **API key taşımaz** — runtime'ın kendi inbound auth'u yoktur; yetkilendirme tamamen MCP sunucusunda yaşar.

`claude mcp list` (veya Claude Code içinde `/mcp`) ile **Connected** durumunu doğrulayın. Araçlar `mcp__vnext-runtime__*` olarak görünür.

## İlgili

- [AI Destekli Geliştirme](./ai-assisted-development) — Context7 MCP ile doküman keşfi ve AI Toolkit
- [Workflow CLI](./workflow-cli) — deploy / validation / mapping işlemleri
