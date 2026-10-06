---
id: subflow-overrides
title: SubFlow Overrides
sidebar_label: SubFlow Overrides
description: Parent workflow'un state.subFlow.overrides ile child SubFlow'un timeout, rol, long-poll ve view seçimlerini kendi bağlamına göre ayarlaması
---

# SubFlow Overrides

Bir workflow'u SubFlow olarak tüketen parent (`state.subFlow.type: "S"`), child tanımını **düzenlemeden** `state.subFlow.overrides` bloğu ile child'ı kendi bağlamına göre ayarlayabilir: workflow-seviyesi timeout, transition rolleri, state query rolleri, long-poll penceresi/rolleri ve child kurallarının seçtiği view'ların değiştirilmesi.

Bu sayfa `overrides` bloğunun tam referansıdır. Long-poll ve state/transition kapsamlı view override'ları <sup>New</sup> **v0.0.95** ile geldi ve vnext-schema **0.0.54** gerektirir. `overrides.timeout` daha eski sürümlerde şemada tanımlıydı ancak runtime tarafından uygulanmıyordu; **v0.0.95**'ten itibaren gerçekten uygulanır (bkz. [Timeout](#timeout)).

## Neler override edilebilir?

| Yol | Etki | Mod |
|-----|------|-----|
| `overrides.timeout` | Child'ın workflow-seviyesi timeout'u | bütün olarak değiştirir (annotations dahil) |
| `overrides.transitions.<childTransition>.roles` | Child transition'ının grant'leri | liste bütün olarak değiştirilir |
| `overrides.states.<childState>.queryRoles` | Child state'inin query grant'leri | liste bütün olarak değiştirilir |
| `overrides.states.<childState>.interaction.longPoll.fallbackTimeoutSeconds` | Acknowledge (ack) bekleme penceresi | alan-seviyesi |
| `overrides.states.<childState>.interaction.longPoll.roles` | Interaction (ack) grant'leri | alan-seviyesi; liste bütün olarak değiştirilir |
| `overrides.states.<childState>.views.<viewKey>` | O state'te child kurallarının seçtiği view'ı değiştirir | referans değiştirir |
| `overrides.transitions.<childTransition>.views.<viewKey>` | O transition için child kurallarının seçtiği view'ı değiştirir | referans değiştirir |
| `overrides.views.<viewKey>` / `subFlow.viewOverrides` | **Deprecated.** View key'e göre her yerde değiştirir | referans değiştirir, parent tarafında |

**Hiçbir zaman override edilemez:** kurallar (view `rule`, long-poll `rule`) ve long-poll `terminate`. Bir override, long-poll tanımlamayan bir child state'e **asla** long-poll eklemez.

Tüm `roles` / `queryRoles` listelerinde `DENY`, `ALLOW`'u her zaman geçersiz kılar (bkz. [Authorization](../concepts/authorization)). v0.0.99 ile bu listeler `allOf` / `anyOf` kombinatör grant'larını da kabul eder.

## JSON Örneği

```json title="parent workflow — state (SubFlow ile)"
{
  "key": "kyc-check",
  "stateType": 4,
  "versionStrategy": "Minor",
  "subFlow": {
    "type": "S",
    "process": { "key": "kyc-verification", "domain": "core", "flow": "sys-flows", "version": "1.0.0" },
    "mapping": { "location": "./src/KycSubFlowMapping.csx", "code": "...", "type": "M", "encoding": "NAT" },
    "overrides": {
      "timeout": {
        "key": "kyc-abandoned",
        "target": "cancelled",
        "versionStrategy": "Minor",
        "timer": { "reset": "None", "duration": "PT2H" },
        "annotations": { "ui/countdown": "visible" }
      },
      "transitions": {
        "submit-documents": {
          "roles": [{ "role": "branch-officer", "grant": "ALLOW" }],
          "views": {
            "document-upload-default": { "key": "document-upload-branch", "domain": "core", "flow": "sys-views", "version": "1.0.0" }
          }
        }
      },
      "states": {
        "otp-wait": {
          "queryRoles": [{ "role": "branch-officer", "grant": "ALLOW" }],
          "interaction": {
            "longPoll": {
              "fallbackTimeoutSeconds": 180,
              "roles": [{ "role": "branch-officer", "grant": "ALLOW" }]
            }
          },
          "views": {
            "otp-default": { "key": "otp-branch", "domain": "core", "flow": "sys-views", "version": "1.0.0" }
          }
        }
      }
    }
  }
}
```

## Timeout

`overrides.timeout`, `workflowTimeout` şemasındaki tam bir timeout tanımıdır (`key`, `target`, `versionStrategy`, `timer` zorunlu; `mapping` ve `annotations` isteğe bağlı). Child'ın kendi timeout'unu **bütün olarak** değiştirir — child'daki `annotations` da dahil; parent override'ında `annotations` vermezseniz child'ınki taşınmaz.

:::warning
v0.0.95 öncesinde `overrides.timeout` şemada kabul edilse de runtime tarafından uygulanmıyordu. v0.0.95'ten itibaren override gerçekten çalışır: daha önce override ile başlatılan ve hiç zaman aşımına uğramayan child'lar artık override'daki süre dolunca hedef state'e geçer. Mevcut parent tanımlarınızdaki `overrides.timeout` bloklarını bu gözle gözden geçirin.
:::

Uygulanan timeout, child'ın state function yanıtındaki `timeout` bloğunda (`key`, `target`, `executeAtUtc`, `annotations`) görünür.

## Long-poll override'ları

`overrides.states.<childState>.interaction.longPoll` **alan-seviyesi** çalışır: yazdığınız alan child'ınkini değiştirir, yazmadığınız alan child'ın değerini korur.

| Alan | Tip | Kural |
|------|-----|-------|
| `fallbackTimeoutSeconds` | integer, `≥ 1` | Ack bekleme penceresi (saniye). Pipeline'daki fallback job'ının zamanlaması, interaction gate'i (state function + `authorize?ack=true`) ve state gövdesindeki `interaction.fallbackTimeoutSeconds` aynı çözümlemeyi okur; üçü her zaman tutarlıdır |
| `roles` | roleGrant[] | Child'ın long-poll rol grant'lerini **liste olarak bütünüyle** değiştirir. `[]` geçerlidir ve her çağırana izin verir — validator publish'te uyarır |

```json
"overrides": {
  "states": {
    "otp-wait": {
      "interaction": { "longPoll": { "fallbackTimeoutSeconds": 180 } }
    }
  }
}
```

Bu örnek child'ın `terminate` ve `roles` değerlerini korur, yalnızca pencereyi değiştirir.

Kısıtlar:

- `terminate` ve `rule` override edilemez (şema `additionalProperties: false` ile reddeder).
- Child state long-poll tanımlamıyorsa override **uygulanmaz** ve çözümleme anında `LongPollOverrideIgnoredNoLongPoll` (warning, EventId **20305**) loglanır. Override bir long-poll'u ayarlar, yaratmaz.
- Child interaction'ı `roles` yerine `rule` (condition script) ile yetkilendiriyorsa `roles` override'ı **yok sayılır** ve `LongPollRolesOverrideIgnoredRuleArm` (warning, EventId **20306**) loglanır; pencere override'ı yine uygulanır.

## View override'ları

`overrides.states.<childState>.views.<viewKey>` ve `overrides.transitions.<childTransition>.views.<viewKey>`, child'ın **kendi kuralları bir view seçtikten sonra** o view'ı başka bir view referansıyla değiştirir. Anahtar (`viewKey`), child kurallarının seçtiği view'ın key'idir; değer, yerine sunulacak view'ın referansıdır (`key`, `domain`, `flow`, `version`).

- Değiştirme **child tarafında** ve child'ın `CurrentState`'i üzerinde uygulanır (`EffectiveState` değil). Bu yüzden child doğrudan adreslendiğinde de override geçerlidir.
- Kapsam **tek atlamadır (one hop)**: P → C → G zincirinde P'nin override'ları yalnızca C'nin state'lerine uygulanır; G, C'nin override'larını okur.
- Yeni view referansı çözümlenemezse child'ın kendi view'ı sunulur ve `SubFlowViewOverrideUnresolved` (warning, EventId **20101**) loglanır.
- View seçim kuralları (`rule`) override edilemez; override yalnızca seçilen sonucu değiştirir. Kurallar için bkz. [View Seçimi](./view-selection).

### Deprecated: `overrides.views` ve `viewOverrides`

Eski `overrides.views.<viewKey>` ve `subFlow.viewOverrides` haritaları view key'e göre **her yerde** ve parent tarafında değiştirme yapar. Bunlar **deprecated**'dır; yerine state/transition kapsamlı `views` kullanın.

:::warning
Aynı `subFlow` üzerinde kapsamlı view override'ları (`overrides.states.*.views` / `overrides.transitions.*.views`) ile eski harita (`overrides.views` / `viewOverrides`) **karıştırılamaz**; validator publish'i reddeder:

```
State 'kyc-check' mixes state/transition-scoped view overrides with the legacy view map (overrides.views / viewOverrides). Use one or the other.
```
:::

## Publish doğrulaması ve uyarılar

Validator, child tanımını göremez; yalnızca parent'ın override bloğunu denetler. Engelleyici olmayan bulgular `ComponentValidationWarning` (warning, EventId **90006**) olarak loglanır — örneğin `interaction.longPoll.roles: []` ile child interaction'ının herkese açılması. Engelleyici hatalar (kapsamlı view override'ları ile eski haritanın karıştırılması, `fallbackTimeoutSeconds < 1`, bilinmeyen alanlar) publish'i durdurur.

## Nasıl taşınır, nerede çözümlenir?

`SubflowStarter`, child'ı başlatırken `overrides.states` ve `overrides.transitions` bloklarını child instance'ına damgalar (`subflow.state_role_overrides`, `subflow.transition_role_overrides`). Çözümleme **child** tarafında, child'ın `CurrentState`'inde yapılır:

- long-poll: pipeline kolu (fallback job zamanlaması), interaction gate'i ve state gövdesi aynı çözümlemeyi okur;
- view: child'ın kendi kuralları view'ı seçtikten sonra override uygulanır.

Sınırlar:

- Damga **başlangıç anı snapshot'ıdır**: parent tanımı değişse de çalışmakta olan child'lar başladıkları override'larla devam eder.
- Child'da olmayan bir state'i adlandıran override sessizce etkisizdir.
- Damga okunamıyorsa (child'ın `parent.*` metadata'sında bozuk/uyumsuz JSON) `SubFlowOverrideStampMalformed` (warning, EventId **20307**) loglanır ve child'ın kendi yapılandırması kullanılır — override uygulanmaz.

## Authorize ile ilişki

<sup>New</sup> v0.0.95 ile tek karar noktası `authorize` fonksiyonudur (`GET .../instances/{id}/functions/authorize?queryRoles=true`). <sup>New</sup> v0.0.99 itibarıyla instance bir SubFlow içindeyken karar **yalnızca en derin aktif SubFlow yaprağında** verilir: parent'ın damgaladığı `overrides.states.<state>.queryRoles` ?? yaprak state'in `queryRoles`'u ?? yaprak workflow'un `queryRoles`'u (boş yaprak izin verir). Root ve ara seviyeler arasındaki kesişim (conjunction) kaldırıldı.

Bu nedenle **override, parent'ın bir yaprağı kısıtlamasının yoludur**: root `queryRoles` tanımlayıp yaprak hiç tanımlamıyorsa root kısıtı artık uygulanmaz (erişim gevşer). Kısıtı korumak için parent'ta `subFlow.overrides.states.<state>.queryRoles` ya da yaprakta `queryRoles` tanımlayın. Parent'a ait transition'lar ve `authorize?ack=true` (long-poll rol override'larını aynı çözümlemeyle okur) değişmedi. Ayrıntılar için bkz. [Authorization](../concepts/authorization).

## İlgili Konular

- [Workflow](../components/workflow) — `state.subFlow` ve `overrides` şeması
- [Tutorial: SubFlow ve SubProcess](../getting-started/tutorial-subflow) — SubFlow kurulumu adım adım
- [Authorization](../concepts/authorization) — rol grant'leri, `authorize` fonksiyonu ve yaprak değerlendirmesi
- [View Seçimi](./view-selection) — child kurallarının view'ı nasıl seçtiği
