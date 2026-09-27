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

:::note Fail-closed'dan fail-open'a
Bu sayfanın v0.0.88 sürümündeki "provider hatası 403" davranışı v0.0.96 ile değişti; aşağıdaki liste güncel davranışı anlatır.
:::

- Request scope başına **tek** GET çağrısı yapılır (`GetRolesPath`); yanıt scope içinde memoize edilir (birden fazla yüzey — ör. subflow okumaları — eşzamanlı olarak rol isteyebilir, bunlar tek çağrıyı paylaşır).
- İstek `sub`, `act_sub` ve `position` taşır; **`role` header'ı asla gönderilmez** — bu header gönderilirse endpoint "authorize" moduna geçip tek bir rol için evet/hayır yanıtı verir, oysa runtime'ın mevcut grant motorunun (`RoleGrantEvaluator`) değerlendirebilmesi için **tüm operasyon setine** ihtiyacı vardır.
- Dönen operasyon kümesi, yerel grant motoruyla aynı şekilde değerlendirilir: `transition.roles`, `availableIn[].roles`, `queryRoles`, `function.roles` ve schema `x-roles` **semantiği değişmez** — yalnızca girdi kaynağı değişir.
- <sup>New</sup> v0.0.96 **Fail-open (boş küme)**: provider hata döndürürse (hata durum kodu, timeout, bağlantı/DNS/TLS, tanınmayan gövde) istek **artık 403 ile reddedilmez** (`Authorization:110004` üretilmez); rol kümesi `[]` olur ve istek onunla değerlendirilir. Sonuç scope içinde memoize edilir. Boş küme zaten önemli olanı reddeder — allow-list eşleşmez ve [kural 5](../concepts/authorization#grant-değerlendirme-allow-listesi-vs-yalnızca-deny-blacklist) her rol-bağlı deny'ı reddettirir; bir kesinti çağıranın gördüğünü **daraltır** (daha az transition, budanmış `x-roles` alanları, `authorize`'dan ret) ama okumaları kırmaz ve erişimi asla genişletemez. (v0.0.88–v0.0.95 arasında bu durum fail-closed 403 idi.)
- `204 No Content` veya boş gövde, "bu çağıranın operasyon seti boş" anlamına gelir (hata değil) — `[]` döner.
- <sup>New</sup> v0.0.96 `act_sub` da `client_id` de taşımayan çağıranlar (anonim/cihaz token'ı) için **hiç çağrı yapılmaz**; rol kümesi `[]`'dir.
- <sup>New</sup> v0.0.97 **`role` header'ı önceliklidir.** Boş olmayan bir `role` header'ı taşıyan istek, header'daki rollerle değerlendirilir ve morph-idm **çağrılmaz** — servis cevabını **replace** eder, merge etmez. Yalnızca header'sız (ya da boş header'lı) istek servise gider. Tasarım gereği daha izinlidir: header'ı üreten gateway'in otoritesine güvenilir.

### Sonuç tablosu (header'sız istek)

| Durum | Rol kümesi | Log | `vnext.auth.outcome` | Ayırt eden tag |
|---|---|---|---|---|
| Ne `act_sub` ne `client_id` — çağrı yapılmaz | `[]` | Debug 20464 | `skipped` | — |
| `204`, boş gövde, `roles: []` | `[]` | Warning 20441 | `empty` | `vnext.auth.empty_reason` = `no_content` / `empty_body` / `empty_array` |
| Başarısız durum kodu | `[]` | Error 20442 | `failed` | `vnext.auth.failure_kind` = `http_status` + `vnext.auth.provider.status_code` |
| HttpClient timeout | `[]` | Error 20442 | `failed` | `failure_kind` = `timeout` |
| Bağlantı / DNS / TLS | `[]` | Error 20442 | `failed` | `failure_kind` = `transport` |
| Başarılı durum, tanınmayan gövde | `[]` | Error 20463 | `failed` | `failure_kind` = `parse` |
| Boş olmayan `role` header'ı — çağrı yapılmaz | header'daki roller | Debug 20465 | `header` | — |
| Servis cevabı | operasyon kümesi | — | `resolved` | — |

### `authorize`'ın `role` parametresi (`RoleParameterMode`)

Provider, `authorize` fonksiyonunun `?role=` parametresinin nasıl bileşeceğini `ICallerRoleResolver.RoleParameterMode` ile bildirir (eski boolean'ın yerini aldı):

| Provider | Mod | Davranış |
|---|---|---|
| `default` | `Fallback` | Parametre yalnızca provider hiç rol çözemediyse kullanılır; `role` header'ı her zaman kazanır. `ack=true` hedefinde <sup>New</sup> v0.0.96 parametre her yolda **additive** eklenir |
| `morph-idm` | `AsRoleHeader` <sup>New</sup> v0.0.97 | İstekte `role` header'ı yoksa `?role=X` o header gibi davranır: rol kümesi `[X]`, morph-idm çağrılmaz. Gerçek header parametreyi ezer. Tüm hedefler (`ack` dahil) için aynı. (Önceden parametre bu provider altında yok sayılıyordu; header karar verici olunca aynı iddia header'la 200, query string'le 403 alıyordu — bu mod o ayrışmayı kaldırır) |

Ayrıntı: [Built-in Functions → Instance Authorize](../components/functions/built-in#instance-authorize).

:::warning Custom function çağrılarında `function.roles` artık gate değil
v0.0.88 itibarıyla custom function çağrılarını yetkilendirmek middle-tier'ın sorumluluğudur; vNext'in işi görünürlük (discovery yanıtlarında `roles`'un görünmesi) ve `authorize` fonksiyonudur. `function.roles`, artık **yalnızca `authorize` fonksiyonu tarafından** değerlendirilir — doğrudan function çağrısında bir gate olarak kullanılmaz. **Scope** kontrolü (Domain/Flow/Instance) değişmeden kalır; bu, yetkilendirme değil call-shape doğrulamasıdır. Ayrıntı için bkz. [Authorization → Çağıran rollerinin çözümlenmesi](../concepts/authorization#çağıran-rollerinin-çözümlenmesi-caller-role-provider).
:::

## İlgili

- [Authorization](../concepts/authorization) — grant değerlendirme çekirdeği, `roles`/`queryRoles`/`x-roles` semantiği
- [Built-in Functions](../components/functions/built-in) — State/Data Function yetkilendirme davranışı
