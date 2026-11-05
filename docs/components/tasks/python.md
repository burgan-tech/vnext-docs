---
sidebar_position: 4
title: Python Task
description: Domain'in kendi Python runtime container'ındaki isimli bir handler'ı Dapr üzerinden çağıran task
---

# Python Task (Type: `23`)

:::warning[v0.0.103 — kırıcı değişiklik]
v0.0.103 ile Python Task **inline script taşımaz**. `config.script` ve `config.executionMode` kaldırıldı; task artık domain'in Python runtime image'ında kayıtlı bir **handler**'ın adını verir. Execution host'un `Python:*` ayarları ve `pythonNet` / `process` / `container` modları da kaldırıldı. Geçiş adımları: [v0.0.103 Breaking Changes](/blog/breaking-changes/breaking-changes-v0-0-103).
:::

Python Task, domain'in **kendi Python runtime container'ında** kayıtlı, isimli bir handler'ı çağırır. vNext burada bir sarmalayıcıdır: isteği standart task mapping'inden kurar, runtime'ı sürümlü bir kontratla çağırır, timeout'u uygular ve cevabı standart bir task sonucuna çevirir. Error boundary ve transition pipeline task'ın Python olduğunu bilmez.

```
Orchestration ──(InputHandler → invoke → OutputHandler)──▶ Dapr invoke {app-id} POST v1/invoke
                                                              │
                                     python-runtime Deployment (opt-in, domain başına)
                                     FROM ghcr.io/burgan-tech/vnext/python-runtime
                                     + domain handler'ları + sabitlenmiş requirement'lar
```

- **Execution hop'u yok.** Orchestration host runtime'ı kendi sidecar'ından doğrudan çağırır.
- **vNext imajlarında Python yok.** Hiçbir vNext imajı CPython, `pythonnet` veya Kubernetes client taşımaz. Python kullanmayan bir domain ek hiçbir şey deploy etmez.
- **Kod task'ta değil, image'dadır.** Handler'lar ve paketleri domain runtime image'ı build edilirken kurulur; container başlarken hiçbir şey kurulmaz.

Ne zaman kullanılır: hesaplama, skorlama, veri dönüşümü gibi Python ekosistemine (NumPy, pandas, scikit-learn…) ihtiyaç duyan, **domain'e ait ve güvenilir** kod. Basit dönüşümler için [Script Task](./script) ya da mapping yeterlidir.

## Sıfırdan çalışan bir Python task

Bir domain'de Python task'ı çalıştırmak dört adımdır:

1. [Handler yaz](#1-handler-yazın) (`@handler("name")`).
2. [Domain image'ını build et](#2-domain-imageını-build-edin) (`FROM ghcr.io/burgan-tech/vnext/python-runtime`).
3. [Helm'de `pythonRuntime`'ı aç](#3-runtimeı-helmde-açın).
4. [Task'ı tanımla ve publish et](#4-taskı-tanımlayın).

### 1. Handler yazın

Handler, `@handler("name")` ile işaretlenmiş bir fonksiyondur. JSON girdiyi ve isteğe bağlı olarak salt-okur bir context'i alır, strict-JSON bir değer döner:

```python
# handlers/calculations.py
from vnext_runtime import HandlerContext, handler

@handler("sum_values")
def sum_values(input):
    return {"total": sum(input["values"])}

@handler("risk_score")
def risk_score(input, context: HandlerContext):
    return {"score": min(100, input["income"] // 1000), "instanceId": context.instance_id}
```

- Dönüş değeri `json.dumps(..., allow_nan=False)` ile serileşebilmelidir. NumPy ve pandas değerlerini `.tolist()`, `.item()` veya `.to_dict()` ile dönüştürün; `NaN` / `Infinity` `invalid_output` hatası verir.
- Handler'ın fırlattığı exception `handler_error` hatasına dönüşür.
- `HandlerContext` alanları: `domain`, `workflow`, `workflow_version`, `instance_id`, `task_key`, `correlation_id`, `timeout_ms`.
- Girdi ham instance verisidir; **kişisel veri içerebilir** — loglamayın.
- `handlers` paketi altındaki her modül başlangıçta import edilir (farklı bir paket için `VNEXT_PYTHON_HANDLERS`).

### 2. Domain image'ını build edin

```dockerfile
ARG VNEXT_PYTHON_RUNTIME=ghcr.io/burgan-tech/vnext/python-runtime:<version>
FROM ${VNEXT_PYTHON_RUNTIME}

USER root
COPY requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --only-binary :all: --require-hashes -r /tmp/requirements.txt && rm /tmp/requirements.txt
COPY handlers /opt/vnext-python/app/handlers
USER 65532:65532
```

Her requirement'ı sabitleyin (tercihen hash'li, `pip-compile --generate-hashes`); image tekrarlanabilir olur ve yayına çıkmadan taranabilir. Base image yalnızca standart kütüphaneyle gelen `vnext_runtime` paketini taşır — NumPy gibi paketleri domain kendisi ekler. Image sürümü vNext'in değil **domain'indir**.

### 3. Runtime'ı Helm'de açın

```yaml
pythonRuntime:
  enabled: true
  image:
    repository: registry.example.com/core/python-runtime
    tag: "1.4.0"
  config:
    handlersPackage: handlers
    maxWorkers: 4
```

`enabled: true` olduğunda chart runtime Deployment'ını kurar ve Orchestrator'a `Workflow__PythonRuntime__AppId` değerini verir. Tüm alanlar: [Python Runtime Yapılandırması](../../configuration/python) ve [Helm Chart § Python Runtime](../../deployment/helm-chart#python-runtime).

### 4. Task'ı tanımlayın

> **Schema:** `task-definition.schema.json` — type `23`, `@burgan-tech/vnext-schema@0.0.59` ile şemaya girdi.

```json
{
  "key": "calculate-risk",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["python", "risk"],
  "attributes": {
    "type": "23",
    "config": {
      "handler": "risk_score",
      "input": { "income": 85000 },
      "timeoutSeconds": 20
    }
  }
}
```

## Konfigürasyon Alanları

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `handler` | string | Evet | - | Runtime image'ında `@handler("name")` ile kayıtlı handler adı. Desen: `^[A-Za-z_][A-Za-z0-9_.-]{0,127}$` (publish'te de doğrulanır) |
| `input` | any (JSON) | Hayır | - | Handler'a giden varsayılan JSON girdi (null, scalar, array, object). Input mapping'i bunu `SetInput` ile değiştirebilir. Yazıldığı haliyle en fazla 2 MiB |
| `timeoutSeconds` | integer | Hayır | `30` | Handler timeout'u, `1`–`50`. Orchestrator `timeoutSeconds + Workflow:PythonRuntime:TimeoutGraceSeconds` kadar bekler |

Config **kapalıdır** (`additionalProperties: false`): eski `script` ve `executionMode` alanları şema doğrulamasında ve publish'te reddedilir.

## Mapping

Python Task diğer task türleri gibi standart `IMapping`'i kullanır. `InputHandler` task üzerinde `SetInput` çağırarak isteği şekillendirir; `OutputHandler` handler çıktısını task response'undan okur:

```csharp
public class RiskScoreMapping : IMapping
{
    public Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
    {
        ((PythonTask)task).SetInput(new { income = context.Instance.Data.income });
        return Task.FromResult(new ScriptResponse());
    }

    public Task<ScriptResponse> OutputHandler(ScriptContext context) =>
        Task.FromResult(new ScriptResponse { Data = new { risk = context.Body?.data } });
}
```

Mapping yoksa task sonucu handler çıktısının kendisidir.

## Runtime Kontratı (sürüm 1)

Tüm endpoint'ler `application/json` döner. Kontratı Orchestrator kurar; domain yalnızca handler yazar.

### `POST v1/invoke`

İstek (Orchestrator gönderir):

```json
{
  "contractVersion": "1",
  "handler": "risk_score",
  "input": { "income": 85000 },
  "timeoutMs": 20000,
  "context": {
    "domain": "core",
    "workflow": "loan-application",
    "workflowVersion": "1.2.0",
    "instanceId": "8f1c…",
    "taskKey": "calculate-risk",
    "correlationId": "…"
  }
}
```

Başarı (`200`):

```json
{ "contractVersion": "1", "status": "success", "output": { "score": 85 }, "durationMs": 12 }
```

Hata:

```json
{ "contractVersion": "1", "status": "error", "error": { "code": "handler_error", "message": "KeyError: 'income'" } }
```

### `GET v1/health` ve `GET v1/manifest`

`health`, liveness/readiness probe'ları için `{"status":"ok"}` döner. `manifest` kontrat sürümünü, runtime sürümünü, Python sürümünü ve kayıtlı handler adlarını listeler.

## Hata Kodları

Başarılı bir çağrıda `output` task sonucu olur. Hata, `StatusCode`'u HTTP durumu ve `ErrorMessage`'ı `"<code>: <message>"` olan **başarısız bir task sonucudur** — [error boundary](/docs/how-to/error-handling) kuralları ikisinden biriyle eşleşebilir.

| HTTP | `error.code` | Kaynak | Anlamı |
|---|---|---|---|
| 400 | `bad_request`, `unsupported_contract` | Runtime | Gövde JSON / nesne değil ya da `contractVersion` `1` değil |
| 404 | `unknown_handler` | Runtime | Image'da bu adla kayıtlı handler yok |
| 413 | `request_too_large` | Runtime | Gövde `VNEXT_PYTHON_MAX_REQUEST_BYTES`'tan (4 MiB) büyük |
| 413 | `request_too_large` | Orchestrator | Input mapping'den sonraki girdi 2 MiB'ı aşıyor — **çağrı yapılmaz** (publish yalnız yazılan `config.input`'u denetler) |
| 422 | `handler_error` | Runtime | Handler exception fırlattı |
| 422 | `invalid_output`, `output_too_large` | Runtime | Sonuç strict JSON değil ya da `VNEXT_PYTHON_MAX_OUTPUT_BYTES`'tan (4 MiB) büyük |
| 504 | `timeout` | Runtime | Handler `timeoutMs` içinde bitmedi |
| 408 | - | Orchestrator | Runtime `timeoutSeconds + TimeoutGraceSeconds` içinde hiç cevap vermedi |
| 503 | - | Orchestrator | Domain'de runtime yok (`Workflow:PythonRuntime:AppId` boş) — **çağrı yapılmaz** |

```json
"errorBoundary": {
  "onError": [
    {
      "action": 1,
      "errorCodes": ["Task:504", "Task:408"],
      "priority": 10,
      "retryPolicy": { "maxRetries": 2, "initialDelay": "PT2S", "backoffType": 1, "backoffMultiplier": 2.0 }
    },
    { "action": 0, "errorCodes": ["Task:422"], "transition": "manual-review", "priority": 20 }
  ]
}
```

`Task:503` (runtime yok) bir yapılandırma hatasıdır; retry ile düzelmez.

## İşletim Notları

- **İzolasyon.** Çağrılar pod başına tek bir process'i paylaşır. Bellek sızdıran ya da global state tutan bir handler kendinden sonraki çağrıları etkiler. Timeout'a düşen bir çağrı döndüğü ana kadar worker thread'ini tutar (Python thread'i öldüremez); handler'ları timeout'larının içinde tutun, `maxWorkers` ve replica sayısını en yavaş handler'a göre boyutlayın. CPU-yoğun iş GIL ile sınırlıdır: thread ile değil **replica** ile ölçekleyin.
- **Güvenlik.** Handler kodu güvenilir domain kodudur. Runtime salt-okur kök dosya sistemi, root olmayan kullanıcı (UID 65532), düşürülmüş capability'ler, service-account token'ı olmadan ve yalnızca Orchestrator sidecar'ını kabul eden bir NetworkPolicy ile çalışır (chart varsayılanları). Secret'lar Dapr secret store'dan ya da pod ortamından gelir; **asla task tanımından gelmez**.
- **Yük sınırları.** En fazla `maxWorkers` çağrı aynı anda çalışır; fazlası pod kuyruğunda bekler ve bu bekleme kendi timeout'undan düşer.
- **Timeout katmanları.** Handler `timeoutMs` < Orchestrator beklemesi (`+ TimeoutGraceSeconds`) < transition job bütçesi. Bekleme en fazla 50 + 30 = 80 sn'dir ve `WorkflowExecution:TransitionJobTimeoutSeconds` (varsayılan 300) ile **doğrulanmaz** — job bütçesini akıştaki en uzun Python beklemesinin üstünde tutun.
- **Gözlemlenebilirlik.** Çağrı Orchestrator'dan bir Dapr service invocation'dır; her `daprservice` çağrısı gibi izlenir (`Invoke.Prepare` span'i + sidecar span'leri). Payload'lar iki tarafta da loglanmaz.

## Örnek Component

- Base image örneği: [`runtimes/python/example/`](https://github.com/burgan-tech/vnext/tree/master/runtimes/python/example) (vnext) — `Dockerfile`, `handlers/calculations.py`, `requirements.txt`
- Uçtan uca lab: [`labs/python-runtime/`](https://github.com/burgan-tech/vnext-example/tree/master/labs/python-runtime) (vnext-example) — domain image'ı + Dapr sidecar'ı (`docker-compose.yml`, `lab.sh`)
- Task tanımları: [`core/Tasks/python-task-lab/`](https://github.com/burgan-tech/vnext-example/tree/master/core/Tasks/python-task-lab) — ör. [`ptl-sum.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Tasks/python-task-lab/ptl-sum.json); hata yolları için `ptl-fail`, `ptl-nan`, `ptl-slow`, `ptl-unknown`
- Workflow: [`core/Workflows/python-task-lab/python-task-lab.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/python-task-lab/python-task-lab.json)
- Entegrasyon testi: [`PythonTaskLabTests.cs`](https://github.com/burgan-tech/vnext-example/blob/master/tests/Core.IntegrationTests/Tests/PythonTaskLab/PythonTaskLabTests.cs)

## İlgili

- [Tasks Genel Bakış](/docs/components/tasks/) — task türleri ve referans mekanizması
- [Python Runtime Yapılandırması](../../configuration/python) — `Workflow:PythonRuntime:*` ve runtime ortam değişkenleri
- [Helm Chart § Python Runtime](../../deployment/helm-chart#python-runtime) — `pythonRuntime` bloğu
- [Hata Yönetimi](/docs/how-to/error-handling) — `errorBoundary` kuralları
- Runtime dokümanı: [python-task.md (vnext)](https://github.com/burgan-tech/vnext/blob/master/docs/runtime/python-task.md)
