---
sidebar_position: 1
title: REST API
description: vNext platformu REST endpoint referansı — Definition, Function, Instance
---

# REST API

vNext platformu üç ana endpoint grubu sunar: **Definition**, **Function**, **Instance**.

> **Base URL örneği:** `http://localhost:4201` (default offset)
> **OpenAPI versiyon:** 3.0.4

## Definition Endpoints

### POST `/api/v1/definitions/publish`

Component (workflow, task, function, schema, view, extension) **deploy** etmek için kullanılır.

**Request body:** `PublishInput`

| Field | Type | Required | Description |
|---|---|---|---|
| `key` | string | ✓ | Component anahtarı |
| `flow` | string | ✓ | Flow ismi |
| `domain` | string | ✓ | Owning domain |
| `version` | string | ✓ | Component versiyonu (SemVer) |
| `flowVersion` | string | ✓ | Flow versiyonu |
| `tags` | string[] | – | Etiketler |
| `attributes` | object | ✓ | Component definition payload |
| `data` | `PublishDataInput[]` | – | Master data publish (opsiyonel) |

**Response:** `200 OK`.

---

## Function Endpoints

### GET `/api/v1/{domain}/functions`

Belirtilen domain'de tanımlı tüm function'ları döner.

| Parameter | In | Description |
|---|---|---|
| `domain` | path | Domain adı |

### GET `/api/v1/{domain}/functions/{function}`

İlgili function'ı **çalıştırır** (workflow bağımsız).

| Parameter | In | Description |
|---|---|---|
| `domain` | path | Domain adı |
| `function` | path | Function key |
| `version` | query | Function versiyonu (opsiyonel; varsayılan: latest) |

### GET `/api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/{function}`

Function'ı **instance context'inde** çalıştırır.

| Parameter | In | Description |
|---|---|---|
| `domain` | path | Domain adı |
| `workflow` | path | Workflow key |
| `instance` | path | Instance ID |
| `function` | path | Function key |
| `Version` | query | Function versiyonu |
| `Extensions` | query | Çalıştırılacak extension key listesi |
| `TransitionKey` | query | İlgili transition (varsa) |
| `Role` | query | Authorization rolü |
| `FunctionKey` | query | Inner function reference |
| `QueryRoles` | query | Query roles dahil edilsin mi (boolean) |
| `If-None-Match` | header | ETag (304 Not Modified için) |

### Function Keşif Endpoint'leri <sup>New</sup>

Bir function'ın kontratını (verb'ler, çağırma URL'si, aktif input/output view ve şema) çağırmadan keşfetmek için altı `GET` rotası:

```http
GET /api/v1/{domain}/functions/{function}/info
GET /api/v1/{domain}/functions/{function}/view?target=input|output
GET /api/v1/{domain}/functions/{function}/schema?target=input|output

GET /api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/{function}/info
GET /api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/{function}/view?target=input|output
GET /api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/{function}/schema?target=input|output
```

| Parameter | In | Description |
|---|---|---|
| `target` | query | `input` veya `output` — hangi kontrat slotu (`/view` ve `/schema` için) |

- `/info`, izin verilen verb'leri, çağırma URL'sini ve `hasView`/`hasSchema` bayraklarını döner.
- Scope/rol denetimi function execution ile aynıdır; yetkisiz çağırana `403` döner. Built-in sistem function'ları için `/info` `404` döner.
- Slot çözümü boşsa `/view` ve `/schema` `404` döner. Bu rotalarda ETag/304 desteği yoktur.
- Ayrıntı: [Custom Functions → Fonksiyon Keşif Endpointleri](/docs/components/functions/custom)

### GET `/api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/catalog` <sup>New</sup>

Workflow'un tanımlı function'larının **rol filtreli** listesini döner (`{ "functions": [ { "name", "version", "scope", "href" } ] }`, bildirim sırasında). State function yanıtındaki `functions.href` bu rotayı işaret eder. Ayrıntı: [Built-in Functions → Catalog](/docs/components/functions/built-in).

---

## Instance Endpoints

### POST `/api/v1/{domain}/workflows/{workflow}/instances/start`

Yeni instance başlatır.

**Query parameters:**
- `version` — workflow versiyonu (opsiyonel)
- `sync` — `true`/`false` (default `false`); bkz. [Async / Sync](/docs/how-to/async-sync)
- `extensions` — extension key listesi (response'a dahil edilir)

**Request body:** `CreateInstanceDto`

| Field | Type | Description |
|---|---|---|
| `key` | string | Instance key (max 100 char) |
| `tags` | string[] | Etiketler |
| `attributes` | object | Initial instance data |
| `stage` | string \| null | Kullanıcı tanımlı durum bilgisi (max 120 char, serbest metin) |

:::tip[Serbest (free-form) payload]
Gövde, top-level `attributes` anahtarı içermeyen **serbest bir JSON** de olabilir; runtime bunu otomatik olarak `{"attributes": {...}}` şekline normalize eder. Örn. `{"customer_id":"123"}` → `{"attributes":{"customer_id":"123"}}`. Mod, `x-vnext-payload-mode` header'ı ile de zorlanabilir:

| Header değeri | Etki |
|---|---|
| `raw` | Gövdede `attributes` olsa bile serbest payload kabul edilir |
| `standard` | Gövdede `attributes` olmasa bile standart DTO kabul edilir |
| (yok) | Top-level `attributes` anahtarı varsa standart, yoksa serbest mod |

Aynı davranış transition endpoint'i için de geçerlidir.
:::

:::tip[Form-urlencoded gövde desteği]
Start, transition ve function endpoint'leri JSON'a ek olarak **`application/x-www-form-urlencoded`** gövde kabul eder. Form key'leri bracket-path söz dizimi ile aynı JSON ağacına normalize edilir ve mevcut payload-mode pipeline'ı aynen çalışır:

| Form girdisi | JSON sonucu |
|---|---|
| `attributes[customer][name]=Ali` | İç içe objeler |
| `tags[]=a&tags[]=b` (veya tekrarlı `tags=a&tags=b`) | Skaler dizi |
| `items[0][name]=A&items[1][name]=B` | İndeksli obje dizisi |

Kurallar:

- Payload data'daki skaler değerler **JSON-literal** semantiği kullanır: `30`, `1.25`, `true`, `false`, `null` kendi tiplerine dönüşür; JSON-quoted `"00123"` string kalır; JSON literal olmayan metin (`Ali`) string kalır.
- Standart zarf alanları `key`, `stage` ve `tags` elemanları, JSON literal görünümlü olsalar bile **her zaman string** kalır.
- Belirsiz şekiller — `items[][name]=A` (indekssiz obje dizisi), bozuk bracket, negatif/seyrek indeks, aynı path'te skaler/konteyner çakışması — **HTTP 400** ile reddedilir; kısmen normalize edilmiş payload asla işlenmez.
- Payload mode çözümü değişmez: `x-vnext-payload-mode` header'ı otomatik algılamayı geçersiz kılar.
- Multipart form data ve dosya yükleme desteklenmez.
:::

**Responses:**
- `200 OK` → `StartInstanceOutput` (id, key, status, attributes, eTag, extensions) — `sync=true`
- `202 Accepted` → `sync=false` (varsayılan): iş, durable arkaplan işlemesi için kuyruğa alındı
- `400 Bad Request` → `ProblemDetails`
- `404 Not Found` → workflow bulunamadı
- `409 Conflict` → key collision

> **Not:** Workflow tanımında [`output` mapping](/docs/components/workflow#output-mapping) varsa ve istek `sync=true` ise, yanıt standart `StartInstanceOutput` zarfı yerine **doğrudan output script'in ürettiği gövde** olur (script'in status code + header'ları ile). Subflow instance'ları bu davranışın dışındadır.

### PATCH `/api/v1/{domain}/workflows/{workflow}/instances/{instance}/transitions/{transitionKey}`

Bir instance üzerinde transition tetikler.

**Query parameters:** `sync`, `extensions`

**Request body:** `TransitionDataInput`

| Field | Type | Description |
|---|---|---|
| `key` | string | Transition idempotency key |
| `tags` | string[] | Etiketler |
| `attributes` | object | Transition payload data |
| `stage` | string \| null | Kullanıcı tanımlı durum bilgisi (max 120 char, serbest metin) |

Gövde serbest (free-form) JSON da olabilir — bkz. yukarıdaki *Serbest payload* notu (`x-vnext-payload-mode` header'ı burada da geçerlidir). **Form-urlencoded** gövde de kabul edilir — bkz. yukarıdaki *Form-urlencoded gövde desteği* notu.

**Responses:**
- `200 OK` → `TransitionOutput` — `sync=true`
- `202 Accepted` → `sync=false` (varsayılan): iş, durable arkaplan işlemesi için kuyruğa alındı
- `400 Bad Request`, `403 Forbidden` (yetki yok), `404 Not Found`, `409 Conflict`, `503 Service Unavailable`

> **Not:** Workflow tanımında [`output` mapping](/docs/components/workflow#output-mapping) varsa ve istek `sync=true` ise, yanıt standart `TransitionOutput` zarfı yerine doğrudan output script'in ürettiği gövde olur.

> **Not (Content-Type):** Function ve instance **output script'leri** artık yanıtın `content-type` header'ını da belirleyebilir (önceden bu header ayıklanıyordu). Script bir değer set etmezse varsayılan `application/json` kullanılır. Entegrasyon senaryolarında (örn. XML/text dönen legacy sözleşmeler) kullanışlıdır.

### POST `/api/v1/{domain}/workflows/{workflow}/instances/{instance}/retry`

Faulted instance'ı **yeniden çalıştırır**.

**Query parameters:** `sync`

**Request body:** `TransitionDataInput`

**Responses:**
- `200 OK` → `RetryInstanceOutput` (id, status, retriedTransitionId)
- `400`, `404` → `ProblemDetails`

### GET `/api/v1/{domain}/workflows/{workflow}/instances/{instance}`

Instance metadata + data döner (extension dahil).

**Query parameters:** `extensions`, `version`
**Headers:** `If-None-Match` (ETag)

**Responses:**
- `200 OK` → `GetInstanceOutput`
- `304 Not Modified` → ETag eşleşti
- `404 Not Found`

### GET `/api/v1/{domain}/workflows/{workflow}/instances`

İlgili workflow'dan üretilen instance'ları **filtreler ve sıralar** (extension dahil **değildir**).

**Query parameters:**
- `filter` — JSONPath benzeri filter syntax (bkz. [Instance Filtering](/docs/how-to/instance-filtering))
- `extensions` — extension key listesi
- `page` (1-1000), `pageSize` (1-100), `sort`, `orderBy`, `version`

### GET `/api/v1/{domain}/workflows/{workflow}/instances/{instance}/transitions`

Instance'ın **transition history**'sini döner. Her transition kaydı, geçişin tamamlandığı andaki **dışarıdan görünen (effective) state** bilgisini de içerir:

| Field | Type | Description |
|---|---|---|
| `transitionKey` | string | Çalıştırılan transition |
| `fromState` / `toState` | string | Kaynak ve hedef state |
| `effectiveState` | string \| null | Tamamlanma anındaki effective state (subflow'larda dışarıya görünen state) |
| `effectiveStateType` | StateType \| null | Effective state'in türü |
| `effectiveStateSubType` | StateSubType \| null | Effective state'in alt türü |
| `stage` | string \| null | Çağıranın set ettiği stage değeri |

> **Not:** `effectiveState*` ve `stage` alanları transition **tamamlanma anında** snapshot'lanır. Başarısız/tamamlanmamış transition'larda ve v0.0.68 öncesi tarihsel kayıtlarda `null` döner (backfill yapılmaz).

---

## Common DTOs

### CreateInstanceDto

```typescript
{
  key?: string;        // max 100 chars
  tags?: string[];
  attributes?: any;
  stage?: string;      // max 120 chars, kullanıcı tanımlı durum bilgisi
}
```

### GetInstanceOutput

```typescript
{
  id?: string;          // uuid
  key?: string;
  flow?: string;
  domain?: string;
  flowVersion?: string;
  eTag?: string;
  entityEtag?: string;
  tags?: string[];
  metadata?: InstanceMetadataDto;
  attributes?: any;
  extensions?: { [key: string]: any };
}
```

### InstanceMetadataDto

```typescript
{
  currentState?: string;
  effectiveState?: string;
  status?: InstanceStatus;
  effectiveStateType?: StateType;       // initial|intermediate|finish|subFlow|wizard
  effectiveStateSubType?: StateSubType; // none|success|error|terminated|suspended|busy|human|cancelled|timeout
  completedAt?: string;     // ISO datetime
  duration?: number;
  createdAt: string;
  modifiedAt?: string;
  createdBy?: string;
  createdByBehalfOf?: string;
  modifiedBy?: string;
  modifiedByBehalfOf?: string;
  stage?: string;              // max 120 chars, kullanıcı tanımlı durum bilgisi
}
```

### StartInstanceOutput / TransitionOutput

```typescript
{
  id: string;
  key?: string;
  status: InstanceStatus;
  attributes?: any;
  eTag?: string;
  entityEtag?: string;
  extensions?: { [key: string]: any };
}
```

### RetryInstanceOutput

```typescript
{
  id: string;
  status: InstanceStatus;
  retriedTransitionId: string;
}
```

### TransitionDataInput

```typescript
{
  key?: string;
  tags?: string[];
  attributes?: any;
  stage?: string;      // max 120 chars, kullanıcı tanımlı durum bilgisi
}
```

### PublishInput

```typescript
{
  key: string;          // max 100 chars, [a-zA-Z0-9-]
  flow: string;         // max 100 chars
  domain: string;       // max 50 chars, [a-zA-Z-]
  version: string;      // max 180 chars
  flowVersion: string;
  tags?: string[];
  attributes: any;
  data?: PublishDataInput[];
}
```

### ProblemDetails (RFC 7807)

```typescript
{
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
}
```

---

## ETag (Concurrent Update Control)

Instance read response'larında `eTag` ve `entityEtag` döner. Update isteği için `If-None-Match` (read-after) veya `If-Match` (update concurrency) header'ı kullanılabilir. Bkz. [Core Principles → ETag](/architecture/overview/principles).

## Domain Filtreleme + URL Templates

API endpoint URL'leri Url Templates konfigürasyonu ile **özelleştirilebilir** (HEOTAS pattern, API gateway uyumu için).

## İlgili

- [Async / Sync](/docs/how-to/async-sync)
- [Instance Filtering](/docs/how-to/instance-filtering)
- [Instance Data](/docs/concepts/instance-data)
- [API Reference Index](/docs/api-reference/) — C# interface'ler
