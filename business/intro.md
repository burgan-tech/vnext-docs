---
slug: /intro
sidebar_position: 0
title: Business
description: vNext platformunun iş değeri — vizyon, problem-amaç, yetenekler, değer önerisi, kullanım senaryoları, iş riskleri ve terimler sözlüğü
---

# Business Documentation

Bu bölüm, vNext platformunu **iş perspektifinden** anlatır. Hedef kitle: iş birimi yöneticileri, ürün sahipleri, karar vericiler ve teknik olmayan paydaşlar.

İçerik, ürün/teknik dokümantasyondan **bağımsız ama onlarla bağlantılı** şekilde organize edilmiştir; her sayfanın altında ilgili teknik dokümanlara yönlendirme bulunur.

:::info[AI Çağı İçin Tasarım Felsefesi]

vNext, AI çağında doğru sorunun **"herkes daha hızlı kod yazsın"** değil, **"herkes kod yazmasın — AI ile flow çizsin"** olduğuna inanır.

- **Tek kod base, çoklu uygulama** — kurumdaki süreç-yoğun uygulamalar **aynı vNext runtime'ını** paylaşır; iş mantığı **flow tanımları** olarak yaşar
- **AI destekli tasarım** — süreç sahibi AI ile akışı çizer; kod yazımı platformun çekirdeğinde sabitlenir
- **Merkezi yönetim, dağıtık sahiplik** — altyapı tek noktada; iş alanları kendi süreçlerinin sahibi

> Bu felsefenin detayları için [Manifesto](./manifesto/), iş değeri için [Değer Önerisi](./value/), ürün yönü için [Ürün Yönü ve Sınırlar](/product/direction-scope/) sayfalarına bakın.

:::

## Bu Bölümde Ne Bulacaksınız?

| Bölüm | İçerik | Soru |
|-------|--------|------|
| [Manifesto](./manifesto/) | Platform vizyonu, misyonu ve temel prensipler (citizen developer, Dapr, cloud-native, ölçülebilirlik) | "Bu platform ne vaat ediyor?" |
| [Problem ve Amaç](./problem-purpose/) | Çözülen iş problemi, vNext'in iş amacı ve hedef sonuçlar | "Hangi maliyetleri azaltıyor?" |
| [Değer Önerisi](./value/) | Hız, operasyonel güven, ölçeklenebilir yürütme, yönetişim | "Neden bu platformu tercih etmeliyiz?" |
| [Yetenekler](./capabilities/) | 6 maddeli capability map: workflow tanımı/sürümleme, geçiş yürütme, görev orkestrasyonu, olay entegrasyonu, izleme/metrik, güvenlik | "Hangi problemleri çözüyor?" |
| [Kullanım Senaryoları](./industries/) | Bankacılık + genel senaryolar (başvuru, operasyonel onay, uyum/denetim, zamanlayıcı/olay otomasyonları) | "Bizim süreçlerimize nasıl uyuyor?" |
| [İş Riskleri ve Azaltım](./risks/) | Tanım karmaşıklığı, entegrasyon bağımlılığı, değişiklik etkisi, operasyonel kararlılık, uyum, sahiplik | "Hangi risklerle karşılaşırız, nasıl azaltırız?" |
| [Terimler Sözlüğü](./glossary/) | İş ↔ teknik terim eşleştirmesi (Dapr, Inbox/Outbox, Citizen Developer, SaaS, Audit Trail vb.) | "Teknik ekip ne diyor, ne demek istiyor?" |

## Hızlı Başlangıç

**Platformu tanımıyorsanız** → [Manifesto](./manifesto/) ile başlayın.

**"Hangi sorunu çözüyor?" sorusuna cevap arıyorsanız** → [Problem ve Amaç](./problem-purpose/) sayfasına bakın.

**Karar vericilere sunum hazırlıyorsanız** → [Değer Önerisi](./value/) sayfasındaki karşılaştırma tabloları işinize yarayacaktır.

**"Ne yapabiliyor?" sorusuna cevap arıyorsanız** → [Yetenekler](./capabilities/) sayfasına gidin.

**Kendi sürecinize benzer örnekler görmek istiyorsanız** → [Kullanım Senaryoları](./industries/) bölümüne bakın.

**Süreç risklerini ve nasıl yönetildiğini anlamak istiyorsanız** → [İş Riskleri ve Azaltım](./risks/) sayfasını inceleyin.

**Teknik ekiple iletişimde terimler karışıyorsa** → [Terimler Sözlüğü](./glossary/) ortak dil oluşturmanıza yardımcı olur.

## İlgili Teknik Dokümanlar

Business sayfaları teknik detaylardan arındırılmıştır. Daha derin teknik bilgi için:

- **Getting Started & Mimari**: [Architecture](/architecture/intro)
- **Bileşenler ve Implementation**: [Technical Documentation](/docs/intro)
- **Ürün Yönü, Roadmap, Personalar**: [Product Documentation](/product/intro)
- **Sürüm Notları & Breaking Changes**: [Release Notes](/blog)

:::tip[Diğer Bölümlerle İlişki]
Bu bölüm bilinçli olarak teknik jargondan arındırılmıştır. Teknik implementasyon detayları için [Technical Documentation](/docs/intro), mimari yapı için [Architecture](/architecture/intro), ürün yönü için [Product Documentation](/product/intro) bölümlerine bakabilirsiniz.
:::
