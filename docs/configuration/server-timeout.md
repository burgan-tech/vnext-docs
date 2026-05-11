---
sidebar_position: 3
title: Sunucu Timeout
description: Init Service sunucu timeout yapılandırması
---

# Sunucu Timeout Yapılandırması

Uzun süren publish işlemleri (büyük paketler, çok sayıda bileşen) için ortam değişkenleri ile sunucu timeout'larını yapılandırabilirsiniz.

## Ortam Değişkenleri

| Değişken | Açıklama | Varsayılan |
|----------|----------|------------|
| `SERVER_TIMEOUT_MS` | Toplam istek timeout'u (milisaniye) | `600000` (10 dk) |
| `SERVER_KEEP_ALIVE_TIMEOUT_MS` | Keep-alive bağlantı timeout'u (milisaniye) | `600000` (10 dk) |
| `SERVER_HEADERS_TIMEOUT_MS` | Header timeout'u (milisaniye, keep-alive'dan büyük olmalı) | `610000` (10 dk + 10 sn) |

## Yapılandırma Örnekleri

**Docker Compose (30 dakika timeout):**

```yaml
services:
  vnext-init:
    environment:
      SERVER_TIMEOUT_MS: 1800000        # 30 dakika
      SERVER_KEEP_ALIVE_TIMEOUT_MS: 1800000
      SERVER_HEADERS_TIMEOUT_MS: 1810000
```

**Docker Run:**

```bash
docker run -e SERVER_TIMEOUT_MS=1800000 \
           -e SERVER_KEEP_ALIVE_TIMEOUT_MS=1800000 \
           -e SERVER_HEADERS_TIMEOUT_MS=1810000 \
           your-image
```

> **İpucu:** Paket publish ederken timeout hatası alıyorsanız, bu değerleri artırmayı deneyin. `SERVER_HEADERS_TIMEOUT_MS` her zaman `SERVER_KEEP_ALIVE_TIMEOUT_MS` değerinden biraz daha büyük olmalıdır.
