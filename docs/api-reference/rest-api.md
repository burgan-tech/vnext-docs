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

:::warning[`GET /api/v1/definitions/re-initialize` kaldırıldı]
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

> **Not (kural tabanlı `inputSchema`):** <sup>New</sup> v0.0.105 Function'ın `inputSchema`'sı kural tabanlı bir liste ise ve gövdeli bir istek için hiçbir entry eşleşmezse istek artık doğrulama atlanarak kabul edilmez; `400` `Function:800006` ile reddedilir (**breaking**). Gövdesiz istek kabul edilmeye devam eder. Eşleşmeyen çağıranları kabul etmek için listeyi kuralsız bir fallback entry ile bitirin. Ayrıntı: [Breaking Changes v0.0.105](/blog/breaking-changes/breaking-changes-v0-0-105).
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

- `tasks`: instance'ın tüm task journal'ı, **sayfalanmadan**, yürütme sırasında (StartedAt artan). Her öğe: `id`, `taskKey`, `transitionKey`, `fromState`, `toState`, `triggerType`, `hook` ve `order` (<sup>New</sup> v0.0.99; migration öncesi satırlarda `null`), `status` (`waiting` / `busy` / `completed` / `faulted`), `businessStatus` (`unknown` / `success` / `failed`), `startedAt`, `finishedAt`, `durationMs`, `error`. **Yalnız metadata** — `Request` / `Response` payload'ları hiçbir API'de dönmez (mapping'lerin ürettiği auth header'ları içerebilir).
- `actions`: verilen journal satırının alt adımları (`{ id, status, startedAt, finishedAt, durationMs, detail }`), yürütme sırasında. `taskId` yok/GUID değil → `400` (`Instance:100039`); task bu instance'a ait değil → `404` (`Instance:100038`).
- `tasks` ve `actions` sistem anahtarlarıdır; aynı adlı custom function gölgelenir.
- Yetkilendirme: v0.0.95 itibarıyla in-process `queryRoles` kontrolü yoktur; gateway `authorize?queryRoles=true` ile karar verir (aşağıya bakın).

### GET `…/instances/{instance}/functions/authorize`

Runtime'ın **tek yetkilendirme karar noktası** <sup>New</sup> v0.0.95: Internal Gateway isteği iletmeden önce bu fonksiyona sorar. Fonksiyon bir soruya cevap verir, kendisi hiçbir şeyi korumaz.

| Parameter | In | Description |
|---|---|---|
| `transitionKey` | query | Bu transition tetiklenebilir mi? (mevcut state'te sunuluyor mu **ve** `transition.roles` / `availableIn[state].roles`) |
| `functionKey` | query | Bu **custom** function çağrılabilir mi? (`Function.roles`; rol tanımsızsa izinli) |
| `queryRoles=true` | query | Instance okunabilir mi? <sup>New</sup> v0.0.99 Aktif subflow zincirinde karar **yalnızca en derin aktif leaf'te** verilir (üst seviyeler AND'lenmez): parent'ın damgaladığı override ?? leaf state `queryRoles` ?? leaf workflow `queryRoles`. Root `queryRoles` bildirip leaf bildirmiyorsa erişim gevşer — parent override veya leaf `queryRoles` ekleyin |
| `ack=true` | query | <sup>New</sup> v0.0.95 — `POST …/longpoll/ack` çağrılabilir mi? Girilen state'in `interaction.longPoll` kolu (`roles` **veya** condition `rule`) aynı `ILongPollInteractionGate` ile değerlendirilir |
| `role` | query | Sorgulanacak tek bir rol. v0.0.96'dan itibaren `ack=true` sorgusunda her yolda çağıran rollerine eklenir; v0.0.97'den itibaren `CallerRoleProvider:Provider=morph-idm` altında `role` header'ı yoksa header gibi davranır (gerçek header her zaman kazanır) |
| `version` | query | Workflow tanım versiyonunu sabitler; yoksa instance'ın kendi versiyonu |

Dört seçiciden **tam olarak biri** verilmelidir; sıfır veya iki seçici `Authorization:110002` ile reddedilir. Parent'ta kalan transition'lar (`cancel`, `exit`, `updateData`, parent state'inde sunulan shared transition) ve `ack=true` davranışı v0.0.99'da değişmedi. Ayrıntı: [Built-in Functions → Instance Authorize](/docs/components/functions/built-in#instance-authorize).

**Responses:** `200` → `{"allowed": true}`, `403` → `{"allowed": false}` — karar **her iki durumda da gövdededir**. Yanıtlanamayan soru (hatalı istek, rol çözümleme hatası) hata zarfıyla `4xx`/`5xx` döner.

<sup>New</sup> v0.0.104 Yanıt gövdesinde opsiyonel bir **`reason`** alanı bulunabilir. Tek değeri `"instance-not-found"`'dur ve yalnızca **adreslenen instance yüklenemediğinde** döner — hiçbir grant değerlendirilmemiştir, status yine `403`'tür:

```json
{ "allowed": false, "reason": "instance-not-found" }
```

Sıradan bir kararda (izin ya da grant reddi) alan **yoktur**; gövde önceki gibi `{"allowed": true|false}`'dur. Gateway / client açısından, doğrudan adreslenen bir instance için `reason: "instance-not-found"` taşıyan `403`, çağıranın rolü eksik demek değil, instance'ın (henüz) var olmadığı demektir. Aynı sürümde `queryRoles=true` sorgusu, SubFlow child'ı henüz oluşturulmamışken (correlation commit edilmiş, child satırı post-commit job ile yaratılıyor) **mevcut en derin instance**'ın kendi `queryRoles` çözümüyle karar verir; önceden bu pencerede her state poll'u `403` alıyordu. `transitionKey` / `functionKey` var olmayan bir child'a iletildiğinde red devam eder. Kavramsal ayrıntı: [Yetkilendirme](/docs/concepts/authorization). Örnek: [vnext-example — `LeafNotCreatedYetTests.cs`](https://github.com/burgan-tech/vnext-example/blob/master/tests/Core.IntegrationTests/Tests/AuthorizationChainLab/LeafNotCreatedYetTests.cs) ([`authorization-chain-lab`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/authorization-chain-lab/authorization-chain-lab-root-slow.json)).

### GET `/api/v1/{domain}/workflows/{workflow}/functions/authorize`

<sup>New</sup> v0.0.105 `authorize` fonksiyonunun **workflow kapsamlı** rotası: henüz instance yokken, çağıranın bu flow'dan **instance başlatıp başlatamayacağını** flow'un kendi `startTransition.roles` tanımından cevaplar. Gateway `POST …/instances/start` isteğini, diğer transition'larda olduğu gibi bu cevaba göre kabul eder ya da reddeder; start transition'ın key'ini bilmesine gerek yoktur, rota onu tanımdan çözer.

```http
GET /api/v1/{domain}/workflows/{workflow}/functions/authorize?type=instance[&version=x][&role=r]
```

| Parameter | In | Required | Description |
|---|---|---|---|
| `type` | query | Evet | Neyin yetkilendirildiği. Bugün desteklenen tek değer `instance` (yeni instance başlatma). Varsayılanı yoktur; eksik ya da bilinmeyen değer → `400` `Authorization:110005` (mesaj desteklenen değerleri listeler). Instance listesi filtresindeki `instanceType` (`R`/`S`/`P`) ile karıştırmayın |
| `version` | query | Hayır | Tanım versiyonunu sabitler; gateway start isteğinin kendi `version`'ını iletmelidir ki ikisi aynı rolleri okusun |
| `role` | query | Hayır | Instance rotasıyla aynı çağıran rol çözümü |

**Responses:** `200` → `{"allowed": true}`, `403` → `{"allowed": false}` (sözleşme instance rotasıyla aynı); `400` → `Authorization:110005`; `404` → bilinmeyen flow veya versiyon.

- Statik roller ve `$Everyone` her zamanki gibi karşılaştırılır. **Instance'a bağlı grant'lar** (`$InstanceStarter`, `$PreviousUser`, `$InstanceBehalfOfStarter`, `$PreviousBehalfOfUser`, `$user.` / `$userBehalfOf.` / `$role.` context referansları) start öncesi **hiçbir zaman eşleşmez** — ne kabul ne red üretir. Yalnızca `allow $InstanceStarter` ile korunan bir start transition herkese **kapalıdır**; `[allow $InstanceStarter, allow maker]` ise `maker` ile karar verir. Grant yoksa izinlidir.
- Runtime `POST …/instances/start`'ta `startTransition.roles`'u kendisi denetlemez; karar, diğer tüm transition'larda olduğu gibi gateway'dedir.

Gateway kuralı örneği (orchestrator host'u ortama özeldir):

```csharp
Utils.CallApiGet("http://<orchestrator-host>/api/v1/"+path.var1+"/workflows/"+path.var2+"/functions/authorize?type=instance", header, allHeader).IsSuccessStatusCode == true
```

Kavramsal ayrıntı: [Yetkilendirme](/docs/concepts/authorization). Örnek: [vnext-example — `StartAuthorizeTests.cs`](https://github.com/burgan-tech/vnext-example/blob/master/tests/Core.IntegrationTests/Tests/RoleMatrixLab/StartAuthorizeTests.cs).

:::warning[In-process `queryRoles` denetimleri kaldırıldı — v0.0.95]
`state`, `data`, `view`, `schema`, `master`, `tasks`, `actions`, `instance-correlation`, `incidents`, `incidents/active` fonksiyonları ve `POST …/longpoll/ack` artık kendi içlerinde `queryRoles` / interaction kapısını **değerlendirmez**. Karar yalnızca `authorize` üzerinden verilir; Internal Gateway'in bu fonksiyonu çağırmadığı bir deployment'ta bu yüzeylerde `queryRoles` **uygulanmaz**. Görünürlük çözümü (transition filtreleme, `x-roles`) değişmemiştir. Ayrıntı: [Yetkilendirme](/docs/concepts/authorization).
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

Workflow'un tanımlı function'larının **rol filtreli** listesini döner (`{ "functions": [ { "name", "version", "scope", "labels", "href" } ] }`, bildirim sırasında; `labels` <sup>New</sup> v0.0.99 function'ın `attributes.labels` listesidir, tanımlı değilse yok). State function yanıtındaki `functions.href` bu rotayı işaret eder. Ayrıntı: [Built-in Functions → Catalog](/docs/components/functions/built-in).

### GET `/api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/instance-correlation`

<sup>New</sup> v0.0.99 Instance'ın başlattığı SubFlow/SubProcess'lerin **aşağı yönlü, recursive ağacını** döner (`{ "root": node }`; tamamlanmış correlation'lar dahil, null alanlar yazılmaz). Her node: `id`, `key`, `flow`, `domain`, `flowVersion`, `currentState`, `ownState`, `status`, `subFlowType` (`S`/`P`, kökte yok), `isCompleted`, `completedAt`, `terminalOutcome`, `parentState`, `correlationId`, `createdAt`, `stateChangedAt`, `href`, `children[]`, `resolved`, `unresolvedReason` (`depth-exceeded` / `hop-failed` / `instance-missing` / `hop-unsupported`).

| Parameter | In | Description |
|---|---|---|
| `instance` | path | Instance id veya business key |

- Cross-domain dallar dahili `POST /{domain}/workflows/{workflow}/internal/correlations/batch` rotasıyla (en fazla 500 id) tek çağrıda çözülür; yapılandırma `Workflow:InstanceCorrelation` (`MaxDescentDepth` 20, `FanoutParallelism` 8, `MaxConcurrentHops` 32).
- Yetkilendirme: in-process gate yok; gateway `authorize?queryRoles=true` ile karar verir.
- Ayrıntı: [Built-in Functions → Instance Correlation](/docs/components/functions/built-in).

:::warning[`…/functions/hierarchy` kaldırıldı — v0.0.99]
Eski `GET …/instances/{instance}/functions/hierarchy` rotası kaldırıldı; **alias yoktur**, eski yol custom function çözümlemesine düşer ve `404` döner. `instance-correlation`'a geçin.
:::

### Metrik Endpoint'leri

<sup>New</sup> v0.0.99 Salt-okunur yürütme metrikleri:

```http
GET /api/v1/{domain}/workflows/{workflow}/instances/{instance}/transitions/{transitionKey}/metrics
GET /api/v1/{domain}/workflows/{workflow}/instances/{instance}/states/{stateKey}/metrics
GET /api/v1/{domain}/functions/{function}/metrics
GET /api/v1/{domain}/workflows/{workflow}/functions/{function}/metrics
```

- **Transition / state metrikleri:** `{ element: { kind, key }, count, attempts: [ { seq, startedAt, finishedAt, durationMs, triggerType, triggeredBy, tasks: [ { id, taskKey, hook, order, status, businessStatus, startedAt, durationMs, faultedTaskRef, error } ] } ] }` — transition firing'i veya state ziyareti başına bir attempt.
- **Function metrikleri:** yalnızca `attributes.executionLog: "E"` olan function'lar için kayıt tutulur (`"D"` veya alan yoksa hiçbir şey kaydedilmez). Query: `page` (varsayılan 1), `pageSize` (varsayılan 20, max 100), `from`, `to`, `succeeded`. Yanıt: `{ links, items: [...], summary: { count, p50Ms, p95Ms, failureRate } }`.
- Ayrıntı: [Gözlemlenebilirlik](/docs/how-to/observability) → "Metrik Endpoint'leri".

---

## Instance Endpoints

### POST `/api/v1/{domain}/workflows/{workflow}/instances/start`

Yeni instance başlatır.

**Query parameters:**
- `version` — workflow versiyonu (opsiyonel). <sup>New</sup> v0.0.102 Flow'un `sys-version-registry`'de bir varsayılan sürüm pointer'ı varsa sürümsüz, `latest` ve kısmi (`2`, `2.1`) istekler bu varsayılana çözülür; tam ya da artifact sürüm (`2.2.0`) tavan tanımaz — bkz. [Flow Varsayılan Sürümü](/docs/concepts/flow-default-version)
- `sync` — `true`/`false` (default `false`); bkz. [Async / Sync](/docs/how-to/async-sync). <sup>New</sup> v0.0.99 Flow (`attributes.executionType`) veya `startTransition.executionType` tanımlıysa (`"S"` / `"A"`) parametre **yok sayılır** — tanım kazanır
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
- Multipart form data desteklenmez. Dosya göndermek için <sup>New</sup> v0.0.100 master schema'da `x-storage` ile işaretli alana JSON gövdede base64 `content` koyun (`{ name, mimeType, size, content }`); runtime baytları blob deposuna yazar ve alana bir handle koyar — bkz. [Dosya Alanları (x-storage)](/docs/how-to/file-fields).
:::

**Responses:**
- `200 OK` → `StartInstanceOutput` (id, key, status, effectiveStatus, attributes, eTag, extensions, <sup>New</sup> v0.0.102 `flowVersion` — instance'ın başladığı **çözülmüş** sürüm, <sup>New</sup> v0.0.104 `currentState` / `effectiveState` — bkz. [StartInstanceOutput / TransitionOutput](#startinstanceoutput--transitionoutput)) — etkin mod senkron (`sync=true` veya tanımda `executionType: "S"`)
- `202 Accepted` → etkin mod asenkron (`sync=false` varsayılan veya tanımda `executionType: "A"`): iş, durable arkaplan işlemesi için kuyruğa alındı
- `400 Bad Request` → `ProblemDetails` (<sup>New</sup> v0.0.100 `x-storage` alanında geçersiz dosya gövdesi: `Instance:100048`; <sup>New</sup> v0.0.105 `startTransition` kural tabanlı `schemas` bildiriyor ve hiçbir entry eşleşmedi: `Transition:100025`)
- `404 Not Found` → workflow bulunamadı; <sup>New</sup> v0.0.102 istenen sürüm(ler) varsayılanın üstünde bekliyor (`Instance:100051`)
- `409 Conflict` → key collision; <sup>New</sup> v0.0.102 varsayılan sürüm pointer'ı geçersiz ya da hiçbir yayınlanmış sürümle eşleşmiyor (`Instance:100052`)
- `413 Payload Too Large` → gövde host sınırını aştı (varsayılan 10 MiB ≈ 7,5 MiB base64 dosya)
- `503 Service Unavailable` → <sup>New</sup> v0.0.100 blob deposu ulaşılamıyor (`Instance:100047`) veya dosya taşıyan gövde için master schema yüklenemiyor (`Instance:100050`); instance oluşturulmaz. <sup>New</sup> v0.0.102 sürüm registry'si okunamıyor (`Instance:100053`, geçici)

> **Not:** Workflow tanımında [`output` mapping](/docs/components/workflow#output-mapping) varsa ve istek `sync=true` ise, yanıt standart `StartInstanceOutput` zarfı yerine **doğrudan output script'in ürettiği gövde** olur (script'in status code + header'ları ile). Subflow instance'ları bu davranışın dışındadır.

### PATCH `/api/v1/{domain}/workflows/{workflow}/instances/{instance}/transitions/{transitionKey}`

Bir instance üzerinde transition tetikler.

**Query parameters:** `sync` (`extensions` <sup>New</sup> v0.0.93 itibarıyla yok sayılır; yanıttaki `extensions` her zaman `{}`). <sup>New</sup> v0.0.99 Transition'ın `executionType`'ı, yoksa flow'un `attributes.executionType`'ı tanımlıysa `sync` **yok sayılır** (öncelik: transition → flow → `?sync`). Otomatik transition'lara ve runtime'ın subflow start/forward çağrılarına uygulanmaz — bkz. [Async / Sync → executionType](/docs/how-to/async-sync#tanımla-belirlenen-mod-executiontype)

**Request body:** `TransitionDataInput`

| Field | Type | Description |
|---|---|---|
| `key` | string | Transition idempotency key |
| `tags` | string[] | Etiketler |
| `attributes` | object | Transition payload data |
| `stage` | string \| null | Kullanıcı tanımlı durum bilgisi (max 120 char, serbest metin) |

Gövde serbest (free-form) JSON da olabilir — bkz. yukarıdaki *Serbest payload* notu (`x-vnext-payload-mode` header'ı burada da geçerlidir). **Form-urlencoded** gövde de kabul edilir — bkz. yukarıdaki *Form-urlencoded gövde desteği* notu.

**Responses:**
- `200 OK` → `TransitionOutput` — etkin mod senkron (`sync=true` veya `executionType: "S"`); <sup>New</sup> v0.0.104 `currentState` / `effectiveState` taşır
- `202 Accepted` → etkin mod asenkron (`sync=false` varsayılan veya `executionType: "A"`): iş, durable arkaplan işlemesi için kuyruğa alındı
- `400 Bad Request`, `403 Forbidden` (yetki yok), `404 Not Found`, `409 Conflict`, `503 Service Unavailable`
- <sup>New</sup> v0.0.100 Dosya alanları için `400` (`Instance:100048`), `503` (`Instance:100047` / `Instance:100050`) — bkz. [Hata kodları](#instance-hata-kodları-v00100).
- <sup>New</sup> v0.0.105 Transition kural tabanlı `schemas` bildiriyor ve hiçbir entry eşleşmedi → `400` `Transition:100025` (instance state'ini korur, fault edilmez; `schema` / `schemas` bildirmeyen transition kabul edilmeye devam eder). Bir `schemas` kuralı `context.Caller` ile çağıran rollerini okurken rol sağlayıcı cevap veremezse → `503` `Authorization:110006` (yeniden denenebilir) — bkz. [Hata kodları (v0.0.105)](#hata-kodları-v00105).

> **Not (aktif SubFlow):** <sup>New</sup> v0.0.100 Instance'ın aktif bir SubFlow'u varsa transition parent'ta kuyruğa alınmaz, değiştirilmeden en derin aktif child'a (leaf) iletilir; yanıt parent'ın id'sini ve child'ın status'ünü taşır. Leaf'in reddi (`400`/`403`/`409`) artık senkron döner. Child tamamlanmış ya da henüz oluşmamışsa parent `409` `InstanceBusy` döner — yeniden deneyin. Ayrıntı: [Workflow → SubFlow State](/docs/components/workflow).

> **Not:** Workflow tanımında [`output` mapping](/docs/components/workflow#output-mapping) varsa ve istek `sync=true` ise, yanıt standart `TransitionOutput` zarfı yerine doğrudan output script'in ürettiği gövde olur.

> **Not (Content-Type):** Function ve instance **output script'leri** artık yanıtın `content-type` header'ını da belirleyebilir (önceden bu header ayıklanıyordu). Script bir değer set etmezse varsayılan `application/json` kullanılır. Entegrasyon senaryolarında (örn. XML/text dönen legacy sözleşmeler) kullanışlıdır.

### POST `/api/v1/{domain}/workflows/{workflow}/instances/{instance}/longpoll/ack`

`interaction.longPoll` ile duraklatılmış pipeline'ı **devam ettirir**; client, long-poll'u bırakıp girilen state ekranını render ettikten sonra çağırır. **Idempotent**: zincirde ack bekleyen instance yoksa (zaten devam etti veya fallback timeout tetiklendi) `200` döner. Ack bekleyen instance aktif subflow zincirinin en derin çocuğuysa çağrı oraya iletilir.

**Query parameters:** `version`, `role`

**Responses:**
- `200 OK` → ack kabul edildi (pipeline devam etti veya zaten devam etmişti)
- `404 Not Found` → instance/workflow yok

:::note[Yetkilendirme — v0.0.95]
Endpoint `interaction.longPoll.roles` / `rule` kolunu **kendi içinde değerlendirmez**; karar gateway'in çağırdığı `GET …/functions/authorize?ack=true` ile verilir (yukarıya bakın). Bu sayede gateway'in kendi başına değerlendiremeyeceği C# `rule` kolu da kapsanır.
:::

### POST `/api/v1/{domain}/workflows/{workflow}/instances/{instance}/retry`

Faulted instance'ı **yeniden çalıştırır**.

**Query parameters:** `sync`

**Request body:** `TransitionDataInput`

**Responses:**
- `200 OK` → `RetryInstanceOutput` (id, status, retriedTransitionId)
- `400`, `404` → `ProblemDetails`
- `409 Conflict` → <sup>New</sup> v0.0.100 workflow'u `attributes.history: "none"` olan instance'ta retry desteklenmez (`Instance:100045`) — bkz. [Workflow → History Modu](/docs/components/workflow)

> **Not:** Yeniden yürütülen iş **tekrar fault** olursa yanıt yine `200` ile `"status": "F"` döner ve bu durum **kalıcıdır** — instance Faulted kalır ve **ikinci bir retry kabul edilir**. Başarılı bir retry (unfault) instance'ın **tüm** açık incident'larını kapatır ve `hasActiveIncident` bayrağını yeniden hesaplar. Ayrıntı: [Instance Incidents](/docs/concepts/incidents).

### GET `/api/v1/{domain}/workflows/{workflow}/instances/{instance}`

Instance metadata + data döner (extension dahil).

**Query parameters:** `extensions`, `version`
**Headers:** `If-None-Match` (ETag)

**Responses:**
- `200 OK` → `GetInstanceOutput`
- `304 Not Modified` → ETag eşleşti
- `404 Not Found` — <sup>New</sup> v0.0.102 flow `attributes.rowSecurity` tanımlıyorsa çağıranın kurallarının dışladığı bir instance da bulunmayan bir instance ile **aynı** `404`'ü döner (ETag karşılaştırmasından önce)
- `404` / `409` / `503` — <sup>New</sup> v0.0.102 flow tanımı aranamadıysa arama hatası olduğu gibi döner (`Instance:100051` / `Instance:100052` / `Instance:100053`), flow'da `rowSecurity` olsun ya da olmasın. Bkz. [Satır Güvenliği](/docs/concepts/row-security)

### GET `/api/v1/{domain}/workflows/{workflow}/instances`

İlgili workflow'dan üretilen instance'ları **filtreler ve sıralar** (extension dahil **değildir**).

**Query parameters:**
- `filter` — JSONPath benzeri filter syntax (bkz. [Instance Filtering](/docs/how-to/instance-filtering))
- `extensions` — extension key listesi
- `page` (1-1000), `pageSize` (1-100), `sort`, `orderBy`, `version`

<sup>New</sup> v0.0.102 Flow `attributes.rowSecurity` tanımlıyorsa sonuç (sayfalar, `groupBy` ve aggregation'lar dahil) yalnızca çağıranın eşleşen kurallarının açtığı satırları kapsar; tanımlıysa deny-by-default'tur. Flow tanımı aranamadıysa liste boş sayfa yerine arama hatasını döner (`Instance:100051` / `Instance:100052` / `Instance:100053`). Bkz. [Satır Güvenliği](/docs/concepts/row-security).

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

> **Not (`internal/*` endpoint'leri):** `internal/subflow-forward`, `internal/busy-release`, `internal/related-data` ve <sup>New</sup> v0.0.100 `internal/file` gibi `internal/` önekli rotalar **public API değildir** — runtime içi (Dapr sidecar-to-sidecar) çağrılar için var olan, ağ izolasyonuna dayanan dahili endpoint'lerdir ve bu referansın kapsamı dışındadır. `internal/file` hiçbir yetki denetimi yapmadan dosya baytlarını döndürür; mesh dışından erişilemez olmalıdır.

### GET `…/instances/{instance}/functions/file` <sup>New</sup> v0.0.100

`x-storage` alanındaki bir dosyanın baytlarını döner (`GET` / `HEAD`, `?file=<guid>`). Yalnızca bu instance'ın güncel verisindeki handle okunur. Diğer read fonksiyonlarının aksine `queryRoles` motorun içinde de denetlenir (`403`), ardından `x-roles` (gizli yol `404`).

**Responses:** `200` (baytlar), `206` / `416` (Range), `304` (`If-None-Match`), `400` (`Instance:100048`, eksik `file`), `403`, `404` (`Instance:100049`), `503` (`Instance:100047` / `Instance:100050`). Ayrıntı: [Built-in Functions → File Fonksiyonu](/docs/components/functions/built-in).

### POST `/api/v1/{domain}/workflows/{flow}/files`

<sup>New</sup> v0.0.102 **Streamed upload.** Master schema'da `x-storage.transport` değeri `"stream"` ya da `"any"` olan bir alanın baytlarını, JSON gövdesinde base64 yerine ayrı bir istekle yükler. Dosya base64 ile şişmez, JSON gövdesinde tutulmaz ve 10 MiB JSON gövde sınırı yerine `FileStorage:Upload:MaxBytes` (varsayılan 64 MiB) ile sınırlanır.

**Query parameters:**
- `path` — şemanın katladığı alan yolu: `passport`, `customer.tax`, `files[]`, `documents[].doc` (zorunlu)
- `name` — dosya adı (zorunlu)
- `version` — flow sürümü (opsiyonel)

**Request body:** ham baytlar (`Content-Type` dosyanın medya tipi; `Content-Length` zorunlu)

```http
POST /api/v1/{domain}/workflows/{flow}/files?path=files[]&name=scan.tiff
Content-Type: image/tiff
Content-Length: 31457280

<raw bytes>
```

**Responses:**
- `201 Created` → upload bileti:

```json
{ "file": "6f1c…", "component": "vnext-blob-s3", "path": "files[]", "name": "scan.tiff", "mimeType": "image/tiff",
  "size": 31457280, "eTag": "<alınan baytların sha256'sı>", "expiresAt": "2026-10-31T13:00:00+00:00" }
```

- `400 Bad Request` (`Instance:100048`) → bilinmeyen `path`, `transport`'u `inline` olan bir alan ya da eksik `Content-Length`
- `413 Payload Too Large` → gövde `FileStorage:Upload:MaxBytes`'ı aşıyor; hiçbir bayt saklanmaz
- `503 Service Unavailable` (`Instance:100047`) → depo hatası

Ardından yüklemeyi, alanın bulunduğu yerde bir start ya da transition gövdesinde `expiresAt`'tan önce referans verin:

```json
{ "attributes": { "files": [ { "file": "6f1c…", "documentType": "invoice" } ] } }
```

- `size` ve `eTag` alınan baytlardan hesaplanır, client'tan alınmaz; `Content-Length`'ten kısa ya da uzun bir gövde saklanmaz.
- Yükleme dağıtık önbellekte `FileStorage:Upload:TicketTtlMinutes` (varsayılan 60) boyunca bekletilir. Bilet **tek kullanımlıktır** ve yalnızca yüklendiği **aynı flow, path ve component** için kabul edilir; süresi dolmuş ya da bilinmeyen bir id, başka bir path için yapılmış yükleme ya da aynı yüklemenin bir gövdede iki kez kullanılması `400` `Instance:100048`'dir. Düğümün diğer üyeleri (`documentType`) korunur.
- Rotada runtime yetkilendirmesi yoktur (start gibi); gateway'de aynı şekilde koruyun. Ayrıntı: [Dosya Alanları (x-storage)](/docs/how-to/file-fields).

### Internal endpoint'ler: instance veri geçmişi <sup>New</sup> v0.0.100

```http
GET /api/v1/{domain}/workflows/{workflow}/instances/{instance}/data/history?page=1&pageSize=20&includeData=true
GET /api/v1/{domain}/workflows/{workflow}/instances/{instance}/data/history/{rowId}
```

Instance verisinin her yazımı için bir satır döner, **en yeniden eskiye**. Tüketicisi geliştirme araçlarıdır (Forge Instance Monitor); **public API değildir**.

- `pageSize` 1–100 arasına sıkıştırılır; toplam sayı (`COUNT`) hesaplanmaz. Yanıt: `{ items, page, pageSize, hasNext }`. Her öğe: `id`, `version`, `versionNo`, `enteredAt`, `eTag`, `isLatest`, `data`. `includeData=false` yalnızca metadata döner.
- `…/data/history/{rowId}`: tek satır; satır bilinmiyorsa veya başka bir instance'a aitse `404` (`Instance:100013`).
- Her satır, Data fonksiyonu ile **aynı exposure pass**'ten geçer (`x-roles`, `x-masking`, `x-encryption`, `x-computed`).
- Runtime içinde `queryRoles` denetimi yoktur; karar gateway'in `authorize?queryRoles=true` çağrısındadır.
- **Swagger'da gizlidir ama engellenmez.** Rotayı public edge'de açmayın: gateway / ingress katmanında kapatın.

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
  modifiedAt?: string;       // v0.0.104 — instance'ın son değiştiği an (aşağıdaki nota bakın)
  createdBy?: string;
  createdByBehalfOf?: string;
  modifiedBy?: string;
  modifiedByBehalfOf?: string;
  stage?: string;              // max 120 chars, kullanıcı tanımlı durum bilgisi
  incident?: IncidentHref;     // hasActiveIncident + active/history link'leri — bkz. Instance Incidents
}
```

<sup>New</sup> v0.0.104 **`modifiedAt` instance'ın son değiştiği andır.** Artık her transition'da hareket eder — aynı state'te kalan transition, tamamlanma, `cancel` ve fault dahil — ve `updateData`'nın yazdığı her data satırında (istek gövdesi veya task output'u; son satır kazanır) ve stage / tags / key değiştiğinde güncellenir. Hiçbir şeyi (data, stage, tags, key) değiştirmeyen bir `updateData` onu hareket ettirmez. Önceki runtime'lar `modifiedAt`'i yalnızca set-based status yazımlarında güncelliyordu; bu yüzden tamamlanmış bir instance, son transition'ı başlamadan önceki bir zamanı gösterebiliyordu. Yükseltme öncesi yazılmış satırlar eski değerlerini korur (backfill yok). `modifiedAt`'i "son status değişikliği" olarak okuyan tüketiciler (sıralama, `modifiedAt` filtreleri, raporlar) bu anlam değişikliğine göre tekrar kontrol edilmelidir. Ayrıntı: [Instance Filtering](/docs/how-to/instance-filtering).

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
  effectiveStatus?: InstanceStatus; // yalnız senkron yanıtta; instance GET'teki metadata.effectiveStatus ile aynı
  currentState?: string;    // v0.0.104 — yalnız senkron yanıtta; instance GET'teki metadata.currentState ile aynı
  effectiveState?: string;  // v0.0.104 — yalnız senkron yanıtta; instance GET'teki metadata.effectiveState ile aynı
  attributes?: any;
  eTag?: string;
  entityEtag?: string;
  extensions?: { [key: string]: any };
  flowVersion?: string; // v0.0.102: start yanıtında instance'ın çözülmüş sürümü
}
```

<sup>New</sup> v0.0.104 Senkron start / transition yanıtı `currentState` ve `effectiveState` taşır: instance GET'in `metadata.currentState` / `metadata.effectiveState` alanlarıyla **aynı ad ve değer** (persist edilmiş kolonlar). SubFlow'a inilmez; bu değerler state function'ın `state` alanı (en derin aktif leaf'in state'i) **değildir**. Ek DB okuması eklenmedi — değerler pipeline'ın elindeki instance'tan gelir; `ClientResponse` ile cevap veren bir pipeline'da `null` kalır. Asenkron `202` yanıtında iki alan da **yoktur**. Runtime-internal kimlik-only yanıt (cross-domain `sub/instances/start`, subflow forward) da iki alanı taşır; böylece senkron bir SubProcess task output'u child'ın state'ini içerir. Örnek ve mapping yolu: [Async / Sync](/docs/how-to/async-sync).

```json
// PATCH …/instances/{id}/transitions/submit?sync=true — 200
{ "id": "8d83c1f2-…", "status": "A", "effectiveStatus": "A",
  "currentState": "otp-waiting", "effectiveState": "otp-waiting",
  "attributes": { "…": "…" }, "eTag": "\"…\"", "extensions": {} }
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

### Instance hata kodları (v0.0.100)

<sup>New</sup> v0.0.100 ile eklenen `Instance` hata kodları (`ProblemDetails` içinde döner):

| Kod | Ad | HTTP | Anlamı |
|---|---|---|---|
| `Instance:100044` | `HistoryNoneSubFlowChildNotEligible` | 400 | `history: "none"` bir parent'ın SubFlow child'ı `none` değil; child hiçbir şey yazmadan reddeder, parent incident ile fault olur |
| `Instance:100045` | `HistoryNoneRetryNotSupported` | 409 | `history: "none"` instance'ta `POST …/retry` |
| `Instance:100046` | `HistoryNoneNotTerminal` | — (incident) | `history: "none"` bir aşama Finish olmayan bir state'te durdu; instance fault edilir |
| `Instance:100047` | `FileStoreUnavailable` | 503 | Blob deposu (binding) çağrısı başarısız; istek uygulanmadı, yeniden denenebilir. <sup>New</sup> v0.0.102 Okunan baytlar handle ile eşleşmediğinde de (`size` + sha256 `eTag` bütünlük uyumsuzluğu) döner |
| `Instance:100048` | `FileReferenceInvalid` | 400 | `content` ile `file` birlikte, geçersiz base64, bilinmeyen/yabancı referans, `functions/file`'da eksik `file` |
| `Instance:100049` | `FileNotFound` | 404 | `functions/file`: dosya bu instance'ın güncel verisinde yok ya da yolu `x-roles` ile gizli |
| `Instance:100050` | `FileSchemaUnavailable` | 503 | Master schema yüklenemedi ve gövde `content`/`file` üyesi taşıyor (ya da dosya okunuyor); yeniden deneyin |
| `Instance:100051` | `FlowVersionNotActivated` | 404 | <sup>New</sup> v0.0.102 İstenen sürüm(ler) var ama flow'un varsayılan sürümünün üstünde (bekliyor); açık sürüm isteyin ya da pointer'ı taşıyın |
| `Instance:100052` | `FlowDefaultVersionInvalid` | 409 | <sup>New</sup> v0.0.102 `sys-version-registry` pointer'ı hatalı ya da yayınlanmış hiçbir sürümle eşleşmiyor (yalnızca `latest` / kısmi istekler); pointer yazımında da reddedilir |
| `Instance:100053` | `VersionRegistryUnavailable` | 503 | <sup>New</sup> v0.0.102 Sürüm registry'si okunamadı; geçicidir, yeniden deneyin |

Ayrıntı: [Dosya Alanları](/docs/how-to/file-fields), [Workflow → History Modu](/docs/components/workflow), [Flow Varsayılan Sürümü](/docs/concepts/flow-default-version). `Instance:100051` … `100053` v0.0.102 ile instance listesi, tekil GET ve `GetInstances` / `GetInstance` task'lerinde de döner — bkz. [Satır Güvenliği](/docs/concepts/row-security).

### Hata kodları (v0.0.105)

<sup>New</sup> v0.0.105 ile eklenen hata kodları (`ProblemDetails` içinde döner):

| Kod | Ad | HTTP | Anlamı |
|---|---|---|---|
| `Transition:100025` | `TransitionSchemaNotMatched` | 400 | Transition (state, shared, start, `cancel`, `updateData`, `exit`) kural tabanlı `schemas` bildiriyor ve hiçbir entry eşleşmedi. Instance state'ini korur, fault edilmez. Şema bildirmeyen transition kabul edilir |
| `Function:800006` | `FunctionInputSchemaNotMatched` | 400 | Function'ın kural tabanlı `inputSchema` listesinde gövdeli istek için eşleşen entry yok (**breaking** — önceden doğrulama atlanıyordu). Gövdesiz istek kabul edilir |
| `Authorization:110005` | `AuthorizeUnsupportedType` | 400 | Workflow kapsamlı `GET …/workflows/{workflow}/functions/authorize` çağrısında `type` eksik veya desteklenmiyor (desteklenen: `instance`) |
| `Authorization:110006` | `CallerRolesUnavailable` | 503 | Kural tabanlı bir seçim (şema veya view) `context.Caller` ile çağıran rollerini okudu ve rol sağlayıcı cevap veremedi; fallback sunulmaz. Geçicidir, **yeniden denenebilir** |

Ayrıntı: [Breaking Changes v0.0.105](/blog/breaking-changes/breaking-changes-v0-0-105), [Release v0.0.105](/blog/release-v0-0-105).

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
