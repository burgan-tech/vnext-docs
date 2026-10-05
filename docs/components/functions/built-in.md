---
sidebar_position: 1
title: Built-in Functions
description: Sistem API'si — State, Data, View, Schema functions; long-polling, ETag
---

# Function API'leri

Function API'leri, workflow instance'ları için sistem seviyesi operasyonlar sağlar. Bu yerleşik fonksiyonlar, client'ların workflow engine dahili yapılarına doğrudan erişmeden instance durumunu sorgulamasına, veri almasına, view bilgisi elde etmesine ve transition şemalarına erişmesine olanak tanır.

## İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [State Fonksiyonu](#state-fonksiyonu)
3. [Data Fonksiyonu](#data-fonksiyonu)
4. [View Fonksiyonu](#view-fonksiyonu)
5. [Schema Fonksiyonu](#schema-fonksiyonu)
6. [Master Fonksiyonu](#master-fonksiyonu)
7. [Catalog Fonksiyonu](#catalog-fonksiyonu)
8. [Tasks Fonksiyonu](#tasks-fonksiyonu)
9. [Actions Fonksiyonu](#actions-fonksiyonu)
10. [Human Task Fonksiyonu](#human-task-fonksiyonu)
11. [Instance Correlation Fonksiyonu](#instance-correlation-fonksiyonu)
12. [Yetkilendirme (Authorization)](#yetkilendirme-authorization)
13. [Fonksiyon Metrikleri](#fonksiyon-metrikleri)
14. [En iyi Uygulamalar](#en-iyi-uygulamalar)
15. [Ilgili Dökümanlar](#ilgili-dökümanlar)

## Genel Bakış

vNext Runtime platformu, her workflow instance'ı için otomatik olarak kullanılabilir olan yerleşik function API'leri sağlar:

| Fonksiyon | Amaç | Endpoint Deseni |
|-----------|------|-----------------|
| **State** | Instance durumu için long-polling | `GET /{domain}/workflows/{workflow}/instances/{instance}/functions/state` |
| **Data** | Instance verisini alma | `GET /{domain}/workflows/{workflow}/instances/{instance}/functions/data` |
| **View** | View içeriğini alma | `GET /{domain}/workflows/{workflow}/instances/{instance}/functions/view` |
| **Schema** | Transition schema içeriğini alma | `GET /{domain}/workflows/{workflow}/instances/{instance}/functions/schema` |
| **Master** <sup>New</sup> | Instance'ın bağlı olduğu master şemayı alma | `GET /{domain}/workflows/{workflow}/instances/{instance}/functions/master` |
| **Catalog** <sup>New</sup> | Workflow'un fonksiyon listesini keşfetme | `GET /{domain}/workflows/{workflow}/instances/{instance}/functions/catalog` |
| **Tasks** <sup>New</sup> v0.0.93 | Instance'ın task geçmişi (task journal, metadata) | `GET /{domain}/workflows/{workflow}/instances/{instance}/functions/tasks` |
| **Actions** <sup>New</sup> v0.0.93 | Bir task kaydının yürütme alt adımları | `GET /{domain}/workflows/{workflow}/instances/{instance}/functions/actions?taskId=` |
| **Human Task** | Çağıranın sorumlu olduğu human task listesi (domain seviyesi) | `GET /{domain}/functions/human-task` |
| **Instance Correlation** <sup>New</sup> v0.0.99 | Instance'ın başlattığı subflow/subprocess ağacı (aşağı yönlü, recursive) | `GET /{domain}/workflows/{workflow}/instances/{instance}/functions/instance-correlation` |

:::warning `hierarchy` fonksiyonu kaldırıldı (v0.0.99)
Eski `…/functions/hierarchy` rotası v0.0.99 ile **kaldırıldı** ve yerini [`instance-correlation`](#instance-correlation-fonksiyonu) aldı. **Alias yoktur**: eski yol custom function çözümlemesine düşer ve `404` döner. Client'ları ve kayıtlı dashboard sorgularını (`Instance.Read/hierarchy` span'i → `Instance.Read/instanceCorrelation`) güncelleyin.
:::

> **Not:** Kullanıcı tanımlı fonksiyonlar için bkz. [Custom Functions](/docs/components/functions/custom). Sistem fonksiyon key'leri (`state`, `data`, `tasks`, `actions`, …) aynı adlı bir custom function'ı **gölgeler**.

:::caution[QueryRoles yetkilendirmesi — karar noktası gateway'dedir]
Read fonksiyonlarının tamamı (**state**, **data**, **view**, **schema**, **master**, **tasks**, **actions**, **instance-correlation**, incident rotaları) tek bir `queryRoles` cevabını paylaşır: `state`'i okuyamayan çağıran `data`'yı da okuyamaz. <sup>New</sup> v0.0.95 itibarıyla bu karar fonksiyonların **içinde** verilmez; Internal Gateway isteği iletmeden önce [`authorize?queryRoles=true`](#instance-authorize) fonksiyonunu çağırır ve `403`'ü gateway üretir. Ayrıntı için bkz. [Read fonksiyonlarında queryRoles authorize](#read-fonksiyonlarında-queryroles-authorize).
:::

Bu fonksiyonlar şunları sağlar:
- Gerçek zamanlı durum izleme (long-polling)
- ETag desteği ile verimli veri alma
- Platforma özel içerik ile dinamik view render etme
- Transition şemalarına erişim ile dinamik form üretimi

## State Fonksiyonu

State fonksiyonu, bir workflow instance'ı hakkında gerçek zamanlı durum bilgisi sağlar. Client'ların instance durum değişikliklerini izlemesi gereken long-polling senaryoları için tasarlanmıştır.

### Endpoint

```http
GET /{domain}/workflows/{workflow}/instances/{instance}/functions/state
```

### Parametreler

| Parametre | Konum | Tip | Gerekli | Açıklama |
|-----------|-------|-----|---------|----------|
| `domain` | Path | string | Evet | Domain adı |
| `workflow` | Path | string | Evet | Workflow key |
| `instance` | Path | string | Evet | Instance ID or Key |

### Response

```json
{
  "data": {
    "href": "/core/workflows/oauth-flow/instances/f410f37d-dc4b-4442-af84-e3a4707bd949/functions/data"
  },
  "view": {
    "hasView": true,
    "loadData": true,
    "href": "/core/workflows/oauth-flow/instances/f410f37d-dc4b-4442-af84-e3a4707bd949/functions/view"
  },
  "master": {
    "href": "/core/workflows/oauth-flow/instances/f410f37d-dc4b-4442-af84-e3a4707bd949/functions/master"
  },
  "interaction": {
    "terminateLongPoll": false,
    "fallbackTimeoutSeconds": 120
  },
  "functions": {
    "hasFunctions": true,
    "href": "/core/workflows/oauth-flow/instances/f410f37d-dc4b-4442-af84-e3a4707bd949/functions/catalog"
  },
  "state": "review",
  "stateType": "intermediate",
  "stateSubType": "human",
  "stateLabels": [
    { "label": "İnceleme", "language": "tr-TR" },
    { "label": "Review", "language": "en-US" }
  ],
  "status": "A",
  "activeCorrelations": [
    {
      "href": "/core/workflows/oauth-flow/instances/f410f37d-dc4b-4442-af84-e3a4707bd949/functions/data",
      "correlationId": "corr-123",
      "parentState": "parent-state",
      "subFlowInstanceId": "sub-instance-456",
      "subFlowType": "SubFlow",
      "subFlowDomain": "core",
      "subFlowName": "approval-subflow",
      "subFlowVersion": "1.0.0",
      "isCompleted": false,
      "status": "Running",
      "currentState": "pending-approval"
    }
  ],
  "correlations": [
    {
      "correlationId": "corr-122",
      "subFlowName": "kyc-subflow",
      "subFlowType": "SubFlow",
      "isCompleted": true,
      "completedAt": "2026-08-01T09:14:22Z",
      "terminalOutcome": "completed",
      "currentState": "kyc-approved",
      "stateChangedAt": "2026-08-01T09:14:20Z",
      "createdAt": "2026-08-01T09:02:41Z"
    },
    {
      "correlationId": "corr-123",
      "subFlowName": "approval-subflow",
      "subFlowType": "SubFlow",
      "isCompleted": false,
      "currentState": "pending-approval",
      "createdAt": "2026-08-01T09:15:03Z"
    }
  ],
  "transitions": [
    {
      "href": "/core/workflows/oauth-flow/instances/f410f37d-dc4b-4442-af84-e3a4707bd949/transitions/approve",
      "name": "approve",
      "labels": [
        { "label": "Onayla", "language": "tr-TR" },
        { "label": "Approve", "language": "en-US" }
      ],
      "target": {
        "key": "approved",
        "stateType": "finish",
        "stateSubType": "success",
        "labels": [{ "label": "Onaylandı", "language": "tr-TR" }]
      },
      "view": {
        "hasView": false,
        "loadData": true,
        "href": "/core/workflows/oauth-flow/instances/f410f37d-dc4b-4442-af84-e3a4707bd949/functions/view?transitionKey=approve"
      },
      "schema": {
        "hasSchema": true,
        "href": "/core/workflows/oauth-flow/instances/f410f37d-dc4b-4442-af84-e3a4707bd949/functions/schema?transitionKey=approve"
      }
    },
    {
      "href": "/core/workflows/oauth-flow/instances/f410f37d-dc4b-4442-af84-e3a4707bd949/transitions/ask-ai",
      "name": "ask-ai",
      "target": {
        "key": "ai-review",
        "stateType": "subFlow",
        "stateSubType": "none",
        "labels": [{ "label": "AI İncelemesi", "language": "tr-TR" }],
        "subFlow": "ai-assist"
      },
      "view": {
        "hasView": false,
        "loadData": true,
        "href": "/core/workflows/oauth-flow/instances/f410f37d-dc4b-4442-af84-e3a4707bd949/functions/view?transitionKey=ask-ai"
      },
      "schema": {
        "hasSchema": true,
        "href": "/core/workflows/oauth-flow/instances/f410f37d-dc4b-4442-af84-e3a4707bd949/functions/schema?transitionKey=ask-ai"
      }
    },
    {
      "name": "auto-timeout",
      "kind": "scheduled",
      "executeAtUtc": "2026-08-01T09:30:00Z",
      "annotations": { "ui/intent": "close" },
      "target": { "key": "cancelled", "stateType": "finish", "stateSubType": "cancelled" },
      "href": "/core/workflows/oauth-flow/instances/f410f37d-dc4b-4442-af84-e3a4707bd949/transitions/auto-timeout",
      "view": {
        "hasView": false,
        "loadData": false,
        "href": "/core/workflows/oauth-flow/instances/f410f37d-dc4b-4442-af84-e3a4707bd949/functions/view?transitionKey=auto-timeout"
      },
      "schema": {
        "hasSchema": false,
        "href": "/core/workflows/oauth-flow/instances/f410f37d-dc4b-4442-af84-e3a4707bd949/functions/schema?transitionKey=auto-timeout"
      }
    }
  ],
  "incident": {
    "hasActiveIncident": false,
    "history": { "href": "/core/workflows/oauth-flow/instances/f410f37d-dc4b-4442-af84-e3a4707bd949/incidents" }
  },
  "timeout": {
    "key": "abandoned",
    "target": {
      "key": "cancelled",
      "stateType": "finish",
      "stateSubType": "cancelled",
      "labels": [{ "label": "İptal Edildi", "language": "tr-TR" }]
    },
    "executeAtUtc": "2026-08-01T10:00:00Z",
    "annotations": { "ui/countdown": "visible" }
  },
  "eTag": "W/\"abc123def456\""
}
```

:::note ResponseShapeVersion v14 <sup>New</sup> v0.0.99
State gövdesinin `ResponseShapeVersion` geçmişi: **v12** (v0.0.95 — `timeout` bloğu, scheduled girişlerde `annotations`, `interaction` yayın kuralı), **v13** (v0.0.98 — `terminate: false` etkileşim bloğunun yeniden yayınlanması), **v14** (v0.0.99 — `stateSubType`, `stateLabels`, `transitions[].labels`, `transitions[].target` ve nesneye dönüşen `timeout.target`). Her yükseltme mevcut tüm state ETag'lerini **bir kez** geçersiz kılar — 304 arkasında park etmiş client'lar bir sonraki poll'da 200 alır. Bu geçişlerde `StateFunctionCache`'i **kapatmayın**; versiyon değişimi cache tarafından yönetilir.
:::

:::warning `timeout.target` artık bir nesne (v0.0.99, breaking)
v0.0.99 öncesinde `timeout.target` düz bir **string** (hedef state key'i) idi; artık `transitions[].target` ile aynı şekilde bir **nesnedir** (`{ key, stateType, stateSubType, labels, subFlow }`). Değişiklik yerinde yapıldı, yeni bir alan eklenmedi — hedef key'i okuyan client'lar `timeout.target` yerine **`timeout.target.key`** okumalıdır.
:::

### Response Alanları

| Alan | Tip | Açıklama |
|------|-----|----------|
| `data` | `object` | Instance verisini almak için link |
| `data.href` | `string` | Data fonksiyon endpoint URL'i |
| `view` | `object` | Mevcut state için view bilgisi |
| `view.hasView` | `boolean` | Mevcut state için view olup olmadığı |
| `view.href` | `string` | View fonksiyon endpoint URL'i |
| `view.loadData` | `boolean` | View'ın instance data'ya ihtiyaç duyup duymadığı |
| `master` <sup>New</sup> | `object` | Instance'ın bağlı olduğu **master şemayı** almak için link — bkz. [Master Fonksiyonu](#master-fonksiyonu) |
| `master.href` | `string` | Master fonksiyon endpoint URL'i |
| `interaction` <sup>New</sup> | `object` | Long-poll etkileşim direktifi; çağıran etkileşimin gate'ini geçiyorsa (`rule`, yoksa `roles`, ikisi de yoksa izin) döner. Yayın kuralı `terminate` değerine göre değişir — bkz. [Interaction bloğunun yayın kuralı](#interaction-bloğunun-yayın-kuralı) ve [Workflow → State Interaction](/docs/components/workflow#state-interaction-long-poll) |
| `interaction.terminateLongPoll` | `boolean` | State'in `interaction.longPoll.terminate` değeri; her zaman bulunur. `true`: client long-poll'u sonlandırıp `ack` gönderir. `false`: client poll etmeye devam eder, yalnızca bekleme penceresini `fallbackTimeoutSeconds` ile değiştirir |
| `interaction.fallbackTimeoutSeconds` | `integer` | Etkin fallback penceresi; her zaman bulunur (state'in kendi değeri ya da parent subflow override'ı; varsayılan `60`) |
| `interaction.ack` | `object` | Acknowledge endpoint href'i (`{ "href": "…" }`). **Yalnızca `terminateLongPoll: true`** iken bulunur. Aktif subflow zincirinde child'ın bloğu yukarı taşınır ve href poll edilen (en üst) instance'ın endpoint'ine yeniden yazılır |
| `timeout` <sup>New</sup> v0.0.95 | `object` | Sorgulanan instance için **armlanmış workflow seviyesi timeout** (deadline). Yalnızca deadline gerçekten bekliyorken bulunur; instance terminal olduğunda veya timeout tanımı yoksa **hiç dönmez** — client alanın varlığına göre dallanır. Aktif subflow'dan merge edilmez (subflow'un kendi deadline'ı için onu sorgulayın). `transitions` içinde **değildir** (arkasında çağrılabilir bir transition yoktur, sanal `$timeout` ile kaydedilir) |
| `timeout.key` | `string` | Timeout tanımının `key`'i (ya da parent'ın `subFlow.overrides.timeout` key'i) |
| `timeout.target` | `object` | <sup>New</sup> v0.0.99 Deadline dolunca instance'ın çekileceği state — `transitions[].target` ile aynı şekil (`key`, `stateType`, `stateSubType`, `labels`, `subFlow`), instance'ın kendi tanımında çözülür; çözülemezse yalnızca `key`. **v0.0.99 öncesi string idi** — `target.key` okuyun |
| `timeout.executeAtUtc` | `string` | Zamanlayıcının kurulduğu anda persist edilmiş UTC tetiklenme anı (`Z` sonekli ISO 8601); yeniden hesaplanmaz. ETag'e girer (scheduled girişlerin aksine 304 arkasında bayatlamaz) |
| `timeout.annotations` | `object` | Timeout tanımının `annotations` değeri (passthrough, string değerler). Parent override'ı bloğu annotations dahil bütün olarak değiştirir. Tanımlı değilse alan yoktur |
| `functions` <sup>New</sup> | `object` | Workflow'un fonksiyon kataloğuna işaretçi — bkz. [Catalog Fonksiyonu](#catalog-fonksiyonu) |
| `functions.hasFunctions` | `boolean` | Workflow'un tanımlı fonksiyonu olup olmadığı |
| `functions.href` | `string` | Catalog fonksiyon endpoint URL'i |
| `state` | `string` | Instance'ın mevcut durumu |
| `stateType` | `string` | Gösterilen state'in tipi, camelCase: `initial`, `intermediate`, `finish`, `subFlow`, `wizard` |
| `stateSubType` <sup>New</sup> v0.0.99 | `string` | Gösterilen state'in alt tipi, camelCase: `none`, `success`, `error`, `terminated`, `suspended`, `busy`, `human`, `cancelled`, `timeout`. `stateType` ile aynı state'i anlatır: aktif bir subflow çalışırken subflow'un state'i, aksi halde instance'ın kendi state'i |
| `stateLabels` <sup>New</sup> v0.0.99 | `array` | Gösterilen state'in `labels` listesi (`[{ label, language }]`) — **tüm diller**, çağırana göre çözülmüş tek bir etiket değil; seçimi client yapar. Tanımlı değilse alan yoktur |
| `status` | `string` | Client'ın gözlemlediği durum kodu (A=Active, C=Completed, vb.). <sup>New</sup> v0.0.93 aktif bir subflow varsa **zincirin** durumu yansıtılır (parent kendi başına `Busy` olsa da child human task bekliyorsa `A`); GetInstance yanıtındaki `metadata.effectiveStatus` ile aynı değerdir — bkz. [Instance zarfı ve metadata](#instance-zarfı-ve-metadata) |
| `activeCorrelations` | `array` | Aktif sub-flow'lar ve correlation'lar (yalnızca açık olanlar — değişmedi) |
| `correlations` <sup>New</sup> | `array` | Tüm child correlation'lar — aktif **ve** tamamlanmış, `createdAt` artan sırada — bkz. [Correlation Geçmişi](#correlation-geçmişi-correlations) |
| `transitions` | `array` | Mevcut durumdan kullanılabilir transition'lar (+ role grant'a göre filtrelenir). `cancel`, `updateData` ve `exit` de tanımlıysa listelenir <sup>New</sup>; ayrıca çalışması zamanlanmış transition'lar `kind: "scheduled"` girişleri olarak eklenir <sup>New</sup> v0.0.80 / v0.0.84 — bkz. [Zamanlanmış transition'lar](#zamanlanmış-transitionlar-kind-scheduled) |
| `transitions[].kind` | `string` | Girişin türü: çağıranın tetikleyebileceği transition'larda `state`/`cancel`/`updateData`/`exit`; runtime'ın otomatik ateşlemek üzere kurduğu girişte **`scheduled`** |
| `transitions[].executeAtUtc` | `string` | **Yalnızca `kind: "scheduled"`** girişlerde bulunur — ISO 8601 UTC (`Z` sonekli) tetiklenme anı |
| `transitions[].labels` <sup>New</sup> v0.0.99 | `array` | Transition tanımının `labels` listesi (tüm diller; tanımlı değilse yok). Scheduled girişlerde de bulunur |
| `transitions[].target` <sup>New</sup> v0.0.99 | `object` | Transition'ın hedef state'i: `key`, `stateType`, `stateSubType`, `labels`, `subFlow`. `$self`, transition'ın listelendiği state'e çözülür (scheduled girişte job'ın kaynak state'i). `subFlow` yalnızca hedef bir `subFlow` state'iyse bulunur (başlattığı process'in key'i). Hedef state çözülemezse yalnızca `{ key }`; transition'ın kendisi çözülemezse `target` ve `labels` yoktur |
| `transitions[].annotations` | `object` | Transition tanımının `annotations` değeri (passthrough). <sup>New</sup> v0.0.95 `kind: "scheduled"` girişlerde de bulunur — job'ın kaynak state'indeki transition tanımından çözülür |
| `transitions[].view` | `object` | Transition için view bilgisi |
| `transitions[].view.hasView` | `boolean` | Bu transition için view olup olmadığı |
| `transitions[].schema` | `object` | Transition için şema linki (tanımlıysa) |
| `transitions[].schema.hasSchema` | `boolean` | Bu transition için şema olup olmadığı |
| `transitions[].schema.href` | `string` | transitionKey ile Schema fonksiyon endpoint URL'i |
| `incident` <sup>New</sup> | `object` | Instance'ın hata/incident durumunu anlatan link bloğu — bkz. [Incident bloğu](#incident-bloğu) v0.0.92 |
| `eTag` | `string` | Cache doğrulama için ETag |

### Interaction bloğunun yayın kuralı

`interaction` bloğu, state'in `interaction.longPoll.terminate` değerine göre iki farklı kuralla yayınlanır. Her iki durumda da çağıranın etkileşim gate'ini geçmesi gerekir (`rule` tanımlıysa o, yoksa `roles`, ikisi de yoksa izin):

| `terminate` | Blok ne zaman döner? | `ack` | Client davranışı |
|---|---|---|---|
| `true` | **Yalnızca ack beklerken** — pipeline bu state'te duraklamışken (v0.0.95'ten beri değişmedi) | Var | Long-poll'u sonlandırır, kullanıcı etkileşimini tamamlayıp `POST …/longpoll/ack` gönderir |
| `false` | <sup>New</sup> v0.0.98 Instance bu state'te **olduğu sürece her zaman** | **Yok** — sunucu tarafında hiçbir şey armlanmaz | Poll etmeye devam eder; `fallbackTimeoutSeconds` client'ın varsayılan long-poll penceresinin **yerine geçer** (varsayılan 60 sn; state `120` bildiriyorsa 120 sn bekler) |

```json
"interaction": { "terminateLongPoll": false, "fallbackTimeoutSeconds": 120 }
```

```json
"interaction": {
  "terminateLongPoll": true,
  "fallbackTimeoutSeconds": 60,
  "ack": { "href": "/api/v1/core/workflows/account-opening/instances/{id}/longpoll/ack" }
}
```

:::info v0.0.98 düzeltmesi
v0.0.95–v0.0.97 arasında `terminate: false` bir state için blok **hiç yayınlanmıyordu** (regresyon); client'lar bildirilen pencereyi öğrenemiyordu. v0.0.98 ile blok yeniden yayınlanır ve `ResponseShapeVersion` v13'e yükseldi. Aktif subflow zincirinde child'ın bloğu yukarı taşınır; `ack.href` poll edilen (en üst) instance'a yeniden yazılır.
:::

### Transition'ların role grant'a göre filtrelenmesi

State fonksiyonunun döndürdüğü `transitions` dizisi **transition role grant**'larına göre filtrelenir. Yalnızca çağıranın izinli rolü olduğu transition'lar dahil edilir. Roller statik (örn. kimlik sağlayıcınızdan) veya ön tanımlı sistem rolleri **$InstanceStarter** (instance'ı başlatan actor) ve **$PreviousUser** (bir önceki transition'ı tetikleyen actor) olabilir. Gereksiz view veya schema istekleri ve 404'leri önlemek için `view.hasView` ve `schema.hasSchema` kullanın.

### Well-known transition'lar listede

<sup>New</sup> Workflow seviyesinde tanımlı **`cancel`**, **`updateData`** ve **`exit`** transition'ları da — trigger tipine ve `availableIn` kapsamına göre — `transitions` dizisinde listelenir ve aynı rol filtresinden geçer:

- Listelenen anahtar, workflow tanımındaki **configured key**'dir; well-known alias'lar (`update-parent-data`, `exit`) istek tarafında kabul edilmeye devam eder.
- Her girişin `kind` alanı transition türünü söyler: `cancel` / `updateData` / `exit` (state ve shared transition'larda ilgili tür).
- Aktif bir subflow'un listesi, parent'ın `updateData` ve `exit` transition'larını da merge eder — client tek döngüyle hepsini sürebilir.
- `roles` bu üç transition için de artık **etkindir**: rol eşleşmeyen çağırana listelenmez. Roller execution'da enforce edilmez (tasarım gereği — `roles` client'a *ne sunulacağını* belirler); execution yalnızca state-machine ve `availableIn` doğrulaması yapar.

### Zamanlanmış transition'lar (`kind: "scheduled"`)

<sup>New</sup> v0.0.80 ile `transitions` dizisi, runtime'ın otomatik ateşlemek üzere kurduğu (armed) transition'ları da — çağıranın tetikleyebileceği girişlerden **sonra**, `executeAtUtc`'ye göre artan sırada — `kind: "scheduled"` girişleri olarak taşır. v0.0.84 ile bu girişler diğerleriyle aynı `href`/`view`/`schema` link şeklini kazandı (`hasView`/`loadData`/`hasSchema` her zaman `false`).

- `executeAtUtc`, zamanlayıcının kurulduğu anda **persist edilmiş** UTC zaman damgasıdır (`Z` sonekli ISO 8601) — timer script'inin yeniden değerlendirilmesi değil.
- Scheduled girişler **role göre filtrelenmez**: diğer `transitions[]` öğelerinin aksine, bir zamanlanmış transition çağırandan bağımsız olarak ateşlenir; bu yüzden giriş çağıran kapasitesi değil, instance'a dair bir gerçektir.
- Yalnızca **sorgulanan instance'ın kendi** zamanlayıcılarını gösterir; aktif bir subflow varsa onun zamanlayıcıları **birleştirilmez** (subflow instance'ını ayrıca sorgulayın).
- `href` bir çağrı daveti **değildir** — scheduled transition'lar yürütme anında hâlâ System-actor'a kilitlidir; bir client bu href'e PATCH göndermeye çalışırsa, önceki davranışla aynı şekilde reddedilir.
- `hasView` / `loadData` / `hasSchema` her zaman `false` döner.
- <sup>New</sup> v0.0.95 Giriş, zamanlayıcıyı kuran transition'ın `annotations` değerini taşır (job'ın kaynak state'i üzerinden çözülür); tanımlı değilse alan yoktur.
- **Bilinen ve kabul edilmiş boşluk:** zamanlanan iş kümesindeki değişiklikler state fingerprint ETag'ine **girmez** (issue #864, kabul edilmiş takım kararı). Aynı state'e geri dönen bir re-arm (`updateData`/`$self`), tek işlemde A→B→A zinciri veya lock çakışmasıyla reddedilen bir job, state/status değişmediği için client'ı `304` arkasında bayat bir `executeAtUtc` ile bırakabilir. Taze zaman gerekiyorsa client ETag'siz yeniden fetch etmelidir. Bkz. [Caching yapılandırması](/docs/configuration/caching) — `StateFunctionCache` fingerprint materyali.

### Aktif Correlation'lar

Bir workflow aktif sub-flow'lara veya correlation'lara sahip olduğunda, bunlar response'a dahil edilir:

| Alan | Açıklama |
|------|----------|
| `correlationId` | Benzersiz correlation tanımlayıcısı |
| `parentState` | Parent workflow durumu |
| `subFlowInstanceId` | Sub-flow instance ID |
| `subFlowType` | Sub-flow tipi (SubFlow, SubProcess) |
| `subFlowDomain` | Sub-flow'un domain'i |
| `subFlowName` | Sub-flow workflow'un adı |
| `subFlowVersion` | Sub-flow'un versiyonu |
| `isCompleted` | Sub-flow'un tamamlanıp tamamlanmadığı |
| `status` | Sub-flow'un mevcut durumu |
| `currentState` | Sub-flow'un mevcut state'i |

### Correlation Geçmişi (correlations)

<sup>New</sup> `activeCorrelations` yalnızca **açık** correlation'ları taşır; hangi sub item'ların çalıştığı ve her birinin nasıl bittiği bu listeden görülemez. Yeni **`correlations`** dizisi tam kümeyi verir — aktif **ve** tamamlanmış — `createdAt` artan sırada. Her giriş `activeCorrelations` alanlarına ek olarak şunları taşır:

| Alan | Açıklama |
|------|----------|
| `isCompleted` | Correlation'ın kapanıp kapanmadığı |
| `completedAt` | Kapanma zamanı (tamamlanmışsa) |
| `terminalOutcome` | Sonuç: `completed` / `faulted` / `canceled` |
| `currentState` | Sub instance'ın bilinen son state'i |
| `stateChangedAt` | Son state değişim zamanı |
| `createdAt` | Correlation'ın oluşturulma zamanı |

- **`activeCorrelations` değişmedi** — mevcut client'lar etkilenmez. Yeni client'lar geçmişe ihtiyaç duyduğunda `correlations`'ı kullanmalıdır.
- ETag, her correlation mutasyonunda (sub item başlama, kapanma, revert, kendi state'inin ilerlemesi) hareket eder; long-poll eden client güncel listeyi görür.
- Eşzamanlı tamamlanma anında `correlations` içindeki aktif alt küme, `activeCorrelations`'tan **bir an daha taze** olabilir (bilinçli tasarım).

### Incident bloğu

<sup>New</sup> v0.0.92 ile response'a her zaman bir `incident` bloğu eklenir; bu blok bir Faulted veya bekleyen instance'ı açıklamak için **link taşır, içerik taşımaz**:

```jsonc
"incident": {
  "hasActiveIncident": true,
  "active":  { "href": "/core/workflows/oauth-flow/instances/{id}/incidents/active" },
  "history": { "href": "/core/workflows/oauth-flow/instances/{id}/incidents" }
}
```

- `hasActiveIncident` instance'ın denormalize edilmiş bayrağıdır. `active` **yalnızca** bu bayrak `true` iken bulunur; `history` her zaman bulunur.
- Aynı blok, byte-for-byte, `GET …/instances/{instance}` yanıtındaki `metadata.incident`'ta ve instance listesinin her öğesinde de yer alır.
- `hasActiveIncident` state fingerprint ETag'in bir üyesidir: bir incident'ın state/status değişmeden açılması veya kapanması bile parklanmış bir long-poll client'ın `304`'ünü kırar.
- Aktif bir subflow'a delege eden instance'larda `active.href` incident'ın **sahibi olan subflow'u**, `history.href` her zaman **sorgulanan instance'ı** gösterir.
- Hiçbir yüzeyde **stack trace** dönmez.

Ayrıntılı model, `GET …/incidents` / `GET …/incidents/active` endpoint referansı ve incident alan tablosu için bkz. [Instance Incidents](../../concepts/incidents).

### Kullanım Alanları

1. **Long-Polling**: Client'lar durum değişikliklerini tespit etmek için bu endpoint'i poll edebilir
2. **Durum İzleme**: Workflow ilerlemesini izleyen dashboard uygulamaları
3. **Transition Keşfi**: Kullanılabilir kullanıcı eylemlerini dinamik olarak keşfetme
4. **Sub-Flow Takibi**: Paralel sub-workflow'ların ilerlemesini izleme

### Subflow tamamlanma penceresi

**Subflow tamamlanması** üst instance'a henüz tam yansımamışken **State** yanıtı, üst instance **status** bilgisini doğru gösterir; böylece erken **Completed** gösterimi önlenir.

### Telemetry

Runtime genelinde yapılandırılmış loglar daha tutarlıdır; **TaskCoordinator** yürütmesi **span** ile izlenir ve **ParentInstanceId** ile birlikte gözlem arka ucunda ilişkilendirilebilir. Correlation carrier'ları, reserved header'lar, span ağacı ve script/fan-out metrikleri için bkz. [Gözlemlenebilirlik: Trace, Log ve Metrikler](../../how-to/observability).

### Trace ve logda ParentInstanceId

Trace ve loglarda **ParentInstanceId** alanı kullanılır; böylece parent instance ile başlatılan veya tetiklenen (subflow, cross-domain) child instance'ların log ve trace'leri parent instance id ile ilişkilendirilerek takip edilebilir.

### Örnek İstek

```http
GET /core/workflows/oauth-authentication-workflow/instances/f410f37d-dc4b-4442-af84-e3a4707bd949/functions/state HTTP/1.1
Host: api.example.com
Accept: application/json
```

## Data Fonksiyonu

Data fonksiyonu, bir workflow instance'ının mevcut verisini alır. Verimli veri senkronizasyonu için ETag tabanlı önbellekleme destekler.

> **Filtreleme:** GraphQL-stil sorgular, mantıksal operatörler ve aggregation'lar dahil gelişmiş filtreleme yetenekleri için bkz. [Instance Filtreleme Kılavuzu](/docs/how-to/instance-filtering).

### Endpoint

```http
GET /{domain}/workflows/{workflow}/instances/{instance}/functions/data
```

### Parametreler

| Parametre | Konum | Tip | Gerekli | Açıklama |
|-----------|-------|-----|---------|----------|
| `domain` | Path | string | Evet | Domain adı |
| `workflow` | Path | string | Evet | Workflow key |
| `instance` | Path | string | Evet | Instance ID |

### Header'lar

| Header | Tip | Gerekli | Açıklama |
|--------|-----|---------|----------|
| `If-None-Match` | string | Hayır | Koşullu istek için ETag değeri |

### Response (200 OK)

```json
{
  "data": {
    "userId": "user123",
    "amount": 1000,
    "currency": "TRY",
    "authentication": {
      "success": true,
      "method": "otp",
      "timestamp": "2025-11-11T10:30:00Z"
    },
    "approval": {
      "status": "pending",
      "requestedAt": "2025-11-11T10:35:00Z"
    }
  },
  "eTag": "W/\"xyz789abc123\"",
  "extensions": {
    "userProfile": {
      "name": "Ahmet Yılmaz",
      "email": "ahmet.yilmaz@example.com"
    },
    "accountLimits": {
      "dailyLimit": 5000,
      "remainingLimit": 4000
    }
  }
}
```

### Response (304 Not Modified)

Eğer `If-None-Match` header'ı mevcut ETag ile eşleşirse, sunucu şunu döndürür:

```http
HTTP/1.1 304 Not Modified
ETag: W/"xyz789abc123"
```

Body döndürülmez, bu da bant genişliği ve işlem süresinden tasarruf sağlar.

### Response Alanları

| Alan | Tip | Açıklama |
|------|-----|----------|
| `data` | `object` | Mevcut instance verisi (camelCase özellikler); Master şemada `x-roles` kullanıldığında alanlar role göre filtrelenir — bkz. [Alan bazlı görünürlük](/docs/concepts/authorization#master-şema-alan-bazlı-görünürlük) |
| `eTag` | `string` | Cache doğrulama için ETag |
| `extensions` | `object` | Kayıtlı extension'lardan ek veriler |

### Instance zarfı ve metadata

GetInstance ve GetInstances yanıtları, **instance zarfı** bilgisini içerebilir: `id`, `key`, `flow`, `domain`, `flowVersion`, `etag`, `tags`, **metadata** (örn. `currentState`, `effectiveState`, `status`, `effectiveStatus`, `type`, `createdAt`, `modifiedAt`, `createdBy`, `modifiedBy`, `createdByBehalfOf`, `modifiedByBehalfOf`), `attributes` ve `extensions`. Böylece veri yüküyle birlikte instance kimliği ve audit bilgisi sunulur.

| Metadata alanı | Açıklama |
|---|---|
| `effectiveStatus` <sup>New</sup> v0.0.94 | Client'ın gözlemlediği durum: aktif bir SubFlow çalışıyorsa **en derin aktif child'ın** durumu, yoksa instance'ın kendi `status`'u — `effectiveState`'in durum karşılığı ve State Function'ın `status` alanıyla aynı değer. Servis edilen değer: instance'ın kendi status'u ya da effectiveStatus terminal ise `status`, aksi halde `effectiveStatus`. GetInstance, liste sorguları, GetInstances task'ı ve sync start/transition yanıtlarında bulunur; liste sorgularında `effectiveStatus` ile **filtrelenebilir ve sıralanabilir** |
| `type` <sup>New</sup> v0.0.94 | Instance'ın **nasıl başlatıldığı** — `R` root, `S` SubFlow child, `P` SubProcess child. Oluşturulurken damgalanır ve **değişmez** (canlı ilişkiyi değil başlangıç kökenini söyler). Liste sorgularında `instanceType` adıyla filtrelenir/sıralanır |

:::info Sync start/transition yanıtlarında `extensions` <sup>New</sup> v0.0.93
`sync=true` start ve transition yanıtları artık Extensions **değerlendirmez** (performans); zarftaki `extensions` anahtarı korunur ve **her zaman `{}`** döner. Bu iki endpoint'te `?extensions=` query parametresi yok sayılır (reddedilmez). Read yüzeyleri (Data Function, GetInstance) değişmemiştir.
:::

### ETag Desteği

Data fonksiyonu, verimli önbellekleme için ETag pattern'i uygular:

**İlk İstek:**
```http
GET /core/workflows/payment-flow/instances/123/functions/data
```

**Response:**
```http
HTTP/1.1 200 OK
ETag: "W/\"v1\""
Content-Type: application/json

{
  "data": { ... },
  "eTag": "W/\"v1\""
}
```

**Sonraki İstek:**
```http
GET /core/workflows/payment-flow/instances/123/functions/data
If-None-Match: "W/\"v1\""
```

**Response (Veri Değişmedi):**
```http
HTTP/1.1 304 Not Modified
ETag: "W/\"v1\""
```

**Response (Veri Değişti):**
```http
HTTP/1.1 200 OK
ETag: "W/\"v2\""
Content-Type: application/json

{
  "data": { ...güncellenmiş veri... },
  "eTag": "W/\"v2\""
}
```

#### Authorization-aware ETag

Data endpoint'leri yetkilendirme kullandığında yanıt çağırana göre değişebilir.  itibarıyla ETag stratejisi şöyle ayrılır:

- **etag** — **Yanıt** (veya istek bağlamı, örn. yetkilendirme) değiştiğinde değişir. Genel yanıt önbelleği ve `If-None-Match` koşullu istekler için kullanın.
- **entityETag** — **Entity verisi** değiştiğinde değişir. Gerçek veri değişimini (örn. senkronizasyon veya invalidation) tespit etmek için kullanın.

Her iki değer hem response body'de hem header'larda yer alır:

| Body alanı     | Response header   | Anlamı                    |
|----------------|-------------------|---------------------------|
| `etag`         | `ETag`            | Yanıt/istek değişimi      |
| `entityEtag`   | `X-Entity-ETag`   | Entity veri değişimi      |

**Örnek response body:**
```json
{
  "etag": "\"Hko5JI4fDcAOOnf-KGFNA7Xo_MpuxcLl1_hg5j2Sua8\"",
  "entityEtag": "\"01KK8Q8N5T6H49T8AENYT6Z6ZQ\""
}
```

**Örnek response header'ları:**
```http
ETag: "Hko5JI4fDcAOOnf-KGFNA7Xo_MpuxcLl1_hg5j2Sua8"
X-Entity-ETag: "01KK8Q8N5T6H49T8AENYT6Z6ZQ"
```

### Extension'lar

Extension'lar, instance verisini zenginleştiren ek bağlam verisi sağlar:

- Extension'lar view referans konfigürasyonunda tanımlanır
- Her extension harici kaynaklardan veri alır
- Extension verisi `extensions` objesine merge edilir
- Extension'lar şunlar için kullanışlıdır:
  - Kullanıcı profil bilgisi
  - Referans veri lookup'ları
  - Gerçek zamanlı hesaplanan değerler
  - Harici sistem verileri

### Instance Verilerini Filtreleme

Data fonksiyonu, attribute'lara göre instance verilerini sorgulamak için güçlü filtreleme yetenekleri destekler. Bu, kriterlerinize uyan belirli instance'ları filtrelemenize ve almanıza olanak tanır.

#### Filtre Söz Dizimi

Filtreler şu formatı kullanır: `filter=attributes={alan}={operatör}:{değer}`

#### Kullanılabilir Operatörler

| Operatör | Açıklama | Örnek |
|----------|----------|-------|
| `eq` | Eşittir | `filter=attributes=clientId=eq:122` |
| `ne` | Eşit değildir | `filter=attributes=status=ne:inactive` |
| `gt` | Büyüktür | `filter=attributes=amount=gt:100` |
| `ge` | Büyük veya eşittir | `filter=attributes=score=ge:80` |
| `lt` | Küçüktür | `filter=attributes=count=lt:10` |
| `le` | Küçük veya eşittir | `filter=attributes=age=le:65` |
| `between` | İki değer arasında | `filter=attributes=amount=between:50,200` |
| `like` | Alt dize içerir (büyük/küçük harf duyarsız) | `filter=attributes=name=like:john` |
| `startswith` | İle başlar | `filter=attributes=email=startswith:test` |
| `endswith` | İle biter | `filter=attributes=email=endswith:.com` |
| `in` | Liste içinde değer | `filter=attributes=status=in:active,pending` |
| `nin` | Liste dışında değer | `filter=attributes=type=nin:test,debug` |
| `isnull` | Null veya null değil | `filter=attributes=resolvedAt=isnull:true` |

:::info Fail-closed doğrulama
v0.0.84'ten itibaren geçersiz bir operatör veya filtrelenemez bir alan kullanıldığında istek artık sessizce yok sayılmaz — **`400 Bad Request`** (`SchemaFilterValidationException`) döner. Filtrelenebilirlik alanın şemasındaki `x-filterOperators` listesine bağlıdır. Tam operatör listesi ve şema tabanlı filtreleme kuralları için bkz. [Instance Filtreleme Kılavuzu](/docs/how-to/instance-filtering).
:::

#### Filtre Örnekleri

**Tek Filtre:**
```http
GET /core/workflows/payment-flow/instances/abc-123/functions/data?filter=attributes=amount=gt:1000 HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Çoklu Filtre (VE mantığı):**
```http
GET /core/workflows/order-processing/instances/123/functions/data?filter=attributes=status=eq:active&filter=attributes=priority=eq:high HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Aralık Filtresi:**
```http
GET /core/workflows/payment-flow/instances/abc-123/functions/data?filter=attributes=amount=between:100,500 HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Dize İşlemleri:**
```http
GET /core/workflows/customer/instances/123/functions/data?filter=attributes=email=endswith:@company.com HTTP/1.1
Host: api.example.com
Accept: application/json
```

> **Not:** Filtreleme, instance attribute'ları üzerinde çalışır ve büyük veri kümeleri için pagination ile birleştirildiğinde özellikle kullanışlıdır. Instance filtreleme hakkında daha fazla bilgi için [Instance Filtreleme](https://github.com/burgan-tech/vnext-runtime/blob/main/README.md#instance-filtering) bölümüne bakın.

### Kullanım Alanları

1. **Veri Senkronizasyonu**: Client-side veriyi sunucu ile senkronize tutma
2. **Verimli Polling**: Gereksiz veri transferlerinden kaçınmak için ETag kullanma
3. **View Veri Binding**: View'ları mevcut instance verisi ile doldurma
4. **Audit ve Loglama**: Audit için tam instance durumunu alma
5. **Filtrelenmiş Veri Alma**: Attribute değerlerine göre belirli instance'ları sorgulama

### Örnek İstek

```http
GET /core/workflows/payment-flow/instances/abc-123/functions/data HTTP/1.1
Host: api.example.com
Accept: application/json
If-None-Match: "W/\"previous-etag\""
```

## View Fonksiyonu

View fonksiyonu, mevcut workflow durumu için uygun view tanımını alır. Platforma özel içerik, transition'a özel view'lar ve **uzak (cross-domain) view'lar** desteklenir: başka bir domain'de host edilen view'lar referans verilerek kullanılabilir; böylece ortak view'ların yeniden kullanımı, versiyonlama ve dağıtımı tek merkezden yönetilebilir.

### Endpoint

```http
GET /{domain}/workflows/{workflow}/instances/{instance}/functions/view
```

### Parametreler

| Parametre | Konum | Tip | Gerekli | Açıklama |
|-----------|-------|-----|---------|----------|
| `domain` | Path | string | Evet | Domain adı |
| `workflow` | Path | string | Evet | Workflow key |
| `instance` | Path | string | Evet | Instance ID |
| `transitionKey` | Query | string | Hayır | View alınacak belirli transition |
| `platform` | Query | string | Hayır | Hedef platform (mobile, web, tablet, vb.) |

### Response

**İçerik tipi:** `content`, view `type`'ına göre tiplenir: `type` **Json** ise `content` bir object veya array; `type` **Html** (ve benzeri) ise `content` bir string'dir.

**Json view örneği:**
```json
{
  "key": "account-type-selection-view",
  "content": {
    "type": "form",
    "title": { "en-US": "Choose Your Account Type", "tr-TR": "Hesap Türünüzü Seçin" },
    "fields": [...]
  },
  "type": "Json",
  "display": "full-page",
  "label": "Hesap Tipi Seç",
  "labels": [
    { "label": "Hesap Tipi Seç", "language": "tr-TR" },
    { "label": "Choose Account Type", "language": "en-US" }
  ]
}
```

**Html view örneği:** `content` bir string'dir (örn. `"<div>...</div>"`).

### Response Alanları

| Alan | Tip | Açıklama |
|------|-----|----------|
| `key` | `string` | View key tanımlayıcısı |
| `content` | `string` veya `object`/`array` | View içeriği: **Json** tipi → object/array; **Html** ve benzeri → string |
| `type` | `string` | İçerik tipi (Json, Html, vb.) |
| `display` | `string` | Gösterim modu (full-page, popup, vb.) |
| `label` | `string` | View için lokalize edilmiş etiket (değişmedi) |
| `labels` <sup>New</sup> v0.0.99 | `array` | View bileşeninin `labels` listesi (`[{ label, language }]`, **tüm diller**) — yerel view'da da başka domain'den çözülen view'da da bulunur. Tanımlı değilse alan yoktur |

### Query Parametreleri

#### transitionKey

Hangi transition'ın view'ının alınacağını belirtir:

- **Sağlandı**: O belirli transition için tanımlanan view'ı döndürür (varsa)
- **Sağlanmadı**: State view'ını döndürür

Bu seçim, önerilen View Concept modelindeki ayrımı takip eder: `transitionKey` olmadan mevcut state'i anlatan **State View**, `transitionKey` ile ilgili aksiyonu başlatmaya hazırlayan **Transition View** alınır. Detay için [Pseudo UI Rehberi](/docs/how-to/view-consept) sayfasına bakın.

**Örnek:**
```http
GET /core/workflows/account-opening/instances/123/functions/view?transitionKey=confirm-creation
```

Bu, "confirm-creation" transition'ı için onay view'ını döndürür.

#### platform

View içeriği için hedef platformu belirtir. Desteklenen değerler: `web`, `ios`, `android`

Sistem, platforma özel içerik seçimini otomatik olarak yönetir:
- İstenen platform için bir platform override varsa → override içeriğini döndürür
- Override yoksa → orijinal view içeriğini döndürür
- Client platform seçim mantığını uygulamak zorunda değildir

**Örnek:**
```http
GET /core/workflows/account-opening/instances/123/functions/view?platform=ios
```

Sistem, view tanımına göre iOS'a özel içerik mi yoksa varsayılan içerik mi döndüreceğini otomatik olarak belirler.

### View Seçim Mantığı

Fonksiyon, hangi view'ın döndürüleceğini belirlemek için bu mantığı izler:

1. **Kural tabanlı view'lar**: State veya transition bir `views` dizisi (kural tabanlı view seçimi) tanımlıyorsa, ilk eşleşen kural view'ı belirler. Detay için [Kural Tabanlı View Seçimi](/docs/how-to/view-selection) dokümanına bakın.
2. **Tek view / eski kullanım**: `transitionKey` sağlandıysa transition view'ı (tanımlıysa), değilse state view kullanılır; sağlanmadıysa state view kullanılır.
3. **Platform**: `platform` sağlandıysa ve view'da platform override varsa o içerik ve display kullanılır; yoksa varsayılan.
4. **Dil**: Accept-Language uygulanır ve view'ın labels dizisinden uygun etiket döndürülür.

```
1. State/transition'da "views" dizisi (kural tabanlı) var mı?
   ├─ Evet: Kuralları sırayla değerlendir; ilk eşleşen view'ı döndür (veya kuralı olmayan varsayılan giriş)
   └─ Hayır: Aşağıdaki tek view mantığına geç

2. transitionKey sağlandı mı?
   ├─ Evet: Transition'ın tanımlı bir view'ı var mı kontrol et
   │   ├─ Evet: Transition view'ını kullan
   │   └─ Hayır: State view'ını kullan (veya state view yoksa boş döndür)
   └─ Hayır: State view'ını kullan

3. platform sağlandı mı?
   ├─ Evet: View'ın bu platform için platform override'ı var mı kontrol et
   │   ├─ Evet: Override içeriğini ve display ayarlarını kullan
   │   └─ Hayır: Orijinal içeriği ve display ayarlarını kullan
   └─ Hayır: Orijinal içeriği ve display ayarlarını kullan

4. Accept-Language header'ına göre dil seçimi uygula
   └─ View'ın labels dizisinden uygun etiketi döndür
```

### Kullanım Alanları

1. **State View Render Etme**: Mevcut workflow durumu için view alma (sistem platform seçimini yönetir)
2. **Transition Onayı**: Client, transition submit öncesi view var mı diye `transitionKey` ile sorgular
3. **Platforma Özel UI**: Sistem, web, iOS veya Android için optimize edilmiş view'ları otomatik olarak sunar
4. **Çoklu Dil Desteği**: View'ları kullanıcının tercih ettiği dilde gösterme
5. **Wizard Flow'ları**: Adım adım input formları alma

**Önemli**: Sistem, tüm platform ve transition tabanlı view seçim mantığını yönetir. Client'ın yapması gerekenler:
- Transition submit öncesi transition view kontrolü için `transitionKey` parametresini sağlamak
- Platforma özel içerik için isteğe bağlı olarak `platform` parametresini (web/ios/android) sağlamak
- Sistem, hangi view içeriğinin döndürüleceğini otomatik olarak belirler

### Örnek İstekler

**State View Al:**
```http
GET /core/workflows/account-opening/instances/123/functions/view HTTP/1.1
Host: api.example.com
Accept: application/json
Accept-Language: tr-TR
```

**Transition View Al:**
```http
GET /core/workflows/account-opening/instances/123/functions/view?transitionKey=final-confirmation HTTP/1.1
Host: api.example.com
Accept: application/json
```

**Mobil'e Özel View Al:**
```http
GET /core/workflows/account-opening/instances/123/functions/view?platform=mobile HTTP/1.1
Host: api.example.com
Accept: application/json
Accept-Language: tr-TR
```

**Mobil Transition View Al:**
```http
GET /core/workflows/account-opening/instances/123/functions/view?transitionKey=submit&platform=mobile HTTP/1.1
Host: api.example.com
Accept: application/json
```

## Schema Fonksiyonu

Schema fonksiyonu, bir transition için tanımlanmış JSON Schema içeriğini döndürür. View fonksiyonu ile aynı mantıkta çalışır; ancak view yerine transition'a ait şema tanımını sunar. Client'lar bu bilgiyi form oluşturma, input doğrulama ve dinamik UI üretimi için kullanabilir.

### Endpoint

```http
GET /{domain}/workflows/{workflow}/instances/{instance}/functions/schema
```

### Parametreler

| Parametre | Konum | Tip | Gerekli | Açıklama |
|-----------|-------|-----|---------|----------|
| `domain` | Path | string | Evet | Domain adı |
| `workflow` | Path | string | Evet | Workflow key |
| `instance` | Path | string | Evet | Instance ID |
| `transitionKey` | Query | string | Evet | Schema alınacak belirli transition |

### Response

```json
{
  "key": "account-type-selection",
  "type": "workflow",
  "schema": {
    "$id": "https://schemas.vnext.com/banking/account-type-selection.json",
    "type": "object",
    "title": "Account Type Selection Schema",
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "required": ["accountType"],
    "properties": {
      "accountType": {
        "type": "string",
        "oneOf": [
          {
            "const": "demand-deposit",
            "description": "Vadesiz Hesap - Demand Deposit Account"
          },
          {
            "const": "time-deposit",
            "description": "Vadeli Hesap - Time Deposit Account"
          }
        ],
        "title": "Account Type",
        "description": "Type of account to be opened"
      }
    },
    "description": "Schema for account type selection input",
    "additionalProperties": false
  },
  "labels": [
    { "label": "Hesap Türü Seçimi", "language": "tr-TR" },
    { "label": "Account Type Selection", "language": "en-US" }
  ]
}
```

### Response Alanları

| Alan | Tip | Açıklama |
|------|-----|----------|
| `key` | `string` | Schema key tanımlayıcısı |
| `type` | `string` | Schema tipi (örn. `workflow`) |
| `schema` | `object` | JSON Schema içeriği (JSON Schema 2020-12 formatında) |
| `labels` <sup>New</sup> v0.0.99 | `array` | Schema bileşeninin `attributes.labels` listesi (tüm diller). Tanımlı değilse alan yoktur |

:::note Etiketler ve cache (v0.0.99)
Schema/fonksiyon bileşenlerinin `attributes.labels` değeri v0.0.99 öncesinde yükleme sırasında **düşürülüyordu**; artık okunur. Bileşen cache'inde önceki bir build'den kalan bir bileşen, yeniden publish edilene veya cache girdisi dolana kadar `labels` taşımaz. Schema ve master fonksiyon cache'inin yanıt şekli versiyonu **v2**'ye yükseldi (cache key'i ve ETag bir kez değişir).
:::

### Kullanım Alanları

1. **Dinamik Form Üretimi**: Transition'a ait şemadan otomatik form oluşturma
2. **Input Doğrulama**: Transition submit öncesi client-side validation
3. **UI Bileşen Seçimi**: Schema tiplerine göre uygun UI bileşenlerini render etme

### Örnek İstekler

**Transition Schema Al:**
```http
GET /core/workflows/account-opening/instances/123/functions/schema?transitionKey=select-demand-deposit HTTP/1.1
Host: api.example.com
Accept: application/json
```

> **İpucu:** State fonksiyonu yanıtındaki `transitions[].schema.hasSchema` alanını kontrol ederek, gereksiz schema istekleri ve 404 hatalarından kaçının.

## Master Fonksiyonu

Instance'ın bağlı olduğu **flow seviyesindeki master şemayı** (`Workflow.Schema`) döndürür. Schema Fonksiyonu transition'a özel input şemasını verirken, Master Fonksiyonu instance data'nın **şablon yapısını** tanımlayan master şemayı verir. Client, workflow tanımını bilmeden instance'ın master şemasına State fonksiyonu yanıtındaki `master.href` linki üzerinden ulaşır.

### Endpoint

```http
GET /{domain}/workflows/{workflow}/instances/{instance}/functions/master
```

### Parametreler

| Parametre | Konum | Tip | Gerekli | Açıklama |
|-----------|-------|-----|---------|----------|
| `domain` | Path | string | Evet | Domain adı |
| `workflow` | Path | string | Evet | Workflow key |
| `instance` | Path | string | Evet | Instance ID |

### Davranış

- Instance'ın workflow tanımındaki `attributes.schema` (master schema) referansı çözülür ve JSON Schema içeriği döndürülür.
- **Subflow forwarding**: instance'ın aktif bir subflow instance'ı varsa, istek aktif subflow instance'ına yönlendirilir ve **onun** master şeması döner.
- `queryRoles` yetkilendirmesi diğer read fonksiyonlarıyla aynı cevabı paylaşır; <sup>New</sup> v0.0.95 karar gateway'in çağırdığı `authorize?queryRoles=true` ile verilir, fonksiyon in-process `403` üretmez (bkz. [Read fonksiyonlarında queryRoles authorize](#read-fonksiyonlarında-queryroles-authorize)).
- Workflow'da master schema tanımlı değilse **`404`** döner.
- <sup>New</sup> v0.0.99 Yanıt, Schema Fonksiyonu ile aynı şekilde schema bileşeninin `attributes.labels` listesini **`labels`** alanında taşır (tanımlı değilse yok).

### Kullanım Alanları

1. **Master şema keşfi**: Client'ın instance data yapısını (filtre/sıralama vocabulary'si dahil) dinamik öğrenmesi
2. **`x-context-target` uygulaması**: Generic client'ların master şemadaki [Data Context Vocabulary](/docs/components/schema#data-context-vocabulary-data-vocab) anotasyonlarını her instance okumasında uygulaması
3. **Doğrulama**: Client-side instance data validation için şema kaynağı

## Catalog Fonksiyonu

<sup>New</sup> Workflow tanımında deklare edilen fonksiyonların (`attributes.functions`) keşfedilebilir listesini döndürür. Client, State fonksiyonu yanıtındaki `functions.href` işaretçisini takip ederek ikinci bir sabit URL bilmeden kataloğa ulaşır; `functions.hasFunctions` `false` ise çağrıya hiç gerek yoktur.

### Endpoint

```http
GET /{domain}/workflows/{workflow}/instances/{instance}/functions/catalog
```

### Response

```json
{
  "functions": [
    { "name": "get-branches", "version": "1.0.0", "scope": "D",
      "labels": [{ "label": "Şubeler", "language": "tr-TR" }, { "label": "Branches", "language": "en-US" }],
      "href": "/core/functions/get-branches/info" },
    { "name": "calc-limit", "version": "1.0.0", "scope": "F",
      "href": "/core/workflows/onboarding/instances/f410f37d-dc4b-4442-af84-e3a4707bd949/functions/calc-limit/info" }
  ]
}
```

| Alan | Tip | Açıklama |
|------|-----|----------|
| `functions[].name` | `string` | Fonksiyon key'i |
| `functions[].version` | `string` | Fonksiyon versiyonu |
| `functions[].scope` | `string` | Fonksiyon kapsamı (`D` / `F` / `I`) |
| `functions[].labels` <sup>New</sup> v0.0.99 | `array` | Fonksiyon bileşeninin `attributes.labels` listesi (`[{ label, language }]`, tüm diller). Tanımlı değilse alan yoktur |
| `functions[].href` | `string` | Fonksiyonun `/info` keşif endpoint'i — bkz. [Fonksiyon Keşif Endpointleri](/docs/components/functions/custom#fonksiyon-keşif-endpointleri) |

### Davranış

- Liste, workflow tanımındaki **bildirim sırasını** korur.
- **Rol filtrelidir**: fonksiyon `roles` denetimi execution ile aynı politikadan geçer; çağıranın çalıştıramayacağı bir fonksiyon **listelenmez** — verilen her link eyleme dönüktür.
- Her `href` fonksiyonun **scope**'unu izler: `D` domain rotasına, `F`/`I` instance rotasına işaret eder (domain rotası bu iki scope'u `403` ile reddeder).
- Çözümlenemeyen bir fonksiyon referansı loglanır ve çağrıyı bozmadan **atlanır**.

## Tasks Fonksiyonu

<sup>New</sup> v0.0.93 Instance'ın **tam task geçmişini** (task journal, `InstanceTasks`) yürütme sırasında (`startedAt` artan) döndürür. Per-instance geçmiş ailesini — transition'lar (`…/transitions`), incident'lar (`…/incidents`) — o transition'ların **içinde ne çalıştığı** bilgisiyle tamamlar.

### Endpoint

```http
GET /{domain}/workflows/{workflow}/instances/{instance}/functions/tasks
```

`{instance}` instance id veya business key olabilir. Yanıt **sayfalanmaz** — tam küme tek seferde döner (liste, instance'ın kendi transition sayısıyla sınırlıdır).

### Response

```json
{
  "items": [
    {
      "id": "6f9c…",
      "taskKey": "send-otp",
      "transitionKey": "approve",
      "fromState": "draft",
      "toState": "approved",
      "triggerType": "manual",
      "hook": "onExecute",
      "order": 1,
      "status": "completed",
      "businessStatus": "success",
      "startedAt": "2026-09-14T09:12:41Z",
      "finishedAt": "2026-09-14T09:12:41Z",
      "durationMs": 184.2,
      "error": null
    }
  ]
}
```

| Alan | Tip | Açıklama |
|------|-----|----------|
| `items[].id` | `string` | Journal satırı id'si — [Actions Fonksiyonu](#actions-fonksiyonu)'nun aldığı `taskId` |
| `items[].taskKey` | `string` | Task tanımının key'i |
| `items[].transitionKey` / `fromState` / `toState` | `string` | Task'ı çalıştıran transition ve state bağlamı. `toState`, transition hâlâ sürüyorsa `null` |
| `items[].triggerType` | `string` | Transition'ın trigger tipi (`manual`, `auto`, `scheduled`, `event`) |
| `items[].hook` <sup>New</sup> v0.0.99 | `string \| null` | Task'ın transition içindeki fazı: `onExecute` (transition'ın kendi task'ları), `onEntry`, `onExit` (state task'ları). `triggerType` transition'ın nasıl tetiklendiğini, `hook` task'ın hangi fazda çalıştığını söyler. Migration öncesi satırlarda `null` |
| `items[].order` <sup>New</sup> v0.0.99 | `integer \| null` | Task'ın hook grubu içindeki `order` değeri (eşit order ⇒ paralel grup). Migration öncesi satırlarda `null` |
| `items[].status` | `string` | Platform durumu: `waiting` \| `busy` \| `completed` \| `faulted` |
| `items[].businessStatus` | `string` | İş sonucu: `unknown` \| `success` \| `failed` |
| `items[].startedAt` / `finishedAt` / `durationMs` | — | Zamanlama bilgisi |
| `items[].error` | `string \| null` | Yalnızca `faulted` satırlarda fault nedeni; asla stack trace değil |

### Davranış

- **Yalnızca metadata.** Journal'ın `Request`, `Response` ve `InvocationResult` payload'ları bilinçli olarak **sunulmaz**: mapping betikleri oluşturdukları header'ları (secret store'dan çözülen auth materyali dahil) bu kolonlara yazar; tam payload operatör materyalidir ve Monitor API host'u kaldırıldığından (v0.0.93) hiçbir API tarafından servis edilmez — operatörler journal tablosunu doğrudan okur. Tek payload-türevi alan `error`'dur.
- Yetkilendirme diğer read fonksiyonlarıyla aynı `queryRoles` cevabını paylaşır: bir instance'ın state'ini poll edebilen çağıran, üzerinde ne çalıştığını da okuyabilir (bkz. [Read fonksiyonlarında queryRoles authorize](#read-fonksiyonlarında-queryroles-authorize)).
- Subflow'a **inmez**: incident geçmişi gibi her zaman adreslenen instance için cevap verir.
- State gövdesine task linki eklenmez; `ResponseShapeVersion` ve fingerprint ETag'i bu fonksiyondan etkilenmez.
- <sup>New</sup> v0.0.99 `hook` ve `order`, `InstanceTasks` tablosunda gerçek kolonlara taşındı (migration `AddInstanceTaskTriggerAndOrderColumns`). Transition/state bazlı deneme (attempt) görünümü için bkz. [Fonksiyon Metrikleri](#fonksiyon-metrikleri).

## Actions Fonksiyonu

<sup>New</sup> v0.0.93 Bir journal satırının (task kaydının) kaydedilmiş **yürütme alt adımlarını** (`InstanceActions`) yürütme sırasında döndürür.

### Endpoint

```http
GET /{domain}/workflows/{workflow}/instances/{instance}/functions/actions?taskId={id}
```

| Parametre | Konum | Gerekli | Açıklama |
|-----------|-------|---------|----------|
| `taskId` | Query | Evet | Sahip journal satırının id'si (Tasks yanıtındaki `items[].id`). Eksik veya GUID değilse **`400`** (`Instance:100039`) |

### Response

Yanıt sahip `taskId`/`taskKey`'i yansıtır ve `{ id, status, startedAt, finishedAt, durationMs, detail }` öğelerini yürütme sırasında listeler; **sayfalanmaz**.

### Davranış

- Fonksiyon, adreslenen task'ın rotadaki instance'a ait olduğunu doğrular; değilse **`404`** (`Instance:100038`) döner — bir task asla başka bir instance'ın rol gate'i üzerinden okunamaz.
- Yetkilendirme ve subflow davranışı Tasks Fonksiyonu ile aynıdır.
- **Bilinen boşluk:** runtime bugün `InstanceAction` satırı **yazmamaktadır**; okuma sözleşmesi hazırdır ve yazıcı gelene kadar fonksiyon her task için boş liste döner.

## Human Task Fonksiyonu

`GET /api/v1/{domain}/functions/human-task` tek bir soruya cevap verir: **bu çağıranın üzerine düşen human task'lar hangileri?** Instance seviyesi değil **domain seviyesi** bir fonksiyondur; tüketicisi (ör. morph-idm-api) discovery `domain-list` fonksiyonunu okur, kayıtlı her domain için bu rotayı bir kez çağırır ve cevapları client için birleştirir. Yanıt gövdesi düz bir JSON dizisidir; her satır **root** instance'ın `id`/`key`'ini ve **leaf** state'in `humanTask.title` / `description` metnini taşır.

:::tip Akış tasarımı ve client tarafı
Bir onay adımını bu listeye düşürmek (`subType: 6`, `queryRoles`, `humanTask` veri bloğu, kanal bazlı view ve `interaction.longPoll` yapısı, client çağrı sırası) için bkz. [Human Task ve "Bekleyen Onaylarım"](/docs/how-to/human-task-approval).
:::

<sup>New</sup> v0.0.94 Fonksiyon yeniden tasarlandı:

- **Tek tarama.** Domain'deki tüm flow şemaları üzerinde tek bir `UNION ALL` ifadesi (`Type IN (R,P)`, `Status IN (A,B)`, `EffectiveStatus = A`, `EffectiveStateSubType = 6`) aday root'ları bulur; her flow için subflow zinciri **leaf**'e kadar paralel inilir (cross-domain hop'lar dahili `POST {domain}/workflows/{wf}/internal/human-task-leaf/batch` rotası üzerinden).
- **Gate leaf state'in `queryRoles`'udur** (görünürlük sorusu): sırasıyla parent'ın damgaladığı `subFlow.overrides.states.<s>.queryRoles`, leaf state'in kendi `queryRoles`'u, leaf workflow'un root `queryRoles`'u. Bu, state/data/view/schema/incident okumalarının kullandığı çözümlemenin aynısıdır — liste ile açıldığı ekran artık tek gate'e cevap verir. Önceden liste transition `roles`'larını OR'luyordu ve rolsüz bir `cancel` her çağırana her instance'ı açıyordu.
- **Tanımsız state düşer, yayınlanmaz.** State ve workflow ikisi de `queryRoles` bildirmiyorsa leaf **fail-closed** düşürülür (log 20459) — tek-instance okumalarının aksine "kural yazılmamış" burada "herkese" demek değildir.
- **allow/deny bileşimi tüm rol kümesi üzerinden** `DenyGroupOk AND AllowGroupOk` olarak değerlendirilir (bkz. [Yetkilendirme → Grant Değerlendirme](/docs/concepts/authorization#grant-değerlendirme-allow-listesi-vs-yalnızca-deny-blacklist)); **daha kısıtlayıcıdır** — rol rol OR'lanan eski modelde `ht-approver,ht-blocked` taşıyan bir çağıran 159 task görürken şimdi 0 görür.

### Yapılandırma

| Anahtar | Varsayılan | Sınırladığı şey |
|---|---:|---|
| `HumanTaskFunction:PerSchemaLimit` | `200` | Flow başına aday satır (SQL'de). Sıralamayı ve yanıtı sınırlar, taramayı değil |
| `HumanTaskFunction:ResultCap` | `500` | Yetkilendirme ve sıralama sonrası birleşik yanıttaki satır sayısı |
| `HumanTaskFunction:MaxDescentDepth` | `10` | Bir adayın çözülemez sayılmadan önce inilecek SubFlow seviyesi |
| `HumanTaskFunction:FlowsPerScanStatement` | `64` | Tarama ifadesi başına arm sayısı (round-trip, bağlantı değil) |
| `HumanTaskFunction:FanoutParallelism` | `10` | Tek istek içindeki descent dalı sayısı |
| `HumanTaskFunction:MaxConcurrentDescents` | `32` | Tüm in-flight istekler genelinde descent dalı; `FanoutParallelism`'in üstünde, bağlantı havuzunun altında tutun |
| `HumanTaskFunctionCache:Enabled` | `true` | TTL cache kill switch'i |
| `HumanTaskFunctionCache:TtlSeconds` | `60` | Düz TTL (fingerprint doğrulaması yok — B'nin tamamladığı task A'ya 60 sn daha listelenebilir) |
| `HumanTaskFunctionCache:AllowClientOverride` | `true` | `X-VNext-Cache-Override` header'ının kabul edilip edilmediği |

Cache anahtarı `domain + caller scope + auth-header hash`'tir; rol, kimlik, kültür ve volatile olmayan tüm header'lar anahtara girer (dynamic role grant'lar yazarın seçtiği header'ı okuyabildiği için).

### Header'lar

| Header | Yön | Açıklama |
|---|---|---|
| `X-VNext-Cache-Override` | İstek | Cache okumasını atlar ve tam yeniden hesaplar (`AllowClientOverride` true iken). Yazma atlanmaz; yeniden hesaplama sıradan miss ile aynı single-flight gate'ten geçer |
| `X-VNext-HumanTask-Truncated` | Yanıt | Liste `ResultCap` ile kırpıldıysa bulunur — gövde düz dizi olduğu için sinyal header'dadır. Sessizce kırpılmış liste yanlış cevaptır, kısa cevap değil |

Migration notu: v0.0.94 dağıtımı `AddHumanTaskOwnColumnsIndex` migration'ını uygular; eski indeks ayrı bir adımda (`DropLegacyHumanTaskIndex`) kaldırılır.

## Instance Correlation Fonksiyonu

<sup>New</sup> v0.0.99 Tek bir soruya cevap verir: **bu instance neleri başlattı, onlar da neleri başlattı?** Instance'ın `InstanceCorrelation` kayıtlarını **parent → child** yönünde recursive olarak gezer ve sonucu sorgulanan instance'ın kök olduğu bir ağaç olarak döndürür. Kaldırılan `hierarchy` fonksiyonunun yerini alır.

### Endpoint

```http
GET /{domain}/workflows/{workflow}/instances/{instance}/functions/instance-correlation
```

`{instance}` instance id veya business key olabilir. Diğer sistem fonksiyonları gibi `instance-correlation` adlı bir custom function'ı gölgeler. Yön **yalnızca aşağıdır**: çağıran her zaman kendini kök, torunlarını altında görür — atalarını asla görmez. Hem SubFlow (`S`) hem SubProcess (`P`) correlation'ları, **tamamlanmış olanlar dahil**, ağaçta yer alır.

:::warning `hierarchy` kaldırıldı — alias yok
`…/functions/hierarchy` v0.0.99 ile kaldırıldı; eski yol custom function çözümlemesine düşer ve **`404`** döner. MCP aracı `get_instance_hierarchy` da `get_instance_correlation` oldu. Span adı `Instance.Read/hierarchy` → `Instance.Read/instanceCorrelation`; bu değere filtre uygulayan kayıtlı dashboard sorgularını güncelleyin.
:::

### Response

```json
{
  "root": {
    "id": "29f116ad-…",
    "key": "order-4711",
    "flow": "subflow-orchestration-parent",
    "domain": "core",
    "flowVersion": "1.0.0",
    "currentState": "parent-subflow-state",
    "ownState": "parent-subflow-state",
    "status": "B",
    "isCompleted": false,
    "href": "/api/v1/core/workflows/subflow-orchestration-parent/instances/29f116ad-…",
    "resolved": true,
    "children": [
      {
        "id": "b673dbfe-…",
        "flow": "subflow-orchestration-child",
        "domain": "core",
        "currentState": "grandchild-initial",
        "ownState": "child-subflow-state",
        "status": "B",
        "subFlowType": "S",
        "isCompleted": false,
        "parentState": "parent-subflow-state",
        "correlationId": "4367cf1e-…",
        "createdAt": "2026-09-30T11:27:29.869552Z",
        "stateChangedAt": "2026-09-30T11:27:30.662794Z",
        "href": "/api/v1/core/workflows/subflow-orchestration-child/instances/b673dbfe-…",
        "resolved": true,
        "children": []
      },
      {
        "id": "c81e0a77-…",
        "flow": "partner-kyc",
        "domain": "partner",
        "subFlowType": "P",
        "isCompleted": false,
        "parentState": "parent-subflow-state",
        "resolved": false,
        "unresolvedReason": "hop-failed",
        "children": []
      }
    ]
  }
}
```

**Null alanlar yazılmaz** (`null` olarak dönmez). Bu yüzden kökte `subFlowType`, `parentState`, `correlationId`, `createdAt`, `stateChangedAt` ve `terminalOutcome` bulunmaz — bu alanları zorunlu bekleyen bir client yazmayın.

### Node Alanları

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id`, `key` | `string` | Node'un temsil ettiği instance |
| `flow`, `domain`, `flowVersion` | `string` | Instance'ın tanımı |
| `currentState` | `string` | **Child'da**: correlation'ın izlediği state — **en derin aktif torunun** state'i. **Kökte**: kökün kendi state'i (`ownState` ile aynı) |
| `ownState` | `string` | Node'un **kendisinin** bulunduğu state (instance satırından). Ağaç/graf görünümleri bunu okumalıdır |
| `status` | `string` | Instance durumu (`B` Busy, `A` Active, `C` Completed, `P` Passive, `F` Faulted) |
| `subFlowType` | `string` | `S` SubFlow / `P` SubProcess. **Kökte yok** |
| `isCompleted` | `boolean` | **Bağlantının (correlation)** kapanıp kapanmadığı — instance'ın değil. Bir child `status: "C"` iken `isCompleted: false` olabilir (subflow tamamlanma penceresi) |
| `completedAt` | `string` | Bağlantının kapanma zamanı |
| `terminalOutcome` | `string` | Bağlantının nasıl bittiği: `completed` \| `faulted` \| `canceled`. Bağlantı açıkken yok |
| `parentState` | `string` | Child'ın başlatıldığı parent state. Kökte yok |
| `correlationId` | `string` | Correlation satırının id'si. Kökte yok |
| `createdAt` | `string` | Correlation'ın oluşturulma (child'ın başlatılma) zamanı. Kökte yok |
| `stateChangedAt` | `string` | Child'ın izlenen state'inin son değiştiği zaman. Kökte yok |
| `href` | `string` | Node'un kendi **instance kaynağına** link |
| `children[]` | `array` | Aynı şekilde recursive alt node'lar |
| `resolved` | `boolean` | Varsayılan `true`. `false` ise node'un kendisi gerçektir, **alt ağacı eksiktir** |
| `unresolvedReason` | `string` | Yalnızca `resolved: false` iken — aşağıdaki tablo |

| `unresolvedReason` | Anlamı |
|---|---|
| `depth-exceeded` | `MaxDescentDepth` tükendi. Bu kadar derin olamayacak bir grafikte bir döngünün ilk belirtisidir |
| `hop-failed` | Bir hop genişletilemedi — çoğunlukla ulaşılamayan bir partner domain. **Yalnızca o dal** kesilir; ağacın geri kalanı gelir ve çağrı yine `200` döner |
| `instance-missing` | Satır, sahibi olması gereken domain'de okunamadı (parent'ın correlation okuması ile child'ın kendi okuması arasında kaybolmuş olabilir) |
| `hop-unsupported` | Partner domain batch rotasını içermeyen **eski bir runtime** çalıştırıyor |

Tüm node'ları `resolved: true` olan ağaç tamdır. Çözümlenmemiş bir node'daki boş `children`'ı "çocuk yok" olarak yorumlamayın.

### Davranış

- **Hop bazında toplu (batched) gezinti.** Ağaç seviye seviye genişletilir; bir hop bir `(domain, flow, version)` grubudur ve hop başına bir correlation + bir instance okuması yapılır. Kardeş hop'lar paralel çalışır.
- **Cross-domain dal tek çağrıdır.** Başka domain'deki bir dal, dahili `POST /{domain}/workflows/{workflow}/internal/correlations/batch` rotasıyla (istek başına en fazla 500 instance id) tek çağrıda istenir; karşı taraf alt ağacı kendi içinde recursive çözer. Child'ın `key`, `ownState` ve canlı `status` değerleri bu sayede sahibi olan domain'den gelir.
- **Yetkilendirme** diğer read fonksiyonlarıyla aynıdır: in-process gate yoktur, `authorize?queryRoles=true` ile cevaplanır (bkz. [Read fonksiyonlarında queryRoles authorize](#read-fonksiyonlarında-queryroles-authorize)).
- State fonksiyonundan farkı: state fonksiyonu aktif subflow'a inip en derin leaf'in state'ini raporlar; bu ağacın **kökü** kendi state'ini raporlar — her seviye ayrı gösterilir.

### Yapılandırma

| Anahtar | Varsayılan | Aralık | Sınırladığı şey |
|---|---:|---|---|
| `Workflow:InstanceCorrelation:MaxDescentDepth` | `20` | 1–100 | İnilecek en fazla seviye; aşılırsa `depth-exceeded` |
| `Workflow:InstanceCorrelation:FanoutParallelism` | `8` | 1–256 | Tek istek içindeki paralel hop sayısı |
| `Workflow:InstanceCorrelation:MaxConcurrentHops` | `32` | 1–1000 | Tüm in-flight istekler genelinde eşzamanlı hop; bağlantı havuzunun altında tutun |

Değerler başlangıçta doğrulanır.

## Yetkilendirme (Authorization)

Workflow'larda fonksiyon, flow, state ve transition seviyesinde **roles** ve **queryRoles** tanımlanabilir. Aşağıdaki sistem fonksiyon endpoint'leri yetki bilgilerini ve yetkilendirme kontrolünü sunar.

### Sistem rolleri ve JSONPath grant'ları

Instance yetkilendirmesi (transition `roles`, state/flow `queryRoles`, master şema alan görünürlüğü) dört statik sistem rolü (`$InstanceStarter`, `$PreviousUser`, `$InstanceBehalfOfStarter`, `$PreviousBehalfOfUser`) ve `$user.` / `$userBehalfOf.` / `$role.` JSONPath grant'ları üzerinden yürür. Bu kalıplar **available transition** ve **data** yetkilendirmesinin geçerli olduğu her yerde (master şema alan görünürlüğü dahil) değerlendirilir.

State Function'ın döndürdüğü `transitions` dizisi de bu grant'lara göre filtrelenir: yalnızca çağıranın izinli olduğu transition'lar yanıta dahil edilir.

> **Tam referans:** Claim'ler (`sub`/`act_sub`), sistem rolü tabloları, JSONPath örnek yolları ve master şema alan görünürlüğü için bkz. [Yetkilendirme (Authorization)](/docs/concepts/authorization).

### Read fonksiyonlarında queryRoles authorize

:::warning Tek karar noktası: `authorize` <sup>New</sup> v0.0.95
Read fonksiyonları (**state**, **data**, **view**, **schema**, **master**, **tasks**, **actions**, `incidents`, `incidents/active`) ve `POST …/longpoll/ack` endpoint'i `queryRoles`'u / etkileşim gate'ini artık **in-process denetlemez** ve kendileri `403` üretmez. Hedef dağıtım, çağıranı tanıyıp isteği iletmeden önce **`authorize`** fonksiyonuna danışan bir **Internal Gateway**'dir; aynı soruya iki karar noktası zamanla ayrışır (bu repoda iki kez yaşandı) — bir soru, bir cevap, bir yer. **Önünde bu gateway olmayan bir runtime bu okumaları reddetmez**; `queryRoles` çağırana ne gösterileceğini tarif eder ve gateway'in kabul ettiği cevaptır, tek başına bu process'in savunduğu bir sınır değildir. Rol **çözümü** değişmemiştir: `availableTransitions` filtreleme, state alias, `x-roles` alan filtreleme, human-task listesi ve `CallerScopeHash` cache anahtarı çağıranın rollerini değerlendirmeye devam eder — görünürlük kaldı, enforcement gateway'e taşındı.
:::

`queryRoles` cevabı `authorize?queryRoles=true` ile hesaplanır ve tüm read yüzeyleri tarafından paylaşılır (`state`'i okuyamayan `data`'yı da okuyamaz; built-in fonksiyonların kendine ait selector'ı yoktur). <sup>New</sup> v0.0.99 Aktif bir SubFlow zinciri varsa karar **yalnızca en derin aktif yaprakta (leaf)** verilir; üst seviyeler artık AND'lenmez. Karar veren instance'ta (leaf ya da subflow'u olmayan tek instance) değerlendirme sırası:

1. Parent'ın child'a damgaladığı `subFlow.overrides.states.<currentState>.queryRoles` (varsa; override **replace** eder, merge etmez).
2. Leaf state'in kendi `queryRoles`'u.
3. Leaf workflow'un (root) `queryRoles`'u. Boş grant kümesi izin verir.

Formül: **parent damgası ?? leaf state `queryRoles` ?? leaf workflow `queryRoles`**. Çağıranın **tüm rol kümesi** `allow`/`deny` olarak tek seferde değerlendirilir (**DENY her zaman ALLOW'u geçersiz kılar**; rolsüz çağıran rol-bağlı bir DENY'ı geçemez — bkz. [Yetkilendirme → Grant Değerlendirme](/docs/concepts/authorization#grant-değerlendirme-allow-listesi-vs-yalnızca-deny-blacklist)). Grant'lar `allOf` / `anyOf` bileşiklerini de içerebilir (v0.0.99).

:::warning Erişimi gevşetebilir (v0.0.99)
v0.0.99 öncesinde root/ara seviyelerin kararı yaprağın kararıyla AND'leniyordu (conjunction). Bu kaldırıldı: root `queryRoles` bildirip leaf hiçbir `queryRoles` bildirmiyorsa, instance subflow'dayken root'un kısıtı artık **uygulanmaz** ve boş leaf grant kümesi izin verir. Kısıtı korumak için parent'ta `subFlow.overrides.states.<state>.queryRoles` damgalayın veya leaf workflow/state'e `queryRoles` ekleyin — bkz. [Subflow Override'ları](/docs/how-to/subflow-overrides).
:::

Böylece bir instance, bulunduğu state'e göre farklı izleyici kitlelerine açılıp kapatılabilir (ör. backoffice incelemesindeyken yalnızca operatör rolleri görür). `queryRoles` tanımı için bkz. [Workflow → Query Roles](/docs/components/workflow#query-roles) ve [Yetkilendirme](/docs/concepts/authorization).

### Flow Authorize

Verilen rolün, flow üzerinde verilen transition (veya function) için izinli olup olmadığını kontrol eder. İsteğe bağlı `version`; verilmezse latest kullanılır.

```http
GET /api/v1/{domain}/workflows/{workflow}/functions/authorize?transitionKey=submit-account-details&role=morph-idm.maker&version=1.0.0
```

**Yanıt 200:** `{ "allowed": true }`  
**Yanıt 403:** `{ "allowed": false }`

### Instance Authorize

Runtime'ın yetkilendirme **oracle**'ıdır: bir çağıran hakkındaki soruyu cevaplar, kendisi hiçbir şeyi korumaz. <sup>New</sup> v0.0.95 itibarıyla bu soruların cevaplandığı **tek yerdir** — read yüzeyleri ve ack endpoint'i in-process denetim yapmaz; Internal Gateway bu fonksiyonu çağırıp cevabına göre isteği kabul veya reddeder. Bu yüzden `authorize` hiçbir zaman **gevşek** olmamalıdır: fazla cömert bir read yüzeyi görüntü hatasıdır, fazla cömert bir oracle ise erişim kontrolü hatası.

```http
GET /api/v1/{domain}/workflows/{workflow}/instances/{instanceId}/functions/authorize?queryRoles=true
GET /api/v1/{domain}/workflows/{workflow}/instances/{instanceId}/functions/authorize?ack=true
```

**Yanıt 200:** `{ "allowed": true }` — **Yanıt 403:** `{ "allowed": false }`. Karar **her iki durumda da gövdededir**; yalnızca 200'ü okuyan bir tüketici her reddi "cevap yok"a çevirir. Rol çözümü başarısız olursa (provider ulaşılamaz, 5xx, timeout) bu bir **hata**dır (4xx/5xx zarfı), ret değil.

| Selector | Değerlendirdiği | Aktif SubFlow'a iner mi? |
|---|---|---|
| `?transitionKey=` | Transition instance'ın **mevcut state**'inde sunuluyor mu (state transition'ı için o state'te bildirilmiş olmalı; shared/well-known için `availableIn`, boş liste = her state) **VE** `transition.roles` **VE** o state'in `availableIn` öğesinin `roles`'u (AND) | Yalnızca parent transition'ı **kendinde tutmuyorsa** |
| `?functionKey=` | Custom function'ın kendi `roles`'u — `roles` tanımsızsa **izinli** | Evet |
| `?queryRoles=true` | State'in (ya da root'un) `queryRoles`'u — sırasıyla parent damgası → state → root | Evet; <sup>New</sup> v0.0.99 karar **yalnızca en derin aktif leaf'te** verilir, üst seviyeler AND'lenmez |
| `?ack=true` <sup>New</sup> v0.0.95 | Girilen state'in `interaction.longPoll` kolu — `roles` **veya** koşul `rule`'u (endpoint'in eskiden kullandığı aynı `ILongPollInteractionGate`). Zincirde ack bekleyen instance yoksa **izinli** (endpoint de orada idempotent `200` döner) | Endpoint'in kuralıyla aynı: "hangi instance duraklamış" (`IsAwaitingLongPollAck`) |

**Parent'ta kalan transition'lar.** Açık bir SubFlow correlation'ı varken `cancel`, `exit`, `updateData` ve **parent'ın mevcut state'inde sunulan shared transition**'lar **parent'a göre** cevaplanır, subflow'a inilmez — execution ile birebir aynı (pipeline'da bu dört tür forward edilmez). v0.0.99'daki leaf-only `queryRoles` değişikliği bu kuralı ve `?ack=true` davranışını **değiştirmez**.

**Permissions matrisi ve bileşik grant'lar.** <sup>New</sup> v0.0.99 `permissions` matrisi `allOf` / `anyOf` bileşik grant'ları, `role` alanı olmadan bileşik yapısıyla gösterir:

```json
{ "allOf": [ { "role": "morph-idm.officer" }, { "role": "$user.branch" } ], "grant": "allow" }
```

Bileşiklerin değerlendirme kuralları (üç değerli mantık, rolsüz çağıran) için bkz. [Yetkilendirme](/docs/concepts/authorization).

**Human-task leaf hop'u.** <sup>New</sup> v0.0.99 Human-task listesinin leaf'e inen hop'u çağıranın `act_sub` / `sub` değerlerini taşır; `CallerScopeHash` artık `sub`'ı da içerir (cache'ler dağıtımda bir kez yeniden anahtarlanır).

### Authorize Query Parametreleri

| Parametre | Açıklama |
|-----------|----------|
| `transitionKey` | Kontrol edilecek transition (transition seviye roles + `availableIn` state/rol kontrolü). |
| `functionKey` | Kontrol edilecek custom fonksiyon (function seviye roles). Built-in fonksiyonların kendi selector'ı yoktur; okuma yetkisi `queryRoles=true` ile sorulur. |
| `queryRoles` | `true` ise okuma yetkisi sorulur. <sup>New</sup> v0.0.99 Aktif subflow zincirinde yalnızca en derin aktif leaf değerlendirilir: parent damgası ?? leaf state `queryRoles` ?? leaf workflow `queryRoles`. |
| `ack` <sup>New</sup> v0.0.95 | `true` ise `POST …/longpoll/ack` çağrılabilir mi sorusu — `interaction.longPoll.roles`/`rule` kolu. |
| `role` | İsteğe bağlı, **tek** bir rol. Çağıranın kimliği **değildir**; provider'a göre bileşimi değişir (aşağıya bakın). |
| `version` | İsteğe bağlı. Workflow tanım versiyonunu sabitler; verilmezse instance'ın kendi versiyonu. |

**Dört selector'dan tam olarak biri** bulunmalıdır; sıfır veya iki selector istek hatasıdır (`AuthorizeRequiresExactlyOneTarget`), sessiz bir varsayılan değil — selector'ı unutan çağıran başka bir soruya cevap almamalıdır. Header'lar, query string ve route değerleri `$.context.Headers` / `$.context.QueryParameters` / `$.context.RouteValues` olarak dynamic role grant'lara taşınır.

**`role` parametresinin bileşimi** — çağıranın rolleri her zaman yapılandırılmış [Caller Role Provider](/docs/configuration/caller-role-provider)'dan çözülür; `role` parametresi bunun üstüne provider'ın modu (`RoleParameterMode`) ile eklenir:

| Provider (mod) | `transitionKey`, `functionKey`, `queryRoles` | `ack` |
|---|---|---|
| `default` (`Fallback`) | **Fallback** — yalnızca provider hiç rol çözemediyse kullanılır; bir `role` header'ı her zaman kazanır | <sup>New</sup> v0.0.96 **Additive** — her yolda provider'ın rollerine **eklenir** |
| `morph-idm` (`AsRoleHeader`) <sup>New</sup> v0.0.97 | İstekte `role` header'ı yoksa `?role=X` **o header gibi** davranır: rol kümesi `[X]` olur ve morph-idm **çağrılmaz**; gerçek bir header parametreyi ezer | Diğer hedeflerle aynı |

Değerlendirme her zaman **tüm rol kümesiyle tek çağrıdır**, rol rol dönen bir döngü değil — deny grubu çağıranın taşıdığı her rol üzerinde AND'dir. Her karar `WorkflowLogs.AuthorizeRequest` (EventId 50030) ile domain, workflow, **instance id**, sorulan soru (`transition:{key}` / `function:{key}` / `queryRoles` / `ack`), **çözülen** rol kümesi ve karar bilgisiyle loglanır.

## Fonksiyon Metrikleri

<sup>New</sup> v0.0.99 Custom fonksiyon çalıştırmaları opt-in olarak journal'a yazılabilir ve metrik endpoint'leriyle okunabilir:

- Fonksiyon bileşeninde `attributes.executionLog: "E"` (enabled) kayıt açar; `"D"` veya alanın olmaması hiçbir şey kaydetmez — bkz. [Custom Functions → Attributes](/docs/components/functions/custom#attributes-özellikleri).
- Kayıtlar şu endpoint'lerden okunur (sayfalı; `page`, `pageSize`, `from`, `to`, `succeeded` query parametreleri):

```http
GET /{domain}/functions/{function}/metrics
GET /{domain}/workflows/{workflow}/functions/{function}/metrics
```

- Instance seviyesinde transition ve state bazlı deneme (attempt) metrikleri de vardır: `GET …/instances/{instance}/transitions/{transitionKey}/metrics` ve `GET …/instances/{instance}/states/{stateKey}/metrics`.

Yanıt şekilleri, journal yapılandırması ve örnekler için bkz. [Gözlemlenebilirlik](/docs/how-to/observability) → "Metrik Endpoint'leri".

## En iyi Uygulamalar

### 1. Long-Polling'i Verimli Kullanın

- Başarısız istekler için exponential backoff uygulayın
- Makul polling aralıkları belirleyin (3-10 saniye)
- Workflow final state'e ulaştığında polling'i durdurun
- Gereksiz veri transferlerinden kaçınmak için ETag kullanın

### 2. ETag Önbelleklemesinden Yararlanın

- Her zaman saklanan ETag ile `If-None-Match` header'ı gönderin
- 304 response'larını düzgün şekilde handle edin
- Her başarılı 200 response'unda ETag'leri güncelleyin
- Transition'larda optimistic locking için ETag'leri kullanın

### 3. Platform Parametresini Doğru Kullanın

- Client tipine göre platform parametresi (web/ios/android) gönderin
- Sistem platforma özel içerik seçimini otomatik olarak yönetir
- Fallback mantığı uygulamaya gerek yok - sistem handle eder
- Platforma özel view'ları uygun şekilde önbellekleyin

### 4. View Render Etmeyi Optimize Edin

- Muhtemel sonraki state'ler için view'ları önceden alın
- View tanımlarını yerel olarak önbellekleyin
- Mümkün olduğunda view içeriğini lazy-load edin
- Tekrarlanan view'lar için view render pooling uygulayın

### 5. Performansı İzleyin

Şu metrikler için takip yapın:
- Fonksiyon başına ortalama response süresi
- ETag istekleri için cache hit oranı
- Polling aralığı verimliliği
- View render etme performansı

### 6. Güvenlik Değerlendirmeleri

- Function çağrıları için her zaman HTTPS kullanın
- Header'larda authentication token'ları dahil edin
- Render etmeden önce view içeriğini doğrulayın (XSS önleme)
- Client tarafında rate limiting uygulayın
- İstek takibi için correlation ID'leri kullanın

## Ilgili Dökümanlar

- [Custom Functions](/docs/components/functions/custom) - Kullanıcı tanımlı fonksiyonlar
- [Gözlemlenebilirlik](/docs/how-to/observability) - Trace, log ve metrik endpoint'leri
- [Instance Filtreleme](/docs/how-to/instance-filtering) - GraphQL-stil filtreleme kılavuzu
- [View](/docs/components/view) - View tanımları ve gösterim stratejileri
- [Kural Tabanlı View Seçimi](/docs/how-to/view-selection) - Kurallara göre dinamik view seçimi
- [Workflow](/docs/components/workflow) - Workflow state'lerini anlama
- [Transition Yönetimi](/docs/components/mappings) - Mapping ve transition'lar
- *Versiyonlama ve ETag (Phase 2)* - ETag pattern detayları
