---
sidebar_position: 2
title: Release Viewer
description: Tenant'taki domain'lerin Helm ve uygulama versiyonlarını görsel olarak izleyen uygulama
---

# Release Viewer

**vNext Release Viewer**, container ortamınıza kurduğunuz vNext deployment'larını izlemenizi sağlayan bir uygulamadır. Tenant'ınızdaki her domain için hangi **Helm chart versiyonu** ve **uygulama versiyonunun** kullanıldığını tek bir ekranda görsel olarak sunar.

- **Repo:** [burgan-tech/vnext-release-viewer](https://github.com/burgan-tech/vnext-release-viewer)

---

## Ekran Görüntüleri

### Versiyon Listesi

Tüm chart versiyonları ve her versiyonun kaç domain tarafından kullanıldığı:

![Versiyon Listesi](/img/deployment/chart_version_list_tr.png)

### Domain Release Detayları

Seçilen versiyondaki domain'lerin release bilgileri:

![Domain Release'leri](/img/deployment/chart_domain_releases_tr.png)

---

## Kurulum

Release Viewer, aynı container ortamına bağımsız bir uygulama olarak kurulur.

**1. Container'ı çalıştırın:**

```bash
docker run -d \
  --name vnext-release-viewer \
  -p 8080:8080 \
  ghcr.io/burgan-tech/vnext-release-viewer:latest
```

**2. Uygulamaya erişin:**

Tarayıcınızdan `http://localhost:8080` adresine gidin.

:::info
Release Viewer, Kubernetes ortamında çalışan vNext deployment'larına erişmek için uygun servis hesabı yetkilerine ihtiyaç duyar. Detaylı yapılandırma için [repo'ya](https://github.com/burgan-tech/vnext-release-viewer) bakınız.
:::
