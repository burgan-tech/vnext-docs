---
id: aksiyonlar
title: Aksiyonlar ve Hook'lar
sidebar_label: Aksiyonlar ve Hook'lar
sidebar_position: 6
description: Pseudo UI action modeli — dispatch/submit/select/reset, command URN'leri, preHooks/postHooks ve davranış kuralları
---

# Aksiyonlar ve Hook'lar

Aksiyon bileşenleri (`Button`, `IconButton`, `FAB`, `Card.onTap`, `ForEach.template.onTap` …) bir kullanıcı etkileşimini host uygulamasına ileten **action** taşır. Bu sayfa action modelinin tam yapısını, `command` URN kullanımını ve **preHooks/postHooks** pipeline'ının davranış kurallarını anlatır.

---

## Action: Kısa ve Genişletilmiş Form

Bir aksiyon iki şekilde yazılabilir:

**Kısa form (string)** — yalnızca verb iletilir:

```json
{ "type": "Button", "label": { "tr": "İptal" }, "action": "cancel" }
```

**Genişletilmiş form (object)** — command, validation ve hook'lar eklenebilir:

```json
{
  "type": "Button",
  "label": { "tr": "Kaydet", "en": "Save" },
  "action": {
    "action": "dispatch",
    "command": "urn:vnext:flow:transition:demo:sample-flow:${param}:save",
    "validate": true,
    "preHooks":  [{ "action": "audit",     "command": "urn:client:audit:click", "sync": true }],
    "postHooks": [{ "action": "telemetry", "command": "urn:client:telemetry:click" }]
  }
}
```

| Alan | Tip | Açıklama |
|------|-----|----------|
| `action` | string | Verb — aşağıdaki tabloya bakın |
| `command` | string (URN) | İşlemi özelleştiren URN. Bkz. [URN Kataloğu](/docs/components/urn-catalog) |
| `validate` | boolean | Aksiyon öncesi form validasyonu yapılacağını işaretler (aşağıda) |
| `preHooks` | array | Ana aksiyon **öncesi** çalışan hook'lar |
| `postHooks` | array | Ana aksiyon **sonrası** çalışan hook'lar |

---

## Verb'ler

| Verb | Host'a gider mi? | Açıklama |
|------|------------------|----------|
| `submit` | Evet | Formu gönderir ve `command`'daki transition'ı tetikler. **Varsayılan olarak valide eder.** |
| `dispatch` | Evet | Genel amaçlı aksiyon gönderimi; `command` URN'i ile özelleştirilir. Validasyon **opsiyoneldir** (`validate`). |
| `select` | Hayır | Yerel seçim (ör. `ForEach` içinde `bind` güncelleme). Host'a gitmez. |
| `reset` | Evet | Sıfırlama aksiyonu; host'a gider. |
| `delegate` | Evet | Delege aksiyonlar; arka planda `submit` ve `reset` kullanır. |

`command` değeri her zaman bir URN'dir ve `urn:vnext` (runtime tarafından çözülür) veya `urn:client` (client'ın local davranışı) prefiksini taşır. Format ve binding kuralları için bkz. [URN Kataloğu ve Binding](/docs/components/urn-catalog).

---

## `validate`

`validate`, aksiyon tetiklenmeden önce formun validasyondan geçirileceğini işaretler:

- **`submit`** → varsayılan olarak valide eder (`validate` yazılmasa da).
- **`dispatch`** → validasyon seçeneği sunar; `validate: true` verilmedikçe valide etmez.

**Validasyon başarısız olursa hiçbir aksiyon ve hiçbir hook tetiklenmez**; hatalı alanlar işaretlenir.

---

## preHooks ve postHooks

Hook'lar, ana aksiyonun çevresinde audit, telemetry gibi yan etkileri çalıştırmak için kullanılır. Her hook bir aksiyon nesnesidir:

| Alan | Tip | Açıklama |
|------|-----|----------|
| `action` | string | Hook verb'i (ör. `audit`, `telemetry`) |
| `command` | string (URN) | Hook'un çalıştıracağı URN |
| `sync` | boolean | `true` ise senkron (sonucu ana akışı etkileyebilir); `false`/yazılmazsa asenkron |

:::caution[Reserved verb'ler hook olamaz]
`submit`, `select`, `reset` gibi rezerve verb'ler hook olarak **reddedilir** (warn log yazılır). Hook'lar yalnızca yan etki aksiyonları içindir.
:::

---

## Davranış Kuralları

preHooks/postHooks pipeline'ı aşağıdaki kurallarla çalışır:

| Durum | Davranış |
|-------|----------|
| **Sync pre-hook reject** | Ana aksiyon **ve** post-hook'lar atlanır + error log |
| **Sync post-hook reject** | Error log + kalan post-hook'lara **devam edilir** |
| **Async hook reject** | Warn log; ana akış **bloklanmaz** |
| **Validation fail** | Hiçbir hook tetiklenmez |
| **`select` verb** | Hook'lar **skip** edilir (host'a hiç gitmez) |
| **`reset` verb** | Hook'lar **çalıştırılır** (host'a gider) |
| **Reserved verb hook** | Reddedilir + warn log |
| **Pipeline hatası** | Pipeline **asla throw etmez** — last-ditch try/catch + error log |

---

## İlgili

- [URN Kataloğu ve Binding](/docs/components/urn-catalog) — `command` URN formatları ve `${param}` binding
- [Tasarımcı Rehberi → Eylem Düğmeleri](./tasarimci-rehberi) — buton ve `action` temelleri
- [View Yapısı → Aksiyon Bileşenleri](./view-yapisi) — `Button`, `IconButton`, `FAB`
- [Data Akışı](./data-akisi) — `select` ve `onTap` ile yerel veri güncelleme
