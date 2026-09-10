---
sidebar_position: 7
title: Python Yapılandırması
description: Execution host'unda Python Task çalıştırma modları, limitler ve container/Kubernetes ayarları
---

# Python Yapılandırması <sup>New</sup> v0.0.88

[Python Task](/docs/components/tasks/python) (type `23`), Execution host'unun `Python` appsettings bölümü ile yapılandırılır. Tüm değerler standart .NET configuration provider'ları ve `Python__Enabled`, `Python__DefaultMode` gibi environment variable'lar ile override edilebilir (iç içe alanlar için `__` ayracı kullanılır, örn. `Python__Process__MaxConcurrency`).

Kaynak dosya: `execution/BBT.Workflow.Execution.HttpApi.Host/appsettings.json`.

## Örnek Yapılandırma

```json
{
  "Python": {
    "Enabled": false,
    "DefaultMode": "pythonNet",
    "EnabledModes": ["pythonNet", "process"],
    "MaxTimeoutSeconds": 50,
    "MaxCodeBytes": 262144,
    "MaxInputBytes": 2097152,
    "MaxOutputBytes": 2097152,
    "MaxStdoutBytes": 32768,
    "MaxStderrBytes": 32768,
    "AllowedModules": ["*"],
    "PythonNet": {
      "PythonDll": "libpython3.12.so.1.0",
      "PythonHome": "/usr",
      "PythonPath": "/opt/vnext-python/venv/lib/python3.12/site-packages",
      "RunnerDirectory": "/opt/vnext-python",
      "MaxConcurrency": 1
    },
    "Process": {
      "PythonExecutable": "/opt/vnext-python/venv/bin/python",
      "RunnerPath": "/opt/vnext-python/runner.py",
      "MaxConcurrency": 2,
      "UsePrlimit": true,
      "PrlimitExecutable": "/usr/bin/prlimit",
      "MemoryBytes": 4294967296,
      "CpuTimeSeconds": 45,
      "OpenFiles": 256
    },
    "Container": {
      "Driver": "docker",
      "Endpoint": "unix:///var/run/docker.sock",
      "ApiVersion": "v1.43",
      "Image": "ghcr.io/burgan-tech/vnext/python-runner:latest",
      "PullPolicy": "ifNotPresent",
      "NetworkMode": "none",
      "MaxConcurrency": 2,
      "MemoryBytes": 2147483648,
      "NanoCpus": 1000000000,
      "PidsLimit": 128,
      "TmpfsBytes": 67108864,
      "Kubernetes": {
        "Namespace": "default",
        "ContainerName": "python-runner",
        "RunnerServiceAccountName": null,
        "ImagePullSecrets": [],
        "PodStartTimeoutSeconds": 30,
        "PollIntervalMilliseconds": 250,
        "JobTtlSecondsAfterFinished": 60,
        "RuntimeClassName": null
      }
    }
  }
}
```

## Kök Alanlar

| Alan | Tip | Varsayılan | Açıklama |
|------|-----|------------|----------|
| `Enabled` | boolean | `false` | Python task yürütmesini global olarak açar/kapatır |
| `DefaultMode` | string | `pythonNet` | Task `executionMode` belirtmediğinde kullanılacak mod |
| `EnabledModes` | string[] | `["pythonNet", "process"]` | Kullanılabilir modların açık listesi. `DefaultMode`, `Enabled=true` iken bu listede **bulunmak zorundadır**; aksi halde başlangıçta doğrulama hatası verir |
| `MaxTimeoutSeconds` | integer | `50` | Task'ın `timeoutSeconds` alanı için üst sınır; `1–50` aralığında olmalıdır |
| `MaxCodeBytes` | integer | `262144` (256 KiB) | Decode edilmiş Python kaynak kodu boyut sınırı |
| `MaxInputBytes` | integer | `2097152` (2 MiB) | `config.input` boyut sınırı |
| `MaxOutputBytes` | integer | `2097152` (2 MiB) | `main()` dönüş değeri boyut sınırı |
| `MaxStdoutBytes` | integer | `32768` (32 KiB) | Yakalanan stdout sınırı |
| `MaxStderrBytes` | integer | `32768` (32 KiB) | Yakalanan stderr sınırı |
| `AllowedModules` | string[] | `["*"]` | İzinli Python modülleri — paylaşılan runner bootstrap'ı tarafından her modda (dinamik import'lar dahil) uygulanır. **Yönetişim politikasıdır, güvenlik sınırı değildir** |

## `PythonNet`

| Alan | Tip | Varsayılan | Açıklama |
|------|-----|------------|----------|
| `PythonDll` | string | `libpython3.12.so.1.0` | Yüklenecek CPython paylaşımlı kütüphanesi |
| `PythonHome` | string? | `/usr` | `PYTHONHOME` |
| `PythonPath` | string? | `/opt/vnext-python/venv/lib/python3.12/site-packages` | `PYTHONPATH` |
| `RunnerDirectory` | string | `/opt/vnext-python` | Runner script dizini |
| `MaxConcurrency` | integer | `1` | Eşzamanlı `pythonNet` çağrı sınırı (GIL nedeniyle düşük tutulur) |

## `Process`

| Alan | Tip | Varsayılan | Açıklama |
|------|-----|------------|----------|
| `PythonExecutable` | string | `/opt/vnext-python/venv/bin/python` | `python -I runner.py` için yürütülebilir dosya |
| `RunnerPath` | string | `/opt/vnext-python/runner.py` | Runner script yolu |
| `MaxConcurrency` | integer | `2` | Eşzamanlı process sınırı |
| `UsePrlimit` | boolean | `true` | Linux'ta CPU/adres-alanı/açık-dosya limitleri için `prlimit` kullanımı |
| `PrlimitExecutable` | string | `/usr/bin/prlimit` | `prlimit` binary yolu |
| `MemoryBytes` | integer (long) | `4294967296` (4 GiB) | Adres-alanı limiti |
| `CpuTimeSeconds` | integer | `45` | CPU zaman limiti |
| `OpenFiles` | integer | `256` | Açık dosya sayısı limiti |

## `Container`

| Alan | Tip | Varsayılan | Açıklama |
|------|-----|------------|----------|
| `Driver` | string | `docker` | `docker` veya `kubernetes` |
| `Endpoint` | string | `unix:///var/run/docker.sock` | Docker Engine endpoint'i (Docker driver) |
| `ApiVersion` | string | `v1.43` | Docker Engine API versiyonu |
| `Image` | string | `ghcr.io/burgan-tech/vnext/python-runner:latest` | Runner container image'ı |
| `PullPolicy` | string | `ifNotPresent` | Image çekme politikası |
| `NetworkMode` | string | `none` | Container network modu |
| `MaxConcurrency` | integer | `2` | Eşzamanlı container sınırı |
| `MemoryBytes` | integer (long) | `2147483648` (2 GiB) | Container bellek limiti |
| `NanoCpus` | integer (long) | `1000000000` (1 CPU) | Container CPU limiti |
| `PidsLimit` | integer (long) | `128` | Container PID limiti |
| `TmpfsBytes` | integer (long) | `67108864` (64 MiB) | `/tmp` tmpfs boyutu |
| `ClientCertificatePath` | string? | `null` | Docker TLS client sertifikası (yalnızca Docker driver) |
| `ClientCertificatePassword` | string? | `null` | Docker TLS client sertifika şifresi |
| `CaCertificatePath` | string? | `null` | Docker TLS CA sertifikası |

Container driver varsayılan olarak non-root UID/GID 65532, read-only root filesystem, düşürülmüş capability'ler, `no-new-privileges` ve host mount yasağı ile çalışır. Container çalıştırma **opt-in**'dir; normal geliştirme Compose dosyası Docker socket'ini mount etmez — yalnızca açıkça onaylanmış bir ortamda `etc/docker/docker-compose.python-container.yml` kullanılmalıdır.

### `Container.Kubernetes`

| Alan | Tip | Varsayılan | Açıklama |
|------|-----|------------|----------|
| `Namespace` | string | `default` | Job/Pod'ların oluşturulacağı namespace |
| `KubeConfigPath` | string? | `null` | Kubeconfig dosya yolu (in-cluster çalışırken gerekmez) |
| `Context` | string? | `null` | Kubeconfig context adı |
| `ContainerName` | string | `python-runner` | Pod içindeki container adı |
| `RunnerServiceAccountName` | string? | `null` | Image-pull veya admission policy amaçlı service account (runner pod'unun kendi token mount'u her zaman kapalıdır) |
| `ImagePullSecrets` | string[] | `[]` | Image pull secret adları |
| `PodStartTimeoutSeconds` | integer | `30` | Pod başlatma zaman aşımı |
| `PollIntervalMilliseconds` | integer | `250` | Job/Pod durumu polling aralığı |
| `JobTtlSecondsAfterFinished` | integer | `60` | Job'un tamamlanma sonrası TTL'i (ek güvence; asıl silme `finally` bloğunda yapılır) |
| `RuntimeClassName` | string? | `null` | Kullanılacak `RuntimeClass` |

Kubernetes driver, invocation başına bir `batch/v1` Job oluşturur (`backoffLimit: 0`), JSON girdiyi `pods/attach` streaming API'si ile gönderir (ConfigMap/Secret/env/command-line **kullanmaz**), stdout/stderr'i ayrı okur, ardından Job'u `finally` içinde siler. Runner pod'unda `automountServiceAccountToken: false` her zaman geçerlidir. Kubernetes taşınabilir bir per-Pod PID limiti sunmadığı için `PidsLimit` yalnızca politika metadata'sı olarak Job üzerine yazılır — asıl uygulama node/container runtime veya uyumlu bir admission/runtime politikasına bırakılır.

:::info[RBAC]
Execution servisinin Kubernetes'te namespace-scoped Job (create/get/list/watch/delete), Pod (get/list/watch) ve `pods/attach` (create/get) izinlerine ihtiyacı vardır. Bu RBAC kaynakları (ServiceAccount, Role, RoleBinding) `vnext-helm-charts` reposundaki Helm chart'tan gelir — bu repo bunları sağlamaz.
:::

## Timeout Bütçe Hiyerarşisi

Başlangıçta doğrulanan (`WorkflowExecutionOptionsValidator`, fail-fast) katmanlı bütçe kuralı:

```
Python:MaxTimeoutSeconds < ExecutionApi:InvocationTimeoutSeconds < WorkflowExecution:TransitionJobTimeoutSeconds < (chain lock lease)
```

- `Python:MaxTimeoutSeconds`, Dapr çağrısının Python cleanup'ından ve response propagation'ından **daha kısa** olmalıdır → `ExecutionApi:InvocationTimeoutSeconds`'tan küçük olmak zorunda.
- `ExecutionApi:InvocationTimeoutSeconds`, tek bir task invocation'ının tüm job yürütme bütçesini tüketmemesi için `WorkflowExecution:TransitionJobTimeoutSeconds`'tan küçük olmak zorunda.
- `WorkflowExecution:TransitionJobTimeoutSeconds`, chain lock lease süresinden (`TransitionLockLeaseSeconds` veya türetilmiş varsayılanı) küçük olmak zorunda — kilit, job bütçesini ve timeout-recovery yolunu **aşmalıdır**.

Hiyerarşi ihlal edilirse uygulama **boot'ta başarısız olur** (`ValidateOnStart`), production'da bir race window olarak ortaya çıkmak yerine.

## İlgili

- [Python Task](/docs/components/tasks/python) — task kontratı ve hata sınıfları
- [Server Timeout Yapılandırması](./server-timeout)
- Runtime dokümanı: [python-task.md (vnext)](https://github.com/burgan-tech/vnext/blob/master/docs/runtime/python-task.md)
