---
sidebar_position: 9
title: SOAP Task
description: SOAP 1.1 ve 1.2 web servis çağrısı yapan task
---

# SOAP Task (Type: `16`)

SOAP Task, SOAP 1.1 veya 1.2 protokolüyle web servis endpoint'lerine istek gönderen görev türüdür. Body, SOAP envelope şablonlarını desteklemek amacıyla `JsonElement` yerine ham XML string olarak saklanır.

## Görev Tanımı

> **Schema:** `task-definition.schema.json`

```json
{
  "key": "get-customer-soap",
  "version": "1.0.0",
  "domain": "core",
  "flow": "sys-tasks",
  "flowVersion": "1.0.0",
  "tags": ["core", "soap", "customer"],
  "attributes": {
    "type": "16",
    "config": {
      "url": "https://api.example.com/services/CustomerService",
      "soapAction": "http://example.com/GetCustomer",
      "soapVersion": "1.1",
      "body": "<soapenv:Envelope xmlns:soapenv=\"http://schemas.xmlsoap.org/soap/envelope/\"><soapenv:Body><GetCustomer><customerId>{customerId}</customerId></GetCustomer></soapenv:Body></soapenv:Envelope>",
      "headers": {
        "Authorization": "Bearer {token}"
      },
      "timeoutSeconds": 30,
      "validateSsl": true,
      "acceptedStatusCodes": ["500"]
    }
  }
}
```

## Konfigürasyon Alanları

| Alan | Tip | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|------------|----------|
| `url` | string | **Evet** | — | Hedef SOAP endpoint URL |
| `soapAction` | string | **Evet** | — | SOAPAction değeri. SOAP 1.1'de HTTP header olarak gönderilir; SOAP 1.2'de `Content-Type` action parametresine eklenir |
| `soapVersion` | string | Hayır | `"1.1"` | SOAP protokol versiyonu: `"1.1"` veya `"1.2"` |
| `body` | string | Hayır | null | Ham XML string olarak SOAP envelope şablonu |
| `headers` | object | Hayır | null | Ek HTTP header'ları (örn. `Authorization`) |
| `timeoutSeconds` | integer | Hayır | `30` | İstek timeout süresi (saniye) |
| `validateSsl` | boolean | Hayır | `true` | Sunucu SSL sertifikası doğrulaması |
| `acceptedStatusCodes` | string[] | Hayır | — | Başarılı kabul edilecek HTTP hata kodları. SOAP fault yanıtları genellikle HTTP 500 üzerinden gelir; `["500"]` tipik kullanımdır. Exact kod (`"500"`) ve wildcard (`"5xx"`, `"50x"`) destekler |

:::info SOAP Versiyonları
| Versiyon | Content-Type | SOAPAction |
|----------|-------------|------------|
| `1.1` | `text/xml; charset=utf-8` | Ayrı HTTP header (`SOAPAction: "..."`) |
| `1.2` | `application/soap+xml; charset=utf-8; action="..."` | Content-Type içine gömülür |
:::

:::note XML escaping (v0.0.62)
SOAP mapping çalışma bağlamı `System.Security` assembly'sini varsayılan olarak referans eder ve envelope'a yerleştirilen değerlerde XML özel karakterleri (`<`, `>`, `&`, `"`, `'`) varsayılan olarak escape edilir. Bu, daha önce `CS0012` derleme hatasına yol açan ve escaping'in tutarsız uygulandığı senaryoları giderir.
:::

## Property Erişimi

Mapping içinde `SoapTask` sınıfı üzerinden erişilebilir property'ler ve setter metodları:

| Property | Setter Metodu | Açıklama |
|----------|---------------|----------|
| `Url` | `SetUrl(string url)` | Hedef URL'i değiştirir |
| `Body` | `SetBody(string? body)` | Ham XML string olarak body set eder |
| `Body` | `SetBody(XmlDocument? xmlDoc)` | `XmlDocument`'dan outer XML alarak body set eder |
| `SoapAction` | `SetSoapAction(string soapAction)` | SOAPAction değerini değiştirir |
| `Headers` | `SetHeaders(Dictionary<string, string?> headers)` | Tüm header'ları set eder |
| — | `AddHeader(string key, string? value)` | Tekil header ekler / günceller |
| — | `RemoveHeader(string key)` | Tekil header kaldırır |
| `SoapVersion` | Read-only | Tanım dosyasında ayarlanır |
| `TimeoutSeconds` | Read-only | Tanım dosyasında ayarlanır |
| `ValidateSSL` | Read-only | Tanım dosyasında ayarlanır |
| `AcceptedStatusCodes` | Read-only | Tanım dosyasında ayarlanır |

## Standart Yanıt

```json
{
  "Data": "<soapenv:Envelope>...</soapenv:Envelope>",
  "StatusCode": 200,
  "IsSuccess": true,
  "ErrorMessage": null,
  "Headers": {
    "content-type": "text/xml; charset=utf-8"
  }
}
```

`Data` alanı servis tarafından dönen ham XML string'dir. Mapping `OutputHandler`'ında XML parse işlemi yapılabilir.

## Mapping Örneği

```csharp
using System.Threading.Tasks;
using System.Xml;
using BBT.Workflow.Scripting;
using BBT.Workflow.Definitions;

public class GetCustomerSoapMapping : IMapping
{
    public Task<ScriptResponse> InputHandler(WorkflowTask task, ScriptContext context)
    {
        var soapTask = task as SoapTask;

        var customerId = context.Body?.customerId?.ToString() ?? "";
        var token = context.Body?.token?.ToString() ?? "";

        soapTask.SetUrl("https://api.example.com/services/CustomerService");
        soapTask.SetSoapAction("http://example.com/GetCustomer");

        var envelope = $@"<soapenv:Envelope xmlns:soapenv=""http://schemas.xmlsoap.org/soap/envelope/"">
  <soapenv:Body>
    <GetCustomer>
      <customerId>{customerId}</customerId>
    </GetCustomer>
  </soapenv:Body>
</soapenv:Envelope>";

        soapTask.SetBody(envelope);
        soapTask.AddHeader("Authorization", $"Bearer {token}");

        return Task.FromResult(new ScriptResponse());
    }

    public Task<ScriptResponse> OutputHandler(ScriptContext context)
    {
        var statusCode = (int)(context.Body?.statusCode ?? 500);
        var rawXml = context.Body?.data?.ToString() ?? "";

        if (statusCode >= 200 && statusCode < 300 || statusCode == 500)
        {
            var doc = new XmlDocument();
            doc.LoadXml(rawXml);

            var ns = new XmlNamespaceManager(doc.NameTable);
            ns.AddNamespace("soap", "http://schemas.xmlsoap.org/soap/envelope/");

            // SOAP fault kontrolü
            var fault = doc.SelectSingleNode("//soap:Fault", ns);
            if (fault != null)
            {
                return Task.FromResult(new ScriptResponse
                {
                    Key = "soap-fault",
                    Data = new { error = fault.InnerText }
                });
            }

            return Task.FromResult(new ScriptResponse
            {
                Key = "customer-success",
                Data = new { rawXml }
            });
        }

        return Task.FromResult(new ScriptResponse
        {
            Key = "soap-error",
            Data = new { error = "Unexpected status", statusCode }
        });
    }
}
```

:::tip SOAP Fault Yönetimi
SOAP servisler hata durumunda genellikle HTTP 500 üzerinden SOAP Fault döner. `acceptedStatusCodes: ["500"]` tanımlayarak bu durumların task'ı başarısız saymadan `OutputHandler`'a ulaşmasını sağlayın; fault kontrolünü mapping içinde yapın.
:::

## İlgili

- [HTTP Task](./http) — REST API çağrıları
- [Script Task](./script) — C# Roslyn script çalıştırma
- [Task Genel Bakış](./) — Tüm task türleri
