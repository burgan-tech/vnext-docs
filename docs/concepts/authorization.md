---
id: authorization
title: Yetkilendirme (Authorization)
sidebar_label: Yetkilendirme
sidebar_position: 3
description: vNext yetkilendirme modeli — sub/act_sub claim'leri, sistem rolleri, JSONPath rol grant'ları ve master şema alan görünürlüğü
---

# Yetkilendirme (Authorization)

vNext yetkilendirmesi; transition tetikleme, instance/state sorgulama ve **master şema alan görünürlüğü** kararlarını ortak bir model üzerinden verir. Bu sayfa yetkilendirmenin **tek doğruluk kaynağıdır**; workflow, schema ve function dökümanları yetkilendirmeye ihtiyaç duyduğunda buraya referans verir.

Yetkilendirme iki temel girdiye dayanır:

1. **Token claim'leri** — isteği yapan kimliğin bilgisi (`sub`, `act_sub`).
2. **Rol grant'ları** — bir transition, queryRole veya şema alanı üzerinde `allow` / `deny` kuralları.

:::info[DENY önceliklidir]
Tüm grant değerlendirmelerinde **DENY her zaman ALLOW'u geçersiz kılar.** Bir aktör hem `allow` hem `deny` eşleşmesi alıyorsa sonuç `deny` olur.
:::

---

## Token Claim'leri: `sub` ve `act_sub`

vNext, "adına işlem yapma" (on-behalf-of) senaryolarını ayırt etmek için iki claim kullanır:

| Claim | Anlam |
|-------|-------|
| `sub` | **Adına işlem yapılan** müşteri (subject) |
| `act_sub` | **İşlem yapan** kullanıcı (actor) |

Örneğin bir çağrı merkezi temsilcisi müşteri adına bir işlem başlattığında: `act_sub` temsilcinin kimliği, `sub` ise müşterinin kimliğidir. Bireysel kullanımda ikisi aynı olabilir.

Bu ayrım, hem **sistem rollerinde** (actor mı subject mı?) hem de **JSONPath grant'larında** (`$user` vs `$userBehalfOf`) belirleyicidir.

---

## Ön Tanımlı Sistem Rolleri

Instance yetkilendirmesi için (transition `roles`, state/flow `queryRoles` veya master şema alan görünürlüğü) ön tanımlı sistem rolleri kullanılabilir. İlk dördü instance bağlamına göre çalışma zamanında çözülür; `$Everyone` hiçbir şey okumaz:

| Rol | Çözülen kimlik | Açıklama |
|-----|----------------|----------|
| `$InstanceStarter` | Actor | Instance'ı **başlatan** kullanıcı |
| `$PreviousUser` | Actor | Bir **önceki** transition'ı tetikleyen kullanıcı |
| `$InstanceBehalfOfStarter` | Subject | Instance'ı başlatan **subject** (adına işlem yapılan token) |
| `$PreviousBehalfOfUser` | Subject | Bir önceki transition'ı tetikleyen **subject** (adına işlem yapılan token) |
| `$Everyone` | — | <sup>New</sup> v0.0.105 **Her çağıran** — rolü olsun olmasın, instance yüklü olsun olmasın. Ayrıntı: [`$Everyone`](#everyone--her-çağıran) |

`$InstanceStarter` / `$PreviousUser` `act_sub` (actor), `$InstanceBehalfOfStarter` / `$PreviousBehalfOfUser` `sub` (subject) tarafıyla karşılaştırılır.

**roleGrant örneği:**

```json
{
  "roles": [
    { "role": "$InstanceStarter", "grant": "allow" },
    { "role": "$PreviousUser", "grant": "allow" }
  ]
}
```

### `$Everyone` — her çağıran

<sup>New</sup> v0.0.105 `$Everyone`, **her çağıran için Yes** olan bir kimlik yaprağıdır: rolü olan, rolü olmayan, instance'lı (transition, `queryRoles`, `x-roles`) ya da instance'sız ([başlatma yetkisi](#instance-başlatma-yetkisi-authorizetypeinstance)) her değerlendirmede eşleşir. Bu yüzden `deny $Everyone` herkesi reddeder, `allow $Everyone` herkesi — rolsüz çağıran dahil — kabul eder.

```json
"x-roles": [
  { "role": "$Everyone", "grant": "deny" }
]
```

| Kural | Açıklama |
|-------|----------|
| Kabul edildiği yerler | Her rol-grant yüzeyi: transition `roles`, workflow / state `queryRoles`, `availableIn[].roles`, function `roles`, SubFlow override'ları, şema `x-roles` ve `allOf` / `anyOf` çocuğu olarak |
| Reddedildiği yerler | `x-masking.roles` / `x-encryption.roles` — her çağıranı muaf tutardı; publish reddeder, okuma yolu da düşürür (fail closed). `rowSecurity.rules[].roles` — RS-E05 ([Satır Güvenliği](/docs/concepts/row-security)) |
| Yazım | **Ordinal** (büyük/küçük harf duyarlı): `$everyone` ya da `$EVERYONE` rol-grant alan her yüzeyde publish hatasıdır (mesaj: `predefined roles are case-sensitive, write '$Everyone'`). Bu denetim yalnız `$Everyone` için yapılır; eski sistem rolleri için yayımlanmış tanımları kırmamak adına eklenmedi |
| Çağıranın rolü | Karar grant tarafında verilir: `role: $Everyone` header'ı gönderen çağıran hiçbir şeyi değiştirmez |
| Statik rol çakışması | Adı tam olarak `$Everyone` olan **statik** bir rolü hedefleyen grant artık her çağıranı kapsar — ön tanımlı eşleşme statik karşılaştırmadan önce çalışır |

"Bu alanı herkesten gizle" için önceki geçici çözüm `deny $InstanceStarter` + `allow $InstanceStarter` idi; yalnızca üç değerli eşleştiricinin Unknown davranışı sayesinde çalışıyordu. Çalışmaya devam eder, ama yeni tanımlarda niyeti açıkça söyleyen `deny $Everyone` kullanın.

**Örnek:** [`role-matrix-combinator-master.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Schemas/role-matrix-lab/role-matrix-combinator-master.json) — `hiddenFromAll` (`deny $Everyone`) ve `hiddenByWorkaround` (eski yazım) alanları; testler: [`EveryoneGrantTests.cs`](https://github.com/burgan-tech/vnext-example/blob/master/tests/Core.IntegrationTests/Tests/RoleMatrixLab/EveryoneGrantTests.cs).

---

## Instance Verisi JSONPath Yetkilendirmesi

`roles` içindeki `role` değerleri **JSONPath tarzı** ifadeler kullanabilir. Runtime, token değerlerini **ScriptContext**'ten (**`Instance.Data`** dahil) okunan bağlam değerleriyle karşılaştırır. Bu sayede statik rol listeleri yerine **instance verisine bağlı** dinamik yetkilendirme kurulabilir.

| Prefix | Karşılaştırılan token | Karşılaştırılan bağlam değeri |
|--------|------------------------|-------------------------------|
| `$user.<jsonpath>` | **Actor** (`act_sub`) | Bağlamdaki `<jsonpath>` değeri |
| `$userBehalfOf.<jsonpath>` | **Subject** (`sub`, adına işlem) | Bağlamdaki `<jsonpath>` değeri |
| `$role.<jsonpath>` | **Rol** | Bağlamdaki `<jsonpath>` değeri |

**Örnek yollar** (workflow veri şemanıza uymalıdır):

```text
$user.$.context.Instance.Data.customer.ownerUserId
$user.$.context.Instance.Data.assignedUsers[*].userId
$userBehalfOf.$.context.Instance.Data.customer.behalfOfUserId
$role.$.context.Instance.Data.permissions.requiredRole
$role.$.context.Transition.Key
```

Bu kalıplar **available transition** ve **data** yetkilendirmesinin geçerli olduğu her yerde değerlendirilir (**master şema** alan görünürlüğü dahil).

---

## Master Şema Alan Bazlı Görünürlük

Flow **master şeması**, şema property'lerinde **`x-roles`** keyword'ü tanımlayarak **alan bazlı görünürlük** uygular — yani **alan (column) seviyesinde güvenlik** sağlar. Data Function ve veri dönen endpoint'ler authorize katmanını çalıştırır ve yalnızca çağıranın görmesine izinli alanları döndürür.

<sup>New</sup> v0.0.99 `x-roles`, `x-masking` ve `x-encryption` (sırasıyla) tek bir okuma servisinden geçen tüm yüzeylerde uygulanır: **instance GET, instance liste, data function, senkron start/transition yanıtı** ve **GetInstance / GetInstances / GetInstanceData task'leri**. Önceden instance GET / liste veriyi filtresiz dönüyor, Get* task'leri sistem görünürlüğüyle (`SystemRead`) okuyordu; bu ayrıcalık kaldırıldı. Task okumaları çağıranın sunduğu credential ile değerlendirilir.

<sup>New</sup> v0.0.100 — Okuma sırası: **`x-roles` → `x-masking` → `x-encryption` (yalnız `source: runtime`) → `x-computed` (`evaluatedBy: runtime`)**. Şifreleme adımı yalnız at-rest (`source: runtime`, varsayılan) kurallarını uygular; `source: client` kuralları runtime tarafından hiç işlenmez (değer client'ın gönderdiği haliyle saklanır ve döner). Runtime computed alanlar en son, çağıranın zaten görebildiği (budanmış, maskelenmiş, şifrelenmiş) görünüm üzerinden hesaplanır; bu yüzden computed bir alan, çağıranın göremediği bir alanı açığa çıkaramaz ve kendi `x-roles` / `x-masking` kuralını almaz. Ayrıntı: [Schema Tanımı → `x-computed`](/docs/how-to/view-consept/schema-tanimi#x-computed--hesaplanan-alan).

**Credential iletimi:** her dışa giden task türü, task mapping'inin boş ya da hiç vermediği `sub`, `act_sub`, `position`, `client_id`, `role` request başlıklarını iletir; mapping'deki dolu değer kazanır. 1024 karakteri aşan ya da kontrol karakteri içeren değerler iletilmez; morph-idm'in çözdüğü roller hiçbir zaman iletilmez (`role` yalnız çağıranın gönderdiği haliyle taşınır). Başka bir kimlikle okumak için credential'ı input mapping'de verin.

> **Not:** `roles` ve `queryRoles`, transition ve state yetkilendirmesi içindir. Schema property'lerinde **field görünürlüğü** ise `x-roles` keyword'ü ile yapılır (yapı aynıdır: `role` + `grant`).

- `x-roles` tanımı **olmayan** property'ler tüm yetkili çağıranlara görünür.
- `x-roles` tanımlı property'lerde aynı sistem rolleri ve JSONPath grant'ları geçerlidir; `role` statik ad ya da JSONPath ifadesi olabilir, `grant` ∈ `allow|deny` (DENY > ALLOW). v0.0.99 ile [kombinatörler](#kombinatörler-allof--anyof) de kabul edilir.
- <sup>New</sup> v0.0.105 Bir alanı her çağırandan gizlemek için `x-roles`'u `[{ "role": "$Everyone", "grant": "deny" }]` olarak yazın; bkz. [`$Everyone`](#everyone--her-çağıran).
- `x-masking` / `x-encryption` `roles` listeleri yalnızca `allow` kabul eden muafiyet listeleridir (`$Everyone` reddedilir — her çağıranı muaf tutardı); bkz. [Schema Tanımı → `x-masking`](/docs/how-to/view-consept/schema-tanimi).
- Yapı ve örnekler için bkz. [Schema → Alan Bazlı Yetkilendirme: `x-roles`](/docs/components/schema#alan-bazlı-yetkilendirme-x-roles) ve [Schema Tanımı → `x-roles`](/docs/how-to/view-consept/schema-tanimi).
- Keyword tanımı `vnext-schema` [view-vocab.json](https://github.com/burgan-tech/vnext-schema/blob/master/vocabularies/view-vocab.json)'da yer alır.

Master şemanın davranışı ve neden `required` kullanılmaması gerektiği için bkz. [Schema → Master Schema Davranışı](/docs/components/schema#master-schema-davranışı).

---

## Grant Değerlendirme: ALLOW listesi vs. yalnızca DENY (blacklist)

Bir `roles` / `queryRoles` setinin **niyeti**, içerdiği grant'lara göre iki şekilde yorumlanır:

| Set içeriği | Mod | Varsayılan | Anlam |
|-------------|-----|------------|-------|
| En az bir `allow` grant'ı var | **allow-list** (whitelist) | **deny** | Yalnızca eşleşen `allow` rolleri geçer |
| Yalnızca `deny` grant'ları var | **blacklist** | **allow** | Listelenenler **dışındaki** herkese izin verilir |

Her iki modda da **DENY her zaman ALLOW'u geçersiz kılar.** Yalnızca `deny` içeren bir set "X hariç herkese izin ver" kuralını, izinli her rolü tek tek saymadan ifade etmenizi sağlar.

Kanonik kural, grant seti ve çağıranın **tüm rol kümesi** üzerinde iki grup olarak değerlendirilir:

```text
authorized   = DenyGroupOk AND AllowGroupOk
DenyGroupOk  = hiçbir deny grant'ı çağıranın HİÇBİR rolüyle eşleşmez   (deny'lar üzerinde AND)
AllowGroupOk = hiç allow grant'ı yok (blacklist)
               VEYA en az bir allow grant'ı en az bir rolle eşleşir     (allow'lar üzerinde OR)
boş grant seti → izinli
```

1. **DENY grubu AND'dir ve önce değerlendirilir** — tek bir ihlal reddeder.
2. **ALLOW grubu OR'dur** — herhangi bir allow herhangi bir rolle eşleşirse kabul.
3. **ALLOW'suz set blacklist'tir** — açıkça reddedilmedikçe izinli.
4. **Boş set izinlidir.**
5. <sup>New</sup> v0.0.96 **Rolsüz çağıran, rol-bağlı bir DENY'ı geçemez.** Statik bir rol (`blocked`) ya da `$role.$.context…` referansı çağıranın *rolleri* hakkında bir ifadedir; karşılaştırılacak rol yokken "hiçbir şey eşleşmedi", çağıranın reddedilen kişi olmadığının kanıtı değildir — deny **reddeder**. Kimlik-bağlı deny'lar (dört sistem rolü ve `$user.` / `$userBehalfOf.`) çağıranın kimliğiyle eşleştiği için normal değerlendirmelerini korur.

| Grant seti | Çağıran rolleri | Sonuç |
|---|---|---|
| `[deny: blocked]` | `[teller]` | izinli (blacklist) |
| `[deny: blocked]` | yok | **ret** (kural 5) |
| `[deny: $InstanceStarter]` | yok, çağıran starter değil | izinli (kimlik-bağlı) |
| `[allow: $InstanceStarter, deny: blocked]` | yok, çağıran starter | **ret** (kural 5) |
| `[allow: teller]` | yok | ret (allow-list, eşleşme yok) |
| `[allow: $role.$.context.Instance.Data.requiredRole]` | yok, yol `""` çözülüyor | **ret** (v0.0.99, kural 6) |

Kural 5, rolsüz çağıranın nadir olmamasından doğar: anonim/cihaz token'ı, rol taşımayan bir process token'ı ve — `morph-idm` altında — operasyon kümesi çekilemeyen her çağıran boş kümeyle gelir. Bu "geç" okunduğunda her blacklist bunların tümü için genel izne dönüşüyordu. Kural tüm provider'lar ve tüm yüzeyler için geçerlidir (`availableTransitions`, `authorize`, `x-roles`, human-task listesi, function `roles`); v0.0.79'un "yalnızca-DENY set rolsüz çağırana açılır" davranışını rol-bağlı deny'lar için **tersine çevirir** (daha kısıtlayıcı).

6. <sup>New</sup> v0.0.99 **Rolsüz çağıran, `""` olarak çözülen bir `$role.` ALLOW'u ile kabul edilmez.** Önceden yol boş string'e çözüldüğünde rolsüz çağıranın boş rol adıyla "eşleşip" geçebildiği durum kapatıldı: rol-bağlı bir yaprak rolsüz çağıran için **Unknown**'dur ve allow yalnızca **Yes**'te kabul eder (bkz. [Kombinatörler](#kombinatörler-allof--anyof)). Deny'lar (kural 5) ve düz statik / sistem rolü grant'ları değişmedi.

:::warning[Geriye dönük etki]
Yalnızca `deny` grant'ı içeren mevcut bir set artık **blacklist** olarak değerlendirilir (listelenenler dışındaki herkese açık). Niyetiniz "herkesi engelle" idiyse en az bir `allow` grant'ı ekleyerek allow-list'e çevirin — ya da <sup>New</sup> v0.0.105 itibarıyla doğrudan [`deny $Everyone`](#everyone--her-çağıran) yazın.
:::

### Tek değerlendirme çekirdeği

<sup>New</sup> Transition `roles`, function `roles`, flow/state `queryRoles` ve şema `x-roles` — hepsi aynı şeyi değerlendirir: bir grant setini çağıranın rollerine karşı. v0.0.79 itibarıyla bu değerlendirme **tek bir çekirdekten** (`RoleGrantEvaluator`) geçer; DENY-önceliği, allow-list/blacklist yorumu, ön tanımlı sistem rolleri ve JSONPath (dynamic) grant çözümü **her yüzeyde birebir aynıdır**. Önceden kural dört ayrı yerde kopyalanmıştı ve kopyalar birbirinden ayrışmıştı — aynı transition hakkında farklı yüzeyler farklı sonuca varabiliyordu.

Bu birleştirme birkaç gözlemlenebilir davranışı değiştirir (ör. `x-roles` içinde DENY'ın tüm set genelinde uygulanması, yalnızca-DENY setlerin rolsüz çağırana açılması, human-task listesinin execution ile hizalanması). Ayrıntılar ve geçiş adımları için bkz. [Breaking Changes: v0.0.79](/blog/breaking-changes/breaking-changes-v0-0-79).

### availableIn rol daraltması

<sup>New</sup> Shared ve well-known transition'larda `availableIn` öğeleri `{ state, roles }` formuyla state bazında rol daraltması taşıyabilir. Bileşim **AND**'dir: transition'ın kendi `roles` seti global gate'tir, eşleşen öğenin `roles`'u o state için daraltır — ikisi de izin vermelidir. Her iki seviye de aynı değerlendirme çekirdeğinden geçer. Bkz. [Workflow → availableIn ve rol daraltması](/docs/components/workflow#availablein-ve-rol-daraltması).

---

## Kombinatörler: allOf / anyOf

<sup>New</sup> v0.0.99 — Bir grant normalde `{ "role": "...", "grant": "allow|deny" }` biçimindedir. Birden çok koşuldan oluşan tek bir kural ("çağıran instance'ı başlatan **ve** `morph-idm.officer` rolünde") için grant, `role` yerine **`allOf`** (VE) veya **`anyOf`** (VEYA) taşıyabilir. Düz form değişmedi ve öncekiyle aynı sonucu verir.

```json
"roles": [
  { "allOf": [ { "role": "morph-idm.officer" }, { "role": "$user.$.context.Instance.Data.branch.managerId" } ], "grant": "allow" },
  { "anyOf": [ { "role": "morph-idm.auditor" }, { "role": "morph-idm.risk" } ], "grant": "deny" }
]
```

| Kural | Açıklama |
|-------|----------|
| Tek seçim | Grant'ta `role`, `allOf`, `anyOf`'tan **tam olarak biri** bulunur; `grant` dış grant'ta kalır |
| Çocuklar | En az bir çocuk; her çocuk yalnızca `{ "role": "..." }` — `grant` yok, iç içe kombinatör yok (tek seviye). Çocuk statik, sistem rolü ya da dinamik olabilir |
| Bilinmeyen alan | Çocuktaki bilinmeyen alan yok sayılmaz, publish'te reddedilir |

**Kabul edildiği yerler:** transition `roles`, workflow / state `queryRoles`, `availableIn[].roles`, function `roles`, `interaction.longPoll.roles`, SubFlow override'ları ve şema `x-roles`. **Kabul edilmediği yerler:** `x-masking.roles` ve `x-encryption.roles` — bunlar düz `{ role, grant: "allow" }` girdilerinden oluşan muafiyet listeleridir.

### Üç değerli değerlendirme

Rol-bağlı bir yaprak (statik rol ya da `$role.` referansı) çağıranın *rolleri* hakkında bir ifadedir; rolsüz çağıran için ne kanıtlanır ne çürütülür — **Unknown**'dur. Kimlik yaprakları (`$InstanceStarter`, `$PreviousUser`, behalf-of sistem rolleri, `$user.`, `$userBehalfOf.`) çağıranın kimliğini karşılaştırdığından her zaman **Yes** ya da **No**'dur. <sup>New</sup> v0.0.105 `$Everyone` instance'tan hiçbir şey okumaz; her çağıran için — instance'sız yolda da — **Yes**'tir.

| Yaprak | Çağıranın rolü var | Çağıranın rolü yok |
|--------|--------------------|--------------------|
| Statik rol / `$role.…` | Eşleşirse Yes, değilse No | **Unknown** |
| `$InstanceStarter`, `$PreviousUser`, `$InstanceBehalfOfStarter`, `$PreviousBehalfOfUser`, `$user.…`, `$userBehalfOf.…` | Yes / No | Yes / No |
| `$Everyone` <sup>New</sup> v0.0.105 | **Yes** | **Yes** |

Instance'sız yolda (karşılaştırılacak başlatan ya da geçmiş yokken — ör. [başlatma yetkisi](#instance-başlatma-yetkisi-authorizetypeinstance)) kimlik yaprakları **No**'dur; `$Everyone` orada da **Yes** kalır.

| `allOf` çocukları | Sonuç | `anyOf` çocukları | Sonuç |
|-------------------|-------|-------------------|-------|
| herhangi biri **No** | No | herhangi biri **Yes** | Yes |
| değilse herhangi biri **Unknown** | Unknown | değilse herhangi biri **Unknown** | Unknown |
| hepsi **Yes** | Yes | hepsi **No** | No |

Set kararı kanonik kuralla aynıdır, yalnızca "eşleşme" üç değerli hale gelir: **deny, Yes veya Unknown'da tetiklenir** (dışlanamayan bir deny reddeder), **allow yalnızca Yes'te kabul eder**. Kural 5 bunun özel halidir. Kimlik yaprağı içeren bir `allOf` deny kendini dışlayabilir (kimlik No ⇒ `allOf` No); örneğin `allow maker` + `deny allOf[maker, $PreviousUser]` "dört göz" kuralını rolsüz çağıranlar için de doğru uygular.

| Niyet | Grant'lar |
|-------|-----------|
| Dört göz: maker işlem yapar, ama iki kez değil | `allow maker`, `deny allOf[maker, $PreviousUser]` |
| Bir rolü yalnızca kendi başlattığı instance'ta engelle | `deny allOf[blocked, $InstanceStarter]` |
| Herkesten gizle <sup>New</sup> v0.0.105 | `deny $Everyone` |
| Herkese açık, açıkça <sup>New</sup> v0.0.105 | `allow $Everyone` |

**Publish kuralları:** dinamik yollar her yaprak için ayrı denetlenir (`$.context.` ile başlamalı — büyük/küçük harf duyarlı — ve boş navigasyon yolu içermemeli). Hatalı şema `x-roles` girdileri ve hatalı dinamik yol taşıyan function `roles` girdileri artık publish'te reddedilir (önceden runtime sessizce atlıyordu). `permissions` (yetki matrisi) yanıtında kombinatör grant'ları `allOf` / `anyOf` ile ve **`role` olmadan** gösterilir; matrisi okuyan istemci `role`'süz grant'a tolerans göstermelidir.

:::warning[Rollout tabanı]
İlk `allOf` / `anyOf` grant'ını ancak **tüm pod'lar** — ve bu domain'e override damgalayan **tüm domain'ler** — v0.0.99 çalıştırdıktan sonra yazın; eski bir pod kombinatör grant'ını okuyamaz. Kombinatör içeren tanımlar publish edildikten sonra runtime'ı ikili (binary) olarak eski sürüme düşürmeyin.
:::

---

## Nerede Değerlendirilir?

| Bağlam | Alan | Etki |
|--------|------|------|
| Transition | `roles` | İlgili transition'ı kimin tetikleyebileceği |
| Workflow `startTransition` | `roles` | <sup>New</sup> v0.0.105 Flow'dan kimin instance başlatabileceği. **Gateway** → `authorize?type=instance`; runtime `POST …/instances/start`'ta denetlemez — bkz. [Instance başlatma yetkisi](#instance-başlatma-yetkisi-authorizetypeinstance) |
| Transition `availableIn` öğesi | `roles` <sup>New</sup> | Transition'ın o state'te kime sunulacağı (transition `roles` ile AND) |
| Flow / State | `queryRoles` | Instance ve state'leri kimin sorgulayabileceği (state seviyesi root'u override eder). <sup>New</sup> v0.0.99 Instance SubFlow içindeyken karar **yalnızca en derin aktif yaprakta** verilir: parent'ın damgaladığı override ?? yaprak state `queryRoles` ?? yaprak workflow `queryRoles`. <sup>New</sup> v0.0.95 **Gateway** → `authorize?queryRoles=true` — read fonksiyonları in-process denetlemez (aşağıdaki tablo) |
| Function | `roles` | Keşif (`/info`, `catalog`) yanıtlarında kimin görebileceği. <sup>New</sup> v0.0.88 itibarıyla doğrudan custom function çağrısında bir gate **değildir** — yalnızca `authorize` fonksiyonu değerlendirir; bkz. [Çağıran rollerinin çözümlenmesi](#çağıran-rollerinin-çözümlenmesi-caller-role-provider) |
| State `interaction.longPoll` | `roles` / `rule` <sup>New</sup> v0.0.94 | Long-poll sonlandırma sinyalini kimin alacağı ve ack'i kimin gönderebileceği. <sup>New</sup> v0.0.95 **Gateway** → `authorize?ack=true` |
| State `alias` | `roles` | State'in role göre maskelenmiş görünümü |
| Master şema property | `x-roles` | Alan (column) bazlı veri görünürlüğü. <sup>New</sup> v0.0.99 kombinatör kabul eder |
| Master şema property | `x-masking.roles` / `x-encryption.roles` <sup>New</sup> v0.0.99 | Değeri ham görecek çağıranlar (yalnızca `allow` muafiyet listesi; kombinatör kabul edilmez; <sup>New</sup> v0.0.105 `$Everyone` publish'te reddedilir) |
| Flow | `rowSecurity.rules[].roles` <sup>New</sup> v0.0.102 | Satır (row) bazlı görünürlük: instance listesi, tekil GET ve `GetInstances` / `GetInstance` task'leri yalnızca eşleşen kuralların açtığı instance'ları döner — bkz. [Satır güvenliği](#satır-güvenliği-rowsecurity) |

`roles`, `queryRoles`, `availableIn[].roles`, function `roles`, `interaction.longPoll.roles`, SubFlow override'ları ve `x-roles` v0.0.99 itibarıyla [kombinatör](#kombinatörler-allof--anyof) (`allOf` / `anyOf`) grant'ları da kabul eder.

### Read yüzeyleri: in-process gate kaldırıldı

<sup>New</sup> v0.0.95 `queryRoles` tanım ve cevap olarak tamamen yaşıyor — `GET …/functions/authorize?queryRoles=true` onu tam olarak değerlendirir. Runtime'ın artık yapmadığı şey aynı soruyu kendi read yolunda **ikinci kez** değerlendirmektir. Hedef dağıtım, çağıranı tanıyıp isteği iletmeden önce `authorize`'a danışan bir **Internal Gateway**'dir; aynı soruya iki karar noktası ayrışır.

| Yüzey | Kim karar verir |
|---|---|
| `state`, `data`, `view`, `schema`, `master` | Internal Gateway → `authorize?queryRoles=true` |
| `tasks`, `actions`, `incidents`, `incidents/active` | aynı |
| `POST …/longpoll/ack` | Internal Gateway → `authorize?ack=true` (etkileşimin `rule` kolu bir C# betiğidir; gateway'in kendisi değerlendiremez, oracle aynı gate'ten geçer) |

<sup>New</sup> v0.0.99 **Yaprak-tek karar.** Instance bir SubFlow içindeyken `authorize?queryRoles=true` kararı yalnızca **en derin aktif SubFlow yaprağında** verilir: parent'ın damgaladığı override (`subFlow.overrides.states.<state>.queryRoles`) ?? yaprak state'in `queryRoles`'u ?? yaprak workflow'un `queryRoles`'u (boş yaprak izin verir). Root ve ara seviyelerin `queryRoles`'u arasındaki AND (conjunction) **kaldırıldı**. Bu, root'un `queryRoles` tanımlayıp yaprağın tanımlamadığı durumda erişimi **gevşetir**; root kısıtını korumak için parent'ta `subFlow.overrides.states.<state>.queryRoles` ya da yaprakta `queryRoles` tanımlayın (bkz. [SubFlow Overrides](/docs/how-to/subflow-overrides)). Parent'a ait transition'lar ve `?ack=true` değişmedi. Human-task yaprak hop'u çağıranın `act_sub` / `sub` başlıklarını taşır; `CallerScopeHash` artık `sub`'ı da içerir (önbellekler deploy'da bir kez yeniden anahtarlanır).

<sup>New</sup> v0.0.104 **Yaprak, var olan en derin instance'tır.** Parent, SubFlow korelasyonunu kendi transaction'ında commit eder; child'ın satırı ise commit sonrası çalışan bir job ile (SubFlow input mapping'inden sonra) oluşturulur. Arada — yük altında yüzlerce milisaniye, child başlatılamazsa süresiz — korelasyon henüz yüklenemeyen bir child'ı gösterir. Bu aralıkta child hiçbir grant değerlendirmeden `allowed: false` ve `reason: "instance-not-found"` döner; parent da yaprakmış gibi **kendi** `queryRoles` çözümüyle (kendisine damgalanmış override ?? state `queryRoles` ?? workflow `queryRoles`) karar verir. Bu, `state` fonksiyonunun aynı aralıkta sunduğu görünümle (child'a iniş başarısız olunca ana flow'un görünümü) aynıdır ve henüz açığa çıkacak child verisi yoktur. v0.0.103'e kadar bu aralıktaki her `queryRoles` sorgusu reddediliyor, gateway client'ın state poll'una `403` dönüyordu.

- **Yalnızca `queryRoles` geri düşer.** `transitionKey` / `functionKey` / `ack` hedefleri değişmedi: eksik bir child'a iletilen transition ya da function zaten çalışamaz, cevap `false` kalır.
- Var olan ve reddeden bir child'ın cevabı yine ret olarak kalır; geri düşme yalnızca `instance-not-found` nedeninde tetiklenir.
- Geri düşme yanıttaki `reason` alanını okuduğu için domain'ler arası (remote) inişte de çalışır. Eski runtime'lı bir partner domain bu alanı göndermez; o durumda eski davranış (ret) geçerlidir.
- Bu kısa aralıkta parent'ın child için tanımladığı `subFlow.overrides.states.<state>.queryRoles` uygulanmaz — child'ın state'i henüz bilinmez; parent'ın kendi gate'i karar verir.
- Gözlemlenebilirlik: parent'ta alınan karar `AuthorizeLeafMissingFallback` (EventId 50046, eksik child'ın flow'u ve id'siyle) olarak loglanır; `Authorization.Decide` span'ı `vnext.auth.fallback = leaf-missing` tag'ini taşır.

**`authorize` yanıtındaki `reason` alanı.** <sup>New</sup> v0.0.104 Yanıt gövdesi opsiyonel bir `reason` alanı kazandı; tek değeri `instance-not-found`'dur ve adreslenen instance yüklenemediği için **hiçbir grant'ın değerlendirilmediği** bir reddi işaretler. Normal bir kararın gövdesi eskisi gibi `{"allowed": true|false}`'dur ve `reason` taşımaz.

```json
{ "allowed": false, "reason": "instance-not-found" }
```

**Gateway / istemci yorumu:** doğrudan adreslenmiş bir instance için `403` + `reason: "instance-not-found"`, instance'ın **yok (ya da henüz oluşmamış)** olduğu anlamına gelir — çağıranın rolünün eksik olduğu anlamına **gelmez**. Bunu yetki hatası olarak göstermeyin; `reason` taşımayan `403` ise grant reddidir.

**Örnek:** [`authorization-chain-lab`](https://github.com/burgan-tech/vnext-example/tree/master/core/Workflows/authorization-chain-lab) — `root-slow` → `mid-slow` → `leaf-open` zinciri, 6 sn'lik input mapping ([`ChainSlowSubFlowMapping.csx`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/authorization-chain-lab/src/ChainSlowSubFlowMapping.csx)) ile aralığı açık tutar; testler: [`LeafNotCreatedYetTests.cs`](https://github.com/burgan-tech/vnext-example/blob/master/tests/Core.IntegrationTests/Tests/AuthorizationChainLab/LeafNotCreatedYetTests.cs).

**Rol çözümü değişmedi:** `availableTransitions` filtreleme, state alias, `x-roles` alan filtreleme, human-task listesi ve `CallerScopeHash` cache anahtarı çağıranın rollerini değerlendirmeye devam eder. Görünürlük kaldı, enforcement gateway'e taşındı. **Tanım yazarının bilmesi gereken sonuç:** önünde bu gateway olmayan bir runtime bu okumaları reddetmez. Ayrıntı: [Built-in Functions → Instance Authorize](/docs/components/functions/built-in#instance-authorize).

### Üç yüzey hizalaması

<sup>New</sup> "Bu çağıran bu transition'ı çalıştırabilir mi?" sorusunu yanıtlayan üç yüzey v0.0.79'da hizalandı:

| Yüzey | `availableIn` state kontrolü | Rol kontrolü |
|-------|:---:|:---:|
| State fonksiyonu `availableTransitions` | ✅ | ✅ |
| `authorize` fonksiyonu | ✅ (yeni) | ✅ |
| Transition execution | ✅ (well-known için yeni) | ❌ (tasarım gereği) |

Roller execution'da **bilinçli olarak** enforce edilmez — hiçbir transition tipi için hiçbir zaman edilmedi. `roles`, client'a *ne sunulacağını* belirleyen bir discovery kontrolüdür; tek bir transition tipine 403 eklemek tutarsız bir güvenlik modeli yaratırdı.

### Instance başlatma yetkisi (`authorize?type=instance`)

<sup>New</sup> v0.0.105 Başlatmadan önce adreslenecek bir instance olmadığı için instance route'u "bu çağıran bu flow'dan bir instance başlatabilir mi?" sorusunu yanıtlayamaz; bu yüzden `startTransition.roles` şimdiye kadar hiçbir yerde uygulanmıyordu. `authorize` fonksiyonunun **workflow-scoped** route'u bu soruyu, henüz instance yokken, flow'un kendi `startTransition.roles`'u üzerinden yanıtlar:

```http
GET /api/v1/{domain}/workflows/{workflow}/functions/authorize?type=instance[&version=x][&role=r]
```

| Parametre | Zorunlu | Açıklama |
|-----------|---------|----------|
| `type` | **Evet** | Neyin yetkilendirildiği. Bugün desteklenen tek değer `instance`'tır (yeni instance başlatma); parametre, ileride yeni route açmadan başka workflow-scoped sorular eklenebilsin diye vardır. **Ordinal** eşleşir ve varsayılanı yoktur: eksik ya da bilinmeyen değer `400` `Authorization:110005` (`AuthorizeUnsupportedType`) döner, mesaj desteklenen değerleri listeler. Instance listesi filtresi `instanceType` (`R`/`S`/`P`) ile karıştırmayın |
| `version` | Hayır | Tanım sürümünü sabitler. Gateway, start isteğinin kendi `version`'ını iletmelidir ki iki çağrı aynı `startTransition.roles`'u okusun |
| `role` | Hayır | Instance route'undaki gibi; provider'ın `RoleParameterMode`'una göre bileşir ([Caller Role Provider](../configuration/caller-role-provider)) |

| Durum | Gövde | Anlam |
|-------|-------|-------|
| `200` | `{"allowed": true}` | Başlatabilir |
| `403` | `{"allowed": false}` | Başlatamaz |
| `400` | hata zarfı | `type` eksik ya da bilinmiyor (`Authorization:110005`) |
| `404` | hata zarfı | Bilinmeyen workflow ya da sürüm |

Yanıt sözleşmesi instance route'uyla aynıdır. Gateway start transition'ın key'ini bilmek zorunda değildir — route onu tanımdan çözer. Çağıranın rol kümesi instance route'undaki gibi (yapılandırılmış provider, `role` parametresi) çözülür.

**Değerlendirme** tek değerlendirme çekirdeğinin instance'sız yoludur:

| Grant yaprağı | Başlatmada |
|---------------|------------|
| Statik rol | Çağıranın rolleriyle karşılaştırılır; DENY tüm sette ALLOW'u geçersiz kılar |
| `$Everyone` | Her çağıranla eşleşir |
| `$InstanceStarter`, `$PreviousUser`, `$InstanceBehalfOfStarter`, `$PreviousBehalfOfUser` | **Asla eşleşmez** — karşılaştırılacak instance yok |
| `$user.` / `$userBehalfOf.` / `$role.` bağlam referansları | **Asla eşleşmez** — `Instance.Data` henüz yok ve istek gövdesi yetkilendirme bağlamının parçası değil |

Hiç eşleşmeyen bir yaprak ne kabul eder ne reddeder: onun ALLOW'u kimseyi kabul etmez, DENY'ı kimseyi reddetmez, onu içeren bir `allOf` sağlanamaz. Sonuç olarak:

- **Yalnızca** `allow $InstanceStarter` ile korunan bir start transition **herkese kapalıdır** (fail-closed) — actor kimliği taşıyan çağırana bile.
- `[allow $InstanceStarter, allow maker]` `maker` ile karar verilir.
- Grant yoksa izinlidir (her transition'da olduğu gibi).
- `availableIn` ve state kontrolü uygulanmaz — start transition hiçbir state'e ait değildir.

:::warning[Runtime start'ı kendisi denetlemez]
Runtime, `POST …/workflows/{workflow}/instances/start`'ta `startTransition.roles`'u **hâlâ kontrol etmez** — diğer transition'larda olduğu gibi karar gateway'indir. Önünde bu kuralı uygulayan bir gateway olmayan runtime, rolü olmayan çağıranın instance başlatmasını reddetmez.
:::

**Gateway kuralı:** APISIX check-authorize'da, transition kuralının instance route'unu çağırdığı gibi, `POST …/workflows/{workflow}/instances/start` için bu route'u çağıran ikinci bir kural tanımlayın. Host ortama özeldir; start isteği `version` query parametresi taşıyorsa onu da iletin:

```text
Utils.CallApiGet("http://<orchestrator-host>/api/v1/"+path.var1+"/workflows/"+path.var2+"/functions/authorize?type=instance", header, allHeader).IsSuccessStatusCode == true
```

Her karar `AuthorizeRequest` (EventId 50030) audit logunda hedef `start:{key}` ve boş instance id ile görünür.

**Örnekler:** [`role-matrix-lab-start-open.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/role-matrix-lab/role-matrix-lab-start-open.json) (grant yok → herkese açık), [`role-matrix-lab-start-gated.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/role-matrix-lab/role-matrix-lab-start-gated.json) (`allow maker`, `deny viewer` + hiç eşleşmeyen instance-bağlı grant'lar), [`role-matrix-lab-start-starter-only.json`](https://github.com/burgan-tech/vnext-example/blob/master/core/Workflows/role-matrix-lab/role-matrix-lab-start-starter-only.json) (yalnızca `allow $InstanceStarter` → herkese kapalı); testler: [`StartAuthorizeTests.cs`](https://github.com/burgan-tech/vnext-example/blob/master/tests/Core.IntegrationTests/Tests/RoleMatrixLab/StartAuthorizeTests.cs).

---

## Çağıran rollerinin çözümlenmesi (Caller-role provider)

<sup>New</sup> v0.0.88 ile yukarıdaki grant değerlendirmesinin **girdisi** — çağıranın rol kümesi — takılabilir bir provider üzerinden çözülür: `default` (eski `ICurrentUser.Roles`/`role` header davranışı, değişmeden) veya `morph-idm` (request scope başına tek bir dış IDM çağrısı, dönen operasyon kümesi yerel grant motoruyla değerlendirilir). Ayrıntı ve yapılandırma için bkz. [Configuration → Caller Role Provider](../configuration/caller-role-provider).

- <sup>New</sup> v0.0.96 **`morph-idm` boş kümeye fail-open çalışır.** Provider hatası (hata durum kodu, timeout, transport, ayrıştırılamayan gövde) ve `204` artık **403** (`Authorization:110004`) üretmez; rol kümesi `[]` olur ve istek onunla değerlendirilir. Boş küme zaten önemli olanı reddeder: allow-list eşleşmez ve **kural 5** her rol-bağlı deny'ı reddettirir — bir kesinti çağıranın gördüğünü daraltır, asla genişletmez. `act_sub` da `client_id` de taşımayan çağıranlar için morph-idm hiç çağrılmaz.
- <sup>New</sup> v0.0.97 **`morph-idm` altında `role` header'ı önceliklidir.** Boş olmayan bir `role` header'ı taşıyan istek o rollerle değerlendirilir ve morph-idm **çağrılmaz** (replace, merge değil); yalnızca header'sız istek servise gider. `authorize`'ın `?role=` parametresi, istekte header yokken o header gibi davranır (rol kümesi `[X]`, morph-idm çağrılmaz); gerçek header parametreyi ezer. Tasarım gereği **daha izinlidir** — header'ı üreten gateway'in otoritesine güvenilir.
- **Gateway ön koşulu:** her iki provider'da da istemcinin gönderdiği `role` header'ı olduğu gibi alınır. Gateway bu header'ı istemciden gelen haliyle iletmemeli; strip etmeli ya da token'dan üzerine yazmalıdır (append değil).

Provider ne olursa olsun `transition.roles`, `availableIn[].roles`, `queryRoles` ve schema `x-roles` semantiği **değişmez** — yalnızca rol kümesinin kaynağı değişir.

**İstisna: custom function çağrıları.** v0.0.88 itibarıyla `function.roles`, doğrudan bir custom function çağrısında **artık bir gate değildir** — custom function'ları yetkilendirmek middle-tier'ın sorumluluğu sayılır; vNext'in işi görünürlük (discovery yanıtları) ve `authorize` fonksiyonudur. `function.roles`, yalnızca **`authorize` fonksiyonu** tarafından değerlendirilmeye devam eder. Scope kontrolü (Domain/Flow/Instance) bundan etkilenmez — bu, yetkilendirme değil call-shape doğrulamasıdır.

---

## Satır güvenliği (rowSecurity)

<sup>New</sup> v0.0.102 Alan bazlı görünürlüğün (`x-roles`, `x-masking`, `x-encryption`) satır karşılığı `attributes.rowSecurity`'dir: flow rol başına bir filtre tanımlar, runtime bunu instance listesine, tekil GET'e ve `GetInstances` / `GetInstance` task'lerine AND'ler. Kısaca:

- **Deny by default:** `rowSecurity` tanımlayan flow'da hiçbir kuralla eşleşmeyen çağıran hiçbir satır görmez; "X her şeyi görür" filtresiz açık bir kuraldır. `rowSecurity` olmayan flow filtrelenmez.
- Eşleşen kuralların filtreleri **OR**'lanır, çağıranın kendi filtresiyle **AND**'lenir; rol çözümü ya da parametre hataları görünürlüğü **asla genişletmez**. Kural rolleri statik roller ya da `$InstanceStarter` / `$InstanceBehalfOfStarter` olabilir; `allOf` / `anyOf` ve diğer ayrılmış roller (<sup>New</sup> v0.0.105 `$Everyone` dahil, RS-E05) kabul edilmez.
- Dışlanmış bir instance GET'te bulunmayan bir instance ile aynı `404`'ü döner; liste sayıları yalnızca görünür satırları kapsar.
- **Erişim sınırı değildir:** `functions/state`, `functions/data`, `functions/view` vb., transition'lar ve `GetInstanceData` filtrelenmez. Bu yüzeyleri gateway'deki `authorize` ile denetleyin.
- **Gateway ön koşulu:** gateway `role` header'ını ve kuralların okuduğu her header'ı token'dan yazmalı (strip/overwrite, asla append değil); `QueryParameters` client kontrolündedir.

:::warning[Lookup hatası artık okumayı başarısız kılar]
v0.0.102 ile instance listesi, tekil GET ve `GetInstances` / `GetInstance` task'leri flow tanımını arar; arama başarısız olursa okuma da aynı hatayla başarısız olur — `rowSecurity` olsun ya da olmasın: `Instance:100052` (409, geçersiz varsayılan sürüm pointer'ı), `Instance:100053` (503, sürüm registry'si okunamıyor), `Instance:100051` (404, flow sürümü aktive edilmemiş). Uyarı 20509 loglanır.
:::

Ayrıntı: [Satır Güvenliği](/docs/concepts/row-security).

---

## İlgili

- [Workflow component](/docs/components/workflow) — `queryRoles`, transition `roles`, state `alias`
- [Schema component](/docs/components/schema) — master şema ve alan bazlı görünürlük
- [Built-in Functions](/docs/components/functions/built-in) — State/Data Function yetkilendirme davranışı ve authorize endpoint'leri
- [Instance Data](/docs/concepts/instance-data) — `Instance.Data` ve ScriptContext
- [Configuration → Caller Role Provider](../configuration/caller-role-provider) — `default`/`morph-idm` provider yapılandırması
- [Satır Güvenliği](/docs/concepts/row-security) — `attributes.rowSecurity` ile satır bazlı görünürlük
