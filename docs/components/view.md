---
sidebar_position: 8
title: View
description: vNext View component — Backend-Driven UI tanımları
---

# View

**View** bileşeni, ön uçta **kullanıcı entegrasyonu (User Integration)** sağlamak için tanımlanan UI yapılarıdır. **Backend-Driven View** mantığı ile platformların (Mobile, Web vb.) sürüm çıkışlarını **minimize eder**.

> **Schema:** [`vnext-schema/view-definition.schema.json`](https://github.com/burgan-tech/vnext-schema)

## Tanım JSON Örneği

### JSON İçerikli View

> **Schema:** `view-definition.schema.json`

```json
{
  "key": "account-type-selection-view",
  "version": "1.0.0",
  "domain": "banking",
  "flow": "sys-views",
  "flowVersion": "1.0.0",
  "tags": ["banking", "account", "form"],
  "_comment": "Hesap türü seçimi ekranı",
  "attributes": {
    "type": 1,
    "display": "full-page",
    "renderer": "pseudo-ui",
    "content": {
      "type": "form",
      "title": {
        "en-US": "Choose Your Account Type",
        "tr-TR": "Hesap Türünüzü Seçin"
      },
      "fields": [
        {
          "name": "accountType",
          "type": "select",
          "label": { "en-US": "Account Type", "tr-TR": "Hesap Türü" },
          "required": true
        }
      ]
    },
    "labels": [
      { "label": "Account Type Selection", "language": "en-US" },
      { "label": "Hesap Türü Seçimi", "language": "tr-TR" }
    ]
  }
}
```

### Deeplink İçerikli View

> **Schema:** `view-definition.schema.json`

```json
{
  "key": "otp-verification-view",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-views",
  "flowVersion": "1.0.0",
  "tags": ["core", "otp", "verification"],
  "attributes": {
    "type": 4,
    "display": "popup",
    "content": {
      "href": "on-burgan//onboarding/${param}"
    },
    "labels": [
      { "label": "OTP Verification", "language": "en-US" },
      { "label": "OTP Doğrulama", "language": "tr-TR" }
    ]
  }
}
```

---

## Kullanım Modeli

State veya transition seviyesinde view tanımları yapılır. **vNext Client Workflow Manager SDK** state ve transition döngülerinde **doğru view'ı** kullanıcıya döner. View, gerekli data'yı Data Function'dan talep ederek **render** edilir.

Önerilen modelde **State view** mevcut durumu özetleyen read-only ekran, **Transition view** ise onay, form veya veri girişi alınan submit ekranıdır. Detaylı tasarım yaklaşımı için [Pseudo UI Rehberi](/docs/how-to/view-consept), genel etkileşim döngüsü için [User Integration (kavramsal)](/docs/concepts/user-integration) sayfasına bakın.

---

## Properties

### Top-Level Alanlar

| Alan | Tip | Zorunlu | Pattern / Kısıt | Açıklama |
|------|-----|---------|-----------------|----------|
| `$schema` | string | Hayır | URI formatı | JSON Schema referansı |
| `key` | string | **Evet** | `^[a-z0-9-]+$` | View'ın benzersiz tanımlayıcısı |
| `version` | string | **Evet** | `^\d+\.\d+\.\d+(-[a-zA-Z]+\.\d+)?$` | Semantic versioning (Major.Minor.Patch) |
| `domain` | string | **Evet** | `^[a-z0-9-]+$` | View'ın ait olduğu domain |
| `flow` | string | **Evet** | Sabit: `sys-views` | Flow tanımlayıcısı |
| `flowVersion` | string | **Evet** | `^\d+\.\d+\.\d+(-[a-zA-Z]+\.\d+)?$` | Flow versiyonu |
| `tags` | string[] | **Evet** | `minItems: 1` | Kategorilendirme ve arama etiketleri |
| `_comment` | string | Hayır | — | Açıklama / yorum |
| `attributes` | object | **Evet** | — | View davranış tanımı (aşağıda) |

### `attributes` Alanları

| Alan | Tip | Zorunlu | Açıklama |
|------|-----|---------|----------|
| `type` | integer | **Evet** | View içerik tipi — aşağıdaki enum tablosuna bakın |
| `content` | string / object / array | **Evet** | View içeriği. Kabul edilen tip, `type` değerine bağlıdır (aşağıda) |
| `display` | string | Hayır | Gösterim modu — aşağıdaki enum tablosuna bakın |
| `labels` | array | Hayır | Çoklu dil etiketleri. Her öğe: `label` (string) + `language` (pattern: `^[a-z]{2}-[A-Z]{2}$`) |
| `renderer` <sup>New</sup> | string | Hayır | UI SDK render motoru belirleyicisi. Yalnızca `type: 1` (JSON) için geçerlidir — aşağıdaki enum tablosuna bakın |
| `_comment` | string | Hayır | Açıklama / yorum |

### `attributes.type` Enum Değerleri

| Değer | Ad | Kabul Edilen `content` Tipi | Açıklama |
|-------|----|-----------------------------|----------|
| `1` | **JSON** | string, object veya array | JSON içerikli view (form, liste vb.) |
| `2` | **HTML** | string | HTML içerikli view |
| `3` | **Markdown** | string | Markdown içerikli view |
| `4` | **Deeplink** | string, object veya array | Mobil deeplink yönlendirmesi |
| `5` | **Http** | string, object veya array | HTTP URL yönlendirmesi |
| `6` | **URN** | string, object veya array | URN tabanlı içerik referansı |

### İçerik Tipleri: Http / Deeplink / URN

`type` değeri `4` (Deeplink), `5` (Http) veya `6` (URN) olduğunda `content`, ileride yeni alanlarla genişletilebilmesi için **obje** olarak tanımlanır. Http ve Deeplink bir `href`, URN ise bir `urn` taşır:

```jsonc
// Http (type: 5)
{ "href": "https://example.com/detail?id=${param}" }

// Deeplink (type: 4) — şu an yalnızca full path desteklenir
{ "href": "on-burgan//onboarding/${param}" }

// URN (type: 6)
{ "urn": "urn:vnext:flow:transition:onboarding:kyc-main-flow:${param}:approved" }
```

Üç yapı da `${param}` **binding**'i destekler; çalışma zamanında bağlamdaki değerle doldurulur. URN segment yapısı ve binding kuralları için bkz. [URN Kataloğu ve Binding](/docs/components/urn-catalog).

### `display` Enum Değerleri

| Değer | Açıklama |
|-------|----------|
| `full-page` | Tam sayfa görünüm |
| `popup` | Popup / modal pencere |
| `bottom-sheet` | Alt sayfa (bottom sheet) |
| `top-sheet` | Üst sayfa (top sheet) |
| `drawer` | Yan menü / çekmece |
| `inline` | Sayfa içi gömülü görünüm |

### `renderer` Enum Değerleri <sup>New</sup>

Yalnızca `type: 1` (JSON) view'lar için geçerlidir. Client SDK'nın hangi render motoruyla içeriği yorumlayacağını belirtir.

| Değer | Açıklama |
|-------|----------|
| `pseudo-ui` | Pseudo UI renderer (schema-driven form generation) |
| `flutter` | Flutter renderer |
| `angular` | Angular renderer |
| `vue` | Vue.js renderer |
| `react` | React renderer |
| `react-native` | React Native renderer |
| `native-ios` | Native iOS renderer |
| `native-android` | Native Android renderer |

---

## Platform Overrides

Tek bir view, platform-specific override'lar içerebilir:

- `default` — fallback render
- `web` — web-specific
- `mobile-ios` — iOS-specific
- `mobile-android` — Android-specific

Client SDK platform header'ını okuyarak doğru variant'ı render eder.

## Tipik Kullanım Senaryoları

- **State view**: state'e gelindiğinde render edilen, mevcut durumu özetleyen read-only ana ekran
- **Transition view**: transition öncesi onay, form veya veri girişi ekranı
- **Form rendering**: Schema ile birlikte form generation
- **Backend-driven UI**: ekran değişikliklerinin sadece backend deploy ile yapılması

## İlgili

- [User Integration](/docs/concepts/user-integration) — kullanıcı etkileşim döngüsü
- [User Integration](/docs/concepts/user-integration) — view loop akışı
- [Schema component](/docs/components/schema) — form validation entegrasyonu
- [Pseudo UI Rehberi](/docs/how-to/view-consept) — view.json yapısı, schema binding ve tasarımcı rehberi
- [URN Kataloğu ve Binding](/docs/components/urn-catalog) — Http / Deeplink / URN content shape'leri ve `${param}` binding
- Schema kaynağı: [vnext-schema (GitHub)](https://github.com/burgan-tech/vnext-schema)
