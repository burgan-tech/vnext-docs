---
sidebar_position: 1
title: Ürün Vizyonu
description: vNext platformunun ürün konumlandırması, hedef pazar ve diferansiyasyonu
---

# Ürün Vizyonu

## Ürün Tanımı

**vNext**, kurumsal iş süreçlerini tanımlamak, çalıştırmak ve izlemek için tasarlanmış bir **workflow orchestration platformudur**.

Platform, bankacılık ve finans sektöründeki karmaşık iş akışlarını — kredi onayından müşteri onboarding'e, ödeme süreçlerinden düzenleyici raporlamaya — tek bir merkezi yapı ile yönetmeyi hedefler.

## Konumlandırma

```
┌─────────────────────────────────────────────────────────────┐
│                    Kurumsal İş Süreçleri                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Custom Code          BPM Suites           vNext            │
│   ──────────          ──────────           ─────            │
│   Tam esneklik        Standart araçlar     Domain-native    │
│   Yavaş delivery      Lisans maliyeti      Config-driven    │
│   Bakım yükü          Vendor lock-in       Bağımsız deploy  │
│   Kişiye bağımlı      Generic              Sektör odaklı    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**vNext'in konumu:** Custom code'un esnekliğini, BPM suite'lerin hızını ve bankacılık sektörünün domain bilgisini tek bir platformda birleştiren **sektör odaklı workflow platformu**.

## Hedef Pazar

### Birincil Segment
- **Bankacılık ve finans kurumları** — karmaşık iş süreçleri, yüksek düzenleme yükü, çoklu kanal
- Orta-büyük ölçek (100+ çalışan BT ekibi)
- Dijital dönüşüm sürecinde

### İkincil Segment
- **Sigorta ve leasing şirketleri** — benzer workflow yoğunluğu
- **Telekom** — müşteri yaşam döngüsü yönetimi
- **Kamu** — e-devlet iş akışları

## Diferansiyasyon

| Özellik | vNext | Geleneksel BPM |
|---------|-------|----------------|
| **Domain izolasyonu** | Her iş alanı bağımsız runtime | Paylaşılan monolitik engine |
| **Deployment bağımsızlığı** | Alan bazında ayrı deploy | Tek deploy, herkes etkilenir |
| **Konfigürasyon yaklaşımı** | İş kuralları tanım bazlı | Kod + konfigürasyon karışık |
| **Versiyonlama** | Bileşen bazında semantic version | Platform versiyonu |
| **Entegrasyon** | Yerleşik task tipleri (HTTP, PubSub, Timer) | Connector/adapter geliştirme |
| **Ölçeklendirme** | Domain bazında yatay | Genel platform bazında |

## Ürün Prensipleri

### 1. Config over Code
İş kuralları konfigürasyon olarak tanımlanır. Yeni süreç = yeni tanım, yeni kod değil.

### 2. Domain-First
Platform domain kavramını birinci sınıf vatandaş olarak kabul eder. Her alan bağımsızdır.

### 3. Incremental Adoption
Büyük patlama değil, kademeli geçiş. Bir domain ile başla, başarılı olunca yay.

### 4. Observable by Default
Her süreç adımı otomatik olarak izlenebilir. Ek enstrümantasyon gerekmez.

### 5. Secure by Design
Güvenlik sonradan eklenen bir katman değil, platformun doğasında var.

## Ürün Hedefleri (2026)

| Hedef | Metrik | Durum |
|-------|--------|-------|
| Çoklu domain desteği | 5+ domain paralel çalışabilir | ✅ Tamamlandı |
| Tam audit trail | Her işlem loglanıyor | ✅ Tamamlandı |
| Event-driven entegrasyon | PubSub task desteği | ✅ Tamamlandı |
| Versiyonlama | SemVer ile bileşen yönetimi | ✅ Tamamlandı |
| Self-service domain oluşturma | Yeni domain < 1 saat | 🔄 Devam ediyor |
| Visual workflow designer | Low-code tanımlama arayüzü | 📋 Planlı |

## Başarı Metrikleri

Platform başarısını şu metriklerle ölçüyoruz:

- **Time-to-workflow**: Yeni bir iş akışının tanımlanması ve deploy edilmesi süresi
- **Domain onboarding süresi**: Yeni bir iş alanının platforma eklenmesi süresi
- **Uptime**: Platform erişilebilirlik oranı (%99.9+ hedef)
- **Concurrent instances**: Eşzamanlı çalışan workflow instance sayısı
- **Integration latency**: Dış sistem çağrılarının ortalama yanıt süresi
