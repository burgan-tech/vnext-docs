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

Instance yetkilendirmesi için (transition `roles`, state/flow `queryRoles` veya master şema alan görünürlüğü) dört statik sistem rolü kullanılabilir. Bunlar instance bağlamına göre çalışma zamanında çözülür:

| Rol | Çözülen kimlik | Açıklama |
|-----|----------------|----------|
| `$InstanceStarter` | Actor | Instance'ı **başlatan** kullanıcı |
| `$PreviousUser` | Actor | Bir **önceki** transition'ı tetikleyen kullanıcı |
| `$InstanceBehalfOfStarter` | Subject | Instance'ı başlatan **subject** (adına işlem yapılan token) |
| `$PreviousBehalfOfUser` | Subject | Bir önceki transition'ı tetikleyen **subject** (adına işlem yapılan token) |

İlk ikisi `act_sub` (actor), son ikisi `sub` (subject) tarafıyla karşılaştırılır.

**roleGrant örneği:**

```json
{
  "roles": [
    { "role": "$InstanceStarter", "grant": "allow" },
    { "role": "$PreviousUser", "grant": "allow" }
  ]
}
```

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

Flow **master şeması**, şema property'lerinde **`x-roles`** keyword'ü tanımlayarak **alan bazlı görünürlük** uygular — yani **alan (column) seviyesinde güvenlik** sağlar. Data Function ve veri dönen endpoint'ler (Get Instance, GetInstances vb.) authorize katmanını çalıştırır ve yalnızca çağıranın görmesine izinli alanları döndürür.

> **Not:** `roles` ve `queryRoles`, transition ve state yetkilendirmesi içindir. Schema property'lerinde **field görünürlüğü** ise `x-roles` keyword'ü ile yapılır (yapı aynıdır: `role` + `grant`).

- `x-roles` tanımı **olmayan** property'ler tüm yetkili çağıranlara görünür.
- `x-roles` tanımlı property'lerde aynı sistem rolleri ve JSONPath grant'ları geçerlidir; `role` statik ad ya da JSONPath ifadesi olabilir, `grant` ∈ `allow|deny` (DENY > ALLOW).
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

:::warning Geriye dönük etki
Yalnızca `deny` grant'ı içeren mevcut bir set artık **blacklist** olarak değerlendirilir (listelenenler dışındaki herkese açık). Niyetiniz "herkesi engelle" idiyse en az bir `allow` grant'ı ekleyerek allow-list'e çevirin.
:::

### Tek değerlendirme çekirdeği

<sup>New</sup> Transition `roles`, function `roles`, flow/state `queryRoles` ve şema `x-roles` — hepsi aynı şeyi değerlendirir: bir grant setini çağıranın rollerine karşı. v0.0.79 itibarıyla bu değerlendirme **tek bir çekirdekten** (`RoleGrantEvaluator`) geçer; DENY-önceliği, allow-list/blacklist yorumu, ön tanımlı sistem rolleri ve JSONPath (dynamic) grant çözümü **her yüzeyde birebir aynıdır**. Önceden kural dört ayrı yerde kopyalanmıştı ve kopyalar birbirinden ayrışmıştı — aynı transition hakkında farklı yüzeyler farklı sonuca varabiliyordu.

Bu birleştirme birkaç gözlemlenebilir davranışı değiştirir (ör. `x-roles` içinde DENY'ın tüm set genelinde uygulanması, yalnızca-DENY setlerin rolsüz çağırana açılması, human-task listesinin execution ile hizalanması). Ayrıntılar ve geçiş adımları için bkz. [Breaking Changes: v0.0.79](/blog/breaking-changes/breaking-changes-v0-0-79).

### availableIn rol daraltması

<sup>New</sup> Shared ve well-known transition'larda `availableIn` öğeleri `{ state, roles }` formuyla state bazında rol daraltması taşıyabilir. Bileşim **AND**'dir: transition'ın kendi `roles` seti global gate'tir, eşleşen öğenin `roles`'u o state için daraltır — ikisi de izin vermelidir. Her iki seviye de aynı değerlendirme çekirdeğinden geçer. Bkz. [Workflow → availableIn ve rol daraltması](/docs/components/workflow#availablein-ve-rol-daraltması).

---

## Nerede Değerlendirilir?

| Bağlam | Alan | Etki |
|--------|------|------|
| Transition | `roles` | İlgili transition'ı kimin tetikleyebileceği |
| Transition `availableIn` öğesi | `roles` <sup>New</sup> | Transition'ın o state'te kime sunulacağı (transition `roles` ile AND) |
| Flow / State | `queryRoles` | Instance ve state'leri kimin sorgulayabileceği (state seviyesi root'u override eder). Built-in **state/data/view/schema** read fonksiyonlarınca current state üzerinde uygulanır; izin yoksa **403** |
| Function | `roles` | Fonksiyonu kimin çağırabileceği ve keşif (`/info`, `catalog`) yanıtlarında kimin görebileceği |
| State `alias` | `roles` | State'in role göre maskelenmiş görünümü |
| Master şema property | `x-roles` | Alan (column) bazlı veri görünürlüğü |

### Üç yüzey hizalaması

<sup>New</sup> "Bu çağıran bu transition'ı çalıştırabilir mi?" sorusunu yanıtlayan üç yüzey v0.0.79'da hizalandı:

| Yüzey | `availableIn` state kontrolü | Rol kontrolü |
|-------|:---:|:---:|
| State fonksiyonu `availableTransitions` | ✅ | ✅ |
| `authorize` fonksiyonu | ✅ (yeni) | ✅ |
| Transition execution | ✅ (well-known için yeni) | ❌ (tasarım gereği) |

Roller execution'da **bilinçli olarak** enforce edilmez — hiçbir transition tipi için hiçbir zaman edilmedi. `roles`, client'a *ne sunulacağını* belirleyen bir discovery kontrolüdür; tek bir transition tipine 403 eklemek tutarsız bir güvenlik modeli yaratırdı.

---

## İlgili

- [Workflow component](/docs/components/workflow) — `queryRoles`, transition `roles`, state `alias`
- [Schema component](/docs/components/schema) — master şema ve alan bazlı görünürlük
- [Built-in Functions](/docs/components/functions/built-in) — State/Data Function yetkilendirme davranışı ve authorize endpoint'leri
- [Instance Data](/docs/concepts/instance-data) — `Instance.Data` ve ScriptContext
