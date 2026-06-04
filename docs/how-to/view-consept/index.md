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
  "$id": "urn:vnext:res:schema:customer:registration-form",
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
  "dataSchema": "urn:vnext:res:schema:customer:registration-form",
  "view": {
    "type": "Column",
    "children": [
      { "type": "TextField", "bind": "firstName" }
    ]
  }
}
```

Renderer bu iki dosyayı birleştirerek ekranda bir ad alanı gösterir — label, validasyon ve hata mesajlarıyla birlikte.

## Workflow Bağlamında View Rolü

vNext iş akışlarında platform seviyesinde iki view bağlamı bulunur: **State View** ve **Transition View**. İkisi de aynı view altyapısını kullanır; ancak Workflow Manager açısından farklı anlarda ve farklı amaçlarla devreye girer.

:::note[Önerilen kullanım modeli]
Bu ayrım platform tarafından zorunlu tutulmaz. Yine de önerilen yaklaşım, state view'ları bilgilendirme ve özetleme ekranları; transition view'ları ise onay, form ve veri girişi ekranları olarak tasarlamaktır.
:::

### State View

State tanımına bağlı view'lar genellikle read-only ekranlardır. Kullanıcıya mevcut instance durumunu özetler, bilgilendirici içerik sunar ya da sürecin hangi noktaya geldiğini gösterir.

Workflow Manager'ın çalışma modelinde state'ler birer durak noktasıdır: süreç belirli bir noktaya gelmiştir ve kullanıcıya bu noktanın bağlamı gösterilir. State View, bu state bilgisini UI açısından besler; kullanıcının mevcut durumu anlamasını ve uygun transition seçeneklerini görmesini sağlar.

### Transition View

Transition tanımına bağlı view'lar genellikle onay, form veya veri girişi ekranlarıdır. Kullanıcıdan alınan veri veya onay, ilgili transition tetiklendiğinde sürece aktarılır.

Workflow Manager açısından transition'lar submit/trigger noktalarıdır: kullanıcı bir aksiyon alır, gerekiyorsa Transition View üzerinden veri girer ve ardından transition başlatılır. Bu nedenle Transition View, girdiyi toplayan ve süreci ilerleten UI adımı olarak konumlandırılır.

### Wizard State View Davranışı

Wizard state (`stateType: 5`), input odaklı adımları transition üzerinden daha doğrudan göstermek için kullanılır. State Function aktif state'in Wizard olduğunu gördüğünde, önce authorization/role evaluation sonrasında kullanılabilir transition listesini değerlendirir. Kullanılabilir manuel transition varsa View Function bu transition'ın view'ını döndürür; transition üzerinde view tanımlı değilse state'de tanımlı view fallback olarak kullanılır.

Bu davranışta State Function yanıtındaki ilgili transition için `hasView: false` döner. Böylece client, zaten state aşamasında dönen transition view'ı için tekrar View Function çağırıp aynı ekrana dönmez.

Wizard state tasarımında State View bilgilendirme ve özetleme içindir; kullanıcı girdisi Transition View üzerinden alınmalıdır. Hesap açılışı örneğinde "hesap türü seçimi" state view içinde veri alan bir form olarak modellenmemelidir. Vadeli/vadesiz gibi seçimler transition routing perspektifiyle tasarlanmalıdır. Bu sayede seçimler loglama, izlenebilirlik ve raporlama tarafında transition seviyesinde görünür olur; data alanının içine gömülü değerleri ayrıca analiz etme ihtiyacı azalır.

### Önerilen Etkileşim Modeli

Bu ayrım bir validasyon kuralı değil, platform tarafından önerilen tasarım örüntüsüdür.

```
State View gösterilir (read-only)
    ↓
Kullanıcı bir transition butonuna tıklar
    ↓
Workflow Manager (client), View Function'a sorgu yapar:
  "Bu transition'ın view'ı nedir?"
  (State Function yanıtındaki transition için hasView: true ise)
    ↓
Transition View render edilir
    ↓
Kullanıcı formu doldurur
    ↓
"İptal / Çıkış" veya "<Transition Adı>" butonlarından biri seçilir
    ↓
Submit → Gerçek transition tetiklenir → İş akışı ilerler
```

State Function yanıtında her transition için `hasView` alanı bulunur. İstemci bu bilgiyle doğrudan transition'ı mı göndereceğine yoksa önce View Function'ı mı çağıracağına karar verir.

Transition View'ın eylem butonları bu modelde şöyle yapılandırılır:

| Buton | `action` | Açıklama |
|-------|----------|----------|
| İptal / Çıkış | `cancel` veya `exit` | Transition view'dan ayrılır, kullanıcı state view'a döner |
| Submit | `submit` | Transition tetiklenir; label olarak transition'ın görüntü adı kullanılır |

---

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
