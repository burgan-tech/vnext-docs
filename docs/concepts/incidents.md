---
sidebar_position: 5
title: Instance Incidents
description: Error boundary hatalarının InstanceIncidents tablosunda kalıcı geçmişi, incident link bloğu ve retry semantiği
---

# Instance Incidents

<sup>New</sup> v0.0.92 ile birlikte, bir workflow instance'ını **neden** Faulted duruma düştüğünü veya bir error boundary'nin ne yaptığını açıklayan yapılandırılmış bir hata kaydı sistemi geldi: **incident**. Bir incident, bir [error boundary](/docs/how-to/error-handling) sonucunda veya pipeline seviyesinde oluşan bir hatanın kalıcı kaydıdır — kim, ne zaman, hangi state/transition/task'ta, hangi boundary aksiyonuyla sonuçlandığı bilgisiyle birlikte.

## Depolama: InstanceIncidents tablosu

Incident'lar kendi tablosunda tutulur: **`InstanceIncidents`**, instance başına **sınırsız geçmiş** (her hata için bir satır), instance silindiğinde cascade-delete edilir. Instance'ın kendisinde de denormalize edilmiş bir bayrak vardır: **`Instances.HasActiveIncident`** — açık (çözülmemiş) bir incident olup olmadığını söyler ve pipeline bu bayrağı okuyarak karar verir; incident satırlarının kendisi yalnızca bayrak `true` olduğunda materialize edilir.

:::info Geçmiş model
Daha önce incident'lar `Instances.Incidents` adlı bir jsonb kolonunda, en yeni beşle sınırlı olarak tutuluyordu. Bu kolon veritabanında **donmuş (unmapped)** halde kalır; sonraki bir sürümde kaldırılacaktır. `MoveInstanceIncidentsToTable` ve `BackfillInstanceIncidents` migration'ları eski verileri yeni tabloya taşımıştır.
:::

## Link bloğu: `incident`

İstemcinin bir incident'ı okuması için üç yüzey **aynı** `incident` bloğunu, byte-for-byte, döner:

- State fonksiyonunun (long-poll) response body'si
- `GET …/instances/{instance}` yanıtındaki `metadata.incident`
- Instance listesindeki her öğenin `metadata.incident`'ı

```jsonc
"incident": {
  "hasActiveIncident": true,
  "active":  { "href": "/api/v1/core/workflows/onboarding/instances/{id}/incidents/active" },
  "history": { "href": "/api/v1/core/workflows/onboarding/instances/{id}/incidents" }
}
```

| Alan | Tip | Açıklama |
|------|-----|----------|
| `hasActiveIncident` | `boolean` | Instance'ın denormalize edilmiş bayrağı |
| `active` | `object` | **Yalnızca** `hasActiveIncident: true` iken bulunur |
| `active.href` | `string` | `GET …/incidents/active` endpoint'i |
| `history` | `object` | Her zaman bulunur |
| `history.href` | `string` | `GET …/incidents` endpoint'i |

Blok **içerik değil, link** taşır: incident'ın kendisi (mesaj, hata kodu, vb.) bu yanıtlarda yer almaz — istemci `active.href` veya `history.href`'i ayrıca çağırmalıdır. Bunun nedeni: içerik gömmek state fonksiyonunu ve instance GET'i runtime'ın en sık çağrılan yollarında incident tablosunu okumaya zorluyor, history endpoint'inin zaten döndürdüğünü tekrarlıyor ve gerçek bir bayatlık deliği bırakıyordu — parklanmış tek bir state içinde incident A çözülüp incident B açıldığında hiçbir fingerprint üyesi değişmiyordu, bu yüzden `If-None-Match` ile doğrulayan bir client `304` almaya devam edip A'yı göstermeye devam ediyordu. Yalnız bayrak ve iki statik link ile bu delik ortadan kalkar: client her zaman `active.href`'i yeniden çağırır.

**Aktif subflow durumu:** instance aktif bir subflow'a delege ediyorsa, `active.href` incident'ın **sahibi olan subflow'u** gösterir; `history.href` her zaman **sorgulanan instance'ı** gösterir — çünkü bu link "sorduğum şeyde ne ters gitti" sorusuna cevap verir.

`hasActiveIncident` [state fingerprint ETag](/docs/components/functions/built-in#state-fonksiyonu)'ın bir üyesidir (`InstanceStateFingerprint.HasActiveIncident`): bir incident'ın state/status değişmeden açılması veya kapanması bile parklanmış bir long-poll client'ın `304`'ünü kırar. Response shape versiyonu **v9**.

Her iki incident yüzeyi de state fonksiyonunun `queryRoles` kapısından geçer; hiçbirinde **stack trace** dönmez (operatörler bunları loglardan/APM'den okur).

## `GET …/instances/{instance}/incidents/active`

`incident.active.href`'in hedefi. En yeni **çözülmemiş** incident'ı döner.

- **`404` (`Instance:100037`) normal bir sonuçtur, hata değildir.** Bayrak `true` iken link reklamı yapılır, ancak bir retry incident'ı arada çözmüş olabilir — client bu 404'ü "state'i yeniden oku" olarak ele almalı, hata olarak değil.
- Rol kapısını geçemeyen çağıran **`403`** alır — böylece "incident yok" ile "bilme yetkin yok" ayrımı korunur.

## `GET …/instances/{instance}/incidents`

`incident.history.href`'in hedefi. Tam geçmişi **en yeniden eskiye** sayfalar:

```jsonc
{
  "hasActiveIncident": true,
  "items": [ /* IncidentDetail[] */ ],
  "page": 1,
  "pageSize": 20,
  "hasNext": false
}
```

`page` varsayılanı `1`, `pageSize` varsayılanı `20` ve **`≤100`** ile sınırlanır. Aynı `queryRoles` kapısından geçer; stack trace dönmez.

### Incident alanları

Aşağıdaki tablo `IncidentDetailDto`'nun (API yanıtı) alanlarını gösterir — kaynak: `vnext/src/BBT.Workflow.Domain/Instances/InstanceIncident.cs` ve `GetInstanceOutput.cs`.

| Alan | Tip | Açıklama |
|------|-----|----------|
| `id` | `string` (uuid) | Incident tanımlayıcısı |
| `createdAt` | `string` (ISO 8601 UTC) | Hatanın oluştuğu an |
| `state` | `string` | Hatanın oluştuğu state |
| `transition` | `string` | Hata sırasında yürütülmekte olan transition |
| `task` | `string \| null` | Hata veren task key'i; pipeline seviyesi hatalarda `null` |
| `message` | `string` | İnsan-okunur hata mesajı |
| `errorCode` | `string \| null` | Normalize edilmiş hata kodu (örn. `Task:Http:503`) |
| `errorLayer` | `string \| null` | Hata katmanı: `Transport` / `Task` / `Pipeline` |
| `statusCode` | `integer \| null` | HTTP durum kodu (varsa) |
| `boundaryAction` | `string \| null` | Eşleşen error boundary aksiyonu (`Abort`, `Retry`, `Rollback`, `Notify`, `Log`, `Ignore`); hiçbir kural eşleşmediyse `null` |
| `boundaryLevel` | `string \| null` | Eşleşen boundary seviyesi: `Task` / `State` / `Global` |
| `traceId` | `string \| null` | Dağıtık trace ile ilişkilendirme için OpenTelemetry trace id |
| `isResolved` | `boolean` | Incident çözüldü mü |
| `resolvedAt` | `string \| null` (ISO 8601 UTC) | Çözülme anı; çözülmediyse `null` |
| `retryCount` | `integer` | **Her zaman `0`** döner — bkz. [Bilinen sınır: retryCount](#bilinen-sınır-retrycount) |

:::note Doğrulama notu
Brief'te `taskKey` olarak geçen alan, kaynak koddaki gerçek adıyla **`task`**'tır; tablo kaynağa göre düzeltilmiştir. `stackTrace` alanı entity'de (persistence) var olsa da API'ye dönen `IncidentDetailDto`'da **hiç yer almaz** — hiçbir client yüzeyi stack trace döndürmez.
:::

## Tek incident kuralı

Bir failure — abort veya eşleşen kuralı olmayan unhandled bir task hatası — **tek bir** incident satırı bırakır ve bu satır boundary'nin kendi verdict'idir: bir kural eşleştiyse `boundaryAction` doludur, eşleşmediyse `null` kalır.

v0.0.89 öncesinde aynı failure **iki** incident yazıyordu: boundary'nin verdict'i artı ayrı bir pipeline-seviyesi satır (`errorCode: "ErrorBoundaryAbort"`, `errorLayer: "Pipeline"`, task ataması yok). Bu ikinci satır daha yeni olduğu için `incident.active` (ve state body'sinin `incident.active`'i) haline geliyor, gerçek verdict'i gizliyordu. Bu artık **yazılmıyor**: üç task adımı (OnExecute/OnEntry/OnExit) incident'ı **kendi save'inden önce** kaydeder, böylece satır ve `HasActiveIncident` bayrağı birlikte commit edilir ve pipeline'ın fault path'i fallback satırını atlar.

Bir `rollback`/`notify` sonucunda, instance **Busy** iken kısa bir `hasActiveIncident=true` penceresi gözlemlenebilir — satır transition'a yönlendirilip `FinalizeTransitionStep`'te kapanana kadar. Nihai commit edilen durum değişmez; bu kabul edilmiş bir yan etkidir.

## Retry semantiği

`POST …/instances/{instance}/retry` yalnızca **Faulted** bir instance'ı kabul eder; aksi halde `400` (`Instance:100027`).

- Yeniden yürütülen iş **tekrar fault** olursa yanıt `200` ile `"status": "F"` döner ve bu durum **kalıcıdır**: instance Faulted kalır ve **ikinci bir retry kabul edilir**. (v0.0.89 öncesinde ambient unit-of-work commit'i, iç `RequiresNew` scope'un yazdığı Faulted durumun üzerine yazıyordu; instance sağlıklı görünüyor ama bitmemiş ve bir daha retry edilemez hale geliyordu.)
- Unfault (başarılı retry) **tüm açık incident'ları kapatır**, tek en yenisini değil, ve `hasActiveIncident` bayrağını yeniden hesaplar. Geçmiş satırlar kalır, yalnız çözülmüş olarak işaretlenir; böylece `incident.active` bloktan kaybolurken `history` yanıt vermeye devam eder.
- `ignore` / `log` aksiyonları hiç incident yazmaz.

### Bilinen sınır: retryCount

`retryCount` alanı **her zaman `0`** döner. Alan, boundary'nin çözülmüş retry policy'sinden doldurulacak şekilde tasarlanmıştır, ancak execution engine bunu action result'a eklemez. Deneme sayısına ihtiyacınız varsa, task'ınızın kendi mapping'inden instance data'ya yazın.

## Script tarafı: `context.Incident`

Mapping script'leri incident bilgisine `context.Incident` (`ScriptIncidentInfo`) üzerinden erişir:

| Alan | Açıklama |
|------|----------|
| `HasActiveIncident` | Çözülmemiş bir incident var mı |
| `ActiveIncident` | En yeni çözülmemiş incident (varsa) |
| `TotalIncidentCount` | Instance üzerinde **materialize edilmiş** incident sayısı — tam kalıcı geçmiş **değil**; çözülmemişler artı mevcut transition'da kaydedilenler |
| `IncidentsLoaded` | Incident'ların bu script bağlamı için gerçekten yüklenip yüklenmediği |

## Migration'lar ve DbMigrator

Geçiş iki migration ile yapıldı: **`MoveInstanceIncidentsToTable`** (yeni tablo + kolon oluşturur) ve **`BackfillInstanceIncidents`** (eski jsonb verisini idempotent şekilde yeni tabloya kopyalar). Büyük tablolarda migration süresi uzayabileceği için DbMigrator artık `SchemaMigration:{CommandTimeoutSeconds=600, LockExpirySeconds=900}` ayarlarını onurlandırır ve herhangi bir şema migration'ı başarısız olursa **non-zero exit code** ile döner.

## İlgili

- [Error Boundary](/docs/how-to/error-handling) — hata çözümleme hiyerarşisi ve retry policy
- [Built-in Functions](/docs/components/functions/built-in) — State fonksiyonu ve `incident` bloğu
- [REST API](/docs/api-reference/rest-api) — `GET …/incidents` ve `GET …/incidents/active` endpoint referansı
