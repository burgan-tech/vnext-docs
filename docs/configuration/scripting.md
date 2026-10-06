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
    "SecretCache": {
      "Enabled": true,
      "TtlSeconds": 30
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
        "System.ObjectModel",
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
| `SecretCache.Enabled` | boolean | Secret helper'larının (`GetSecret`/`GetSecrets`) process-wide bundle cache'ini açar/kapatır (varsayılan `true`) |
| `SecretCache.TtlSeconds` | integer | Cache'lenmiş secret bundle'ının ömrü, saniye (varsayılan `30`) |
| `Sandbox.Enabled` | boolean | Sandbox güvenlik kısıtlamalarını etkinleştirir |
| `Sandbox.AllowUnsafe` | boolean | `unsafe` kod bloklarına izin (varsayılan `false`) |
| `Sandbox.PluginDirectory` | string | Plugin/3. parti assembly'lerin yüklendiği dizin (varsayılan `/app/assemblies`) |
| `Sandbox.AllowedAssemblies` | string[] | Script bağlamına izinli .NET assembly'leri (taban allow-list). v0.0.99'da tabana `System.ObjectModel` eklendi — `ExpandoObject` üzerinde `foreach` önceden `CS0012` ile derlenemiyordu |
| `Sandbox.BannedNamespaces` | string[] | Ek olarak yasaklanan namespace'ler (varsayılan ban listesine eklenir) |

:::info[Allow-list nasıl genişler?]
Mapping objelerindeki ve flow-level `attributes.scripts.allowedAssemblies` değerleri, bu taban allow-list'e **eklenir**. Yani bir helper'ın ihtiyaç duyduğu assembly (ör. `Newtonsoft.Json`) global ayara dokunmadan ilgili bileşende bildirilebilir. Bkz. [Mapping Bileşeni](/docs/components/mapping-component).
:::

## `allowedAssemblies` Publish Kontrolü

v0.0.99'dan itibaren `scripts.allowedAssemblies` bildiren bileşenler (flow seviyesinde veya herhangi bir script slot'unda) **publish sırasında** denetlenir. Kapsam: `sys-flows`, `sys-tasks`, `sys-functions`, `sys-extensions` — **`sys-mappings` hariç**.

- Her **basit assembly adı** (uzantısız, ör. `Newtonsoft.Json`) ya bir framework (TPA) assembly'si olarak ya da `Sandbox.PluginDirectory` içindeki bir DLL olarak çözülmelidir.
- Çözülemezse publish `400` döner:

  ```plaintext
  Assembly '{name}' declared in '{member}' is not available in this runtime (neither a framework assembly nor in the plugin directory). Use the simple assembly name without extension, or have the assembly mounted by the platform team.
  ```

  `member` hatanın yerini gösterir, ör. `sys-flows.states[0].onEntries[1].mapping.scripts.allowedAssemblies[0]`.
- Kontrol **`Sandbox.Enabled=false` olsa bile** çalışır: önceden zararsız olan eski/yanlış adlar bir sonraki publish'te `400` üretir — domain paketlerinizi yükseltmeden önce bildirilen adları temizleyin.
- Hiçbir script derlenmez; helper/`REF` referansları çözülmez. Bildirilmemiş bir assembly ihtiyacı hâlâ çalışma anında hata verir.
- Plugin dizini process başına bir kez okunur; yeni bir DLL mount edildiğinde host'u yeniden başlatın.

## Secret Cache

`GetSecret`/`GetSecrets` helper'ları, Dapr secret store'a her çağrıda gitmek yerine process-wide bir **bundle cache** kullanır: anahtar `(storeName, secretStore)` çiftidir, aynı bundle'a eşzamanlı isteyen çağrılar tek bir yükleme paylaşır (single-flight). **Hata cache'lenmez** — bir okuma başarısız olursa bir sonraki çağrı yeniden dener. Rotasyon sonrası bundle en fazla `TtlSeconds` kadar bayat kalabilir; Redis'e (veya başka bir dağıtılmış depoya) gitmez, yalnızca process içi bir cache'tir.

Kritik gecikmeye duyarlı yollarda (ör. `InputHandler` içinde her çağrıda secret okuma) senkron `GetSecret` yerine `GetSecretAsync` tercih edin — cache miss'te senkron API thread'i bloklar.

## Script Compile Cache

Derlenen script'ler içerik hash'ine (SHA-256) göre cache'lenir; aynı içerik ikinci kez derlenmez. Eşzamanlı isteyen çağrılar tek bir derlemeyi paylaşır (single-flight, async). **Hatalı bir derleme cache'lenmez** — bir sonraki çağrı yeniden derlemeyi dener.

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
