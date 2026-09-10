---
sidebar_position: 1
title: Helm Chart
description: vNext platformunu Kubernetes ve Minikube üzerinde kurmak için Helm chart kullanımı
---

# Helm Chart

vNext, container ortamlarına kolay kurulum için resmi bir **Helm chart** sunar. Bu chart ile Kubernetes cluster'ınıza veya local Minikube ortamınıza tüm altyapıyı tek bir komutla kurabilirsiniz.

- **Repo:** [burgan-tech/vnext-helm-charts](https://github.com/burgan-tech/vnext-helm-charts)
- **OCI Artifact:** `ghcr.io/burgan-tech/vnext`

---

## Container Ortamı Kurulumu

Kubernetes cluster'ınıza vNext kurmak için aşağıdaki adımları izleyin.

**1. Helm repository'yi ekleyin:**

```bash
helm pull oci://ghcr.io/burgan-tech/vnext --version <version>
```

**2. Chart'ı kurun:**

```bash
helm install vnext oci://ghcr.io/burgan-tech/vnext \
  --namespace vnext \
  --create-namespace \
  --values values.yaml
```

**3. Kurulumu doğrulayın:**

```bash
helm list -n vnext
kubectl get pods -n vnext
```

:::tip
`values.yaml` dosyasında tenant yapılandırması, veritabanı bağlantıları ve diğer ayarlar tanımlanır. Detaylı yapılandırma seçenekleri için [repo'daki](https://github.com/burgan-tech/vnext-helm-charts) `values.yaml` referansına bakınız.
:::

---

## Lokal Ortam (Minikube)

Local geliştirme için Minikube üzerinde vNext runtime'ı çalıştırabilirsiniz.

**1. Minikube'u başlatın:**

```bash
minikube start
```

**2. vNext'i Minikube cluster'ına kurun:**

```bash
helm install vnext oci://ghcr.io/burgan-tech/vnext \
  --namespace vnext \
  --create-namespace \
  --values values-local.yaml
```

**3. Servise erişin:**

```bash
minikube service vnext -n vnext
```

:::info
Minikube kurulumu, local geliştirme ve test senaryoları için uygundur. Üretim ortamları için container cluster yapılandırmasını kullanın.
:::

---

## DbMigrator — Schema Migration Timeout'ları

`db-migrator` Job'ı, her flow'un PostgreSQL şemasına migration uygularken `SchemaMigration` bölümünü kullanır:

```json
{
  "SchemaMigration": {
    "CommandTimeoutSeconds": 600,
    "LockExpirySeconds": 900
  }
}
```

| Anahtar | Tip | Varsayılan | Açıklama |
|---------|-----|------------|----------|
| `CommandTimeoutSeconds` | integer | `600` | Şema migration sırasında her statement için komut timeout'u. Büyük tabloları yeniden yazan data migration'ları (ör. incident backfill) Npgsql'in 30 sn'lik varsayılanını kolayca aşabilir |
| `LockExpirySeconds` | integer | `900` | Bir şemanın migration'ı etrafında tutulan distributed lock'un süresi. `CommandTimeoutSeconds`'tan **büyük** olmalıdır — aksi halde bir migration statement'ı hâlâ çalışırken lock süresi dolabilir ve ikinci bir migrator aynı şemayı eşzamanlı başlatabilir |

Helm chart üzerinden `db-migrator.appEnvConfig` altında `SchemaMigration__CommandTimeoutSeconds` / `SchemaMigration__LockExpirySeconds` ortam değişkenleriyle override edilebilir; isteğe bağlıdır, tanımlanmazsa yukarıdaki kod varsayılanları geçerlidir. Migrator, herhangi bir şema başarısız olursa non-zero exit code ile çıkar.
