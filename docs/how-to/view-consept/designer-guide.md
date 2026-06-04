---
id: tasarimci-rehberi
title: Tasarımcı Rehberi
sidebar_label: Tasarımcı Rehberi
sidebar_position: 2
description: UI tasarımcıları için sıfırdan çalışan view.json oluşturma rehberi
---

# Tasarımcı Rehberi

Bu rehber, Pseudo UI sisteminde sıfırdan çalışan bir view oluşturmanızı adım adım anlatır. Her adım öncekinin üzerine inşa edilir ve sonunda gerçek bir kayıt formu ortaya çıkar.

:::tip[Önkoşul]
Bu rehberi takip etmek için bir `schema.json` dosyasının Backend ekibi tarafından hazırlanmış olması gerekir. Schema'nın içeriğini anlamak için [Schema Tanımı](./schema-tanimi) sayfasına bakabilirsiniz.
:::

---

## Adım 1: En Basit View — Tek Bir Alan

Her view bir JSON dosyasıdır ve mutlaka şu iki bilgiyi içermelidir:

- `dataSchema`: Hangi schema'yı kullanıyoruz?
- `view`: Ekranda ne gösterilecek?

Aşağıdaki view, schema'daki `firstName` alanını ekranda bir metin kutusu olarak gösterir:

```json title="view.json"
{
  "$schema": "https://amorphie.io/meta/view-vocabulary/1.0",
  "dataSchema": "urn:vnext:res:schema:customer:registration-form",
  "view": {
    "type": "TextField",
    "bind": "firstName"
  }
}
```

- `"type": "TextField"` → Metin kutusu bileşeni
- `"bind": "firstName"` → Schema'daki `firstName` alanına bağlı

Renderer, `firstName` alanının `x-labels` değerini okuyarak label'ı otomatik olarak gösterir. Validasyon kuralları ve hata mesajları da otomatik devreye girer — bunları view'da tekrar yazmanıza gerek yoktur.

:::caution[Dikkat]
`bind` değeri schema'daki property adıyla **birebir** eşleşmelidir. Büyük/küçük harf duyarlıdır.
:::

---

## Adım 2: Layout Bileşenleri — Column, Card, Row

Gerçek ekranlarda birden fazla alan ve düzenleme gerekir. Bunun için layout bileşenlerini kullanırız.

### Column: Alanları dikey dizer

```json title="view.json"
{
  "$schema": "https://amorphie.io/meta/view-vocabulary/1.0",
  "dataSchema": "urn:vnext:res:schema:customer:registration-form",
  "view": {
    "type": "Column",
    "gap": "md",
    "children": [
      { "type": "TextField", "bind": "firstName" },
      { "type": "TextField", "bind": "lastName" },
      { "type": "TextField", "bind": "phone" }
    ]
  }
}
```

`"gap": "md"` → Bileşenler arasındaki boşluk (`xs`, `sm`, `md`, `lg`, `xl`)

### Card: Alanları bir gruba toplar

```json title="view.json"
{
  "$schema": "https://amorphie.io/meta/view-vocabulary/1.0",
  "dataSchema": "urn:vnext:res:schema:customer:registration-form",
  "view": {
    "type": "ScrollView",
    "children": [
      {
        "type": "Column",
        "gap": "md",
        "children": [
          {
            "type": "Text",
            "content": { "tr": "Kişisel Bilgiler", "en": "Personal Information" },
            "variant": "titleMedium"
          },
          {
            "type": "Card",
            "children": [
              {
                "type": "Column",
                "gap": "sm",
                "children": [
                  { "type": "TextField", "bind": "firstName" },
                  { "type": "TextField", "bind": "lastName" }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

- `ScrollView` → İçeriğin kaydırılabilir olmasını sağlar; uzun formlar için en dıştaki bileşen genellikle budur
- `Text` → Sabit metin — `variant` ile boyutu ayarlanır (`headlineMedium`, `titleMedium`, `bodySmall` vb.)

### Row: Alanları yatay dizer

```json
{
  "type": "Row",
  "gap": "sm",
  "children": [
    {
      "type": "Expanded",
      "children": [{ "type": "TextField", "bind": "firstName" }]
    },
    {
      "type": "Expanded",
      "children": [{ "type": "TextField", "bind": "lastName" }]
    }
  ]
}
```

`Expanded` → Row içindeki bileşenin mevcut alanı eşit paylaşmasını sağlar. Kullanmazsanız bileşen içeriği kadar yer kaplar.

---

## Adım 3: Dropdown ile LOV Bağlama

Schema'da `x-lov` tanımlı bir alan için Dropdown bileşeni kullanılır. Renderer, liste verilerini otomatik olarak backend'den çeker.

```json
{
  "type": "Dropdown",
  "bind": "city"
}
```

Tek yapmanız gereken `"type": "Dropdown"` ve `"bind": "city"` yazmak. `x-lov` tanımı schema'da olduğu için Renderer hangi API'yi çağıracağını oradan öğrenir.

:::tip
`Dropdown` yerine `RadioGroup` veya `SegmentedButton` da kullanabilirsiniz — hepsi `bind` üzerinden aynı schema alanına bağlanır ve LOV verilerini kullanır.
:::

---

## Adım 4: Koşullu Görünürlük

Schema'da `x-conditional` ile tanımlanmış alanlar view'da otomatik olarak gösterilip gizlenir. **Bunu view'da ayrıca belirtmenize gerek yoktur.**

Ancak zaman zaman view'a özgü koşullar eklemek isteyebilirsiniz. Bunun için bileşen üzerinde doğrudan `showIf` kullanılır:

```json
{
  "type": "TextField",
  "bind": "companyName",
  "showIf": {
    "field": "customerType",
    "operator": "equals",
    "value": "corporate"
  }
}
```

Koşul operatörleri: `equals`, `notEquals`, `isEmpty`, `isNotEmpty`, `in`, `notIn`, `contains`, `greaterThan`, `lessThan`

Bileşiği kurallar için `allOf` (AND) ve `anyOf` (OR) kullanılır:

```json
{
  "type": "TextField",
  "bind": "taxNumber",
  "showIf": {
    "allOf": [
      { "field": "customerType", "operator": "equals", "value": "corporate" },
      { "field": "consentKVKK", "operator": "equals", "value": true }
    ]
  }
}
```

---

## Adım 5: İç İçe Bileşen Kullanımı

Bazı UI parçaları yeniden kullanılabilir bağımsız bileşenler olarak ayrı schema + view dosyalarına yazılır. Bunları ana view'a `Component` tipiyle dahil edersiniz.

Aşağıdaki örnekte `branch-selection` bileşeni ana forma dahil ediliyor:

```json
{
  "type": "Component",
  "ref": "branch-selection",
  "bind": {
    "branchCode": "selectedBranchCode",
    "branchName": "selectedBranchName",
    "cityCode": "city"
  }
}
```

- `"ref": "branch-selection"` → Hangi bileşeni yükleyeceğimizi belirtir
- `"bind"` → Alt bileşenin beklediği alanları (`cityCode`) üst formun alanlarıyla (`city`) eşleştirir

Alt bileşen kendi schema'sındaki alanları `$param.cityCode` ile okur — üst formdan gelen veriyi bu şekilde alır.

:::info
Alt bileşenin `schema.json`'unda `"x-binding": "required"` ile işaretlenmiş alanlar `bind` içinde mutlaka verilmelidir. Eksik bırakılırsa renderer hata loglar.
:::

---

## Adım 6: Eylem Düğmeleri

Formun sonuna kaydet/iptal gibi aksiyon düğmeleri eklenir. Her düğme bir `action` tanımlayabilir; bu aksiyon host uygulamasına iletilir.

```json
{
  "type": "Row",
  "gap": "sm",
  "mainAxisAlignment": "end",
  "children": [
    {
      "type": "Button",
      "label": { "tr": "İptal", "en": "Cancel" },
      "variant": "outlined",
      "action": "cancel"
    },
    {
      "type": "Button",
      "label": { "tr": "Kaydet", "en": "Save" },
      "variant": "filled",
      "icon": "save",
      "action": "submit",
      "command": "urn:vnext:flow:transition:customer:registration:${param}:submit"
    }
  ]
}
```

- `"variant": "filled"` → Dolu (primary) buton
- `"variant": "outlined"` → Çerçeveli (secondary) buton
- `"action"` → Host'a iletilecek olay adı (ör. `"submit"`, `"cancel"`, `"next"`)
- `"command"` → Submit butonunda backend'e gönderilecek workflow transition URN'i
- `"icon"` → Material Symbols ikon adı (ör. `"save"`, `"close"`, `"chevron_right"`)

Submit tetiklendiğinde Renderer önce tüm required alanların validasyonunu yapar. Hata varsa butonu geçip hatalı alanları işaretler.

:::tip
`action` yukarıdaki gibi kısa bir string olabileceği gibi, `command`, `validate`, `preHooks`/`postHooks` taşıyan genişletilmiş bir nesne de olabilir. `dispatch`, `select`, `reset`, `delegate` verb'leri ve hook davranış kuralları için bkz. [Aksiyonlar ve Hook'lar](./aksiyonlar).
:::

---

## Sonuç: Tam Bir Form View

Yukarıdaki adımların birleşimi olan gerçek `customer-registration-form/view.json` dosyasına bakın:

```json title="samples/components/customer-registration-form/view.json"
{
  "$schema": "https://amorphie.io/meta/view-vocabulary/1.0",
  "dataSchema": "urn:vnext:res:schema:customer:registration-form",
  "view": {
    "type": "ScrollView",
    "children": [
      {
        "type": "Column",
        "gap": "md",
        "children": [
          {
            "type": "Text",
            "content": { "tr": "Müşteri Kayıt Formu", "en": "Customer Registration Form" },
            "variant": "headlineMedium"
          },
          {
            "type": "Card",
            "children": [
              {
                "type": "Column",
                "gap": "sm",
                "children": [
                  {
                    "type": "Text",
                    "content": { "tr": "Kişisel Bilgiler", "en": "Personal Information" },
                    "variant": "titleMedium"
                  },
                  { "type": "Dropdown", "bind": "customerType" },
                  {
                    "type": "Row",
                    "gap": "sm",
                    "children": [
                      { "type": "Expanded", "children": [{ "type": "TextField", "bind": "firstName" }] },
                      { "type": "Expanded", "children": [{ "type": "TextField", "bind": "lastName" }] }
                    ]
                  },
                  { "type": "TextField", "bind": "tckn" },
                  { "type": "TextField", "bind": "taxNumber" },
                  { "type": "DatePicker", "bind": "birthDate" }
                ]
              }
            ]
          },
          {
            "type": "Card",
            "children": [
              {
                "type": "Column",
                "gap": "sm",
                "children": [
                  {
                    "type": "Text",
                    "content": { "tr": "Adres Bilgileri", "en": "Address Information" },
                    "variant": "titleMedium"
                  },
                  {
                    "type": "Row",
                    "gap": "sm",
                    "children": [
                      { "type": "Expanded", "children": [{ "type": "Dropdown", "bind": "city" }] },
                      { "type": "Expanded", "children": [{ "type": "Dropdown", "bind": "district" }] }
                    ]
                  },
                  { "type": "TextArea", "bind": "addressLine" }
                ]
              }
            ]
          },
          {
            "type": "Component",
            "ref": "branch-selection",
            "bind": {
              "branchCode": "selectedBranchCode",
              "branchName": "selectedBranchName",
              "cityCode": "city"
            }
          },
          { "type": "Divider" },
          {
            "type": "Column",
            "gap": "xs",
            "children": [
              { "type": "Checkbox", "bind": "consentKVKK" },
              { "type": "Checkbox", "bind": "consentMarketing" }
            ]
          },
          {
            "type": "Row",
            "gap": "sm",
            "mainAxisAlignment": "end",
            "children": [
              { "type": "Button", "label": { "tr": "İptal", "en": "Cancel" }, "variant": "outlined", "action": "cancel" },
              { "type": "Button", "label": { "tr": "Kaydet", "en": "Save" }, "variant": "filled", "icon": "save", "action": "submit", "command": "urn:vnext:flow:transition:customer:registration:${param}:submit" }
            ]
          }
        ]
      }
    ]
  }
}
```

---

## Sıradaki Adımlar

- Bileşen türlerinin tam listesi için → [View Yapısı](./view-yapisi)
- `x-lov`, `x-lookup`, `x-conditional` gibi schema uzantılarını anlamak için → [Schema Tanımı](./schema-tanimi)
- LOV cascade ve lookup veri akışını anlamak için → [Data Akışı](./data-akisi)
