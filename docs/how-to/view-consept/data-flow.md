---
id: data-akisi
title: Data Akışı
sidebar_label: Data Akışı
sidebar_position: 5
description: LOV yükleme, cascade bağımlılığı, lookup ve binding ifadelerinin çalışma prensibi
---

# Data Akışı

Bu sayfa, bir ekranda verinin nasıl yüklendiğini, nasıl bağlandığını ve bileşenler arasında nasıl aktığını anlatır.

---

## Veri Kaynakları

Renderer aynı anda üç farklı veri kaynağını kullanır:

| Kaynak | İfade | Açıklama | Değişebilir mi? |
|--------|-------|----------|----------------|
| **formData** | `$form.fieldName` | Kullanıcının doldurduğu anlık form verisi | Evet — kullanıcı her yazdığında güncellenir |
| **instanceData** | `$instance.fieldName` | Backend'den gelen mevcut kayıt (ör. düzenleme modunda) | Hayır — sadece okunur |
| **params** | `$param.fieldName` | Üst bileşenden gelen parametre | Hayır — üst bileşen değiştirirse güncellenir |

Bu üç kaynak birleştirilip koşullar ve ifadeler bu birleşik veri üzerinden hesaplanır. Öncelik sırası: `formData` > `instanceData` > `params`

---

## LOV (List of Values) Yükleme Akışı

`x-lov` tanımlı bir alan için Renderer şu adımları izler:

```
Schema okunur
    ↓
x-lov tanımı bulunur
    ↓
Filtre parametreleri varsa değerleri hesaplanır
    ↓
Tüm required filtreler dolu mu?
    ├── Hayır → API çağrısı yapılmaz, dropdown devre dışı
    └── Evet → API çağrısı yapılır
         ↓
      Yanıt alınır
         ↓
      valueField / displayField ile liste oluşturulur
         ↓
      Dropdown seçenekleri gösterilir
```

### Temel LOV — Filtresiz

`city` alanı her zaman şehirlerin tam listesini döndürür; herhangi bir parametre gerekmez:

```json title="schema.json (ilgili kısım)"
"city": {
  "type": "string",
  "x-lov": {
    "source": "urn:vnext:fn:shared:get-cities",
    "valueField": "$.response.data.code",
    "displayField": "$.response.data.name"
  }
}
```

Renderer ekran açılışında `get-cities` API'sini çağırır ve şehir listesini Dropdown'a doldurur.

---

## Cascade LOV

Bir LOV'un başka bir alanın değerine bağlı olduğu durumlar **cascade LOV** olarak adlandırılır. Klasik örnek: şehir seçilmeden ilçe listesi boş kalır; şehir değişince ilçe listesi yenilenir.

```json title="schema.json"
"district": {
  "type": "string",
  "x-lov": {
    "source": "urn:vnext:fn:shared:get-districts",
    "valueField": "$.response.data.code",
    "displayField": "$.response.data.name",
    "filter": [
      { "param": "cityCode", "value": "$form.city", "required": true }
    ]
  },
  "x-conditional": {
    "enableIf": { "field": "city", "operator": "isNotEmpty" }
  }
}
```

**Nasıl çalışır:**

1. Ekran açılır — `city` boş, `district` API çağrısı yapılmaz, dropdown devre dışı
2. Kullanıcı şehir seçer — `$form.city` değeri güncellenir
3. Renderer `district` LOV filtresini kontrol eder: `cityCode` = `$form.city` = artık dolu
4. `get-districts?cityCode=34` API çağrısı yapılır
5. İlçe listesi yüklenir, dropdown etkinleştirilir
6. Kullanıcı farklı bir şehir seçer → ilçe listesi temizlenir ve yeniden yüklenir

### `required` filtre kuralı

| `required` değeri | Davranış |
|-------------------|----------|
| `true` | Parametre boşsa API çağrısı yapılmaz. Tüm `required: true` filtreler dolmadan liste yüklenmez. |
| `false` (veya yazılmamışsa) | Parametre boş olsa da API çağrısı yapılır; filtre varsa gönderilir, yoksa çağrı parametresiz yapılır. |

---

## Lookup

**Lookup** (`x-lookup`), view render edilirken bir kaynaktan veri çekip `$lookup` namespace'i altına yükler. `resultField` path'inin işaret ettiği değere göre **hem tekil nesne hem de dizi (array)** döndürebilir:

- **Tekil nesne** → seçilen şubenin adres, telefon, çalışma saatleri gibi detaylarını göstermek için (alanlara `$lookup.<ad>.<alan>` ile erişilir).
- **Dizi** → bir liste döndürmek için; `ForEach` ile iterate edilir (aşağıda).

:::note
`resultField`'in array'i mi yoksa tek nesneyi mi işaret ettiği, lookup'ın hangi modda kullanılacağını belirler. Runtime her ikisini de destekler.
:::

Lookup yalnızca view ilk render edildiğinde bir kez yüklenmek zorunda değildir: `filter` tanımı bir **binding**'e (`$form.*`, `$instance.*`, `$param.*`) bağlıysa, lookup o binding'in değişimini **izler** ve değer değiştikçe **kendini yeniden yükler** (bkz. [Filtreye Göre Yeniden Yükleme](#filtreye-göre-yeniden-yükleme-binding-takibi)).

### 1. Schema'da Tanımlama

```json title="schema.json"
"branchDetail": {
  "type": "object",
  "x-lookup": {
    "source": "urn:vnext:fn:shared:get-branch-detail",
    "resultField": "$.response.data",
    "filter": [
      { "param": "branchCode", "value": "$instance.selectedBranchCode", "required": true }
    ]
  }
}
```

### 2. View'da Aktifleştirme

Lookup'ın çalışması için view kök seviyesinde `lookups` dizisine eklenmesi gerekir:

```json title="view.json (kök)"
{
  "$schema": "https://amorphie.io/meta/view-vocabulary/1.0",
  "dataSchema": "urn:vnext:res:schema:customer:registration-form",
  "lookups": ["branchDetail"],
  "view": { ... }
}
```

`lookups` listesindeki her isim schema'da `x-lookup` tanımlı bir property ile eşleşmelidir.

### 3. View'da Kullanma

Lookup verisi `$lookup.alanAdı.property` ifadesiyle erişilir:

```json
{ "type": "Text", "content": "$lookup.branchDetail.name" },
{ "type": "Text", "content": "$lookup.branchDetail.address" },
{ "type": "Text", "content": "$lookup.branchDetail.phone" }
```

### 4. Dizi (Array) Lookup'ı ForEach ile Kullanma

`resultField` bir dizi işaret ediyorsa, `$lookup.<ad>` doğrudan bir array'e çözülür ve `ForEach` ile iterate edilir. Bu durumda **`$lookup.<ad>`** array container'ın kendisidir; eleman alanlarına **`$item.*`** ile erişilir (`$lookup.*` ile değil).

```json title="schema.json"
"branchList": {
  "x-lookup": {
    "source": "urn:vnext:fn:shared:list-branches",
    "resultField": "$.response.data.branches"
  }
}
```

```json title="view.json"
{
  "type": "ForEach",
  "source": "$lookup.branchList",
  "template": {
    "type": "Card",
    "children": [
      { "type": "Text", "content": "$item.name" },
      { "type": "Text", "content": "$item.address" }
    ]
  }
}
```

`branchList` ismi yine view kökündeki `lookups` dizisine eklenmelidir.

### Filtreye Göre Yeniden Yükleme (Binding Takibi)

Lookup'ın `filter` parametreleri bir binding ifadesine bağlanabilir. Renderer bu binding'in değerini izler; değer değiştiğinde lookup **otomatik olarak yeniden yüklenir**. Bu, cascade LOV davranışının lookup karşılığıdır.

```json title="schema.json"
"branchDetail": {
  "type": "object",
  "x-lookup": {
    "source": "urn:vnext:fn:shared:get-branch-detail",
    "resultField": "$.response.data",
    "filter": [
      { "param": "branchCode", "value": "$form.selectedBranchCode", "required": true }
    ]
  }
}
```

- Kullanıcı `selectedBranchCode` değerini değiştirdiğinde, `branchDetail` lookup'ı yeni `branchCode` ile yeniden çağrılır ve `$lookup.branchDetail.*` değerleri güncellenir.
- `"required": true` ise binding boşken çağrı yapılmaz; tüm zorunlu filtreler dolduğunda yükleme tetiklenir.
- `value` olarak `$form.*` (kullanıcı girdisi), `$instance.*` (mevcut kayıt) veya `$param.*` (üst bileşen parametresi) kullanılabilir.

Bu sayede lookup yalnızca ilk render'da değil, ilgili binding her değiştiğinde güncel veriyi sunar.

---

## Alt Bileşende Parametre Alma

Bir alt bileşen (nested component), üst formdan parametre alabilir. Alt bileşen bu parametreye `$param.fieldName` ile erişir.

**Üst form view.json:**

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

**Alt bileşen schema.json:**

```json title="branch-selection/schema.json"
"branchCode": {
  "type": "string",
  "x-lov": {
    "source": "urn:vnext:fn:shared:get-branches",
    "valueField": "$.response.data.code",
    "displayField": "$.response.data.name",
    "filter": [
      { "param": "cityCode", "value": "$param.cityCode", "required": true }
    ]
  }
}
```

`$param.cityCode` → üst formdan gelen `city` değerini okur ve şube listesini bu şehre göre filtreler.

**Bind eşleştirmesi:**

```
Üst form bind                  →  Alt bileşen param
"cityCode": "city"             →  $param.cityCode = üst formun $form.city değeri
"branchCode": "selectedBranchCode"  →  Kullanıcı şube seçince selectedBranchCode güncellenir
```

---

## ForEach ile LOV Listesi Görüntüleme

Alt bileşenin view'ı, LOV listesini bir kart listesi olarak göstermek için `ForEach` kullanır:

```json title="branch-selection/view.json"
{
  "type": "ForEach",
  "source": "$lov.branchCode",
  "as": "branch",
  "template": {
    "type": "Card",
    "variant": "outlined",
    "onTap": [
      { "action": "select", "bind": "branchCode", "value": "$item.value" },
      { "action": "select", "bind": "branchName", "value": "$item.display" }
    ],
    "children": [
      { "type": "Text", "content": "$item.display", "variant": "titleSmall" },
      { "type": "Text", "content": "$item.address", "variant": "bodySmall" }
    ]
  }
}
```

- `"source": "$lov.branchCode"` → `branchCode` alanının LOV listesini kullan
- `"as": "branch"` → her öğeyi `branch` adıyla tanımla (şu an için `$item` ifadesi kullanılır)
- `$item.value` → LOV öğesinin değeri (valueField'dan gelen)
- `$item.display` → LOV öğesinin görüntülenen metni (displayField'dan gelen)
- `onTap` → karta tıklayınca `branchCode` ve `branchName` alanlarını güncelle

---

## URN Tabanlı Servis Adresleme

Tüm `source` değerleri, `urn:vnext:...` formatında URN adresidir. Renderer bu adresleri HTTP endpoint'lerine çevirir.

**Fonksiyon çağrıları:**

```
urn:vnext:fn:shared:get-cities
  → GET /api/v1/shared/functions/get-cities

urn:vnext:fn:shared:get-districts?cityCode=34
  → GET /api/v1/shared/functions/get-districts?cityCode=34

urn:vnext:fn:shared:get-branch-detail?branchCode=001
  → GET /api/v1/shared/functions/get-branch-detail?branchCode=001
```

**Workflow geçişleri (Button `command`):**

```
urn:vnext:flow:transition:customer:registration:${param}:submit
  → PATCH /api/v1/customer/workflows/registration/instances/{instance}/transitions/submit
```

`${param}` binding'i çalışma zamanında aktif `instanceId` ile doldurulur. URN formatlarının tam listesi, prefiks (`urn:vnext` / `urn:client`) ve binding kuralları için bkz. [URN Kataloğu ve Binding](/docs/components/urn-catalog).

URN adreslerini Backend ekibi tanımlar; tasarımcının bu dönüşümü elle yapması gerekmez.

---

## Veri Güncelleme Akışı

Kullanıcı bir alana değer girdiğinde şu sıra işler:

```
Kullanıcı yazar
    ↓
formData güncellenir
    ↓
Validasyon çalışır
    ├── Hata → errors[fieldName] = hata mesajı
    └── Başarılı → errors[fieldName] temizlenir
    ↓
Bağlı bileşenler yeniden render edilir
    ↓
LOV filtreleri kontrol edilir
    └── Bağımlı filtre değiştiyse → bağımlı LOV temizlenir ve yeniden yüklenir
```

---

## Özet: Veri İfadeleri Cheat Sheet

| İfade | Ne Zaman Kullanılır | Örnek |
|-------|---------------------|-------|
| `$form.fieldName` | Kullanıcının girdiği güncel değeri göstermek | `"content": "$form.selectedBranchName"` |
| `$instance.fieldName` | Düzenleme modunda backend verisini göstermek | `"content": "$instance.customerId"` |
| `$param.fieldName` | Alt bileşende üstten gelen veriyi kullanmak | `"value": "$param.cityCode"` |
| `$lov.fieldName` | ForEach kaynağı olarak LOV listesini kullanmak | `"source": "$lov.branchCode"` |
| `$item.value` | ForEach içinde seçim değerini okumak | `"value": "$item.value"` |
| `$item.display` | ForEach içinde görüntülenen metni okumak | `"content": "$item.display"` |
| `$lookup.field.prop` | Lookup ile yüklenen tekil nesnenin alanını okumak | `"content": "$lookup.branchDetail.address"` |
| `$lookup.field` | Dizi dönen lookup'ı `ForEach` kaynağı olarak kullanmak | `"source": "$lookup.branchList"` |
| `$ui.key` | UI durumunu (dialog açık/kapalı) okumak | `"showIf": {"field": "$ui.showDialog"}` |

---

## Sonraki Konular

- View bileşenleri ve binding sistemi → [View Yapısı](./view-yapisi)
- Schema uzantıları → [Schema Tanımı](./schema-tanimi)
