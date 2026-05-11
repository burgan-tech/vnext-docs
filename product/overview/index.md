---
sidebar_position: 1
title: Ürün Vizyonu
description: vNext platformunun ürün konumlandırması, hedef pazar ve diferansiyasyonu
---

# Ürün Vizyonu

## Ürün Tanımı

**vNext; ekiplerin karmaşık iş akışlarını güvenilir, izlenebilir ve ölçeklenebilir biçimde modelleyip işletmesini sağlayan workflow platformudur.**

Platform, bankacılık ve finans sektöründeki karmaşık iş akışlarını — kredi onayından müşteri onboarding'e, ödeme süreçlerinden düzenleyici raporlamaya — tek bir merkezi yapı ile yönetir. Sektörel odak bankacılık olmakla birlikte, model sigorta, telekom, kamu ve sağlık gibi süreç-yoğun sektörlere de uyarlanabilir.

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

**vNext'in konumu:** Custom code'un esnekliğini, BPM suite'lerin hızını ve bankacılık sektörünün domain bilgisini tek bir platformda birleştiren **sektör odaklı, cloud-native workflow platformu**.

## Hedef Pazar

### Birincil Segment

- **Bankacılık ve finans kurumları** — karmaşık iş süreçleri, yüksek düzenleme yükü, çoklu kanal
- Orta-büyük ölçek (100+ çalışan BT ekibi)
- Dijital dönüşüm sürecinde

### İkincil Segment

- **Sigorta ve leasing şirketleri** — benzer workflow yoğunluğu
- **Telekom** — müşteri yaşam döngüsü yönetimi
- **Kamu** — e-devlet iş akışları
- **Sağlık** — sevk, sigorta onayı, ödeme akışları

## Diferansiyasyon

| Özellik | vNext | Geleneksel BPM |
|---------|-------|----------------|
| **Domain izolasyonu** | Her iş alanı bağımsız runtime | Paylaşılan monolitik engine |
| **Deployment bağımsızlığı** | Alan bazında ayrı deploy | Tek deploy, herkes etkilenir |
| **Konfigürasyon yaklaşımı** | İş kuralları tanım bazlı | Kod + konfigürasyon karışık |
| **Versiyonlama** | Bileşen bazında semantic version | Platform versiyonu |
| **Entegrasyon** | Dapr building blocks + yerleşik task tipleri | Connector/adapter geliştirme |
| **Ölçeklendirme** | Domain bazında yatay | Genel platform bazında |
| **Cloud-native** | Birinci sınıf vatandaş | Sonradan eklenen katman |

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

### 6. Standards over Proprietary
Açık standartlar (Dapr building blocks, OpenTelemetry, CloudEvents, semantic versioning) tercih edilir.

## Ürün Hedefleri (2026)

| Hedef | Metrik | Durum |
|-------|--------|-------|
| Çoklu domain desteği | 5+ domain paralel çalışabilir | ✅ Tamamlandı |
| Tam audit trail | Her işlem loglanıyor | ✅ Tamamlandı |
| Event-driven entegrasyon | DaprPubSub task desteği | ✅ Tamamlandı |
| Versiyonlama | SemVer ile bileşen yönetimi | ✅ Tamamlandı |
| Operasyonel altyapı | Inbox/Outbox + retry yerleşik | ✅ Tamamlandı |
| Self-service domain oluşturma | Yeni domain < 1 saat | 🔄 Devam ediyor |
| Visual workflow designer | Low-code tanımlama arayüzü | 📋 Planlı |
| Multi-tenant SaaS | Self-service onboarding + guardrail | 📋 Planlı |

## Başarı Metrikleri

Platform başarısını şu metriklerle ölçüyoruz:

- **Time-to-workflow**: Yeni bir iş akışının tanımlanması ve deploy edilmesi süresi
- **Domain onboarding süresi**: Yeni bir iş alanının platforma eklenmesi süresi
- **Uptime**: Platform erişilebilirlik oranı (%99.9+ hedef)
- **Concurrent instances**: Eşzamanlı çalışan workflow instance sayısı
- **Integration latency**: Dış sistem çağrılarının ortalama yanıt süresi
- **Citizen developer onboarding süresi**: İş analistinin ilk akışı yayınlama süresi

## İlgili Sayfalar

- [Hedef Kullanıcılar (Persona)](../personas/) — Kim ne için kullanıyor?
- [Feature Catalog](../features/) — Mevcut yeteneklerin detayı
- [Ürün Yönü ve Sınırlar](../direction-scope/) — Ürünün gittiği yön ve net sınırlar
- [Roadmap](../roadmap/) — Faz bazlı planlama
- [Release Strategy](../release-strategy/) — Sürüm politikası
