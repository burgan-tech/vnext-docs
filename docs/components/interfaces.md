---
sidebar_position: 4
title: Interfaces
description: Workflow betikleri için SDK arayüz sözleşmesi — IMapping ve türevleri ile ScriptResponse, ScriptContext modelleri
---

# Interface'ler

Platformda tanım betikleriyle çalışırken kullanılan **SDK arabirim sözleşmeleridir**. Betik motoru [.NET için Roslyn](https://github.com/dotnet/roslyn) tabanlıdır; C# sözdizimi ve ortam kuralları buna göre geçerlidir.

Kullanım örnekleri, kavramsal rehber ve pratik kalıplar için bkz. [Mappings](./mappings).

## Namespace özeti

Arayüzler ve modeller çoğunlukla `BBT.Workflow.Scripting` namespace'indedir:

```csharp
using BBT.Workflow.Definitions;
using BBT.Workflow.Definitions.Timer;
using System.Dynamic;
using System.Text.Json;
using BBT.Workflow.Instances;
using BBT.Workflow.Runtime;
namespace BBT.Workflow.Scripting;
```

`IMapping` için ek olarak `WorkflowTask` tipi `BBT.Workflow.Definitions` içindedir.

---

## IMapping

Workflow task yürütmesinde **giriş ve çıkış verisi bağlama** (input/output binding) için ana arabirimdir. Görev çalıştırılmadan önce ve sonra dönüşüm, doğrulama ve audit imkânı sağlar.

### Tanım

```csharp
public interface IMapping
{
    Task<ScriptResponse> InputHandler(
        WorkflowTask task,
        ScriptContext context);

    Task<ScriptResponse> OutputHandler(
        ScriptContext context);
}
```

### `InputHandler(WorkflowTask task, ScriptContext context)`

Task çalıştırılmadan **önce** çağrılır; girdi verisini hazırlar veya dönüştürür, audit için metadata üretebilir.

**Parametreler:**

| Parametre | Tip | Açıklama |
|---|---|---|
| `task` | `WorkflowTask` | Yürütülecek task; endpoint URL, header ve parametreler **doğrudan bu nesne üzerinde güncellenebilir**. |
| `context` | `ScriptContext` | Workflow durumu, instance verisi, header, route, çalışma zamanı bilgisi. |

**Dönüş:** `Task<ScriptResponse>` — `ScriptResponse.Data` bu bağlamda **task audit verisi** olarak kullanılır. Bkz. [`Data` alanı tablosu](#data-alanının-bağlama-göre-anlamı).

**Tipik kullanım:** dinamik endpoint üretimi, girdi doğrulama, kimlik doğrulama token'ı hazırlama, özelleştirilmiş header yapılandırması.

### `OutputHandler(ScriptContext context)`

Task tamamlandıktan **sonra** çağrılır; çıktıyı iş akışına uygun son biçime getirir.

**Parametreler:**

| Parametre | Tip | Açıklama |
|---|---|---|
| `context` | `ScriptContext` | `TaskResponse` üzerinden task sonuçları ve genel workflow durumu. |

**Dönüş:** `Task<ScriptResponse>` — instance durumuna birleştirilecek çıktı. Dönüşteki `ScriptResponse.Data` **otomatik olarak workflow instance datasına merge** edilir ve sonraki task'lar tarafından görülebilir.

### Uygulama yönergeleri

- `InputHandler` içinde `WorkflowTask` nesnesini doğrudan değiştir (konfigürasyon için).
- Her iki handler `ScriptResponse` döndürür (audit + veri yakalama).
- `OutputHandler` datası otomatik instance merge edilir.
- Durum için `ScriptContext` kullan.
- Handler'larda uygun **hata yakalama** ve **loglama** uygulanmalıdır.

---

## IOutputHandler

Bir **Function** bileşeninin `output` alanına bağlanan C# script'inde uygulanan arabirimdir. Function içindeki **tüm task'lar tamamlandıktan sonra** tek sefer çağrılır ve sonuçları `ScriptContext` üzerinden (ör. `OutputResponse` ve `TaskResponse`) **nihai function response**'ına eşler.

### Tanım

```csharp
public interface IOutputHandler
{
    Task<ScriptResponse> OutputHandler(ScriptContext context);
}
```

### `OutputHandler(ScriptContext context)`

**Parametreler:**

| Parametre | Tip | Açıklama |
|---|---|---|
| `context` | `ScriptContext` | Task sonuçları, instance datası, header'lar ve runtime bilgisi. Bireysel task çıktılarına genelde `context.OutputResponse` veya `context.TaskResponse` üzerinden erişilir. |

**Dönüş:** `Task<ScriptResponse>` — `Data` özelliği **function response gövdesi** olarak kullanılır.

### IMapping ve IOutputHandler karşılaştırması

| | `IMapping` | `IOutputHandler` |
|---|---|---|
| Bağlandığı yer | Task | Function |
| Çağrılma zamanı | Her task öncesi/sonrası | Tüm task'lar bittikten sonra (tek çağrı) |
| Metodlar | `InputHandler` + `OutputHandler` | Yalnızca `OutputHandler` |
| Amaç | Task düzeyinde veri bağlama | Function düzeyinde response şekillendirme |

---

## ISubFlowMapping

**Subflow** yürütmesi için girdi ve çıktı bağlama arabirimidir; parent iş akışından subflow'a veri aktarımı ve tamamlandığında sonucun parent instance'a merge edilmesini kapsar.

### Tanım

```csharp
public interface ISubFlowMapping
{
    Task<ScriptResponse> InputHandler(ScriptContext context);
    Task<ScriptResponse> OutputHandler(ScriptContext context);
}
```

### `InputHandler(ScriptContext context)`

Subflow **başlamadan önce** çağrılır; parent bağlamından subflow'un başlatma datasını üretir.

**Parametreler:** `context` — parent instance + state, geçerli task bağlamı, header, route, runtime.

**Dönüş:** `Task<ScriptResponse>` — oluşturma için:

- **Data:** subflow **başlangıç instance datası**
- **Key:** takip için tanımlayıcı
- **Headers**, **RouteValues**, **Tags:** subflow yürütmesi ve audit için meta bilgi

### `OutputHandler(ScriptContext context)`

Subflow **tamamlandığında** çağrılır; sonuçları parent iş akışına aktarılacak biçime dönüştürür.

**Parametreler:** `context` — tamamlanan subflow instance datası ve outcome, runtime bilgisi.

**Dönüş:** Parent'a merge edilecek işlenmiş veri (**Data** dahil); `ScriptResponse.Data` **otomatik olarak parent workflow instance'a merge** edilir.

### Subflow yürütme akışı

1. Parent workflow subflow oluşturmayı tetikler.
2. `InputHandler` subflow başlatma datasını hazırlar.
3. Subflow oluşturulur ve **bağımsız çalışır**.
4. Tamamlanınca `OutputHandler` sonuçları işler.
5. İşlenen veri parent instance'a birleştirilir.

### ISubFlowMapping ve ISubProcessMapping karşılaştırması

| | `ISubFlowMapping` | `ISubProcessMapping` |
|---|---|---|
| Senkronizasyon | Sonuç parent'a merge edilir | Fire-and-forget |
| Metodlar | `InputHandler` + `OutputHandler` | Yalnızca `InputHandler` |
| Tipik kullanım | Onay, hesaplama, doğrulama | Arka plan işi, audit, senkronizasyon |

---

## ISubProcessMapping

**Subprocess** için yalnızca başlatma (input) bağlama arabirimidir; **fire-and-forget** modelindedir — subprocess bağımsız çalışır ve **parent'a sonuç iletmez** (çıktı arabirimi yoktur).

### Tanım

```csharp
public interface ISubProcessMapping
{
    Task<ScriptResponse> InputHandler(ScriptContext context);
}
```

### `InputHandler(ScriptContext context)`

Subprocess başlamadan önce çağrılır; parent bağlamından **özerk subprocess** için gerekli tüm başlangıç verisini hazırlar.

**Parametreler:** `context` — parent instance, state, task bağlamı, header, route, runtime, kullanıcı oturumu.

**Dönüş:** subprocess oluşturma için eksiksiz `ScriptResponse` (**Data**, **Key**, **Headers**, **RouteValues**, **Tags**). Lifecycle boyunca gerekecek bilgi burada taşınmalıdır çünkü subprocess **tamamen bağımsızdır**.

**Örnek kullanım alanları:** arka planda işleme, rapor üretimi, audit/loglama, dış sistem entegrasyonu ve senkronizasyonu, bildirimler, bakım/toplu işler.

---

## ITimerMapping

**Timer task**'ları için zamanlama mantığı arabirimidir; Dapr ile uyumlu biçimde `DateTime`, süre (`Duration`) ve anında tetikleme (`Immediate`) seçeneklerini destekler. Zamanlama her zaman **belirli bir tarih/saat**'e çözümlenir.

### Tanım

```csharp
public interface ITimerMapping
{
    Task<TimerSchedule> Handler(ScriptContext context);
}
```

### `Handler(ScriptContext context)`

**Parametreler:** `context` — instance datası, workflow bilgisi, değişkenler, durum ve yürütme metadata'sı.

**Dönüş:** `Task<TimerSchedule>` — aşağıdaki fabrika metodlarıyla üretilen bir zamanlama nesnesi.

### TimerSchedule üretimi (fabrika özeti)

| Zamanlama türü | Fabrika | Kullanım |
|---|---|---|
| Mutlak zaman | `TimerSchedule.FromDateTime(DateTime)` | Belirli bir DateTime'ta tetiklenme |
| Süre | `TimerSchedule.FromDuration(TimeSpan)` | Şu andan itibaren belirtilen süre sonra |
| Anında | `TimerSchedule.Immediate()` | Hemen tetikle |

**Örnek senaryolar:** mutlak tarih, göreli gecikme, hemen çalıştırma, iş kurallarından türeyen zamanlama hesaplamaları.

---

## IConditionMapping

**Otomatik geçişlerde** (auto-transition) koşul kararı vermek için arabirimdir; bağlama göre geçişin **izin verilip verilmeyeceğini** belirler.

### Tanım

```csharp
public interface IConditionMapping
{
    Task<bool> Handler(ScriptContext context);
}
```

### `Handler(ScriptContext context)`

**Parametreler:** `context` — instance datası ve state, task sonuçları, tanım, runtime, header ve route bilgisi.

**Dönüş:** `Task<bool>`

| Değer | Anlamı |
|---|---|
| `true` | Koşul sağlandı; auto-transition tetiklenebilir |
| `false` | Koşul sağlanmadı; geçiş engellenir |

**Örnek fırlatılan özel durumlar:** `InvalidOperationException` (bağlam yetersiz/ geçersiz), `ArgumentNullException` (`context` null ise).

### Uygulama yönergeleri

- **Performanslı** olmalı (sık tetiklenebilir).
- **Durumsuz** ve **deterministik**: aynı bağlam → aynı sonuç.
- Kararı **`ScriptContext` üzerinden** verin; gereksiz **yan etki oluşturmayın** (state bozumu).
- Veri erişim hatalarını kontrollü yakalayın; hata halinde beklenen varsayılan davranışı netleştirin.

**Örnek kullanım:** veri ve iş kuralı doğrulama, zaman tabanlı koşullar, dış sistem durumu, rol/yetki kontrolleri.

---

## ITransitionMapping

Transition sırasında **özel işlem ve veri işleme** için arabirimdir; dinamik yönlendirme ve payload zenginleştirme gibi senaryolarda kullanılır.

### Tanım ve varsayılan uygulama notu

```csharp
public interface ITransitionMapping
{
    Task<dynamic> Handler(ScriptContext context)
    {
        return Task.FromResult(new { });
    }
}
```

Arabirimin `Handler` metodunda **varsayılan gövde** vardır: boş bir nesne döner. Yalnızca özel transition mantığı gerektiğinde ezmeniz gerekir; aksi halde davranış no-op'a yakındır.

### `Handler(ScriptContext context)`

**Parametreler:** `context` — geçişteki kaynak/hedef bağlamı, instance datası, runtime.

**Dönüş:** `Task<dynamic>` — geçiş sonucunda downstream task veya durumlara iletilebilir veri. Tanım **yoksa** payload çoğu senaryoda **olduğu gibi** instance datasına yazılır; mapping ile özelleştirilmiş dönüşüm, doğrulama veya süzme yapılabilir.

### ITransitionMapping ve IConditionMapping karşılaştırması

| | `ITransitionMapping` | `IConditionMapping` |
|---|---|---|
| Amaç | Geçiş sırasında **mantık/veri işlemi** | Auto-transition için **karar (evet/hayır)** |
| Dönüş | `dynamic` (veri) | `bool` (karar) |
| Varsayılan impl | Var (no-op) | Yok |
| Tetiklenme | Manuel ve otomatik transition | Yalnızca auto-transition |

**Örnek kullanım:** bildirim/audit yan etkileri, geçiş verisinin zenginleştirilmesi veya dönüşümü.

### Transition şemasında mapping alanı örneği

```json
{
  "key": "transition-name",
  "source": "source-state",
  "target": "target-state",
  "mapping": {
    "code": "BASE64_ENCODED_CSX_CONTENT",
    "location": "./TransitionMappingFile.csx"
  }
}
```

---

## Modeller

Mapping arabirimlerinin paylaştığı **`ScriptResponse`**, **`StandardTaskResponse`** ve **`ScriptContext`** tipleri.

### ScriptResponse

Mapping'lerden dönen ana response modelidir.

```csharp
public sealed class ScriptResponse
{
    public string?  Key { get; set; }
    public dynamic? Data { get; set; }
    public dynamic? Headers { get; set; }
    public dynamic? RouteValues { get; set; }
    public string[] Tags { get; set; } = [];
}
```

| Property | Tip | Açıklama |
|---|---|---|
| `Key` | `string?` | Korelasyon, önbellek ve referans için tanımlayıcı. |
| `Data` | `dynamic?` | Asıl veri; bağlama göre anlamı değişir (aşağıdaki tablo). |
| `Headers` | `dynamic?` | HTTP veya üst düzey metadata — auth token, özel alanlar. |
| `RouteValues` | `dynamic?` | Yönlendirme parametreleri. |
| `Tags` | `string[]` | Sınıflandırma/analiz için etiketler. Varsayılan `[]`. |

#### `Data` alanının bağlama göre anlamı

| Mapping bağlamı | `Data` ne anlama gelir |
|---|---|
| `IMapping.InputHandler` | Task **audit** verisi (loglama) |
| `IMapping.OutputHandler` | Instance'a **merge** edilecek veri |
| `ISubFlowMapping.InputHandler` | Subflow **başlatma** instance datası |
| `ISubFlowMapping.OutputHandler` | Parent instance'a merge edilecek **işlenmiş** subflow sonucu |
| `ISubProcessMapping.InputHandler` | Subprocess **başlatma** verisi |

### StandardTaskResponse

Task türlerinin tutarlı biçimde kullandığı standart çıktı modelidir.

```csharp
public sealed class StandardTaskResponse
{
    public dynamic? Data { get; set; }
    public int? StatusCode { get; set; }
    public bool IsSuccess { get; set; } = true;
    public string? ErrorMessage { get; set; }
    public Dictionary<string, string>? Headers { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
    public long? ExecutionDurationMs { get; set; }
    public string? TaskType { get; set; }
}
```

| Property | Tip | Açıklama |
|---|---|---|
| `Data` | `dynamic?` | Task çıktı verisi. |
| `StatusCode` | `int?` | HTTP tabanlı task'lar için. |
| `IsSuccess` | `bool` | Başarı durumu; varsayılan `true`. |
| `ErrorMessage` | `string?` | Hata mesajı. |
| `Headers` | `Dictionary<string,string>?` | Yanıt header'ları. |
| `Metadata` | `Dictionary<string,object>?` | Ek yürütme metadata'sı. |
| `ExecutionDurationMs` | `long?` | Süre (ms). |
| `TaskType` | `string?` | Örn. `HttpTask`, `ScriptTask`. |

### ScriptContext

Mapping metodlarına gelen **yürütme bağlamı**; instance, tanım, runtime, transition ve task yanıtlarını içerir.

```csharp
public sealed class ScriptContext
{
    public dynamic? Body { get; private set; }
    public dynamic? Headers { get; private set; }
    public dynamic? RouteValues { get; private set; }
    public Instance Instance { get; private set; }
    public Definitions.Workflow Workflow { get; private set; }
    public IRuntimeInfoProvider Runtime { get; private set; }
    public Transition Transition { get; private set; }
    public Dictionary<string, dynamic> Definitions { get; private set; }
    public Dictionary<string, dynamic?> TaskResponse { get; private set; } = new();
    public Dictionary<string, dynamic> MetaData { get; private set; } = new();

    public void SetBody(object? body);
    public void SetStandardResponse(StandardTaskResponse response);
}
```

#### Önemli property'ler

| Property | Açıklama |
|---|---|
| `Body` | İstek payload'ı; property adları **`camelCase`**'e normalize edilir. Transition isteği veya `StandardTaskResponse` içerebilir. |
| `Headers` | Header anahtarları **`lowercase`** normalize edilir. |
| `RouteValues` | URL path segmentleri ve query parametreleri. |
| `Instance` | Aktif workflow instance (durum, data, geçmiş). |
| `Workflow` | Workflow tanımı (state, transition, task). |
| `Runtime` | Ortam, konfigürasyon, servis keşfi. |
| `Transition` | Güncel geçiş bilgisi. |
| `Definitions` | Tekrar kullanılabilir bileşen tanımları (sözlük). |
| `TaskResponse` | Tamamlanan task'ların sonuçları (**anahtar:** camelCase task tanımlayıcısı). |
| `MetaData` | Süre/tanılama metrikleri ve özel audit datası. |
| `OutputResponse` | Bazı akışlarda ([IOutputHandler](#ioutputhandler)) function çıktı eşlemesinde toplanmış veya seçilen task çıktısına alternatif bir erişim noktası olabilir; genelde tek tek task çıktıları için `TaskResponse` kullanılır. |

#### Builder deseni

`ScriptContext` kurucusu **`private`** olduğundan oluşturma **`ScriptContext.Builder`** ile yapılır:

```csharp
var context = new ScriptContext.Builder()
    .SetWorkflow(workflow)
    .SetInstance(instance)
    .SetTransition(transition)
    .SetRuntime(runtime)
    .SetBody(body)
    .SetHeaders(headers)
    .SetRouteValues(routeValues)
    .SetDefinitions(definitions)
    .SetTaskResponse(taskResponse)
    .SetMetadata(metadata)
    .Build();
```

#### Body mutasyon API'si

- **`SetBody(object? body)`** — gövdeyi birleştirerek günceller; `null` → işlem yapılmaz.
- **`SetStandardResponse(StandardTaskResponse response)`** — standart yanıtı gövdeye merge eder.

Her iki API de iç **merge mantığını** paylaşır (`ExpandoObject` ile özyinelemeli birleştirme, `JsonElement` desteği, dizilerde birleştirme davranışı).
