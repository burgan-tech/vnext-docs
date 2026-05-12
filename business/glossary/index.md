---
sidebar_position: 7
title: Terimler Sözlüğü
description: vNext platform terminolojisi — iş birimi ve teknik terimler arasında eşleştirme
---

# Terimler Sözlüğü (Glossary)

Bu sözlük, vNext platformu etrafında kullanılan terimleri **iş birimi perspektifinden** açıklar ve teknik karşılıklarıyla eşleştirir. Amaç, iş birimleri ile teknik ekipler arasında ortak bir dil oluşturmaktır.

## A

### Audit Trail (Denetim İzi)

Bir akışın her adımının, her geçişinin ve her dış çağrısının zaman damgalı kayıt altına alınması. Düzenleyici denetimlerde "kim, ne zaman, hangi veriyle?" sorularına cevap verir.

| | |
|---|---|
| **İş perspektifi** | "Geçen ay hangi başvuru hangi operatör tarafından onaylandı?" |
| **Teknik karşılık** | Audit trail — transition + task execution kayıtları |
| **İlgili sayfa** | [İş Riskleri ve Azaltım](../risks/) |

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

## B

### Breaking Change (Kırıcı Değişiklik)

Bir bileşenin yeni sürümünün, mevcut kullanıcıları veya bağımlı süreçleri etkileyecek şekilde geriye uyumsuz davranış değişikliği yapması. vNext'te bu değişiklikler resmi olarak duyurulur ve migration adımları belgelenir.

| | |
|---|---|
| **İş perspektifi** | "Yeni sürüm geldi, KKB sorgusu artık ek alan döndürüyor — eski raporlar etkilenir mi?" |
| **Teknik karşılık** | Breaking change — semantic versioning'de MAJOR sürüm artışı |
| **İlgili sayfa** | [İş Riskleri ve Azaltım](../risks/), [Release Strategy](/product/release-strategy/) |

## C

### Citizen Developer

Yazılım geliştirme arka planı olmadan veya az kod yazarak iş süreçleri inşa edebilen kişi. Tipik olarak iş analisti, süreç sahibi, operasyon uzmanı. vNext'in tanım-odaklı modeli bu rolü güçlendirmek için tasarlanmıştır.

| | |
|---|---|
| **İş perspektifi** | "Kredi onay eşiğini değiştirmek için BT bileti açmama gerek yok" |
| **Teknik karşılık** | Low-code persona — workflow/task definition'larıyla doğrudan çalışan kullanıcı |
| **İlgili sayfa** | [Manifesto](../manifesto/), [Ürün Yönü ve Sınırlar](/product/direction-scope/) |

### Cloud-Native

Uygulamaların başlangıçtan itibaren bulut ortamı (konteyner, orkestrasyon, mikroservis, dağıtık veri) için tasarlanması yaklaşımı. vNext cloud-native bir SaaS olarak tasarlanmıştır.

| | |
|---|---|
| **İş perspektifi** | "Ülke bazlı bölgesel kurulum, yük arttığında otomatik büyüme" |
| **Teknik karşılık** | Cloud-native — konteynerleştirilmiş, ölçeklenebilir, dağıtık mimari |
| **İlgili sayfa** | [Manifesto](../manifesto/) |

## D

### Dapr (Distributed Application Runtime)

Mikroservis uygulamaları için **building block** sağlayan açık kaynaklı runtime. vNext, dış sistem entegrasyonunu Dapr building block'ları üzerinden standartlaştırır: service invocation, pub/sub, bindings, state store, secrets.

| | |
|---|---|
| **İş perspektifi** | "RabbitMQ'dan Kafka'ya geçmek istiyoruz, süreçlerimizi yeniden yazmamız gerekir mi?" → Hayır |
| **Teknik karşılık** | Dapr — sidecar bazlı, sağlayıcı agnostik distributed runtime |
| **İlgili sayfa** | [Yetenekler](../capabilities/) |

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

### Execution API

vNext'in iç görev yürütümünden sorumlu API host'u. Task invoker'ları, background processing ve uzun süren işler bu servis üzerinde koşar.

| | |
|---|---|
| **İş perspektifi** | "Onay aşamasındayken sistem hangi servisi çağırıyor?" |
| **Teknik karşılık** | BBT.Workflow.Execution.HttpApi.Host |
| **İlgili sayfa** | [Architecture](/architecture/intro) |

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

## F

### Function (Fonksiyon)

Birden fazla workflow'da yeniden kullanılabilen, ortak iş mantığı parçası. Hesaplama, validasyon ve dönüşüm gibi yardımcı işler için kullanılır.

| | |
|---|---|
| **İş perspektifi** | "TC kimlik doğrulama mantığı tüm akışlarda aynı çalışsın" |
| **Teknik karşılık** | Function definition — workflow'ların `functions` dizisinde tanımlanır |
| **İlgili sayfa** | [Architecture](/architecture/intro) |

## G

### Görev (Task)

Bir akış adımında gerçekleştirilen iş birimi. API çağrısı, karar verme, bekleme, bildirim gönderme gibi.

| | |
|---|---|
| **İş perspektifi** | "Bu adımda KYC sorgusu yapılıyor", "Müşteriye SMS atılıyor" |
| **Teknik karşılık** | Task — workflow step'te çalıştırılan işlem birimi |
| **İlgili sayfa** | [Task Types](/docs/components/tasks/) |

## I

### Inbox / Outbox Pattern

Olayların (event) ve mesajların kayıpsız ve tam-bir-kez işlenmesi için kullanılan dağıtık sistem deseni. **Outbox**: yayınlanacak mesajlar kalıcı saklanır ve worker tarafından gönderilir. **Inbox**: alınan olaylar idempotent olarak işlenir.

| | |
|---|---|
| **İş perspektifi** | "Sistem çökse bile yayınlanacak müşteri bildirimleri kaybolmasın" |
| **Teknik karşılık** | Inbox/Outbox workers — `BBT.Workflow.Workers.Inbox/Outbox` |
| **İlgili sayfa** | [Değer Önerisi](../value/), [İş Riskleri ve Azaltım](../risks/) |

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

## M

### Multi-Tenant (Çok Kiracılı)

Tek bir platform örneğinin birden fazla müşteri/organizasyon (tenant) tarafından izole şekilde kullanılması. vNext SaaS hedefinde multi-tenant mimari benimser; verileri ve runtime'ları tenant bazında ayrıştırır.

| | |
|---|---|
| **İş perspektifi** | "Aynı vNext örneği farklı bankaları/şirketleri ayrı ayrı barındırabilir" |
| **Teknik karşılık** | Multi-tenant — multi-schema, domain izolasyonu |
| **İlgili sayfa** | [Ürün Yönü ve Sınırlar](/product/direction-scope/) |

## O

### Olay (Event)

Sistemde bir şey olduğunda yayınlanan bildirim. Diğer sistemler bu olayı dinleyerek tepki verir.

| | |
|---|---|
| **İş perspektifi** | "Müşteri aktif edildi → CRM'e bildir, hoşgeldin SMS'i at" |
| **Teknik karşılık** | PubSub Event — Dapr pub/sub üzerinden yayınlanan mesaj |
| **İlgili sayfa** | [DaprPubSub Task](/docs/components/tasks/dapr-pubsub) |

### OpenTelemetry

Distributed tracing, structured logging ve metrics için açık standart. vNext bileşenleri arasında uçtan uca takibi sağlayan korelasyon altyapısıdır.

| | |
|---|---|
| **İş perspektifi** | "Müşteri başvurusu hangi servisten geçti, hangi adımda yavaşladı?" |
| **Teknik karşılık** | OpenTelemetry — traces, logs, metrics standardı |
| **İlgili sayfa** | [Yetenekler](../capabilities/) |

### Orchestration API

vNext'in istemci-yönlü (client-facing) API host'u. Workflow başlatma, instance sorgulama, transition tetikleme gibi operasyonlar bu servis üzerinden yapılır.

| | |
|---|---|
| **İş perspektifi** | "Mobil uygulamadan başvuru başlatmak için hangi servise gidiyoruz?" |
| **Teknik karşılık** | BBT.Workflow.Orchestration.HttpApi.Host |
| **İlgili sayfa** | [Architecture](/architecture/intro) |

## R

### Release Notes

Her sürümle yayımlanan, eklenen/değişen/kaldırılan özelliklerin ve migration notlarının yer aldığı dokümantasyon. vNext'te her sürüm için release notes standardı önerilir.

| | |
|---|---|
| **İş perspektifi** | "Bu sürümde benim için kritik değişiklik var mı?" |
| **Teknik karşılık** | Release notes — semver ile uyumlu sürüm dokümantasyonu |
| **İlgili sayfa** | [Release Strategy](/product/release-strategy/), [Blog / Release Notes](/blog) |

### Retry Policy

Geçici hatalarda işlemin idempotent şekilde belirli bir strateji (exponential backoff, sabit gecikme, sınır sayı vb.) ile yeniden denenmesi.

| | |
|---|---|
| **İş perspektifi** | "KKB anlık cevap vermedi; sistem otomatik tekrar deneyecek mi?" |
| **Teknik karşılık** | Retry policy — task ve worker düzeyinde tanımlı |
| **İlgili sayfa** | [Değer Önerisi](../value/) |

## S

### SaaS (Software-as-a-Service)

Yazılımın bir ürün olarak değil, abonelik bazlı bir servis olarak sunulması. vNext'in cloud-native SaaS hedefi, self-service onboarding ve kullanım bazlı ölçeği içerir.

| | |
|---|---|
| **İş perspektifi** | "Sunucu/bakım yükü olmadan vNext'i nasıl kullanırız?" |
| **Teknik karşılık** | SaaS — multi-tenant, abonelik, self-service |
| **İlgili sayfa** | [Ürün Yönü ve Sınırlar](/product/direction-scope/) |

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
