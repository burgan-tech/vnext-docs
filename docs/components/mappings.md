---
sidebar_position: 3
title: Mappings
description: Kavramsal rehber — input/output haritalama, ScriptContext, ScriptResponse, ScriptBase ve örnekler
---

# Mapping (Haritalama) Rehberi

Bu doküman, workflow betikleriyle **girdi/çıktı haritalaması** yapmayı ve `ScriptContext`, `ScriptResponse`, `ScriptBase` kullanımını kavramsal olarak anlatır. Arabirim sözleşmelerinin tam listesi ve imza detayları **[Interfaces](./interfaces)** sayfasındadır.

## İçindekiler

1. [Mapping Nedir?](#mapping-nedir)
2. [Mapping Türleri](#mapping-türleri)
3. [Script Engine](#script-engine)
4. [ScriptContext Kullanımı](#scriptcontext-kullanımı)
5. [ScriptResponse Kullanımı](#scriptresponse-kullanımı)
6. [ScriptBase Kullanımı](#scriptbase-kullanımı)
   - [Secret yönetimi](#secret-yönetimi)
   - [Property yardımcıları](#property-yardımcıları)
   - [Koleksiyon ve dynamic nesne yardımcıları](#koleksiyon-ve-dynamic-nesne-yardımcıları)
   - [XML yardımcıları](#xml-yardımcıları)
   - [Loglama](#loglama)
   - [Konfigürasyon](#konfigürasyon)
7. [Implementasyon Örnekleri](#implementasyon-örnekleri)
8. [Notification Mapping](#notification-mapping)
9. [Best Practices](#best-practices)
10. [Hata Yönetimi](#hata-yönetimi)

## Mapping Nedir?

Platformda **haritalama**, görev veya akış bağlamına veri bağlamayı ifade eder: göreve **hangi verilerin** gideceğini hazırlamak, çıktının **örnek verisinde nasıl** tutulacağını düzenlemek ve gerektiğinde **geçiş (transition)** yükünü dönüştürmektir.

- **Task mapping**: Görev çalışmadan önce input/cihaz yapılandırması; sonra output işleme.
- **Subflow / subprocess**: Üst-alt akış veya bağımsız alt süreç için input (ve alt akış için output) bağlama mantığı arabirimlerle ifade edilir — detaylar için [Interfaces](./interfaces).
- **Timer / condition**: Zamanlama ve otomatik geçiş kuralları ayrı mapping türleridir — yine [Interfaces](./interfaces).

## Mapping Türleri

Haritalama temelde iki alanda yapılır:

### InputMapping

Göreve iletilecek verileri hazırlamak için kullanılır. Task çalıştırılmadan önce:

- Input verilerini dönüştürme
- Task yapılandırmasını ayarlama
- Başlık ve kimlik doğrulama bilgisi ekleme
- Doğrulama

### OutputMapping

Görevden dönen verileri işlemek için kullanılır. Task çalıştırıldıktan sonra:

- Yanıtı dönüştürme
- Instance verisiyle birleştirme
- Hata işleme
- Denetim günlükleri ve metadata

## Script Engine

Mapping betikleri [Roslyn](https://github.com/dotnet/roslyn) ile derlenir ve çalıştırılır.

### C# sürüm desteği

Mapping motoru **C# 12** özelliklerini destekler; örneğin:

- Collection expressions (`[1, 2, 3]`)
- Primary constructors
- Inline arrays
- Lambda ifadelerinde opsiyonel parametreler
- `required` üyeler

### Varsayılan using’ler

Aşağıdaki namespace’ler betiklerde otomatik kullanılabilir:

| Namespace | Açıklama |
|-----------|----------|
| `System` | Temel sistem tipleri |
| `System.Collections.Generic` | Generic koleksiyonlar |
| `System.Linq` | LINQ |
| `System.Threading.Tasks` | async/await |
| `System.Text.Json` | JSON serileştirme |

Örnek — `JsonSerializer`:

```csharp
public async Task<ScriptResponse> OutputHandler(ScriptContext context)
{
    var response = context.Body;
    var json = JsonSerializer.Serialize(response);
    var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

    return new ScriptResponse
    {
        Data = new { serialized = json }
    };
}
```

### Encoding (B64 / NAT) ve transition şemasında mapping

Betik içeriği şemada `encoding` ile belirlenir:

- **B64**: BASE64 kodlanmış kod (`location` alanı gerekebilir)
- **NAT**: Doğrudan C# kodu (`location` olmadan da kullanılabilir)

BASE64 örneği:

```json
{
  "key": "approve-order",
  "source": "pending-approval",
  "target": "approved",
  "triggerType": 0,
  "labels": [
    { "language": "tr-TR", "label": "Siparişi Onayla" }
  ],
  "mapping": {
    "location": "./OrderApprovalTransitionMapping.csx",
    "code": "dXNpbmcgU3lzdGVtLlRocmVhZGluZy5UYXNrczsKdXNpbmc...",
    "encoding": "B64"
  }
}
```

NAT örneği:

```json
{
  "key": "approve-order",
  "source": "pending-approval",
  "target": "approved",
  "triggerType": 0,
  "labels": [
    { "language": "tr-TR", "label": "Siparişi Onayla" }
  ],
  "mapping": {
    "code": "public class OrderApprovalTransitionMapping : ScriptBase, ITransitionMapping { ... }",
    "encoding": "NAT"
  }
}
```

## ScriptContext Kullanımı

`ScriptContext`, betik çalışırken elinizdeki bağlamdır: örnek, akış tanımı, geçiş, istek gövdesi/başlıkları ve tamamlanan görev yanıtları.

### Özet özellikler

```csharp
public sealed class ScriptContext
{
    public dynamic? Body { get; private set; }
    public dynamic? Headers { get; private set; }
    public dynamic? QueryParameters { get; private set; }
    public dynamic? RouteValues { get; private set; }

    public Instance Instance { get; private set; }
    public Definitions.Workflow Workflow { get; private set; }
    public Transition Transition { get; private set; }

    public IRuntimeInfoProvider Runtime { get; private set; }
    public Dictionary<string, dynamic> Definitions { get; private set; }
    public Dictionary<string, dynamic?> TaskResponse { get; private set; }
    public Dictionary<string, dynamic> MetaData { get; private set; }

    public sealed class Builder { /* ... */ }
}
```

### Body

İstek gövdesi veya göreve özgü yük dinamiktir.

```csharp
var userId = context.Body?.userId;
var amount = context.Body?.amount;
```

### Headers

Tüm başlık adları **küçük harf**e normalize edilir.

```csharp
var authorization = context.Headers?.authorization;
var contentType = context.Headers?.["content-type"];
var userAgent = context.Headers?.["user-agent"];
```

### QueryParameters

Yalnızca **Function** görevleri için anlamlıdır; dizin ile erişilir.

```csharp
var userId = context.QueryParameters?.["userId"];
var cityId = context.QueryParameters?.["cityId"];
var page = context.QueryParameters?.["page"];
```

Function görevleri için örnek sınıf (query parametrelerini okuma):

```csharp
public class FunctionTaskMapping : ScriptBase, IMapping
{
    public Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
    {
        var userId = context.QueryParameters?.["userId"];
        var cityId = context.QueryParameters?["cityId"];

        LogInformation("Function işleniyor - userId: {0}, cityId: {1}",
            args: new object?[] { userId, cityId });

        return Task.FromResult(new ScriptResponse());
    }

    public Task<ScriptResponse> OutputHandler(ScriptContext context) =>
        Task.FromResult(new ScriptResponse());
}
```

### Instance.Data

Workflow boyunca biriken veri burada tutulur; property adları **camelCase** olarak tutulur.

```csharp
var userInfo = context.Instance.Data.userInfo;
var paymentSchedule = context.Instance.Data.paymentSchedule;
var currentLogin = context.Instance.Data.login.currentLogin;
```

### TaskResponse

Tamamlanan görevlerin sonuçları; output handler’larda sık kullanılır.

```csharp
var httpTaskResult = context.TaskResponse["httpTask"];
var scriptTaskResult = context.TaskResponse["scriptTask"];
```

### CurrentTransition

Input ve transition mapping’lerde **orijinal geçiş isteğinin** gövdesi ve başlıklarına dokunmak için kullanılır (instance’a yazmadan pipeline içinde kullanım).

- **Data**: Orijinal geçiş gövdesi (`dynamic`).
- **Header**: Orijinal başlıklar (anahtarlar küçük harf).

```csharp
var transitionBody = context.CurrentTransition.Data;
var authHeader = context.CurrentTransition.Header?.authorization;
```

## ScriptResponse Kullanımı

`ScriptResponse`, mapping betiklerinden dönen standart modeldir: örnek verisine birleştirilecek yük, audit/metadata ve etiketler.

### Yapı

```csharp
public sealed class ScriptResponse
{
    public string? Key { get; set; }
    public dynamic? Data { get; set; }
    public dynamic? Headers { get; set; }
    public dynamic? RouteValues { get; set; }
    public string[] Tags { get; set; } = [];
}
```

- **Key**: Yanıtı tanımlayan anahtar
- **Data**: Birleştirilecek ana yük
- **Headers**, **RouteValues**: Bağlam göre kullanılan metadata/parametreler
- **Tags**: Etiketleme / filtreleme

### Önemli uyarılar — `ScriptResponse.Data`

> **Kritik**: `Data` **dynamic** olduğu için derleme zamanı güvenliği yoktur; null ve serileştirme davranışına dikkat edin.

1. **Tip güvenliği**

```csharp
// ❌ Karmaşık tipler sorun çıkarabilir
response.Data = new { invalidProperty = someComplexObject };

// ✅ Basit, serileştirilebilir alanlar
response.Data = new { success = true, userId = 123 };
```

2. **Null güvenliği**

```csharp
// ❌
var result = context.Body.data.result;

// ✅
var result = context.Body?.data?.result;
```

3. **Serileştirme**

```csharp
// ❌ Serileştirilmeyebilir
response.Data = new { complexObject = new SomeComplexClass() };

// ✅
response.Data = new
{
    id = obj.Id,
    name = obj.Name,
    timestamp = DateTime.UtcNow
};
```

4. **İsimlendirme — camelCase**

```csharp
// ❌ PascalCase instance birleştirmesiyle uyumsuz olabilir
response.Data = new { UserId = 123, PaymentStatus = "success" };

// ✅
response.Data = new { userId = 123, paymentStatus = "success" };
```

### Kısa kullanım

```csharp
return new ScriptResponse
{
    Data = new { success = true, userId = 123 }
};

return new ScriptResponse
{
    Data = requestData,
    Headers = new { Authorization = "Bearer " + token },
    Tags = new[] { "authentication", "success" }
};
```

## ScriptBase Kullanımı

`ScriptBase`, secret store, yapılandırma, günlük ve yardımcı metodları betiklere taşır.

### Secret yönetimi

Dapr secret store üzerinden tekil veya toplu secret okuma:

```csharp
public abstract class ScriptBase
{
    protected string GetSecret(string storeName, string secretStore, string secretKey);
    protected Task<string> GetSecretAsync(string storeName, string secretStore, string secretKey);
    protected Dictionary<string, string> GetSecrets(string storeName, string secretStore);
    protected Task<Dictionary<string, string>> GetSecretsAsync(string storeName, string secretStore);
}
```

Örnek:

```csharp
public class MyMapping : ScriptBase, IMapping
{
    public Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
    {
        var apiKey = GetSecret("dapr_store", "secret_store", "api_key");

        var httpTask = task as HttpTask;
        httpTask.SetHeaders(new Dictionary<string, string>
        {
            ["Authorization"] = $"Bearer {apiKey}"
        });

        return Task.FromResult(new ScriptResponse());
    }

    public Task<ScriptResponse> OutputHandler(ScriptContext context) =>
        Task.FromResult(new ScriptResponse());
}
```

### Property yardımcıları

```csharp
public abstract class ScriptBase
{
    protected bool HasProperty(object obj, string propertyName);
    protected static object? GetPropertyValue(object obj, string propertyName);
    protected static T? GetPropertyValue<T>(object obj, string propertyName);
    protected static T GetPropertyValue<T>(object obj, string propertyName, T defaultValue);
}
```

Örnek:

```csharp
public class SafePropertyAccessMapping : ScriptBase, IMapping
{
    public Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
    {
        if (HasProperty(context.Instance.Data, "card"))
        {
            var cardData = GetPropertyValue(context.Instance.Data, "card");
            if (HasProperty(cardData, "products"))
            {
                var productsData = GetPropertyValue(cardData, "products");
                // ...
            }
        }

        var userId = GetPropertyValue<int>(context.Instance.Data, "userId");
        var amount = GetPropertyValue<decimal>(context.Body, "amount");
        var isActive = GetPropertyValue<bool>(context.Instance.Data, "isActive");

        if (userId.HasValue && amount.HasValue)
        {
            LogInformation("Kullanıcı {0} için {1} tutarında işlem",
                args: new object?[] { userId.Value, amount.Value });
        }

        return Task.FromResult(new ScriptResponse());
    }

    public Task<ScriptResponse> OutputHandler(ScriptContext context) =>
        Task.FromResult(new ScriptResponse());
}
```

### Koleksiyon ve dynamic nesne yardımcıları

`HasProperty` / `GetPropertyValue` ile birlikte `Instance.Data` altındaki listeler için kullanılır.

| Metod | Amaç |
|--------|------|
| `CreateObject()` | `SetProperty` ile doldurulacak yeni dynamic nesne |
| `CreateList()` | Yeni boş liste |
| `SetProperty(obj, name, value)` | Özellik atama |
| `RemoveProperty(obj, name)` | Kaldırıldıysa `true` |
| `ToDictionary(obj)` | `Dictionary<string, object>` kopyası; `null` → boş sözlük |
| `GetList(instanceData, propertyName)` | İç içe veriden liste okuma |
| `AsList(value)` | Güvenli listeye normalize |
| `ListAdd`, `ListRemove`, `ListFilter`, `ListCount`, `ListAny`, `ListFirst`, `ListLast`, `ListSelect<TResult>` | Liste işlemleri |

```csharp
var items = GetList(context.Instance?.Data, "lineItems");
var active = ListFilter(items, x => x.status == "active");
var codes = ListSelect<string>(active, x => (string)x.productCode);
```

> **Önemli (CS1977):** `dynamic` kaynaktan gelen listeyi doğrudan lambda ile kullanmak derleme hatasına yol açar. Önce `AsList(...)` veya `GetList(...)` ile `List<object?>` tipine dönüştürün, ardından `ListFilter`, `ListAny` vb. çağırın.
>
> ```csharp
> // ❌ Derleme hatası — dynamic argüman + lambda aynı çağrıda
> ListAny(context.Instance.Data.items, x => x.status == "pending");
>
> // ✅ Önce listeye dönüştür
> var items = AsList(context.Instance.Data.items);
> var hasPending = ListAny(items, x => x.status == "pending");
> ```

### XML yardımcıları

SOAP Task ve XML tabanlı entegrasyonlarda ham XML verisini parse etmek veya `XmlDocument`'ı stringe çevirmek için kullanılır.

| Metod | Dönüş | Açıklama |
|-------|-------|----------|
| `ParseXml(string? xmlString)` | `XmlDocument?` | XML stringini parse eder. Boş/null input veya parse hatası durumunda `null` döner, asla fırlatmaz |
| `XmlToString(XmlDocument? xmlDoc)` | `string?` | `XmlDocument`'ı XML stringine çevirir. `null` input için `null` döner |

```csharp
public Task<ScriptResponse> OutputHandler(ScriptContext context)
{
    var rawXml = context.Body?.data?.ToString();

    var doc = ParseXml(rawXml);
    if (doc == null)
    {
        return Task.FromResult(new ScriptResponse
        {
            Key = "xml-parse-error",
            Data = new { error = "Geçersiz XML yanıtı" }
        });
    }

    var ns = new XmlNamespaceManager(doc.NameTable);
    ns.AddNamespace("soap", "http://schemas.xmlsoap.org/soap/envelope/");

    var fault = doc.SelectSingleNode("//soap:Fault", ns);
    if (fault != null)
    {
        return Task.FromResult(new ScriptResponse
        {
            Key = "soap-fault",
            Data = new { error = fault.InnerText }
        });
    }

    // Gerekirse belgeyi tekrar stringe çevir
    var resultXml = XmlToString(doc);

    return Task.FromResult(new ScriptResponse
    {
        Key = "soap-success",
        Data = new { xml = resultXml }
    });
}
```

### Loglama

Tüm log metodları çağıran dosya/satır bilgisini otomatik ekler. Parametreli mesajlarda **`args`** kullanın.

```csharp
public abstract class ScriptBase
{
    protected void LogTrace(string message, ...);
    protected void LogDebug(string message, ...);
    protected void LogInformation(string message, ...);
    protected void LogWarning(string message, ...);
    protected void LogError(string message, ...);
    protected void LogCritical(string message, ...);
}
```

```csharp
public class PaymentProcessingMapping : ScriptBase, IMapping
{
    public Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
    {
        LogInformation("Kullanıcı için ödeme işlemi başlatılıyor: {0}",
            args: new object?[] { context.Instance.Data.userId });

        try
        {
            var amount = context.Body?.amount;
            if (amount == null || amount <= 0)
            {
                LogWarning("Geçersiz ödeme tutarı alındı: {0}", args: new object?[] { amount });
                return Task.FromResult(new ScriptResponse
                {
                    Data = new { error = "Geçersiz tutar" }
                });
            }

            LogDebug("Ödeme tutarı işleniyor: {0}", args: new object?[] { amount });
            LogInformation("Ödeme başarıyla işlendi");
            return Task.FromResult(new ScriptResponse { Data = new { success = true } });
        }
        catch (Exception ex)
        {
            LogError("Ödeme işlemi başarısız oldu: {0}", args: new object?[] { ex.Message });
            throw;
        }
    }

    public Task<ScriptResponse> OutputHandler(ScriptContext context)
    {
        LogTrace("OutputHandler çağrıldı, durum kodu: {0}",
            args: new object?[] { context.Body?.statusCode });
        return Task.FromResult(new ScriptResponse());
    }
}
```

### Konfigürasyon

```csharp
public abstract class ScriptBase
{
    protected string? GetConfigValue(string key);
    protected string GetConfigValue(string key, string defaultValue);
    protected T? GetConfigValue<T>(string key);
    protected T GetConfigValue<T>(string key, T defaultValue);
    protected string? GetConnectionString(string name);
    protected bool ConfigExists(string key);
}
```

Örnek:

```csharp
public class ConfigAwareMapping : ScriptBase, IMapping
{
    public Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
    {
        var apiUrl = GetConfigValue("ExternalApi:BaseUrl");
        var timeout = GetConfigValue("ExternalApi:Timeout", "30");
        var maxRetries = GetConfigValue<int>("ExternalApi:MaxRetries", 3);
        var enableLogging = GetConfigValue<bool>("Features:EnableDetailedLogging", false);

        if (ConfigExists("ExternalApi:SecondaryUrl"))
        {
            var secondaryUrl = GetConfigValue("ExternalApi:SecondaryUrl");
            LogInformation("Secondary URL yapılandırıldı: {0}", args: new object?[] { secondaryUrl });
        }

        var dbConnection = GetConnectionString("DefaultConnection");

        if (enableLogging)
        {
            LogDebug("API URL: {0}, Timeout: {1}, Max Retries: {2}",
                args: new object?[] { apiUrl, timeout, maxRetries });
        }

        var httpTask = task as HttpTask;
        httpTask.SetUrl(apiUrl);
        httpTask.SetTimeout(int.Parse(timeout));

        return Task.FromResult(new ScriptResponse());
    }

    public Task<ScriptResponse> OutputHandler(ScriptContext context) =>
        Task.FromResult(new ScriptResponse());
}
```

Örnek `appsettings` yapısı (hiyerarşik anahtarlar `:` ile):

```json
{
  "ExternalApi": {
    "BaseUrl": "https://api.example.com",
    "Timeout": "30",
    "MaxRetries": 3,
    "SecondaryUrl": "https://backup-api.example.com"
  },
  "Features": { "EnableDetailedLogging": true },
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=mydb;..."
  }
}
```

## Implementasyon Örnekleri

Aşağıdaki sınıflar yalnızca **örnektir**; arabirim sözleşmesi için [Interfaces](./interfaces) sayfasına bakın.

### HTTP görev mapping

```csharp
public class AddToCartMapping : ScriptBase, IMapping
{
    public Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
    {
        var httpTask = task as HttpTask;
        if (httpTask == null)
            throw new ArgumentException("Task must be of type HttpTask");

        var headers = new Dictionary<string, string?>
        {
            ["Authorization"] = $"Bearer {context.Instance.Data?.login?.currentLogin?.accessToken}"
        };
        httpTask.SetHeaders(headers);

        // Örnek: ürün ekleme sonrası sepet nesnesi üretilir
        object? cartData = null;

        return Task.FromResult(new ScriptResponse
        {
            Data = new { cart = cartData }
        });
    }

    public Task<ScriptResponse> OutputHandler(ScriptContext context)
    {
        var statusCode = context.Body?.statusCode ?? 500;

        if (statusCode >= 200 && statusCode <= 300)
        {
            return Task.FromResult(new ScriptResponse
            {
                Data = new
                {
                    success = true,
                    cart = new
                    {
                        success = true,
                        id = context.Body?.data?.id,
                        products = context.Body?.data?.products
                    }
                }
            });
        }

        return Task.FromResult(new ScriptResponse { Data = new { success = false } });
    }
}
```

### Ödeme (payment) mapping

```csharp
public class ProcessPaymentMapping : IMapping
{
    public Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
    {
        var httpTask = task as HttpTask;

        var paymentRequest = new
        {
            scheduleId = context.Instance?.Data?.paymentSchedule?.scheduleId,
            userId = context.Instance?.Data?.userId,
            amount = context.Instance?.Data?.amount,
            currency = context.Instance?.Data?.currency,
            processedAt = DateTime.UtcNow
        };

        httpTask.SetBody(paymentRequest);
        httpTask.SetHeaders(new Dictionary<string, string?>
        {
            ["Content-Type"] = "application/json",
            ["X-Payment-Request-Id"] = Guid.NewGuid().ToString()
        });

        return Task.FromResult(new ScriptResponse());
    }

    public async Task<ScriptResponse> OutputHandler(ScriptContext context)
    {
        var statusCode = context.Body?.statusCode ?? 500;

        if (statusCode >= 200 && statusCode < 300)
        {
            return new ScriptResponse
            {
                Key = "payment-success",
                Data = new
                {
                    paymentResult = new
                    {
                        status = "success",
                        transactionId = context.Body?.data?.transactionId,
                        processedAt = DateTime.UtcNow
                    }
                },
                Tags = new[] { "payments", "success" }
            };
        }

        return new ScriptResponse
        {
            Key = "payment-failure",
            Data = new { error = "Payment failed" },
            Tags = new[] { "payments", "failure" }
        };
    }
}
```

### Koşul (condition) mapping

```csharp
public class AuthorizationSuccessRule : IConditionMapping
{
    public async Task<bool> Handler(ScriptContext context)
    {
        return context.Instance.Data.authentication?.success == true;
    }
}
```

### Timer mapping

```csharp
public class PaymentDueTimerRule : ITimerMapping
{
    public async Task<TimerSchedule> Handler(ScriptContext context)
    {
        try
        {
            var paymentSchedule = context.Instance.Data.paymentSchedule;
            if (paymentSchedule == null)
                return TimerSchedule.FromDuration(TimeSpan.FromDays(1));

            var frequency = paymentSchedule.frequency?.ToString().ToLower() ?? "monthly";

            return frequency switch
            {
                "daily" => TimerSchedule.FromDateTime(DateTime.UtcNow.Date.AddDays(1).AddHours(9)),
                "weekly" => TimerSchedule.FromDuration(TimeSpan.FromDays(7)),
                "monthly" => TimerSchedule.FromDuration(TimeSpan.FromDays(30)),
                "immediate" => TimerSchedule.Immediate(),
                _ => TimerSchedule.FromDuration(TimeSpan.FromDays(30))
            };
        }
        catch (Exception)
        {
            return TimerSchedule.FromDuration(TimeSpan.FromDays(1));
        }
    }
}

public class BusinessHoursTimerRule : ITimerMapping
{
    public async Task<TimerSchedule> Handler(ScriptContext context)
    {
        var now = DateTime.UtcNow;
        var isWeekend = now.DayOfWeek == DayOfWeek.Saturday || now.DayOfWeek == DayOfWeek.Sunday;
        var hour = now.Hour;

        if (isWeekend || hour < 9 || hour >= 17)
        {
            var nextBusinessDay = now.Date.AddDays(1);
            while (nextBusinessDay.DayOfWeek == DayOfWeek.Saturday
                || nextBusinessDay.DayOfWeek == DayOfWeek.Sunday)
            {
                nextBusinessDay = nextBusinessDay.AddDays(1);
            }
            return TimerSchedule.FromDateTime(nextBusinessDay.AddHours(9));
        }

        return TimerSchedule.FromDuration(TimeSpan.FromHours(1));
    }
}
```

Timer yardımcıları — özet:

```csharp
TimerSchedule.FromDateTime(DateTime.UtcNow.AddHours(2));
TimerSchedule.FromDuration(TimeSpan.FromMinutes(30));
TimerSchedule.Immediate();
```

### Transition mapping

Mapping yoksa geçiş gövdesi doğrudan instance verisine birleştirilir. Transition mapping ile dönüşümü siz kontrol edersiniz (`ITransitionMapping` — detay [Interfaces](./interfaces)).

> **Davranış Değişikliği** <sup>New</sup>: Transition mapping tanımlı olduğunda, mapping output değeri artık **transition history**'ye de yazılır. Önceki davranışta mapping output yalnızca instance data'ya aktarılırken, transition history ham (raw) payload'ı kaydediyordu. Yeni davranış ile her iki hedefte de **mapping çıktısı** kullanılır.

```csharp
public class OrderApprovalTransitionMapping : ScriptBase, ITransitionMapping
{
    public async Task<dynamic> Handler(ScriptContext context)
    {
        LogInformation("Sipariş onay transition'ı işleniyor");

        return new
        {
            approval = new
            {
                approvedBy = context.Body?.userId,
                approvedAt = DateTime.UtcNow,
                comments = context.Body?.comments ?? "Yorum yok",
                status = "approved"
            }
        };
    }
}
```

```csharp
public class PaymentTransitionMapping : ScriptBase, ITransitionMapping
{
    public async Task<dynamic> Handler(ScriptContext context)
    {
        var amount = context.Body?.amount;
        var currency = context.Body?.currency;

        if (amount == null || amount <= 0)
        {
            LogWarning("Geçersiz ödeme tutarı: {0}", args: new object?[] { amount });
            throw new ArgumentException("Geçerli tutar gereklidir");
        }

        if (string.IsNullOrEmpty(currency))
        {
            currency = "TRY";
            LogDebug("Para birimi belirtilmedi, TRY varsayılan olarak ayarlandı");
        }

        return new
        {
            payment = new
            {
                amount = decimal.Parse(amount.ToString()),
                currency = currency.ToString().ToUpper(),
                requestedAt = DateTime.UtcNow,
                status = "pending"
            }
        };
    }
}
```

Koşullu geçiş yükü:

```csharp
public class ConditionalTransitionMapping : ScriptBase, ITransitionMapping
{
    public async Task<dynamic> Handler(ScriptContext context)
    {
        var actionType = context.Body?.actionType?.ToString();
        LogDebug("İşlem tipi işleniyor: {0}", args: new object?[] { actionType });

        return actionType switch
        {
            "approve" => new { status = "approved", approvedBy = context.Body?.userId, approvedAt = DateTime.UtcNow },
            "reject" => new
            {
                status = "rejected",
                rejectedBy = context.Body?.userId,
                rejectedAt = DateTime.UtcNow,
                reason = context.Body?.reason
            },
            "defer" => new
            {
                status = "deferred",
                deferredBy = context.Body?.userId,
                deferredUntil = context.Body?.deferUntil ?? DateTime.UtcNow.AddDays(1)
            },
            _ => new { status = "pending", message = "Bilinmeyen işlem tipi" }
        };
    }
}
```

Mevcut alanları koruyarak genişletme:

```csharp
public async Task<dynamic> Handler(ScriptContext context)
{
    var existingData = context.Instance.Data;
    return new
    {
        preservedField = existingData?.preservedField,
        newField = context.Body?.newField,
        updatedAt = DateTime.UtcNow
    };
}
```

### Transition mapping için ek öneriler

1. Girdiyi doğrulayın; null ve tipleri kontrol edin.
2. Önemli adımları loglayın.
3. Riskli blokları try-catch ile sarın veya anlamlı istisna fırlatın.
4. Dönüşümde **camelCase** kullanın.
5. Ağır iş yükünden kaçının; odak veri şekillendirmedir.
6. Beklenen payload’ı kodda/yorumda kısaca dokümante edin.


### Notification mapping

Notification Task (`type: 10`) çok kanallı bildirim gönderir. Kanal bazında mesaj üretimi `INotificationMapping` ile, state kanalı metadata zenginleştirme ise opsiyonel `IStateNotificationMapping` ile yapılır. Arabirim detayları için [Interfaces](./interfaces#inotificationmapping) sayfasına bakın.

#### Kanal bazlı mesaj üretimi

`ChannelHandler` her kanal için ayrı çağrılır; `channel` parametresine göre dallanma yapılabilir:

```csharp
public class NotifyMapping : INotificationMapping
{
    public Task<NotificationMessage?> ChannelHandler(string channel, ScriptContext context)
    {
        var instance = context.Instance;

        return Task.FromResult<NotificationMessage?>(new NotificationMessage
        {
            Data = new
            {
                instanceId = instance?.Id.ToString(),
                state = instance?.CurrentState,
                channel
            },
            Metadata = new Dictionary<string, string>
            {
                ["X-Correlation-Id"] = instance?.Id.ToString() ?? string.Empty
            }
        });
    }
}
```

#### Koşullu kanal atlama

Belirli koşullarda bir kanalı atlamak için `null` döndürülür:

```csharp
public class ConditionalNotifyMapping : INotificationMapping
{
    public Task<NotificationMessage?> ChannelHandler(string channel, ScriptContext context)
    {
        var instance = context.Instance;

        if (channel == "sms" && !InstanceStatus.Completed.Equals(instance?.Status))
            return Task.FromResult<NotificationMessage?>(null);

        return Task.FromResult<NotificationMessage?>(new NotificationMessage
        {
            Data = new { instanceId = instance?.Id.ToString(), channel }
        });
    }
}
```

#### State kanalı metadata zenginleştirme

`state` kanalının verisi platform tarafından üretilir; `IStateNotificationMapping` yalnızca ek metadata eklemek için kullanılır:

```csharp
public class StateEnrichMapping : IStateNotificationMapping
{
    public Task<StateNotificationMetadata> EnrichAsync(ScriptContext context)
    {
        var headers = (IDictionary<string, object?>)context.Headers;
        var metadata = new Dictionary<string, string>();

        if (headers.TryGetValue("X-Device-Id", out var deviceId) && deviceId is not null)
            metadata["X-Device-Id"] = deviceId.ToString()!;

        if (headers.TryGetValue("X-Token-Id", out var tokenId) && tokenId is not null)
            metadata["X-Token-Id"] = tokenId.ToString()!;

        return Task.FromResult(new StateNotificationMetadata
        {
            Metadata = metadata
        });
    }
}
```

:::tip
`INotificationMapping` ve `IStateNotificationMapping` **aynı `.csx` dosyasında** tek bir sınıf içinde implement edilebilir:

```csharp
public class FullNotifyMapping : INotificationMapping, IStateNotificationMapping
{
    public Task<NotificationMessage?> ChannelHandler(string channel, ScriptContext context)
    {
        // sms, email vb. kanallar için mesaj üret
    }

    public Task<StateNotificationMetadata> EnrichAsync(ScriptContext context)
    {
        // state kanalı metadata zenginleştirme
    }
}
```
:::


## Best Practices

### Hata yakalama (örnek şablon)

```csharp
public Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
{
    try
    {
        return Task.FromResult(new ScriptResponse { Data = result });
    }
    catch (Exception ex)
    {
        return Task.FromResult(new ScriptResponse
        {
            Key = "error",
            Data = new { error = ex.Message, timestamp = DateTime.UtcNow },
            Tags = new[] { "error", "exception" }
        });
    }
}
```

### Null ve tip güvenliği

```csharp
var userId = context.Instance?.Data?.userId ?? 0;
var amount = context.Body?.amount != null ? Convert.ToDecimal(context.Body.amount) : 0m;

if (context.Instance?.Data?.paymentSchedule != null)
{
    var schedule = context.Instance.Data.paymentSchedule;
}
```

```csharp
var httpTask = task as HttpTask;
if (httpTask == null)
    throw new ArgumentException("Task must be of type HttpTask");

if (int.TryParse(context.Body?.id?.ToString(), out int id))
{
    // id kullan
}
```

### Performans — async secret

```csharp
public async Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
{
    var apiKey = await GetSecretAsync("store", "secrets", "api_key");
    // ...
}
```

### Etiketleme ve izlenebilirlik

```csharp
return new ScriptResponse
{
    Key = "operation-result",
    Data = result,
    Tags = new[] { "operation", "success", "user-" + userId }
};
```

## Hata Yönetimi

### HTTP durum kodlarına göre dallanma

```csharp
public Task<ScriptResponse> OutputHandler(ScriptContext context)
{
    var statusCode = context.Body?.statusCode ?? 500;

    return statusCode switch
    {
        >= 200 and < 300 => HandleSuccess(context),
        400 => HandleBadRequest(context),
        401 => HandleUnauthorized(context),
        404 => HandleNotFound(context),
        >= 500 => HandleServerError(context),
        _ => HandleUnknownError(context)
    };
}
```

### Yeniden deneme ipucu

```csharp
var retryCount = context.Instance?.Data?.retryCount ?? 0;
var maxRetries = context.Instance?.Data?.maxRetries ?? 3;

if (retryCount < maxRetries)
{
    return new ScriptResponse
    {
        Data = new
        {
            shouldRetry = true,
            retryCount = retryCount + 1,
            retryAfter = TimeSpan.FromMinutes(Math.Pow(2, retryCount))
        }
    };
}
```

### Toplu doğrulama

```csharp
public Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
{
    var errors = new List<string>();

    if (context.Body?.userId == null)
        errors.Add("UserId is required");

    if (context.Body?.amount == null || Convert.ToDecimal(context.Body.amount) <= 0)
        errors.Add("Valid amount is required");

    if (errors.Any())
    {
        return Task.FromResult(new ScriptResponse
        {
            Key = "validation-error",
            Data = new { errors },
            Tags = new[] { "validation", "error" }
        });
    }

    return Task.FromResult(new ScriptResponse());
}
```
