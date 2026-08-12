---
sidebar_position: 2
title: Local Development (Arşiv)
description: Docker Compose ile vNext runtime'ı local makinada çalıştırma (arşivlenmiş rehber)
---

# Local Development

:::warning[Bu doküman arşivlenmiştir]
Lokal geliştirme ortamı artık **vNext Forge** VS Code extension'ı üzerinden kurulmaktadır. Güncel kurulum akışı için [Geliştirme Ortamı Kurulumu (Forge)](/docs/getting-started/forge-setup) rehberini takip edin. Bu sayfa, runtime'ı elle (docker-compose/Make ile) kurmak isteyenler için referans olarak saklanmaktadır.
:::

Bu rehber, vnext platformunu **local makinanda** docker-compose üzerinden çalıştırmak için gerekli tüm adımları içerir. [`vnext-runtime`](https://github.com/burgan-tech/vnext-runtime) repo'su bu kurulum için hazır template'lerle gelir.

:::info[Tavsiye Edilen Kurulum: Multi-Domain]
vNext Runtime **multi-domain** mimarisini destekler. Yeni projelere başlarken doğrudan [Multi-Domain Kurulumu](./multi-domain) rehberini takip etmenizi öneriyoruz. Multi-domain yapı, birden fazla domain'i aynı altyapı üzerinde izole çalıştırmanıza olanak tanır ve ölçeklenebilir bir geliştirme deneyimi sunar.
:::

:::tip
Tek başlangıç için: **`make dev`** komutu environment'ı kurar, network oluşturur, PostgreSQL'i başlatır, vnext-app + init + component-publisher servislerini sırasıyla healthy hale getirir.
:::

## Ön Koşullar

- Docker Desktop (veya eşdeğer Docker Engine + Compose)
- Make
- Git

## Repo'yu Edinme

[`vnext-runtime`](https://github.com/burgan-tech/vnext-runtime) GitHub'da **public template** repo olarak sunulmaktadır. Projeyi klonlayarak başlayabilirsiniz:

```bash
git clone https://github.com/burgan-tech/vnext-runtime.git
cd vnext-runtime
```

Kendi organizasyonunuz altında bağımsız bir repo oluşturmak isterseniz, GitHub'daki **"Use this template"** butonunu kullanarak yeni bir repo türetebilirsiniz.

### Değişiklikleri Kaydetme (Check-in)

Lokal ortamda yaptığınız konfigürasyon değişikliklerini versiyon kontrolünde tutmak için standart Git akışını kullanın:

```bash
# Değişiklikleri staging'e ekle
git add .

# Commit oluştur
git commit -m "feat: domain konfigürasyonu güncellendi"

# Uzak repo'ya gönder
git push origin main
```

:::warning
`vnext/docker/domains/` altında oluşan domain konfigürasyon dosyaları varsayılan olarak `.gitignore` kapsamındadır. Ekip ile paylaşmak istediğiniz domain konfigürasyonlarını `.gitignore` dosyasından çıkararak versiyon kontrolüne dahil edebilirsiniz.
:::

## Environment Konfigürasyonu

Repo, domain'e özgü konfigürasyonlar oluşturmak için **template dosyalarını** `vnext/docker/templates/` dizininde içerir. `make create-domain` komutu ile bir domain oluşturduğunda, bu template'ler işlenir ve sonuçta oluşan konfigürasyon dosyaları `vnext/docker/domains/<domain_adi>/` dizinine yerleştirilir.

**Template Dosyaları:**

| Dosya | Açıklama |
|---|---|
| `.env` | Versiyonlar ve portları içeren ana environment dosyası |
| `.env.orchestration` | Orchestration servis konfigürasyonu |
| `.env.execution` | Execution servis konfigürasyonu |
| `.env.worker-inbox` | Worker inbox servis konfigürasyonu |
| `.env.worker-outbox` | Worker outbox servis konfigürasyonu |
| `appsettings.*.Development.json` | Uygulama ayarları |

Tüm yeni domain'ler için varsayılan değerleri değiştirmek istersen `vnext/docker/templates/` altındaki dosyaları özelleştir; tek bir domain için ayar gerekirse `vnext/docker/domains/<domain_adi>/` altındaki dosyaları düzenle.

## Hızlı Başlangıç (Makefile ile, önerilen)

Projedeki Makefile, geliştiriciler için en konforlu çalıştırma ortamını sağlar. Sistem environment dosyalarını kontrol eder ve development ortamını **tek komutla** başlatır:

```bash
# Environment dosyalarını kontrol et ve development ortamını başlat
make dev

# Yardım menüsünü görüntüle
make help

# Network kurulumu ve environment kontrolü
make setup
```

### `make dev` ne yapar?

`make dev` çalıştırdığında otomatik olarak şunlar gerçekleşir:

1. ✅ **Environment Setup** — `.env` dosyaları ve Docker network oluşturulur
2. ✅ **PostgreSQL** başlar → `vNext_WorkflowDb` veritabanı otomatik oluşturulur
3. ✅ **vnext-app** başlar → postgres healthy olduktan sonra
4. ✅ **vnext-init** başlar → vnext-app healthy olduktan sonra
5. ✅ **vnext-component-publisher** çalışır → vnext-init healthy olduktan sonra component'leri otomatik publish eder
6. ✅ Diğer tüm servisler başlar

Tek komutla:
- Veritabanı şema ile hazır
- Component'ler yüklü
- Tüm altyapı çalışır durumda

## Manuel Kurulum

Eğer Makefile kullanmak istemiyorsan, manuel olarak da kurabilirsin.

### 1. Environment Dosyalarını Kontrol Et

`.env`, `.env.orchestration` ve `.env.execution` dosyalarının `vnext/docker/` dizininde mevcut olduğundan emin ol; gerektiğinde özelleştir.

### 2. Docker Network Oluştur

```bash
docker network create vnext-development
```

### 3. Servisleri Başlat

```bash
cd vnext/docker

# Tüm servisleri arka planda başlat
docker-compose up -d

# Logları takip et
docker-compose logs -f vnext-app

# Belirli bir servisi yeniden başlat
docker-compose restart vnext-app
```

### 4. Sistem Durumunu Kontrol Et

```bash
# Çalışan servislerin durumu
docker-compose ps

# vnext-app sağlık kontrolü
curl http://localhost:4201/health
```

## VNext Core Runtime Initialization

`vnext-init` servisi, vnext-app servisi healthy olduktan sonra otomatik çalışır ve aşağıdaki işlemleri gerçekleştirir:

1. `@burgan-tech/vnext-core-runtime` npm paketini indirir (versiyon `.env` dosyasından kontrol edilir)
2. Paket içindeki `core` klasöründen sistem bileşenlerini okur:
   - Extensions
   - Functions
   - Schemas
   - Tasks
   - Views
   - Workflows
3. JSON dosyalarındaki tüm `"domain"` property değerlerini `APP_DOMAIN` environment variable değeri ile değiştirir
   - Bu sayede her geliştirici kendi domain'inde lokal ortamda çalışabilir
   - Varsayılan domain `"core"`'dur, ancak `.env` dosyasında `APP_DOMAIN=mydomain` ile özelleştirilebilir

## Veritabanı Yönetimi (Domain-Spesifik)

Her domain kendi veritabanını gerektirir. Veritabanı adları domain adından otomatik oluşturulur:

- `core` → `vNext_Core`
- `sales` → `vNext_Sales`
- `morph-idm` → `vNext_Morph_idm`

### Veritabanı Komutları

```bash
# Veritabanı durumunu kontrol et (tüm veritabanlarını listeler)
make db-status

# Sadece vNext veritabanlarını listele
make db-list

# Domain için veritabanı oluştur
make db-create DOMAIN=core
make db-create DOMAIN=sales

# Domain veritabanını sil (DİKKAT: yıkıcı!)
make db-drop DOMAIN=core

# Veritabanını sıfırla (sil ve yeniden oluştur)
make db-reset DOMAIN=core

# psql ile domain veritabanına bağlan
make db-connect DOMAIN=core
```

## Otomatik Component Publishing

`vnext-component-publisher` servisi, `vnext-init` healthy olduktan sonra otomatik çalışır:

1. vnext-init'in hazır olmasını bekler
2. Yapılandırılmış versiyon ve domain ile component'leri publish eder
3. Tamamlar ve çıkar

Component'leri **manuel** olarak yeniden publish etmek için:

```bash
# Component publisher'ı yeniden çalıştır
make republish-component

# Veya doğrudan script'i kullan
make publish-component
```

## Makefile Komutları Referansı

### Temel

| Komut | Açıklama |
|---|---|
| `make help` | Tüm kullanılabilir komutları listeler |
| `make dev` | Development ortamını kurar ve başlatır |
| `make setup` | Environment dosyalarını kontrol eder ve network'ü oluşturur |
| `make info` | Proje bilgilerini ve erişim URL'lerini gösterir |

### Çoklu Domain Yönetimi

| Komut | Kullanım |
|---|---|
| `make create-domain` | `make create-domain DOMAIN=sirketim PORT_OFFSET=10` |
| `make list-domains` | Tüm yapılandırılmış domain'leri listele |
| `make up-vnext` | `make up-vnext DOMAIN=sirketim` |
| `make down-vnext` | `make down-vnext DOMAIN=sirketim` |
| `make restart-vnext` | `make restart-vnext DOMAIN=sirketim` |
| `make status-vnext` | `make status-vnext DOMAIN=sirketim` |
| `make logs-vnext` | `make logs-vnext DOMAIN=sirketim` |
| `make status-all-domains` | Tüm çalışan vNext servislerini göster |
| `make down-all-vnext` | Tüm domain servislerini durdur (altyapıyı tut) |
| `make health` | Sağlık kontrolü; opsiyonel `DOMAIN=` parametresi |

### Altyapı

| Komut | Açıklama |
|---|---|
| `make up-infra` | Sadece altyapı servislerini başlat |
| `make down-infra` | Sadece altyapı servislerini durdur |
| `make status-infra` | Altyapı durumunu göster |
| `make logs-infra` | Altyapı loglarını göster |

### Docker

| Komut | Açıklama |
|---|---|
| `make up` | Servisleri başlatır |
| `make up-build` | Servisleri build ederek başlatır |
| `make down` | Servisleri durdurur |
| `make restart` | Servisleri yeniden başlatır |
| `make build` | Docker image'larını build eder |

### Monitoring & Logs

| Komut | Açıklama |
|---|---|
| `make status` | Servislerin durumu |
| `make health` | Servis sağlık kontrolü |
| `make logs` | Tüm servis logları |
| `make logs-orchestration` | Orchestration logları |
| `make logs-execution` | Execution logları |
| `make logs-init` | Init servis logları |
| `make logs-dapr` | DAPR servis logları |
| `make logs-db` | Database logları |

### Veritabanı

| Komut | Kullanım |
|---|---|
| `make db-status` | Veritabanı durumu (tüm DB'ler) |
| `make db-list` | Sadece vNext veritabanları |
| `make db-create` | `make db-create DOMAIN=core` |
| `make db-drop` | `make db-drop DOMAIN=core` (yıkıcı!) |
| `make db-reset` | `make db-reset DOMAIN=core` |
| `make db-connect` | `make db-connect DOMAIN=core` |

### Custom Components

| Komut | Açıklama |
|---|---|
| `make publish-component` | Component paketi publish eder |
| `make republish-component` | Component publisher'ı yeniden çalıştırır |

### Maintenance

| Komut | Açıklama |
|---|---|
| `make clean` | Durdurulmuş container'ları temizler |
| `make clean-all` | ⚠️ TÜM domain'leri, altyapıyı, image ve volume'leri siler |
| `make reset` | Environment'ı resetler (stop, clean, setup) |
| `make update` | Latest image'ları çeker ve servisleri yeniden başlatır |

## Yaygın Kullanım Senaryoları

```bash
# İlk kez projeyi çalıştırma
make dev

# Sadece logları takip etme
make logs-orchestration

# Servis durumunu kontrol etme
make status
make health

# Veritabanı işlemleri
make db-status
make db-reset DOMAIN=core

# Development sırasında yeniden başlatma
make restart

# Component'leri yeniden publish etme
make republish-component

# Temizlik ve yeniden kurulum
make reset
make dev

# Container'lara erişim
make shell-orchestration
make shell-postgres
```

---

*Kaynak repo: [`burgan-tech/vnext-runtime`](https://github.com/burgan-tech/vnext-runtime) — Bu sayfa [`README.tr.md`](https://github.com/burgan-tech/vnext-runtime/blob/main/README.tr.md)'den distil edilmiştir. Multi-domain detayları için [Multi-Domain Kurulumu](./multi-domain) sayfasına bakın.*
