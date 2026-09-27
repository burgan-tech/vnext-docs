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

### POST `/api/v1/definitions/publish/completed`

<sup>New</sup> v0.0.95 — Bir paketin **son** `publish` çağrısından sonra, deployment'a ait runtime işlerini (bugün tek hook: `discovery-cache`, discovery registry'sinin tam yeniden okunması) tetiklemek için **bir kez** çağrılır. `wf sync` / `update` / `reset` (CLI ≥ 1.0.14) ve init host bunu otomatik çağırır; kendi CD pipeline'ınız varsa publish döngüsünün sonuna ekleyin.

**Request body** (tüm alanlar opsiyonel):

| Field | Type | Description |
|---|---|---|
| `domain` | string | Verilirse runtime'ın kendi domain'iyle karşılaştırılır — yanlış runtime'a yönlenen pipeline sessizce başkasının cache'ini yenilemek yerine hata alır |
| `packageName` | string | Log/trace kimliği (örn. `@burgan-tech/vnext-onboarding`) |
| `version` | string | Log/trace kimliği |

**Response:** HTTP durum kodu **her zaman `200`**; sonuç gövdedeki `success` alanından okunur:

```json
{
  "success": true,
  "hooks": [ { "name": "discovery-cache", "outcome": "Refreshed", "message": null } ]
}
```

| `hooks[].outcome` | Anlamı |
|---|---|
| `Refreshed` | Registry yeniden okundu |
| `SkippedNotOwner` | Başka bir replica şu an okuyor; sonucu cluster geneline uygulanır (başarı) |
| `Disabled` | Yenilenecek bir şey yok: `ServiceDiscovery:Enabled=false`, `Provider=dapr` veya `Cache:Enabled=false` |
| `Failed` | Registry okunamadı — **yeniden deneyin**; `success: false` döner |

:::warning `GET /api/v1/definitions/re-initialize` kaldırıldı
v0.0.95 itibarıyla bu endpoint **yoktur** (`404`). Zaten no-op'tu; eski CLI ve init host bu 404'ü yalnızca uyarı olarak loglar, exit code değişmez — ancak discovery cache yenilenmez. Bkz. [Service Discovery → Cache](/docs/configuration/service-discovery).
:::

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

### GET `…/instances/{instance}/functions/tasks` ve `…/functions/actions` <sup>New</sup> v0.0.93

Instance'ın **task geçmişi** ve bir task'ın **aksiyon geçmişi** için iki yerleşik sistem fonksiyonu (transition ve incident geçmişinin tamamlayıcısı):

```http
GET /api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/tasks
GET /api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/actions?taskId={id}
```

| Parameter | In | Description |
|---|---|---|
| `instance` | path | Instance id veya business key |
| `taskId` | query | **Yalnız `actions` için, zorunlu** — `tasks` yanıtındaki bir öğenin `id`'si (journal satırı) |

- `tasks`: instance'ın tüm task journal'ı, **sayfalanmadan**, yürütme sırasında (StartedAt artan). Her öğe: `id`, `taskKey`, `transitionKey`, `fromState`, `toState`, `triggerType`, `status` (`waiting` / `busy` / `completed` / `faulted`), `businessStatus` (`unknown` / `success` / `failed`), `startedAt`, `finishedAt`, `durationMs`, `error`. **Yalnız metadata** — `Request` / `Response` payload'ları hiçbir API'de dönmez (mapping'lerin ürettiği auth header'ları içerebilir).
- `actions`: verilen journal satırının alt adımları (`{ id, status, startedAt, finishedAt, durationMs, detail }`), yürütme sırasında. `taskId` yok/GUID değil → `400` (`Instance:100039`); task bu instance'a ait değil → `404` (`Instance:100038`).
- `tasks` ve `actions` sistem anahtarlarıdır; aynı adlı custom function gölgelenir.
- Yetkilendirme: v0.0.95 itibarıyla in-process `queryRoles` kontrolü yoktur; gateway `authorize?queryRoles=true` ile karar verir (aşağıya bakın).

### GET `…/instances/{instance}/functions/authorize`

Runtime'ın **tek yetkilendirme karar noktası** <sup>New</sup> v0.0.95: Internal Gateway isteği iletmeden önce bu fonksiyona sorar. Fonksiyon bir soruya cevap verir, kendisi hiçbir şeyi korumaz.

| Parameter | In | Description |
|---|---|---|
| `transitionKey` | query | Bu transition tetiklenebilir mi? (mevcut state'te sunuluyor mu **ve** `transition.roles` / `availableIn[state].roles`) |
| `functionKey` | query | Bu **custom** function çağrılabilir mi? (`Function.roles`; rol tanımsızsa izinli) |
| `queryRoles=true` | query | Instance okunabilir mi? Aktif subflow zincirinin **tamamı** boyunca konjonksiyon; her hop'ta parent'ın `subflow.state_role_overrides` damgası → state'in `queryRoles` → workflow kökü |
| `ack=true` | query | <sup>New</sup> v0.0.95 — `POST …/longpoll/ack` çağrılabilir mi? Girilen state'in `interaction.longPoll` kolu (`roles` **veya** condition `rule`) aynı `ILongPollInteractionGate` ile değerlendirilir |
| `role` | query | Sorgulanacak tek bir rol. v0.0.96'dan itibaren `ack=true` sorgusunda her yolda çağıran rollerine eklenir; v0.0.97'den itibaren `CallerRoleProvider:Provider=morph-idm` altında `role` header'ı yoksa header gibi davranır (gerçek header her zaman kazanır) |
| `version` | query | Workflow tanım versiyonunu sabitler; yoksa instance'ın kendi versiyonu |

Dört seçiciden **tam olarak biri** verilmelidir; sıfır veya iki seçici `Authorization:110002` ile reddedilir.

**Responses:** `200` → `{"allowed": true}`, `403` → `{"allowed": false}` — karar **her iki durumda da gövdededir**. Yanıtlanamayan soru (instance yok, hatalı istek) hata zarfıyla `4xx`/`5xx` döner.

:::warning In-process `queryRoles` denetimleri kaldırıldı — v0.0.95
`state`, `data`, `view`, `schema`, `master`, `tasks`, `actions`, `incidents`, `incidents/active` fonksiyonları ve `POST …/longpoll/ack` artık kendi içlerinde `queryRoles` / interaction kapısını **değerlendirmez**. Karar yalnızca `authorize` üzerinden verilir; Internal Gateway'in bu fonksiyonu çağırmadığı bir deployment'ta bu yüzeylerde `queryRoles` **uygulanmaz**. Görünürlük çözümü (transition filtreleme, `x-roles`) değişmemiştir. Ayrıntı: [Yetkilendirme](/docs/concepts/authorization).
:::

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
- `extensions` — <sup>New</sup> v0.0.93 itibarıyla **yok sayılır** (reddedilmez): senkron start/transition yanıtı extension değerlendirmez ve `extensions` anahtarı her zaman `{}` döner. Extension verisi için `GET …/instances/{instance}?extensions=` veya liste endpoint'ini kullanın

**Request body:** `CreateInstanceDto`

| Field | Type | Description |
|---|---|---|
| `key` | string | Instance key (max 100 char) |
| `tags` | string[] | Etiketler |
| `attributes` | object | Initial instance data |
| `stage` | string \| null | Kullanıcı tanımlı durum bilgisi (max 120 char, serbest metin) |

:::tip[Serbest (free-form) payload <sup>New</sup> v0.0.85]
Gövde, standart zarfa ait bir alan içermeyen **serbest bir JSON** de olabilir; runtime bunu otomatik olarak `{"attributes": {...}}` şekline normalize eder. Örn. `{"customer_id":"123"}` → `{"attributes":{"customer_id":"123"}}`.

Envelope auto-detection şu kuralı izler: top-level'da bir `attributes` alanı varsa (case-insensitive), yanında başka alanlar olsa bile gövde **her zaman** standart zarf sayılır. `attributes` yoksa, gövde standart zarf sayılır **ancak ve ancak** top-level'daki alanların **tamamı** `key`/`tags`/`stage`'den ibaretse (case-insensitive); diğer tüm durumlar — boş gövde dahil — serbest (free-form) kabul edilir. Bu nedenle yalnızca `key`/`tags`/`stage` adlı alanlardan oluşan bir serbest payload zarftan ayırt edilemez ve **belirsizdir** — böyle bir payload'ı serbest olarak göndermek için `x-vnext-payload-mode: raw` header'ı zorunludur. Case-insensitive algılama sayesinde `{"Attributes": {...}}` (PascalCase) gibi gövdeler de standart zarf olarak çalışır.

Mod, `x-vnext-payload-mode` header'ı ile de zorlanabilir:

| Header değeri | Etki |
|---|---|
| `raw` | Gövdede zarf alanları olsa bile serbest payload kabul edilir |
| `standard` | Gövdede zarf alanları olmasa bile standart DTO kabul edilir |
| (yok) | Yukarıdaki şekil tabanlı kural otomatik uygulanır |

Aynı davranış transition endpoint'i için de geçerlidir.
:::

:::note[Schema doğrulama hataları <sup>New</sup> v0.0.85]
Bir `schema` içeren transition/start isteği geçersiz bir payload ile reddedildiğinde, `400` yanıtı hangi alan(lar)ın başarısız olduğunu **her zaman** adlandırır:

```jsonc
{
  "error": {
    "validationErrors": [
      { "members": ["root"], "message": "Required properties [\"customer\"] are not present" },
      { "members": ["customer.ownerUserId"], "message": "Required properties [\"ownerUserId\"] are not present" }
    ]
  }
}
```

- `members` alanındaki adlar **instance path**'leridir (`root`, `customer.ownerUserId`), JSON Schema keyword'ü değil.
- Bir root-seviyesi hata ile bir child hata **birlikte** raporlanır; biri diğerini gizlemez.
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

**Query parameters:** `sync` (`extensions` <sup>New</sup> v0.0.93 itibarıyla yok sayılır; yanıttaki `extensions` her zaman `{}`)

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

### POST `/api/v1/{domain}/workflows/{workflow}/instances/{instance}/longpoll/ack`

`interaction.longPoll` ile duraklatılmış pipeline'ı **devam ettirir**; client, long-poll'u bırakıp girilen state ekranını render ettikten sonra çağırır. **Idempotent**: zincirde ack bekleyen instance yoksa (zaten devam etti veya fallback timeout tetiklendi) `200` döner. Ack bekleyen instance aktif subflow zincirinin en derin çocuğuysa çağrı oraya iletilir.

**Query parameters:** `version`, `role`

**Responses:**
- `200 OK` → ack kabul edildi (pipeline devam etti veya zaten devam etmişti)
- `404 Not Found` → instance/workflow yok

:::note Yetkilendirme — v0.0.95
Endpoint `interaction.longPoll.roles` / `rule` kolunu **kendi içinde değerlendirmez**; karar gateway'in çağırdığı `GET …/functions/authorize?ack=true` ile verilir (yukarıya bakın). Bu sayede gateway'in kendi başına değerlendiremeyeceği C# `rule` kolu da kapsanır.
:::

### POST `/api/v1/{domain}/workflows/{workflow}/instances/{instance}/retry`

Faulted instance'ı **yeniden çalıştırır**.

**Query parameters:** `sync`

**Request body:** `TransitionDataInput`

**Responses:**
- `200 OK` → `RetryInstanceOutput` (id, status, retriedTransitionId)
- `400`, `404` → `ProblemDetails`

> **Not:** Yeniden yürütülen iş **tekrar fault** olursa yanıt yine `200` ile `"status": "F"` döner ve bu durum **kalıcıdır** — instance Faulted kalır ve **ikinci bir retry kabul edilir**. Başarılı bir retry (unfault) instance'ın **tüm** açık incident'larını kapatır ve `hasActiveIncident` bayrağını yeniden hesaplar. Ayrıntı: [Instance Incidents](/docs/concepts/incidents).

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

### GET `/api/v1/{domain}/workflows/{workflow}/instances/{instance}/incidents` <sup>New</sup>

Instance'ın error-boundary incident geçmişini **en yeniden eskiye** sayfalar. Ayrıntı: [Instance Incidents](/docs/concepts/incidents).

**Query parameters:** `page` (1-based, default `1`), `pageSize` (default `20`, max `100`)

**Responses:**
- `200 OK` → `{ hasActiveIncident, items: IncidentDetail[], page, pageSize, hasNext }`
- `403 Forbidden` → v0.0.95 itibarıyla in-process `queryRoles` denetimi **yoktur**; `403`, gateway'in `authorize?queryRoles=true` cevabına göre döner

### GET `/api/v1/{domain}/workflows/{workflow}/instances/{instance}/incidents/active` <sup>New</sup>

Instance'ın en yeni **çözülmemiş** incident'ını döner (`incident.active.href`'in hedefi). Ayrıntı: [Instance Incidents](/docs/concepts/incidents).

**Responses:**
- `200 OK` → `IncidentDetail`
- `404 Not Found` (`Instance:100037`) → açık incident yok — **normal bir sonuçtur**, hata değildir (bir retry arada çözmüş olabilir)
- `403 Forbidden` → v0.0.95 itibarıyla in-process `queryRoles` denetimi **yoktur**; `403`, gateway'in `authorize?queryRoles=true` cevabına göre döner

> **Not (`internal/*` endpoint'leri):** `internal/subflow-forward`, `internal/busy-release` ve `internal/related-data` gibi `internal/` önekli rotalar **public API değildir** — runtime içi (Dapr sidecar-to-sidecar) çağrılar için var olan, ağ izolasyonuna dayanan dahili endpoint'lerdir ve bu referansın kapsamı dışındadır.

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
  effectiveStatus?: InstanceStatus;     // v0.0.94 — aktif SubFlow varken en derin aktif çocuğun durumu, aksi halde status; state fonksiyonunun status'u ile aynı değer
  type?: "R" | "S" | "P";               // v0.0.94 — nasıl başlatıldığı: Root | SubFlow child | SubProcess child; değişmez. Filtrede adı `instanceType`
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
  incident?: IncidentHref;     // hasActiveIncident + active/history link'leri — bkz. Instance Incidents
}
```

### IncidentHref <sup>New</sup>

`GetInstanceOutput.metadata.incident` ve state fonksiyonunun `incident` bloğu **aynı** şekli paylaşır. Ayrıntı: [Instance Incidents](/docs/concepts/incidents).

```typescript
{
  hasActiveIncident: boolean;
  active?: { href: string };   // yalnızca hasActiveIncident true iken bulunur
  history: { href: string };   // her zaman bulunur
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

Instance sorgu doğrulama hataları (`Validation:900011` … `900014`) `error.validationErrors[]` içinde her red nedenini `members` (istek yolu, örn. `filter.attributes.amount.eq`) + `message` ile taşır. <sup>New</sup> v0.0.94 `filter.valueTooLong`: 1000 karakterden uzun bir skaler filtre operandı `400` / `Validation:900011` ile reddedilir (`in` / `nin` / `between` operandları tek tek ölçülür). Bkz. [Instance Filtering → Hata Yönetimi](/docs/how-to/instance-filtering).

---

## ETag (Concurrent Update Control)

Instance read response'larında `eTag` ve `entityEtag` döner. Update isteği için `If-None-Match` (read-after) veya `If-Match` (update concurrency) header'ı kullanılabilir. Bkz. [Core Principles → ETag](/architecture/overview/principles).

## Domain Filtreleme + URL Templates

API endpoint URL'leri Url Templates konfigürasyonu ile **özelleştirilebilir** (HEOTAS pattern, API gateway uyumu için).

## İlgili

- [Async / Sync](/docs/how-to/async-sync)
- [Instance Filtering](/docs/how-to/instance-filtering)
- [Instance Data](/docs/concepts/instance-data)
- [Instance Incidents](/docs/concepts/incidents)
- [API Reference Index](/docs/api-reference/) — C# interface'ler
