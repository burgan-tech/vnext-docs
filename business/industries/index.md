---
sidebar_position: 3
title: Bankacılık Senaryoları
description: vNext platformunun bankacılık sektöründeki kullanım senaryoları ve workflow örnekleri
---

# Bankacılık Senaryoları

vNext platformu, sektörden bağımsız olarak iş süreçlerini dijitalleştiren genel amaçlı bir workflow platformudur. Bu bölümde, platformun bankacılık alanındaki örnek kullanım senaryoları yer almaktadır.

## Müşteri Onboarding

### Senaryo

Yeni bir müşteri dijital kanallardan (mobil/web) hesap açmak istiyor. Süreç, birden fazla sistem ile etkileşim gerektiriyor ve düzenleyici uyumluluk adımları içeriyor.

### Akış Adımları

```mermaid
graph LR
    A[Başvuru Alımı] --> B[Kimlik Doğrulama]
    B --> C[KYC Sorgusu]
    C --> D{Risk Skoru}
    D -->|Düşük Risk| E[Otomatik Onay]
    D -->|Yüksek Risk| F[Manuel İnceleme]
    E --> G[Hesap Açılışı]
    F -->|Onay| G
    F -->|Red| H[Başvuru Reddi]
    G --> I[Müşteri Bilgilendirme]
    H --> I
```

### Platform Yeteneklerinin Kullanımı

| Adım | Platform Yeteneği | Açıklama |
|------|-------------------|----------|
| Başvuru Alımı | Workflow Start | REST API üzerinden akış başlatılır |
| Kimlik Doğrulama | HTTP Task | Mernis/e-Devlet servisi çağrılır |
| KYC Sorgusu | HTTP Task | KKB/Findeks servisine bağlanılır |
| Risk Skoru | Condition Task | Skor eşik değerine göre dallanma |
| Manuel İnceleme | Timer + State | Operatöre görev atanır, süre takibi yapılır |
| Hesap Açılışı | HTTP Task | Core banking sistemine API çağrısı |
| Bilgilendirme | Notification Task | SMS/Push bildirim gönderilir |

### Kazanımlar

- **Süre**: Geleneksel 3-5 iş günü → 15 dakika (otomatik onay senaryosu)
- **Uyumluluk**: Her adım otomatik olarak loglanır (audit trail)
- **Esneklik**: Risk eşikleri konfigürasyonla değiştirilebilir, kod değişikliği gerekmez

---

## Kredi Başvuru ve Onay Süreci

### Senaryo

Bireysel veya kurumsal müşteri kredi başvurusu yapıyor. Başvuru tutarına göre farklı onay seviyeleri ve paralel kontroller gerekiyor.

### Akış Adımları

```mermaid
graph TB
    A[Kredi Başvurusu] --> B[Evrak Kontrolü]
    B --> C{Tutar Seviyesi}
    C -->|< 100K| D[Şube Onayı]
    C -->|100K - 500K| E[Bölge Onayı]
    C -->|> 500K| F[Genel Müdürlük Onayı]
    
    D --> G[Paralel Kontroller]
    E --> G
    F --> G
    
    G --> G1[Gelir Doğrulama]
    G --> G2[Teminat Değerleme]
    G --> G3[Kara Liste Kontrolü]
    
    G1 --> H{Tüm Kontroller OK?}
    G2 --> H
    G3 --> H
    
    H -->|Evet| I[Kredi Tahsis]
    H -->|Hayır| J[Başvuru İade]
    I --> K[Sözleşme & Bilgilendirme]
```

### Platform Yeteneklerinin Kullanımı

| Adım | Platform Yeteneği | Açıklama |
|------|-------------------|----------|
| Tutar Seviyesi | Condition Task | Tutar aralığına göre onay seviyesi belirlenir |
| Paralel Kontroller | Sub-Flow Task | Her kontrol bağımsız alt akış olarak çalışır |
| Gelir Doğrulama | HTTP Task | Gelir doğrulama servisine API çağrısı |
| Kara Liste | HTTP Task | Yasaklı listeler servisine sorgu |
| Zaman Aşımı | Timer Task | Onay bekleyen adımlar için süre limiti |
| Sözleşme | Script Task | Dinamik sözleşme metni üretimi |

### Kazanımlar

- **Paralel işlem**: Gelir, teminat ve kara liste kontrolleri eşzamanlı yapılır (süre %60 kısalır)
- **Esnek onay hiyerarşisi**: Tutar eşikleri konfigürasyonla ayarlanır
- **Versiyon desteği**: Yeni düzenleme geldiğinde akış güncellenir, devam eden başvurular eski kurallarla tamamlanır

---

## Ödeme ve Transfer İşlemleri

### Senaryo

Müşteri farklı kanallardan (mobil, ATM, şube) para transferi gerçekleştiriyor. Her kanaldan gelen işlem aynı iş kuralları ile yönetiliyor.

### Akış Adımları

```mermaid
graph LR
    A[Transfer Talebi] --> B[Yetki Kontrolü]
    B --> C[Bakiye Kontrolü]
    C --> D{Limit Kontrolü}
    D -->|Limit İçinde| E[İşlem Gerçekleştir]
    D -->|Limit Aşımı| F[Ek Onay İste]
    F -->|Onay| E
    F -->|Red| G[İşlem İptal]
    E --> H[Bildirim Gönder]
    E --> I[Muhasebe Kaydı]
```

### Kazanımlar

- **Kanal bağımsızlığı**: Aynı iş kuralları tüm kanallardan gelen işlemler için geçerli
- **Gerçek zamanlı**: Milisaniye düzeyinde yanıt süresi
- **Olay yayılımı**: İşlem tamamlandığında ilgili tüm sistemler (muhasebe, raporlama, bildirim) otomatik bilgilendirilir

---

## Uyumluluk ve Düzenleyici Raporlama

### Senaryo

Banka, düzenleyici kurumlara (BDDK, MASAK, SPK) periyodik raporlama yapması gerekiyor. Raporlama süreci birden fazla kaynaktan veri toplayıp konsolide ediyor.

### Akış Adımları

```mermaid
graph TB
    A[Zamanlayıcı Tetikleme] --> B[Veri Toplama]
    B --> B1[Core Banking Verileri]
    B --> B2[İşlem Kayıtları]
    B --> B3[Müşteri Verileri]
    
    B1 --> C[Veri Konsolidasyonu]
    B2 --> C
    B3 --> C
    
    C --> D[Format Dönüşümü]
    D --> E[Doğrulama Kontrolleri]
    E --> F{Hata Var mı?}
    F -->|Hayır| G[Rapor Gönderimi]
    F -->|Evet| H[Hata Bildirimi]
    G --> I[Onay Kaydı]
```

### Kazanımlar

- **Otomatik tetikleme**: Zamanlayıcı ile periyodik çalışma, insan müdahalesi gerekmez
- **Paralel veri toplama**: Farklı kaynaklardan eşzamanlı veri çekme
- **Denetim izi**: Her raporlama çalıştırmasının tam kaydı tutulur
- **Hata yönetimi**: Eksik veya hatalı veri durumunda otomatik bildirim

---

## Senaryo Özeti

| Senaryo | Temel Platform Yeteneği | İş Değeri |
|---------|------------------------|-----------|
| Müşteri Onboarding | Workflow + HTTP + Condition | Dakikalar içinde hesap açılışı |
| Kredi Onay | Sub-Flow + Timer + Condition | Paralel kontrol ile hızlı karar |
| Ödeme Transfer | Multi-Channel + PubSub | Kanal bağımsız tek kural seti |
| Düzenleyici Raporlama | Timer + Script + HTTP | Otomatik uyumluluk |

:::tip[İleri Okuma]
Her senaryonun teknik implementasyon detayları için [Technical Documentation](/docs/intro) bölümüne, mimari yapısı için [Architecture](/architecture/intro) bölümüne bakabilirsiniz.
:::
