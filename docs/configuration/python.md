---
sidebar_position: 7
title: Python Runtime Yapılandırması
description: Python Task için Orchestrator'ın Workflow:PythonRuntime ayarları, runtime container ortam değişkenleri ve Helm pythonRuntime bloğu
---

# Python Runtime Yapılandırması

:::warning[v0.0.103 — Execution `Python:*` ayarları kaldırıldı]
v0.0.88–v0.0.102 arasında [Python Task](/docs/components/tasks/python) Execution host'unda `Python:*` bölümüyle (`Enabled`, `DefaultMode`, `EnabledModes`, `PythonNet`, `Process`, `Container`…) yapılandırılıyordu. v0.0.103 ile Execution host Python'u hiç taşımaz ve bu anahtarların **hiçbirini okumaz** — kalan override'lar sessizce yok sayılır. Bunları ortam değerlerinizden temizleyin. Geçiş: [v0.0.103 Breaking Changes](/blog/breaking-changes/breaking-changes-v0-0-103).
:::

Python Task artık domain'in kendi runtime container'ında çalışır ve üç yerden yapılandırılır:

| Katman | Nerede | Kim set eder |
|---|---|---|
| Orchestrator | `Workflow:PythonRuntime:*` appsettings | Helm chart (`pythonRuntime.enabled: true` olduğunda) |
| Runtime container | `VNEXT_PYTHON_*` ortam değişkenleri | Helm chart (`pythonRuntime.config`) |
| Deployment | Helm `pythonRuntime` bloğu | Domain sahibi |

## Orchestrator: `Workflow:PythonRuntime`

```json
{
  "Workflow": {
    "PythonRuntime": {
      "AppId": "vnext-core-python-runtime-app",
      "InvokeMethod": "v1/invoke",
      "TimeoutGraceSeconds": 5
    }
  }
}
```

| Alan | Tip | Varsayılan | Açıklama |
|------|-----|------------|----------|
| `AppId` | string? | boş | Domain'in Python runtime'ının Dapr app-id'si. **Boş = runtime yok**; her Python task'ı çağrı yapılmadan `503` ile düşer |
| `InvokeMethod` | string | `v1/invoke` | Kontratın invoke route'u |
| `TimeoutGraceSeconds` | integer (`1`–`30`) | `5` | Handler timeout'unun üstüne eklenen bekleme; runtime'ın kendi `504`'ü Orchestrator vazgeçmeden önce gelsin diye. Bu süre de aşılırsa task `408` ile düşer |

Environment variable biçimi: `Workflow__PythonRuntime__AppId`. Helm chart `pythonRuntime.enabled: true` iken bu değeri runtime'ın app-id'siyle (`vnext-<appDomain>-python-runtime-app` ya da `pythonRuntime.dapr.appId`) kendisi verir; elle set etmeniz gerekmez.

Handler timeout'u (`timeoutSeconds`) task tanımındadır, `1`–`50` aralığındadır ve publish'te doğrulanır — host tarafında ayrı bir üst sınır ayarı yoktur.

## Runtime container: `VNEXT_PYTHON_*`

| Değişken | Helm alanı | Varsayılan | Açıklama |
|---|---|---|---|
| `VNEXT_PYTHON_PORT` | `pythonRuntime.service.port` | `8080` | Dinleme portu (Dapr app port'u) |
| `VNEXT_PYTHON_HANDLERS` | `pythonRuntime.config.handlersPackage` | `handlers` | Modülleri handler kaydeden paket |
| `VNEXT_PYTHON_MAX_WORKERS` | `pythonRuntime.config.maxWorkers` | `4` | Pod başına eşzamanlı handler çağrısı |
| `VNEXT_PYTHON_MAX_REQUEST_BYTES` | `pythonRuntime.config.maxRequestBytes` | `4194304` (4 MiB) | İstek gövdesi sınırı — Dapr body size sınırının içinde tutun |
| `VNEXT_PYTHON_MAX_OUTPUT_BYTES` | `pythonRuntime.config.maxOutputBytes` | `4194304` (4 MiB) | Cevap gövdesi sınırı |

Orchestrator, input mapping'den sonraki girdiyi ayrıca **2 MiB** ile sınırlar; aşan girdi çağrı yapılmadan `413` ile düşer.

Handler'ın kendi ayarları için `pythonRuntime.extraEnvConfig` kullanılır. Secret'lar buraya **konmaz** — Dapr secret store'dan okunur.

## Deployment: Helm `pythonRuntime`

```yaml
pythonRuntime:
  enabled: true
  replicaCount: 1
  image:
    # DOMAIN'in image'ı: FROM ghcr.io/burgan-tech/vnext/python-runtime:<sürüm>
    repository: registry.example.com/core/python-runtime
    tag: "1.4.0"
  config:
    handlersPackage: handlers
    maxWorkers: 4
  networkPolicy:
    enabled: true   # yalnızca bu release'in orchestrator pod'larından ingress
```

Tüm alanlar (güvenlik bağlamı, kaynaklar, HPA, NetworkPolicy, probe'lar): [Helm Chart § Python Runtime](../deployment/helm-chart#python-runtime).

## Timeout Katmanları

```
handler timeoutMs (= timeoutSeconds) < Orchestrator beklemesi (timeoutSeconds + TimeoutGraceSeconds) < WorkflowExecution:TransitionJobTimeoutSeconds
```

- En uzun bekleme 50 + 30 = **80 sn**'dir.
- Bu zincir başlangıçta **doğrulanmaz**: `WorkflowExecutionOptionsValidator` yalnızca `ExecutionApi:InvocationTimeoutSeconds < WorkflowExecution:TransitionJobTimeoutSeconds < chain lock lease` kuralını denetler (bkz. [Workflow Execution](./workflow-execution)). Job bütçesini (varsayılan 300 sn) akıştaki en uzun Python beklemesinin üstünde tutun.
- Python çağrısı Execution'a gitmediği için `ExecutionApi:InvocationTimeoutSeconds` Python task'ını **etkilemez**.

## Lokal geliştirme

vnext-example'daki [`labs/python-runtime/`](https://github.com/burgan-tech/vnext-example/tree/master/labs/python-runtime) lab'ı domain image'ını ve Dapr sidecar'ını (`--app-id vnext-python-runtime-app`) lokal vNext altyapı ağına bağlar; Orchestrator `Workflow__PythonRuntime__AppId=vnext-python-runtime-app` ile başlatılır. Lab, Helm chart'taki gibi salt-okur kök dosya sistemi, root olmayan kullanıcı ve düşürülmüş capability'lerle çalışır.

## İlgili

- [Python Task](/docs/components/tasks/python) — task alanları, handler yazımı, kontrat ve hata kodları
- [Helm Chart § Python Runtime](../deployment/helm-chart#python-runtime)
- [Workflow Execution Yapılandırması](./workflow-execution) — timeout bütçe hiyerarşisi
- Runtime dokümanı: [python-task.md (vnext)](https://github.com/burgan-tech/vnext/blob/master/docs/runtime/python-task.md)
