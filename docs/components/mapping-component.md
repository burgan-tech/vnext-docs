---
sidebar_position: 6
title: Mapping Bileşeni
description: vNext Mapping bileşeni (sys-mappings) — yeniden kullanılabilir, versiyonlanabilir script helper'ları, scripts referansları ve REF encoding
---

# Mapping Bileşeni (sys-mappings)

**Mapping** bileşeni, script mapping kodunu **yeniden kullanılabilir** ve **versiyonlanabilir** helper'lara dönüştürür. Tekrar eden dönüşüm/yardımcı kodun (JSON serialize, kripto, format vb.) tek bir yerde tanımlanıp birçok bileşenden referansla kullanılmasını sağlar. Ayrıca **plugin** özelliğiyle 3. parti kütüphane/DLL'leri (assembly) script bağlamına dahil ederek, business-case'lerdeki ayrı "utility API" ihtiyacını ortadan kaldırır.

> **Schema:** [`vnext-schema/mapping-definition.schema.json`](https://github.com/burgan-tech/vnext-schema) · Flow: `sys-mappings`

Bir Mapping bileşeni iki şekilde tüketilir:

1. **`scripts.helpers[]`** ile — helper sınıfı, tüketen bileşenin script bağlamına dahil edilir ve kodun içinden çağrılır (ör. `JsonHelper.Serialize(...)`).
2. **`encoding: "REF"`** ile — bir mapping objesinin kodu, gömülü string yerine bu bileşene **referans** olur.

## Tanım JSON Örneği

> **Schema:** `mapping-definition.schema.json`

```json
{
  "key": "json-helper",
  "version": "1.0.0",
  "flow": "sys-mappings",
  "domain": "core",
  "flowVersion": "1.0.0",
  "tags": ["helper", "json"],
  "attributes": {
    "name": "JsonHelper",
    "location": "./src/JsonHelper.csx",
    "code": "using Newtonsoft.Json;\n\nnamespace Acme.Helpers;\n\npublic static class JsonHelper\n{\n    public static string Serialize(object value) => JsonConvert.SerializeObject(value);\n}",
    "encoding": "NAT"
  }
}
```

---

## Properties

### Top-Level Alanlar

| Alan | Tip | Zorunlu | Pattern / Kısıt | Açıklama |
|------|-----|---------|-----------------|----------|
| `$schema` | string | Hayır | URI | JSON Schema referansı |
| `key` | string | **Evet** | `^[a-z0-9-]+$` | Mapping'in benzersiz tanımlayıcısı |
| `version` | string | **Evet** | SemVer | `Major.Minor.Patch` |
| `domain` | string | **Evet** | `^[a-z0-9-]+$` | Ait olduğu domain |
| `flow` | string | **Evet** | Sabit: `sys-mappings` | Flow tanımlayıcısı |
| `flowVersion` | string | **Evet** | SemVer | Flow versiyonu |
| `tags` | string[] | **Evet** | `minItems: 1` | Etiketler |
| `_comment` | string | Hayır | — | Açıklama / yorum |
| `attributes` | object | **Evet** | — | Mapping tanımı (aşağıda) |

### `attributes` Alanları

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `name` | string | **Evet** | — | Helper/sınıf adı (ör. `JsonHelper`). `minLength: 1` |
| `location` | string | Hayır | — | Kod dosyası yolu (pattern: `^\./.*\.csx$`) |
| `code` | string | **Evet** | — | Mapping kodu içeriği (`location`'dan beslenirken boş olabilir) |
| `encoding` | string | Hayır | `B64` | Kodlama formatı — aşağıdaki enum |

### `encoding` Enum Değerleri

| Değer | Açıklama |
|-------|----------|
| `B64` | Base64 kodlanmış kod |
| `NAT` | Doğrudan (native) C# kodu |

:::caution[sys-mappings `REF` olamaz]
Mapping bileşeninin `encoding` değeri yalnızca `B64` veya `NAT` olabilir. **`REF` kullanılamaz** — çünkü sys-mappings bileşeninin kendisi referans **hedefidir** ve kendine referans veremez.
:::

---

## Scripts: Helper Referansları ve İzinli Assembly'ler

Diğer bileşenlerin mapping objelerinde (ve workflow flow-level `attributes`'ında) `scripts` objesi, bu bileşene helper olarak başvurur:

```json
"scripts": {
  "helpers": [
    { "key": "json-helper", "version": "1.0.0", "domain": "core", "flow": "sys-mappings" }
  ],
  "allowedAssemblies": ["Newtonsoft.Json"]
}
```

| Alan | Tip | Açıklama |
|------|-----|----------|
| `helpers` | array | sys-mappings bileşenlerine referans (`key`, `version`, `domain`, `flow: "sys-mappings"`). Helper sınıfları script bağlamına dahil edilir |
| `allowedAssemblies` | string[] | Script yürütme bağlamı için izin verilen .NET assembly'leri (sandbox allow-list'e eklenir) |

`allowedAssemblies` ile sandbox allow-list arasındaki ilişki ve varsayılan ban listesi için bkz. [Scripting / Sandbox Yapılandırması](/docs/configuration/scripting).

**Flow-level scripts:** Bir helper veya assembly tüm flow boyunca gerekiyorsa workflow `attributes.scripts` altında tanımlanır — bkz. [Workflow → Scripts](/docs/components/workflow#scripts-helpers--allowed-assemblies).

---

## REF Encoding ile Referans Kullanımı

Bir mapping/scriptCode objesi, gömülü kod yerine bir sys-mappings bileşenine referans verebilir. `encoding: "REF"` olduğunda `code`, bir **referans objesidir**:

```json
"mapping": {
  "encoding": "REF",
  "code": {
    "key": "initial-mapping",
    "version": "1.0.0",
    "flow": "sys-mappings",
    "domain": "core"
  }
}
```

- `code` referans objesi (mappingRef): `key`, `version`, `domain`, `flow: "sys-mappings"`.
- sys-mappings bileşeninin kendisi `REF` olamaz (self-ref yasağı).
- **Forge Studio**'da `REF` seçildiğinde bir pickup dialog ile mevcut sys-mappings bileşenleri listelenir; diğer referans alanlarında olduğu gibi seçme, mevcut seçimi kaldırma veya yeni bileşen oluşturma yapılabilir (bkz. [Forge Studio](/docs/tools/forge-studio)).

`REF`, aşağıdaki tüm mapping objelerinde geçerlidir: transition mapping, rule, timer, viewRule, subflow mapping, task/extension/function mapping.

---

## Örnek Bileşenler

| Örnek | Ne yapar | İzin verilen assembly |
|-------|----------|------------------------|
| [`json-helper`](https://github.com/burgan-tech/vnext-example/blob/master/core/Mappings/account-opening/json-helper.json) | `JsonHelper.Serialize(...)` (Newtonsoft.Json) | `Newtonsoft.Json` |
| [`rsa-crypto`](https://github.com/burgan-tech/vnext-example/blob/master/core/Mappings/account-opening/rsa-crypto.json) | `RsaCryptoHelper.Encrypt/Decrypt` (RSA OAEP-SHA256) | `System.Security.Cryptography` |
| [`initial-mapping`](https://github.com/burgan-tech/vnext-example/blob/master/core/Mappings/account-opening/initial-mapping.json) | `ITransitionMapping` — start transition input mapping (REF hedefi) | — |

---

## Bileşen Ağacı ve Yapılandırma

Mapping bileşenleri domain altında `Mappings/` klasöründe yer alır:

```plaintext
<domain>/
├── Extensions/
├── Functions/
├── Schemas/
├── Tasks/
├── Views/
├── Mappings/        # sys-mappings bileşenleri
└── Workflows/
```

`vnext.config.json` `paths` ve `exports` altına `mappings` eklenir:

```json
{
  "domain": "my-domain",
  "paths": { "componentsRoot": "my-domain", "mappings": "Mappings", "...": "..." },
  "exports": { "mappings": [], "...": [] }
}
```

## İlgili

- [Mapping Rehberi](/docs/components/mappings) — inline mapping, `ScriptContext`, `ScriptBase` kavramları
- [Interfaces](/docs/components/interfaces) — `IMapping`, `ITransitionMapping`, `IOutputHandler` vb.
- [Scripting / Sandbox](/docs/configuration/scripting) — `allowedAssemblies`, sandbox ve ban listesi
- [Workflow → Scripts](/docs/components/workflow#scripts-helpers--allowed-assemblies) — flow-level helper/assembly
- Schema kaynağı: [vnext-schema (GitHub)](https://github.com/burgan-tech/vnext-schema)
