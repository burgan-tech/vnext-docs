---
id: row-security
title: Satır Güvenliği (Row Security)
sidebar_label: Satır Güvenliği
description: attributes.rowSecurity ile rol bazlı satır filtreleri — sözleşme, parametreler, deny-by-default değerlendirme, kapsanan yüzeyler, gateway ön koşulu, publish doğrulaması ve lookup hatası davranışı
---

# Satır Güvenliği (Row Security)

Kolon (alan) bazlı yetki zaten vardır: master şemada `x-roles`, `x-masking`, `x-encryption` (bkz. [Yetkilendirme](/docs/concepts/authorization)). v0.0.102 ile gelen **satır güvenliği** (`attributes.rowSecurity`) **satır** boyutunu ekler: bir flow, rol başına bir filtre tanımlar; runtime bu filtreyi kapsadığı instance okumalarına AND'ler ve çağıran yalnızca bir kuralın açtığı instance'ları görür. Tipik senaryo: bir şube çalışanı yalnızca kendi şubesinin başvurularını görür.

**Platformun konumu.** Runtime mekanizmayı sağlar. Hangi istek değerlerinin güvenilir olduğu ve bir kuralın ne kadar sıkı olduğu domain ekibinin sorumluluğudur (bkz. [Gateway ön koşulu](#gateway-ön-koşulu)).

:::warning[Satır güvenliği bir erişim sınırı değildir]
`rowSecurity` yalnızca instance **listesini**, **tekil GET**'i ve `GetInstances` / `GetInstance` task'lerini filtreler. `functions/state`, `functions/data`, `functions/view` gibi instance adresli yüzeyler, transition'lar ve `GetInstanceData` task'i filtrelenmez: id'sini bilen bir çağıran gizlenen bir instance'ı oralardan okuyabilir. Ayrıntı: [Filtrelenmeyen yüzeyler](#filtrelenmeyen-yüzeyler-bilinen-açık).
:::

---

## Sözleşme

Workflow seviyesinde, `attributes` içinde:

```json
"rowSecurity": {
  "rules": [
    { "roles": ["branch-staff", "branch-ops"],
      "filter": { "attributes": { "branchCode": { "eq": "$.context.Headers.x-branch-code" } } } },
    { "roles": ["region-manager"],
      "filter": { "attributes": { "branchCode": { "in": { "$param": "$.context.Headers.x-branches", "split": "," } } } } },
    { "roles": ["hq-auditor"] },
    { "roles": ["customer"],
      "filter": { "createdBy": { "eq": "$InstanceStarter" } } },
    { "roles": ["$InstanceStarter"],
      "filter": { "status": { "eq": "A" } } }
  ]
}
```

Bu örnek vnext-schema 0.0.58'deki `rowSecurity` tanımına göre doğrulanmıştır.

| Alan | Tip | Zorunlu | Açıklama |
|---|---|---|---|
| `rowSecurity` | object \| yok | Hayır | Yoksa flow **hiç filtrelenmez** (eskisi gibi). `rules` dışında bir üye publish hatasıdır (RS-E12) |
| `rowSecurity.rules` | array | **Evet** | Rol anahtarlı satır kuralları (`minItems: 1`) |
| `rules[].roles` | string[] | **Evet** | Kuralın uygulandığı roller (`minItems: 1`): statik rol adları **veya** ayrılmış kimlik rolleri `$InstanceStarter` / `$InstanceBehalfOfStarter` |
| `rules[].filter` | object | Hayır | Instance sorgularıyla aynı filtre dili. Yoksa: statik rol kuralında **tüm satırlar**, kimlik kuralında çağıranın **kendi tüm instance'ları** |

:::info[Varsayılan yoktur — deny by default]
`rowSecurity` tanımlayan bir flow'da **hiçbir statik kuralla eşleşmeyen çağıran, yazarın tanımladığı kimlik kuralları dışında hiçbir şey görmez.** "X rolü her şeyi görür" açık bir filtresiz kural olarak yazılır: `{ "roles": ["hq-auditor"] }`.
:::

### `rules[].roles`

- **Statik roller** rol grant'ları gibi büyük/küçük harf duyarsız karşılaştırılır.
- **Kimliğe bağlı ayrılmış roller:**
  - `$InstanceStarter` → satır yüklemi `createdBy eq <çağıranın ActorUserName'i>`
  - `$InstanceBehalfOfStarter` → `createdByBehalfOf eq <çağıranın UserName'i>`
- Publish'te reddedilir: `$PreviousUser` / `$PreviousBehalfOfUser` (RS-E01), dinamik grant'lar `$user.`, `$userBehalfOf.`, `$role.` (RS-E02), diğer ayrılmış roller (RS-E05). `allOf` / `anyOf` nesnesi `roles`'ta kullanılamaz — şema bir string listesi bekler, runtime JSON binding'de `400` `App:900006` döner.
- Bir statik rol ile bir ayrılmış rol aynı kuralın `roles`'unda bulunamaz (RS-E04): iki kurala bölün.

### `rules[].filter`

- Gövde, liste motorunun filtre JSON'udur (GraphQL wire biçimi): `eq ne gt ge lt le between like match startswith endswith in nin isNull includes`, `and` / `or` / `not` ile; `attributes.*` yollarında ve beyaz listedeki instance kolonlarında (`createdBy`, `createdByBehalfOf`, `modifiedBy`, `modifiedByBehalfOf`, `key`, `status`, `createdAt`, …). Bkz. [Instance Filtreleme](/docs/how-to/instance-filtering).
- Kimlik kuralında `filter` verilirse kimlik yüklemiyle AND'lenir.
- `sort`, `orderBy`, `groupBy`, `aggregations` bir kuralın parçası olamaz (RS-E13).

### Parametreler

`$.context.` ile başlayan (büyük/küçük harf duyarlı önek) bir string yaprak değer bir **parametredir**.

| Yol | Kaynak |
|---|---|
| `$.context.Headers.<ad>` | İstek header'ı (ad büyük/küçük harf duyarsız). Gateway'in yazdığı claim header'ları için |
| `$.context.QueryParameters.<ad>` | Query string — **client kontrolündedir**, güvenlik kararı için kullanmayın |
| `$.context.CurrentUser.ActorUserName` / `ActorUserId` / `UserName` / `Position` | Kimliği doğrulanmış çağıran. `sub`, `act_sub`, `client_id` `Headers` üzerinden erişilebilir |

- `$.context.Route.*`, `$.context.Query.*`, bilinmeyen bir `CurrentUser` alanı ve hatalı bir yol publish hatasıdır (RS-E07). Farklı harf büyüklüğüyle yazılmış bir önek (`$.Context.`) literal kabul edilir ve RS-W4 loglanır.
- **Kısaltmalar** (yalnızca kendi kolonlarının değeri olarak; başka yerde RS-E06): `createdBy` üzerinde `$InstanceStarter` = `$.context.CurrentUser.ActorUserName`; `createdByBehalfOf` üzerinde `$InstanceBehalfOfStarter` = `$.context.CurrentUser.UserName`.
- `like` / `match` / `startswith` / `endswith` üzerinde ve `includes` içinde parametre kullanılamaz (RS-E17): çağıranın değerindeki kaçışsız `%` ya da `_` deseni değiştirirdi.

**Diziler (`in`, `nin`, `between`):**

- **Eleman bazlı:** elemanları literal ya da parametre olan bir JSON dizisi — `"between": ["$.context.Headers.x-min", "$.context.Headers.x-max"]`.
- **Açık bölme:** `{ "$param": "<yol>", "split": "<ayraç>" }`. `split` yoksa çok değerli bir kaynak (tekrarlı header) eleman eleman alınır. Her eleman trim'lenir. `split`'in dizi almayan bir operatörde kullanılması RS-E11, iki operandı olmayan `between` RS-E10'dur.
- Değerler wire'da string'dir; her biri flow'un master şemasındaki alan tipine dönüştürülür. Dönüştürülemeyen bir değer kuralını düşürür.
- Bir **instance kolonunda** (`attributes.*` değil) virgül içeren bir `in` / `nin` / `between` değeri kuralını düşürür (liste motoru bu operandları `,` ile yeniden böler).

**Sınırlar** (`Workflow:RowSecurity`): `MaxElements` (varsayılan `100`) ve `MaxElementLength` (varsayılan `1000`) aşılırsa kural düşer. Kural, çağıranın kendi filtre uzunluk sınırlarına sayılmaz.

---

## Değerlendirme modeli

**Platform hiçbir zaman örtük bir dal eklemez**: çağıranın gördüğü her şey yazarın yazdığı bir kuraldan gelir.

1. **Rol çözümü başarısız** (provider hatası, timeout, transport, ayrıştırılamayan gövde) → **hiç satır yok**. Provider'ın "rol yok" cevabı (`204`, boş gövde, `roles: []`) ve kimliksiz çağıran rolsüz çağırandır, hata değildir.
2. **Taban — statik rol eşleşmesi.** Çağıran en az bir statik kuralda listelenen bir role sahipse taban = bu kuralların filtrelerinin **OR**'u (filtresiz kural = tüm satırlar); diğer rolleri bir şey eklemez. Hiçbir statik kural eşleşmezse taban = **hiçbiri**.
3. **Kimlik eki.** Yalnızca `roles: ["$InstanceStarter"]` ya da `["$InstanceBehalfOfStarter"]` ile tanımlanmış kurallar katkı verir, o da çağıranın kimlik değeri çözülebiliyorsa: kimlik yüklemi AND kuralın filtresi, tabana **OR**'lanır.
4. **Etkin sorgu** = çağıranın kendi filtresi **AND** (taban OR kimlik ekleri). Taban hiçbiri ve ek yoksa SQL'e gidilmeden boş sayfa döner.

**Parametre hataları asla genişletmez.** Parametreleri çözülemeyen eşleşmiş bir statik kural yine eşleşmiş sayılır ve hiçbir şey katmaz:

- eksik ya da boş parametre → hiçbir şey;
- daraltan dizi (`in`): çözülemeyen elemanlar atılır, hiç kalmazsa hiçbir şey;
- genişleten operatör (`nin`, `ne`) ya da `not` altındaki herhangi bir hata → kuralın tamamı hiçbir şey katmaz;
- tam iki değeri olmayan `between`, çok değerli kaynakla beslenen skaler operatör, sınırı aşan eleman → hiçbir şey.

### Sonuç tabloları

**Tanım A:** `branch-staff` → `branchCode eq $.context.Headers.x-branch-code`; `hq-auditor` filtresiz; kimlik kuralı yok.

| İstek | Sonuç |
|---|---|
| credential yok | hiçbiri |
| kimlik var, rol yok | hiçbiri |
| `[menu.view]` | hiçbiri |
| `[branch-staff]`, header var | kendi şubesi |
| `[branch-staff]`, header yok | hiçbiri |
| `[branch-staff, menu.view, report.read]` | kendi şubesi |
| `[branch-staff, hq-auditor]` | tümü |
| `[hq-auditor]` | tümü |
| rol çözümü başarısız | hiçbiri |

**Tanım B:** Tanım A + `{ "roles": ["$InstanceStarter"] }`.

| İstek | Sonuç |
|---|---|
| credential yok | hiçbiri |
| kimlik var, rol yok | kendi instance'ları |
| kimlik var, `[menu.view]` | kendi instance'ları |
| kimlik var, `[branch-staff]`, header var | kendi şubesi ∪ kendi instance'ları |
| kimlik var, `[branch-staff]`, header yok | kendi instance'ları |
| kimlik yok, `[branch-staff]` | kendi şubesi |
| rol çözümü başarısız | hiçbiri |

### Hangi sürümün kuralları uygulanır?

Kural seti, flow'un **varsayılan sürümündekidir** (`sys-version-registry` pointer'ı, bkz. [Flow Varsayılan Sürümü](/docs/concepts/flow-default-version)); pointer yoksa **en son yayınlanmış** sürümdekidir. Her sürümün instance'ları için aynı tek arama kullanılır; liste ve GET `instance.FlowVersion`'ı okumaz, bu yüzden her zaman aynı sonucu verir. Bir `set-default` yürürlükteki satır kurallarını da değiştirir.

---

## Kapsanan ve filtrelenmeyen yüzeyler

### Kapsanan yüzeyler

| Yüzey | Davranış |
|---|---|
| `GET /api/v1/{domain}/workflows/{workflow}/instances` | Yüklem sayfalama, `groupBy` ve aggregation'lardan **önce** sorguya katılır; sayılar ve toplamlar yalnızca **görünür satırları** kapsar |
| `GET /api/v1/{domain}/workflows/{workflow}/instances/{instance}` | `id = <instance> AND <satır yüklemi>` ile, extension'lardan ve ETag karşılaştırmasından önce yoklanır. Dışlanmış bir instance **bulunmayan bir instance ile aynı `404`**'ü döner (dışlanmış satır için `304` yoktur). `?version=` eski bir data sürümü istese de yoklama güncel veriye yapılır |
| `GetInstances` / `GetInstance` task'leri | Aynı kurallarla, **aynı domain'de ve cross-domain**, task'in sunduğu credential ve header'larla filtrelenir — bkz. [Trigger task'leri](#trigger-taskleri) |

GET'teki `404`, liste ile **tutarlılık kontrolüdür, gizlilik sınırı değildir**.

### Filtrelenmeyen yüzeyler (bilinen açık)

Aşağıdaki yüzeyler bu sürümde satır güvenliği **uygulamaz**; id'sini bilen bir çağıran liste ve GET'in gizlediği bir instance'ı buralardan okuyabilir:

- `functions/state`, `functions/data`, `functions/view`, `functions/schema`, `functions/master`
- transition ve data geçmişi endpoint'leri, `internal/*` endpoint'leri
- `GetInstanceData` task'i, view içerik çözümü, transition'lar (key ile doğrudan tetikleme dahil), script'lerde `context.Related`, human-task listesi, event correlation seçicileri

Sonuçları:

- **Varlık kâhini (existence oracle):** dışlanmış bir instance için `GET` `404` dönerken `functions/data` `200` döner ve üzerinde bir transition başarılı olur.
- `authorize?queryRoles=true`, GET'in gizlediği bir çağıranı kabul edebilir; satır terimi yoktur.
- **SubFlow child'ları parent'ın kurallarını devralmaz.** Child kendi flow'unun `rowSecurity`'siyle (ya da hiçbiriyle) okunur; `rowSecurity` tanımlayan ve SubFlow state'i olan flow için publish RS-W7 loglar.

Bu açık, kabul edilmiş bir risktir ve kapatılması için tarih yoktur. Bu yüzeylere erişimi gateway'de (`authorize`) denetleyin.

### Trigger task'leri

`GetInstances` / `GetInstance` task'i sunduğu header setiyle filtrelenir — aynı domain'de yerel okumayla, başka domain'de o domain'in public liste ya da GET endpoint'iyle. Bu set yalnızca `sub`, `act_sub`, `position`, `client_id` ve `role` taşır. Bir kuralın okuduğu header **otomatik iletilmez**: domain ekibi onu task'in input mapping'inde verir, aksi halde parametreli kural hiçbir şey katmaz. Query parametrelerinin task karşılığı yoktur. Hedef domain, çağıran runtime'ın sunduğu header setine güvenir — başka bir domain'i trigger task ile okumak mapping'in yazarı kadar güçlüdür.

---

## Gateway ön koşulu

Satır güvenliği isteğin geldiği header setine güvenir. Gateway, liste ve GET'e giden **her public rotada** `role` header'ını ve bir kuralın okuduğu **her header'ı** token'dan çözdüğü değerlerle **silmeli ya da üzerine yazmalı, asla eklememelidir** (strip or overwrite, never append). Varsayılan caller-role provider altında `role` header'ı rol kümesinin **kendisidir**; bir header üzerinde `split` yalnızca bu ön koşul altında güvenlidir.

`QueryParameters` mükemmel bir gateway arkasında bile client kontrolündedir: değeri çağıran seçer. Ona dayanan bir kural o çağırana karşı hiçbir şeyi kısıtlamaz ve **asla bir sınır değildir**. Publish onu `x-roles`, `x-masking`, `x-encryption` yollarında reddeder (RS-E18 ya da daha sıkı kod), diğer her kullanımda RS-W6q loglar.

Header değerleri (ör. `x-branch-code`), deployment `Telemetry:Logging:Body:AdditionalSensitiveHeaderNames` ile redakte etmedikçe istek loglarında görünebilir; satır güvenliğinin kendisi parametre değeri loglamaz.

---

## Publish doğrulaması

**Hatalar (RS-E\*) publish'i reddeder. Uyarılar (RS-W\*) yalnızca loglanır:** publish yanıtı değişmez ve flow canlıya geçer.

| Kod | Önem | Anlamı |
|---|---|---|
| RS-E01 | hata | Kural rolü olarak `$PreviousUser` / `$PreviousBehalfOfUser` |
| RS-E02 | hata | Kural rolü olarak dinamik grant (`$user.`, `$userBehalfOf.`, `$role.`) |
| RS-E03 | (ayrılmış) | `allOf` / `anyOf` — runtime üretmez; JSON binding'de reddedilir (`400` `App:900006`), önce vnext-schema raporlar |
| RS-E04 | hata | Statik ve ayrılmış roller tek kuralda |
| RS-E05 | hata | `$InstanceStarter` / `$InstanceBehalfOfStarter` dışında ayrılmış rol |
| RS-E06 | hata | Instance-starter kısaltması ait olmadığı kolonda |
| RS-E07 | hata | Hatalı `$.context.` yolu, bilinmeyen kaynak (`Route`, `Query`) ya da bilinmeyen `CurrentUser` alanı |
| RS-E08 | hata | `x-encryption: encrypt` yolunda ya da üstünde filtre |
| RS-E09 | hata | Geçersiz operatör ya da filtre JSON şekli |
| RS-E10 | hata | Tam iki operandlı dizi olmayan `between` |
| RS-E11 | hata | Dizi almayan operatörde `split` |
| RS-E12 | hata | `rules` eksik ya da boş, veya `rowSecurity` / kural üzerinde bilinmeyen üye |
| RS-E13 | hata | Kural filtresinde `sort` / `orderBy` / `groupBy` / `aggregations` |
| RS-E14 | hata | `x-encryption: hash` yolunda filtre |
| RS-E15 | hata | `x-masking` yolunda filtre |
| RS-E16 | hata | `sys-*` flow'unda `rowSecurity` |
| RS-E17 | hata | `like` / `match` / `startswith` / `endswith` üzerinde ya da `includes` içinde parametre |
| RS-E18 | hata | `x-roles` yolunda `QueryParameters` değeri |
| RS-W0 | uyarı | Master şema publish'te çözülemedi: şema bilen kontroller atlandı; korumalı yol kuralları okuma anında düşürülür |
| RS-W1 | uyarı | Filtrelenen alan master şemada tanımlı değil |
| RS-W2a | uyarı | `x-indexed` olmayan alanda `in` / aralık / desen operatörü |
| RS-W2b | uyarı | İndeksi olmayan `createdBy` / `createdByBehalfOf` üzerinde kimlik kuralı ya da filtre |
| RS-W2c | uyarı | Kuralın tek yüklemleri `ne` / `nin` |
| RS-W4 | uyarı | Farklı harf büyüklüğünde `$.context.`: literal kabul edildi |
| RS-W5 | uyarı | `required` olmayan alanda `not` / `nin` o alanı taşımayan satırlarla da eşleşir |
| RS-W6q | uyarı | `QueryParameters` kullanıldı: client kontrolünde, sınır değil |
| RS-W6r | uyarı | `x-roles` yolunda `Headers` değeri |
| RS-W7 | uyarı | SubFlow child'ları `rowSecurity`'yi devralmaz |

Master şema çözülebiliyorsa korumalı yol kontrolleri (RS-E08, E14, E15, E18) hatadır; çözülemiyorsa RS-W0'a düşer.

---

## Lookup hatası

:::danger[Davranış değişikliği — rowSecurity tanımlamayan flow'lar dahil]
v0.0.102 ile instance listesi, tekil GET ve `GetInstances` / `GetInstance` task'leri flow tanımını bir kez (önbellekli) arar. Bu arama "tanım yok" dışında bir hatayla başarısız olursa okuma **o hatayla olduğu gibi başarısız olur** — flow'da `rowSecurity` olsun ya da olmasın. Önceden liste bu hataya rağmen satır döndürüyordu ve GET flow'u hiç aramıyordu.
:::

| Arama sonucu | Okuma |
|---|---|
| Flow yüklendi, `rowSecurity` tanımlı | Kurallarla filtrelenir |
| Flow yüklendi, `rowSecurity` yok — ya da yayınlanmış tanım yok | Filtresiz, birebir eskisi gibi |
| Diğer her hata | **Başarısız** — arama hatası olduğu gibi döner |

Okumayı başarısız kılan tipik hatalar:

| Kod | HTTP | Neden |
|---|---|---|
| `Instance:100052` | 409 | Geçersiz varsayılan sürüm pointer'ı |
| `Instance:100053` | 503 | Sürüm registry'si okunamıyor (geçici) |
| `Instance:100051` | 404 | Flow sürümü aktive edilmemiş |

- Liste hatayı döner, asla boş sayfa dönmez; GET hatayı ETag'den önce döner. Task'ler diğer okuma hataları gibi başarısız olur (cross-domain'de partner'ın endpoint'i aynı hatayı döner).
- O flow'un start ve transition'ları zaten aynı hatayla başarısız oluyordu; tanımı okunamayan bir flow'un hiçbir instance'ı okunamaz.
- Span `vnext.rowsecurity.outcome = denied-flow-load` taşır ve uyarı **20509** hata koduyla loglanır.
- Satır güvenliği uygulamayan yüzeyler (view çözümü, trigger'lar, `GetInstanceData`, function'lar) etkilenmez.

**Operatör aksiyonu:** yükseltmeden önce her flow'un `sys-version-registry` pointer'ının yayınlanmış bir sürüme (ya da `"latest"`'a) çözüldüğünü ve registry'nin erişilebilir olduğunu doğrulayın; rollout'tan sonra 20509 uyarısını izleyin.

Component önbellek anahtarları bir şekil (shape) segmenti kazanır; yükseltmeden sonraki ilk okumalar önbelleği bir kez kaçırır.

---

## Geri alma (rollback)

:::warning[Runtime'ı bu sürümün altına düşürmeyin]
Satır güvenliğinden önceki bir runtime `rowSecurity`'yi **tamamen yok sayar** ve her flow'un her satırını servis eder — tanım ne içerirse içersin. Böyle bir runtime'da flow tanımındaki hiçbir şey koruma sağlamaz.

Tek korumalar:

- herhangi bir flow `rowSecurity`'ye dayanırken runtime'ı bu sürümün altına düşürmemek; ya da
- eski bir runtime o flow'lara hizmet ettiği sürece, o flow'ların instance listesini ve tekil GET'ini gateway'de bloklamak ya da yetkilendirmek.
:::

Flow'dan `rowSecurity`'yi kaldırmak bugünkü davranışı geri getirir (görünürlüğü **genişletir**). Rollout sırasında aynı sürüm numarasını `rowSecurity` eklemek için force re-publish etmeyin; yeni bir sürüm yayınlayın.

---

## Gözlemlenebilirlik

Log ve span çıktısı parametre **adlarını**, kural indekslerini, hata kodlarını taşır; parametre, header ya da kimlik **değeri** asla yazılmaz. `rowSecurity`'si olmayan bir flow hiçbir row-security tag'i taşımaz.

| Tag | Değer |
|---|---|
| `vnext.rowsecurity.applied` | okuma değerlendirildi |
| `vnext.rowsecurity.outcome` | `unrestricted`, `filtered`, `excluded`, `denied-no-match`, `denied-no-contribution`, `denied-resolution-failed`, `denied-flow-load` |
| `vnext.rowsecurity.rules` | eşleşen kural indeksleri |
| `vnext.rowsecurity.missing_params` | çözülemeyen parametre adları |
| `vnext.rowsecurity.flow_version` | çözülen kural seti sürümü |

EventId'ler: 20505 okuma kararı, 20506 GET instance'ı yüklem dışında buldu (`404`), 20507 uygulanabilir bir kural hiçbir şey katmadı, 20508 rol çözümü başarısız, 20509 kural seti yüklenemedi, 20510 publish şema kontrolleri atlandı (RS-W0), 20511 publish SubFlow child'ları devralmaz (RS-W7). 20507 bir **Warning**'dir ve kuralın okuduğu header'ı göndermeyen bir çağıranın **her isteğinde** tetiklenebilir — trafikle ölçeklenir.

---

## Örnekler

- [`rs-a.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/row-security-lab/rs-a.json) — Tanım A (şube header'ı + filtresiz denetçi)
- [`rs-b.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/row-security-lab/rs-b.json) — Tanım B (Tanım A + `$InstanceStarter`)
- [`rs-params.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/row-security-lab/rs-params.json) — tüm parametre biçimleri (`$param` + `split`, eleman bazlı diziler, `between`, `not`, `CurrentUser`)
- [RowSecurityLab integration testleri](https://github.com/burgan-tech/vnext-example/tree/master/tests/Core.IntegrationTests/Tests/RowSecurityLab)

## İlgili

- [Yetkilendirme](/docs/concepts/authorization) — rol grant'ları, caller-role provider, alan bazlı görünürlük
- [Flow Varsayılan Sürümü](/docs/concepts/flow-default-version) — hangi sürümün kuralları uygulanır
- [Workflow](/docs/components/workflow) — `attributes.rowSecurity`
- [GetInstances Task](/docs/components/tasks/get-instances) · [GetInstance Task](/docs/components/tasks/get-instance)
- [Instance Filtreleme](/docs/how-to/instance-filtering) — filtre dili
