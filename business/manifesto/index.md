---
sidebar_position: 1
title: Manifesto
description: vNext platformunun vizyonu, misyonu ve temel prensipleri
---

# Platform Manifestosu

## Vizyon

**Her iş sürecini dijitalleştiren, güvenli ve ölçeklenebilir bir platform.**

vNext, kurumsal iş süreçlerini tek bir noktadan tanımlayabilen, yönetebilen ve izleyebilen bir iş akışı platformudur. Geleneksel yazılım geliştirme döngülerinin getirdiği ağırlığı ortadan kaldırarak, iş birimlerinin ihtiyaçlarını hızla karşılayan bir yapı sunar.

## Misyon

Kurumların dijital dönüşüm yolculuğunda:

- **Hızı artırmak** — aylarca süren geliştirme döngülerini günlere indirmek
- **Riski azaltmak** — güvenli, denetlenebilir ve geri alınabilir iş akışları sunmak
- **Esnekliği korumak** — değişen iş kurallarına platform yeniden yazılmadan adapte olmak
- **Sahipliği kolaylaştırmak** — her iş alanının kendi süreçlerini bağımsız yönetmesini sağlamak

## Temel Prensipler

### 1. İş Alanı Bağımsızlığı (Domain Independence)

Her iş alanı (onboarding, ödeme, bildirim, kimlik doğrulama...) kendi bağımsız ortamına sahiptir. Bir alandaki değişiklik veya sorun, diğer alanları etkilemez.

**Bu ne anlama gelir?**
- Onboarding ekibi, kendi süreçlerini ödeme ekibinden bağımsız geliştirir
- Bir alandaki güncelleme, diğer alanların çalışmasını durdurmaz
- Her alan kendi hızında ilerler, kendi zamanında deploy eder

### 2. Tanımla, Çalıştır, İzle (Define, Execute, Observe)

Platform üç temel adımla çalışır:

1. **Tanımla** — iş akışı kurallarını, adımlarını ve koşullarını belirle
2. **Çalıştır** — tanımlanan akışı güvenli ortamda işlet
3. **İzle** — her adımı, kararı ve sonucu denetle

Teknik bir bilgiye ihtiyaç duymadan iş kuralları tanımlanabilir; teknik detaylar platform tarafından yönetilir.

### 3. Güvenlik ve Denetlenebilirlik (Security & Auditability)

- Her işlem kaydedilir ve geriye dönük izlenebilir
- Eşzamanlı değişiklikler çakışma koruması ile yönetilir (veri kaybı önlenir)
- Erişim yetkilendirmesi domain bazında ayrıştırılır
- Altyapı düzeyinde sırlar (credentials) merkezi güvenlik kasasında tutulur

### 4. Kademeli Evrim (Incremental Evolution)

Platform "büyük patlama" yaklaşımı yerine **kademeli büyüme** felsefesiyle çalışır:

- Yeni iş kuralları mevcut süreçleri bozmadan eklenebilir
- Bileşenler versiyonlanır — eski ve yeni versiyonlar yan yana çalışabilir
- Geçişler kontrollü ve geri alınabilir

### 5. Teknoloji Agnostik Entegrasyon

Platform, dış sistemlerle entegrasyonu birinci sınıf vatandaş olarak kabul eder:

- REST API, mesaj kuyruğu, zamanlayıcı, script — hepsi platform içinden yönetilebilir
- Mevcut sistemler (core banking, KYC, bildirim servisleri) doğrudan bağlanabilir
- Entegrasyon kodu ile iş mantığı birbirinden ayrıdır

## Platform Sözü

| Biz... | Bunun yerine... |
|--------|-----------------|
| İş kurallarını **konfigürasyon** olarak tanımlarız | Her kural için yeni kod yazılmasını beklemeyiz |
| Alanları **izole** tutarız | Monolitik bir yapıda herkesi sıraya sokmayız |
| Her değişikliği **versiyonlarız** | Geri dönüşü olmayan dağıtımlar yapmayız |
| Entegrasyonları **platform seviyesinde** yönetiriz | Her ekibin kendi entegrasyon kodunu yazmasını beklemeyiz |
| Süreci **uçtan uca izlenebilir** kılarız | Sürecin nerede tıkandığını tahmin etmeyiz |
