---
sidebar_position: 3
title: Script Task
description: C# Roslyn ile inline kod çalıştıran task
---

# Script Task (Type: `7`)

Script Task, C# Roslyn çalışma zamanında .NET kodu çalıştırmak için kullanılan görev türüdür. Instance data üzerinde **iş mantığı**, **hesaplama** ve **veri dönüşümü** işlemleri gerçekleştirmek için kullanılır.

## Ana Kullanım Amacı

- Instance data (master data) üzerinde iş mantığı uygulamak
- Hesaplama işlemleri gerçekleştirmek
- Veriyi sonraki state'ler için hazırlamak
- Karmaşık iş kurallarını kodla implement etmek

:::warning[Önemli Kısıtlamalar]

- **Uzak servis çağrıları yapmayın** (HTTP, API, Database vb.)
- **Blokaj yaratacak işlemler kullanmayın**
- **Sadece basit, hızlı hesaplama ve iş mantığı kodları yazın**

:::

## Görev Tanımı

> **Schema:** `task-definition.schema.json`

```json
{
  "key": "data-processing-script",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["calculation", "business-logic"],
  "attributes": {
    "type": "7",
    "config": {}
  }
}
```

## Konfigürasyon Alanları

Script Task'ın `config` bölümü boş bir object'tir (`{}`). Task'a özgü ek konfigürasyon alanı yoktur. Tüm iş mantığı mapping script dosyasında tanımlanır.

## Property Erişimi

`ScriptTask` sınıfı, base `WorkflowTask` dışında ek property içermez. Script dosyaları `IMapping` arayüzünü implement eden bir class içermelidir:

```csharp
using System;
using System.Threading.Tasks;
using BBT.Workflow.Definitions;
using BBT.Workflow.Scripting;

public class CustomScript : IMapping
{
    public async Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
    {
        return new ScriptResponse();
    }

    public async Task<ScriptResponse> OutputHandler(ScriptContext context)
    {
        var data = context.Instance.Data;
        var output = new ScriptResponse();
        output.Data = new { /* hesaplama sonuçları */ };
        return output;
    }
}
```

## Standart Yanıt

Script Task, `ScriptResponse` sınıfını doğrudan döner.
