---
id: giris
title: Pseudo UI'ya Giriş
sidebar_label: Giriş
sidebar_position: 1
description: vnext Pseudo UI sistemine genel bakış — view, schema ve renderer kavramları
---

# Pseudo UI'ya Giriş

## Klasik Ekran Geliştirmenin Sorunu

Geleneksel uygulama geliştirmede bir ekranı hayata geçirmek şu döngüyü izler:

1. Tasarımcı ekranı tasarlar
2. Backend geliştirici API'yi yazar
3. Frontend geliştirici her platform için ayrı ayrı kodu yazar (web, iOS, Android)
4. Her değişiklik bu döngüyü yeniden başlatır

Bu döngü yavaştır, pahalıdır ve platformlar arası tutarsızlığa yol açar. Bir alana yeni bir validasyon eklemek bile üç farklı kod tabanında değişiklik gerektirir.

## Pseudo UI Felsefesi

**Pseudo UI bu döngüyü kırar.** Temel fikir şudur:

```
Ekran = f(Schema, View)
```

- **Schema**: Verinin ne olduğunu tanımlar — alanlar, tipler, validasyonlar, çok dilli etiketler
- **View**: Ekranın nasıl görüneceğini tanımlar — bileşenler, layout, binding
- **Renderer**: Schema + View'ı alarak gerçek ekranı üretir — platform fark etmeksizin

Ekran artık sabit kod değil, **yorumlanabilir bir veridir.** Backend ekibi schema'yı, UI tasarımcısı view'ı tanımlar; renderer her iki tarafa da dokunmadan çalışır.

## Sorumluluk Ayrımı

| Rol | Sorumluluğu | Dosya |
|-----|-------------|-------|
| **Backend Geliştirici** | Veri sözleşmesi, validasyonlar, API kaynakları | `schema.json` |
| **UI Tasarımcısı** | Layout, bileşen seçimi, binding | `view.json` |
| **Platform Geliştirici** | Renderer'ı geliştirmek ve entegre etmek | SDK kodu |

Bu sayede bir tasarımcı, backend koduna ya da platform koduna dokunmadan ekran düzenini değiştirebilir.

## Desteklenen Platformlar

Pseudo UI renderer aynı `schema.json` + `view.json` ikilisinden şu platformlarda çalışan ekranlar üretir:

| Platform | SDK |
|----------|-----|
| React 18+ | `@burgantech/pseudo-ui` |
| Vue 3 | `@burgantech/pseudo-ui` |
| Angular | `@burgantech/pseudo-ui` |
| Flutter | `pseudo_ui` (pub.dev) |

Bir view tanımı bir kez yazılır, her yerde çalışır.

## Çalışma Modeli — Kısa Örnek

Backend ekibi şu schema'yı tanımlar:

```json title="schema.json (backend yazdı)"
{
  "$id": "urn:amorphie:res:schema:customer:registration-form",
  "type": "object",
  "required": ["firstName"],
  "properties": {
    "firstName": {
      "type": "string",
      "x-labels": { "tr": "Ad", "en": "First Name" }
    }
  }
}
```

UI tasarımcısı şu view'ı tanımlar:

```json title="view.json (tasarımcı yazdı)"
{
  "$schema": "https://amorphie.io/meta/view-vocabulary/1.0",
  "dataSchema": "urn:amorphie:res:schema:customer:registration-form",
  "view": {
    "type": "Column",
    "children": [
      { "type": "TextField", "bind": "firstName" }
    ]
  }
}
```

Renderer bu iki dosyayı birleştirerek ekranda bir ad alanı gösterir — label, validasyon ve hata mesajlarıyla birlikte.

## Bu Dökümantasyon Hakkında

Bu belge UI tasarımcılarına yönelik yazılmıştır. Schema yazmak Backend'in sorumluluğundadır, ancak tasarımcının schema'yı okuyup anlaması beklenir.

| Sayfa | İçerik |
|-------|--------|
| **[Tasarımcı Rehberi](./tasarimci-rehberi)** | Sıfırdan çalışan view oluşturma — adım adım |
| **[View Yapısı](./view-yapisi)** | view.json anatomisi, bileşen kataloğu, ifade sistemi |
| **[Schema Tanımı](./schema-tanimi)** | schema.json'u okuma ve x-* uzantılarını anlama |
| **[Data Akışı](./data-akisi)** | LOV, lookup, binding ifadeleri, cascade |

:::tip[Nereden başlamalı?]
İlk kez Pseudo UI ile çalışıyorsanız **[Tasarımcı Rehberi](./tasarimci-rehberi)** ile başlayın. Adım adım ilerleyerek 20 dakika içinde çalışan bir view oluşturabilirsiniz.
:::
