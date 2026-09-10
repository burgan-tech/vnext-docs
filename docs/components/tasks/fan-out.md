---
sidebar_position: 16
title: Fan-Out Task
description: Çalışma zamanında çözülen bir koleksiyonun her elemanı için iç task'ı paralel çalıştıran ve sonuçları tek bir yazımda birleştiren task
---

# Fan-Out Task (Type: `21`)

Fan-Out Task, instance verisinden **çalışma zamanında** bir koleksiyon çözer, referans verilen bir **iç task**'ı bu koleksiyonun her elemanı için **paralel** çalıştırır, ardından eleman bazlı sonuçları **tek bir task çıktısına** ve **tek bir instance-data yazımına** birleştirir.

Var olma sebebi, tasarım zamanında çözülemeyen paralellik ihtiyacıdır: eleman sayısı iş akışı tanımından değil **veriden** gelir — imzalanacak dokümanlar dizisi, bildirim gönderilecek alıcı listesi, mutabakatı yapılacak hesap kümesi.

:::tip[Statik paralellik için Fan-Out'a ihtiyacınız yok]
Aynı `order` değerine sahip, sayısı tanımda **sabit ve bilinen** task'lar zaten paralel çalışır (bkz. [Tasks Genel Bakış → Çalıştırma Sırası](/docs/components/tasks/)). Fan-Out'a yalnızca eleman sayısı **veriden** geldiğinde uzanın.
:::

:::info[Şema desteği v0.0.53'ten itibaren mevcut]
`@burgan-tech/vnext-schema@0.0.53` (v0.0.85'ten itibaren dağıtılan runtime imajlarıyla birlikte) sürümünden beri `task-definition.schema.json`'ın `attributes.type` enum'ı `21` değerini **tanır**; `npm run validate` fan-out task tanımlarını kabul eder. Daha eski bir şema paketi kullanan domain'lerde `npm run validate` bu tanımı reddedebilir — runtime tarafında `publish` ve çalıştırma her durumda sorunsuz çalışır.
:::

## Ne zaman kullanılmaz

- **Hedef entegrasyonun batch endpoint'i varsa.** Çağırdığınız servis N elemanı tek istekte alabiliyorsa, o tek çağrı fan-out makinesinden geçen N paralel çağrıdan hem daha ucuz hem daha tutarlıdır (N journal kaydı, N task-engine invocation'ı, N DI scope'u). Fan-Out'u hedefin gerçekten batch API'si olmadığında ya da "elemanlar" tek bir HTTP çağrısı değil, iş akışı-içi heterojen iş olduğunda (ör. eleman başına bir `SubProcess`) kullanın.
- **Bir elemanın durumu sonraki elemanı etkileyecekse.** Elemanlar eşzamanlı ve bağımsız çalışır; eleman *çalıştırmaları* arasında sıra garantisi **yoktur** (yalnızca nihai sonuç listesi index'e göre yeniden sıralanır). "Eleman 2, eleman 1'in çıktısına bağlı" bir hattı fan-out ile kurmayın.
- **Elemanlar tamamlandıkça instance verisine yazım gerekiyorsa.** Fan-Out tasarımı gereği **tek yazıcıdır** (bkz. [§ Tek yazım garantisi](#tek-yazım-garantisi-ve-eleman-handlerlarının-saflığı)). Batch bitmeden görünür olacak bir sayaç veya akan ilerleme göstergesi istiyorsanız doğru primitif bu değildir.

## Görev Tanımı

> **Schema:** `task-definition.schema.json`

```json
{
  "key": "fan-out-process-documents",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["fan-out", "parallel", "document"],
  "attributes": {
    "type": "21",
    "config": {
      "mode": "inline",
      "itemsPath": "$.documents",
      "itemAlias": "document",
      "task": {
        "key": "process-single-document",
        "domain": "core",
        "flow": "sys-tasks",
        "version": "1.0.0"
      },
      "execution": {
        "maxDegreeOfParallelism": 4,
        "itemTimeoutSeconds": 30,
        "batchTimeoutSeconds": 120
      },
      "join": {
        "policy": "allSettled",
        "resultKey": "documentResults",
        "ordered": true
      },
      "errorBoundary": {
        "onError": [
          {
            "action": "retry",
            "errorCodes": ["Task:503", "Task:429"],
            "priority": 1,
            "retryPolicy": { "maxRetries": 3, "initialDelay": "PT1S", "backoffType": "exponential", "useJitter": true }
          },
          { "action": "log", "errorCodes": ["*"], "priority": 999, "logOnly": true }
        ]
      }
    }
  }
}
```

## Konfigürasyon Alanları

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|-----------|----------|
| `mode` | string | Hayır | `"inline"` | Bu fazda **yalnızca** `"inline"` kabul edilir; başka bir değer task parse'ında hata verir. `"durable"` şemada **rezerve** edilmiştir ve parse zamanında reddedilir — ileride durable mod eklenirken şema kırılmasın diye alan şimdiden mevcuttur |
| `itemsPath` | string | Hayır* | yok | `"$."` ile başlayan **dot-path alt kümesi** (yalnızca property navigasyonu — filtre, wildcard, index, slice **yok**). `"$."` ile başlamazsa parse hatası. Mapping'in `ItemSelector`'ı ile **karşılıklı dışlayıcıdır**: ikisini birlikte vermek veya hiçbirini vermemek **çalışma zamanı** hatasıdır (executor kontrol eder, JSON şeması değil). Var olmayan bir yol (veya ara segment) **boş batch** üretir, hata değil; dizi olmayan bir değere çözülürse hata verir |
| `itemAlias` | string | Hayır | yok | Tek bir eleman için okunabilirlik etiketi (`"document"`, `"payment"`). `FanOutBatchStarted` log satırında yapısal alan, her eleman span'ında `vnext.fanout.item.alias` tag'i olarak görünür; verilmezse nötr `"item"` etiketi kullanılır. **Input binding'e hiçbir etkisi yoktur** — varsayılan binding bu değerden bağımsız olarak branch context'in ham `Body`'sini set eder |
| `task` | object | **Evet** | — | İç task referansı: `key`, `domain`, `flow`, `version` — **dördü de zorunlu**. Batch başına **bir kez** çözülür (component cache / task factory) ve eleman başına klonlanır; eleman başına yeniden çözülmez. Referans edilen task'ın tipi `21` (Fan-Out'un kendisi) ise executor batch'i hiçbir eleman çalıştırmadan reddeder |
| `execution.maxDegreeOfParallelism` | integer | Hayır | `4` | Bu batch'e özel eşzamanlılık sınırı (`SemaphoreSlim`). `>= 1` olmalıdır. Varsayılan bilinçli olarak düşüktür: sınırsız bir fan-out iç task'ın çağırdığı hedefi bunaltır |
| `execution.itemTimeoutSeconds` | integer | Hayır | `30` | Eleman başına süre sınırı. `>= 1` ve `<= batchTimeoutSeconds` olmalıdır |
| `execution.batchTimeoutSeconds` | integer | Hayır | `120` | Tüm batch için süre sınırı. `>= 1` olmalıdır. Süre dolduğunda hâlâ çalışan elemanlar iptal edilir, `FanOut:BatchTimeout` hatası ile başarısız sayılır ve `FanOutResult.TimedOut` `true` olur |
| `join.policy` | string | Hayır | `"allSettled"` | `all` / `allSettled` / `quorum` / `firstSuccess` — bkz. [§ Join Policy](#join-policy) |
| `join.minSuccess` | integer | Koşullu | yok | `policy: "quorum"` iken **zorunlu** ve `>= 1` olmalıdır; aksi hâlde parse hatası. Diğer politikalarda (bugün uyarı üretmeden) yok sayılır |
| `join.resultKey` | string | Hayır | `"fanOutResults"` | **Varsayılan çıktı paketlemesinin** eleman sonuçlarını yazdığı instance-data anahtarı. Varsayılan paketleme devredeyken geçerlidir: task hiç mapping taşımıyorsa **veya** mapping'i `OutputHandler`'ı override etmiyorsa. Mapping `OutputHandler`'ı override ettiği anda yok sayılır — çıktı, anahtarlarıyla birlikte o handler'ın verisidir |
| `join.ordered` | boolean | Hayır | `true` | İleride sonuçları tamamlanma sırasına göre akıtabilecek durable mod ile şema uyumluluğu için kabul edilir. **Inline modda no-op'tur** — sonuçlar her zaman `Index`'e göre sıralı döner ve executor bu bayrağı hiç okumaz |
| `errorBoundary` | object | Hayır | yok | Normal bir `ErrorBoundary` (`onError` kuralları: `action`, `errorCodes`/`errorTypes`, `priority`, `retryPolicy`, `logOnly`). State veya transition error boundary'sinin kullandığı **aynı** motor mekanizması ile **her elemana bağımsız** uygulanır. Retry'ı tükenmiş bir eleman sonuç kümesinde bir `Failed` kaydına dönüşür; batch'i kendi başına durdurmaz — buna join policy karar verir |

\* `itemsPath` ile mapping'in `ItemSelector`'ından **tam olarak biri** verilmelidir.

## Join Policy

Join policy, eleman bazlı sonuçların task'ın kendi başarı/başarısızlığına nasıl dönüştüğünü belirler.

| `join.policy` | Başarılı olduğu durum | Boş batch (0 eleman) |
|---|---|---|
| `all` | Her eleman başarılı **ve** batch zaman aşımına uğramadı. İlk başarısız eleman anında kalan elemanlar early-stop ile iptal edilir | **Başarılı** (vacuously — eleman yoksa başarısızlık da mümkün değildir) |
| `allSettled` | **Her zaman.** Kısmi başarısızlık hata değil, **veridir**; akış sonuç özetine göre dallanır. Batch zaman aşımına uğrasa bile başarılıdır | **Başarılı** |
| `quorum` | `succeeded >= minSuccess`, `timedOut` değerinden bağımsız | **Başarısız.** `succeeded` 0'dır ve `>= 1` olan bir eşiği asla geçemez |
| `firstSuccess` | En az bir eleman başarılı (`succeeded >= 1`); ilk başarıda kalan elemanlar early-stop ile iptal edilir. `timedOut`'tan bağımsız, yalnızca başarı sayısına bakar | **Başarısız** — `quorum` ile aynı sebeple: `firstSuccess` tanımı gereği `quorum(minSuccess=1)`'dir ve ikisi aynı girdide asla ayrışmamalıdır |

:::warning[Boş batch, eşik politikalarında başarısızdır]
`all` ve `allSettled` boş bir batch'te **başarılı** olur; `quorum` ve `firstSuccess` **başarısız** olur. Koleksiyonun boş olabildiği ve bunun normal sayıldığı bir akışta eşik politikası seçmeyin.
:::

Notlar:

- Fan-Out task'ının kendi başarı/başarısızlığı, kendi transition'ı içinde **sıradan bir task sonucudur** — başarısız bir join, iş akışının normal Task → State → Global error boundary zincirini işletir. Fan-Out bu seviyede yeni bir error-boundary kavramı getirmez.
- Başarısız bir join (`all` / `quorum` / `firstSuccess` karşılanmadı) **tüm sonuç verisini yine de** task çıktısında taşır: hangi elemanların başarısız olduğuna göre dallanan bir çağıranın, task başarısız işaretlenmiş olsa da bu veriye instance verisinde ihtiyacı vardır.
- `allSettled`'ın beklenen yaygın politika olmasının sebebi tam olarak budur: `{resultKey}Summary` değerini sonradan bir otomatik transition koşulundan inceleyebilmenizi sağlar — bkz. [§ Kısmi başarısızlıkta dallanma](#hata-kodları-ve-kısmi-başarısızlıkta-dallanma).

## `IFanOutMapping` — mapping kontratı

Diğer mapping'ler gibi authoring edilir: runtime tarafından derlenen bir `.csx` script'i, task'ın `mapping` alanından referans verilir.

```csharp
public interface IFanOutMapping
{
    // OPSİYONEL. Yalnızca itemsPath KULLANMADIĞINIZDA implement edin.
    // Varsayılan null döner = "itemsPath'i kullan".
    Task<IEnumerable<dynamic>?> ItemSelector(ScriptContext context)
        => Task.FromResult<IEnumerable<dynamic>?>(null);

    // ZORUNLU — tek abstract üye. Eleman başına bir kez, o elemanın kendi izole
    // branch context'inde çalışır. KLONLANMIŞ iç task'ı doğrudan mutasyona uğratır —
    // eleman bazlı HTTP URL'i, SOAP envelope'u vb. böyle şekillenir. Dönen
    // ScriptResponse yalnızca audit verisidir; instance verisine MERGE EDİLMEZ.
    Task<ScriptResponse> ItemInputHandler(WorkflowTask task, ScriptContext context, FanOutItem item);

    // OPSİYONEL. Batch başına TAM OLARAK BİR KEZ, tüm elemanlar sonuçlandıktan sonra
    // çağrılır. Batch'in tek yazım noktasıdır: dönen ScriptResponse.Data, Fan-Out
    // task'ının çıktısı olur ve instance verisine tek patch olarak merge edilir.
    // Varsayılan null döner = "runtime'ın varsayılan çıktı paketlemesini kullan".
    Task<ScriptResponse?> OutputHandler(ScriptContext context, FanOutResult result);
}
```

Destekleyici tipler:

```csharp
public sealed record FanOutItem(int Index, dynamic? Value, string ItemKey);

public sealed record FanOutResult(
    int Total, int Succeeded, int Failed, bool TimedOut,
    IReadOnlyList<FanOutItemResult> Items);

public sealed record FanOutItemResult(
    int Index, string ItemKey, bool IsSuccess,
    dynamic? Data, string? ErrorCode, string? ErrorMessage,
    TimeSpan Duration);
```

`FanOutItemResult` üzerinde **`Attempts` alanı yoktur** — motorun retry sayısı sonuç kümesinden yüzeye çıkmaz; deneme görünürlüğü elemanın `InstanceTask` journal kaydında ve retry span event'lerinde yaşar.

**`ItemKey` nasıl üretilir:** eleman bir nesne ise sırayla `id` string property'si, yoksa `key` string property'si, yoksa elemanın sıfır tabanlı index'i (string olarak). Bu kural, eleman `itemsPath`'ten (bir `JsonElement`) ya da `ItemSelector`'dan (`JsonElement`, `ExpandoObject`/`IDictionary<string,object?>` veya reflection ile okunan herhangi bir CLR nesnesi — ör. bir `.csx` selector'ının döndürdüğü anonim tip) gelmiş olsun **aynı** şekilde işler.

### Yalnızca ihtiyacınız olanı override edin

Üç üyeden ikisi varsayılan implementasyon taşır ve ikisinde de `null` dönüşü *"bunu override etmedim — runtime'ın davranışını kullan"* anlamına gelir:

| Üye | Vermezseniz | Ne zaman override edilir |
|---|---|---|
| `ItemSelector` | task'ın `itemsPath`'i kullanılır | koleksiyon sabit bir yoldan okunmuyor, **hesaplanıyor** ise |
| `ItemInputHandler` | *(vazgeçilemez)* | her zaman — aşağıya bakın |
| `OutputHandler` | **varsayılan çıktı paketlemesi** — hiç mapping taşımayan bir task'ın ürettiği şeklin birebir aynısı | kendi çıktı şeklinizi istiyorsanız (özet, başarısız anahtar listesi, domain'e özel bir projeksiyon) |

Kombinasyonlar serbesttir: yalnızca input bağla, yalnızca eleman seç, ikisi birlikte veya üçü birlikte. Özellikle **input binding'i override etmek varsayılan çıktıyı kaybettirmez** — yaygın durum (HTTP iç task'ı üzerinde fan-out; klonlanmış task'ın URL/body'sini yalnızca bir mapping mutasyona uğratabildiği için `ItemInputHandler` **zorunludur**) tek üyeli bir mapping'dir.

İki ayrıntı:

- **Fallback sinyali `null` bir *response*'tur, `null` bir `Data` değildir.** Çalışıp bilinçli olarak `new ScriptResponse { Data = null }` döndüren bir handler, varsayılanı "hiçbir şey" ile **değiştirir**. Yalnızca *override etmemek* (veya açıkça `null` döndürmek) varsayılan paketlemeye ulaşır.
- **Exception atan bir handler fallback yapmaz.** Batch `FanOut task output handler failed: …` ile başarısız olur ve veri yazılmaz. Orada varsayılana düşmek, akışa yazarının hiç yazmadığı ve alt mapping'lerinin beklemediği bir şekli teslim etmek olurdu.

`ItemInputHandler` bilinçli olarak istisnadır. "Override edilmedi" sinyali verebileceği bir dönüş kanalı yoktur — executor döndürdüğü response'u audit olarak tutar — bu yüzden bir varsayılan, düz `SetBody(item.Value)` binding'ini **sessizce** yapmak zorunda kalırdı. Üye adını veya imzasını `.csx` içinde yanlış yazan bir yazar, derlenen, çalışan ve iç task'ın tanımlı endpoint'ine N adet **bağlanmamış aynı** isteği gönderen bir batch elde ederdi. Üyeyi abstract tutmak bu hatayı **derleme hatasına** çevirir.

## Örnek 1 — `itemsPath` + `SubProcess` iç task'ı

Üretimdeki kullanım: bir sözleşme akışında `documents.online` altındaki her doküman için bir alt süreç (`SubProcessTask`, type `14`) başlatılır. Aşağıdaki örnek gerçek mapping'in sadeleştirilmiş hâlidir.

Task tanımı:

```json
"attributes": {
  "type": "21",
  "config": {
    "mode": "inline",
    "itemsPath": "$.documents.online",
    "itemAlias": "document",
    "task": {
      "key": "launch-online-document-subprocesses",
      "domain": "contract",
      "flow": "sys-tasks",
      "version": "1.0.0"
    },
    "execution": { "maxDegreeOfParallelism": 4, "itemTimeoutSeconds": 30, "batchTimeoutSeconds": 120 },
    "join": { "policy": "allSettled", "resultKey": "onlineLaunchResults", "ordered": true }
  }
}
```

Mapping:

```csharp title="FanOutLaunchOnlineDocumentsMapping.csx"
public class FanOutLaunchOnlineDocumentsMapping : ScriptBase, IFanOutMapping
{
    // Bir dokümanı, SubProcessTask'ın KENDİ klonuna bağlar. Instance verisine göre saftır:
    // yalnızca klonlanmış task'ı mutasyona uğratır, context'e hiç dokunmaz.
    public Task<ScriptResponse> ItemInputHandler(WorkflowTask task, ScriptContext context, FanOutItem item)
    {
        var subProcess = task as SubProcessTask;
        if (subProcess == null)
            throw new InvalidOperationException("FanOut inner task must be a SubProcessTask");

        var doc = item.Value;
        if (doc == null)
            throw new InvalidOperationException($"documents.online[{item.Index}] is null");

        subProcess.SetDomain("contract");
        subProcess.SetFlow("online-document-subprocess");

        // Deterministik anahtar: (parent instance, doküman index'i). Mükerrer bir dispatch AYNI
        // çocuğu hedefler; runtime strict idempotency ile 409 döner ve iç task'ın
        // acceptedStatusCodes:["409"] ayarı bunu başarı olarak absorbe eder.
        subProcess.SetKey($"{context.Instance.Id}-online-{item.Index}");

        subProcess.SetBody(new
        {
            document = new
            {
                code = GetPropertyValue(doc, "code")?.ToString(),
                name = GetPropertyValue(doc, "name")?.ToString()
            },
            parent = new { instanceId = context.Instance.Id.ToString() },
            subprocessIndex = item.Index
        });

        // Yalnızca audit — eleman handler'ının ScriptResponse'u instance verisine merge edilmez.
        return Task.FromResult(new ScriptResponse());
    }

    // Batch'in TEK yazımı: başlatılan her çocuğu dokümanına damgalar ve izleme listesini
    // tüm sonuç kümesinden bir kerede yeniden kurar.
    public Task<ScriptResponse?> OutputHandler(ScriptContext context, FanOutResult result)
    {
        var instanceIds = new List<string>();

        foreach (var item in result.Items)
        {
            if (!item.IsSuccess) continue;
            var childId = GetPropertyValue(item.Data, "id")?.ToString();
            if (!string.IsNullOrEmpty(childId)) instanceIds.Add(childId);
        }

        return Task.FromResult<ScriptResponse?>(new ScriptResponse
        {
            Key = "online-documents-fanned-out",
            Data = new
            {
                tracking = new
                {
                    subprocess = new
                    {
                        instanceIds = instanceIds.ToArray(),
                        onlineDispatch = new
                        {
                            total = result.Total,
                            succeeded = result.Succeeded,
                            failed = result.Failed,
                            timedOut = result.TimedOut
                        }
                    }
                }
            },
            Tags = new[] { "subprocess", "fan-out", "launched" }
        });
    }
}
```

:::tip[Tek yazım neden sadece hızdan fazlası]
Bu batch, seri bir `$self` döngüsünün yerini aldı. Eski döngü izleme listesini **başlatma başına bir kez** yazıyordu; iki yazım araya girip bir id'yi düşürebiliyordu (klasik lost-update). Fan-Out'ta tek bir yazıcı ve tek bir yazım vardır: liste tüm sonuç kümesinden bir kerede kurulur, yarışın oluşacağı pencere hiç açılmaz.
:::

## Örnek 2 — `ItemSelector` + `DirectTrigger` iç task'ı

Aynı üretim akışında, tüm alt süreçleri sonlandıran (veya zorla iptal eden) batch. Hedef listesi **hesaplanır** (online dokümanlar, sonra offline dokümanlar, sonra yalnızca izleme listesinde bulunan id'ler; tekilleştirilmiş, dizi sırası korunmuş) — bu bir `itemsPath` ile ifade edilemez, dolayısıyla `ItemSelector` üretir. `itemsPath` **verilmez**.

Task tanımı — dikkat: `itemsPath` yok, ve eleman başına error boundary var:

```json
"attributes": {
  "type": "21",
  "config": {
    "mode": "inline",
    "itemAlias": "subprocess",
    "task": {
      "key": "notify-subprocesses-finalize",
      "domain": "contract",
      "flow": "sys-tasks",
      "version": "1.0.0"
    },
    "execution": { "maxDegreeOfParallelism": 4, "itemTimeoutSeconds": 30, "batchTimeoutSeconds": 120 },
    "join": { "policy": "allSettled", "resultKey": "finalizeResults", "ordered": true },
    "errorBoundary": {
      "onError": [
        {
          "action": 3,
          "errorCodes": ["400", "404", "409", "Task:400", "Task:404", "Task:409"],
          "priority": 1
        }
      ]
    }
  }
}
```

Buradaki error boundary `Ignore` (`action: 3`) kuralıdır ve gerekçesi nettir: hâlihazırda sonlanmış, erişilemez veya kilitli bir hedef **batch'i durdurmamalıdır**. Bilinçli olarak `"*"` kuralı **yoktur** — beklenmeyen bir hata yine yüzeye çıkar ve çıktı handler'ı onu `unexpected` olarak işaretler.

Mapping:

```csharp title="FanOutFinalizeSubprocessesMapping.csx"
public class FanOutFinalizeSubprocessesMapping : ScriptBase, IFanOutMapping
{
    // Sıralı, tekilleştirilmiş hedef listesini üretir. Her eleman alt süreç id'sini `id`
    // olarak taşır — runtime'ın anahtar çıkarıcısı bu property'yi okuduğu için ItemKey
    // doğrudan instance id olur ve her log satırı, span ve kayıt bu id ile adreslenebilir.
    public Task<IEnumerable<dynamic>?> ItemSelector(ScriptContext context)
    {
        var targets = new List<dynamic>();
        var seen = new HashSet<string>();

        var documents = GetPropertyValue(context.Instance.Data, "documents");

        foreach (var listName in new[] { "online", "offline" })
        {
            if (documents == null || !HasProperty(documents, listName)) continue;

            foreach (var doc in AsList(GetPropertyValue(documents, listName)))
            {
                var id = GetPropertyValue(doc, "subprocessInstanceId")?.ToString();
                if (string.IsNullOrEmpty(id) || !seen.Add(id)) continue;

                targets.Add(new { id = id, flow = $"{listName}-document-subprocess" });
            }
        }

        return Task.FromResult<IEnumerable<dynamic>?>(targets);
    }

    // DirectTriggerTask'ın bir klonunu tek bir alt sürece yöneltir.
    public Task<ScriptResponse> ItemInputHandler(WorkflowTask task, ScriptContext context, FanOutItem item)
    {
        var trigger = task as DirectTriggerTask;
        if (trigger == null)
            throw new InvalidOperationException("FanOut inner task must be a DirectTriggerTask");

        var targetInstanceId = GetPropertyValue(item.Value, "id")?.ToString();
        if (string.IsNullOrEmpty(targetInstanceId))
            throw new InvalidOperationException($"FanOut finalize item {item.Index} has no target instance id");

        trigger.SetDomain("contract");
        trigger.SetFlow(GetPropertyValue(item.Value, "flow")?.ToString() ?? "online-document-subprocess");
        trigger.SetInstance(targetInstanceId);
        trigger.SetTransitionName("finalize-subprocess-from-parent");
        trigger.SetBody(new
        {
            parentInstanceId = context.Instance.Id.ToString(),
            finalizationTriggeredAt = DateTime.UtcNow
        });

        return Task.FromResult(new ScriptResponse());
    }

    // Batch'in TEK yazımı: dead-letter listesini GERÇEK eleman sonuçlarından türetir.
    public Task<ScriptResponse?> OutputHandler(ScriptContext context, FanOutResult result)
    {
        var skipped = new List<object>();
        var unexpected = 0;

        foreach (var item in result.Items)
        {
            if (item.IsSuccess) continue;

            // 4xx/409 beklenen, yok sayılabilir sonuçlardır. Diğer her şey beklenmeyendir ve
            // işaretlenir — çünkü allSettled ile artık kendi başına parent'ı düşürmüyor.
            var isExpected = item.ErrorCode != null &&
                             (item.ErrorCode.Contains("400") || item.ErrorCode.Contains("404") || item.ErrorCode.Contains("409"));
            if (!isExpected) unexpected++;

            skipped.Add(new
            {
                instanceId = item.ItemKey,
                errorCode = item.ErrorCode,
                unexpected = !isExpected
            });
        }

        return Task.FromResult<ScriptResponse?>(new ScriptResponse
        {
            Key = "subprocesses-finalized",
            Data = new
            {
                tracking = new
                {
                    finalize = new
                    {
                        total = result.Total,
                        notifiedCount = result.Succeeded,
                        allSubprocessesFinalized = true,
                        unexpected = unexpected,
                        skipped = skipped.ToArray()
                    }
                }
            },
            Tags = new[] { "subprocess", "fan-out", "finalized" }
        });
    }
}
```

:::tip[Bu batch'in kazandırdığı görünürlük]
Seri döngü, bir tetiklemenin başarılı olup olmadığını **göremiyordu**: cursor task'ı trigger'dan sonra çalışıyor ve `Ignore` boundary altında başarısız task'ın verisinin merge edildiğine güvenemiyordu. Bu yüzden başarıyı bir "kanıt çifti"nden çıkarsıyor ve bilinçli olarak fazla raporluyordu. Fan-Out, gerçek eleman sonucunu (`IsSuccess` + `ErrorCode`) doğrudan `OutputHandler`'a verir; dead-letter listesi **gerçekten olan** şeyden türetilir — ne fazla raporlar ne tahmin eder.
:::

## Script'siz yol ve gerçek sınırı

Mapping'i tamamen atlayabilirsiniz; koşullar:

- `itemsPath` koleksiyonu seçiyor (`ItemSelector` gerekmiyor), **ve**
- iç task ham eleman değerini branch context'in body'sinden tüketebiliyor (ör. `context.Body` okuyan bir `ScriptTask`), **ve**
- varsayılan çıktı şekli kabul edilebilir.

Mapping yoksa executor:

- **Input**: eleman başına branch context'in body'sini doğrudan set eder — `branch.SetBody(item.Value)` — ve başka hiçbir şey yapmaz. Değeri `Data.{itemAlias}` ya da başka bir alias'lı yolun altına **sarmaz**; `itemAlias` yapılandırılmış olsa bile.
- **Output**: eleman sonuçlarını `join.resultKey` altına `{ index, itemKey, isSuccess, data, errorCode, errorMessage, durationMs }` listesi olarak, ayrıca `{resultKey}Summary` nesnesini `{ total, succeeded, failed, timedOut }` olarak yazar. Bu **varsayılan paketlemedir** ve script'siz yola özel değildir — `OutputHandler`'ı override etmeyen bir mapping birebir aynı şekli aynı koddan alır.

:::warning[Gerçek sınır: `SetBody` yalnızca branch body'sini okuyan iç task'lara ulaşır]
**Kendi config'i** eleman başına değişmesi gereken task tipleri — bir `HttpTask`'ın URL'i veya şablonlu body'si, bir `SoapTask`'ın envelope'u, bir `DaprServiceTask`'ın metodu — `SetBody` tarafından **hiç şekillendirilmez**, çünkü bu alanlar script context body'sinde değil, klonlanmış task nesnesinde yaşar. Bu tür bir eleman-bazlı config mutasyonu gereken her iç task, klonlanmış `WorkflowTask`'ı doğrudan mutasyona uğratan bir `ItemInputHandler` **zorunlu kılar**.

Bu yüzden mapping yazmak size çıktı tarafında **hiçbir şeye mal olmaz**: yukarıdaki **Output** maddesi, mapping `OutputHandler`'ı override etmediği sürece koruduğunuz paketlemeyi anlatır — aynı implementasyon, aynı şekil, aynı `join.resultKey`.
:::

## Tek yazım garantisi ve eleman handler'larının saflığı

Her eleman **kendi** izole branch context'inde (`ScriptContext.CreateParallelBranch()`) ve **kendi** DI scope'unda (`IServiceScopeFactory.CreateAsyncScope()`) çalışır — statik paralel task grupları için zaten kullanılan izolasyonun aynısı; eleman başına özel bir EF `DbContext`, çünkü change tracker thread-safe değildir. Eleman **tam** task motorundan geçer: kendi retry döngüsü, kendi eleman-bazlı error boundary'si, `{fanOutTaskKey}#{index}` anahtarlı kendi `InstanceTask` journal kaydı — tek bir bayrak farkıyla: `TaskEngineExecutionOptions.SuppressDataApply = true`. Elemanın kendi çıktısının instance verisine ulaşmasını engelleyen şey bu bayraktır.

Elemanın branch context'i **atılır**, `ScriptContext.MergeParallelBranch()` ile geri birleştirilmez. Birleştirme çakışırdı: aynı iç task anahtarını paylaşan N eleman, ortak `TaskResponse` sözlüğünde duplicate-key koruyucusunu tetiklerdi. Fan-Out bu mekanizmayı bilinçli olarak kullanmaz — yerine kendi toplamını (`FanOutResult`) kurar.

:::warning[`ItemInputHandler` instance verisine göre SAF olmalıdır]
`ItemInputHandler` N kez eşzamanlı çalışır ve her biri **atılacak** bir context üzerindedir; deneyeceği herhangi bir yazım ya kaybolur ya da kardeşleriyle yarışır. Instance verisine yazmayın; elemanlar arası paylaşılan mutable state tutmayın.

`OutputHandler`, tüm batch'te dönen `ScriptResponse.Data`'sı Fan-Out task'ının gerçek çıktısı olan **tek** çağrıdır — diğer her task ile aynı standart task-çıktısı yolundan, **tam bir kez** instance verisine merge edilir. Override etmemek bunu zayıflatmaz: varsayılan paketleme, tüm elemanlar sonuçlandıktan sonra aynı tek noktada yerine geçer.

**Bir Fan-Out task çalıştırması ⇒ bir `InstanceData` patch'i**, batch büyüklüğünden bağımsız. Eleman-bazlı journal kayıtları yazımı çoğaltmadan denetim izini verir.
:::

## Eşzamanlılık ve iki seviyeli bulkhead

Sırayla alınan, birbirinden bağımsız iki sınır vardır:

1. **Batch-yerel**: `execution.maxDegreeOfParallelism` (varsayılan `4`) — bu tek batch'e scope'lu düz bir `SemaphoreSlim`.
2. **Process-genelinde**: [`Workflow:FanOut:MaxConcurrentItems`](../../configuration/workflow-execution) (varsayılan `64`) — process içindeki **her** fan-out batch'inin, her instance ve her iş akışı boyunca paylaştığı **tek** singleton `SemaphoreSlim`.

Bir elemanın efektif eşzamanlılığı `min(batch'in kalan maxDop slotları, kalan global slotlar)`'dır.

:::tip[Global bulkhead neden var: 100 instance × maxDop 5 = 500 çağrı]
Global sınır, **eşzamanlı çalışan N instance**'ın `N × maxDegreeOfParallelism` eşzamanlı alt-çağrıya çoğalmasını engeller: aynı anda `maxDegreeOfParallelism: 5` olan bir fan-out çalıştıran 100 instance, iç task'ın vurduğu hedefe **500 potansiyel eşzamanlı çağrı** demektir. Global bulkhead process-genelindeki toplamı `MaxConcurrentItems` ile sınırlar.
:::

`MaxConcurrentItems` **başlangıçta** doğrulanır (`ValidateDataAnnotations().ValidateOnStart()` + `[Range(1, int.MaxValue)]`): yanlış yapılandırılmış bir `0`, process'teki her fan-out batch'ini ilk elemanında kilitleyeceği için uygulama sessizce takılmak yerine **boot'ta başarısız olur**.

**Dağıtık / domain seviyesinde bir sınır yoktur** — bulkhead process başınadır. Dağıtık bir sayaç değerlendirilip bilinçli olarak kapsam dışı bırakıldı: her elemana bir ağ turu gecikmesi eklerdi.

## Hata kodları ve kısmi başarısızlıkta dallanma

Aşağıdaki kodlar **public bir kontrattır** — iş akışı yazarları bu string'lere çıktı handler'larında, otomatik transition koşullarında ve error-boundary kurallarında dayanabilir:

| Kod | Anlamı |
|---|---|
| `FanOut:ItemTimeout` | Eleman kendi `itemTimeoutSeconds` süresini aştı. Aşağıdaki diğer sebeplere göre **önceliklidir** — bir kardeşinin early-stop'una da yakalanmış yavaş bir eleman yine "cancelled" değil, kendi timeout'u olarak raporlanır |
| `FanOut:BatchTimeout` | Eleman, batch bütünüyle `batchTimeoutSeconds`'a takıldığı için kesildi |
| `FanOut:ItemCancelled` | Eleman join policy'nin early-stop'u ile iptal edildi — `firstSuccess` zaten başarılı oldu ya da `all` zaten başarısız oldu ve bu eleman hâlâ çalışıyordu |
| `FanOut:ItemNotStarted` | Eleman hâlâ eşzamanlılık slotu için kuyrukta beklerken iptal edildi; açıklayacak bir süre sınırı veya early-stop yok |
| `FanOut:ItemFailed` | Fallback: elemanın iç task'ı, fan-out seviyesinde daha spesifik bir kod olmadan başarısız oldu (veya exception attı) — iç task'ın kendi hata kodu varsa **değiştirilmeden** geçer |

### Önerilen kısmi başarısızlık deseni

1. `join.policy: "allSettled"` kullanın; böylece Fan-Out task'ının kendisi her zaman başarılı olur.
2. `{resultKey}Summary.{total,succeeded,failed,timedOut}` değerini instance verisine yazın (veya varsayılan çıktının yazmasına izin verin).
3. Transition'ın otomatik transition adımının ([`RunAutomaticTransitionsStep`](../../concepts/transition-pipeline), order `80`) bu özete karşı bir koşul değerlendirmesine izin verin — ör. `failed > 0` bir `partial-failure` state'ine yönlendirir, `failed == 0` mutlu yolu sürdürür.

Platform bu kararı sizin yerinize vermez; her seferinde bir iş akışı tasarım tercihidir.

## Gözlemlenebilirlik

Bir batch yavaşladığında bakılacak yerler:

### Loglar

`WorkflowLogs.cs`, EventId bloğu `101xx`:

| Log | Seviye | İçerik |
|---|---|---|
| `FanOutBatchStarted` | Information | task anahtarı, eleman sayısı, `itemAlias` (verilmezse nötr `"item"`), `maxDegreeOfParallelism`, join policy, instance id |
| `FanOutItemFailed` | Warning | başarısız eleman başına bir kez — eleman anahtarı, index, hata kodu. Başarısız eleman, join policy'nin karar vereceği kurtarılabilir bir sonuç olduğu için `Error` **değildir** |
| `FanOutBatchCompleted` | Information | total / succeeded / failed / süre |
| `FanOutBatchTimedOut` | Warning | süre sınırı kalanları kesmeden önce kaç eleman sonuçlanmıştı |
| `FanOutBulkheadSaturated` | Warning | **batch başına en fazla bir kez** — bir elemanın ilk kez batch'in kendi `maxDegreeOfParallelism`'i değil, **global** bulkhead için beklemek zorunda kalması |

### Metrikler (Prometheus)

Yalnızca **batch seviyesinde**, `task_key` ve `workflow` label'ları ile:

| Metrik | Tip | Anlamı |
|---|---|---|
| `workflow_fanout_batch_size` | histogram | batch başına eleman sayısı |
| `workflow_fanout_batch_duration_seconds` | histogram | tüm batch'in duvar saati süresi, kuyrukta bekleme dâhil |
| `workflow_fanout_item_failures_total` | counter | batch başına **bir kez**, batch'in başarısız eleman sayısı kadar artırılır (eleman başına değil) |

**Eleman-bazlı süre metriği yoktur**: bir eleman, motordan geçen tam bir task çalıştırmasıdır; süresi zaten motorun kendi genel task-süresi metriğinde, **iç task'ın kendi anahtarı** altında yakalanır. **Canlı bir eşzamanlılık/doygunluk gauge'ı da yoktur** — bulkhead baskısı yalnızca batch başına bir kez düşen `FanOutBulkheadSaturated` log satırından görünür, sürekli grafiklenebilir bir metrikten değil.

### Span'lar

`ActivitySource("BBT.Workflow.Tasks")`; **v0.0.87'den itibaren her zaman açıktır** (önceki verbose-tracing şartı — `AetherTracingRuntime.IsVerbose` — kaldırıldı). Her eleman kendi `FanOut.Item` child span'ını alır:

- Span, eleman **her iki eşzamanlılık kapısını beklemeden önce** açılır.
- Hemen `vnext.fanout.item.key`, `vnext.fanout.item.index` ve `vnext.fanout.item.alias` (yapılandırılmış `itemAlias`, verilmezse nötr `"item"`) tag'lenir.
- Slotları alındığında `vnext.fanout.item.queue_wait_ms` eklenir — böylece trace, "bulkhead arkasında kuyrukta" ile "elemanın kendisi yavaş" durumlarını **ayırt eder**.
- Span'ın görünen adı, iç motor çağrısı `Activity.Current`'ı yerinde yeniden adlandırdıktan sonra `FanOut.Item[{index}] {itemKey}` olarak yazılır; böylece N kardeş eleman trace'te aynı genel task adıyla görünmez.

:::tip[Straggler (geciken eleman) tespiti]
Bunu hesaplayan hazır bir metrik **yoktur**. Tasarımın öngördüğü desen, tek bir batch'in trace'i altındaki eleman span'larından `max(eleman süresi) / p50(eleman süresi)` oranını okumaktır — bir fan-out batch'inin toplam süresine tek en yavaş elemanı hükmeder, dolayısıyla batch uzun sürdüğünde bakılacak sayı bu orandır. Bugün bu, trace backend'inde batch'in `task.key` tag'i ve `FanOut.Item` span adıyla sorgu yapmak anlamına gelir; hazır bir PromQL serisi okumak değil.
:::

## Doğrulama

İki katmana bölünmüştür:

- **Tanım zamanı (fail-fast, `FanOutTask.Configure`)**: `mode` yalnızca `"inline"`; varsa `itemsPath` `"$."` ile başlamalı; `task` referansının dört alanı zorunlu; `maxDegreeOfParallelism >= 1`; süre sınırları pozitif ve `itemTimeoutSeconds <= batchTimeoutSeconds`; `join.policy` dört geçerli değerden biri; `quorum` için `minSuccess >= 1`.
- **Çalışma zamanı (executor preflight, bileşenler arası)**: `itemsPath` XOR `ItemSelector` kontrolü (mapping'in önce derlenmesi gerektiği için saf bir JSON-şema kuralı olamaz) ve iç içe fan-out reddi (iç task'ın çözülmüş tipini gerektirir). `WorkflowValidator` devrede **değildir** — Fan-Out config'i workflow dokümanında değil, task bileşeninin içinde yaşar.

## Yazar uyarıları

- **İç içe fan-out reddedilir.** Referans verilen iç `task` başka bir Fan-Out task'ına (type `21`) çözülüyorsa executor hiçbir eleman çalıştırmadan batch'i başarısız kılar. Bu bir stil tercihi değildir: iç içe bir batch **aynı** global bulkhead'e karşı kilitlenirdi — dış batch'in elemanları aldıkları her slotu tutarken, kendi iç elemanları ancak bir dış elemanın bırakmasıyla boşalacak bir slot için kuyrukta beklerdi.
- **`HumanTask` ve `TimerTask` iç task olarak yasaldır ama neredeyse kesinlikle yanlıştır.** İç task tipi bilinçli olarak kısıtlanmamıştır — hiçbir validator bunları reddetmez. İkisini de inline, N kez paralel çalıştırmak, fan-out'un eleman-bazlı yürütmesini sınırlı bir `itemTimeoutSeconds`/`batchTimeoutSeconds` penceresinde tamamlanmak üzere tasarlanmamış bir şeye bağlar. Yapılandırmanız engellenmez; beklediğiniz gibi çalışacak hiçbir yanı yoktur.
- **`join.ordered: false` kabul edilir ama inline modda no-op'tur.** Sonuçlar her zaman eleman index'ine göre sıralı döner. Alan, sonuçları tamamlanma sırasına göre akıtabilecek gelecekteki durable mod ile şema uyumluluğu için vardır.
- **`mode: "durable"` rezervedir ve reddedilir.** Bugün yalnızca `"inline"` parse edilir; alan şemada şimdiden var ki durable modun sonradan gelmesi kırıcı bir şema değişikliği olmasın.
- **`itemAlias` yalnızca bir raporlama etiketidir; input binding'e hiç dokunmaz.** Adını değiştirmek bir operatörün okuduğunu değiştirebilir; iç task'ın script'inin aldığını **asla** değiştirmez.

## Üretimden ölçülen kazanç

Fan-Out, bir sözleşme onay akışında seri `$self` döngülerinin yerine geçti. Eski döngü alt süreç başına bir tam state hop'u harcıyordu: her hop bir kural değerlendirmesi, bir transition kaydı, bir uzak çağrı ve kendi instance-data yazımını taşıyordu.

Başlatma döngüsünde ölçülen fark: **3 sıralı `SubProcess` başlatma (~3 sn) → tek paralel batch (~0,6 sn)**.

## İlgili

- [Tasks Genel Bakış](/docs/components/tasks/) — task türleri ve referans mekanizması
- [Trigger Task Türleri](/docs/components/tasks/trigger) — `SubProcessTask` (type `14`) ve `DirectTriggerTask` (type `12`); yukarıdaki iki örneğin iç task'ları
- [Hata Yönetimi](/docs/how-to/error-handling) — `errorBoundary` kuralları, `action` değerleri ve retry politikaları
- [Instance Data](/docs/concepts/instance-data) — task çıktılarının versiyonlanması ve patch semantiği
- [Mappings](/docs/components/mappings) — `.csx` mapping'lerin authoring edilmesi ve `ScriptContext`
- Runtime dokümanı: [fan-out-task.md (vnext)](https://github.com/burgan-tech/vnext/blob/master/docs/domain/fan-out-task.md)
- Schema kaynağı: [task-definition.schema.json (vnext-schema)](https://github.com/burgan-tech/vnext-schema/blob/master/schemas/task-definition.schema.json)
- Örnek senaryo: [`fan-out-config-matrix` (vnext-example)](https://github.com/burgan-tech/vnext-example/tree/master/core/Workflows/fan-out-config-matrix) — dört `join.policy` değeri, boş-batch kuralı, `mode: "durable"` reddi ve eleman bazlı `errorBoundary`'nin uçtan uca doğrulandığı entegrasyon senaryosu
