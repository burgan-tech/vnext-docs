---
sidebar_position: 2
title: vNext Forge Studio
description: Görsel workflow tasarım ve yönetim aracı — VS Code Extension ve Desktop uygulaması
---

# vNext Forge Studio

vNext Forge Studio, vNext platformu için görsel bir workflow tasarım ve yönetim aracıdır. VS Code extension ve bağımsız masaüstü uygulaması olarak kullanılabilir.

**Repo:** [github.com/burgan-tech/vnext-forge](https://github.com/burgan-tech/vnext-forge)

## Temel Özellikler

- **Workflow Designer** — Sürükle-bırak canvas ile state'ler ve transition'lar tasarlama
- **Component Editors** — Task, Schema, View, Function, Extension editörleri
- **CSX Mapping Editor** — C# script editörü (snippet bar + API referans paneli)
- **Quick Run** — Runtime'a bağlanarak workflow'ları anlık test etme
- **Documentation & Deploy** — Otomatik döküman oluşturma ve package deploy

## Kurulum

### VS Code Marketplace

1. VS Code'da Extensions panelini aç (`Ctrl+Shift+X` / `Cmd+Shift+X`)
2. **"vNext Forge Studio"** ara
3. **Install** butonuna tıkla

### VSIX Dosyasından

```bash
code --install-extension vnext-forge-studio-<version>.vsix
```

### Ön Koşullar

- VS Code 1.80+
- Proje kök dizininde `vnext.config.json` dosyası

## Hızlı Başlangıç

1. `vnext.config.json` içeren bir klasörü VS Code ile aç — extension otomatik aktifleşir
2. Explorer'da herhangi bir component `.json` dosyasına sağ tıkla → **Forge: Open with vNext Forge**
3. Veya Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) açıp **Forge** yaz

## Forge Tools Paneli

Sol sidebar'da **vNext Tools** paneli, proje yönetimi için merkezi bir kontrol noktası sağlar:

![vNext Tools Panel](/img/tools/vnext-tools-panel.png)

Panelden erişilebilen özellikler:
- Settings (workspace konfigürasyonu)
- Project (component ağacı)
- Environments (ortam yönetimi)
- Package Deploy
- Quick Run

## Workflow Designer

Workflow Designer, state-machine tabanlı workflow'ları görsel olarak tasarlamak için bir canvas sunar:

![Flow Designer Layout](/img/tools/flow-designer-layout.png)

**Canvas özellikleri:**
- State ekleme/silme/düzenleme
- Transition bağlantıları oluşturma
- Auto-layout (yatay/dikey)
- Arama paneli
- Property sidebar (General, Tasks, Transitions, Error Boundary)

## Schema Editor

Schema Editor, JSON schema'ları görsel olarak tasarlamayı sağlar:

![Schema Designer Layout](/img/tools/schema-designer-layout.png)

## CSX Mapping Editor

C# script dosyalarını düzenlemek için entegre bir editör:

![CSX Mapping Editor](/img/tools/csx-mapping-editor.png)

**Özellikler:**
- Syntax highlighting ve IntelliSense
- Snippet Quick Bar (sık kullanılan kod kalıpları)
- C# API Reference paneli

## Quick Run

Workflow'ları çalışan bir runtime üzerinde anlık test etme aracı:

![Quick Runner Panel](/img/tools/quick-runner-panel.png)

**Yetenekler:**
- Yeni instance başlatma
- Transition tetikleme
- Instance detayları (View, Data, History, Correlations)
- Global Headers ve Environment yönetimi
- Instance filtreleme

## Desktop Uygulaması

vNext Forge Studio, bağımsız bir masaüstü uygulaması olarak da mevcuttur. Desktop app, VS Code extension ile aynı React tabanlı UI ve designer'ları kullanır — bu kılavuzdaki tüm özellikler (workflow canvas, component editörleri, Quick Run, CSX editörü) her iki ortamda da aynı şekilde çalışır.

## Tam Kullanım Kılavuzu

Detaylı kullanım kılavuzu (tüm özellikler, kısayollar, troubleshooting) için:

**[vNext Forge Studio — Usage Guide](https://github.com/burgan-tech/vnext-forge/blob/main/docs/usage-guide/README.md)**

Kılavuz içeriği:
1. Installation
2. Getting Started
3. Workspace Configuration
4. Workflow Designer
5. Component Editors
6. Quick Run
7. Documentation and Deployment
8. Troubleshooting
