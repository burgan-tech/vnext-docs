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

Flow **master şeması**, şema property'lerinde `roles` (roleGrant) tanımlayarak **alan bazlı görünürlük** uygulayabilir. Data Function ve veri dönen endpoint'ler (Get Instance, GetInstances vb.) authorize katmanını çalıştırır ve yalnızca çağıranın görmesine izinli alanları döndürür.

- `roles` tanımı **olmayan** property'ler tüm yetkili çağıranlara görünür.
- `roles` tanımlı property'lerde aynı sistem rolleri ve JSONPath grant'ları geçerlidir.
- Vocabulary ve araç uyumluluğu için [roles-vocab.json](https://unpkg.com/@burgan-tech/vnext-schema@0.0.37/vocabularies/roles-vocab.json) kullanılabilir.

Master şemanın davranışı ve neden `required` kullanılmaması gerektiği için bkz. [Schema → Master Schema Davranışı](/docs/components/schema#master-schema-davranışı).

---

## Nerede Değerlendirilir?

| Bağlam | Alan | Etki |
|--------|------|------|
| Transition | `roles` | İlgili transition'ı kimin tetikleyebileceği |
| Flow / State | `queryRoles` | Instance ve state'leri kimin sorgulayabileceği (state seviyesi root'u override eder) |
| State `alias` | `roles` | State'in role göre maskelenmiş görünümü |
| Master şema property | `roles` | Alan bazlı veri görünürlüğü |

---

## İlgili

- [Workflow component](/docs/components/workflow) — `queryRoles`, transition `roles`, state `alias`
- [Schema component](/docs/components/schema) — master şema ve alan bazlı görünürlük
- [Built-in Functions](/docs/components/functions/built-in) — State/Data Function yetkilendirme davranışı ve authorize endpoint'leri
- [Instance Data](/docs/concepts/instance-data) — `Instance.Data` ve ScriptContext
