---
sidebar_position: 4
title: vNext Template CLI
description: vNext platformu için hazır workflow projesi oluşturma aracı
---

# vNext Template CLI

vNext Template CLI, vNext platformu için standart yapıda yeni workflow projeleri oluşturan bir scaffolding aracıdır. Önceden tanımlı klasör yapısı, validasyon kuralları ve build komutları ile proje tutarlılığını sağlar.

**Package:** `@burgan-tech/vnext-template`
**Repo:** [github.com/burgan-tech/vnext-template](https://github.com/burgan-tech/vnext-template)

:::tip
vNext Forge Studio bu CLI'ı yerleşik olarak kullanır. Forge Studio'nun "Create Project" özelliği arka planda bu aracı çalıştırır.
:::

## Kurulum ve Proje Oluşturma

```bash
# Yeni proje oluştur (önerilen)
npx @burgan-tech/vnext-template <domain-name>

# Belirli versiyon ile
npx @burgan-tech/vnext-template@1.0.0 <domain-name>
```

### Örnek

```bash
npx @burgan-tech/vnext-template user-management
```

Bu komut:
1. `user-management` adında yeni bir dizin oluşturur
2. Tüm template dosyalarını kopyalar
3. `{domainName}` referanslarını domain adı ile değiştirir
4. Bağımlılıkları otomatik yükler

### Alternatif: Dependency Olarak

```bash
npm install @burgan-tech/vnext-template
npm run setup <domain-name>
```

## Proje Yapısı

Oluşturulan proje şu yapıya sahiptir:

```
<domain-name>/
├── Extensions/
├── Functions/
├── Schemas/
├── Tasks/
├── Views/
├── Workflows/
└── vnext.config.json
```

## vnext.config.json

Her proje kök dizininde bir konfigürasyon dosyası içerir:

```json
{
  "domain": "user-management",
  "paths": {
    "componentsRoot": "user-management",
    "schemas": "Schemas",
    "workflows": "Workflows",
    "tasks": "Tasks",
    "views": "Views",
    "functions": "Functions",
    "extensions": "Extensions"
  },
  "exports": {
    "schemas": [],
    "workflows": [],
    "tasks": [],
    "views": [],
    "functions": [],
    "extensions": []
  }
}
```

### Path Konfigürasyonu

Component dizin adları özelleştirilebilir:

```json
{
  "paths": {
    "componentsRoot": "src",
    "workflows": "Flows",
    "schemas": "Models"
  }
}
```

## Validasyon

Proje yapısını ve schema'ları doğrulamak için:

```bash
npm run validate
```

Kontrol edilen öğeler:
- `package.json` yapısı ve içeriği
- `vnext.config.json` doğruluğu
- Domain dizin yapısı
- JSON dosya syntax'ı
- Schema validasyonu (`@burgan-tech/vnext-schema` ile)
- Semantic versioning uyumu

### Validasyon Çıktısı

Detaylı çıktı sunar:
- Geçen validasyonlar
- Başarısız validasyonlar (dosya yolu ve satır numarası ile)
- Özet istatistikler
- Başarısız dosyalar listesi

## Build

Domain paketini deployment veya cross-domain kullanım için build edin:

```bash
# Runtime build (varsayılan) — tam domain yapısı
npm run build

# Reference build — sadece export edilen component'ler
npm run build:reference
```

### Build Tipleri

| Tip | Açıklama | Kullanım |
|-----|----------|----------|
| `runtime` | Tüm dosyaları içeren tam domain yapısı | Engine deployment |
| `reference` | Sadece `vnext.config.json` exports'taki dosyalar | Cross-domain kullanım |

### Build Seçenekleri

```bash
npm run build -- [options]

# Örnekler
npm run build -- -o my-build           # Özel çıktı dizini
npm run build -- -t reference -o ref   # Reference build
npm run build -- --skip-validation     # Validasyon atla
```

## Kullanılabilir Scriptler

| Script | Açıklama |
|--------|----------|
| `npm run validate` | Proje yapısını ve schema'ları doğrula |
| `npm run build` | Runtime paketi oluştur (`dist/`) |
| `npm run build:runtime` | Runtime build (açık) |
| `npm run build:reference` | Reference build (sadece exports) |
| `npm run setup <name>` | Domain adı ile kurulum |
| `npm run sync-schema` | Schema versiyonunu bağımlılıklardan senkronize et |
| `npm test` | Testleri çalıştır |

## Programatik Kullanım

```javascript
const vnextTemplate = require('@burgan-tech/vnext-template');

const config = vnextTemplate.getDomainConfig();
const schemas = vnextTemplate.getSchemas();
const workflows = vnextTemplate.getWorkflows();
const tasks = vnextTemplate.getTasks();
const schemasPath = vnextTemplate.getComponentPath('schemas');
```

### API Referansı

| Metod | Açıklama |
|-------|----------|
| `getDomainConfig()` | Domain konfigürasyonunu döner |
| `getPathsConfig()` | Path konfigürasyonunu döner |
| `getSchemas()` | Tüm schema'ları döner |
| `getWorkflows()` | Tüm workflow'ları döner |
| `getTasks()` | Tüm task'ları döner |
| `getViews()` | Tüm view'ları döner |
| `getFunctions()` | Tüm function'ları döner |
| `getExtensions()` | Tüm extension'ları döner |
| `getDomainName()` | Domain adını döner |
| `getComponentPath(type)` | Belirtilen component tipi için path döner |

---

Tam dokümantasyon için: [github.com/burgan-tech/vnext-template](https://github.com/burgan-tech/vnext-template)
