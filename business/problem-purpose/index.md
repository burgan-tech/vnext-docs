---
sidebar_position: 2
title: Problem ve Amaç
description: vNext platformunun çözmeyi hedeflediği iş problemi ve kurumsal süreçlere getirdiği yaklaşım
---

# Problem ve Amaç

## Çözmeye Çalıştığımız Problem

Kurumsal süreçlerde workflow yönetimi genellikle aşağıdaki maliyetleri üretir:

- **Yüksek operasyonel efor** — her yeni süreç için sıfırdan kodlama, ayrı deployment hatları ve özel izleme altyapısı.
- **Değişikliklere geç cevap** — iş kuralı bir konfigürasyon değil de kod olduğu için her değişiklik analiz → geliştirme → test → deploy döngüsünü tetikler.
- **İzlenebilirlik ve denetlenebilirlik eksikliği** — adımların ne zaman, kim tarafından, hangi veriyle yürütüldüğü dağınık log/veritabanı kayıtlarına yayılır.
- **Entegrasyon parçalanması** — her dış sistem (core banking, KYC, bildirim, ödeme) için ayrı bağlayıcılar ve ayrı kontrat yönetimi.
- **Yetkinlik bağımlılığı** — süreç bilgisi belirli ekip ve kişilere kilitlenir; rotasyon ve büyüme riskleri artar.

Sonuç: süreçler kurumun **görünmeyen işletim sistemidir** ama yönetimi pahalı, değişimi yavaş ve denetimi zordur.

## vNext'in İş Amacı

vNext, bu maliyetleri azaltıp **süreç çevikliğini** artırmayı hedefler. Bunu üç temel hareketle yapar:

### 1. Süreçleri kod yerine **tanım** olarak ele alır

İş kuralları, adımlar, koşullar ve entegrasyon noktaları JSON/YAML bazlı bileşen tanımları olarak modellenir. Yeni bir süreç eklemek için yazılım geliştirme döngüsü zorunlu değildir.

### 2. Yürütmeyi **gözlemlenebilir** ve **denetlenebilir** kılar

Her adım, her geçiş, her dış çağrı otomatik olarak loglanır, metriklenir ve izlenir. Süreç sahipleri "akış şu an nerede tıkanıyor?" sorusuna anlık cevap alır.

### 3. Entegrasyonu **birinci sınıf vatandaş** olarak ele alır

REST API, mesaj kuyruğu, zamanlayıcı, state store ve sır yönetimi platform içinden Dapr building block'ları üzerinden kullanılır. Her ekip kendi adapter'ını yazmaz.

## Hangi Soruları Cevaplar?

| Soru | vNext'in Yaklaşımı |
|------|--------------------|
| "Yeni bir kredi süreci 2 hafta yerine 2 günde nasıl canlıya çıkar?" | Tanım odaklı workflow + hazır task tipleri |
| "Bir başvuru neden 48 saattir onay aşamasında bekliyor?" | Adım bazlı izleme + SLA & timer mekanizmaları |
| "Bu hafta hangi adımlar en çok zaman aldı?" | Operasyonel metrikler + persistent metric storage |
| "Yeni düzenleme geldi — hangi süreçler etkilenecek?" | Versiyonlama + bileşen bazlı etki analizi |
| "Manuel KYC kontrolünü otomatikleştirebilir miyiz?" | HTTP task + condition task + sub-flow delegasyonu |

## Hedef Sonuçlar

vNext'i benimseyen bir kurum şu sonuçları hedefler:

- **Time-to-process** dramatik düşer (haftalardan günlere)
- **Süreç başarı oranı** ve **denetim uyumu** yükselir
- **BT ↔ iş birimi etkileşimi** azalır; iş birimi kendi süreçlerinde sahiplik alır
- **Operasyonel maliyet** düşer; aynı altyapı çoklu alan için kullanılır
- **Kurumsal risk** azalır; her işlem kaydedilir ve geri alınabilir

## İlgili Bölümler

- [Manifesto](../manifesto/) — Platform vizyonu ve prensipleri
- [Değer Önerisi](../value/) — Hangi iş değerlerini üretir?
- [Yetenekler](../capabilities/) — Hangi capability'lerle bunu sağlar?
- [İş Riskleri ve Azaltım](../risks/) — Süreçte karşılaşılabilecek riskler ve azaltım stratejileri
