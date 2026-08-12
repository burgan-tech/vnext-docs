---
sidebar_position: 6
title: Function
description: vNext Function component — cross-domain BFF ve dış entegrasyon
---

# Function

**Function** bileşeni, **cross-domain veya dış entegrasyon** süreçlerinde kullanılmak üzere **BFF ihtiyacını azaltan** yapılardır. Workflow'tan bağımsız ya da workflow context'inde çalışabilir.

> **Schema:** [`vnext-schema/function-definition.schema.json`](https://github.com/burgan-tech/vnext-schema)

## Function Türleri

Function'lar üç çağırma şekli sağlar:

1. **Domain-level**: `/api/v1/{domain}/functions/{function}` — workflow bağımsız. `GET`, `POST`, `PATCH`, `DELETE` destekler.
2. **Instance-level**: `/api/v1/{domain}/workflows/{workflow}/instances/{instance}/functions/{function}` — instance context'inde çalışır. `GET`, `POST`, `PATCH`, `DELETE` destekler.
3. **Built-in**: State, Data, View — sistem tarafından sağlanan üç sabit function (bkz. [Built-in Functions](/docs/components/functions/built-in)).

## Tanım JSON Örneği

### Tek Task ile Function

> **Schema:** `function-definition.schema.json`

```json
{
  "key": "function-get-customer-detail",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-functions",
  "flowVersion": "1.0.0",
  "tags": ["core", "customer", "lookup"],
  "_comment": "Müşteri detay bilgisini döndüren function",
  "attributes": {
    "scope": "I",
    "rawResponse": false,
    "task": {
      "order": 1,
      "task": {
        "key": "get-customer-detail",
        "domain": "core",
        "flow": "sys-tasks",
        "version": "1.0.0"
      },
      "mapping": {
        "type": "L",
        "location": "./src/GetCustomerDetailMapping.csx",
        "code": "<BASE64_ENCODED_CODE>",
        "encoding": "B64"
      }
    },
    "labels": [
      { "label": "Get Customer Detail", "language": "en-US" },
      { "label": "Müşteri Detay Getir", "language": "tr-TR" }
    ]
  }
}
```

### Çoklu Task ile Function (`onExecutionTasks`)

> **Schema:** `function-definition.schema.json`

```json
{
  "key": "function-account-summary",
  "version": "1.0.0",
  "domain": "banking",
  "flow": "sys-functions",
  "flowVersion": "1.0.0",
  "tags": ["banking", "account", "aggregation"],
  "attributes": {
    "scope": "I",
    "onExecutionTasks": [
      {
        "order": 1,
        "task": {
          "key": "get-account-info",
          "domain": "banking",
          "flow": "sys-tasks",
          "version": "1.0.0"
        },
        "mapping": {
          "location": "./src/GetAccountInfoMapping.csx",
          "code": "<BASE64_ENCODED_CODE>"
        }
      },
      {
        "order": 2,
        "task": {
          "key": "get-account-balance",
          "domain": "banking",
          "flow": "sys-tasks",
          "version": "1.0.0"
        },
        "mapping": {
          "location": "./src/GetAccountBalanceMapping.csx",
          "code": "<BASE64_ENCODED_CODE>"
        }
      }
    ],
    "output": {
      "location": "./src/AccountSummaryOutput.csx",
      "code": "<BASE64_ENCODED_CODE>"
    },
    "roles": [
      { "role": "account-viewer", "grant": "allow" },
      { "role": "guest", "grant": "deny" }
    ]
  }
}
```

:::info
`onExecutionTasks` kullanıldığında `output` alanı **zorunludur**. Output mapping, tüm task sonuçlarını birleştiren `IOutputHandler` implementasyonuna işaret eder.
:::

---

## Properties

### Top-Level Alanlar

| Alan | Tip | Zorunlu | Pattern / Kısıt | Açıklama |
|------|-----|---------|-----------------|----------|
| `$schema` | string | Hayır | URI formatı | JSON Schema referansı |
| `key` | string | **Evet** | `^[a-z0-9-]+$` | Function'ın benzersiz tanımlayıcısı |
| `version` | string | **Evet** | `^\d+\.\d+\.\d+(-[a-zA-Z]+\.\d+)?$` | Semantic versioning (Major.Minor.Patch) |
| `domain` | string | **Evet** | `^[a-z0-9-]+$` | Function'ın ait olduğu domain |
| `flow` | string | **Evet** | Sabit: `sys-functions` | Flow tanımlayıcısı |
| `flowVersion` | string | **Evet** | `^\d+\.\d+\.\d+(-[a-zA-Z]+\.\d+)?$` | Flow versiyonu |
| `tags` | string[] | **Evet** | `minItems: 1` | Kategorilendirme ve arama etiketleri |
| `_comment` | string | Hayır | — | Açıklama / yorum |
| `attributes` | object | **Evet** | — | Function davranış tanımı (aşağıda) |

### `attributes` Alanları

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `scope` | string | **Evet** | Function kapsamı — aşağıdaki enum tablosuna bakın |
| `task` | object | **Koşullu** | Tek task tanımı. `task` veya `onExecutionTasks`'tan biri zorunlu |
| `onExecutionTasks` | array | **Koşullu** | Sıralı çoklu task listesi. `task` veya `onExecutionTasks`'tan biri zorunlu |
| `output` | object | **Koşullu** | Output mapping. `onExecutionTasks` tanımlıysa **zorunlu** |
| `labels` | array | Hayır | Çoklu dil etiketleri (`label` + `language`) |
| `roles` | array | Hayır | Yetkilendirme rolleri (`role` + `grant`). DENY her zaman ALLOW'u geçersiz kılar |
| `rawResponse` | boolean | Hayır | `true`: mapped rawData doğrudan response olarak döndürülür. `false` (varsayılan): platform kendi pattern modeli üzerinden çıktı verir. Legacy API'lerden vnext'e geçiş için |
| `verbs` <sup>New</sup> | string[] | Hayır | Function'ın kabul ettiği HTTP verb'leri — aşağıdaki enum tablosuna bakın. Tanımsız/boş ise tüm verb'ler kabul edilir (geriye dönük uyumlu) |
| `inputSchema` <sup>New</sup> | object / array | Hayır | Request body'yi tanımlayan `sys-schemas` kontratı. Tanımlıysa body, kural değerlendirmesini kazanan şemaya karşı **valide edilir** (hata → `400`). Tek referans veya rule-based dizi — bkz. [Custom Functions → Fonksiyon Kontratı](/docs/components/functions/custom) |
| `outputSchema` <sup>New</sup> | object / array | Hayır | Response body'yi tanımlayan `sys-schemas` kontratı. **Yalnızca deklaratif** — runtime'da enforce edilmez |
| `inputView` <sup>New</sup> | object / array | Hayır | Client'ın function input'unu toplamak için render edeceği `sys-views` kontratı. Tek referans veya rule-based dizi |
| `outputView` <sup>New</sup> | object / array | Hayır | Client'ın function output'unu sunmak için render edeceği `sys-views` kontratı. Tek referans veya rule-based dizi |
| `cache` | object | Hayır | Read-through cache yapılandırması — bkz. [Custom Functions → Fonksiyon Cache](/docs/components/functions/custom) |

### `scope` Enum Değerleri

| Değer | Açıklama |
|-------|----------|
| `D` | **Domain** — workflow bağımsız, domain seviyesinde çalışır |
| `F` | **Flow** — flow seviyesinde çalışır |
| `I` | **Instance** — belirli bir instance context'inde çalışır |

### `verbs` Enum Değerleri <sup>New</sup>

| Değer | Açıklama |
|-------|----------|
| `GET` | Request body'siz okuma |
| `POST` | Request body ile oluşturma / çağırma |
| `PATCH` | Request body ile kısmi güncelleme |
| `DELETE` | Silme |

Deklare edilmemiş bir verb ile yapılan çağrı **405 Method Not Allowed** döner; response'un `Allow` header'ı deklare edilen verb'leri listeler. `verbs` tanımsız veya boşsa kısıtlama uygulanmaz. Yalnızca body taşıyamayan verb'ler (ör. sadece `["GET"]`) ile birlikte `inputSchema` tanımlamak doğrulama hatasıdır.

### `task` / `onExecutionTasks[*]` Yapısı

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `_comment` | string | Hayır | Yorum |
| `order` | integer | **Evet** | Çalışma sırası (`minimum: 1`) |
| `task` | object | **Evet** | Task referansı — explicit veya `ref` (aşağıda) |
| `mapping` | object | **Evet** | Mapping kodu tanımı (aşağıda) |

**Task Referansı** — iki formdan biri kullanılır:

| Form | Zorunlu Alanlar | Açıklama |
|------|-----------------|----------|
| Explicit | `key`, `domain`, `flow` (sabit `sys-tasks`), `version` | Doğrudan task referansı |
| Ref | `ref` | Dosya yolu ile task referansı |

### Mapping (taskMapping)

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `type` | string | Hayır | `L` | `G` = Global, `L` = Local. Global ise `code` gerekmez |
| `location` | string | Hayır | — | Kod dosyası yolu (pattern: `^\.\/.*\.csx$`) |
| `code` | string \| object | **Koşullu** | — | Mapping kodu. `type` = `L` ise zorunlu. `encoding: "REF"` ise string yerine bir sys-mappings referans objesi |
| `encoding` | string | Hayır | `B64` | Kodlama formatı: `B64` (Base64), `NAT` (Native) veya `REF` (sys-mappings referansı) |
| `scripts` <sup>New</sup> | object | Hayır | — | Helper referansları (`helpers[]`) ve izinli assembly'ler (`allowedAssemblies[]`) — bkz. [Mapping Bileşeni](/docs/components/mapping-component) |

### Role (roleGrant)

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `role` | string | **Evet** | Rol adı |
| `grant` | string | **Evet** | `allow` veya `deny`. DENY her zaman ALLOW'u geçersiz kılar |

---

## Yapı

Bir function tipik olarak şunları içerir:

- **Input mapping** — request → task input
- **Task list** — sıralı task'lar (HTTP, Script, Dapr Service, vb.)
- **Output mapping** — task sonuçları → response

Output mapping için `IOutputHandler` interface implement edilir; bkz. [IOutputHandler](/docs/components/interfaces#ioutputhandler).

## Tipik Kullanım Senaryoları

- **Cross-domain veri**: domain A'dan domain B'ye veri çekme
- **Dış API gateway**: 3rd-party API'lerini sarmalama
- **Aggregation**: birden fazla kaynaktan veri toplama
- **BFF replacement**: frontend'in BFF olmadan domain'le konuşması

## İlgili

- [Built-in Functions](/docs/components/functions/built-in) — sistem function'ları
- [Custom Functions](/docs/components/functions/custom) — kullanıcı tanımlı function'lar
- [IOutputHandler](/docs/components/interfaces#ioutputhandler) — output mapping interface
- Schema kaynağı: [vnext-schema (GitHub)](https://github.com/burgan-tech/vnext-schema)
