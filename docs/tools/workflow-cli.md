---
sidebar_position: 3
title: vNext Workflow CLI
description: Deploy, validation ve CSX mapping işlemleri için komut satırı aracı
---

# vNext Workflow CLI

vNext Workflow CLI, geliştirme ortamında workflow component'lerini hızlıca deploy etmek, senkronize etmek ve CSX mapping'lerini yönetmek için kullanılan bir komut satırı aracıdır.

**Package:** `@burgan-tech/vnext-workflow-cli`
**Repo:** [github.com/burgan-tech/vnext-workflow-cli](https://github.com/burgan-tech/vnext-workflow-cli)
**NPM:** [npmjs.com/package/@burgan-tech/vnext-workflow-cli](https://www.npmjs.com/package/@burgan-tech/vnext-workflow-cli)

:::tip
vNext Forge Studio bu CLI'ı yerleşik olarak kullanır. Forge Studio üzerinden çalışıyorsanız ayrıca kurmanıza gerek yoktur.
:::

## Kurulum

```bash
# Global kurulum (önerilen)
npm install -g @burgan-tech/vnext-workflow-cli

# Veya proje bağımlılığı olarak
npm install @burgan-tech/vnext-workflow-cli
```

Kurulumdan sonra şu alias'lardan herhangi biri kullanılabilir:

```bash
wf --version       # kısa alias
vnext --version    # Windows için önerilen
workflow --version # tam isim
```

### Gereksinimler

- CLI **≥ 1.0.14** (runtime v0.0.95+ ile `publish/completed` sinyali ve `wf indexes generate` için)
- Node.js >= 14.0.0
- PostgreSQL (veritabanı işlemleri için)
- Docker (opsiyonel, PostgreSQL container için)

## vnext.config.json (Zorunlu)

CLI, proje kök dizininde bir `vnext.config.json` dosyası bekler:

```json
{
  "version": "1.0.0",
  "domain": "core",
  "paths": {
    "componentsRoot": "core",
    "tasks": "Tasks",
    "views": "Views",
    "functions": "Functions",
    "extensions": "Extensions",
    "workflows": "Workflows",
    "schemas": "Schemas"
  }
}
```

CLI, `componentsRoot` altını recursive tarar ve `.json` dosyalarını keşfeder (`.meta` klasörleri, `*.diagram.json`, `package*.json` ve `*config*.json` hariç).

## Hızlı Başlangıç

```bash
# vNext proje dizinine git
cd /path/to/your/vnext-project

# Sistem durumunu kontrol et
wf check

# Tüm component'leri senkronize et (eksikleri ekle)
wf sync

# Değişen dosyaları güncelle
wf update
```

## Temel Komutlar

### `wf check` — Sistem Durumu

API bağlantısı, veritabanı durumu ve component klasörlerini kontrol eder.

### `wf sync` — Eksik Component'leri Ekle

Veritabanında olmayan component'leri publish eder, mevcut olanları atlar. İlk kurulum ve yeni component ekleme senaryoları için idealdir.

:::info `publish/completed` sinyali — CLI ≥ 1.0.14 / runtime v0.0.95
`sync`, `update` ve `reset`, en az bir component publish ettikten sonra **bir kez** `POST /api/v1/definitions/publish/completed` çağırır ve dönen hook sonuçlarını satır satır yazar (`discovery-cache: Refreshed` | `SkippedNotOwner` | `Disabled` | `Failed`). Bu çağrı runtime'ın discovery endpoint cache'inin **tek otomatik geçersiz kılma** yoludur; atlanırsa cross-domain çağrılar bir sonraki deployment'a kadar eski adreslerle çözülür. Eski `GET definitions/re-initialize` çağrısı kaldırılmıştır; v0.0.95 öncesi bir runtime'a karşı çalışan yeni CLI `404` alır ve bunu yalnızca **uyarı** olarak gösterir (exit code değişmez). Bkz. [Service Discovery → Cache](/docs/configuration/service-discovery#cache).
:::

### `wf update` — Değişenleri Güncelle

Git'te değişen dosyaları tespit eder, veritabanından siler ve yeniden publish eder.

```bash
wf update                # Git'te değişen dosyaları işle
wf update --all          # Tümünü güncelle (onay sorar)
wf update --file x.json  # Tek dosya işle
```

### `wf reset` — Zorla Sıfırla

İnteraktif menüden component tipi seçerek zorla sıfırlama yapar (sil + yeniden publish).

```bash
wf reset  # İnteraktif menü açılır
```

### `wf indexes generate` — Attribute Index SQL'i <sup>New</sup> CLI 1.0.14

Master şemada `x-indexed: true` işaretli alanlar için DBA'nın inceleyip çalıştıracağı **offline** attribute-index SQL'i üretir. Komut API'ye ve veritabanına **hiç bağlanmaz**, SQL çalıştırmaz; `sync` / `update` / Master publish bu komutu tetiklemez.

```bash
wf indexes generate                                   # tüm workflow'lar → ./index-sql/
wf indexes generate --flow money-transfer -o ./index-sql
wf indexes generate --flow money-transfer --retire-obsolete
```

| Seçenek | Varsayılan | Açıklama |
|---|---|---|
| `--flow <key>` | tümü | Tek bir workflow key'i (yerel tüm versiyonları dahil) |
| `-o, --output <dir>` | `index-sql` | Yeni, değişmez batch klasörünün oluşturulacağı üst klasör |
| `--retire-obsolete` | kapalı | Artık hiçbir yerel versiyonun kullanmadığı projeksiyonları emekliye ayırır — yalnızca **tüm aktif workflow versiyonları** yerelde varken ve runtime okuyucu/yazıcıları drenajlanmışken |

Her çalıştırma `<output>/<ISO-zaman-damgası>-XXXXXX/` altında yeni bir batch klasörü açar (öncekiler korunur):

| Dosya | İçerik |
|---|---|
| `<flow_key>.sql` | Workflow başına bir dosya: advisory lock + **ACCESS EXCLUSIVE** tablo kilidi (5 sn `lock_timeout`), veri doğrulama, `q_<24hex>` adlı **stored generated column**'lar (tek tablo rewrite), index'ler (`contains`/`like`/`startswith`/`endswith` için trigram GIN — `public` şemasında `pg_trgm` ve `tr-TR-x-icu` gerekir), `AttributeIndexCatalog` güncellemesi — hepsi tek transaction |
| `manifest.json` | Kaynak dosya yolları, versiyonlar, SHA-256 checksum'ları, fiziksel index tanımları, `retireObsolete` bayrağı |
| `README.txt` | DBA yürütme notları |

**DBA akışı:** manifest'teki kaynak versiyonları deploy edilenlerle karşılaştırın, her SQL dosyasını bakım penceresinde tek tek çalıştırın:

```bash
psql -X -v ON_ERROR_STOP=1 --dbname=vNext_MyDomainDb --file=index-sql/<batch>/money_transfer.sql
```

Yapısal olarak eşleşen mevcut index'ler (eski adlarla olsa bile) **yeniden kullanılır**; değişen sahipli index'ler yeniden kurulur; yönetilmeyen çakışmalar script'i durdurur (`CASCADE` yok). Değişmemiş bir batch'i yeniden çalıştırmak OID'leri korur ve rewrite/ANALYZE'ı atlar. Bu **concurrent DDL değildir** — rewrite için disk/WAL/replica kapasitesini planlayın. Runtime tarafında yönlendirme `AttributeIndexes:Enabled` ile açılır, geri alma `AttributeIndexes:DisabledFlows` ile yapılır; index'ler filtre/sıralama iznini değiştirmez (`x-filterOperators` / `x-sortable` geçerli kalır). Ayrıntı: [Attribute Index'leri](/docs/how-to/attribute-indexes).

### `wf csx` — CSX → Base64 Dönüşümü

CSX dosyalarını Base64'e çevirip ilgili JSON dosyalarına gömer. API'ye publish etmez.

```bash
wf csx              # Git'te değişen CSX dosyaları
wf csx --all        # Tüm CSX dosyaları
wf csx --file x.csx # Tek dosya
```

## Komut Karşılaştırması

| Komut | DB Kontrol | Mevcut Varsa | Yeni İse | Kullanım Senaryosu |
|-------|-----------|--------------|----------|-------------------|
| `sync` | Evet | Atla | Publish | Eksik component'leri ekle |
| `update` | Evet | Sil + Publish | Publish | Değişenleri güncelle |
| `reset` | Evet | Sil + Publish | Publish | Zorla sıfırla |
| `csx` | Hayır | — | — | Sadece CSX→JSON güncelle |
| `indexes generate` <sup>New</sup> 1.0.14 | Hayır (offline) | — | — | `x-indexed` alanlar için DBA'ya SQL üret |

## Multidomain Desteği

CLI, birden fazla domain konfigürasyonunu destekler. Her domain'in kendi API ve veritabanı ayarları olabilir.

### Auto Domain Resolution

`vnext.config.json` içindeki `domain` alanı ile CLI profili otomatik eşleşir:

```bash
# Domain profilleri ekle (tek seferlik)
wf domain add core --API_BASE_URL http://localhost:4201 --DB_NAME vNext_Core
wf domain add demo --API_BASE_URL http://localhost:4221 --DB_NAME vNext_Demo

# Proje dizinine gir — domain otomatik değişir
cd ~/projects/core-app        # vnext.config.json: "domain": "core"
wf update                     # → core profili kullanılır

cd ~/projects/demo-app        # vnext.config.json: "domain": "demo"
wf update                     # → demo profili kullanılır
```

### Domain Komutları

```bash
wf domain active         # Aktif domain'i göster
wf domain list           # Tüm domain'leri listele
wf domain add <name>     # Yeni domain ekle
wf domain use <name>     # Aktif domain'i değiştir
wf domain remove <name>  # Domain'i sil
```

## Konfigürasyon

Config dosyası: `~/.config/vnext-workflow-cli/config.json`

```bash
wf config get              # Tüm ayarları göster
wf config set DB_HOST localhost
wf config set USE_DOCKER true
```

### Ayarlar Tablosu

| Değişken | Varsayılan | Açıklama |
|----------|-----------|----------|
| `API_BASE_URL` | `http://localhost:4201` | vNext API base URL |
| `API_VERSION` | `v1` | API versiyonu |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `vNext_WorkflowDb` | Veritabanı adı |
| `DB_USER` | `postgres` | Kullanıcı adı |
| `DB_PASSWORD` | `postgres` | Şifre |
| `USE_DOCKER` | `false` | Docker üzerinden PostgreSQL bağlantısı |
| `DOCKER_POSTGRES_CONTAINER` | `vnext-postgres` | Docker container adı |
| `AUTO_DISCOVER` | `true` | Otomatik component keşfi |
| `DEBUG_MODE` | `false` | Debug logging |

## Sorun Giderme

### "vnext.config.json not found"

Doğru dizinde olduğunuzdan emin olun. CLI her zaman `process.cwd()` kullanır.

### "Cannot connect to API"

```bash
curl http://localhost:4201/api/v1/health
wf config get API_BASE_URL
```

### "Database connection failed"

```bash
docker ps | grep postgres
docker start vnext-postgres
wf config get USE_DOCKER
```

---

Tam dokümantasyon için: [github.com/burgan-tech/vnext-workflow-cli](https://github.com/burgan-tech/vnext-workflow-cli)
