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
      "PluginRescanIntervalSeconds": 30,
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
| `Sandbox.PluginDirectory` | string | Plugin/3. parti assembly'lerin yüklendiği dizin (varsayılan `/app/assemblies`; Helm: `orchestrator.plugins`). Bkz. [Plugin'ler](#pluginler) |
| `Sandbox.PluginRescanIntervalSeconds` | integer | <sup>New</sup> v0.0.100 — Listede bulunamayan bir ad yüzünden `PluginDirectory`'nin iki yeniden okunması arasındaki en kısa süre, saniye (varsayılan `30`; `0` = her ıskalamada yeniden oku). Bir kez bulunan ad bir daha okunmaz |
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
- Listede olmayan bir ad plugin dizinini yeniden okutur (en fazla `PluginRescanIntervalSeconds`'ta bir). <sup>New</sup> v0.0.100 — Açılıştan sonra mount edilen bir DLL restart gerekmeden bulunur. DLL gelmeden önce reddedilmiş bir bileşen **yeniden publish edilmelidir**. (v0.0.99'da dizin process başına bir kez okunuyordu ve yeni DLL için restart gerekiyordu.)

## Plugin'ler

Bileşen başına DLL yükleme ya da nupkg indirme yoktur. Platform ekibi onaylı DLL'leri `Sandbox.PluginDirectory`'ye (Docker volume; Helm `orchestrator.plugins`) mount eder; script'ler bunları `AllowedAssemblies` ya da bileşenin `scripts.allowedAssemblies` alanıyla kullanır. Yasak namespace analizörü script kaynağına uygulanır, plugin'in kendisine uygulanmaz: bir veritabanı sürücüsü mount etmek, onu listeleyen her mapping'e veritabanı (ağ) erişimi verir.

<sup>New</sup> v0.0.100 — Plugin yükleme davranışı:

- **Process başına bir kez.** Plugin DLL'leri plugin dizini başına tek, unload edilmeyen bir yükleme bağlamında tutulur. Tüm script'ler ve helper set'leri her plugin'in **tek kopyasını** paylaşır: tek static state, veritabanı sürücüsü için tek connection pool. Helper'ı yeniden publish etmek eski kopyanın yanına yeni bir kopya yüklemez.
- **Helper'lı ya da helper'sız.** Bir mapping plugin tipini doğrudan kullanabilir; arada bir `sys-mappings` helper'ı gerekmez. (Önceden yalnız helper set'leri plugin'leri önceden yüklüyordu; helper'sız mapping derleniyor ama çalışma anında `FileNotFoundException` veriyordu.)
- **DLL eklemek ve değiştirmek.** Açılıştan sonra dizine eklenen DLL restart gerekmeden bulunur (bkz. `PluginRescanIntervalSeconds`). Yüklenmiş bir DLL'i yeni sürümle **değiştirmek ya da kaldırmak restart gerektirir**: process yüklediği kopyayı tutar. DLL gelmeden önce publish'te reddedilmiş bir bileşen yeniden publish edilmelidir.
- **İptal.** Sürücü çağıran bir script `context.CancellationToken`'ı (istek / job / event token'ı; yoksa `CancellationToken.None`) sürücüye geçirmelidir; aksi halde iptal edilen bir işlemin sorgusu yalnız sürücünün kendi komut timeout'uyla sınırlanır. Bkz. [Interface'ler → ScriptContext](/docs/components/interfaces).
- **Yükleme hataları** `Warning` seviyesinde loglanır (EventId `60017`–`60018`); yüklenemeyen DLL atlanır.

```csharp
// Helper'sız mapping, plugin sürücüsünü doğrudan kullanır
await using var conn = new NpgsqlConnection(connectionString);
await conn.OpenAsync(context.CancellationToken);
```

:::warning Sürücü bağımlılıkları
- Runtime'ın zaten taşımadığı **tüm bağımlılık zincirini** mount edin.
- Platforma özgü build taşıyan paketlerde (ör. `Microsoft.Data.SqlClient`) NuGet paketinin `runtimes/unix/lib/<tfm>/` kopyasını ya da `dotnet publish -r linux-x64` çıktısını kullanın; `lib/` altındaki kopya `PlatformNotSupportedException` fırlatan bir stub'tır.
- SqlClient bazı sürümlerde `DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1` ile çalışmaz; Alpine imajlarda ICU gerekir.
- Runtime'ın kendi taşıdığı bir ad (framework veya host bağımlılığı — Npgsql, `Microsoft.Extensions.*` …) host'un kopyasına karşı derlenir.
:::

Çalışan örnek ve uçtan uca test: vnext-example [`plugins/ScriptPluginLab.Sql`](https://github.com/burgan-tech/vnext-example/tree/master/plugins/ScriptPluginLab.Sql) (Npgsql + Dapper, PostgreSQL) ve [`tests/Core.IntegrationTests/Tests/ScriptPluginLab`](https://github.com/burgan-tech/vnext-example/tree/master/tests/Core.IntegrationTests/Tests/ScriptPluginLab).

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
