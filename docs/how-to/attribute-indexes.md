---
sidebar_position: 2
title: Attribute Index'leri (x-indexed)
sidebar_label: Attribute Index'leri
description: Master şemadaki x-indexed alanları için CLI ile SQL üretme, DBA'nın index'leri hazırlaması ve runtime'ın hazır projeksiyonlara yönlendirmesi
---

# Attribute Index'leri (`x-indexed`)

<sup>New</sup> v0.0.94 — `x-indexed: true`, bir master şemadaki instance-data alanını **veritabanı index hazırlığı** için işaretler. Hazırlanan index'ler sayesinde runtime, listeleme sorgularında JSON değerlerini her seferinde çıkarıp dönüştürmek yerine kalıcı (stored generated) kolonlar ve gerçek PostgreSQL index'leri üzerinden filtreler ve sıralar. Bu sayfa şemada neyin işaretleneceğini, SQL'in nasıl üretilip DBA tarafından uygulandığını ve runtime'ın index'leri nasıl kullandığını anlatır.

Sürüm gereksinimleri: runtime **v0.0.94+**, vnext-schema **0.0.54+**, workflow CLI **1.0.14+**.

## Ne yapar, ne yapmaz

`x-indexed`, sorgu **izni** vermez; yalnızca fiziksel hazırlık talep eder. Üç vocabulary birbirinden bağımsızdır:

| Anahtar | Sorumluluk |
|---------|------------|
| `x-filterOperators` | Alan üzerinde hangi filtre operatörlerine izin verildiği |
| `x-sortable` | Alanın sıralama (orderBy) için kullanılıp kullanılamayacağı |
| `x-indexed` | Alan için stored generated column + index hazırlığı talebi |

`x-indexed: true` olan ama `x-filterOperators` tanımlanmamış bir alan **yine filtrelenemez**. Tersine, `x-filterOperators` olan ama `x-indexed` olmayan bir alan filtrelenir; sadece JSON ifadesiyle çalışır. İzin modeli için bkz. [Instance Filtering](./instance-filtering#şema-tabanlı-filtrelenebilirlik-ve-sıralama).

:::warning
Şemayı publish etmek **index oluşturmaz**. Index'ler, CLI'ın ürettiği SQL'i DBA'nın bakım penceresinde çalıştırmasıyla oluşur (bkz. [Index oluşturma akışı](#index-oluşturma-akışı)). Runtime yalnızca salt-okunur bir "hazır index kataloğu"na bakar.
:::

## Master şema koşulu

`x-indexed` yalnızca **master** şemalarda kullanılabilir. Master işareti, şema bileşeninin `attributes.type` alanının **tam olarak** `"master"` değerini taşımasıdır:

- `attributes.type` serbest metindir; enum ile kısıtlanmaz, eski ve özel tipler geçerliliğini korur. Publish için boş olmaması yeterlidir.
- Yalnızca `"master"` değeri (büyük/küçük harf dahil birebir eşleşme) `x-indexed` metadata'sına izin verir ve index SQL'ine katkı sağlar. Eksik, `null`, boş ya da başka bir değer hiçbir zaman master anlamına gelmez.
- Ayrı bir kök seviye `type` alanı **yoktur**; master işareti yalnızca `attributes.type`'tadır.
- `latest` referansı master olmayan bir sürüme çözümleniyorsa daha eski bir master sürüme geri düşülmez.

Master olmayan bir şemada `x-indexed` — değeri `false` olsa bile — **publish hatasıdır**:

```
Field 'amount': x-indexed is only allowed when attributes.type is 'master'.
```

## Desteklenen alan tipleri ve path kuralları

| Durum | Destek |
|-------|--------|
| Skalar `string`, `number`, `integer`, `boolean` | Evet |
| Tarih | Evet — `"type": "string"` + `"format": "date-time"` (ISO-8601 offset açıkça parse edilir) |
| İç içe (nested) skalar — sabit `object` → `properties` yolu altında | Evet |
| `array` ve `array` içindeki alanlar | Hayır |
| `object` değerli alanın kendisi | Hayır |
| `$ref` üzerinden ulaşılan yol | Hayır |
| Koşullu / birleşik şema düğümleri (`if`/`then`, `oneOf`, `anyOf`, `allOf`) | Hayır |
| Belirsiz tip (`type` dizisi, `type` yok) | Hayır |

Desteklenmeyen bir yolda `x-indexed` publish'te reddedilir:

```
Field 'items': x-indexed requires an explicit scalar type under object properties; arrays, references and conditional schemas are not supported.
```

`x-indexed` değeri boolean olmalıdır (`true`/`false`). Şema içindeki JSON Schema `type` anahtar sözcükleri anlamını korur; `attributes.type` ile karıştırılmamalıdır.

## Örnek

```json title="Schemas/order-master.json"
{
  "key": "order-master",
  "domain": "sales",
  "flow": "sys-schemas",
  "version": "1.0.0",
  "flowVersion": "1.0.0",
  "tags": ["orders"],
  "attributes": {
    "type": "master",
    "schema": {
      "type": "object",
      "properties": {
        "amount": {
          "type": "number",
          "x-indexed": true,
          "x-filterOperators": ["gt", "ge", "lt", "le", "between"],
          "x-sortable": true
        },
        "createdOn": {
          "type": "string",
          "format": "date-time",
          "x-indexed": true,
          "x-filterOperators": ["ge", "le", "between"],
          "x-sortable": true
        },
        "customer": {
          "type": "object",
          "properties": {
            "name": {
              "type": "string",
              "x-indexed": true,
              "x-filterOperators": ["eq", "like", "startswith", "endswith"]
            }
          }
        },
        "notes": {
          "type": "string"
        }
      }
    }
  }
}
```

`amount` ve `createdOn` için B-tree, `customer.name` için metin araması (`like`/`startswith`/`endswith`/`contains`) nedeniyle ek olarak trigram GIN index'i üretilir. `notes` işaretlenmediği için hiçbir fiziksel yapı hazırlanmaz.

## Index oluşturma akışı

```
Master şema (x-indexed)  ──►  wf indexes generate  ──►  SQL batch  ──►  DBA (bakım penceresi)  ──►  AttributeIndexCatalog  ──►  runtime yönlendirme
```

### 1. SQL üretimi (CLI, offline)

Domain çalışma alanında, `vnext.config.json`'ın bulunduğu dizinden:

```bash
wf indexes generate --output ./index-sql
wf indexes generate --flow orders --output ./index-sql
```

| Seçenek | Varsayılan | Açıklama |
|---------|-----------|----------|
| `--flow <key>` | tümü | Yalnızca bu workflow için SQL üret |
| `-o, --output <dir>` | `index-sql` | Batch klasörlerinin yazılacağı dizin |
| `--retire-obsolete` | kapalı | Artık ihtiyaç duyulmayan projeksiyonları emekliye ayır (bkz. aşağıda) |

Her çalıştırma `<output>/<ISO-zaman-damgası>-XXXXXX/` biçiminde **yeni bir batch klasörü** oluşturur; önceki batch'ler korunur. Klasörde:

- `<flow_key>.sql` — workflow başına bir dosya, tek transaction
- `manifest.json` — kaynak dosya yolları, sürümler, SHA-256 checksum'lar, fiziksel index tanımları
- `README.txt` — DBA için çalıştırma notları

CLI **veritabanına veya API'ye bağlanmaz**, SQL çalıştırmaz, publish yapmaz; `sync`/`update` komutlarına da bağlı değildir. Yalnızca yerel bileşen dosyalarını okur: yapılandırılmış workflow ve şema klasörleri özyinelemeli taranır, bir workflow'un tüm yerel sürümleri master gereksinimlerine katkı verir, referanslar (`latest`, artifact, minor/major, tam `-pkg.`) runtime sürüm sıralamasıyla çözümlenir. Eksik referans, tekrarlanan bileşen kimliği, cross-domain referans ya da desteklenmeyen index alanı, batch yazılmadan hata verir; referans verilen bağımlı şemaları yerel şema klasörüne getirin.

:::note
Offline üretici hangi tanımın deploy edildiğini kanıtlayamaz. DBA ya da release sahibi, çalıştırmadan önce `manifest.json`'daki sürümleri hedef ortamdaki sürümlerle karşılaştırmalıdır.
:::

### 2. DBA çalıştırması (bakım penceresi)

```bash
psql -X -v ON_ERROR_STOP=1 --dbname=vNext_SalesDb --file=index-sql/<batch>/orders.sql
```

SQL dosyası sırasıyla:

1. Workflow tablosunun varlığını doğrular; flow başına transaction-advisory lock alır.
2. `InstancesData` tablosunu **ACCESS EXCLUSIVE** modda kilitler (`lock_timeout` 5 saniye; DBA incelemesi sırasında değiştirilebilir).
3. Yeni projeksiyon eklemeden önce güncel **ve tarihsel** verideki dönüşümleri doğrular. Geçersiz değer transaction'ı iptal eder ve alan/tipi raporlar; asla sessizce `NULL`'a çevrilmez.
4. Eksik stored generated column'ları tek `ALTER TABLE` ile ekler. Kolon adları `q_<hash>` biçimindedir ve runtime'ın `v1:latest` fiziksel sözleşmesiyle uyumludur. Tarihsel satırların projeksiyonu `NULL`'dur; `IsLatest` değiştiğinde yeniden hesaplanır.
5. Mevcut index'leri PostgreSQL-normalize edilmiş bir prototiple karşılaştırır (erişim yöntemi, key/include kolonları, sıralama, collation, operator class, partial predicate). **Yapısal olarak eşdeğer mevcut index'ler — eski adlı olanlar dahil — yeniden kullanılır**; değişmiş CLI-sahipli index'ler yeniden oluşturulur; yönetilmeyen ad çakışmaları hata verir. Yeni adlar okunabilir yol + index türü + tanım hash'i içerir (63 bayt altı).
6. Güncellenen projeksiyonların eskimiş sahipli index'lerini kaldırır, seçilen index adlarını `AttributeIndexCatalog` tablosuna yazar, değişen tabloları `ANALYZE` eder ve atomik olarak commit eder.

Fiziksel yapılar alan tipine ve sorgu metadata'sına göre belirlenir: sıralı karşılaştırmalar için **B-tree**, `contains`/`like`/`startswith`/`endswith` metin aramaları için **trigram GIN** (`pg_trgm` uzantısı `public` şemasında kurulabilir olmalı, runtime'ın `tr-TR-x-icu` collation'ı mevcut olmalı).

:::warning
Bu **bakım penceresi DDL'idir**, `CREATE INDEX CONCURRENTLY` değildir: tablo kilidi tutulduğu sürece okuyucular ve yazıcılar bloklanır. Büyük tablolarda stored-column yeniden yazımı için disk, WAL, replika ve süre planlaması yapın. Hata durumunda transaction geri alınır; oturumu kapatıp/`ROLLBACK` edip **aynı script'i** yeniden çalıştırın. Kısmi yapılar hiçbir zaman "hazır" olarak işaretlenmez.
:::

Değişmemiş bir batch'in yeniden çalıştırılması index OID'lerini korur; kolon yeniden yazımı, veri taraması ve `ANALYZE` atlanır.

### 3. Tip değişikliği ve emekliye ayırma

Varsayılan olarak eskimiş projeksiyonlar, diğer aktif workflow sürümleri için korunur. Emekliye ayırmak için:

```bash
wf indexes generate --flow orders --retire-obsolete
```

Bunu yalnızca **hâlâ aktif her workflow sürümü** yerel olarak mevcutken kullanın; runtime okuyucu/yazıcılarını boşaltın ve paylaşımlı katalog TTL'inin dolmasını bekleyin (host'ları yeniden başlatmak dağıtık cache'i temizlemez). Emekliye ayırma, katalog girdisini "hazır değil" olarak işaretler, generated ifadeleri ve sahipli index'leri kaldırır; **kolonlar ve stored değerler yerinde kalır**. Tip değişikliğinden sonra eski bir sayısal/tarih cast'inin yeni yazımları reddetmesini önlemek için gereklidir. Eski kolonlar yerinde dönüştürülmez, `CASCADE` verilmez.

## Runtime yönlendirme

Runtime'ın hazır projeksiyonlara yönlendirmesi Orchestration host'ta `AttributeIndexes` bölümüyle kontrol edilir:

```json
{
  "AttributeIndexes": {
    "Enabled": true,
    "DisabledFlows": [],
    "CatalogCacheSeconds": 30
  }
}
```

| Anahtar | Tip | Varsayılan | Açıklama |
|---------|-----|------------|----------|
| `Enabled` | boolean | `false` | Sorguların hazır projeksiyonlara yönlendirilmesini açar. Kapalıyken tüm sorgular mevcut JSON ifadeleriyle çalışır |
| `DisabledFlows` | string[] | `[]` | Yönlendirmenin kapatılacağı workflow key'leri — veri ve kolonlara dokunmadan geri alma (rollback) yolu |
| `CatalogCacheSeconds` | integer | `30` | Hazır index kataloğu snapshot'ının mutlak TTL'i (saniye) |

Bu ayarlar hiçbir zaman DDL çalıştırmaz. Katalog (`AttributeIndexCatalog` tablosu) Aether dağıtık cache'i üzerinden veritabanı, veritabanı rolü ve flow şemasına göre kapsamlanır; dağıtık bir refresh lock'u replikalar arasındaki cache miss'lerini birleştirir ve paylaşımlı snapshot hazır olana kadar diğer replikalar JSON ifadesine düşer. DBA commit'inden sonra replikalar, bir sonraki katalog yenilemesinde hazır index'leri keşfeder.

**Hata davranışı:** Katalog bağlantı/okuma hataları (izin, uyumsuz katalog kolonları dahil), cache hataları ve refresh-lock hataları sorguyu düşürmez; runtime JSON ifadelerine geri döner ve `AttributeIndexCatalogFallback` (warning, EventId **70021**) loglar. Bu hatalar boş bir hazırlık snapshot'ı olarak cache'lenmez, dolayısıyla sonraki istek hemen toparlanabilir. Eksik veya tamamlanmamış projeksiyonlar da JSON ifadesiyle çalışır; filtre yetkilendirmesi bağımsız kalır.

Yönlendirmeyi geri almak için `DisabledFlows`'a workflow'u ekleyin; veri ve kolonlar sonraki bir DBA temizliği için yerinde kalır.

## Ne zaman index'lenmeli?

Bir alanı `x-indexed: true` olarak işaretlemeyi şu durumlarda değerlendirin:

- Büyük veri kümelerinde sık kullanılan filtrelerde geçiyorsa
- Sayısal ya da tarih aralığı sorgularında kullanılıyorsa
- Sık metin aramasına (`like`, `startswith`, `endswith`, `contains`) konu oluyorsa
- Düzenli olarak sıralama anahtarıysa
- Ölçülmüş bir sorgu maliyeti varsa ve index'in bunu düşürebileceği gösterilebiliyorsa

Gerçek ve sık sorgularda kullanılan alanları önceliklendirin. Yalnızca yanıt gövdesinde dönen bir alanın index'e ihtiyacı genellikle yoktur.

## Neden her alan index'lenmez?

- **Depolama ve bakım maliyeti:** Her projeksiyon bir stored generated column ve en az bir index demektir. Her yazım bu değerleri ve index'leri günceller — yazma gecikmesi, WAL hacmi ve replikasyon yükü artar. İlk hazırlık büyük tablolarda pahalı bir tablo yeniden yazımı gerektirebilir.
- **Düşük seçicilik:** Satırların çoğuyla eşleşen filtreler, az farklı değerli alanlar, kısa metin desenleri ve büyük aggregation sonuçları index'ten çok az kazanır.
- **Garanti yok:** Index'leme, 100 ms altı yanıt süresi garantisi vermez. İyileştirmeyi temsili API benchmark'ları ve sorgu planlarıyla doğrulayın.
- **Kaldırma otomatik değil:** `x-indexed`'i kaldırmak ya da `false` yapmak mevcut veritabanı yapılarını silmez; emekliye ayırma (`--retire-obsolete`) ve fiziksel temizlik ayrı DBA işleridir. `x-indexed` olmayan alan için hiçbir talep oluşmaz.

## İlgili Konular

- [Instance Filtering](./instance-filtering) — filtre formatları, `x-filterOperators` / `x-sortable` izin modeli
- [Schema](../components/schema) — şema bileşeni ve master şema davranışı
- [Workflow CLI](../tools/workflow-cli) — `wf` komutları ve `vnext.config.json`
