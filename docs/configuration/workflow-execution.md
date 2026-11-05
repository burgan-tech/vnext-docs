---
sidebar_position: 5
title: Workflow Execution
description: Transition job timeout, fan-out eşzamanlılığı ve InstanceData yazım budget'ı yapılandırması
---

# Workflow Execution Yapılandırması

Orchestration host'unun transition job'larını, fan-out eşzamanlılığını ve InstanceData yazım yolunu kontrol eden ayarlar `WorkflowExecution` ve `Workflow:FanOut` bölümlerinde toplanır; SubFlow'dan parent'a taşınan başlıklar `Workflow:SubFlow:CarriedHeaders` bölümündedir.

## Fan-Out Eşzamanlılığı

```json
{
  "Workflow": {
    "FanOut": {
      "MaxConcurrentItems": 64
    }
  }
}
```

| Anahtar | Tip | Varsayılan | Açıklama |
|---------|-----|------------|----------|
| `MaxConcurrentItems` | integer | `64` | FanOut task'ının aynı anda işleyeceği maksimum öğe sayısı |

## WorkflowExecution

```json
{
  "WorkflowExecution": {
    "TransitionJobTimeoutSeconds": 300,
    "DirectEnqueueContinuations": true,
    "StatusLockLeaseSeconds": 5,
    "FailurePolicy": {
      "MaxRetries": 5,
      "IntervalSeconds": 30
    },
    "InstanceDataWrite": {
      "PreserveNumericPrecision": false,
      "LegacyAppendPipeline": false
    },
    "Bookkeeping": {
      "AsynchronousCommit": false
    },
    "SubItemTerminalLockRetry": {
      "MaxAttempts": 10,
      "BaseDelayMilliseconds": 20
    }
  }
}
```

| Anahtar | Tip | Varsayılan | Açıklama |
|---------|-----|------------|----------|
| `TransitionJobTimeoutSeconds` | integer | `300` | Bir transition job'ının toplam yürütme bütçesi |
| `DirectEnqueueContinuations` | boolean | `true` | Async accept'in (start veya manuel/event transition) ilk job'ının nasıl kuyruğa alınacağını belirler. `true`: `ITransitionJobEnqueuer` üzerinden doğrudan Dapr job enqueue (outbox/inbox poll hop'u yok, düşük gecikme); doğrudan enqueue başarısız olursa `TransitionContinuationRequested` event'i transactional outbox üzerinden yayınlanarak dayanıklılık korunur. `false`: continuation her zaman outbox üzerinden yayınlanır (legacy davranış). Zincir içi (auto-chain) hop'ları bu ayardan etkilenmez — hepsi in-process çalışır |
| `StatusLockLeaseSeconds` | integer | `5` | Instance status geçişlerini (Active→Busy rezervasyonu/devralma ve Busy→Active/Faulted sonuçlandırması) koruyan kısa lock'un lease süresi. Kritik bölüm tek satırlık bir check-and-set'tir; gerçek tutulma süresi milisaniyeler mertebesindedir — lease yalnızca geçici DB gecikmesini karşılamak için bir güvenlik ağıdır |
| `FailurePolicy.MaxRetries` | integer | `5` | Transition job başarısızlığında yeniden deneme sayısı |
| `FailurePolicy.IntervalSeconds` | integer | `30` | Yeniden denemeler arası bekleme süresi |
| `InstanceDataWrite.PreserveNumericPrecision` | boolean | `false` | Aşağıdaki "PreserveNumericPrecision" bölümüne bakın |
| `Bookkeeping.AsynchronousCommit` <sup>New</sup> v0.0.102 | boolean | `false` | Aşağıdaki "Bookkeeping:AsynchronousCommit" bölümüne bakın |
| `SubItemTerminalLockRetry.MaxAttempts` / `.BaseDelayMilliseconds` | integer | `10` / `20` | <sup>New</sup> v0.0.102 varsayılanı (önceden 4 × 120 ms). SubFlow tamamlanma, hata ve iptal servislerinin sub-item terminal lock'unu beklerken kullandığı sınırlı yeniden deneme. Aşağıdaki "SubItemTerminalLockRetry" bölümüne bakın |
| `InstanceDataWrite.LegacyAppendPipeline` | boolean | `false` | Kill-switch: `true` ⇒ append eski çok geçişli yol'u (`JsonData.Merge` → `NormalizedJson` → `ComputeDataHash`) kullanır. Varsayılan (tek geçişli `JsonCanonicalizer`) ile byte-parity kanıtlanmıştır; yalnızca üretimde sorun çıkarsa rollback güvenlik ağı olarak `true` yapılır |

`TransitionPerJob` alanı yapılandırmada bulunur ancak **inert**'tir — yalnızca geriye dönük uyumluluk için bind edilir, execution davranışını etkilemez.

### Timeout / lease bütçe hiyerarşisi

Startup'ta doğrulanan (fail-fast) bir bütçe hiyerarşisi vardır — her katman bir sonrakinin içine sığmalıdır:

```
ExecutionApi:InvocationTimeoutSeconds < WorkflowExecution:TransitionJobTimeoutSeconds < chain lock lease
```

- v0.0.103 ile Execution host'un `Python:MaxTimeoutSeconds` katmanı kaldırıldı. Python Task artık Orchestrator'dan domain runtime'ına gider ve beklemesi (`timeoutSeconds + Workflow:PythonRuntime:TimeoutGraceSeconds`, en fazla 80 sn) bu hiyerarşide **doğrulanmaz** — job bütçesini bunun üstünde tutun ([Python Runtime Yapılandırması](./python#timeout-katmanları)).
- `ExecutionApi:InvocationTimeoutSeconds`, `WorkflowExecution:TransitionJobTimeoutSeconds`'tan küçük olmalıdır — tek bir task invocation, job'un tüm yürütme bütçesini tüketemez.
- `TransitionJobTimeoutSeconds`, zincir lock lease'inden (varsayılan `TransitionJobTimeoutSeconds + 30`, veya `TransitionLockLeaseSeconds` ile açıkça ayarlanabilir) küçük olmalıdır — lock, job bütçesini ve timeout-recovery yolunu aşmalıdır.

Bu hiyerarşi ihlal edilirse uygulama **başlangıçta** hata verir (`WorkflowExecutionOptionsValidator`) — production'da race pencerelerine dönüşmesindense yapılandırma hatası olarak erken yakalanır.

### Bookkeeping:AsynchronousCommit

<sup>New</sup> v0.0.102 — `WorkflowExecution:Bookkeeping:AsynchronousCommit` (varsayılan `false`). `true` olduğunda task journal yazımı ve transition kaydının eklenmesi/tamamlanması, `SET LOCAL synchronous_commit = off` ile commit eden bir transaction içinde çalışır: satırlar hemen görünür, istek yolunda fsync beklenmez; WAL writer veya bağlantının bir sonraki senkron commit'i diske yazar.

- **Risk:** bir veritabanı çökmesinde bu bookkeeping satırlarının (task journal, transition kaydı) **son birkaç yüz milisaniyesi** kaybolabilir. Instance state'i, instance verisi ve outbox satırları **asla** bu yoldan yazılmaz; dayanıklılıkları değişmez.
- **Maliyet:** sarmalayıcı üç ek round-trip ekler; yalnızca fsync gecikmesinin yaklaşık üç ağ round-trip'ini aştığı ortamlarda kazanç sağlar. **Açmadan önce ölçün.**

Aynı sürümde task journal satırı artık task başına **bir kez**, tamamlandığında yazılır; bu yüzden `functions/tasks` çalışmakta olan bir task'ı listelemez (bkz. [Built-in Functions](/docs/components/functions/built-in)).

### SubItemTerminalLockRetry

Her SubFlow terminal sinyali tasarım gereği iki kez teslim edilir (commit sonrası relay ve Inbox yedeği); tamamlanma, hata ve iptal servisleri sub-item başına terminal lock'u sınırlı bir beklemeyle alır. Bekleme `base × deneme + jitter(0..base)` şeklinde büyür, yani taban ilk yeniden denemeyi belirler. <sup>New</sup> v0.0.102 — Varsayılan 4 × 120 ms'den **10 × 20 ms**'ye indi (aynı ~1 sn bütçe, ilk yeniden deneme 20–40 ms). Ayrıca bekleme her uykudan sonra korelasyonu yeniden yoklar: diğer teslim işi zaten sonuçlandırdıysa bekleme bırakılır (span tag `vnext.lock.wait_abandoned=true`) ve broker yeniden teslimine dönüşmez. State kanalının kendi geri çekilmesi (`SubItemStateLockRetry`, 10 × 10 ms) değişmedi.

### PreserveNumericPrecision

Varsayılan `false`, append sırasındaki sayısal biçimlendirmede üç bilinen sınıfı korur (geriye dönük uyumluluk): `int32`/15-16 anlamlı basamak ötesinde hassasiyet kaybı, küçük büyüklükler için exponent gösterimi (ör. `0.00001` exponential kalır), ve kesirli negatif sıfır (`-0.0` normalize edilmez).

`true` yapıldığında append, sayıları kayıpsız kanonikleştirir: `int64`'e sığan tamsayılar tam olarak round-trip eder, `decimal`'e sığan ondalıklar sondaki-sıfırsız düz biçimde yazılır. Çalışma zamanı maliyeti yoktur (aynı `JsonCanonicalizer` yolu kullanılır, yalnızca sayı biçimlendirme politikası değişir) — ancak açıldığı andan itibaren, bu üç sınıftan birine sahip bir instance'ın **content hash'i bir kez değişir**: bu, o instance için bir ekstra versiyon satırı ve Monitor'da bir "hayalet" diff anlamına gelir. Hiçbir veri kaybolmaz, hiçbir satır yeniden yazılmaz; bayrağı kapatmak eski hash'leri geri getirir.

:::info[Bilinen sorun]
Bu davranış `instance-data-numeric-precision-loss` bilinen sorunu (`known-issues`) olarak kayıtlıdır.
:::

## SubFlow taşınan başlıklar

<sup>New</sup> v0.0.102 — Bir SubFlow child'ı sonlandığında (finish/exit ile tamamlanma, iptal ya da bir istek üzerindeki hata) sonlandıran isteğin başlıkları terminal event'le (`instance.sub.completed` / `faulted` / `canceled`) parent'a taşınır. Parent'ın SubFlow output mapping'i bunları `context.Headers` olarak okur ve varsayılan olarak parent'ın devam eden hop'u bunlarla çalışır (bkz. [Interfaces → ISubFlowMapping](/docs/components/interfaces#isubflowmapping)).

```json
{
  "Workflow": {
    "SubFlow": {
      "CarriedHeaders": {
        "Emit": true,
        "ExposeToOutputMapping": true,
        "ApplyToResume": true,
        "AdditionalDenied": [],
        "MaxEntries": 64,
        "MaxValueLength": 4096
      }
    }
  }
}
```

| Anahtar | Tip | Varsayılan | Açıklama |
|---------|-----|------------|----------|
| `Emit` | boolean | `true` | `false`: üreticiler terminal event'lere başlık yazmaz (taşıma tamamen kapanır) |
| `ExposeToOutputMapping` | boolean | `true` | Tamamlanma ve hata output mapping'i başlıkları `context.Headers` olarak okur |
| `ApplyToResume` | boolean | `true` | Başlıkları tamamlanma, hata ve iptalde parent'ın resume isteğine uygular (auto koşullar, onEntry task'ları, sonraki subflow'un input mapping'i). `false`: eski davranış (resume boş başlıklarla). `Actor = System` değişmez |
| `AdditionalDenied` | string[] | `[]` | Tabana eklenen ek başlık adları (tam eşleşme, büyük/küçük harf duyarsız). Yapılandırma tabana yalnızca ekleme yapabilir |
| `MaxEntries` | integer | `64` | En fazla taşınan başlık sayısı; fazlası düşürülür |
| `MaxValueLength` | integer | `4096` | Değer başına en fazla karakter; daha uzun değer düşürülür |

- **Sabit taban:** adında `authorization`, `cookie`, `token`, `secret` veya `session` geçen her başlık taşınmaz. Framework başlıkları da (`x-subflow-depth`, `x-parent-instance-id`, `x-root-instance-id`, `x-workflow-instance-id`, `x-correlation-id`, `traceparent`, `tracestate`, `baggage`, `host`, `transfer-encoding`, `connection`, `keep-alive` ve `content-`, `dapr-`, `grpc-` önekleri) dışlanır. `role` her zaman taşınır; anahtarlar küçük harfle saklanır.
- **Denylist:** tabana veya dışlamalara takılmayan her başlık taşınır; `x-api-key` gibi olağandışı adlı bir kimlik bilgisi `AdditionalDenied`'a eklenmedikçe outbox'a, broker'a ve parent'a ulaşır (bilinen sorun `subflow-carried-headers-denylist`).
- **Boş küme:** timer, timeout, job-timeout kurtarması ve aşağı yönlü iptal/hata kaskadı sonlandırmalarının çağıran isteği yoktur; hiçbir şey taşınmaz.
- **Loglama:** başlık değerleri asla loglanmaz veya span'e konmaz; yalnızca sayılar (`vnext.subflow.carried_header_count`, log `40140`).

Ortam değişkeni biçimi: `Workflow__SubFlow__CarriedHeaders__ApplyToResume=false`.

:::warning[Davranış değişikliği]
Varsayılanlarla, önceden boş `context.Headers` gören bir parent output mapping'i artık child'ın başlıklarını görür ve parent'ın devam eden hop'u (koşullar, çağıran kimlik bilgisini ileten task'lar — `sub`, `act_sub`, `role`, `position`, `client_id` — ve sonraki subflow'un input mapping'i) başlıksız değil, child'ı sonlandıranın başlıklarıyla çalışır. Eski resume davranışı için `ApplyToResume=false` ayarlayın.
:::

## İlgili

- [Caching](./caching) — component/state/instance function cache TTL'leri
- [Fan-Out Task](../components/tasks/fan-out) — `MaxConcurrentItems` ile ilişkili task davranışı
- [Interfaces → ISubFlowMapping](/docs/components/interfaces#isubflowmapping) — SubFlow output mapping'inde `context.Headers`
