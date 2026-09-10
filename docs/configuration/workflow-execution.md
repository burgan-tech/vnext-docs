---
sidebar_position: 5
title: Workflow Execution
description: Transition job timeout, fan-out eşzamanlılığı ve InstanceData yazım budget'ı yapılandırması
---

# Workflow Execution Yapılandırması

Orchestration host'unun transition job'larını, fan-out eşzamanlılığını ve InstanceData yazım yolunu kontrol eden ayarlar `WorkflowExecution` ve `Workflow:FanOut` bölümlerinde toplanır.

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
| `InstanceDataWrite.LegacyAppendPipeline` | boolean | `false` | Kill-switch: `true` ⇒ append eski çok geçişli yol'u (`JsonData.Merge` → `NormalizedJson` → `ComputeDataHash`) kullanır. Varsayılan (tek geçişli `JsonCanonicalizer`) ile byte-parity kanıtlanmıştır; yalnızca üretimde sorun çıkarsa rollback güvenlik ağı olarak `true` yapılır |

`TransitionPerJob` alanı yapılandırmada bulunur ancak **inert**'tir — yalnızca geriye dönük uyumluluk için bind edilir, execution davranışını etkilemez.

### Timeout / lease bütçe hiyerarşisi

Startup'ta doğrulanan (fail-fast) bir bütçe hiyerarşisi vardır — her katman bir sonrakinin içine sığmalıdır:

```
Python:MaxTimeoutSeconds < ExecutionApi:InvocationTimeoutSeconds < WorkflowExecution:TransitionJobTimeoutSeconds < chain lock lease
```

- `Python:MaxTimeoutSeconds` (Execution host, varsayılan `50`), `ExecutionApi:InvocationTimeoutSeconds`'tan (varsayılan `60`) küçük olmalıdır — Dapr çağrısı, Python cleanup ve yanıt yayılımından daha uzun sürmelidir.
- `ExecutionApi:InvocationTimeoutSeconds`, `WorkflowExecution:TransitionJobTimeoutSeconds`'tan küçük olmalıdır — tek bir task invocation, job'un tüm yürütme bütçesini tüketemez.
- `TransitionJobTimeoutSeconds`, zincir lock lease'inden (varsayılan `TransitionJobTimeoutSeconds + 30`, veya `TransitionLockLeaseSeconds` ile açıkça ayarlanabilir) küçük olmalıdır — lock, job bütçesini ve timeout-recovery yolunu aşmalıdır.

Bu hiyerarşi ihlal edilirse uygulama **başlangıçta** hata verir (`WorkflowExecutionOptionsValidator`) — production'da race pencerelerine dönüşmesindense yapılandırma hatası olarak erken yakalanır.

### PreserveNumericPrecision

Varsayılan `false`, append sırasındaki sayısal biçimlendirmede üç bilinen sınıfı korur (geriye dönük uyumluluk): `int32`/15-16 anlamlı basamak ötesinde hassasiyet kaybı, küçük büyüklükler için exponent gösterimi (ör. `0.00001` exponential kalır), ve kesirli negatif sıfır (`-0.0` normalize edilmez).

`true` yapıldığında append, sayıları kayıpsız kanonikleştirir: `int64`'e sığan tamsayılar tam olarak round-trip eder, `decimal`'e sığan ondalıklar sondaki-sıfırsız düz biçimde yazılır. Çalışma zamanı maliyeti yoktur (aynı `JsonCanonicalizer` yolu kullanılır, yalnızca sayı biçimlendirme politikası değişir) — ancak açıldığı andan itibaren, bu üç sınıftan birine sahip bir instance'ın **content hash'i bir kez değişir**: bu, o instance için bir ekstra versiyon satırı ve Monitor'da bir "hayalet" diff anlamına gelir. Hiçbir veri kaybolmaz, hiçbir satır yeniden yazılmaz; bayrağı kapatmak eski hash'leri geri getirir.

:::info Bilinen sorun
Bu davranış `instance-data-numeric-precision-loss` bilinen sorunu (`known-issues`) olarak kayıtlıdır.
:::

## İlgili

- [Caching](./caching) — component/state/instance function cache TTL'leri
- [Fan-Out Task](../components/tasks/fan-out) — `MaxConcurrentItems` ile ilişkili task davranışı
