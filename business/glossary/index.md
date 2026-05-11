---
sidebar_position: 5
title: Terimler Sözlüğü
description: vNext platform terminolojisi — iş birimi ve teknik terimler arasında eşleştirme
---

# Terimler Sözlüğü (Glossary)

Bu sözlük, vNext platformu etrafında kullanılan terimleri **iş birimi perspektifinden** açıklar ve teknik karşılıklarıyla eşleştirir. Amaç, iş birimleri ile teknik ekipler arasında ortak bir dil oluşturmaktır.

## A

### Akış (Workflow)

Bir iş sürecinin baştan sona tanımlanmış hali. Adımları, kuralları, koşulları ve entegrasyon noktalarını içerir.

| | |
|---|---|
| **İş perspektifi** | "Kredi başvuru süreci", "Müşteri onboarding akışı" |
| **Teknik karşılık** | Workflow — state machine olarak modellenmiş akış tanımı |
| **İlgili sayfa** | [Workflow](/docs/components/workflow) |

### Akış Instance'ı (Workflow Instance)

Bir akış tanımının **çalışan bir kopyası**. Her müşteri başvurusu, her transfer talebi birer instance'tır.

| | |
|---|---|
| **İş perspektifi** | "Ahmet Bey'in kredi başvurusu", "Bugünkü 147 numaralı transfer" |
| **Teknik karşılık** | Workflow Instance — benzersiz ID ile tanımlanan çalışan süreç |
| **İlgili sayfa** | [Instance Data](/docs/concepts/instance-data) |

### Alt Akış (Sub-Flow)

Bir akışın içinden başka bir akışı tetiklemesi. Karmaşık süreçleri küçük, yönetilebilir parçalara ayırır.

| | |
|---|---|
| **İş perspektifi** | "Onboarding sırasında KYC sürecini başlat" |
| **Teknik karşılık** | Sub-Flow Task, Sub-Process Task |
| **İlgili sayfa** | [ISubFlowMapping](/docs/components/interfaces#isubflowmapping) |

## D

### Domain (İş Alanı)

Platformda birbirinden bağımsız çalışan iş alanı. Her domain kendi kurallarına, verilerine ve altyapısına sahiptir.

| | |
|---|---|
| **İş perspektifi** | "Onboarding departmanı", "Ödeme sistemleri birimi" |
| **Teknik karşılık** | Domain — izole runtime + database + messaging |
| **İlgili sayfa** | [Domain Topology](/architecture/domain-model/topology) |

### Durum (State)

Bir akış instance'ının o anki bulunduğu nokta. "Onayda", "Beklemede", "Tamamlandı" gibi.

| | |
|---|---|
| **İş perspektifi** | "Başvuru şu an onayda bekliyor" |
| **Teknik karşılık** | State — workflow state machine'deki aktif düğüm |
| **İlgili sayfa** | [Workflow](/docs/components/workflow) |

### Durum Geçişi (Transition)

Bir durumdan diğerine geçiş. Belirli koşullar sağlandığında otomatik veya kullanıcı tetiklemesiyle gerçekleşir.

| | |
|---|---|
| **İş perspektifi** | "Başvuru onaylandı → sözleşme aşamasına geçti" |
| **Teknik karşılık** | Transition — state'ler arası geçiş kuralı |
| **İlgili sayfa** | [Mappings](/docs/components/mappings) |

## E

### Entegrasyon (Integration)

Platformun dış sistemlerle (core banking, bildirim, KYC vb.) bağlantı kurması.

| | |
|---|---|
| **İş perspektifi** | "KYC sorgusu yapılıyor", "SMS gönderiliyor" |
| **Teknik karşılık** | HTTP Task, DaprService Task, DaprPubSub Task |
| **İlgili sayfa** | [HTTP Task](/docs/components/tasks/http), [DaprService Task](/docs/components/tasks/dapr-service) |

### ETag (Çakışma Koruması)

Aynı veri üzerinde birden fazla kişinin eşzamanlı çalışması durumunda veri kaybını önleyen mekanizma.

| | |
|---|---|
| **İş perspektifi** | "İki operatör aynı başvuruyu aynı anda güncellemeye çalıştı — sistem ikincisini uyardı" |
| **Teknik karşılık** | ETag-based optimistic concurrency control |
| **İlgili sayfa** | [Çekirdek Prensipler](/architecture/overview/principles) |

## G

### Görev (Task)

Bir akış adımında gerçekleştirilen iş birimi. API çağrısı, karar verme, bekleme, bildirim gönderme gibi.

| | |
|---|---|
| **İş perspektifi** | "Bu adımda KYC sorgusu yapılıyor", "Müşteriye SMS atılıyor" |
| **Teknik karşılık** | Task — workflow step'te çalıştırılan işlem birimi |
| **İlgili sayfa** | [Task Types](/docs/components/tasks/) |

## K

### Koşul (Condition)

Akıştaki bir karar noktası. Veri durumuna göre farklı yollara dallanma sağlar.

| | |
|---|---|
| **İş perspektifi** | "Tutar 50.000 TL üstündeyse üst onaya git" |
| **Teknik karşılık** | Condition Task — expression evaluation ile route seçimi |
| **İlgili sayfa** | [Tasks](/docs/components/tasks/) |

### Konfigürasyon (Configuration)

İş kurallarının kod yerine ayar/tanım olarak belirlenmesi. Değişiklik için yeniden geliştirme gerekmez.

| | |
|---|---|
| **İş perspektifi** | "Onay eşiğini 50.000'den 75.000'e çıkar" — kod yazmadan |
| **Teknik karşılık** | Workflow/Task definition — JSON/YAML bazlı tanım dosyaları |

## O

### Olay (Event)

Sistemde bir şey olduğunda yayınlanan bildirim. Diğer sistemler bu olayı dinleyerek tepki verir.

| | |
|---|---|
| **İş perspektifi** | "Müşteri aktif edildi → CRM'e bildir, hoşgeldin SMS'i at" |
| **Teknik karşılık** | PubSub Event — Dapr pub/sub üzerinden yayınlanan mesaj |
| **İlgili sayfa** | [DaprPubSub Task](/docs/components/tasks/dapr-pubsub) |

## S

### Şema (Schema)

Bir akışın kullandığı veri yapısı tanımı. Hangi alanların gerekli olduğunu, veri tiplerini ve doğrulama kurallarını belirler.

| | |
|---|---|
| **İş perspektifi** | "Kredi başvurusu için TC kimlik, tutar ve vade alanları zorunlu" |
| **Teknik karşılık** | Schema — JSON Schema bazlı veri yapısı tanımı |
| **İlgili sayfa** | [Schema](/docs/components/schema) |

## V

### Versiyon (Version)

Bir akış veya bileşenin sürüm numarası. Değişiklik geçmişini takip eder ve kontrollü geçiş sağlar.

| | |
|---|---|
| **İş perspektifi** | "Eski başvurular v1 kurallarıyla, yeniler v2 kurallarıyla işleniyor" |
| **Teknik karşılık** | Semantic Versioning (MAJOR.MINOR.PATCH) |
| **İlgili sayfa** | [Versioning](/architecture/patterns/versioning) |

### Görünüm (View)

Bir akış adımında kullanıcıya gösterilecek form veya ekran tanımı.

| | |
|---|---|
| **İş perspektifi** | "Bu adımda operatör başvuru detaylarını ve onay/red butonunu görür" |
| **Teknik karşılık** | View — UI render tanımı (form alanları, butonlar, aksiyonlar) |
| **İlgili sayfa** | [View](/docs/components/view) |

## Z

### Zamanlayıcı (Timer)

Belirli bir süre bekleme veya belirli bir zamanda tetikleme mekanizması.

| | |
|---|---|
| **İş perspektifi** | "24 saat içinde cevap gelmezse hatırlat", "Her gece 02:00'de rapor çalıştır" |
| **Teknik karşılık** | Timer Task — delay veya cron bazlı scheduling |
| **İlgili sayfa** | [Tasks](/docs/components/tasks/) |

---

:::tip
Teknik detaylar için her terimin yanındaki "İlgili sayfa" linkini takip edebilirsiniz. Bu sözlük, iş birimleri ile teknik ekipler arasında iletişimi kolaylaştırmak amacıyla hazırlanmıştır.
:::
