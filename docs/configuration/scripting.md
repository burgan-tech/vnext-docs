---
sidebar_position: 5
title: Scripting / Sandbox
description: vNext Scripting helper ve Sandbox yapılandırması — izinli/banlı assembly'ler, default using ve referanslar
---

# Scripting / Sandbox Yapılandırması

vNext script motoru (mapping, rule, timer, vb.), helper bileşenlerini ve sandbox güvenlik sınırlarını platform seviyesinde `Scripting` bloğu ile yapılandırır.

```json
{
  "Scripting": {
    "Helpers": {
      "Enabled": true
    },
    "Sandbox": {
      "Enabled": true,
      "AllowUnsafe": false,
      "PluginDirectory": "/app/assemblies",
      "AllowedAssemblies": [
        "System.Private.CoreLib",
        "System.Runtime",
        "System.Collections",
        "System.Linq",
        "System.Linq.Expressions",
        "System.Text.RegularExpressions",
        "Microsoft.CSharp",
        "netstandard"
      ],
      "BannedNamespaces": []
    }
  }
}
```

## Alanlar

| Alan | Tip | Açıklama |
|------|-----|----------|
| `Helpers.Enabled` | boolean | `sys-mappings` helper'larının ([Mapping Bileşeni](/docs/components/mapping-component)) script bağlamına dahil edilmesini açar/kapatır |
| `Sandbox.Enabled` | boolean | Sandbox güvenlik kısıtlamalarını etkinleştirir |
| `Sandbox.AllowUnsafe` | boolean | `unsafe` kod bloklarına izin (varsayılan `false`) |
| `Sandbox.PluginDirectory` | string | Plugin/3. parti assembly'lerin yüklendiği dizin (varsayılan `/app/assemblies`) |
| `Sandbox.AllowedAssemblies` | string[] | Script bağlamına izinli .NET assembly'leri (taban allow-list) |
| `Sandbox.BannedNamespaces` | string[] | Ek olarak yasaklanan namespace'ler (varsayılan ban listesine eklenir) |

:::info[Allow-list nasıl genişler?]
Mapping objelerindeki ve flow-level `attributes.scripts.allowedAssemblies` değerleri, bu taban allow-list'e **eklenir**. Yani bir helper'ın ihtiyaç duyduğu assembly (ör. `Newtonsoft.Json`) global ayara dokunmadan ilgili bileşende bildirilebilir. Bkz. [Mapping Bileşeni](/docs/components/mapping-component).
:::

## Varsayılan Yasak (Ban) Listesi

Sandbox etkinken aşağıdaki namespace'ler varsayılan olarak yasaktır:

```plaintext
System.IO
System.Net
System.Net.Http
System.Diagnostics
System.Reflection
System.Runtime.InteropServices
Microsoft.Win32
```

**Spesifik izin (allow):** `System.Reflection.MemberInfo.Name` — yasak `System.Reflection`'a rağmen bu üyeye erişime izin verilir.

## Varsayılan `using`'ler

Her script bağlamına otomatik eklenen namespace'ler:

```csharp
System
System.Linq
System.Collections.Generic
System.Threading
System.Threading.Tasks
System.Dynamic
System.Text.Json
System.Text.Json.Serialization
System.Text.Encodings.Web
System.Text.Unicode
BBT.Workflow.Shared
BBT.Workflow.Scripting
BBT.Workflow.Definitions
BBT.Workflow.Instances
BBT.Workflow.Runtime
BBT.Workflow.Scripting.Functions
BBT.Workflow.Definitions.Timer
System.Xml
System.Xml.Linq
```

## Varsayılan Referanslar

Script derlemesine otomatik eklenen metadata referansları (özet):

- Core runtime: `System.Private.CoreLib` (`object`), `System.Runtime`, `System.Collections` (`Dictionary<,>`), `Task`
- `dynamic` desteği: `Microsoft.CSharp` (`CSharpArgumentInfo`), `System.Linq.Expressions` (`System.Dynamic.ExpandoObject`)
- Workflow SDK: `IMapping`, `TimerSchedule`, `ScriptBase`
- Domain temel tipleri: `BBT.Aether.Domain` (`AggregateRoot<>`, `Entity<>` — `Instance` üzerinden miras alınan `Id`/`CreationTime` vb. üyeler)
- JSON / encoding / XML: `JsonSerializableAttribute`, `JavaScriptEncoder`, `XmlDocument`, `XDocument`

:::note
`System.Linq.Expressions` ve `System.Dynamic.ExpandoObject`, mapping'lerin `dynamic` anahtar kelimesine (Handler `dynamic` döner, `ScriptContext.Body` `dynamic`) bağımlı olduğu için sandbox altında dahi daima referanslanır.
:::

## İlgili

- [Mapping Bileşeni (sys-mappings)](/docs/components/mapping-component) — helper bileşenleri, `scripts`, `REF`
- [Mapping Rehberi](/docs/components/mappings) — script yazımı ve `ScriptContext`
- [Interfaces](/docs/components/interfaces) — SDK arayüz sözleşmeleri
