---
sidebar_position: 6
title: Caller Role Provider
description: Çağıran rollerinin nasıl çözümlendiğini seçen provider yapılandırması — default ve morph-idm
---

# Caller Role Provider Yapılandırması <sup>New</sup> v0.0.88

vNext, yetkilendirme kararlarının (transition `roles`, `availableIn[].roles`, `queryRoles`, schema `x-roles`) girdisi olan **çağıranın rol kümesini** artık takılabilir bir provider üzerinden çözer. Provider seçimi başlangıçta bir kez yapılır ve process boyunca sabittir — istek bazında değişmez.

```json
{
  "CallerRoleProvider": {
    "Provider": "default",
    "MorphIdm": {
      "BaseUrl": "",
      "GetRolesPath": "/api/1/morph-idm/functions/get-roles",
      "TimeoutSeconds": 5,
      "MaxRetryAttempts": 1,
      "RetryDelayMilliseconds": 200,
      "CircuitBreakerFailureThreshold": 20,
      "CircuitBreakerTimeoutSeconds": 30,
      "ValidateSsl": true
    }
  }
}
```

## Alanlar

| Anahtar | Tip | Varsayılan | Açıklama |
|---------|-----|------------|----------|
| `Provider` | `default` \| `morph-idm` | `default` | Aşağıdaki enum tablosuna bakın. Tanınmayan bir değer startup'ı düşürmez, `default`'a geriler |
| `MorphIdm.BaseUrl` | string | `""` | morph-idm servisinin base URL'i (ör. `https://idm.internal`). Yalnızca `Provider: morph-idm` iken kullanılır |
| `MorphIdm.GetRolesPath` | string | `/api/1/morph-idm/functions/get-roles` | `BaseUrl`'e eklenen operasyon-seti endpoint yolu |
| `MorphIdm.TimeoutSeconds` | integer | `5` | İstek timeout'u. Kısa tutulur — bu çağrı her yetkili okumanın kritik yolundadır; yavaş bir provider, bekleyen çağıran için ret ile ayırt edilemez |
| `MorphIdm.MaxRetryAttempts` | integer | `1` | Geçici hatada yeniden deneme sayısı |
| `MorphIdm.RetryDelayMilliseconds` | integer | `200` | Denemeler arası taban gecikme (üstel artar) |
| `MorphIdm.CircuitBreakerFailureThreshold` | integer | `20` | Circuit'in açılması için ardışık geçici hata sayısı |
| `MorphIdm.CircuitBreakerTimeoutSeconds` | integer | `30` | Circuit'in açık kaldığı süre |
| `MorphIdm.ValidateSsl` | boolean | `true` | TLS sertifika doğrulaması. Yalnızca development'ta kapatılmalıdır |

## `Provider` Enum Değerleri

| Değer | Açıklama |
|-------|----------|
| `default` | `ICurrentUser.Roles` / `role` header'a dayanan eski davranış — hiçbir değişiklik yok |
| `morph-idm` | Request scope başına **tek** morph-idm çağrısı yapar |

## `default` Davranışı

Rolleri `ICurrentUser.Roles`'tan okur, yoksa `role` header'ına düşer. Bu, provider mekanizmasından önceki davranışla **birebir** aynıdır — mevcut bir dağıtımda `CallerRoleProvider` bölümü hiç tanımlanmasa da hiçbir şey değişmez.

## `morph-idm` Davranışı

- Request scope başına **tek** GET çağrısı yapılır (`GetRolesPath`); yanıt scope içinde memoize edilir (birden fazla yüzey — ör. subflow okumaları — eşzamanlı olarak rol isteyebilir, bunlar tek çağrıyı paylaşır).
- İstek `sub`, `act_sub` ve `position` taşır; **`role` header'ı asla gönderilmez** — bu header gönderilirse endpoint "authorize" moduna geçip tek bir rol için evet/hayır yanıtı verir, oysa runtime'ın mevcut grant motorunun (`RoleGrantEvaluator`) değerlendirebilmesi için **tüm operasyon setine** ihtiyacı vardır.
- Dönen operasyon kümesi, yerel grant motoruyla aynı şekilde değerlendirilir: `transition.roles`, `availableIn[].roles`, `queryRoles`, `function.roles` ve schema `x-roles` **semantiği değişmez** — yalnızca girdi kaynağı değişir.
- **Fail-closed**: provider hata döndürürse (timeout, 5xx, ayrıştırılamayan yanıt) yetkilendirme **403** ile reddedilir; hata da scope içinde memoize edilir — başarısız bir scope reddedilmiş kalır ve morph-idm'i scope başına en fazla bir kez çağırır.
- `204 No Content` veya boş gövde, "bu çağıranın operasyon seti boş" anlamına gelir (hata değil) — `[]` döner.

:::warning Custom function çağrılarında `function.roles` artık gate değil
v0.0.88 itibarıyla custom function çağrılarını yetkilendirmek middle-tier'ın sorumluluğudur; vNext'in işi görünürlük (discovery yanıtlarında `roles`'un görünmesi) ve `authorize` fonksiyonudur. `function.roles`, artık **yalnızca `authorize` fonksiyonu tarafından** değerlendirilir — doğrudan function çağrısında bir gate olarak kullanılmaz. **Scope** kontrolü (Domain/Flow/Instance) değişmeden kalır; bu, yetkilendirme değil call-shape doğrulamasıdır. Ayrıntı için bkz. [Authorization → Çağıran rollerinin çözümlenmesi](../concepts/authorization#çağıran-rollerinin-çözümlenmesi-caller-role-provider).
:::

## İlgili

- [Authorization](../concepts/authorization) — grant değerlendirme çekirdeği, `roles`/`queryRoles`/`x-roles` semantiği
- [Built-in Functions](../components/functions/built-in) — State/Data Function yetkilendirme davranışı
