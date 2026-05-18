---
sidebar_position: 4
title: Header Limitleri
description: Kestrel request header boyut ve sayı limitleri yapılandırması
---

# Header Limitleri Yapılandırması <sup>New</sup>

Büyük token'lar, çok sayıda özel header veya uzun cookie değerleri taşıyan istekler varsayılan Kestrel limitlerini aşabilir. Bu durumda istemci **`431 Request Header Fields Too Large`** hatası alır.

## Yapılandırma

`appsettings.json` dosyasına aşağıdaki bölümü ekleyin:

```json
{
  "Kestrel": {
    "Limits": {
      "MaxRequestHeadersTotalSize": 65536,
      "MaxRequestHeaderCount": 200
    }
  }
}
```

## Parametreler

| Parametre | Tip | Varsayılan | Açıklama |
|-----------|-----|------------|----------|
| `MaxRequestHeadersTotalSize` | integer | `32768` (32 KB) | Tüm request header'larının toplam maksimum boyutu (byte) |
| `MaxRequestHeaderCount` | integer | `100` | Tek bir istekte kabul edilecek maksimum header sayısı |

## Ne Zaman Artırılmalı

- JWT token'larının boyutu büyükse (çok sayıda claim içeren token'lar)
- İsteklerde çok sayıda özel header taşınıyorsa
- Proxy/gateway katmanlarının ek header'lar eklediği ortamlarda
- `431 Request Header Fields Too Large` hatası alındığında

> **Dikkat:** Limitleri gereğinden fazla artırmak bellek tüketimini artırabilir ve potansiyel DoS saldırı yüzeyini genişletir. İhtiyacınıza uygun minimum değerleri tercih edin.
