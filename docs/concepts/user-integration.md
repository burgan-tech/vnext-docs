---
sidebar_position: 1
title: User Integration
description: vNext'in Backend-Driven View ile kullanıcı etkileşim döngüsü
---

# User Integration

vNext platformu, **kullanıcı etkileşimini** workflow akışının doğal bir parçası olarak modeller. Bir süreç içinde **state** veya **transition** seviyesinde **view** tanımları yapılır. **vNext Client Workflow Manager SDK** bu yapıyı yöneterek state ve transition döngülerinde kullanıcıya **doğru view'i** ve **veriyi** sunar.

**Backend-Driven View** yaklaşımı sayesinde mobil/web platformların **sürüm çıkışları minimize** edilir — UI değişiklikleri sadece backend deploy ile yayınlanır.

## Etkileşim Döngüsü

```mermaid
flowchart TD
  Start(["Instance Start"]) --> StateFn["State Function<br/><i>client long-polling</i>"]

  StateFn --> StatusCheck{"status.code?"}
  StatusCheck -->|"A (Active)"| ViewCheck{"View var mi?"}
  StatusCheck -->|"C (Completed)"| Done(["Surec bitti"])

  ViewCheck -->|Evet| ViewFn["View Function<br/><i>view tanimi cek</i>"]
  ViewCheck -->|Hayir| Render

  ViewFn --> DataFn["Data Function<br/><i>data ihtiyaci varsa</i>"]
  DataFn --> Render["Render UI"]

  Render --> UserAction["Kullanici transition tetikler"]
  UserAction --> TransCheck{"Transition view<br/>var mi?"}

  TransCheck -->|Evet| Modal["Modal / Popup"]
  TransCheck -->|Hayir| Submit

  Modal --> Submit["Submit transition"]
  Submit -->|"Loop"| StateFn

  style Start fill:#dcfce7,stroke:#15803d,color:#1e293b
  style Done fill:#dcfce7,stroke:#15803d,color:#1e293b
  style StateFn fill:#dbeafe,stroke:#1e40af,color:#1e293b
  style StatusCheck fill:#f1f5f9,stroke:#475569,color:#1e293b
  style ViewCheck fill:#f1f5f9,stroke:#475569,color:#1e293b
  style TransCheck fill:#f1f5f9,stroke:#475569,color:#1e293b
  style ViewFn fill:#e0f2fe,stroke:#0369a1,color:#1e293b
  style DataFn fill:#e0f2fe,stroke:#0369a1,color:#1e293b
  style Render fill:#fae8ff,stroke:#86198f,color:#1e293b
  style UserAction fill:#fef3c7,stroke:#b45309,color:#1e293b
  style Modal fill:#fef3c7,stroke:#b45309,color:#1e293b
  style Submit fill:#dbeafe,stroke:#1e40af,color:#1e293b
```

## Adım Adım

1. **Instance başlatılır**: `POST /api/v1/{domain}/workflows/{wf}/instances/start` (genelde `sync=false`)
2. **Long-polling**: Client `GET /functions/state` çağırarak `status.code = "A"` (Active) olana kadar bekler
3. **State response**: Active state'e ulaşıldığında response, mevcut state'i ve view ihtiyacı bilgisini içerir
4. **View talebi**: View var ise client `GET /functions/view` ile view tanımını çeker
5. **Data talebi**: View'in data ihtiyacı varsa client `GET /functions/data` ile veri çeker
6. **Render**: View, data ile birlikte render edilir
7. **Transition önce kontrolü**: Kullanıcı bir transition'ı submit etmeden önce, transition'a özel view var mı kontrol edilir (popup/modal onay)
8. **Submit**: `PATCH /instances/{id}/transitions/{key}` ile transition tetiklenir
9. **Tekrar long-polling**: Status değişimi için tekrar State function'a long-polling yapılır
10. **Süreç sonu**: `status.code = "C"` (Completed) olduğunda döngü biter

## Validation

- **Schema** tanımları varsa form validation **annotation**'larını client kullanır
- Ön uçta real-time validation; backend'de submit'te re-validation
- Bkz. [Schema component](/docs/components/schema)

## İlgili

- [Async / Sync](/docs/how-to/async-sync) — long-polling neden gerekli
- [View component](/docs/components/view) — view tanımı
- [Built-in Functions](/docs/components/functions/built-in) — State / Data / View
- [Schema component](/docs/components/schema) — form validation
