---
id: flow-default-version
title: Flow Varsayılan Sürümü (Publish ≠ Activate)
sidebar_label: Flow Varsayılan Sürümü
description: Bir flow sürümünü yayınlamak onu varsayılan yapmaz — sys-version-registry pointer'ı, pin modları, çözümleme kuralları, rollout runbook'ları ve hata kodları
---

# Flow Varsayılan Sürümü (Publish ≠ Activate)

v0.0.102 ile bir flow sürümünü **yayınlamak** (publish) onu **erişilebilir** yapar, ama **varsayılan** yapmaz. Bir flow'un varsayılan sürümü, `sys-version-registry` sistem flow'unda tutulan bir **pointer** ile belirlenir: sürüm belirtmeyen, `latest` diyen ya da kısmi sürüm (`2`, `2.1`) isteyen her start bu pointer'a göre çözülür. Pointer'ın üstündeki yayınlanmış sürümler **bekleyen** (pending) kalır; onlara yalnızca açıkça sürüm isteyen bir çağrı ulaşır.

Politika **flow başına opt-in**'dir: registry'de kaydı olmayan bir flow birebir eskisi gibi davranır (en yeni yayınlanmış sürüm). Sürüm belirten bir yayın stratejisi kurmak isteyen domain ekipleri pointer'ı yazar; diğer herkes için hiçbir şey değişmez.

:::info[Core paketi v0.0.21 veya üstü gerekli]
`sys-version-registry` flow'u **vnext-core v0.0.21** ile yayınlandı ([burgan-tech/vnext-sys-flow v0.0.21](https://github.com/burgan-tech/vnext-sys-flow/releases/tag/v0.0.21); npm: `@burgan-tech/vnext-core-runtime@0.0.21`). Bu sürümden eski bir core paketi kurulu domain'de `sys-version-registry` yoktur ve **her flow Automatic davranır** (en yeni sürüm) — hata üretilmez. Pointer yazmadan önce domain'in core paketini v0.0.21'e yükseltin.
:::

## Ürün sahipleri için

Yeni bir sürümü yayınlamak artık "canlıya almak" ile aynı şey değildir. Ekip sürümü önceden yayınlayıp yalnızca pilot kanalların (açıkça sürüm isteyen çağrılar) kullanmasına izin verebilir; tüm trafiği yeni sürüme geçirmek, registry'de tek bir `set-default` çağrısıyla ayrı ve geri alınabilir bir karar olur. Geri dönüş de aynı çağrıdır; o ana kadar yeni sürümde başlamış başvurular kendi sürümlerinde tamamlanır.

---

## Kavramlar

| Terim | Anlamı |
|---|---|
| **Yayınlanmış** (published) | `sys-flows`'ta kaydı olan her sürüm |
| **Latest** | Yayınlanmış en yüksek sürüm; pointer yoksa (Automatic) varsayılan budur |
| **Varsayılan** (default / pointer) | Registry'ye yazılan `defaultVersion`: major (`2`), minor (`2.1`), artifact (`2.1.0`), tam paket build'i (`2.1.0-pkg.1.0.168`) ya da `"latest"` (Automatic) |
| **Etkin varsayılan** (effective default, D) | Pointer'ın yayınlanmış en iyi eşleşmesi. Kısmi bir pointer'da (`2`, `2.1`) o hatta yeni bir patch yayınlandığında D kendiliğinden yukarı kayar |
| **Bekleyen** (pending) | D'nin üstündeki yayınlanmış sürümler |
| **Açık istek** (explicit) | Tam (`-pkg.`) ya da artifact (`2.2.0`) sürüm isteği. Tavana takılmaz; bekleyen sürümlere de ulaşır |

### Pin modları

| Pointer | Mod | Hatta yeni patch | Daha yüksek minor / major |
|---|---|---|---|
| `"latest"` / kayıt yok | **Automatic** (eski davranış) | canlı | canlı |
| `2.1.0-pkg.1.0.168` | **Paket build pin'i** — tek bir paket build'ini sabitler | bekler | bekler |
| `2.1.0` | **Artifact pin'i (exact)** — `2.1.0`'ın yeniden yayınlanan paket build'lerini izler | bekler | bekler |
| `2.1` | **Minor hat** — hotfix'ler (`2.1.x`) kendiliğinden canlıya geçer | canlı | bekler |
| `2` | **Major hat** | canlı | `2` içinde canlı, `3.0.0` bekler |

- Tam paket pointer'ı **`+metadata` olmadan** yazılır (registry şeması saklanan `+core` biçimini reddeder); eşleştirme build metadata'sını yok sayar, yani `2.1.0-pkg.1.0.168` pointer'ı yayınlanmış `2.1.0-pkg.1.0.168+core`'u seçer.
- Kısmi paket biçimleri (`2.1.0-pkg.1.0`, `2.1.0-pkg.1`) desteklenmez; geçersiz pointer olarak reddedilir (`Instance:100052`).
- **`"latest"` pointer'ı temizlemenin yoludur.** `null` geçerlidir ama **yalnızca create'te** etkilidir: instance-data merge'ü var olan bir anahtardaki `null`'ı yok sayar (bkz. [Instance Data](/docs/concepts/instance-data)), bu yüzden `set-default` ile `null` göndermek pointer'ı değiştirmez. Boş string reddedilir.

---

## Registry sözleşmesi

Registry flow'u `sys-version-registry`'dir: **flow başına bir instance**, **instance key = hedef flow'un key'i**. Registry instance'ı hedef flow ile **aynı domain'de** yaşar; çözümleme her zaman çağrılan (callee) flow'un domain'inde, o domain'in pointer'ıyla yapılır.

```json
{ "type": "Flow", "defaultVersion": "2.1", "reason": "pilot tamamlandı, CHG-12345" }
```

| Alan | Kural |
|---|---|
| `type` | Bilgi amaçlıdır; runtime okumaz. Bugün `"Flow"` yazılır |
| `defaultVersion` | `M`, `M.m`, `M.m.p`, tam `-pkg.` sürümü ya da Automatic için `"latest"`. `null` yalnızca create'te etkilidir; boş değer reddedilir |
| `reason` | Opsiyonel denetim (audit) metni |

Registry instance'ı `active` state'inde durur; tek transition'ı `set-default`'tur ve final state'i yoktur. Pointer, flow key'ine sahip en yeni registry instance'ının **durumundan bağımsız** olarak en son commit edilmiş data satırından okunur — `set-default` sırasında Busy olan ya da Faulted bir registry instance'ı da son pointer'ını taşımaya devam eder.

### İki çağrı

**1. Pointer oluşturma (create)** — hedef flow için ilk kez:

```http
POST /api/v1/{domain}/workflows/sys-version-registry/instances/start?sync=true
Content-Type: application/json

{
  "key": "customer-onboarding",
  "attributes": { "type": "Flow", "defaultVersion": "2.1.0", "reason": "CHG-12345" }
}
```

**2. Pointer değiştirme (`set-default`)** — mevcut registry instance'ı üzerinde:

```http
PATCH /api/v1/{domain}/workflows/sys-version-registry/instances/{instance}/transitions/set-default?sync=true
Content-Type: application/json

{
  "attributes": { "type": "Flow", "defaultVersion": "latest", "reason": "Automatic'e dönüş" }
}
```

- Her iki yazım da admission'dan ve Busy'den **önce** doğrulanır. Geçersiz ya da yayınlanmış hiçbir sürümle eşleşmeyen bir pointer `409` `Instance:100052` ile reddedilir; registry instance'ı `active` kalır ve eski pointer geçerliliğini korur.
- Başarılı bir yazımdan sonra commit sonrası çalışan best-effort bir iş flow'un önbellek generation'ını artırır; değişiklik pod başına yaklaşık **5 saniye** içinde (`GenerationMemoSeconds`) her pod'da görünür. Hemen ardından yapılan bir start eski çözümü görebilir.
- Hedef flow için zaten bir registry instance'ı varsa ikinci bir `create` yerine mevcut instance'a `set-default` uygulayın.

---

## Çözümleme

| İstek | Sonuç |
|---|---|
| Tam (build metadata yok sayılır) ya da artifact sürüm | Birebir eşleşme, tavan uygulanmaz (bekleyenler dahil); pointer hiçbir şeyle eşleşmese bile hizmet verilir |
| Sürüm yok, boş ya da `latest` | D |
| `M` ya da `M.m` | D'ye eşit ya da altındaki yayınlanmış en iyi eşleşme |
| Eşleşmelerinin tamamı D'nin üstünde kalan kısmi istek | `404` `Instance:100051` |
| Pointer yayınlanmış hiçbir sürümle eşleşmiyor | `latest` / boş ve kısmi istekler için `409` `Instance:100052` — fail-closed, asla latest ile ikame edilmez |

**Açık istek her zaman kazanır.** Tam ya da artifact bir istek pointer değerlendirilmeden önce ele alınır; bu yüzden eşleşmeyen bir pointer yalnızca `latest` / boş ve kısmi istekleri bloklar, açık sürümler çalışmaya devam eder — bozuk bir pointer düzeltilene kadar etrafından dolaşmanın yolu budur. `sys-*` flow'ları ve tam sürüm istekleri politikayı tamamen atlar.

### Senaryo tablosu

Yayınlanmış sürümler: `2.0.0`, `2.1.0`, `2.1.3`, `2.2.0`, `2.3.0`, `3.0.0`. D = etkin varsayılan.

| Pointer | D | İstek | Sonuç | Neden |
|---|---|---|---|---|
| yok / `latest` | — | yok / `latest` | `3.0.0` | Automatic, eski davranış |
| yok / `latest` | — | `2` | `2.3.0` | Automatic, `2` hattının en yükseği |
| `2.1.0` | `2.1.0` | yok / `latest` | **`2.1.0`** | `2.1.3` bekliyor |
| `2.1.0` | `2.1.0` | `2.1` | **`2.1.0`** | Kısmi istekler D'de ya da altında kalır |
| `2.1.0` | `2.1.0` | `2.2.0` | `2.2.0` | Açık istek (pilot) |
| `2.1.0` | `2.1.0` | `2.2` | `404` `Instance:100051` | `2.2.x`'in tamamı bekliyor |
| `2.1` | `2.1.3` | yok | **`2.1.3`** | Hattın en yükseği; hotfix'ler D'yi ilerletir |
| `2.1` | `2.1.3` | `2` | `2.1.3` | D'nin altındaki en iyi eşleşme |
| `2` | `2.3.0` | `3` | `404` `Instance:100051` | `3.x` bekliyor |
| `2.1.0-pkg.1.0.168` | o build | yok | o build | Tam pointer bir paket build'ini sabitler (build metadata yok sayılır) |
| `2.4` (eşleşme yok) | — | yok / `2` | `409` `Instance:100052` | Kısmi istekler için fail-closed |
| `2.4` (eşleşme yok) | — | `2.2.0` | `2.2.0` | Açık istek her zaman kazanır |

### Start yanıtı ve çalışan instance'lar

- **Start yanıtı çözülmüş sürümü taşır:** `StartInstanceOutput` artık `flowVersion` alanı içerir — instance'ın gerçekten başladığı sürüm. Saklanan sürüm paket build biçiminde olabilir (ör. SDK ile yayınlanan `1.0.0-pkg.1.0.0+core`); artifact kısmı `-pkg.` ve `+` öncesidir.
- **Çalışan instance'lar etkilenmez:** her instance başladığı çözülmüş sürüme sabittir. Pointer'ı çevirmek ya da geri almak süren işleri taşımaz.
- **SubFlow / SubProcess correlation'ları çözülmüş sürümü saklar:** parent, child'ın **çözülmüş** sürümünü (start yanıtındaki `flowVersion`) correlation'a yazar — yazılan referansı (`1.0` ya da `latest`) değil. Böylece parent okumaları (forward, descent, human task, retry) floating bir referansı child'ın çalıştığından farklı bir tanıma yeniden çözmez. Yerel ve cross-domain için geçerlidir; `flowVersion` döndürmeyen eski bir uzak runtime'da yazılan referans korunur. Bkz. [Workflow → SubFlow State](/docs/components/workflow#subflow-state).
- **Row security de varsayılan sürümü kullanır:** liste ve tekil GET'te uygulanan `rowSecurity` kural seti, pointer varsa varsayılan sürümden, yoksa latest'tan okunur — bir `set-default` yürürlükteki satır kurallarını da değiştirir. Bkz. [Satır Güvenliği](/docs/concepts/row-security).

---

## Rollout runbook'ları

### 1. Tek domain'de patch pilotu (canlı `1.2.0`, pilot `1.2.1`)

1. `set-default "1.2.0"` — **artifact pin'i**. Hat pointer'ı (`1.2`) `1.2.1`'i yayınlandığı anda canlıya alırdı.
2. `1.2.1`'i yayınlayın — bekleyen olarak kalır.
3. Pilot client'lar `?version=1.2.1` ile başlatır.
4. Hazır olduğunda `set-default "1.2.1"` (ya da sonraki patch'lerin kendiliğinden akması için `"1.2"`).
5. **Geri alma:** `set-default "1.2.0"`. `1.2.1`'de başlamış instance'lar `1.2.1`'de kalır.

### 2. Hotfix'ler akarken minor pilotu (canlı hat `2.1`, pilot `2.2.0`)

1. `set-default "2.1"` — **minor hat**. `2.1.x` hotfix'leri yayınlandıkça canlıya geçer.
2. `2.2.0`'ı yayınlayın — `2.1` hattının üstünde olduğu için bekler.
3. Pilot client'lar `?version=2.2.0` ile başlatır; `?version=2.2` (kısmi) `404` `Instance:100051` döner.
4. Bu arada `2.1.4` hotfix'i yayınlanırsa pilotu beklemeden canlıya geçer (yaklaşık 5 sn içinde).
5. Pilot tamamlandığında `set-default "2.2"` — artık `2.2.x` hattı canlıdır.
6. **Geri alma:** `set-default "2.1"`; `2.2.0`'da başlamış instance'lar orada kalır.

### 3. Cross-domain: onboarding → contract

Çözümleme **callee'nin domain'inde, callee'nin pointer'ıyla** yapılır. Örnek: `core` domain'indeki `onboarding` flow'u, `partner` domain'indeki `contract` flow'unu SubFlow / SubProcess olarak başlatıyor.

- `"1.2.0"` ya da `"1.2"` referans veren bir caller, ilerlemek için referansını değiştirmek zorundadır; `"1"`, `latest` ya da hiç sürüm vermeyen bir caller callee'nin pointer'ını izler.
- Pilot sırası:
  1. `partner`'da `contract`'ın yeni sürümünü yayınlayın (bekler).
  2. `onboarding`'in pilot sürümünde `contract`'ı açık sürümle referans verin ve onu yayınlayın (`core`'da bekler).
  3. Önce **callee**'nin varsayılanını çevirin (`partner`'da `contract`), sonra **caller**'ınkini (`core`'da `onboarding`).
- İki registry atomik değildir: **önce callee'yi çevirin.** Çevirme sırasında başlamış child'lar çözüldükleri sürümde kalır.

---

## Hata kodları

| Kod | Ad | HTTP | Anlamı |
|---|---|---|---|
| `Instance:100051` | `FlowVersionNotActivated` | 404 | İstenen sürüm(ler) var ama varsayılanın üstünde (bekliyor). Açık sürüm isteyin ya da pointer'ı taşıyın |
| `Instance:100052` | `FlowDefaultVersionInvalid` | 409 | Pointer hatalı (string olmayan değer dahil) ya da yayınlanmış hiçbir sürümle eşleşmiyor (yalnızca `latest` / kısmi istekler). Yazımda da reddedilir. Pointer'ı yayınlanmış bir sürüme ya da `"latest"`'a çekin |
| `Instance:100053` | `VersionRegistryUnavailable` | 503 | Registry okunamadı; geçicidir, yeniden deneyin. Çözümleme latest'a düşmek yerine başarısız olur |

:::note[Instance okumalarına da yansır]
v0.0.102 ile instance listesi, tekil GET ve `GetInstances` / `GetInstance` task'leri flow tanımını bir kez arar; bu arama yukarıdaki hatalardan biriyle başarısız olursa okuma da aynı hatayla başarısız olur — flow'da `rowSecurity` olsun ya da olmasın. Bkz. [Satır Güvenliği → Lookup hatası](/docs/concepts/row-security#lookup-hatası).
:::

## Gözlemlenebilirlik

- `Instance.Create` span'i: `vnext.flow.version.requested` (çağıranın gönderdiği; yoksa yazılmaz) ve `vnext.flow.version` (çözülen).
- Önbellek çözümleme span'i: `vnext.flow.version.pointer`, `vnext.flow.version.source` (`automatic` / `explicit` / `default` / `ceiling`).
- Loglar: 20500 politika ile çözüldü, 20501 geçersiz varsayılan, 20502 registry okunamadı, 20503 registry invalidate edildi, 20504 invalidation başarısız.

## Kapsam dışı

- **"Hangi sürüm canlı?" için bir okuma yüzeyi yoktur.** Pointer'ı registry instance'ının verisinden okuyabilirsiniz; etkin varsayılanı (D) döndüren ayrı bir endpoint bu sürümde yoktur.
- **Function varsayılan sürümleri** desteklenmez; politika yalnızca workflow'lara uygulanır.

## Örnekler

- [vnext-example — FlowDefaultVersion integration testleri](https://github.com/burgan-tech/vnext-example/tree/master/tests/Core.IntegrationTests/Tests/FlowDefaultVersion) — registry yokken latest, artifact / hat / tam paket pin'leri, çevirme + geri alma, `latest` ile temizleme, yük altında pointer çevirme
- [vnext-example — `flow-default-version-lab` workflow'ları](https://github.com/burgan-tech/vnext-example/tree/master/core/Workflows/flow-default-version-lab)

## İlgili

- [Workflow → SubFlow State](/docs/components/workflow#subflow-state) — correlation'da çözülmüş sürüm
- [Satır Güvenliği](/docs/concepts/row-security) — hangi sürümün kural seti uygulanır
- [Instance Data](/docs/concepts/instance-data) — merge semantiği
- [REST API](/docs/api-reference/rest-api) — start ve transition endpoint'leri
- [URN Kataloğu](/docs/components/urn-catalog) — sistem flow'ları
