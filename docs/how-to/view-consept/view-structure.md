---
id: view-yapisi
title: View Yapısı
sidebar_label: View Yapısı
sidebar_position: 3
description: view.json anatomisi, bileşen ağacı, binding sistemi ve tüm bileşen türleri
---

# View Yapısı

Bu sayfa `view.json` dosyasının yapısını, bileşen hiyerarşisini ve binding sistemini açıklar.

## view.json Dosyasının Anatomisi

Bir view dosyasının kök seviyesi şu alanlardan oluşur:

```json
{
  "$schema": "https://amorphie.io/meta/view-vocabulary/1.0",
  "dataSchema": "urn:vnext:res:schema:customer:registration-form",
  "lookups": ["branchDetail"],
  "uiState": {
    "showConfirmDialog": false
  },
  "view": { ... }
}
```

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| `$schema` | Evet | View vocabulary sürümü — her zaman bu değer olmalı |
| `dataSchema` | Evet | Bu view'ın bağlı olduğu schema'nın URN adresi |
| `lookups` | Hayır | View açılışında önceden yüklenecek lookup adları (bkz. [Data Akışı](./data-akisi)) |
| `uiState` | Hayır | Dialog açık/kapalı gibi saf UI durumları için başlangıç değerleri |
| `view` | Evet | Kök bileşen — tüm UI ağacının başlangıç noktası |

---

## Bileşen Ağacı Mantığı

View bir ağaç yapısıdır. Her bileşen `type` ve isteğe bağlı `children` içerir. `children` kendi içinde başka bileşenler barındırabilir — bu özyinelemeli yapı derinlemesine iç içe geçmeye izin verir.

```
ScrollView
└── Column
    ├── Text (başlık)
    ├── Card
    │   └── Column
    │       ├── TextField (firstName)
    │       ├── TextField (lastName)
    │       └── Dropdown (city)
    ├── Component (branch-selection)
    └── Row
        ├── Button (iptal)
        └── Button (kaydet)
```

---

## Temel Binding: `bind`

Bir input bileşenini schema'daki bir alana bağlamak için `bind` kullanılır:

```json
{ "type": "TextField", "bind": "firstName" }
```

`bind` sayesinde Renderer otomatik olarak şunları yapar:
- Schema'dan `x-labels` okuyarak label'ı gösterir
- Validasyon kurallarını (minLength, pattern, format…) uygular
- Hata mesajlarını (`x-errorMessages`) gösterir
- `x-conditional` kurallarına göre alanı gösterir/gizler/etkinleştirir/devre dışı bırakır
- Alanın değerini form verisine yazar ve okur

---

## İfade Sistemi

`bind` dışında, bileşenlerin `content`, `showIf`, `source` gibi değerlerinde dinamik ifadeler kullanılabilir. İfadeler `$` ile başlar:

| İfade | Kaynak | Kullanım Örneği |
|-------|--------|-----------------|
| `$form.fieldName` | Kullanıcının doldurduğu form verisi | `"content": "$form.selectedBranchName"` |
| `$instance.fieldName` | Backend'den gelen mevcut kayıt | `"content": "$instance.customerId"` |
| `$param.fieldName` | Üst bileşenden gelen parametre | `"source": "$param.cityCode"` |
| `$lov.fieldName` | LOV listesi (dizi) | `"source": "$lov.branchCode"` |
| `$lookup.fieldName.prop` | Lookup tekil nesne alanı | `"content": "$lookup.branchDetail.address"` |
| `$lookup.fieldName` | Lookup dizisi (ForEach kaynağı) | `"source": "$lookup.branchList"` |
| `$ui.key` | uiState değeri | `"showIf": {"field": "$ui.showDialog"}` |
| `$item.prop` | ForEach döngüsünde aktif öğe | `"content": "$item.display"` |
| `$schema.fieldName.label` | Alan etiketi | `"content": "$schema.city.label"` |
| `$context.lang` | Aktif dil kodu | — |

### Örnek: ForEach içinde ifade kullanımı

```json
{
  "type": "ForEach",
  "source": "$lov.branchCode",
  "as": "branch",
  "template": {
    "type": "Card",
    "children": [
      { "type": "Text", "content": "$item.display" },
      { "type": "Text", "content": "$item.address" }
    ]
  }
}
```

---

## Bileşen Kataloğu

### Layout Bileşenleri

Diğer bileşenleri düzenlemek için kullanılır, kendi başlarına görsel içerik üretmezler.

| Bileşen | Açıklama | Temel Özellikler |
|---------|----------|-----------------|
| `Column` | Alt bileşenleri dikey dizer | `gap`, `crossAxisAlignment` |
| `Row` | Alt bileşenleri yatay dizer | `gap`, `mainAxisAlignment`, `crossAxisAlignment` |
| `Expanded` | Row/Column içinde mevcut alanı kaplar | — |
| `ScrollView` | İçeriği kaydırılabilir yapar | `direction` (vertical/horizontal) |
| `Center` | İçeriği ortalar | — |
| `Wrap` | Sığmayan bileşenleri alt satıra taşır | `spacing`, `runSpacing` |
| `Spacer` | Boşluk bırakır | `size` |
| `Stack` | Alt bileşenleri üst üste konumlandırır | — |
| `Grid` | Izgara düzeni | `columns`, `gap` |

**Gap değerleri:** `xs` · `sm` · `md` · `lg` · `xl`

---

### Container (Kapsayıcı) Bileşenleri

Görsel gruplamayı ve navigasyonu sağlar.

| Bileşen | Açıklama |
|---------|----------|
| `Card` | İçeriği kartlı çerçevede gösterir; `variant`: `elevated`, `filled`, `outlined` |
| `ExpansionPanel` | Açılır/kapanır panel; `title` ile başlık |
| `Stepper` | Adım adım ilerleme göstergesi |
| `TabView` | Sekme navigasyonu; `tabs` dizisiyle tanımlanır |
| `Dialog` | Modal dialog; `uiState` ile açılır/kapanır |
| `BottomSheet` | Alttan açılan panel |
| `SideSheet` | Yandan açılan panel |
| `Carousel` | Kaydırmalı kart görünümü |

---

### Input Bileşenleri

Kullanıcıdan veri almak için kullanılır. Tümü `bind` ile bir schema alanına bağlanır.

| Bileşen | Açıklama | Ne Zaman Kullanılır |
|---------|----------|---------------------|
| `TextField` | Tek satırlı metin girişi | Ad, soyad, kimlik no vb. |
| `TextArea` | Çok satırlı metin girişi | Adres, açıklama |
| `NumberField` | Sayı girişi | Gelir, miktar |
| `Dropdown` | Açılır seçim listesi | LOV olan her alan |
| `RadioGroup` | Seçenek grubu (tek seçim) | Cinsiyet, müşteri tipi |
| `Checkbox` | Onay kutusu | KVKK, rıza |
| `Switch` | Açma/kapama düğmesi | Tercihler |
| `DatePicker` | Tarih seçici | Doğum tarihi, başlangıç tarihi |
| `TimePicker` | Saat seçici | Randevu saati |
| `Slider` | Kaydırmalı sayı seçici | Yüzde, aralık |
| `SegmentedButton` | Segmentli buton (tek seçim) | Filtre seçenekleri |
| `SearchField` | Arama girişi + filtreleme | Arama kutuları |
| `AutoComplete` | Otomatik tamamlama | Şehir arama vb. |

---

### Görüntüleme Bileşenleri

Salt okunur içerik gösterir.

| Bileşen | Açıklama | Temel Özellikler |
|---------|----------|-----------------|
| `Text` | Metin — `content` ile içerik, `variant` ile boyut | `variant`: `displayLarge` → `labelSmall` |
| `Icon` | Material Symbols ikonu | `name`, `size` |
| `Image` | Resim | `src`, `width`, `height`, `fit` |
| `Chip` | Küçük etiket/rozet | `label`, `variant` |
| `Badge` | Sayısal bildirim rozeti | `count` |
| `ProgressIndicator` | Yükleme göstergesi | `type`: `linear`, `circular` |
| `ListTile` | İkon + başlık + alt başlık satırı | `leading`, `title`, `subtitle`, `trailing` |
| `Avatar` | Profil avatarı | `name`, `src`, `size` |
| `RichText` | HTML/Markdown içerik | `content` |
| `Divider` | Ayraç çizgisi | — |

**Text Variant'ları (büyükten küçüğe):**
`displayLarge` · `displayMedium` · `displaySmall` · `headlineLarge` · `headlineMedium` · `headlineSmall` · `titleLarge` · `titleMedium` · `titleSmall` · `bodyLarge` · `bodyMedium` · `bodySmall` · `labelLarge` · `labelMedium` · `labelSmall`

---

### Aksiyon Bileşenleri

| Bileşen | Açıklama | Temel Özellikler |
|---------|----------|-----------------|
| `Button` | Buton | `label`, `variant` (`filled`/`outlined`/`text`/`elevated`/`tonal`), `action`, `command`, `icon` |
| `IconButton` | İkon buton | `icon`, `action` |
| `FAB` | Floating Action Button | `icon`, `label`, `variant` (`small`/`regular`/`large`/`extended`), `action` |

`action`; kısa string formu dışında `command`, `validate` ve `preHooks`/`postHooks` taşıyan genişletilmiş nesne formunda da yazılabilir. Tüm verb'ler ve hook davranış kuralları için bkz. [Aksiyonlar ve Hook'lar](./aksiyonlar).

---

### Kontrol Bileşenleri

| Bileşen | Açıklama |
|---------|----------|
| `ForEach` | Dizi üzerinde döngü — `source`, `as`, `template` ile kullanılır |
| `Component` | Başka bir schema+view çiftini dahil eder — `ref`, `bind` ile kullanılır |

---

## Card ve Button Variant Referansı

### Card `variant`

| Değer | Görünüm |
|-------|---------|
| `elevated` | Gölgeli, beyaz arka plan (varsayılan) |
| `filled` | Dolu arka plan rengi |
| `outlined` | Çerçeveli, saydam arka plan |

### Button `variant`

| Değer | Görünüm | Kullanım |
|-------|---------|----------|
| `filled` | Dolu, primary renk | Ana eylem (kaydet, ilerle) |
| `outlined` | Çerçeveli | İkincil eylem (iptal, geri) |
| `text` | Çerçevesiz | Üçüncül eylem |
| `elevated` | Gölgeli, beyaz | Öne çıkarılmış eylem |
| `tonal` | Hafif renkli arka plan | Orta önem eylemleri |

---

## Sonraki Konular

- Schema uzantıları (`x-labels`, `x-lov`, `x-conditional`) → [Schema Tanımı](./schema-tanimi)
- LOV ve lookup veri akışı → [Data Akışı](./data-akisi)
