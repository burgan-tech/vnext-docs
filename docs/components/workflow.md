---
sidebar_position: 0
title: Workflow
description: vNext Workflow component — tanım, türler, capability matrix ve özel transition'lar
---

# Workflow

**Workflow**, vNext platformunda iş süreçlerini modelleyen ana **definable unit**'tir. JSON formatında tanımlanır ve `vnext-schema` üzerinden doğrulanır.

> **Schema:** [`vnext-schema/workflow-definition.schema.json`](https://github.com/burgan-tech/vnext-schema)

## Tanım JSON Örneği

> **Schema:** `workflow-definition.schema.json`

```json
{
  "key": "account-opening",
  "flow": "sys-flows",
  "flowVersion": "1.0.0",
  "domain": "banking",
  "version": "1.0.0",
  "tags": ["banking", "account", "account-opening"],
  "_comment": "Hesap açma iş akışı",
  "attributes": {
    "type": "F",
    "labels": [
      { "label": "Account Opening", "language": "en-US" },
      { "label": "Hesap Açma", "language": "tr-TR" }
    ],
    "schema": {
        "key": "account-master-schema",
        "domain": "banking",
        "flow": "sys-schemas",
        "version": "1.0.0"
    },
    "startTransition": {
      "key": "start",
      "target": "account-type-selection",
      "triggerType": 0,
      "versionStrategy": "Minor",
      "labels": [
        { "label": "Start", "language": "en-US" },
        { "label": "Başlat", "language": "tr-TR" }
      ],
      "schema": {
        "key": "start-schema",
        "domain": "banking",
        "flow": "sys-schemas",
        "version": "1.0.0"
      },
      "mapping": null
    },
    "states": [
      {
        "key": "account-type-selection",
        "stateType": 1,
        "versionStrategy": "Minor",
        "labels": [
          { "label": "Account Type Selection", "language": "en-US" },
          { "label": "Hesap Türü Seçimi", "language": "tr-TR" }
        ],
        "view": {
          "view": {
            "key": "account-type-selection-view",
            "domain": "banking",
            "flow": "sys-views",
            "version": "1.0.0"
          },
          "loadData": false
        },
        "transitions": [
          {
            "key": "select-demand-deposit",
            "target": "account-detail",
            "triggerType": 0,
            "versionStrategy": "Minor",
            "labels": [
              { "label": "Select Demand Deposit", "language": "en-US" },
              { "label": "Vadesiz Hesap Seç", "language": "tr-TR" }
            ],
            "schema": {
              "key": "demand-deposit-schema",
              "domain": "banking",
              "flow": "sys-schemas",
              "version": "1.0.0"
            },
            "mapping": {
              "location": "./src/SelectDemandDepositMapping.csx",
              "code": "<BASE64_ENCODED_CODE>"
            },
            "view": null,
            "rule": null,
            "timer": null
          }
        ]
      },
      {
        "key": "account-detail",
        "stateType": 2,
        "versionStrategy": "Minor",
        "labels": [
          { "label": "Account Detail", "language": "en-US" },
          { "label": "Hesap Detay", "language": "tr-TR" }
        ],
        "view": {
          "view": {
            "key": "account-detail-view",
            "domain": "banking",
            "flow": "sys-views",
            "version": "1.0.0"
          },
          "loadData": true,
          "extensions": ["extension-customer-detail"]
        },
        "transitions": [
          {
            "key": "complete-account",
            "target": "completed",
            "triggerType": 0,
            "versionStrategy": "Minor",
            "labels": [
              { "label": "Complete", "language": "en-US" },
              { "label": "Tamamla", "language": "tr-TR" }
            ],
            "onExecutionTasks": [
              {
                "order": 1,
                "task": {
                  "key": "create-account",
                  "domain": "banking",
                  "flow": "sys-tasks",
                  "version": "1.0.0"
                },
                "mapping": {
                  "location": "./src/CreateAccountMapping.csx",
                  "code": "<BASE64_ENCODED_CODE>"
                }
              }
            ],
            "mapping": null,
            "schema": null,
            "view": null,
            "rule": null,
            "timer": null
          }
        ]
      },
      {
        "key": "completed",
        "stateType": 3,
        "subType": 1,
        "versionStrategy": "None",
        "labels": [
          { "label": "Completed", "language": "en-US" },
          { "label": "Tamamlandı", "language": "tr-TR" }
        ]
      }
    ],
    "cancel": {
      "key": "cancel-account-opening",
      "target": "cancelled",
      "triggerType": 0,
      "versionStrategy": "None",
      "labels": [
        { "label": "Cancel", "language": "en-US" },
        { "label": "İptal", "language": "tr-TR" }
      ]
    },
    "timeout": {
      "key": "account-opening-timeout",
      "target": "timed-out",
      "versionStrategy": "None",
      "timer": {
        "reset": "None",
        "duration": "PT30M"
      }
    },
    "functions": [
      {
        "key": "function-get-customer-detail",
        "domain": "core",
        "flow": "sys-functions",
        "version": "1.0.0"
      }
    ],
    "extensions": [
      {
        "key": "extension-customer-detail",
        "domain": "core",
        "flow": "sys-extensions",
        "version": "1.0.0"
      }
    ],
    "queryRoles": [
      { "role": "account-officer", "grant": "allow" },
      { "role": "guest", "grant": "deny" }
    ]
  }
}
```

---

## Workflow Türleri

| Kod | Tür | Açıklama | Tipik Kullanım |
|---|---|---|---|
| **C** | Core | Platform çekirdek iş akışları | Sistem işlemleri, platform servisleri |
| **F** | Flow | Ana iş akışları | İşletme ana süreçleri, kullanıcı etkileşimi |
| **S** | SubFlow | Alt iş akışları | Tekrar kullanılabilir süreç parçaları |
| **P** | SubProcess | Alt süreçler | Paralel ve bağımsız işlemler (fire-and-forget) |

---

## Properties

### Top-Level Alanlar

| Alan | Tip | Zorunlu | Pattern / Kısıt | Açıklama |
|------|-----|---------|-----------------|----------|
| `$schema` | string | Hayır | — | JSON Schema referansı |
| `key` | string | **Evet** | `^[a-z0-9-]+$` | Workflow'un benzersiz tanımlayıcısı (domain içinde unique) |
| `flow` | string | **Evet** | `^[a-z0-9-]+$` | Kategorize amaçlı flow ismi |
| `flowVersion` | string | **Evet** | `^\d+\.\d+\.\d+(-[a-zA-Z]+\.\d+)?$` | Flow versiyonu (SemVer) |
| `domain` | string | **Evet** | `^[a-z0-9-]+$` | Workflow'un ait olduğu domain |
| `version` | string | **Evet** | `^\d+\.\d+\.\d+(-[a-zA-Z]+\.\d+)?$` | Workflow tanım versiyonu (SemVer) |
| `tags` | string[] | **Evet** | — | Etiketler — sorgu/filtre için |
| `_comment` | string | Hayır | — | Açıklama / yorum |
| `attributes` | object | **Evet** | — | Workflow'un asıl tanımı (aşağıda) |

### `attributes` Alanları

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `type` | string | **Evet** | Workflow türü: `C`, `F`, `S`, `P` (yukarıdaki tür tablosu) |
| `executionType` | string | Hayır | Flow'un varsayılan çalıştırma modu (v0.0.99): `S` (sync) veya `A` (async). Kendi `executionType`'ını tanımlamayan transition'lara uygulanır — bkz. [Çalıştırma Modu (`executionType`)](#çalıştırma-modu-executiontype) |
| `history` | string | Hayır | <sup>New</sup> v0.0.100 Geçmiş kaydı modu: `full` (varsayılan; alan yoksa) veya `none` (tek seferlik akış: transition/task geçmişi yazılmaz, tek data satırı). `attributes` kökünde durur, `config` altında değil — bkz. [History Modu](#history-modu) |
| `scripts` <sup>New</sup> | object | Hayır | Flow seviyesi helper ve izinli assembly tanımı (aşağıda) |
| `states` | array | **Evet** | State listesi. **En fazla bir** `Initial` state (`stateType: 1`) içerebilir (v0.0.99 öncesinde tam olarak bir tane zorunluydu). Hiç Initial yoksa instance runtime'ın örtük `$start` state'inde doğar — bkz. [Initial state olmadan başlangıç (`$start`)](#initial-state-olmadan-başlangıç-start) |
| `startTransition` | object | **Evet** | Başlangıç transition tanımı (aşağıda) |
| `labels` | array | **Evet** | Çoklu dil etiketleri (`minItems: 1`). Her öğe: `label` + `language` |
| `schema` | object | Hayır | Master schema referansı. `schema` ile `reference` objesi içerir |
| `timeout` | object \| null | Hayır | Workflow seviyesi timeout tanımı (aşağıda) |
| `functions` | array | Hayır | Workflow'da kullanılan function referansları |
| `features` | array | Hayır | Workflow'da kullanılan feature (extension) referansları |
| `extensions` | array | Hayır | Workflow'da kullanılan extension referansları |
| `sharedTransitions` | array | Hayır | Birden fazla state'den erişilebilen ortak transition'lar (aşağıda) |
| `errorBoundary` | object \| null | Hayır | Global hata yönetim tanımı (aşağıda) |
| `cancel` | object \| null | Hayır | Cancel transition tanımı. Yalnızca `triggerType: 0` (manual) |
| `exit` | object \| null | Hayır | Exit transition tanımı. Yalnızca `triggerType: 0` (manual) |
| `updateData` | object \| null | Hayır | Update data transition. `target` her zaman `$self` |
| `queryRoles` | array | Hayır | Root-level sorgu rolleri. DENY her zaman ALLOW'u geçersiz kılar. v0.0.99'dan itibaren `allOf` / `anyOf` kombinatörleri de kullanılabilir — bkz. [Query Roles](#query-roles) |
| `rowSecurity` <sup>New</sup> v0.0.102 | object | Hayır | Satır güvenliği: rol anahtarlı satır filtreleri (`rules[]`: `roles` + opsiyonel `filter`). Instance listesine, tekil GET'e ve `GetInstances` / `GetInstance` task'lerine uygulanır; tanımlıysa **deny by default**. Yoksa flow filtrelenmez. Ayrıntı: [Satır Güvenliği](/docs/concepts/row-security) |
| `output` <sup>New</sup> | object \| null | Hayır | Sync yanıt için opsiyonel output mapping (`scriptCode`, `IOutputHandler`). Ayrıntı: [Output Mapping](#output-mapping) |
| `event` <sup>New</sup> | object \| null | Hayır | Workflow seviyesi event tanımı. Tanımlıysa harici bir event bu workflow'un **yeni bir instance'ını başlatabilir** (`action=start`). Transition seviyesi event'ten bağımsızdır. Ayrıntı: [Event Transition](#event-transition) |
| `config` <sup>New</sup> | object \| null | Hayır | Flow seviyesi yapılandırma. Şu an built-in function cache ayarını (`functionCache`) içerir. `null` ise host varsayılanları geçerlidir. Ayrıntı: [Config (Built-in Function Cache)](#config-built-in-function-cache) |

---

## Reference Yapısı

Workflow tanımı içinde birçok yerde kullanılan genel referans objesidir. İki formdan biri kullanılır:

| Form | Zorunlu Alanlar | Açıklama |
|------|-----------------|----------|
| Explicit | `key`, `domain`, `flow`, `version` | Doğrudan bileşen referansı |
| Ref | `ref` | Dosya yolu ile bileşen referansı |

---

## State Yapısı

### State Alanları

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `key` | string | **Evet** | State benzersiz tanımlayıcısı (pattern: `^[a-z0-9-]+$`) |
| `stateType` | integer | **Evet** | State tipi — aşağıdaki enum tablosuna bakın |
| `subType` | integer | Hayır | State alt tipi — aşağıdaki [`subType` enum tablosuna](#subtype-enum-değerleri) bakın. Varsayılan: `0` |
| `versionStrategy` | string | **Evet** | Versiyon stratejisi: `None`, `Patch`, `Minor`, `Major` |
| `labels` | array | **Evet** | Çoklu dil etiketleri (`minItems: 1`) |
| `view` | object \| null | Hayır | State view tanımı: `view` (reference), `loadData` (boolean), `extensions` (string[]) |
| `subFlow` | object \| null | Hayır | SubFlow state için alt akış tanımı: `type` (yalnızca `S`), `process` (reference), `mapping`, `overrides` — bkz. [SubFlow State](#subflow-state) |
| `transitions` | array | Hayır | Bu state'den çıkan transition'lar. Wizard state (`stateType: 5`) için yalnızca **bir manuel transition** tanımlanabilir |
| `onEntries` | array | Hayır | State'e girildiğinde çalıştırılacak task'lar |
| `onExits` | array | Hayır | State'den çıkılırken çalıştırılacak task'lar |
| `errorBoundary` | object \| null | Hayır | State seviyesi hata yönetimi |
| `queryRoles` | array | Hayır | State seviyesi sorgu rolleri. Root `queryRoles`'u override eder. Instance bu state'teyken okuma izni bu tanımla belirlenir; <sup>New</sup> v0.0.95 itibarıyla karar gateway'in çağırdığı `authorize?queryRoles=true` ile verilir, read fonksiyonları in-process `403` üretmez (bkz. [Query Roles](#query-roles)) |
| `alias` | array | Hayır | State için rol bazlı alternatif çoklu-dil etiketleri. Tanımlıysa State Function `state` değerini role göre maskeler |
| `notifications` | array | Hayır | State'e bağlı bildirim tanımları. Transition pipeline tamamlandıktan sonra enqueue edilir ve durable çalışır — bkz. [State Notifications](#state-notifications) |
| `interaction` | object \| null | Hayır | State etkileşim yapılandırması (ör. `longPoll`). Long-poll'un ne zaman sonlandırılacağını deklaratif tanımlar — bkz. [State Interaction (Long Poll)](#state-interaction-long-poll) |

### `stateType` Enum Değerleri

| Değer | Ad | Açıklama |
|-------|----|----------|
| `1` | **Initial** | Başlangıç state'i. Workflow'da **en fazla bir tane** olabilir (v0.0.99'dan itibaren opsiyonel). Tanımlanmazsa instance örtük `$start` state'inde doğar — bkz. [Initial state olmadan başlangıç](#initial-state-olmadan-başlangıç-start) |
| `2` | **Intermediate** | Ara state |
| `3` | **Final** | Bitiş state'i |
| `4` | **SubFlow** | Alt akış çağıran state |
| `5` | **Wizard** | Wizard (sihirbaz) state. Yalnızca bir manuel transition'a sahip olabilir |

### Wizard State ve View Davranışı

Wizard state, kullanıcı girdisini transition tabanlı modellemek için kullanılan özel state tipidir. Bir Wizard state içinde yalnızca bir manuel transition tanımlanabilir; input, seçim ve onay gibi kullanıcı etkileşimleri state view içinde data alanı olarak değil, bu transition'ın view'ı üzerinden alınmalıdır.

State Function aktif state'in tipini Wizard olarak değerlendirdiğinde önce authorization/role evaluation sonrasında kullanılabilir transition listesini belirler. Kullanılabilir manuel transition varsa View Function, state view yerine bu transition'ın view'ını döndürür. Transition üzerinde view tanımlı değilse state'de tanımlı view fallback olarak kullanılır.

Örneğin hesap açılışı akışında "hesap türü seçimi" state'inde kullanıcıdan vadeli/vadesiz seçimi alınacaksa bu seçim state view içinde veri alanı olarak modellenmemelidir. Seçim transition routing perspektifiyle tasarlanır; böylece her seçim ayrı transition görünürlüğü, loglama ve raporlama katkısı sağlar. State view varsa, summary veya wizard'a devam edeceği ekran olarak kullanılmalıdır.

### `subType` Enum Değerleri

State'in `subType` alanı, şemadaki `stateSubType` tanımını kullanır:

| Değer | Ad | Açıklama |
|-------|----|----------|
| `0` | None | Belirli bir alt tip yok (varsayılan) |
| `1` | Success | Başarılı tamamlanma |
| `2` | Error | Hata durumu |
| `3` | Terminated | Manuel sonlandırılmış |
| `4` | Suspended | Geçici askıya alınmış |
| `5` | Busy | Meşgul |
| `6` | Human | İnsan müdahalesi gerektiren |
| `7` | Cancelled | İptal edilmiş |
| `8` | Timeout | Zaman aşımına uğramış |

State Function yanıtında bu değer v0.0.99'dan itibaren üst seviye `stateSubType` alanında camelCase string olarak döner (`none`, `success`, `error`, `terminated`, `suspended`, `busy`, `human`, `cancelled`, `timeout`).

### SubFlow State

`stateType: 4` bir state, `subFlow` bloğuyla başka bir workflow'u **child instance** olarak başlatır ve child bir terminal state'e ulaşana kadar parent bu state'te bekler (parent instance bu sırada `Busy`'dir; client `metadata.effectiveStatus` / State Function `status` ile child'ın gerçek durumunu görür).

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `type` | string | **Evet** | Yalnızca `"S"` (SubFlow). <sup>New</sup> v0.0.95 state seviyesinde `"P"` (SubProcess) **publish'te reddedilir** (400) — fire-and-forget alt süreç için [SubProcess task](/docs/components/tasks/) kullanın |
| `process` | object | **Evet** | Child workflow referansı (`key`, `domain`, `flow`, `version`) |
| `mapping` | object \| null | Hayır | Child'ın start payload'ını üreten mapping betiği. Child'a iletilecek çağıran header'ları (ör. rol) da burada üretilir |
| `overrides` | object \| null | Hayır | Child'ı parent bağlamına göre ayarlayan override'lar: `timeout`, `transitions.<t>.roles`, `states.<s>.queryRoles`, `states.<s>.interaction.longPoll.{fallbackTimeoutSeconds, roles}` <sup>New</sup> v0.0.95, `states.<s>.views.<viewKey>` / `transitions.<t>.views.<viewKey>` <sup>New</sup> v0.0.95. Tam referans: [SubFlow Overrides](../how-to/subflow-overrides) |

- **Başarısız subflow start'ı** <sup>New</sup> v0.0.95: child başlatılamazsa parent artık `Busy`'de asılı kalmaz; parent **fault** eder ve bir incident açılır, `retry` subflow start'ını yeniden dener — bkz. [Instance Incidents](/docs/concepts/incidents).
- Override'lar child'a start anında damgalanır (start-time snapshot); zaten çalışan child'lar başladıkları override'larla devam eder. Kapsam **tek hop**tur: P → C → G zincirinde P'nin override'ları yalnızca C'nin state'lerine uygulanır.
- Eski `overrides.views` / `viewOverrides` **deprecated**'dır; scoped view override'larıyla aynı `subFlow` içinde karıştırmak doğrulama hatasıdır.
- `history: "none"` bir parent'ın SubFlow child'ı da `none` olmalıdır — bkz. [History Modu → SubFlow kuralı](#subflow-kuralı).
- **Çözülmüş sürüm** <sup>New</sup> v0.0.102: parent, correlation'a child'ın **çözülmüş** sürümünü (child start yanıtındaki `flowVersion`) yazar — `process.version`'daki yazılmış referansı (`1.0`, `latest`) değil. Parent'ın sonraki okumaları (forward, descent, human task, retry) floating referansı yeniden çözmez; child'ın varsayılan sürümü sonradan değişse de çalışan child kendi sürümünde kalır. `flowVersion` döndürmeyen eski bir uzak runtime'da yazılmış referans korunur. Bkz. [Flow Varsayılan Sürümü](/docs/concepts/flow-default-version).
- **Taşınan header'lar** <sup>New</sup> v0.0.102: child'ı sonlandıran isteğin (finish/exit, cancel ya da istek üzerinde fault) header'ları parent'a taşınır. Parent'ın output mapping'i bunları `context.Headers` olarak görür ve parent'ın resume hop'u varsayılan olarak bu header'larla çalışır (auto koşulları, onEntry task'leri, sonraki subflow'un input mapping'i). Timer / timeout ile biten child hiçbir header taşımaz. İçerik, hariç tutulan header'lar ve opt-out için bkz. [Interfaces](/docs/components/interfaces).

#### Sync SubProcess task çıktısında child state'i

<sup>New</sup> v0.0.104 Alt süreçler (SubProcess, `P`) state seviyesinde değil, [SubProcess task](/docs/components/tasks/trigger) (type `14`) ile başlatılır. Task **sync** çalıştığında (`SetSync(true)`) çıktısı artık child'ın `currentState` ve `effectiveState` alanlarını taşır; output mapping child'ın nerede durduğunu ek bir okuma yapmadan görebilir. Alanın yolu rotaya göre değişir:

```csharp
// SubProcess (sync) OutputHandler
var state = context.Body?.data?.value?.currentState   // aynı domain'de start: çıktı data.value altına sarılır
         ?? context.Body?.data?.currentState;         // cross-domain start: uzak gövde düz geçer (data.*)
```

- Bu alanlar instance'ın **kendi persisted state'idir** — instance GET'teki `metadata.currentState` / `metadata.effectiveState` ile aynı ad ve değer; SubFlow'a inilmez. State fonksiyonunun `state` alanı (aktif SubFlow yaprağının state'i) **değildir**.
- Child kendi başlangıç state'inden otomatik olarak ilerliyorsa değer, doğduğu state değil **durduğu** state'tir.
- **Async** (`202`) yanıtta iki alan da yoktur. Yanıtı bir `ClientResponse` ile üreten pipeline'da instance olmadığından ikisi de `null` kalır.
- Aynı alanlar sync start / transition yanıtında (`?sync=true` veya `executionType: S`) da döner — bkz. [Çalıştırma Modu](#çalıştırma-modu-executiontype).

Çalışan örnek: [vnext-example `sync-subprocess-state-lab`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/sync-subprocess-state-lab/src/SspStartChildMapping.csx) (task: [`ssp-start-child.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Tasks/sync-subprocess-state-lab/ssp-start-child.json)).

#### Aktif SubFlow'a transition iletimi (proxy)

<sup>New</sup> v0.0.100 Aktif bir `S` SubFlow'u olan parent'a gelen ve iletilebilir (forwardable) bir transition artık **parent'ta kuyruğa alınmaz**; doğrudan aktif child'a iletilir (davranış değişikliği):

- **Parent'ta hiçbir şey yazılmaz.** Parent zinciri rezerve etmez, Busy bayrağını çevirmez, job kurmaz; isteği **değiştirmeden** aktif child'a iletir. Ara seviyeler aynı kontrolü tekrarlar, istek en derin aktif SubFlow'a (**leaf**) ulaşır.
- **Mod parent'ta bir kez çözülür** (transition `executionType` → flow `executionType` → `?sync`) ve child aynı modda çağrılır — async istek async kalır. Bkz. [Çalıştırma Modu](#çalıştırma-modu-executiontype).
- **Leaf kendi kapsamında çalışır:** isteği kendi şemasıyla doğrular, `x-storage` dosyalarını kendi binding'iyle depoya yazar, kendi Busy'sini ve job'unu alır.
- **Yanıt** parent'ın id'sini ve child'ın status'ünü taşır (async `202`, sync `200`).
- **Leaf'in reddi artık senkron döner.** Leaf'in `403` / `400` / `409` cevabı doğrudan client'a ulaşır; önceden parent isteği `202` ile kabul ediyordu.
- **Tamamlanma penceresi:** child tamamlanmış ama parent'ın correlation'ı henüz açıksa ya da child henüz oluşmamışsa parent **`409` `InstanceBusy`** döner — kısa bir beklemeyle yeniden deneyin. (Hiç oluşturulmamış bir child'a işaret eden correlation bir veri hatasıdır; o durumda `409` kalıcıdır.)
- **Hiç iletilmeyenler:** `updateData`, `cancel`, `exit`, timeout ve parent'ın **mevcut state'inde kullanılabilir** shared transition'ları parent'ta işlenir. Mevcut state'te kullanılabilir olmayan bir parent shared transition'ı iletilir (leaf genellikle `400` döner).
- Ek maliyet p50'de yaklaşık **5 ms**.

:::info[Deprecation: `subflow-chain-reserve-claim`]
Eski accept-time zincir rezervi (`ChainReserved` talebi, `…/busy` ve `internal/busy-release` rotaları) v0.0.100'den itibaren **deprecated**'dır; en erken v0.0.103'te kaldırılacaktır. Bu runtime alıcı tarafı korur: eski sürümlü bir parent'tan gelen rezervli relay leaf'te eskisi gibi kabul edilir. **Karışık sürümlü domain'lerde aksiyon gerekmez.**
:::

### State Alias (Rol Tabanlı State Maskeleme)

`alias`, bir state'in dış dünyaya nasıl görüneceğini **role göre** maskelemek için kullanılır. Bir süreç client tarafında başlayıp backoffice'te devam ederken, arka planda Fraud, Limit, KPS gibi kontrol state'leri çalışır. Client durumu [State Function](/docs/components/functions/custom#state-function) ile sorduğunda normalde ham `state.key` döner — bu da iç süreç adımlarının client'a sızmasına ve bir güvenlik açığına yol açar.

`alias` ile aynı state'e rol bazlı alternatif çoklu-dil etiketleri tanımlanabilir: client `"Değerlendirme Aşamasında"` gibi maskelenmiş bir değer görürken, backoffice aktörleri kendi rollerine uygun alias'ı (örn. `"Operasyon İncelemesinde"`) görür.

`alias` bir dizidir; her öğe aşağıdaki alanlara sahiptir:

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `name` | string | **Evet** | Alias adı. İstek diline uygun bir `label` bulunamazsa fallback olarak döner |
| `roles` | array | **Evet** | Bu alias'ın geçerli olduğu roller (`minItems: 1`) |
| `labels` | array | **Evet** | Alias'ın çoklu-dil etiketleri (`minItems: 1`) |

**`roles` alanları:**

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `role` | string | **Evet** | Rol adı |
| `grant` | string | **Evet** | `allow` veya `deny`. DENY her zaman ALLOW'u geçersiz kılar |

**`labels` alanları:**

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `label` | string | **Evet** | Etiket metni |
| `language` | string | **Evet** | Dil kodu (pattern: `^[a-z]{2}(-[A-Z]{2})?$`, örn. `tr`, `en`, `tr-TR`) |

**Örnek:**

```json
{
  "alias": [
    {
      "name": "Değerlendirme Aşamasında",
      "roles": [
        { "role": "backoffice.operator", "grant": "allow" }
      ],
      "labels": [
        { "label": "Operasyon İncelemesinde", "language": "tr" },
        { "label": "Under Operational Review", "language": "en" }
      ]
    }
  ]
}
```

**Çözümleme Davranışı:**

State Function `state` değerini döndürürken aşağıdaki sırayı izler:

1. State'te `alias` tanımı **yoksa** → `state.key` döner (mevcut davranış).
2. `alias` tanımı **varsa** → istek yapan aktörün rolleri her alias'ın `roles` listesine göre değerlendirilir (DENY her zaman ALLOW'u geçersiz kılar).
3. Eşleşen bir alias bulunursa → istek diline (Accept-Language) uygun `label` döner; o dilde label yoksa `alias.name` döner.
4. Hiçbir alias rolü eşleşmezse → `state.key` fallback olarak döner.

### State Notifications

State'e girildikten sonra, transition pipeline'ı tamamlandığında platform bildirim taleplerini **enqueue** eder ve **durable** olarak çalıştırır. Bu yapı Notification Task'tan bağımsızdır; task pipeline'ına bağlı kalmadan state geçişini takip eden bildirimleri kapsam dışında tutar.

Dapr Binding yapılandırması [Notification Task](./tasks/notification) ile aynı convention'ı izler (`vnext-notification-state`).

#### `stateNotification` Alanları

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `type` | integer | **Evet** | Bildirim tipi. Şu an yalnızca `0` (State) desteklenir |
| `mapping` | scriptCode | **Evet** | `IStateNotificationMapping` implementasyonu. Bildirim içeriğini ve hedef metadata'yı şekillendirir |
| `rule` | scriptCode \| null | Hayır | Koşul scripti. Tanımsız veya `null` ise bildirim her durumda çalışır |

**Örnek:**

```json
{
  "key": "waiting-approval",
  "stateType": 2,
  "notifications": [
    {
      "type": 0,
      "mapping": { "type": "L", "code": "<base64-encoded-script>", "encoding": "B64" },
      "rule": { "type": "L", "code": "<base64-encoded-condition>", "encoding": "B64" }
    }
  ]
}
```

:::tip
`rule` alanı yalnızca belirli koşullarda (örn. yalnızca belirli bir transition üzerinden gelindiğinde) bildirim göndermek için kullanılır. `rule` yoksa her state girişinde bildirim enqueue edilir.
:::

> İlgili: [IStateNotificationMapping](/docs/components/interfaces#istatenotificationmapping) · [Notification Task](./tasks/notification)

---

### State Interaction (Long Poll)

State Function, client tarafında **long-polling** ile süreç durumunu döner. `interaction.longPoll` ile bu açık tutulan isteğin **ne zaman sonlandırılacağı** state tanımında **deklaratif** olarak belirtilir. Runtime, isteği bir transition gerçekleşene veya fallback timeout dolana kadar açık tutar. Böylece bir süreç tasarımında farklı client'lar süreci kendi **durak noktaları** ile belirleyebilir.

:::tip[Uçtan uca örnek]
Onay adımı + "Bekleyen Onaylarım" senaryosunda `terminate: false` / `terminate: true` + `rule` kullanımının tamamı için bkz. [Human Task ve "Bekleyen Onaylarım"](/docs/how-to/human-task-approval).
:::

`interaction` opsiyoneldir ve şimdilik tek bir alt blok taşır: `longPoll`.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `terminate` | boolean | **Evet** | `true`: state'e girişte pipeline **duraklatılır** ve client'a "long-poll'u sonlandır" sinyali verilir; `false`: pipeline duraklamaz, instance bu state'teyken `interaction` bloğu (ack'siz) yayınlanır ve client long-poll penceresini `fallbackTimeoutSeconds`'a göre ayarlar — bkz. [`terminate` semantiği](#terminate-semantiği) |
| `fallbackTimeoutSeconds` | integer | Hayır | İstek fallback'e düşmeden önce açık tutulacağı maksimum saniye (`minimum: 1`, varsayılan `60`). `terminate: true`'da client `ack` gönderemezse bu süre sonunda platform pipeline'ı otomatik devam ettirir; `terminate: false`'ta client'ın varsayılan long-poll penceresinin yerini alır |
| `roles` | array | **Koşullu** | Long-poll etkileşimini kullanabilecek roller. DENY her zaman ALLOW'u geçersiz kılar; v0.0.99'dan itibaren `allOf` / `anyOf` kombinatörleri de kullanılabilir. `roles` ve `rule`'dan **tam olarak biri** tanımlanabilir; ikisi de yoksa herkes izinlidir |
| `rule` <sup>New</sup> v0.0.94 | object | **Koşullu** | `roles` yerine **koşul betiği** ile yetkilendirme — view ve notification kurallarıyla aynı [IConditionMapping](/docs/components/interfaces#iconditionmapping) sözleşmesi. `roles` ile birlikte tanımlanamaz (publish'te reddedilir). Betik `false` dönerse, hata fırlatırsa veya derlenemezse **fail-closed** çalışır: state sinyali yayınlanmaz ve ack `403` alır |

**Örnek:**

```json
{
  "key": "waiting-approval",
  "stateType": 2,
  "interaction": {
    "longPoll": {
      "terminate": true,
      "fallbackTimeoutSeconds": 30,
      "roles": [
        { "role": "client.app", "grant": "allow" }
      ]
    }
  }
}
```

**`rule` ile örnek** <sup>New</sup> v0.0.94 — yalnızca `x-channel: mobile` header'ı taşıyan çağıranlar etkileşimi kullanabilir:

```json
{
  "key": "waiting-otp",
  "stateType": 2,
  "interaction": {
    "longPoll": {
      "terminate": true,
      "rule": { "location": "./src/InteractionGate.csx", "code": "<base64>" }
    }
  }
}
```

```csharp
public class InteractionGate : IConditionMapping
{
    public Task<bool> Handler(ScriptContext context)
    {
        try
        {
            if (context.Headers == null) return Task.FromResult(false);
            string channel = (string)context.Headers["x-channel"];
            return Task.FromResult(channel == "mobile");
        }
        catch (Exception) { return Task.FromResult(false); }
    }
}
```

`rule` betiğinin bağlamı workflow, instance, istek header'ları ve query parametrelerini taşır; instance verisine `context.Instance.Data` ile erişilir. **`context.Body` doldurulmaz** — bir view kuralını buraya taşırken `context.Body.*` okumalarını `context.Instance.Data.*` ile değiştirin, aksi halde betik fırlatır ve (fail-closed) reddeder. Rule-gated bir state gövdesi paylaşımlı body cache'e **yazılmaz**; ack endpoint'i kuralı her istekte taze değerlendirir.

#### `terminate` semantiği

| `terminate` | Pipeline | Instance durumu | State yanıtı |
|---|---|---|---|
| `true` | State'e giriş sonrası **OnEntry tamamlanınca duraklar** (pipeline adımı order 75): ack token'ı armlanır, `fallbackTimeoutSeconds` için tek seferlik fallback job'ı kurulur, epilog (schedule/auto/finish) çalışmaz | Ack veya fallback gelene kadar **Busy** kalır (SubFlow duraklamasıyla aynı dinlenme şekli) | `interaction` bloğu `terminateLongPoll: true` + `ack.href` ile döner |
| `false` | **Duraklamaz** — pipeline normal akar, ack token'ı armlanmaz, fallback job'ı kurulmaz; sunucu tarafında hiçbir şey armlanmaz | Değişmez | v0.0.98'den itibaren instance bu state'teyken `interaction` bloğu `terminateLongPoll: false` + `fallbackTimeoutSeconds` ile **her zaman** yayınlanır; `ack` yoktur (aşağıya bakın) |

Ack (veya fallback) geldiğinde pipeline kaldığı yerden devam eder: token temizlenir, Busy çözülür ve epilog (Schedule → Auto → Finish → Finalize) çalışır. Ack ve fallback aynı anda gelirse `:lpack` kilidi ikisini serileştirir; token zaten temizlenmişse ikinci istek güvenli no-op'tur. Error-boundary ve auto-chain profillerinde bu adım **hiç çalışmaz** — bu transition'lar asla duraklamaz.

#### State Yanıtındaki `interaction` Objesi

State Function yanıtındaki `interaction` objesinin ne zaman döndüğü `terminate` değerine bağlıdır:

- **`terminate: true`** — v0.0.95'ten beri blok **yalnızca instance gerçekten ack beklerken** (`IsAwaitingLongPollAck`) döner: state'e girilip pipeline duraklamışsa ve ack/fallback henüz gelmemişse. Blok `ack.href` taşır. (Önceki davranış bloğu tanımdan türetiyor ve client'ı bekleyen bir şey olmadığı hâlde her poll'da ack göndermeye yönlendiriyordu; `ResponseShapeVersion` aynı değişiklikte yükseltildi ve tüm state ETag'leri bir kez geçersiz kılındı.)
- **`terminate: false`** — v0.0.98'den itibaren blok, instance tanımı yapan state'te olduğu **her an** ve çağıran etkileşim gate'ini geçtiğinde (`rule`, yoksa `roles`, yoksa izin) döner. **`ack` yoktur**; sunucu tarafında hiçbir şey armlanmaz. v0.0.95–v0.0.97 arasında bu blok hatalı olarak bastırılıyordu; v0.0.98 bunu düzeltti (`ResponseShapeVersion` v12 → v13).

```json
"interaction": {
  "terminateLongPoll": true,
  "fallbackTimeoutSeconds": 60,
  "ack": { "href": "/api/v1/core/workflows/account-opening/instances/{id}/longpoll/ack" }
}
```

```json
"interaction": {
  "terminateLongPoll": false,
  "fallbackTimeoutSeconds": 120
}
```

| Alan | Açıklama |
|------|----------|
| `terminateLongPoll` | State'in `interaction.longPoll.terminate` değerini yansıtır (her zaman döner) |
| `fallbackTimeoutSeconds` | Etkin pencere (her zaman döner; state'in kendi değeri ya da parent subflow override'ı, varsayılan `60`) |
| `ack` | Acknowledge endpoint href'i (`{ "href": "…" }` şekli). **Yalnızca** `terminateLongPoll: true` iken |

Blok yalnızca etkileşimin yetkilendirme kolunu (`roles` ya da `rule`) geçen çağıranlara yayınlanır. Aktif bir subflow'daki state için blok parent'a **yukarı taşınır** ve `ack.href` poll edilen (en üst) instance'ın endpoint'ine yeniden yazılır — client her zaman en üst instance'ın ack'ini çağırır.

Client davranışı:

- **`terminateLongPoll: true`** → client aktif long-poll isteğini sonlandırır, girilen state'in ekranını render eder ve `ack` ile platformu bilgilendirir. Süre içinde ack gelmezse zamanlanmış fallback pipeline'ı otomatik devam ettirir.
- **`terminateLongPoll: false`** → ack gönderilmez; client `fallbackTimeoutSeconds` değerini kendi varsayılan long-poll penceresinin yerine kullanır (varsayılan 60 sn; state `120` tanımlıysa client 120 sn poll eder).
- **`interaction` bloğu yok** → state long-poll tanımlamıyor veya çağıran gate'i geçemiyor (`terminate: true`'da ayrıca bekleyen bir ack yok); client normal long-poll döngüsüne devam eder.

#### Long Poll Acknowledge

Client, açık tuttuğu long-poll isteğini tamamladığında **acknowledge** endpoint'ini çağırarak platformu bilgilendirir:

```
POST /api/v1/{domain}/workflows/{workflow}/instances/{instance}/longpoll/ack
```

Client hata alır veya talep gönderemezse `fallbackTimeoutSeconds` süresi dolduğunda platform pipeline'ı otomatik olarak devam ettirir. Bu sayede client çökmesi veya ağ hatası durumunda long-poll askıda kalmaz. Ack beklemeyen bir instance'a gelen ack idempotent olarak `200` döner (no-op). Aktif subflow zincirinde ack, parent'tan duraklamış (gerekirse cross-domain) child'a hop hop iletilir.

:::warning[Ack yetkisi artık in-process denetlenmiyor <sup>New</sup> v0.0.95]
Ack endpoint'i `roles`/`rule` kolunu artık **kendisi değerlendirmez**. Karar noktası tek: Internal Gateway isteği iletmeden önce [`authorize?ack=true`](/docs/components/functions/built-in#instance-authorize) fonksiyonunu çağırır; bu hedef, endpoint'in eskiden kullandığı aynı etkileşim gate'inden (`rule` → `roles` → izin) geçer — `rule` bir C# betiği olduğu için gateway'in kendisinin değerlendiremeyeceği tek kol budur. Önünde bu gateway olmayan bir runtime ack'i **reddetmez**. Bkz. [Yetkilendirme → Nerede Değerlendirilir?](/docs/concepts/authorization#nerede-değerlendirilir).
:::

#### Subflow'da parent override'ı

<sup>New</sup> v0.0.95 Bir state'i SubFlow olarak tüketen parent, child state'inin `fallbackTimeoutSeconds` (≥ 1) ve `roles` değerlerini `subFlow.overrides.states.<childState>.interaction.longPoll` altında alan bazında değiştirebilir; yazılmayan alan child değerini korur, `roles` listeyi bütün olarak değiştirir. `terminate` ve `rule` **override edilemez**; override, long-poll tanımlamayan bir state'e long-poll **eklemez** (log 20305) ve child `rule` kullanıyorsa `roles` override'ı yok sayılır (log 20306). Ayrıntı: [SubFlow Overrides](../how-to/subflow-overrides).

#### Interaction wait (Busy subType + interaction)

<sup>New</sup> v0.0.102 `subType: 5` (Busy) olan ve `interaction` tanımlayan bir state bir **interaction wait**'tir: instance burada bilerek **Busy** bekler ve dışarıdan bir tetikleyici (genellikle verisi state'in otomatik transition'ını açan bir `updateData`) bekler. Bu Busy'nin sahibi yoktur. İki çıkış yolu artık takılmaz:

- **Tetikleyici gelir:** state'in kurulmuş (armed) ama vakti gelmemiş bir timer'ı artık Busy'nin canlı sahibi sayılmaz — yalnızca vakti gelmiş bir timer sahiptir. Önceden uzak bir timeout sahip sayılıyor ve `updateData`'nın sağladığı otomatik transition düşürülüyordu (`Instance:100031`).
- **Tetikleyici hiç gelmez:** state'in zamanlanmış transition'ı ateşlendiğinde park edilmiş Busy'yi **devralır** ve çalışır (log EventId 10181). Busy'nin canlı bir sahibi varsa (başka bir transition'ın job'ı), bir long-poll ack'i bekleniyorsa ya da açık bir SubFlow instance'ı tutuyorsa yine reddedilir.

Yalnızca timer bu istisnadan yararlanır: aynı state'teki **client isteği yine reddedilir**. `interaction` tanımlamayan bir Busy-subType state'te timer eskisi gibi busy olarak reddedilir. Örnek: [vnext-example `busy-subtype-armed-timer`](https://github.com/burgan-tech/vnext-example/tree/master/core/Workflows/busy-subtype-armed-timer).

> İlgili doküman: [Async / Sync Yöntemi](/docs/how-to/async-sync)

---

## State Yaşam Döngüsü

State machine aşağıdaki yaşam döngüsünü takip eder:

```mermaid
flowchart TD
    A[Transition Triggered] --> B[State Policy Checks]
    B --> |Valid| C[Current Transition OnExecutionTasks]
    B --> |Invalid| END1["Error: Policy Violation"]

    C --> D[Current State OnExits]
    D --> E[State Change]
    E --> F[Target State OnEntries]

    F --> NOTIF[Notification Enqueue]
    NOTIF --> G{"State Type Check"}

    G --> |Finish| H["Instance Status: Completed"]
    G --> |SubFlow| I[Execute SubFlow]
    G --> |"Initial/Intermediate"| J[Auto Transition Check]

    H --> END2[Workflow Completed]
    I --> K[SubFlow Completed]
    K --> J

    J --> |Auto Transition Exists| L[Execute Auto Transition]
    J --> |No Auto Transition| M[Schedule Transition Check]

    L --> A

    M --> |Schedule Transition Exists| N[Wait for Schedule Transition]
    M --> |No Schedule Transition| O["State Active - Waiting"]

    N --> |Time Reached| P[Execute Schedule Transition]
    P --> A

    O --> |"Manual/Event Trigger"| A
```

### Yaşam Döngüsü Adımları

Yukarıdaki akış özetlenmiş bir görünümdür: policy kontrolü → transition'ın kendi task'ları → terk edilen state'in OnExit'i → state değişimi → yeni state'in OnEntry'si → bildirimler → state tipine göre sonlanma/subflow → auto transition kontrolü → (auto yoksa) schedule transition kontrolü.

- **Client yalnızca manuel ve event transition'ları tetikleyebilir**; auto ve schedule transition'lar yalnızca sistem tarafından çalıştırılır.
- **State değişimi yalnızca transition'lar üzerinden gerçekleşir.**
- **State Notifications**, state girişinden sonra enqueue edilir ve durable çalışır; `rule` koşulu varsa değerlendirilir.
- **State Tipi Kontrolü**: Finish → instance "Completed"; SubFlow → alt akış çalıştırılır.
- **Auto önce, Schedule sonra** <sup>New</sup> v0.0.90: Auto bir kazanan seçtiyse, Schedule adımı o hop için **hiçbir timer armamaz** — eski "arm et, bir sonraki hop'ta iptal et" churn'ü kaldırıldı.

Kanonik adım sırası (pipeline `LifecycleOrder` değerleri), her trigger tipine göre profiller ve `updateData`'nın `+Self` bileşimi için tek referans: **[Transition Pipeline](../concepts/transition-pipeline)**.

---

## Transition Yapısı

### Transition Alanları

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `key` | string | **Evet** | Transition benzersiz tanımlayıcısı (pattern: `^[a-z0-9-]+$`) |
| `target` | string | **Evet** | Hedef state key'i. `$self` veya bir state key (pattern: `^(\$self\|[a-z0-9-]+)$`) |
| `from` | string | Hayır | Kaynak state key'i |
| `triggerType` | integer | **Evet** | Tetikleme tipi — aşağıdaki enum tablosuna bakın |
| `triggerKind` | integer | Hayır | Otomatik transition alt tipi. Varsayılan: `0` |
| `priority` <sup>New</sup> v0.0.102 | integer | Hayır | Otomatik transition'ların değerlendirme önceliği (`minimum: 1`, yoksa `100`). Düşük değer önce değerlendirilir. **Yalnızca state seviyesindeki, varsayılan olmayan otomatik** transition'larda (`triggerType: 1`, `triggerKind: 10` değil) geçerlidir; manuel, shared ya da start transition'da veya `triggerKind: 10`'da publish hatasıdır. Bir state'in otomatik transition'ları aynı etkin önceliği paylaşıyor ve en az biri açıkça `priority` yazmışsa publish uyarı loglar — bkz. [Otomatik Transition Sırası](#otomatik-transition-sırası) |
| `versionStrategy` | string | **Evet** | `None`, `Patch`, `Minor`, `Major` |
| `labels` | array | **Evet** | Çoklu dil etiketleri (`minItems: 1`) |
| `schema` | object \| null | Hayır | Transition schema referansı (request body validation). `schemas` tanımlıysa yok sayılır |
| `schemas` <sup>New</sup> v0.0.105 | array \| object \| null | Hayır | Kural tabanlı schema seçimi — `view` için kural tabanlı `views` ne ise payload şeması için odur: `[{ "rule"?, "schema" }]` veya `{ "schemas": [...] }`. İlk eşleşen `rule` kazanır; `schema`'yı ezer; eşleşme yoksa `400` `Transition:100025`. Otomatik ve zamanlanmış transition'larda tanımlanamaz — bkz. [Kural tabanlı schema seçimi (`schemas`)](#kural-tabanlı-schema-seçimi-schemas) |
| `rule` | object \| null | **Koşullu** | Kural betiği. `triggerType: 1` (auto) ise **zorunlu** (triggerKind 10 hariç) |
| `timer` | object \| null | **Koşullu** | Timer betiği (`ITimerMapping`). `triggerType: 2` (scheduled) ise **zorunlu**. Schedule transition'ın nasıl timer ürettiği için bkz. [Timer mapping](/docs/components/mappings#timer-mapping) |
| `view` | object \| null | Hayır | Transition view tanımı. Yalnızca `triggerType: 0` (manual) için geçerli |
| `onExecutionTasks` | array | Hayır | Transition sırasında çalıştırılacak task listesi |
| `mapping` | object \| null | Hayır | Transition input mapping betiği |
| `roles` | array | Hayır | Yetkilendirme rolleri. DENY her zaman ALLOW'u geçersiz kılar. v0.0.99'dan itibaren `allOf` / `anyOf` kombinatörleri kullanılabilir — bkz. [Yetkilendirme → Kombinatörler](/docs/concepts/authorization#kombinatörler-allof--anyof) |
| `executionType` | string | Hayır | Transition'ın çalıştırma modu (v0.0.99): `S` (sync) veya `A` (async). Flow'un `executionType`'ını ve çağıranın `?sync` parametresini ezer — bkz. [Çalıştırma Modu](#çalıştırma-modu-executiontype) |
| `annotations` <sup>New</sup> | object \| null | Hayır | Client-side filtreleme ve UI bağlamı için key-value metadata. Platform annotations değerlerini yorumlamaz (passthrough). Çakışmaları önlemek için namespace'li key'ler kullanın (örn. `ui/visible-in`, `ui/priority`) |
| `event` <sup>New</sup> | object \| null | **Koşullu** | Transition seviyesi event tanımı. `triggerType: 3` ise **zorunlu**. Ayrıntı: [Event Transition](#event-transition) |
| `resourceLock` <sup>New</sup> | object \| null | Hayır | Transition sırasında çalışan dağıtık kaynak kilidi (Dapr `lock.redis`). Yalnızca **Manual** profilde çalışır; start, state-level ve shared transition'larda geçerlidir. Ayrıntı: [Kaynak Kilitleme](/docs/how-to/resource-lock) |

### `triggerType` Enum Değerleri

| Değer | Ad | Açıklama | Zorunlu Alanlar |
|-------|----|----------|-----------------|
| `0` | **Manual** | Kullanıcı tarafından tetiklenir | — |
| `1` | **Automatic** | Otomatik tetiklenir | `rule` zorunlu (`triggerKind: 10` hariç) |
| `2` | **Scheduled** | Zamanlayıcı ile tetiklenir | `timer` zorunlu |
| `3` | **Event** | Harici pub/sub event'i ile tetiklenir — bkz. [Event Transition](#event-transition) | `event` zorunlu |

### `triggerKind` Enum Değerleri

| Değer | Ad | Açıklama |
|-------|----|----------|
| `0` | Not applicable | Uygulanmaz (varsayılan) |
| `10` | Default auto | Varsayılan otomatik transition (rule opsiyonel) |

### Kural tabanlı schema seçimi (`schemas`)

<sup>New</sup> v0.0.105 Her transition türü — state transition'ları, `sharedTransitions`, `startTransition`, `cancel`, `updateData` ve `exit` — tek `schema` referansının yanında, kural tabanlı bir `schemas` listesi tanımlayabilir. Şekil, function `inputSchema` slot'unun zaten kullandığı şekildir ve seçim semantiği [kural tabanlı view seçimi](/docs/how-to/view-selection) (`views`) ile aynıdır: istek gövdesi, kuralı eşleşen girişin şemasına karşı doğrulanır.

```json
{
  "key": "submit",
  "target": "done",
  "triggerType": 0,
  "versionStrategy": "Major",
  "labels": [{ "label": "Gönder", "language": "tr-TR" }],
  "schemas": [
    {
      "rule": { "location": "./src/IsCorporate.csx", "code": "<base64>", "encoding": "B64" },
      "schema": { "key": "corporate-payload", "domain": "core", "flow": "sys-schemas", "version": "1.0.0" }
    },
    {
      "schema": { "key": "retail-payload", "domain": "core", "flow": "sys-schemas", "version": "1.0.0" }
    }
  ]
}
```

Liste düz dizi olarak ya da sarmalı `{ "schemas": [...] }` formunda yazılabilir (runtime her zaman sarmalı formu geri yazar). Her giriş yalnızca `rule` (opsiyonel) ve `schema` (zorunlu) taşır.

**Seçim kuralları:**

1. Girişler **bildirim sırasıyla** değerlendirilir; `rule`'u eşleşen **ilk giriş kazanır**.
2. `rule`'suz giriş her zaman eşleşir — fallback'tir ve **son giriş** olmalıdır.
3. `schemas` tanımlıysa `schema`'yı **ezer**.
4. Otomatik (`triggerType: 1`) ve zamanlanmış (`triggerType: 2`) transition'lar `schemas` **tanımlayamaz** (gövde taşıyan bir istek yoktur).
5. Değerlendirilemeyen (exception fırlatan) bir kural loglanır ve atlanır; çağıranın rolleri okunamadığında bu geçerli değildir (aşağıya bakın).

**Sonuçlar (yazma yolu):**

| Durum | Sonuç |
|-------|-------|
| Bir giriş eşleşti | Gövde o girişin şemasına karşı doğrulanır; ihlal → `400` + alan bazlı hatalar (tek `schema` ile aynı format) |
| `schemas` tanımlı, hiçbir giriş eşleşmedi | `400` `Transition:100025` — gövdeden bağımsız. Instance state'ini korur, fault **olmaz**, transition kaydı yazılmaz |
| Ne `schema` ne `schemas` tanımlı | İstek doğrulamasız kabul edilir (değişmedi) |

**Kural bağlamı.** Kural bir [IConditionMapping](/docs/components/interfaces#iconditionmapping) betiğidir. Bağlamda workflow, instance, runtime, transition, `body` (instance'ın **en son verisi**; veri yoksa `{}`) ve istek header'ları bulunur. **Query parametresi yoktur** ve kural **istek gövdesini görmez** — çağıran kendi şemasını gövdeyle seçemez. Kural, çağıranın runtime tarafından çözülmüş rollerini `context.Caller` ile okuyabilir; rol sağlayıcısı cevap veremezse seçim fallback'e düşmez, `503` `Authorization:110006` ile başarısız olur — bkz. [Mappings → ScriptContext Kullanımı](/docs/components/mappings).

```csharp
public class IsCorporate : ScriptBase, IConditionMapping
{
    public Task<bool> Handler(ScriptContext context)
    {
        string segment = context.Headers?["x-segment"]?.ToString();
        return Task.FromResult(string.Equals(segment, "corporate", StringComparison.OrdinalIgnoreCase));
    }
}
```

:::note[Doğrulama sırası]
Şema çözümü (kural betikleri dahil), state-machine / aktör tipi politika kontrolünden **önce** çalışır. Bu yüzden yanlış state'teki (ya da yanlış aktörden gelen) ve hiçbir girişle eşleşmeyen bir istek önce `400` `Transition:100025` alır. Rol yetkilendirmesi bu yazma yolunda verilmediği için (karar gateway'indir) burada öne geçilecek bir `403` yoktur.
:::

**Okuma yolu.** Transition schema fonksiyonu eşleşen girişin şemasını döner; eşleşme yoksa `404`. State fonksiyonunun transition listelerindeki `hasSchema` yalnızca **tanıma** bakar (`schema` ya da boş olmayan `schemas`), `hasView` gibi. Header'a göre seçen kurallar başka bir header değeri için seçilen girişi almasın diye schema fonksiyonunun cache anahtarı ve ETag'i değişken olmayan istek header'larını da içerir.

| Kod | HTTP | Ne zaman |
|-----|------|----------|
| `Transition:100025` | 400 | `schemas` tanımlı, hiçbir giriş eşleşmedi (`TransitionSchemaNotMatched`) |
| `Authorization:110006` | 503 (yeniden denenebilir) | Kural çağıranın rollerini okudu ve rol sağlayıcısı cevap veremedi (`CallerRolesUnavailable`) |

:::tip[Seçim yetkilendirme değildir]
Role ya da header'a göre şema seçmek bir kontrat seçimidir, erişim kararı değildir. Kuralları pozitif test olarak yazın (`HasRoleAsync("x")`) ve kuralsız fallback'i **en az yetkili** kontrat yapın.
:::

Function `inputSchema` slot'u aynı mekanizmayı kullanır; tek fark eşleşmesizlikte `Function:800006` dönmesidir — bkz. [Custom Functions → Fonksiyon Kontratı](/docs/components/functions/custom).

Çalışan örnek: [vnext-example `core/Workflows/rule-schema-lab/rule-schema-lab.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/rule-schema-lab/rule-schema-lab.json) (rol bazlı giriş için `src/IsApproverRole.csx`). Şema paketi: vnext-schema `0.0.60`.

### Çalıştırma Modu (`executionType`)

v0.0.99'dan itibaren bir istek sync mi async mi çalışacağı tanımda sabitlenebilir. `executionType` flow seviyesinde (`attributes.executionType`) ve state transition'larında, `sharedTransitions`'ta ve `startTransition`'da tanımlanabilir.

| Değer | Anlamı | Yanıt |
|-------|--------|-------|
| `S` | Senkron — istek pipeline oturana kadar bekler | `200` + tam instance |
| `A` | Asenkron — istek kabul edilir, pipeline arka planda çalışır | `202` + `{ id, status }` |

**Öncelik:** transition `executionType` → flow `executionType` → çağıranın `?sync` query parametresi (varsayılan `false` = async). Tanım bir değer belirttiğinde `?sync` parametresi **yok sayılır**.

- Otomatik transition'lara, runtime-iç yollara ve subflow start/forward'a uygulanmaz.
- <sup>New</sup> v0.0.104 Sync (`200`) start / transition yanıtı `status` / `effectiveStatus` yanında `currentState` ve `effectiveState` alanlarını da taşır (instance GET'teki `metadata.currentState` / `metadata.effectiveState` ile aynı değerler; SubFlow'a inilmez). Async `202` yanıtında bu alanlar yoktur. Sync SubProcess task'ında kullanımı için bkz. [Sync SubProcess task çıktısında child state'i](#sync-subprocess-task-çıktısında-child-statei).
- `executionType` yanıta yeni bir alan eklemez. Trace'te `vnext.execution.requested`, `vnext.execution.effective` (`SYNC` / `ASYNC`) ve yalnızca tanım çağıranın modunu değiştirdiğinde `vnext.execution.overridden=true` tag'leri bulunur.
- Geçersiz değer publish'te reddedilir: `Unknown execution type: X`.

```json
{ "key": "submit", "target": "review", "triggerType": 0, "executionType": "S" }
```

Bkz. [Async / Sync Yöntemi](/docs/how-to/async-sync).

### `versionStrategy` Enum Değerleri

| Değer | Açıklama |
|-------|----------|
| `None` | Versiyon güncellemesi yok |
| `Patch` | Patch versiyon artırımı |
| `Minor` | Minor versiyon artırımı |
| `Major` | Major versiyon artırımı |

### Annotations

`annotations` alanı, platform tarafından yorumlanmayan serbest key-value metadata'dır. UI SDK'ları ve istemci uygulamaları transition'ları filtrelemek, gruplamak veya koşullu render etmek için kullanır. Çakışmaları önlemek için namespace'li key'ler kullanılması önerilir.

`annotations`, state transition'ları, `sharedTransitions`, `cancel`, `exit` ve `updateData` üzerinde tanımlanabilir; **`startTransition` üzerinde yoktur**. <sup>New</sup> v0.0.95 itibarıyla State Function yanıtında ayrıca:

- `kind: "scheduled"` girişleri, zamanlayıcıyı kuran transition'ın `annotations` değerini taşır (job'ın kaynak state'i üzerinden çözülür);
- workflow seviyesi [`timeout`](#timeout-yapısı) bloğu kendi `annotations` alanını taşır ve bu değer state yanıtındaki `timeout` bloğunda yüzeye çıkar.

#### Tanımlı Key'ler

| Key | Tip | Açıklama |
|-----|-----|----------|
| `ui/visibility-channel` | string | Pipe (`\|`) ile ayrılmış kanal listesi. Yalnızca belirtilen kanallarda gösterilir |
| `ui/priority` | integer (string) | Sıralama önceliği. Düşük değer = yüksek öncelik |
| `ui/intent` | string | Görsel davranış ipucu |

#### `ui/visibility-channel` Değerleri

| Değer | Kanal |
|-------|-------|
| `IbWeb` | İnternet Bankacılığı |
| `backoffice` | Backoffice |
| `IbIvnApp` | Call Center |

#### `ui/intent` Değerleri

| Değer | Açıklama |
|-------|----------|
| `cancel` | İptal aksiyonu |
| `destructive` | Geri alınamaz / yıkıcı aksiyon |
| `close` | Ekran veya modal kapatma |
| `confirm` | Onay gerektiren aksiyon |

#### Örnek

```json
"annotations": {
  "ui/visibility-channel": "IbIvnApp|backoffice",
  "ui/priority": "1",
  "ui/intent": "cancel"
}
```

### Event Transition

Bir transition, harici bir **pub/sub event'i** ile tetiklenebilir. Bunun için transition'da `"triggerType": 3` ve bir `event` tanımı bulunmalıdır. Ayrıca workflow seviyesinde `attributes.event` tanımlanarak harici bir event ile **yeni instance başlatılabilir** (`action=start`). İki tanım birbirinden bağımsızdır.

`event` objesinin tek alanı vardır:

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `mapping` | object | **Evet** | [IEventMapping](/docs/components/interfaces#ieventmapping) uygulayan mapping betiği (standart `scriptCode` yapısı: `location` + base64 `code`). Ham event payload'ını **InstanceKey + Body**'ye (veya key yoksa **Selector**'e) dönüştürür |

```json
{
  "key": "abort-order",
  "target": "aborted",
  "triggerType": 3,
  "versionStrategy": "Minor",
  "labels": [{ "label": "Abort Order", "language": "en-US" }],
  "event": {
    "mapping": { "location": "./src/AbortEventMapping.csx", "code": "<base64>" }
  }
}
```

Kurallar:

- Event transition yalnızca **state transition'ları** ve **shared transition'lar** üzerinde tanımlanabilir; `startTransition`, `cancel`, `exit` ve `updateData` manuel kalır.
- `triggerType: 3` olan bir transition'a event dışı teslimat `NotAnEventTransition` hatasıyla reddedilir.
- Event teslimatı `POST /api/v1/{domain}/workflows/{workflow}/instances/events?action=transition&transitionKey=<key>` endpoint'i üzerinden yapılır; topic ve Dapr Subscription tanımları domain'e aittir.

> Uçtan uca akış (korelasyon kuralları, Dapr Subscription YAML'ları, runtime davranışları, test) için: [Event-Driven Workflow'lar](/docs/how-to/event-driven-workflows).

---

## Otomatik Transition Sırası

v0.0.102 ile bir state'in otomatik transition'ları tanımlı bir sırayla değerlendirilir ve **ilk koşulu sağlanan kazanır**; geri kalanlar değerlendirilmez.

1. Varsayılan olmayan otomatik transition'lar önce gelir, `priority`'ye göre **artan** sırada (`priority` yazılmamışsa `100` sayılır).
2. Aynı etkin önceliğe sahip transition'lar **tanım sırasını** korur (stable sort). Hiç `priority` içermeyen bir state bu yüzden tanım sırasıyla değerlendirilir.
3. Varsayılan otomatik transition (`triggerKind: 10`) **her zaman en sondadır** ve yalnızca başka hiçbir kural sağlanmadığında alınır.

```json
"transitions": [
  {
    "key": "to-low", "target": "low", "triggerType": 1, "priority": 30,
    "versionStrategy": "Minor", "labels": [{ "language": "en-US", "label": "To Low" }],
    "rule": { "location": "./src/LowRule.csx", "code": "<base64>" }
  },
  {
    "key": "to-high", "target": "high", "triggerType": 1, "priority": 10,
    "versionStrategy": "Minor", "labels": [{ "language": "en-US", "label": "To High" }],
    "rule": { "location": "./src/HighRule.csx", "code": "<base64>" }
  },
  {
    "key": "to-fallback", "target": "fallback", "triggerType": 1, "triggerKind": 10,
    "versionStrategy": "Minor", "labels": [{ "language": "en-US", "label": "Fallback" }]
  }
]
```

`to-high` ikinci sırada tanımlanmış olsa da **önce** değerlendirilir; `to-fallback` yalnızca iki kural da sağlanmadığında alınır.

- **Değerlendirme sıralıdır** (paralel değil): ucuz ve büyük olasılıkla eşleşen kuralları düşük `priority` numarasına koyun — pahalı bir kural yalnızca öncekilerin hiçbiri sağlanmadığında çalışır.
- Bir kuralın script'i **exception fırlatırsa** adım başarısız olur ve sonraki kurallar değerlendirilmez; fırlatan kural atlanmaz. Hata, diğer adım hataları gibi error boundary'yi izler.
- **Publish doğrulaması:** `priority < 1`; manuel, shared ya da start transition'da `priority`; varsayılan otomatik transition'da (`triggerKind: 10`) `priority` → publish hatası. Bir state'in otomatik transition'ları aynı etkin önceliği paylaşıyor ve en az biri `priority`'yi açıkça yazmışsa → publish uyarısı (log).

:::warning[Davranış değişikliği: `triggerKind` yok ile `triggerKind: 0` arasındaki sıra]
Bu sürümden önce runtime otomatik transition'ları nullable `triggerKind`'a göre sıralıyordu: `triggerKind` yazılmamış bir transition, açıkça `triggerKind: 0` yazılmış olandan dizideki yerinden bağımsız olarak **önce** değerlendiriliyordu. Artık ikisi de tanım sırasını korur. Bu ikisini karıştıran ve aynı anda birden fazla kuralı sağlanabilen state'lerde kazanan değişebilir. **Aksiyon:** böyle state'lerde transition'ları istenen sırada tanımlayın ya da kazanması gerekene daha düşük bir `priority` verin. İkisini karıştırmayan flow'lar birebir eskisi gibi çalışır.
:::

:::note[Rollback]
Bu sürümden eski bir runtime `priority`'yi yok sayar ve dizi sırasıyla değerlendirir (yukarıdaki `triggerKind` istisnasıyla). `priority`'ye dayanan bir flow varken runtime'ı bu sürümün altına düşürmeyin.
:::

Çalışan örnek: [vnext-example `core/Workflows/auto-priority-lab/`](https://github.com/burgan-tech/vnext-example/tree/master/core/Workflows/auto-priority-lab). Pipeline içindeki yeri için bkz. [Transition Pipeline → Auto-Chain Yürütme](/docs/concepts/transition-pipeline#auto-chain-yürütme).

---

## StartTransition Yapısı

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `key` | string | **Evet** | Transition key'i |
| `target` | string | **Evet** | Hedef state. **Tanımlı bir state key'i** olmalıdır; `$self`, `$start` veya boş değer publish'te reddedilir |
| `triggerType` | integer | **Evet** | Sabit: `0` (yalnızca manual) |
| `versionStrategy` | string | **Evet** | `None`, `Patch`, `Minor`, `Major` |
| `labels` | array | **Evet** | Çoklu dil etiketleri |
| `schema` | object \| null | Hayır | Start request body validation schema'sı |
| `schemas` <sup>New</sup> v0.0.105 | array \| object \| null | Hayır | Kural tabanlı start payload şeması; `schema`'yı ezer. Kural bağlamında `body` instance'ın en son verisidir — start'ta henüz instance verisi olmadığından `{}` gelir; seçimi header'a (veya `context.Caller` ile role) göre yapın. Bkz. [Kural tabanlı schema seçimi](#kural-tabanlı-schema-seçimi-schemas) |
| `onExecutionTasks` | array | Hayır | Başlangıçta çalıştırılacak task'lar |
| `mapping` | object \| null | Hayır | Input mapping betiği |
| `roles` | array | Hayır | Instance başlatma yetkisi (`allOf` / `anyOf` kombinatörleri v0.0.99'dan itibaren desteklenir). <sup>New</sup> v0.0.105 itibarıyla anlamlıdır — aşağıdaki nota bakın |
| `executionType` | string | Hayır | `S` / `A` — start isteğinin çalıştırma modu (v0.0.99). Bkz. [Çalıştırma Modu](#çalıştırma-modu-executiontype) |
| `annotations` <sup>New</sup> | object \| null | Hayır | Client-side filtreleme ve UI bağlamı için key-value metadata (passthrough) |
| `resourceLock` <sup>New</sup> | object \| null | Hayır | Dağıtık kaynak kilidi. Ayrıntı: [Kaynak Kilitleme](/docs/how-to/resource-lock) |

:::info[`startTransition.roles` artık uygulanıyor]
<sup>New</sup> v0.0.105 Bu sürüme kadar `startTransition.roles` hiçbir yerde değerlendirilmiyordu. Artık gateway, `POST …/workflows/{workflow}/instances/start` isteğini iletmeden önce workflow-scoped `GET /api/v1/{domain}/workflows/{workflow}/functions/authorize?type=instance` fonksiyonunu çağırır ve bu fonksiyon kararı — henüz instance yokken — `startTransition.roles` üzerinden verir. Runtime `instances/start` sırasında rolleri **kendisi kontrol etmez**; karar diğer transition'larda olduğu gibi gateway'indir. Statik roller ve `$Everyone` her zamanki gibi karşılaştırılır; instance'a bağlı grant'ler (`$InstanceStarter`, `$PreviousUser`, `$user.` / `$role.` bağlam referansları vb.) start öncesinde **hiç eşleşmez** — yalnızca `allow $InstanceStarter` ile korunan bir start herkese kapalıdır. `roles` tanımsızsa start herkese açıktır. Route, `version` parametresi ve gateway kuralı için bkz. [Yetkilendirme](/docs/concepts/authorization).
:::

### Initial state olmadan başlangıç (`$start`)

v0.0.99'dan itibaren bir workflow **en fazla bir** Initial state (`stateType: 1`) tanımlayabilir; Initial state artık zorunlu değildir.

- **Initial state tanımlıysa** davranış öncekiyle aynıdır.
- **Initial state yoksa** instance runtime'ın ayrılmış, örtük **`$start`** state'inde doğar ve `startTransition.target` instance'ın nereye gireceğini belirler. `$start` hiçbir zaman `states` listesinde yer almaz; task'ı, view'ı ve transition'ı yoktur (tip olarak Initial sayılır). İlk transition kaydı `$start → step-1` şeklindedir.
- `currentState`, start transition commit edilene kadar (async start, subflow child oluşturma) geçici olarak **`$start`** olabilir — client'lar bu değeri tanımalıdır.
- Async start job'ı kalıcı olarak başarısız olursa instance `$start`'ta kalabilir. Böyle bir instance yalnızca **`availableIn` kısıtı olmayan** well-known transition'larla (`cancel` / `exit` / `updateData`) çıkabilir; `availableIn` `$start`'ı adlandıramaz.
- Daha önce geçişli (pass-through) bir Initial state'ten otomatik hop'ta çalışan işler `startTransition.onExecutionTasks`'e taşınabilir; ancak bu durumda instance oluşturulurken çalışırlar ve instance verisi yalnızca start payload'ıdır.

```json
"attributes": {
  "type": "F",
  "startTransition": {
    "key": "start",
    "target": "step-1",
    "triggerType": 0,
    "versionStrategy": "Minor",
    "labels": [{ "label": "Başlat", "language": "tr-TR" }]
  },
  "states": [
    { "key": "step-1", "stateType": 2, "versionStrategy": "Minor", "labels": [{ "label": "Adım 1", "language": "tr-TR" }], "transitions": [] }
  ]
}
```

Publish hataları:

| Durum | Mesaj |
|-------|-------|
| Birden fazla Initial state | `Workflow may contain at most one initial state. Found: N.` |
| `$start` key'li bir state tanımı | `State key '$start' is reserved by the runtime.` |
| `startTransition.target` boş | `StartTransition must declare a target state.` |
| `target` tanımlı bir state değil (`$self` / `$start` dahil) | `The 'target' value in StartTransition does not match any state 'X'.` |

Bu özellik vnext-schema `0.0.55` gerektirir.

### Davranış

Start transition **view tanımı alamaz** (tabloda `view` alanı bilinçli olarak yoktur); yalnızca `schema` (ya da <sup>New</sup> v0.0.105 kural tabanlı `schemas`) ile **başlangıç verisi** ve validation tanımlanabilir. Bu, instance'ın hangi veriyle başlatılacağını belirler.

- **Service-to-service (S2S) akışlar:** Start transition'da `schema` ile veri almak mantıklıdır; çağıran sistem başlangıç payload'ını doğrudan gönderir.
- **Client-base akışlar:** Instance genellikle **base bilgiyle** başlatılır; kullanıcı girdisi (gerekiyorsa) start'ta değil, **initial state view**'inde alınır. Çünkü client tarafı girdiyi view üzerinden toplar.

:::tip[Flow tasarım notu]
Girdi modelini bu ayrıma göre kurgulayın: S2S tetikleyiciler için start `schema`; kullanıcıdan girdi gereken client akışlarında ise minimal start payload'ı + initial state view. State vs transition view ayrımı için bkz. [Pseudo UI → Giriş](/docs/how-to/view-consept) ve [User Integration](/docs/concepts/user-integration).
:::

---

## Transition Yürütme Modeli: Lock ve Busy Check

<sup>New</sup> v0.0.79 ile transition yürütmesi **Busy-as-mutex** modeline geçmiştir: instance'ın `Busy` durumu, yürütme mutex'inin kendisidir. Bir transition kabul edilirken ilk adımda kısa süreli bir **status lock** (5 sn lease) + Postgres **compare-and-set** (`UPDATE … WHERE Status='A'`, v0.0.92) altında Active→Busy geçişi yapılır; pipeline ve otomatik transition zinciri sonrasında kilitsiz çalışır. Önceki uzun süreli dağıtık kilit (chain-token) transition yolundan tamamen kaldırılmıştır. Mekanik detay ve tüm pipeline adım sırası için bkz. **[Transition Pipeline](../concepts/transition-pipeline)**.

Her transition tipi bu modele farklı şekilde katılır ve **flow tasarımında bu davranış farkları belirleyicidir**:

| Transition tipi | Status lock | Busy check | Davranış |
|---|---|---|---|
| `stateTransition` / `sharedTransition` | Tutar | **Uygular** | Instance `Busy` ise istek **409** ile reddedilir; Active ise Busy'ye geçirilip pipeline çalıştırılır |
| `cancel` / `exit` | Tutar | **Muaf** | Busy 409'dan muaftır ama **accept anında** Busy'yi set eder (pipeline'da değil, v0.0.80) — iptal/çıkış akışını başlatır |
| `updateData` | **Tutmaz** | **Muaf** | **Lock yok, duplicate-job guard yok — hiçbir yolda** (v0.0.86). Status-neutral kabul edilir; Busy'yi ne set eder ne çözer; paralel istekler tümü kabul edilir |

<sup>New</sup> v0.0.100 Aktif SubFlow'u olan bir parent'ta iletilebilir transition'lar parent'ta değil **leaf'te** kabul edilir (lock, Busy ve job leaf'indir) — bkz. [Aktif SubFlow'a transition iletimi](#aktif-subflowa-transition-iletimi-proxy).

### updateData: Reserve Transition

`updateData` **reserve** bir transition'dır: tüm lock ve busy check'lerden muaf, **status-neutral** çalışır — Busy'yi asla set etmez ve asla çözmez, dolayısıyla instance'ı Busy'de bırakma riski yoktur. **Paralel isteklerin aynı instance üzerinde datayı güncellemesi ve instance'ı ilerletmesi için kullanılacak tek yöntemdir** — aynı senaryoda `stateTransition` basmak Busy çakışmasında 409 üretir. v0.0.86'dan itibaren bu, yalnızca lock'suz değil aynı zamanda **duplicate-job guard'sız**dır: N eşzamanlı `updateData` isteği aynı mantıksal job kimliğini paylaşsa da her biri kendi payload'ını taşıdığı için hepsi meşrudur ve dedupe uygulanmaz.

Davranış, instance'ın durumuna göre ikiye ayrılır:

- **Düz instance (aktif subflow yok):** Data güncellenir ve **normal transition gibi pipeline ilerler** — `$self` state change, `onExecutionTasks` ve pipeline sonunda (order 80) otomatik transition değerlendirmesi çalışır. Koşulu sağlanan bir auto, continuation boundary'de sahipliği devralarak instance'ı ilerletir (canlı bir sahip yoksa park edilmiş Busy devralınır).
- **Aktif subflow'da:** Instance'ta `updateData` tanımı varsa, istek **aktif subflow'da olsa bile parent olarak karşılanır ve subflow'a forward edilmez** — parent'ın datası güncellenir ve bırakılır; pipeline instance'ı ilerletmez, subflow kesintiye uğramaz.

Otomatik transition'lar **her** `updateData` sonrasında değerlendirilir; böylece "veri biriktir, eşik sağlanınca ilerle" (fan-in) desenleri updateData fırtınası altında güvenle çalışır.

:::info[$self ile updateData karıştırılmamalı <sup>New</sup> v0.0.80 (breaking)]
`updateData`'nın hedefi her zaman `$self`'tir, ama `$self` **yalnızca `updateData` için** state lifecycle'ını atlar (OnEntry/OnExit çalışmaz, scheduled job'lar yeniden armlanmaz). `target: $self` yazan **başka herhangi bir transition** — tipik olarak bir **shared transition** — trigger'ının temel profilini korur ve state'in **tam** lifecycle'ını çalıştırır: OnExit/OnEntry ateşlenir, state'in timer'ları iptal edilip yeniden armlanır. Önceden `$self` hedefli her transition lifecycle'ı atlıyordu; domain tanımlarında `"target": "$self"` için grep yapıp bu davranışa dayanan mantığı `onExecutionTasks`'e taşımak gerekebilir. Ayrıntı: [Transition Pipeline → `+Self` Bileşimi](../concepts/transition-pipeline).
:::

:::tip[Flow tasarım notları]
- Instance aktifken sürekli veri basan senaryolarda (telemetri, paralel servis sonuçları, arka plan görevleri) client'a `stateTransition` değil **`updateData`** verin.
- Paralel `updateData` altında mapping'ler **yalnızca delta** döndürmelidir: tam echo döndüren bir mapping, eşzamanlı yazarların daha taze değerlerini bayat kopyayla ezebilir.
- Kabul edilen her `updateData` iki data satırı üretir (istek payload'ı + task çıktısı). Data versiyonu, instance başına `FOR UPDATE` kilidi altında `MAX(VersionNo)+1` ile hesaplanır; her satır üretildiği anda kalıcılaştırılır.
- Aynı order'da aynı task'ı birden fazla kez çalıştırmak için (v0.0.99) her girişe ayrı bir `variableKey` verin; aksi halde yanıtlar aynı slot'a düşer ve tanım publish'te reddedilir — bkz. [Tasks → Çalıştırma Sırası](/docs/components/tasks/).
:::

> **Referans:** [vnext #877](https://github.com/burgan-tech/vnext/pull/877) — Busy-as-mutex locking, status-neutral updateData ve anlık InstanceData kalıcılığı.

---

## Özel Transition'lar

### Cancel Transition

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `key` | string | **Evet** | Cancel transition key'i |
| `target` | string | **Evet** | Hedef state (iptal state'i) |
| `triggerType` | integer | **Evet** | Sabit: `0` (yalnızca manual) |
| `versionStrategy` | string | **Evet** | Versiyon stratejisi |
| `labels` | array | **Evet** | Çoklu dil etiketleri |
| `availableIn` | (string \| object)[] | Hayır | Cancel'ın geçerli olduğu state'ler. Öğeler bare state key veya rol daraltmalı `{ state, roles }` objesi olabilir <sup>New</sup> — bkz. [availableIn ve rol daraltması](#availablein-ve-rol-daraltması) |
| `view`, `schema`, `schemas` <sup>New</sup> v0.0.105, `mapping`, `onExecutionTasks`, `roles` | — | Hayır | Standart transition alanları (`schemas` için bkz. [Kural tabanlı schema seçimi](#kural-tabanlı-schema-seçimi-schemas)) |
| `annotations` <sup>New</sup> | object \| null | Hayır | Client-side filtreleme ve UI bağlamı için key-value metadata (passthrough) |

Alt akışları varsa onlara da **cancel** bildirisi yayınlar. Alt akışlarda cancel tanımı **yoksa** bypass edilir.

### Exit Transition

Cancel ile aynı yapıda. **Client implementasyonlarında** ekran çıkışları veya ekrandan ayrılma durumlarında aktif instance'ları sonlandırır.

### Update Data Transition

Cancel ile aynı yapıda, tek fark: `target` her zaman `$self` olmalıdır. Instance datasını instance'ı kilitlemeden güncellemek — ve paralel senaryolarda instance'ı ilerletmek — için kullanılır. Yürütme semantiği (lock/busy muafiyeti, subflow'da parent'ta karşılanma, auto değerlendirmesi) için bkz. [Transition Yürütme Modeli](#transition-yürütme-modeli-lock-ve-busy-check).

:::info[Well-known transition'ların keşfi ve yetkisi <sup>New</sup>]
`cancel`, `updateData` ve `exit` artık State fonksiyonunun `availableTransitions` listesinde — trigger tipine ve `availableIn` kapsamına göre — **configured key**'leriyle listelenir ve `roles` tanımları diğer transition'lar gibi listeyi **filtreler** (önceden `updateData`/`exit` üzerindeki `roles` hiç değerlendirilmiyordu). Roller execution'da enforce edilmez; `roles` client'a *ne sunulacağını* belirler. Execution tarafında ise `availableIn` **state gate** olarak uygulanır: kapsam dışı bir state'ten gelen istek `Transition:100024` ile reddedilir (önceden her state'ten çağrılabiliyordu). Bkz. [Built-in Functions → Well-known transition'lar listede](/docs/components/functions/built-in#well-known-transitionlar-listede).
:::

### Shared Transitions

Birden fazla state'den erişilebilen **ortak transition**'lardır. Standart transition alanlarına ek olarak:

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `availableIn` | (string \| object)[] | Hayır | Transition'ın geçerli olduğu state'ler. Öğeler bare state key veya rol daraltmalı `{ state, roles }` objesi olabilir <sup>New</sup> (aşağıya bakın). Tanımlanmazsa **tüm state'lerden** erişilebilir |
| `executionType` | string | Hayır | `S` / `A` (v0.0.99) — bkz. [Çalıştırma Modu](#çalıştırma-modu-executiontype) |
| `annotations` <sup>New</sup> | object \| null | Hayır | Client-side filtreleme ve UI bağlamı için key-value metadata (passthrough) |
| `event` <sup>New</sup> | object \| null | **Koşullu** | Event tanımı. `triggerType: 3` ise **zorunlu** — bkz. [Event Transition](#event-transition) |
| `resourceLock` <sup>New</sup> | object \| null | Hayır | Dağıtık kaynak kilidi. Ayrıntı: [Kaynak Kilitleme](/docs/how-to/resource-lock) |

Shared transition'larda `triggerType` yalnızca `0` (Manual), `2` (Scheduled) veya `3` (Event) olabilir.

### availableIn ve rol daraltması

<sup>New</sup> `availableIn` dizisinin her öğesi iki formdan biri olabilir ve iki form **aynı dizide karışabilir**:

```json
"availableIn": [
  "review",
  {
    "state": "approval",
    "roles": [
      { "role": "backoffice.supervisor", "grant": "allow" }
    ]
  }
]
```

- **Bare string** — transition o state'te herkese (transition'ın kendi `roles` gate'i dahilinde) sunulur. Eski davranışla birebir aynıdır.
- **`{ state, roles }` objesi** — transition o state'te yalnızca `roles` daraltmasını da geçen çağıranlara sunulur.

Rol bileşimi **AND**'dir: `transition.roles` global gate'tir, eşleşen `availableIn` öğesinin `roles`'u onu o state için daraltır — **ikisi de izin vermelidir**. Her iki seviye de aynı grant değerlendirme çekirdeğinden geçer; DENY-wins ve allowlist/blacklist kuralları iki seviyede özdeştir (bkz. [Yetkilendirme → Grant Değerlendirme](/docs/concepts/authorization)). Rol'süz (`roles` boş/yok) öğe hiçbir daraltma uygulamaz.

Öğe `roles`'unda v0.0.99'dan itibaren `allOf` / `anyOf` kombinatörleri de kullanılabilir:

```json
"availableIn": [
  {
    "state": "approval",
    "roles": [
      { "allOf": [ { "role": "morph-idm.officer" }, { "role": "$user.branch" } ], "grant": "allow" }
    ]
  }
]
```

Doğrulama kuralları: `state` mevcut bir state key'i olmalıdır (`$start` adlandırılamaz), aynı state için **mükerrer öğe** reddedilir (ilk eşleşen kazandığı için mükerrer öğe sessizce ölü kalırdı), öğe içi rol grant'ları dynamic-role sözdizimi denetiminden geçer.

`availableIn`, shared transition'ların yanı sıra `cancel` / `exit` / `updateData` well-known transition'larında da aynı iki formu destekler ve execution'da **state gate** olarak uygulanır.

---

## Timeout Yapısı

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `key` | string | **Evet** | Timeout tanımlayıcısı |
| `target` | string | **Evet** | Timeout durumunda hedef state |
| `versionStrategy` | string | **Evet** | Versiyon stratejisi |
| `timer` | object | **Evet** | `reset` (string) + `duration` (ISO 8601, örn. `PT30M`) |
| `mapping` | object \| null | Hayır | Dinamik timeout hesaplama betiği. Başarısız olursa statik `timer.duration` kullanılır |
| `annotations` <sup>New</sup> v0.0.95 | object \| null | Hayır | Client UI bağlamı için key-value metadata; değerler string, namespace'li key önerilir (örn. `ui/countdown`). Platform yorumlamaz (passthrough). State Function yanıtındaki `timeout` bloğunda aynen yüzeye çıkar — bkz. [Built-in Functions → State Fonksiyonu](/docs/components/functions/built-in#state-fonksiyonu) |

```json
"timeout": {
  "key": "abandoned",
  "target": "cancelled",
  "versionStrategy": "None",
  "timer": { "reset": "N", "duration": "PT30M" },
  "annotations": { "ui/countdown": "visible" }
}
```

State Function yanıtında bu tanım, deadline bekliyorken şu şekilde görünür:

```json
"timeout": {
  "key": "abandoned",
  "executeAtUtc": "…Z",
  "target": { "key": "cancelled", "stateType": "finish", "stateSubType": "cancelled", "labels": [{ "label": "İptal", "language": "tr-TR" }] },
  "annotations": { "ui/countdown": "visible" }
}
```

:::warning[v0.0.99 — `timeout.target` artık obje]
State Function yanıtındaki `timeout.target` v0.0.99'da **string'den objeye** dönüştü (`{ key, stateType, stateSubType, labels, subFlow }`); hedef state key'ini `target.key` ile okuyun. Tanımdaki `timeout.target` (yukarıdaki tablo) string olarak kalır.
:::

:::info[Subflow override'ı bloğu bütün olarak değiştirir]
Parent'ın `subFlow.overrides.timeout` tanımı child'ın `timeout` bloğunu **annotations dahil bütün olarak** değiştirir; alanlar merge edilmez. <sup>New</sup> v0.0.95 öncesinde bu override hiç uygulanmıyordu — override ile başlatılan child instance'lar artık gerçekten timeout'a düşer. Ayrıntı: [SubFlow Overrides](../how-to/subflow-overrides).
:::

---

## Error Boundary Yapısı

Workflow (global), state ve task seviyesinde tanımlanabilir. Öncelik sırası: task > state > workflow.

### Error Boundary Alanları

| Alan | Tip | Açıklama |
|------|-----|----------|
| `onError` | array | Hata kuralları listesi. Priority sırasına göre (düşük değer = yüksek öncelik) değerlendirilir |
| `onTimeout` | object | Timeout hatası politikası |

### `onError` Kural Yapısı (errorHandlerRule)

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `action` | integer | **Evet** | Hata aksiyonu — aşağıdaki enum tablosuna bakın |
| `errorTypes` | string[] | Hayır | Eşlenecek exception tipleri. `*` veya boş = tümü |
| `errorCodes` | string[] | Hayır | Eşlenecek hata kodları (örn. `Task:400007`, `500`) |
| `transition` | string | **Koşullu** | Tetiklenecek transition key'i. `Rollback` ve `Notify` için **zorunlu**, `Abort` için **yasak** |
| `priority` | integer | Hayır | Kural önceliği (`minimum: 1`, varsayılan: `100`). Düşük değer = yüksek öncelik |
| `retryPolicy` | object | **Koşullu** | Retry konfigürasyonu. `action: 1` (Retry) ise **zorunlu** |
| `logOnly` | boolean | Hayır | `true` ise yalnızca log yazar, akışı etkilemez. Varsayılan: `false` |

### `errorAction` Enum Değerleri

| Değer | Ad | Açıklama | Kısıtlar |
|-------|----|----------|----------|
| `0` | **Abort** | İşlemi durdur | `transition` belirtilmemeli |
| `1` | **Retry** | Yeniden dene | `retryPolicy` zorunlu |
| `2` | **Rollback** | Telafi state'ine dön | `transition` zorunlu |
| `3` | **Ignore** | Hatayı yoksay, devam et | — |
| `4` | **Notify** | Bildirim gönder ve transition yap | `transition` zorunlu |
| `5` | **Log** | Yalnızca logla, akışı etkilemez | — |

### Retry Policy

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `maxRetries` | integer | Hayır | `3` | Maksimum yeniden deneme sayısı |
| `initialDelay` | string | **Evet** | — | İlk deneme öncesi bekleme süresi (ISO 8601, örn. `PT5S`) |
| `backoffType` | integer | Hayır | `1` | `0` = Fixed, `1` = Exponential |
| `backoffMultiplier` | number | Hayır | `2.0` | Exponential backoff çarpanı (`minimum: 1`) |
| `maxDelay` | string | Hayır | — | Denemeler arası maksimum bekleme süresi (ISO 8601) |
| `useJitter` | boolean | Hayır | `true` | Deneme gecikmesine rastgele jitter eklenip eklenmeyeceği |

---

## History Modu

<sup>New</sup> v0.0.100 Çok sık çalışan ve sonradan bakılmayan bir akış (sorgu, introspection, teklif hesaplama) uzun ömürlü bir iş süreciyle aynı depolama maliyetini ödüyordu: her ekleme için bir `InstancesData` satırı, her transition için bir `InstanceTransitions` satırı ve `InstanceTasks` journal satırları. `attributes.history: "none"` böyle bir akışı **tek seferlik** (one-shot) olarak işaretler: akış yine bir state machine'dir (state'ler, transition'lar, correlation, sorgulanabilir instance), ama transition/task geçmişi yazmaz ve tek bir data satırı bırakır.

```json
{
  "key": "payments-quote",
  "attributes": {
    "type": "F",
    "history": "none",
    "states": []
  }
}
```

| Değer | Anlamı |
|-------|--------|
| `full` | Varsayılan (alan yoksa da). Tam geçmiş yazılır |
| `none` | Tek seferlik akış: transition ve task geçmişi yazılmaz, veri tek satır olarak flush edilir |

`history`, `attributes` kökünde (`type` ve `executionType` ile aynı seviyede) durur, **`config` altında değil**. Bilinmeyen bir değer publish hatasıdır. Daha eski runtime veya şema alanı **sessizce yok sayar** — şema paketini (`@burgan-tech/vnext-schema` 0.0.56) ve runtime'ı birlikte yükseltin. **Geri alma:** alanı silmek yeterlidir; migration gerekmez.

### Ne saklanır, ne zaman yazılır

- **`InstanceTransitions` ve `InstanceTasks` hiç yazılmaz.** Transition kaydı yalnızca bellekte tutulur (betikler `CurrentTransition`'ı yine okur).
- **`InstancesData` bellekte biriktirilir** ve tek satır olarak şu noktalarda yazılır (flush):

| Flush noktası | Not |
|---------------|-----|
| Finish | Tamamlanma, flush ile **aynı transaction**'da kaydedilir — Completed asla verisi olmadan commit edilmez |
| SubFlow devri | Correlation ile birlikte, child başlatılmadan önce yazılır (child'ın input mapping'i, output mapping ve devam okuması parent'ı veritabanından okur) |
| Pipeline içi fault | En iyi gayretle (best effort), kendi unit of work'ünde; yazma başarısızsa loglanır ve fault devam eder |

- **Satır sayısı:** SubFlow'suz bir instance için **1**; N SubFlow state'inden geçen bir instance için en fazla **1 + 2·N** (devir yazımı + SubFlow output mapping eklemesi).
- Instance satırı, incident'lar, job'lar ve correlation'lar her akışta olduğu gibi yazılır.
- Finish olmayan bir state'te duran bir aşama **fault** sayılır: instance `Instance:100046` (`HistoryNoneNotTerminal`) incident'ı ile fault edilir ve tamponu yazılır.

### Publish kısıtları

`history: "none"` olan akış başlamalı, yalnızca otomatik transition'larla ilerlemeli ve her zaman bitmelidir. Aşağıdaki kurallar **hata** olarak (uyarı değil) reddedilir ve yalnızca akışın **kendi** tanımına uygulanır:

| Kural | vnext-schema'da da |
|-------|--------------------|
| En az bir Finish state | Evet |
| Tüm state transition'ları otomatik (`triggerType: 1`) | Evet |
| SubFlow state'leri dahil Finish olmayan her state'in en az bir transition'ı var | Evet |
| `sharedTransitions`, `cancel`, `exit`, `updateData` yok | Evet |
| Workflow `timeout` yok, `subFlow.overrides.timeout` yok | Evet |
| `interaction.longPoll` yok, Wizard state yok, Suspended / Busy / Human subtype yok | Evet |
| Her state bir Finish state'e ulaşabiliyor (döngü, yalnızca `$self` döngüsü, çıkmaz yok) | **Hayır — yalnızca runtime** |

**İzin verilenler:** manuel `startTransition`, workflow seviyesi `event` ile başlatma, SubFlow state'leri ve SubProcess task'ları.

### SubFlow kuralı

- `none` bir parent'ın **SubFlow (`S`)** child'ı da `none` olmalıdır. Child, tanımını yükledikten hemen sonra ve **hiçbir şey yazmadan** bunu denetler; değilse `Instance:100044` (`HistoryNoneSubFlowChildNotEligible`, `400`) ile reddeder ve parent bir incident ile **fault** olur. Kural domain'ler arası da geçerlidir.
- **SubProcess (`P`)** child'ları muaftır.
- `full` bir parent altında `none` bir child sorunsuzdur.
- Publish yalnızca akışın kendi tanımını doğrular; SubFlow child'ları başlarken denetlenir.

### HTTP davranışı

| Endpoint | `none` instance için |
|----------|----------------------|
| `POST …/instances/{instance}/retry` | `409` `Instance:100045` (`HistoryNoneRetryNotSupported`) |
| `GET …/instances/{instance}/transitions` | `200`, boş liste |
| `GET …/functions/tasks` | `200`, boş liste |
| `GET …/functions/actions?taskId=` | `200`, boş liste (`404` değil) |
| Transition / state metrikleri | Boş |

Instance **çalışırken data satırı yoktur**: instance / data / state okumaları `null` veri döner ve attribute filtreleri instance'ı bulmaz.

### Hata kodları

| Kod | Ad | HTTP | Ne zaman |
|-----|----|------|----------|
| `Instance:100044` | `HistoryNoneSubFlowChildNotEligible` | 400 | `none` parent'ın SubFlow child'ı `none` değil |
| `Instance:100045` | `HistoryNoneRetryNotSupported` | 409 | `none` instance'ta retry |
| `Instance:100046` | `HistoryNoneNotTerminal` | — (incident) | Aşama Finish olmayan bir state'te durdu; instance fault edilir |

### Kabul edilen kısıtlar

- Commit sonrası fault'lar, job timeout'ları ve process çökmeleri bellekteki veri gittikten sonra yeni bir kapsamda işlenir: instance incident ile fault olur ama **son flush'tan sonraki veri kaybolur**.
- **Retry yoktur** (`409`): retry'ın dayandığı açık transition kaydı ve task journal yazılmaz.
- `$PreviousUser` / `$PreviousBehalfOfUser` grant'leri hiç çözülmez (transition geçmişi yok).
- `x-encryption` alanları **flush anında** şifrelenir; çalışma sırasında betikler yeni yazılan değerleri düz metin görür ve `DecryptAsync` bunlar için `null` döner.

---

## Diğer Yapılar

### Config (Built-in Function Cache)

`attributes.config`, flow seviyesi yazar-kontrollü ayarları tek bir obje altında toplar. Şu an tek üyesi, built-in **instance function**'larının (`data`, `view`, `schema`, …) cache süresini ayarlayan `functionCache`'dir.

```json
"config": {
  "functionCache": {
    "ttlSeconds": 120
  }
}
```

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `functionCache.ttlSeconds` | integer | Hayır | Host varsayılanı (**60 sn**) | Bu workflow'un built-in function yanıtları için cache TTL'i (saniye). `null` veya pozitif olmayan değer host varsayılanına düşer (`InstanceFunctionCache:DefaultTtlSeconds`) |

Çalışma modeli:

- Built-in function isteği cache'lenir; **aynı instance** için tekrarlanan istekler TTL boyunca cache'ten döner.
- **Instance değiştiğinde cache düşer** ve yeni istek yeniden cache'lenir.
- **State Function bu kapsamın dışındadır** — State Function cache'ini **platform kendisi yönetir** (host tarafındaki `StateFunctionCache` ayarları); `config.functionCache` onu etkilemez.

Host seviyesi cache katmanları (component cache, state function cache, secret cache vb.) ve varsayılan değerleri için bkz. [Cache Yapılandırması](/docs/configuration/caching).

### Resource Lock

Transition tanımına eklenen `resourceLock` bloğu, paylaşılan bir kaynağı (koltuk, günlük limit, hesap vb.) birden fazla instance'ın aynı anda değiştirmesini engelleyen **dağıtık kilit** mekanizmasıdır (varsayılan Dapr `lock.redis`; v0.0.106 ile isteğe bağlı Postgres lease sağlayıcısı). `start`, state-level ve `sharedTransitions` transition'larında geçerlidir ve yalnızca **Manual** profilde çalışır. Önerilen model, kilidi giriş transition'ında `Acquire` ile almak ve bırakmayı runtime'a devretmektir (instance terminal olduğunda otomatik release). Tam davranış modeli, `keyExpression` yazımı, conflict/409 ve örnekler için bkz. **[Kaynak Kilitleme (Resource Lock)](/docs/how-to/resource-lock)**.

<sup>New</sup> v0.0.106 `onConflict` iki değer alır: `Abort` (varsayılan — instance fault olur, `409 Execution:200010`) ve `Reject` (schema 0.0.61 — instance dokunulmadan kalır, `409 Execution:200014`, aynı çağrı tekrarlanabilir). `Abort` ile birlikte `Execution:200010` için bir `errorBoundary` kuralı tanımlanırsa kaybeden instance fault edilmeden kuralın `transition`'ına yönlendirilir. `Acquire`/`Extend` için `ttlSeconds` > 0 publish'te zorunludur.

### MasterSchema

`attributes.schema` alanı, workflow'un **instance data** ana yapısını belirler. Gelişmiş filtreleme ve instance data'nın her değişim noktasında **tutarlılık kontrolü** sağlar.

:::caution
Instance data her state'de merge ile genişlediğinden master schema'da **`required` kullanılmamalı** ve **`additionalProperties: true`** olmalıdır. Alan görünürlüğü (`x-roles`), filtrelenebilirlik/sıralanabilirlik (`x-filterOperators` / `x-sortable`) gibi davranışlar da master şemada tanımlanır. Davranış kuralları, filtering ve view kullanımı için bkz. [Schema → Master Schema Davranışı](/docs/components/schema#master-schema-davranışı).
:::

### Functions ve Extensions

`attributes.functions` ve `attributes.extensions` alanları, workflow'a bağlı function ve extension **reference** listelerini içerir. Her öğe standart `reference` yapısındadır.

### Scripts (Helpers & Allowed Assemblies)

`attributes.scripts`, flow boyunca geçerli olacak **helper** referanslarını ve **izinli assembly**'leri tanımlar. Tek tek mapping objelerine `scripts` eklemek yerine, tüm flow'da kullanılacak bir helper/assembly burada bir kez bildirilir.

```json
"scripts": {
  "helpers": [
    { "key": "rsa-crypto", "version": "1.0.0", "domain": "core", "flow": "sys-mappings" }
  ],
  "allowedAssemblies": ["System.Security.Cryptography"]
}
```

| Alan | Tip | Açıklama |
|------|-----|----------|
| `helpers` | array | [sys-mappings](/docs/components/mapping-component) bileşenlerine referans (`key`, `version`, `domain`, `flow: "sys-mappings"`) |
| `allowedAssemblies` | string[] | Script bağlamı için izinli .NET assembly'leri (sandbox allow-list'e eklenir) |

Aynı `scripts` yapısı her mapping objesinde (transition `mapping`, `rule`, `timer`, subflow `mapping`, task `onExecutionTasks[].mapping` vb.) de tanımlanabilir.

:::warning[Publish kontrolü (v0.0.99)]
`scripts.allowedAssemblies` (flow seviyesinde veya herhangi bir script slot'unda) bildiren her workflow publish'te denetlenir: her **basit assembly adı** ya bir framework (TPA) assembly'si olarak ya da `Scripting:Sandbox:PluginDirectory` içindeki bir DLL olarak çözülmelidir. Çözülemezse publish `400` döner:

```
Assembly '{name}' declared in '{member}' is not available in this runtime (neither a framework assembly nor in the plugin directory). Use the simple assembly name without extension, or have the assembly mounted by the platform team.
```

`member` hatanın yerini gösterir (ör. `sys-flows.states[0].onEntries[1].mapping.scripts.allowedAssemblies[0]`). Kontrol `Scripting:Sandbox:Enabled=false` olsa bile çalışır — önceden zararsız olan eski/yanlış adlar bir sonraki publish'te `400` üretir. Script derlenmez, helper/REF çözülmez; bildirilmemiş bir assembly ihtiyacı hâlâ çalışma anında hata verir. Ayrıntı: [Scripting / Sandbox](/docs/configuration/scripting).
::: Helper bileşenleri, `REF` encoding ve sandbox ayrıntıları için bkz. [Mapping Bileşeni](/docs/components/mapping-component) ve [Scripting / Sandbox](/docs/configuration/scripting).

### Mapping `encoding` ve `REF`

Tüm mapping/scriptCode objelerinde `encoding` değeri `B64`, `NAT` veya **`REF`** olabilir. `REF` ile `code`, gömülü string yerine bir sys-mappings bileşenine referans objesidir:

```json
"mapping": {
  "encoding": "REF",
  "code": { "key": "initial-mapping", "version": "1.0.0", "flow": "sys-mappings", "domain": "core" }
}
```

Ayrıntı için bkz. [Mapping Bileşeni → REF Encoding](/docs/components/mapping-component#ref-encoding-ile-referans-kullanımı).

### Output Mapping

`attributes.output`, workflow için opsiyonel bir **output mapping** tanımıdır — **sync yanıtları** şekillendirir (standart `scriptCode` yapısı, `IOutputHandler` implementasyonu). Instance **`sync=true`** ile başlatıldığında veya transition edildiğinde, output script'in ürettiği sonuç standart `StartInstanceOutput` / `TransitionOutput` zarfı yerine **doğrudan HTTP yanıt gövdesi** olarak döner — script'in belirlediği `statusCode` ve `headers` değerleri ile birlikte. Bu, [Function](/docs/components/functions/custom) endpoint'lerindeki `output` davranışının workflow'a taşınmış halidir; flow kendi API sözleşmesini şekillendirebilir.

```json
"attributes": {
  "type": "F",
  "output": {
    "type": "L",
    "code": "<base64-encoded IOutputHandler script>",
    "encoding": "B64"
  }
}
```

**Davranış kuralları:**

- Sadece **`sync=true`** isteklerde devreye girer; `sync=false` yanıtı (`{ id, status }`) değişmez.
- Doğrudan yanıt, output script **gerçekten çalıştığında** uygulanır — script bilinçli olarak boş gövde de dönebilir (kendi status code / header'ları ile).
- **Subflow instance'ları hariçtir**: `/sub/instances/start` ve subflow transition'ları standart modeli korur (parent/child correlation bu modele dayanır).
- Output script hata alırsa platform hatayı loglar ve **standart yanıta geri döner** — output mapping isteği asla bozmaz.

Bkz. [Async / Sync Yöntemi](/docs/how-to/async-sync) ve mapping yapısı için [Mapping Bileşeni](/docs/components/mapping-component).

### Query Roles

`attributes.queryRoles` yetkilendirme mekanizmasıdır. Workflow ve instance içindeki state'leri **kimlerin sorgulayabileceği** bilgisini tutar. `queryRoles` iki seviyede tanımlanabilir: **flow (root)** seviyesinde ve her **state** seviyesinde.

**Öncelik:** Değerlendirmede önce instance'ın **mevcut (current) state**'inin `queryRoles` tanımı baz alınır. State'de tanım **yoksa** flow seviyesindeki `queryRoles` kullanılır. Yani state tanımı, varsa flow (root) tanımını override eder; yoksa flow tanımına geri düşülür.

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `role` | string | **Koşullu** | Rol adı. `role`, `allOf`, `anyOf`'tan **tam olarak biri** verilir |
| `allOf` / `anyOf` | array | **Koşullu** | v0.0.99: kombinatör. Çocuklar yalnızca `{ "role": "..." }` (tek seviye, `grant` yok, iç içe yok) |
| `grant` | string | **Evet** | `allow` veya `deny`. DENY her zaman ALLOW'u geçersiz kılar |

```json
"queryRoles": [
  { "allOf": [ { "role": "morph-idm.officer" }, { "role": "$user.branch" } ], "grant": "allow" },
  { "anyOf": [ { "role": "morph-idm.auditor" }, { "role": "morph-idm.risk" } ], "grant": "deny" }
]
```

Kombinatörlerin üç değerli değerlendirmesi için bkz. [Yetkilendirme → Kombinatörler](/docs/concepts/authorization#kombinatörler-allof--anyof). İlk kombinatörü ancak tüm pod'lar — ve bu domain'e override damgalayan tüm domain'ler — v0.0.99 çalıştırdıktan sonra yayınlayın.

**Etki alanı:** `queryRoles`, instance'ın **mevcut (current) state**'i üzerinde değerlendirilir ve built-in read yüzeylerinin (**state**, **data**, **view**, **schema**, **master**, **tasks**, **actions**, **incidents**) tamamı için tek bir "bu instance okunabilir mi?" cevabı verir. State seviyesi tanımı flow (root) seviyesini override eder.

<sup>New</sup> v0.0.95 **In-process gate kaldırıldı.** Read fonksiyonları `queryRoles`'u artık kendi içlerinde **denetlemez** ve `403` üretmez. Karar tek bir yerde verilir: Internal Gateway, isteği iletmeden önce [`authorize?queryRoles=true`](/docs/components/functions/built-in#instance-authorize) fonksiyonunu çağırır ve cevabına göre isteği kabul veya reddeder. v0.0.95–v0.0.98 arasında bu fonksiyon `queryRoles`'u aktif subflow zincirinin **her hop'u için** değerlendirip sonuçları AND'liyordu. **v0.0.99'dan itibaren karar yalnızca en derin aktif SubFlow yaprağında** verilir: parent'ın damgaladığı `subFlow.overrides.states.<s>.queryRoles` ?? yaprak state'in `queryRoles`'u ?? yaprak workflow'un `queryRoles`'u. Root/ara seviye AND'i kaldırıldığından, root'un `queryRoles` tanımladığı ama yaprağın tanımlamadığı akışlarda erişim **gevşer** — gerekirse `subFlow.overrides.states.<state>.queryRoles` veya yaprakta `queryRoles` ekleyin. Parent'a ait transition'lar ve `?ack=true` değişmedi. Önünde bu gateway olmayan bir runtime bu okumaları **reddetmez** — `queryRoles` tek başına bu process'in savunduğu bir sınır değildir. Rol *çözümü* (transition filtreleme, `x-roles`, human-task listesi) değişmemiştir. Ayrıntı için bkz. [Built-in Functions → Read fonksiyonlarında queryRoles authorize](/docs/components/functions/built-in#read-fonksiyonlarında-queryroles-authorize) ve [Yetkilendirme → Nerede Değerlendirilir?](/docs/concepts/authorization#nerede-değerlendirilir).

## İlgili

- [Mappings](/docs/components/mappings) — mapping türleri ve örnekler
- [Mapping Bileşeni](/docs/components/mapping-component) — sys-mappings helper'ları, `scripts`, `REF`
- [Scripting / Sandbox](/docs/configuration/scripting) — flow `scripts.allowedAssemblies` ve sandbox
- [Schema](/docs/components/schema) — schema tanımları
- [ITransitionMapping](/docs/components/interfaces#itransitionmapping) — transition mapping interface
- [Schema component](/docs/components/schema) — master schema
- [Tasks](/docs/components/tasks/) — task türleri
- Schema kaynağı: [vnext-schema (GitHub)](https://github.com/burgan-tech/vnext-schema)
