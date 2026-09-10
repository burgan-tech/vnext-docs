---
sidebar_position: 4
title: Python Task
description: Execution servisinde CPython çalıştıran, main(input) kontratlı built-in trusted-code task
---

# Python Task (Type: `23`) <sup>New</sup> v0.0.88

:::info[Experimental]
Python Task deneysel (`experimental`) statüdedir. Kontrat ve konfigürasyon alanları sürüm içinde değişebilir.
:::

Python Task, Orchestration'ın gönderdiği sabit bir JSON girdisini Execution servisinde çalışan CPython üzerinden işleyen **built-in trusted-code** task türüdür. Python kodu, imzası tam olarak `main(input)` olan **tek bir çağrılabilir giriş noktası** tanımlamalıdır:

```python
def main(input):
    return {"total": sum(input["values"])}
```

Python Task, Orchestration `InputHandler`/`OutputHandler` mapping'lerini **çalıştırmaz** — script'in `input_handler`/`output_handler` fonksiyonları da yoktur. Tek çalıştırılabilir kontrat, Execution servisindeki `main(input)`'dir. Tam JSON argümanı `config.input` alanına yazılır; strict JSON dönüş değeri standart task sonucu olur.

Argüman ve dönüş değeri runtime sınırını **JSON olarak** geçer; kod ve girdi hiçbir zaman birleştirilmez (concatenate edilmez). Dönüş değeri `json.dumps(..., allow_nan=False)` ile kabul edilebilir olmalıdır. NumPy/pandas nesneleri script içinde `.item()`, `.tolist()` veya `.to_dict()` ile dönüştürülmelidir.

## Görev Tanımı

> **Schema:** `task-definition.schema.json`

```json
{
  "key": "calculate-order-summary",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["python", "calculation"],
  "attributes": {
    "type": "23",
    "config": {
      "script": {
        "location": "calculate_order_summary.py",
        "code": "def main(input):\n    return {'total': sum(input['values'])}",
        "type": "LOC",
        "encoding": "NAT"
      },
      "executionMode": "pythonNet",
      "input": { "values": [2, 3, 5] },
      "timeoutSeconds": 30
    }
  }
}
```

## Konfigürasyon Alanları

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `script` | object | Evet | - | Var olan `ScriptCode` şekli. Yalnızca `NAT` ve `B64` encoding kabul edilir; `REF`, global mapping referansları ve dosya sistemi yolları **reddedilir**. `location` yalnızca teşhis amaçlı metadata'dır — yüklenecek bir dosya değildir |
| `script.code` | string | Evet | - | Python kaynak kodu (`NAT` = düz metin, `B64` = Base64) |
| `script.type` | string | Evet | - | `LOC` (inline kod) |
| `script.encoding` | string | Evet | - | `NAT` veya `B64` |
| `executionMode` | string | Hayır | `Python:DefaultMode` | `pythonNet`, `process` veya `container` — bkz. [§ Çalıştırma Modları](#çalıştırma-modları). Devre dışı veya kullanılamayan bir mod **fallback yapmadan** task'ı başarısız kılar |
| `input` | any (JSON) | Hayır | - | `main(input)`'e aynen geçen herhangi bir JSON değeri (null, scalar, array, object) |
| `timeoutSeconds` | integer | Hayır | 30 | Üst sınır `Python:MaxTimeoutSeconds` (varsayılan 50) — bkz. [Python Yapılandırması](../../configuration/python) |

## Çalıştırma Modları

| `executionMode` | İzolasyon ve limitler | Varsayılan eşzamanlılık |
|---|---|---|
| `pythonNet` | Process-in CPython 3.12, GIL altında, her çağrı için taze bir Python scope'u. Timeout kesintisi best-effort'tur; native extension'lar zorla durdurulamaz, memory/CPU limitleri garanti edilmez | 1 |
| `process` | `python -I runner.py`, paylaşılan JSON protokolü ile. Timeout veya iptal process ağacını öldürür. Linux'ta CPU, adres-alanı ve açık-dosya limitleri için `prlimit` kullanılır | 2 |
| `container` | Her çağrı için yeni, sertleştirilmiş bir runner container'ı; açıkça seçilmiş Docker Engine veya Kubernetes driver'ı tarafından kontrol edilir. `finally` bloğunda her zaman kaldırılır | 2 |

Container driver varsayılan olarak 1 CPU, 2 GiB bellek, 128 PID, read-only root filesystem, tmpfs `/tmp`, UID/GID 65532, düşürülmüş capability'ler, `no-new-privileges`, host mount yok ve network `none` ile çalışır.

Devre dışı veya kullanılamayan bir mod **başka bir moda asla fallback yapmaz** — task doğrudan başarısız olur.

## Limitler

Varsayılan limitler (Execution host'ta konfigüre edilebilir — bkz. [Python Yapılandırması](../../configuration/python)):

| Limit | Varsayılan |
|---|---|
| Decode edilmiş kod boyutu | 256 KiB |
| Girdi boyutu | 2 MiB |
| Çıktı boyutu | 2 MiB |
| Yakalanan stdout | 32 KiB |
| Yakalanan stderr | 32 KiB |
| `timeoutSeconds` üst sınırı | 50 saniye (`Python:MaxTimeoutSeconds`) |

## Hata Sınıfları

Aşağıdaki durumların **hepsi** standart task failure + error-boundary akışına girer; transition-pipeline'da Python'a özel bir davranış yoktur:

- Syntax hatası
- `main` yok veya çağrılabilir değil
- Python exception'ı
- Geçersiz JSON dönüş değeri
- `NaN` (strict JSON `allow_nan=False` ihlali)
- Çıktı boyutu limiti aşımı (overflow)
- Timeout
- İptal (cancellation)
- Devre dışı veya kullanılamayan `executionMode`

## Paketler ve importlar

Execution venv'i ve `ghcr.io/burgan-tech/vnext/python-runner:<version>` container image'ı **aynı hash-locked** `execution/python/requirements.lock` dosyasını kurar. Başlangıç paket seti: **NumPy 2.5.1**, **pandas 3.0.5**, **scikit-learn 1.9.0** (kilitli transitive bağımlılıklarıyla birlikte). Runtime'da paket kurulumu devre dışıdır (`PIP_NO_INDEX=1`) — lock dosyası yalnızca build zamanında güncellenir ve gözden geçirilir.

`Python:AllowedModules` varsayılan olarak `["*"]`'dır. Daraltılmış bir liste her modda (dinamik import'lar dahil) paylaşılan runner bootstrap'ı tarafından uygulanır. Bu bir **yönetişim politikasıdır, güvenlik sınırı değildir** — Python task kaynağı güvenilir platform kodudur. Güvenilmeyen girdi için Python.NET kullanılmamalıdır; bunun için bu özelliğin dışında, bağımsız olarak güvenli bir izolasyon sınırı kullanılmalıdır.

## Orchestration mapping'leri ile ilişki

Python Task, diğer task türlerinden farklı olarak `InputHandler`/`OutputHandler` mapping'lerini **çalıştırmaz**. `config.input` alanı ile `main(input)`'in dönüş değeri, task'ın girdi/çıktısının **tamamıdır** — script tarafında ayrıca bir `input_handler`/`output_handler` fonksiyonu tanımlamanın bir etkisi yoktur.

:::warning[Şema paketi type `23`'ü henüz taşımıyor]
`@burgan-tech/vnext-schema@0.0.53` paketindeki `task-definition.schema.json`, `attributes.type` enum'ında `23` değerini **içermiyor**. Bu nedenle domain paketlerinde `npm run validate` bir Python task tanımını **reddeder**; runtime tarafında `publish` ve çalıştırma sorunsuz çalışır.
:::

Execution host `Python:*` konfigürasyonunun tam alan referansı (env var biçimi, timeout bütçe hiyerarşisi, container/Kubernetes ayarları dahil) için: [Python Yapılandırması](../../configuration/python).

## Örnek Component

[`vnext-example` reposu](https://github.com/burgan-tech/vnext-example) içinde Python task'a özel bir örnek henüz eklenmedi — örnek eklenecek.

## İlgili

- [Tasks Genel Bakış](/docs/components/tasks/) — task türleri ve referans mekanizması
- [Python Yapılandırması](../../configuration/python) — `Python:*` appsettings alan referansı
- [Hata Yönetimi](/docs/how-to/error-handling) — `errorBoundary` kuralları
- Runtime dokümanı: [python-task.md (vnext)](https://github.com/burgan-tech/vnext/blob/master/docs/runtime/python-task.md)
