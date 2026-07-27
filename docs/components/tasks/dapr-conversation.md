---
sidebar_position: 15
title: Dapr Conversation Task
description: Dapr Conversation building block üzerinden LLM/AI sağlayıcı çağrısı yapan task
---

# Dapr Conversation Task (Type: `20`)

Dapr Conversation Task (`type: "20"`), bir **LLM/AI sağlayıcısını** Dapr'ın **Conversation building block**'u üzerinden çağırır. Böylece iş akışları; OpenAI, Anthropic, AWS Bedrock gibi sağlayıcılara **sağlayıcı-bağımsız** tek bir arayüzle prompt gönderebilir — diğer Dapr task türlerinin kullandığı aynı Dapr sidecar üzerinden.

Sağlayıcı seçimi ve kimlik bilgileri **domain'e ait** bir Dapr `conversation` component'inde (ör. `openai`) tanımlanır; task yalnızca o component'in adını (`componentName`) ve mesajları (`inputs`) referans verir. Runtime bileşenini eklemek için bkz. [vnext-helm-charts #28](https://github.com/burgan-tech/vnext-helm-charts/pull/28).

## Görev Tanımı

> **Schema:** `task-definition.schema.json`

```json
{
  "key": "summarize-complaint",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["ai", "llm", "conversation"],
  "attributes": {
    "type": "20",
    "config": {
      "componentName": "openai",
      "inputs": [
        { "role": "system", "content": "Sen bir müşteri şikayeti özetleyicisisin." },
        { "role": "user", "content": "Şikayet metnini 2 cümlede özetle." }
      ],
      "parameters": {
        "model": "gpt-4o-mini",
        "maxTokens": "512"
      },
      "temperature": 0.2,
      "scrubPII": true,
      "timeoutSeconds": 30
    }
  }
}
```

## Konfigürasyon Alanları

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `componentName` | string | **Evet** | — | Dapr conversation component adı (yapılandırılmış LLM sağlayıcısı), ör. `openai` |
| `inputs` | array | Hayır | — | Konuşma girdileri: `role`/`content` mesajlarından oluşan dizi (aşağıya bakın) |
| `parameters` | object | Hayır | — | Sağlayıcıya özgü **string** parametreler (ör. `model`, `maxTokens`). Component'e olduğu gibi iletilir |
| `metadata` | object | Hayır | — | İstekle iletilen Dapr component metadata'sı (string değerler) |
| `contextId` | string | Hayır | — | Durumlu (stateful) bir konuşmayı sürdürmek için bağlam tanımlayıcısı |
| `temperature` | number | Hayır | — | Örnekleme sıcaklığı (sampling temperature) |
| `scrubPII` | boolean | Hayır | — | `true` ise sağlayıcıdan prompt ve yanıtlarda PII temizliği (scrub) istenir |
| `timeoutSeconds` | integer | Hayır | `30` | Timeout süresi (saniye, minimum: 1) |

### `inputs` Mesaj Yapısı

Her girdi bir rol/içerik mesajıdır:

```json
{ "role": "user", "content": "...", "scrubPII": true, "name": "opsiyonel" }
```

| Alan | Değerler | Açıklama |
|------|----------|----------|
| `role` | `user`, `system`, `assistant`, `developer`, `tool` | Mesajın rolü |
| `content` | string | Mesaj içeriği |
| `scrubPII` | boolean (ops.) | Bu mesaj için PII temizliği |
| `name` | string (ops.) | Mesaj için opsiyonel ad |

## Property Erişimi

Değerler çoğunlukla statik konfigürasyon yerine input mapping içinde dinamik olarak atanır.

| Property | Setter Metodu | Açıklama |
|----------|---------------|----------|
| `ComponentName` | `SetComponentName(string componentName)` | Conversation component adı |
| `Inputs` | `SetInputs(dynamic inputs)` | Mesaj dizisi |
| `Parameters` | `SetParameters(Dictionary<string, string?> parameters)` | Sağlayıcı parametreleri |
| `Metadata` | `SetMetadata(Dictionary<string, string?> metadata)` | Component metadata'sı |
| `ContextId` | `SetContextId(string? contextId)` | Bağlam tanımlayıcısı |
| `Temperature` | `SetTemperature(double? temperature)` | Örnekleme sıcaklığı |
| `ScrubPII` | `SetScrubPII(bool? scrubPII)` | PII temizliği |
| `TimeoutSeconds` | `SetTimeoutSeconds(int? timeoutSeconds)` | Timeout süresi |

Input mapping örneği:

```csharp
public class SummarizeComplaintMapping : ScriptBase, IMapping
{
    public Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
    {
        var conversation = task as DaprConversationTask;
        conversation.SetComponentName("openai");
        conversation.SetInputs(new[]
        {
            new { role = "system", content = "Sen bir müşteri şikayeti özetleyicisisin." },
            new { role = "user", content = (string)context.Instance.Data.complaintText }
        });
        conversation.SetParameters(new Dictionary<string, string?>
        {
            ["model"] = "gpt-4o-mini",
            ["maxTokens"] = "512"
        });
        return Task.FromResult(new ScriptResponse());
    }

    public Task<ScriptResponse> OutputHandler(ScriptContext context)
    {
        var summary = context.Body?.outputs?[0]?.result;
        return Task.FromResult(new ScriptResponse { Data = new { summary } });
    }
}
```

## Standart Yanıt

Yanıt, sağlayıcının döndürdüğü çıktı(lar)ı `outputs` altında taşır:

```json
{
  "Data": {
    "outputs": [
      { "result": "Müşteri, kartının teslim edilmediğini ve çağrı merkezine ulaşamadığını bildiriyor." }
    ]
  },
  "StatusCode": 200,
  "IsSuccess": true,
  "ErrorMessage": null,
  "TaskType": "20"
}
```

## İlgili

- [Tasks Genel Bakış](/docs/components/tasks/) — tüm task türleri ve referans mekanizması
- [DaprService Task](/docs/components/tasks/dapr-service) — aynı Dapr sidecar üzerinden service invocation
- Schema kaynağı: [task-definition.schema.json (vnext-schema)](https://github.com/burgan-tech/vnext-schema/blob/master/schemas/task-definition.schema.json)
- Helm component: [vnext-helm-charts #28](https://github.com/burgan-tech/vnext-helm-charts/pull/28)
