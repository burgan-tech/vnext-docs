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
