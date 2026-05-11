---
sidebar_position: 2
title: Service Discovery
description: Service Discovery yapılandırması, localhost doğrulaması ve kayıt hatası yönetimi
---

# Service Discovery Yapılandırması

## Üretim Ortamında Localhost Doğrulaması

 sürümünden itibaren platform, yaygın yapılandırma hatalarını önlemek için başlangıçta Service Discovery yapılandırmasını doğrular.

**Doğrulama Kuralları:**

| Ortam | Localhost İzni | Davranış |
|-------|----------------|----------|
| Development | ✅ Evet | Localhost adresleri kabul edilir |
| Production | ❌ Hayır | Uygulama başlatılamaz |

**Üretimde Engellenmiş Adresler:**
- `localhost`
- `127.0.0.1`
- `::1`

**Yapılandırma Örneği:**

```json
{
  "vNextApi": {
    "BaseUrl": "https://api.production.com",
    "ServiceDiscovery": {
      "Enabled": true
    }
  }
}
```

**Hata Mesajı:**
```
FATAL: Service Discovery yapılandırma hatası
vNextApi:BaseUrl üretim ortamında localhost'a işaret edemez.
Mevcut değer: http://localhost:4201
Ortam: Production

Lütfen yapılandırmayı çözümlenebilir bir ağ adresi kullanacak şekilde güncelleyin.
```

**Neden Önemli:**
- Yanlış yapılandırılmış servislerin dağıtımını önler
- Service mesh'in uygulamaya ulaşabilmesini garanti eder
- Fail-fast davranışı yapılandırma hatalarını erken yakalar

---

## Service Discovery Kayıt Hatası Yönetimi

Service Discovery etkinleştirildiğinde, uygulama artık başlatmaya devam etmeden önce başarılı kayıt işlemini zorunlu kılar.

**Fail-Fast Davranışı:**

| Senaryo | Davranış |
|---------|----------|
| Service Discovery etkin + Kayıt başarılı | ✅ Normal çalışma |
| Service Discovery etkin + Kayıt başarısız | ❌ Uygulama hemen çöker |
| Service Discovery devre dışı | Doğrulama yapılmaz |

**Hata Yönetimi:**

```
FATAL: Service Discovery kaydı başarısız oldu
Başarılı servis kaydı olmadan devam edilemez.

Detaylar:
- Service Discovery Endpoint: https://discovery.prod.com
- Kayıt Timeout: 30s
- Hata: Connection timeout

Kontrol edilecekler:
1. Service Discovery endpoint'ine ağ bağlantısı
2. Service Discovery endpoint yapılandırması
3. Firewall kuralları ve ağ politikaları
4. Endpoint için DNS çözümlemesi
```

**Yapılandırma Kontrolü:**

```json
{
  "ServiceDiscovery": {
    "Enabled": true,
    "Endpoint": "https://discovery.production.com",
    "RetryAttempts": 3,
    "RetryDelay": "PT5S"
  }
}
```

**Neden Önemli:**
- Servislerin kısmen yapılandırılmış durumda çalışmasını önler
- Mikroservis dağıtımlarının service mesh ile tam entegre olmasını sağlar
- Altyapı sorunlarını dağıtım sırasında hemen tespit eder
- Dağıtık sistemlerde sessiz hataları önler

## Sorun Giderme

1. **Service Discovery Endpoint Doğrulama:**
   ```bash
   curl https://discovery.production.com/health
   ```

2. **Ağ Bağlantısı Kontrolü:**
   ```bash
   ping discovery.production.com
   ```

3. **Uygulama Loglarını İnceleme:**
   ```bash
   docker logs vnext-app-core | grep "Service Discovery"
   ```

4. **Geçici Olarak Devre Dışı Bırakma (Sadece Development):**
   ```json
   {
     "ServiceDiscovery": {
       "Enabled": false
     }
   }
   ```
