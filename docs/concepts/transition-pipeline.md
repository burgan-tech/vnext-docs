---
sidebar_position: 4
title: Transition Pipeline
description: Transition kabul (admission), pipeline adım sırası, profiller ve lock modeli — tek kanonik referans
---

# Transition Pipeline

Bir transition isteği üç aşamadan geçer: **admission** (kabul — kısa bir status lock altında Busy check-and-set), **pipeline** (sıralı adımların çalıştığı deterministik state machine yürütücüsü) ve **post-commit** (subflow başlatma/forward gibi commit sonrası işler). Bu sayfa, adım sırasını, trigger tipine göre değişen **profilleri**, `updateData`'nın `+Self` bileşimini, admission/lock modelini ve auto-chain yürütmesini tek yerde toplar — diğer sayfalar (workflow, resource-lock, async-sync) mekanik detay için buraya link verir.

## Adım Tablosu

Pipeline, her adımı `LifecycleOrder` değerine göre sırayla çalıştırır. **Order 9 yoktur** (eski `HandleUpdateDataPreflightStep` kaldırıldı).

| Order | Adım | Sorumluluk |
|---|---|---|
| 5 | Preflight | Cancel/exit tespiti; instance zaten tamamlanmışsa kısa devre |
| 10 | Forward to active subflow | Parent transition'ı aktif bir subflow'a forward eder. `updateData`'yı ve parent shared `$self` transition'ı **forward etmez** |
| 19 | Set Busy | Transition yürütmesi boyunca instance'ı Busy işaretler |
| 20 | Create transition | Transition attempt'i kalıcılaştırır; duplicate guard |
| 21 | Parent update-data data-only | Parent'ta açık bir SubFlow correlation varsa update data'yı kalıcılaştırır, state lifecycle/epilogue'u atlar |
| 25 | Resource lock | Business resource lock'ları alır, bırakır veya uzatır |
| 30 | OnExecute | State'ten çıkmadan önce transition task'larını çalıştırır |
| 38 | Apply timeout state | Çıkmadan önce timeout hedefini context'e uygular |
| 39 | Cancel scheduled jobs | Terk edilen state'in timer job'larını iptal eder |
| 40 | OnExit | Terk edilen state'in task'larını çalıştırır |
| 50 | Change state | Current/effective state değişikliklerini kalıcılaştırır |
| 60 | OnEntry | Hedef state'in task'larını çalıştırır |
| 70 | SubFlow | Correlation oluşturur, subflow start işini kuyruğa alır |
| 75 | Long-poll termination | State girişinden sonra durur; yapılandırıldıysa acknowledgment fallback job'ı kurar |
| 79 | Clear busy on resume | Subflow resume yolunda parent Busy durumunu temizler |
| 80 | Auto | Otomatik transition'ları değerlendirir, bir sonraki transition'ı talep eder |
| 90 | Schedule | Zamanlanmış transition'ları kuyruğa alır. Auto zaten bir sonraki transition'ı seçtiyse **atlanır** |
| 100 | Finish | Terminal instance'ları tamamlar veya iptal eder |
| 110 | Finalize | Transition kaydını tamamlar, script cache'ini temizler |
| 112 | Resolve available | Ertelenmiş Active durumunu çözer |

`StepOutcome` akış kontrolünü belirler:

- `Continue()` — bir sonraki adıma geçer.
- `Stop()` — mevcut pipeline çalışmasından çıkar.
- `SkipTo(order)` — talep edilen order'dan yeniden planlar.
- `SkipToFinalize()` — doğrudan finalizasyona atlar.
- `With(Action<PipelineDirectives>)` — tipli directive'leri mutasyona uğratır.

## Profiller

Trigger tipine göre bir **profil** seçilir; profil, ilgisiz adımları listeden çıkarır:

| Profil | Trigger | Hariç Tutulanlar |
|---|---|---|
| Manual | Manual | Yok — auto-chain ve subflow'a izin verilir |
| AutoChain | Automatic | Preflight, active-subflow forwarding, Busy işaretleme, timeout uygulama (ResourceLock yine çalışır); `AllowSubFlow=false` |
| Scheduled | Scheduled | Preflight, active-subflow forwarding; `AllowSubFlow=false` |
| Event | Event | Preflight, active-subflow forwarding; `AllowSubFlow=true` |
| ErrorBoundary | Error boundary | Preflight, active-subflow forwarding, ResourceLock; `AllowSubFlow=false`, `AllowAutoChain=true` (Auto adımı hariç tutulmaz) |

Profil seçimi, transition tanımının değil **workflow context'in** (`WorkflowExecutionContext.TriggerType`) trigger tipine göre yapılır — ikisi anlaşmazlığa düşebilir ve gelen (inbound) trigger otoritedir.

### `+Self` Bileşimi — Yalnızca `updateData` <sup>New</sup> v0.0.80

Altıncı bir profil **seçilmez**, mevcut trigger profilinin **üzerine bileşir** (`Manual+Self`, `AutoChain+Self`, …). `updateData` transition'ı için `PipelineExecutionProfile.ForSelfTarget`, state-lifecycle adımlarını temel profilin hariç tutulanlarına ekler:

| Hariç tutulan | Neden |
|---|---|
| CancelScheduledJobs (39) | State terk edilmiyor; timer'ları yıkmak onları kaybettirir |
| OnExit (40) | Hiçbir state terk edilmiyor |
| OnEntry (60) | Hiçbir state'e girilmiyor; hook'lar instance ilk geldiğinde zaten çalıştı |
| Schedule (90) | Timer'ları yeniden armak her timeout'u sıfırdan yeniden başlatır |

`ChangeState (50)` bilinçli olarak **çalışmaya devam eder** — `context.Target`'ı set eden tek adımdır ve `RunAutomaticTransitionsStep (80)` bunu okur; hariç tutulsaydı auto adımı ilk guard'ında dönerdi ve transition hiçbir şeyi ilerletmezdi. `OnExecute (30)` da çalışır — bu, state'in lifecycle'ı değil, transition'ın kendi işidir. `ChangeStateStep`, bu yolda state-change metriğini, logunu ve span event'ini bastırır (bir state'ten kendisine değişim raporlamak burada yanlış bir sinyaldir).

**Yalnızca `updateData` bu davranışı alır.** Profil adı `Manual+Self` "target"tan bahseder, "politika"dan değil — seçim `PipelineProfileResolver`'da (`TransitionExecutionContextExtensions.SkipsStateLifecycle`) yapılan bir karardır, hedefin bir özelliği değildir. `target: $self` yazan **başka herhangi bir transition** — en çok görülen örnek bir **shared transition** — trigger'ın temel profilini korur ve state'in **tam** lifecycle'ını çalıştırır: OnExit ve OnEntry ateşlenir, state'in zamanlanmış transition'ları iptal edilip yeniden armlanır. `$self` yazmak "instance'ı taşıma" demektir; "state'in hook'larını atla" demek değildir. Timer'lar için sonuç: kısa timeout'lu bir state üzerinde sık çağrılan bir `$self` shared transition, o timeout'u her çağrıda öteler.

**Yalnızca yazılan `$self` anahtar sözcüğü** bu kontrol için sayılır. Current state ile aynı olan **literal** bir hedef sayılmaz — bu eşleşme üç ayrı mekanizmanın rastlantısal sonucudur ve yalnızca birinde "state değişmedi" anlamına gelir:

- **Start** — `InstanceCommandAppService`, start transition dispatch edilmeden **önce** yeni instance'ı initial state'e ön-konumlandırır (`instance.ChangeState(initialState)`). State'in yine de girilmesi gerekir.
- **Partial commit sonrası retry** — `ChangeStateStep` `saveChanges` ile kalıcılaştırır; bu nedenle OnEntry'de fault veren bir transition, instance'ı hedef state'te commit edilmiş bırakır. Retry, tam olarak faulting olan bu adımı yeniden yapmak için vardır.
- **Gerçek bir self-loop** (`from: A, target: A`) — üç durumdan yalnızca bunda "değişmedi" anlamı doğrudur. Değişmezlik semantiğini isteyen yazarlar `$self` kullanmalıdır; bir state adı yazmak "o state'e gir" olarak okunur.

## Auto Önce, Schedule Sonra <sup>New</sup> v0.0.90

`LifecycleOrder.Auto = 80`, `LifecycleOrder.Schedule = 90` — `RunAutomaticTransitionsStep` artık `ScheduleTransitionsStep`'ten **önce** çalışır. Auto adımı bir kazanan seçtiyse (`Directives.NextTransition` doluysa), Schedule adımı **hiçbir timer armamaz** — ne Dapr job'ı, ne `InstanceJob` satırı oluşur. Önceki davranışta timer'lar armlanıp zincirin bir sonraki hop'unda `CancelScheduledJobsStep` tarafından hemen iptal ediliyordu; bu churn kaldırıldı. Kazananla zincirlenen hop fault ederse timer'lar zaten armlanmamıştır (faulted bir instance'ta işe yaramazlardı).

`ClearBusyOnResumeStep`'in sayısal değeri **79** olarak korunmuştur (`Auto - 1` şeklinde tanımlanır); subflow/long-poll resume noktaları etkilenmez.

## Admission ve Lock Modeli

**Busy bayrağı mutex'in kendisidir.** Dağıtık bir lock yalnızca status check-and-set için, milisaniyeler süren kısa bir pencerede tutulur — `StatusLockLeaseSeconds=5` lease ile. Pipeline gövdesi ve otomatik transition zinciri **lock tutulmadan** çalışır.

Kalıcı taraf ise **Postgres compare-and-set**'tir <sup>New</sup> v0.0.92: `TryTransitionStatusAsync`, `UPDATE … WHERE Status = 'A'` (Active→Busy) veya `WHERE Status = 'B'` (Busy→Active) şeklinde set-tabanlı bir CAS çalıştırır — ne aggregate yüklenir ne de ek bir transaction açılır; CAS'in kendisi, çağıranın ayrıca dağıtık status lock'u tutup tutmamasından bağımsız olarak kendi kendine yeterlidir. Bu, `InstanceBusyManager`'ın eski "aggregate yükle → kontrol et → yaz" şeklindeki read-check-write'ının yerini alır.

### Tür tablosu

| Transition tipi | Status lock | Busy check (409) | Davranış |
|---|---|---|---|
| `stateTransition` / `sharedTransition` | Tutar | **Uygular** | Busy ise 409; Active ise Busy'ye geçirilip pipeline çalıştırılır |
| `cancel` / `exit` / `timeout` | Tutar | **Muaf** | Busy 409'dan muaftır ama accept anında Busy'yi **set eder** — pipeline'da değil, accept'te (v0.0.80). Aynı lock'u diğer her tür gibi alırlar; job `IsPreReserved`'a yeniden girer ve pipeline ikinci `TakeOverAsync`'i atlar |
| `updateData` | **Tutmaz** | **Muaf** | **Lock yok, duplicate-job guard yok — hiçbir yolda** (v0.0.86). Status-neutral'dır (flip = None, serileştirilecek bir şey yok); paralel istekleri kabul etmesi **gerekir** — N eşzamanlı `updateData` accept'i aynı mantıksal job kimliğini paylaşır ama hepsi meşrudur, her biri kendi payload'ını taşır, bu yüzden guard'ın dedupe'u veri kaybettirir. Job id/name enqueue başına benzersiz olduğundan lock'suz insert çakışmaz; instance-data yazmaları downstream'de per-instance write funnel ile serileştirilir |
| Error-boundary transition | Tutar | **Muaf** (`OwnerReentry`) | Busy instance'a admitted olur, flip yapılmaz — zaten mevcut Busy ownership'i (bloklayan subflow correlation'ının kurduğu) devralır ve faulted hop'un pipeline'ını bu ownership altında devam ettirir; `stateTransition`/`sharedTransition` gibi 409 ile reddedilmez <sup>New</sup> v0.0.83 |

Scheduler arming (timer kurma) bu lock'un dışındadır (v0.0.85) — timer armlama lock almadan gerçekleşir.

:::note updateData öncesi durum
v0.0.86'dan önce updateData da accept lock'unu alıyordu; bu, N paralel notifier'ın (örn. subprocess → parent güncellemesi) parent'ın status lock'u üzerinde birbirleriyle çakışmasına ve her kaybedenin işe yaramayan bir lock için error-boundary retry backoff'u yakmasına yol açıyordu. v0.0.86, updateData'yı bu yarıştan tamamen çıkardı.
:::

Kaynak: [Kaynak Kilitleme](../how-to/resource-lock) sayfasındaki `resourceLock` (order 25) bu admission modelinden **ayrıdır** — o, transition tanımına opt-in eklenen bir business-level kilittir, admission'ın Busy-mutex'i değildir.

## Subflow Chain Reserve <sup>New</sup> v0.0.80

State function, aktif correlation zincirini gezip **en derindeki** aktif subflow'un durumunu raporlar — bir client her zaman **leaf**'i gözlemler. Bu yüzden bir parent'ın açık bir SubFlow correlation'ı olması onu o subflow'un tüm ömrü boyunca Busy yapar (by design); bir ancestor'ın Busy'si in-flight iş hakkında bilgi taşımaz.

Bir parent üzerinde **açık bir SubFlow correlation'ı varken** async bir transition kabul edilirse, accept 202 commit edilmeden **önce** `ReserveSubflowChainAsync` zinciri **leaf'e kadar** Busy işaretler (`MarkBusyWithPropagationAsync` ile — kısa-devre yapan `Try…` varyantı ile değil, çünkü o `AlreadyBusy`'de kısa devre yapar ve hiçbir zaman leaf'e ulaşmaz). Bu olmasaydı accept, leaf hâlâ `Active` okurken yanıt verir ve parent'ı long-poll eden bir client hiçbir işin sürmediği sonucuna varıp akışı sürüklemeyi bırakırdı.

Relay bu reserve'i sonra **claim etmelidir**, yoksa leaf, accept'in az önce set ettiği Busy nedeniyle isteği `Instance:100031` ile reddeder. Claim, accept → `TransitionJobPayload.SubflowChainReserved` → `ForwardToActiveSubflowStep` → `ForwardToSubflowJob` → handler zincirinde taşınır ve bilinçli olarak her job re-entry'sinde set edilen `IsPreReserved`'dan **daha dar**dır — böylece sync-kökenli veya cancel/exit/timeout kaynaklı bir relay, kendi nedenleriyle Busy olan bir leaf'i geçemez.

Cross-domain hop'lar, public transition endpoint'i yerine internal-only `POST .../internal/subflow-forward`'ı kullanır — public endpoint caller header'larını filtresiz kopyalar, bu da claim'i sahtelenebilir kılardı. Compensation (`ReleaseSubflowChainAsync`) yalnızca reserve'in flip ettiğini serbest bırakır.

**Sync yol bilinçli olarak chain-reserve yapmaz**: bloklayan bir caller bayat bir `Active` gözlemleyemez, dolayısıyla reserve yalnızca stranded-Busy riskini genişletirdi.

Subflow start ve forward çağrıları v0.0.91'den itibaren **senkron**dur (`sync=true`) — parent'ın orijinal request modundan veya `S`/`P` tipinden bağımsız olarak runtime-üretilen tüm child start/forward/retry çağrıları child'ın mevcut pipeline aktivasyonunu bir dinlenme noktasına kadar bekler (gelecekteki insan girdisini veya harici event'i beklemez).

## Auto-Chain Yürütme

Otomatik continuation'lar **her zaman inline** çalışır ve awaited edilir — per-job modu (`EnqueueContinuationStrategy` / `ContinuationMode.Enqueue`) DI'dan kaldırılmıştır ve **erişilemez**; `ContinuationDispatcher` yalnızca `InlineContinuationStrategy`'yi çözer. Bir asenkron client isteği için yalnızca **ilk kabul edilen** transition bir `flow.transition` job'ı kullanır; bu job, kesintisiz auto-chain'in **tamamını** awaited eder.

`WorkflowExecution:DirectEnqueueContinuations` bayrağı yalnızca **ilk accept**'in enqueue yolunu yönetir — doğrudan Dapr enqueue (fallback: transactional outbox) ile her zaman outbox arasında. Auto-chain'in kendisini **hiçbir zaman** etkilemez; o her zaman in-process çalışır. `TransitionPerJob` config'te kalabilir ama **inert**'tir (davranışsal etkisi yoktur, yalnızca geriye dönük uyumluluk için bind edilir).

Aynı kesintisiz pipeline/UoW içinde, her hop yeni bir `TransitionExecutionContext` alır ama önceki hop'un izlenen (tracked) `Instance` aggregate'ini ve çözülmüş `Workflow` tanımını `TransitionContextFactory.CreateFromPreloaded` ile **yeniden kullanır** — state/transition çözümü, policy validation, profile resolution ve adım yürütmesi yine de her hop için tekrar çalışır; yalnızca aggregate/definition yeniden yüklenmez. Bu yeniden kullanım, bir post-commit sınırında, yeni bir scope'ta, bir subflow callback'inde veya bir retry'de **sona erer** — bu sınırların ötesinde runtime her zaman taze, otoriter bir yükleme yapar (`CreateAsync`).

Zincir derinliği sınırı **50**'dir (aşılırsa `Transition:100017`).

## İlgili

- [Workflow → Transition Yürütme Modeli](../components/workflow) — `resourceLock` ve well-known transition davranışları
- [Kaynak Kilitleme (Resource Lock)](../how-to/resource-lock) — business-level dağıtık kilit (order 25)
- [Async / Sync Yöntemi](../how-to/async-sync) — `sync=true/false`, continuation enqueue modeli
- [Runtime Yürütme Yapılandırması](../configuration/workflow-execution)
- [Incident'lar](./incidents)
