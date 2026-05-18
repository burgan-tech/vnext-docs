---
sidebar_position: 3
title: Multi-Domain Kurulumu
description: vNext platformunda birden fazla domain'i izole olarak çalıştırma
---

# Multi-Domain Kurulumu

vNext Runtime, **aynı altyapı üzerinde birden fazla domain'i eş zamanlı çalıştırmayı** destekler. Ekipler izole domain ortamları (`core`, `sales`, `hr` gibi) aynı PostgreSQL, Redis, Vault ve Dapr servisleri üzerinde paylaşabilir.

:::tip
Her domain'in kendi orchestration, execution, worker-inbox, worker-outbox ve init container'ı vardır; ancak **paylaşılan altyapı** (DB, Redis, Vault, Dapr) tek instance olarak çalışır.
:::

## Repo'yu Edinme

[`vnext-runtime`](https://github.com/burgan-tech/vnext-runtime) GitHub'da **public template** repo olarak sunulmaktadır. Henüz klonlamadıysanız:

```bash
git clone https://github.com/burgan-tech/vnext-runtime.git
cd vnext-runtime
```

Kendi organizasyonunuz altında bağımsız bir repo oluşturmak isterseniz, GitHub'daki **"Use this template"** butonunu kullanarak yeni bir repo türetebilirsiniz.

### Değişiklikleri Kaydetme (Check-in)

Domain konfigürasyonlarınızı ve özelleştirmelerinizi versiyon kontrolünde tutmak için standart Git akışını kullanın:

```bash
git add .
git commit -m "feat: sales domain konfigürasyonu eklendi"
git push origin main
```

:::warning
`vnext/docker/domains/` altında oluşan domain konfigürasyon dosyaları varsayılan olarak `.gitignore` kapsamındadır. Ekip ile paylaşmak istediğiniz domain konfigürasyonlarını `.gitignore` dosyasından çıkararak versiyon kontrolüne dahil edebilirsiniz.
:::

## Klasör Yapısı

```
vnext/docker/
├── templates/                              # Yeni domain'ler için şablon dosyalar
│   ├── .env                                # {{PLACEHOLDER}} içeren ana env şablonu
│   ├── .env.orchestration                  # Orchestration şablonu
│   ├── .env.execution                      # Execution şablonu
│   ├── .env.worker-inbox                   # Inbox worker şablonu
│   ├── .env.worker-outbox                  # Outbox worker şablonu
│   └── appsettings.*.Development.json      # App settings şablonları
├── domains/                                # Domain konfigürasyonları
│   ├── core/                               # Domain: core
│   ├── sales/                              # Domain: sales
│   └── <domain_adi>/                       # Sizin domain'iniz
│       ├── .env
│       ├── .env.orchestration
│       ├── .env.execution
│       ├── .env.worker-inbox
│       ├── .env.worker-outbox
│       └── appsettings.*.Development.json
├── config/                                 # Paylaşılan altyapı konfigürasyonu
├── docker-compose.yml
└── create-domain.sh                        # Şablonlardan domain oluşturma scripti
```

## Yeni Domain Oluşturma

Şablonlardan domain konfigürasyonu oluşturmak için `create-domain` komutunu kullan:

```bash
# Port çakışmasını önlemek için port offset ile domain oluştur
# Not: core (offset 0) ve discovery (offset 5) önceden yapılandırılmıştır
# Özel domain'ler için offset 10 veya üstünü kullan
make create-domain DOMAIN=sales PORT_OFFSET=10
make create-domain DOMAIN=hr PORT_OFFSET=20
make create-domain DOMAIN=finance PORT_OFFSET=30
```

Bu komut şunları oluşturur:

- Domain'e özgü DAPR store adları, portlar ve app ID'leri içeren environment dosyaları
- Domain'e özgü veritabanı connection string'leri içeren appsettings dosyaları
- Observability için uygun OTEL servis adları

Veritabanı adı, domain adından otomatik oluşturulur:

- `core` → `vNext_Core`
- `sales` → `vNext_Sales`
- `kullanici-yonetimi` → `vNext_Kullanici_Yonetimi`

## Port Tahsisi

Her domain, `PORT_OFFSET` değerine göre **benzersiz portlar** kullanır:

| Offset | Domain (Örnek)      | App Port | Execution | Inbox | Outbox | Init |
|--------|---------------------|----------|-----------|-------|--------|------|
| 0      | core (rezerve)      | 4201     | 4202      | 4203  | 4204   | 3005 |
| 5      | discovery (rezerve) | 4206     | 4207      | 4208  | 4209   | 3010 |
| 10     | sales               | 4211     | 4212      | 4213  | 4214   | 3015 |
| 20     | hr                  | 4221     | 4222      | 4223  | 4224   | 3025 |
| 30     | finance             | 4231     | 4232      | 4233  | 4234   | 3035 |

Dapr portları çakışmayı önlemek için `offset * 100` kullanır.

:::warning[Rezerve Edilmiş Offset'ler]
`core` ve `discovery` domain'leri sırasıyla **0** ve **5** offset'leri ile önceden yapılandırılmıştır. Özel domain'lerin için **bu offset'leri kullanma**. Yeni domain'ler için 10 veya daha yüksek offset değerleri ile başla.
:::

## Birden Fazla Domain Çalıştırma

```bash
# 1. Paylaşılan altyapıyı başlat
make up-infra

# 2. Önceden yapılandırılmış domain'ler (core ve discovery) kullanıma hazır
make up-vnext DOMAIN=core
make up-vnext DOMAIN=discovery

# 3. Kendi domain'ini oluştur ve başlat (offset 10 veya üstü kullan)
make create-domain DOMAIN=sales PORT_OFFSET=10
make up-vnext DOMAIN=sales

# 4. Tüm çalışan servisleri görüntüle
make status-all-domains

# 5. Belirli bir domain'in sağlık durumunu kontrol et
make health DOMAIN=core
make health DOMAIN=sales
```

## Domain Yönetimi

```bash
# Tüm yapılandırılmış domain'leri listele
make list-domains

# Belirli bir domain'i durdur
make down-vnext DOMAIN=sales

# Belirli bir domain'i yeniden başlat
make restart-vnext DOMAIN=sales

# Tüm domain'leri durdur ama altyapıyı çalışır tut
make down-all-vnext

# Belirli bir domain'in loglarını görüntüle
make logs-vnext DOMAIN=core
```

## Şablonları Özelleştirme

Şablonlar `vnext/docker/templates/` dizininde bulunur. Şablonlar `{{PLACEHOLDER}}` sözdizimini kullanır:

| Placeholder | Açıklama |
|---|---|
| `{{DOMAIN_NAME}}` | Domain adı (örn. `core`, `sales`) |
| `{{PORT_OFFSET}}` | Port offset değeri |
| `{{DB_NAME}}` | Veritabanı adı (örn. `vNext_Core`) |
| `{{VNEXT_APP_PORT}}` | Orchestration portu |
| `{{DAPR_*_PORT}}` | Dapr sidecar portları |

**Otomatik üretilen environment değişkenleri:**

| Değişken | Açıklama |
|---|---|
| `DAPR_STATE_STORE_NAME` | Dapr state store adı (zorunlu) |
| `DAPR_SECRET_STORE_NAME` | Dapr secret store adı |
| `DAPR_PUBSUB_STORE_NAME` | Dapr pubsub store adı |
| `DAPR_APP_ID` | Her servis için benzersiz Dapr app tanımlayıcısı |
| `OTEL_SERVICE_NAME` | OpenTelemetry servis adı |

## Eski Tekli Domain Modu

Geriye uyumluluk için eski `change-domain` komutu hâlâ kullanılabilir:

```bash
make change-domain DOMAIN=sirketim
```

Bu komut tüm domain ile ilgili ayarları günceller ancak **birden fazla domain'i eş zamanlı çalıştırmayı desteklemez**.

---

*Kaynak repo: [`burgan-tech/vnext-runtime`](https://github.com/burgan-tech/vnext-runtime) — Bu sayfa [`README.tr.md`](https://github.com/burgan-tech/vnext-runtime/blob/main/README.tr.md)'den distil edilmiştir.*
