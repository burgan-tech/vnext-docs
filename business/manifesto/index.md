---
sidebar_position: 1
title: Manifesto
description: vNext platformunun vizyonu, misyonu ve temel prensipleri
---

# Platform Manifestosu

> Biz, **süreçlerin kurumların görünmeyen işletim sistemi** olduğuna inanıyoruz.

vNext, kurumsal iş süreçlerini tek bir noktadan tanımlayabilen, yönetebilen ve izleyebilen bir iş akışı platformudur. Geleneksel yazılım geliştirme döngülerinin getirdiği ağırlığı ortadan kaldırarak, iş birimlerinin ihtiyaçlarını hızla karşılayan bir yapı sunar.

## Vizyon

**Her iş sürecini güvenli, izlenebilir ve ölçeklenebilir biçimde dijitalleştiren bir platform.**

Süreç tasarımı; teknik ekiplerin tekelinden çıkmalı, iş birimleriyle paylaşılmalı ve değişime karşı dirençli değil, **değişimi güvenle taşıyan** bir araç olmalıdır.

## Misyon

Kurumların dijital dönüşüm yolculuğunda:

- **Hızı artırmak** — aylarca süren geliştirme döngülerini günlere indirmek
- **Riski azaltmak** — güvenli, denetlenebilir ve geri alınabilir iş akışları sunmak
- **Esnekliği korumak** — değişen iş kurallarına platform yeniden yazılmadan adapte olmak
- **Sahipliği kolaylaştırmak** — her iş alanının kendi süreçlerini bağımsız yönetmesini sağlamak

## Temel Prensipler

### 1. Süreçler İş Birimleri İçin de Açıktır

Süreçler sadece teknik ekiplerin değil, iş birimlerinin de anlayabileceği kadar **açık ve okunabilir** olmalıdır. Tanım dili, terminoloji ve görsel temsil, teknik olmayan paydaşların da süreci sahiplenebileceği şekilde tasarlanır.

### 2. Otomasyon Kontrolü Azaltmaz, Görünürlüğü Artırır

Otomasyon, **kontrolü azaltmak için değil**; görünürlük, güven ve hız kazandırmak için kullanılır. Her otomatik karar adımı denetlenebilir, açıklanabilir ve gerektiğinde manuel müdahaleye açıktır.

### 3. Her Adım Ölçülebilir, İzlenebilir ve Denetlenebilirdir

Süreçlerin her adımı:

- **Ölçülebilir** — adım süresi, başarı oranı, tekrar denemeleri raporlanır
- **İzlenebilir** — kim, ne zaman, hangi veriyle çalıştırdı belirlidir
- **Denetlenebilir** — geriye dönük audit trail her zaman erişilebilirdir

### 4. Değişime Direnmek Yerine Değişimi Güvenle Taşır

Değişim kaçınılmazdır. Platform; her bileşeni **versiyonlar**, yan yana sürümleri destekler ve geri dönüşü kontrollü kılar:

- Yeni sürüm eskinin yanında çalışabilir
- Devam eden instance'lar başlatıldıkları sürümle tamamlanır
- Geri alma ve hot-reload mekanizmaları platforma yerleşiktir

### 5. Cloud-Native, Yerel İhtiyaçlara Duyarlı

Yerel mevzuat, lokalizasyon ve sektörel ihtiyaçları karşılayan ama **küresel ölçekte çalışabilen cloud-native bir yaklaşım** benimsenir:

- Multi-tenant SaaS işletim modeli
- Domain bazında yatay ölçeklenme
- Konteyner / Kubernetes uyumlu deployment
- Bölgesel dağıtım ve veri yerelliği desteği

### 6. Citizen Developer Enablement

Citizen developer yaklaşımıyla, **iş ekipleri fikirden çalışan sürece daha kısa sürede ulaşabilir**. Tanım odaklı modelleme, hazır task tipleri, şablon kütüphanesi ve görsel tasarım araçları (roadmap'te) iş analisti seviyesinde süreç sahipliğini mümkün kılar.

### 7. Entegrasyon Standarttır, İstisna Değil

Entegrasyon **bir istisna değil, standart** olmalıdır. Açık standartlar ve **Dapr ekosistemi** bu yüzden kritiktir:

- **Service invocation** — iç ve dış REST servislere standart çağrı
- **Pub/Sub** — olay tabanlı entegrasyon (RabbitMQ, Kafka, Redis, vb.)
- **Bindings** — input/output bağlayıcılar ile çevre sistemlerle akış
- **State store** — durum bilgisinin sağlayıcı bağımsız saklanması
- **Secrets** — credential'ların merkezi ve güvenli yönetimi

### 8. AI Çağında: Herkes Kod Yazmaz, AI ile Flow Çizer

AI çağında her ekibin sıfırdan kod yazması değil, **AI ile birlikte iş akışlarını tasarlaması** beklenir. vNext, bu paradigmayı iki temel hareketle taşır:

- **Tek kod base, çoklu uygulama** — kurum içindeki tüm süreç-yoğun uygulamalar **aynı vNext runtime'ını** paylaşır. İş mantığı her ekipte ayrı bir codebase olarak değil, **flow tanımları** olarak yaşar.
- **AI destekli tasarım** — workflow, schema ve task tanımları AI yardımıyla üretilir, doğrulanır ve iyileştirilir. Süreç sahibi "ne istediğini" anlatır; AI ona çalışan bir akış önerir.

**Neden bu kritik?**

- **Yönetilebilirlik artar** — onlarca farklı codebase yerine, **bir runtime + N flow tanımı** modeliyle merkezi yönetim
- **Operasyonel tutarlılık** — aynı altyapı, aynı izleme, aynı güvenlik tüm uygulamalarda
- **Citizen developer güçlenir** — AI, teknik olmayan kullanıcılar için doğal dil ↔ flow köprüsünü kurar
- **Geliştirme hızı** — yeni bir uygulama "yeni kod" değil, "yeni tanım"; AI ile başlangıç noktası dakikalar içinde üretilir
- **Bilgi konsolidasyonu** — kurum süreç bilgisi flow tanımlarında birikir; AI bu birikimden öğrenir

> AI burada kodu yazan değil, **flow'u çizen** ve süreç sahibiyle birlikte tasarlayan bir partnerdir. Kod yazımı platformun tek bir yerinde (runtime'da) sabitlenir; uygulama çeşitliliği tanım çeşitliliğiyle elde edilir.

## Platform Sözü

| Biz... | Bunun yerine... |
|--------|-----------------|
| İş kurallarını **konfigürasyon** olarak tanımlarız | Her kural için yeni kod yazılmasını beklemeyiz |
| Alanları **izole** tutarız | Monolitik bir yapıda herkesi sıraya sokmayız |
| Her değişikliği **versiyonlarız** | Geri dönüşü olmayan dağıtımlar yapmayız |
| Entegrasyonları **Dapr building block'larıyla** yönetiriz | Her ekibin kendi entegrasyon kodunu yazmasını beklemeyiz |
| Süreci **uçtan uca izlenebilir** kılarız | Sürecin nerede tıkandığını tahmin etmeyiz |
| İş analistini **citizen developer** olarak güçlendiririz | Her değişiklik için BT bileti açılmasını dayatmayız |
| **Cloud-native** olarak ölçekleniriz | Donanım bazlı kapasite planlamasıyla sınırlanmayız |
| **Tek kod base + N flow tanımı** modelini benimseriz | Her uygulama için ayrı codebase kurmayız |
| **AI ile flow çizmeyi** birinci sınıf yetenek sayarız | "AI çağında her ekip kendi kodunu yazsın" demeyiz |

Bu manifesto, vNext'in **ürün, mimari ve operasyon kararlarında** referans çerçevesidir.

## İlgili Bölümler

- [Problem ve Amaç](../problem-purpose/) — Hangi iş problemini çözüyoruz?
- [Değer Önerisi](../value/) — Hangi iş değerlerini üretir?
- [Yetenekler](../capabilities/) — Hangi capability'ler bu prensipleri taşır?
