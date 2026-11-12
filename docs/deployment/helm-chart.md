---
sidebar_position: 1
title: Helm Chart
description: vNext platformunu Kubernetes ve Minikube üzerinde kurmak için Helm chart kullanımı
---

# Helm Chart

vNext, container ortamlarına kolay kurulum için resmi bir **Helm chart** sunar. Bu chart ile Kubernetes cluster'ınıza veya local Minikube ortamınıza tüm altyapıyı tek bir komutla kurabilirsiniz.

- **Repo:** [burgan-tech/vnext-helm-charts](https://github.com/burgan-tech/vnext-helm-charts)
- **OCI Artifact:** `ghcr.io/burgan-tech/vnext`

---

## Container Ortamı Kurulumu

Kubernetes cluster'ınıza vNext kurmak için aşağıdaki adımları izleyin.

**1. Helm repository'yi ekleyin:**

```bash
helm pull oci://ghcr.io/burgan-tech/vnext --version <version>
```

**2. Chart'ı kurun:**

```bash
helm install vnext oci://ghcr.io/burgan-tech/vnext \
  --namespace vnext \
  --create-namespace \
  --values values.yaml
```

**3. Kurulumu doğrulayın:**

```bash
helm list -n vnext
kubectl get pods -n vnext
```

:::tip
`values.yaml` dosyasında tenant yapılandırması, veritabanı bağlantıları ve diğer ayarlar tanımlanır. Detaylı yapılandırma seçenekleri için [repo'daki](https://github.com/burgan-tech/vnext-helm-charts) `values.yaml` referansına bakınız.
:::

---

## Lokal Ortam (Minikube)

Local geliştirme için Minikube üzerinde vNext runtime'ı çalıştırabilirsiniz.

**1. Minikube'u başlatın:**

```bash
minikube start
```

**2. vNext'i Minikube cluster'ına kurun:**

```bash
helm install vnext oci://ghcr.io/burgan-tech/vnext \
  --namespace vnext \
  --create-namespace \
  --values values-local.yaml
```

**3. Servise erişin:**

```bash
minikube service vnext -n vnext
```

:::info
Minikube kurulumu, local geliştirme ve test senaryoları için uygundur. Üretim ortamları için container cluster yapılandırmasını kullanın.
:::

---

## Chart ↔ Runtime Sürüm Eşlemesi

Chart, `appVersion` alanında hedeflediği runtime imaj etiketini taşır. v0.0.93–v0.0.103 için:

| Chart | Runtime (`appVersion`) | Not |
|---|---|---|
| `1.0.111` | `0.0.93` | Dapr bileşenleri host başına scope'lanır; `configuration` bileşeni, `Redis__*` env'leri ve `DAPR_PUBSUB_BROADCAST_STORE_NAME` kaldırıldı (bkz. aşağıdaki not) |
| `1.0.115` | `0.0.94` | Orchestrator'a `state` bileşeni zorunlu (task invocation routing) |
| `1.0.116` | `0.0.95` | — |
| `1.0.117` | `0.0.95` | `global.dapr.nameResolution` + `resiliency-cross-domain.yaml` (aşağıda) |
| `1.0.118` | `0.0.96` | — |
| `1.0.119` | `0.0.97` | — |
| `1.0.120` | `0.0.97` | `nameResolution` fix: CRD'nin zorunlu saydığı `version: v1` ve `configuration: {}` her zaman render edilir |
| `1.0.121` | `0.0.98` | — |
| `1.0.122` | `0.0.99` | — |
| `1.0.123` | `0.0.100` | Kafka pub/sub seçeneği (`global.dapr.pubsub.type`), `global.blobStorageComponents` (x-storage), Execution gRPC values'ları kaldırıldı (bkz. [1.0.123'e geçiş](#chart-10123e-geçiş-runtime-00100)) |
| `1.0.124` | `0.0.101` | — |
| `1.0.125` | `0.0.102` | — |
| `1.0.126` | `0.0.102` | Init job `VNEXT_COMPONENT_VERSION` → `0.0.21` (vnext-core, `sys-version-registry`) |
| `1.0.127` | `0.0.103` | İsteğe bağlı `pythonRuntime` bloğu — PythonTask (type `23`) için domain'in Python runtime Deployment'ı (bkz. [Python Runtime](#python-runtime)) |

:::warning[Dapr bileşen ayak izi — v0.0.93 (chart ≥ 1.0.111)]
Runtime v0.0.93 ile Dapr bileşenleri **yalnızca tüketen host'a** yüklenir (`vnext/docs/runtime/dapr-component-footprint.md`): `state` → orchestrator + execution; `lock` → orchestrator + db-migrator; `pubsub` → orchestrator, execution, inbox, outbox; `pubsub-broadcast` → yalnız orchestrator. `lock` execution/inbox/outbox'tan, `state` inbox/outbox'tan kaldırıldı; `AddRedis()` / `Redis__Standalone__EndPoints__*` env'leri, `dapr-placement` bağımlılığı ve `DAPR_PLACEMENT_HOST` runtime'dan silindi (Redis **sunucusu** kalır — Dapr bileşenlerini besler). Monitor API host'u (`/api/v1/monitor`, port 4203) da bu sürümde kaldırıldı. Chart, `global.dapr.redis.scopes.<state|lock|pubsub|pubsubBroadcast>` ile bu politikayı **değiştirmenize** (liste birleşmez, yerine geçer) izin verir; 0.0.90 öncesi bir imaj sabitleyen domain `Redis__Standalone__EndPoints__0`'ı kendi values'ında yeniden eklemelidir.
:::

:::info[Orchestrator'da `state` bileşeni zorunlu — v0.0.94 (chart ≥ 1.0.115)]
v0.0.94'ten itibaren `http`, `daprservice`, `soap`, `statestore` ve `cacheaside` task'ları varsayılan olarak **Orchestrator process'i içinde** çalışır (`Workflow:TaskInvocation`). `statestore` / `cacheaside` bu yüzden orchestrator sidecar'ından bir `state` bileşeni ister: chart'ın varsayılan scope'u bunu sağlar; özel bir `storeName` kullanan task/function cache tanımlarında ilgili bileşenin scope'una **orchestrator app-id'si** de eklenmelidir, aksi halde ilk kullanımda çözümlenemez. Bileşen taşınamıyorsa `"statestore": "Remote"` / `"cacheaside": "Remote"` ile eski yol korunur. Ayrıntı: [Task Invocation](/docs/configuration/task-invocation).
:::

## Dapr Name Resolution (cross-namespace) <sup>New</sup> chart 1.0.117

Namespace-per-domain topolojisinde (`{env}-vnext-{domain}`) bir domain'in orchestrator'ı başka bir domain'i `vnext-{domain}-app.{namespace}` app-id'siyle çağırır. Bunun için çağıran sidecar'ın adres çözümü chart tarafından `appconfig` Dapr `Configuration`'ına yazılır:

```yaml
global:
  dapr:
    nameResolution:
      component: "kubernetes"     # boş = blok render edilmez (Dapr'ın Kubernetes varsayılanı)
      version: "v1"               # CRD zorunlu alanı; 1.0.120'den itibaren her zaman render edilir
      template: "{{.ID}}-dapr.{{.Namespace}}.svc.cluster.local:{{.Port}}"
      clusterDomain: ""           # yalnızca template boşken kullanılır; ikisi birden set edilemez
    crossNamespaceTemplate: ""    # boş = release namespace'inden türetilir → ServiceDiscovery__Dapr__NamespaceTemplate
    crossDomainTargets: []        # opsiyonel; domain adları ("customers"), app-id değil
```

- `template`, Dapr'ın `kubernetes` resolver'ının varsayılan ürettiği adresle **byte-byte aynıdır**; `{{.ID}}` / `{{.Namespace}}` / `{{.Port}}` Dapr'ın Go template değişkenleridir ve values string'i olarak tutulduğu için Helm bunları değerlendirmez. `{{.Port}}` daprd'nin iç gRPC portudur, uygulama portu değil.
- `nameformat` resolver'ı **kullanılmaz**: yalnızca `{appid}` değiştirir, `Namespace`'i okumaz; mTLS gerçek (namespace, app-id) çiftine bağlı olduğundan SPIFFE yetkilendirmesi bozulurdu.
- `crossNamespaceTemplate` boşsa `stage-vnext-core` namespace'i `stage-vnext-{domain}` şablonunu üretir ve `ServiceDiscovery__Dapr__NamespaceTemplate` olarak orchestrator'a geçer. Konvansiyona uymayan namespace'lerde açıkça verin (`"shared-{domain}"`).
- `resiliency-cross-domain.yaml`, her orchestrator için `vnext-cross-domain-resiliency` kaynağını **koşulsuz** render eder: Dapr'ın rezerve `DefaultAppCircuitBreakerPolicy` (5 ardışık hata → 30 s açık) ve mutasyon çağrılarında (`instances/start`, `internal/subflow-forward`, `transitions/{key}`, `sub/*`, `busy`, `longpoll/ack` …) **retry yok** pinlemesi. Execution host'a giden çağrılar `resiliency-orchestration.yaml`'daki adlandırılmış hedefte kalır (adlandırılmış hedef varsayılanı ezer).
- `ServiceDiscovery:Provider=dapr` yine **ortam başına** açıkça ayarlanır; chart bunu değiştirmez. Bkz. [Service Discovery → dapr provider](/docs/configuration/service-discovery#dapr-provider).

`_helpers.tpl`'deki `vnext.validateNameResolution`, `template` ve `clusterDomain`'in birlikte verilmesi ya da `component` boşken `template`/`clusterDomain` set edilmesi gibi yanlış kombinasyonlarda render'ı **durdurur**.

---

## Pub/Sub: Redis ↔ Kafka

<sup>New</sup> chart 1.0.123 / v0.0.100 — Runtime'ın kendi pub/sub'ı (instance event'leri, outbox, inbox; `DAPR_PUBSUB_STORE_NAME`) varsayılan olarak Redis üzerinde çalışır. Kafka'ya geçmek için `global.dapr.pubsub.type: "kafka"` verilir:

```yaml
global:
  dapr:
    pubsub:
      type: "kafka"                         # "redis" (varsayılan) veya "kafka"; başka değer render'ı durdurur
  externalKafka:
    endpoint: "kafka-1:9093,kafka-2:9093"   # -> brokers
    auth:
      useSecretEngine: true                 # saslUsername / saslPassword secret store'dan okunur
      secret:
        name: vnext-secret
        usernameKey: kafka-username
        passwordKey: kafka-password
      # useSecretEngine: false iken auth.username / auth.password kullanılır
    metadata:                               # host başına ek pubsub.kafka metadata'sı
      orchestrator:
        - { name: saslMechanism, value: "SHA-512" }
      execution: []
      inbox: []
      outbox: []
```

- **Host başına bir component.** Chart dört `pubsub.kafka` component'i üretir: `<fullname>-pubsub-orchestrator`, `-pubsub-execution`, `-pubsub-worker-inbox` ve `-pubsub-worker-outbox`. Her biri yalnız kendi host'unun sidecar'ına scope'lanır ve o host'un `DAPR_PUBSUB_STORE_NAME` değeri bu component'i gösterir.
- **Broadcast store Redis'te kalır.** Orchestrator'ın `<fullname>-pubsub-broadcast` store'u `type` ne olursa olsun Redis'tedir.
- **Chart'ın yazdığı metadata.** `brokers` (`endpoint`'ten), `authType` (her zaman `password`, yani SASL; mTLS / OIDC / auth'suz seçilemez), `saslUsername` ve `saslPassword` (`auth`'tan) chart tarafından render edilir ve dört component'te ortaktır. Bunları `metadata.<host>` altında yazmak render'ı **durdurur**.
- **Passthrough kuralları.** Diğer Dapr Kafka metadata'sı (`saslMechanism`, `disableTls`, `caCert`, `clientID` …) `metadata.<orchestrator|execution|inbox|outbox>` altında `{name, value}` veya `{name, secretKeyRef}` olarak verilir ve o host'un component'ine olduğu gibi eklenir. İsimler büyük-küçük harf duyarlıdır (`consumerID`, `consumerId` değil; yanlış yazılmış isim sessizce yok sayılır). Değeri `""` olan girdi atlanır, ayar Dapr varsayılanında kalır.

### Topic'ler ve consumer group'lar

Runtime 0.0.100'den itibaren tüm runtime topic'leri `vnext.{appDomain}.{environment}.{event}.v{n}` biçimindedir (`{environment}` = küçük harfli `ASPNETCORE_ENVIRONMENT`; ayrıntı: [Event-Driven Workflow'lar → Runtime topic adları](/docs/how-to/event-driven-workflows)). Broker her domain kullanıcısına topic **ve** consumer group'larda `vnext.{appDomain}.*` yetkisi verir.

`consumerID` / `consumerGroup` değerlerini **chart set etmez**; deployment pipeline'ı her host için `metadata.<host>` altına verir. Kural:

- Her host'un katıldığı group `vnext.{appDomain}.*` içinde olmalı ve **host'lar arasında farklı** olmalıdır (her host kendi topic'lerini tüketir).
- `consumerGroup` verilirse önceliklidir; Dapr `consumerID`'yi yok sayar.
- İkisi de verilmezse Dapr host'un app-id'sini (`vnext-core-app` …) group olarak kullanır; bu prefix dışında kaldığı için ACL reddeder.

Örnek (yalnız biçimi göstermek için; gerçek değeri pipeline belirler):

```yaml
global:
  externalKafka:
    metadata:
      orchestrator:
        - { name: consumerID, value: "vnext.core.production.orchestrator" }
```

Domain'in kendi yazdığı topic'ler (`DaprPubSubTask.topic`, Subscription'lar) olduğu gibi kullanılır; Kafka altında onlar da `vnext.{domain}.*` kalıbına uymalıdır. Bkz. [DaprPubSub Task](/docs/components/tasks/dapr-pubsub).

---

## Blob storage (x-storage)

<sup>New</sup> chart 1.0.123 / v0.0.100 — Master şemada `x-storage` ile işaretlenen dosya alanlarının içeriği bir Dapr output binding'i üzerinden nesne deposuna taşınır (sözleşme: [Dosya Alanları](/docs/how-to/file-fields)). Binding'ler `global.blobStorageComponents` altında tanımlanır (varsayılan `[]`; chart hazır bir component getirmez). Her kayıt `{name, spec: {type, version, metadata[]}, auth?}` biçimindedir ve yalnız **orchestrator (`vnext-<appDomain>-app`) sidecar'ına** scope'lanır, çünkü dosya nesnelerini yazan ve okuyan tek host odur. `name`, şemadaki `x-storage.binding` değeridir. Kimlik bilgilerini satır içi değil `secretKeyRef` ile verin.

```yaml
global:
  blobStorageComponents:
    - name: vnext-blob-s3
      spec:
        type: bindings.aws.s3
        version: v1
        metadata:
          - { name: bucket, value: tts-bucket }
          - { name: region, value: us-east-1 }
          - { name: endpoint, value: https://s3.bank.local }   # kurum içi S3 / MinIO
          - { name: forcePathStyle, value: "true" }             # kurum içi S3 / MinIO
          - { name: accessKey, secretKeyRef: { name: vnext-secret, key: blob-s3-access-key } }
          - { name: secretKey, secretKeyRef: { name: vnext-secret, key: blob-s3-secret-key } }
      auth: { secretStore: vnext-secret }
orchestrator:
  appEnvConfig:
    FileStorage__AllowedBindings__0: "vnext-blob-s3"
    FileStorage__KeyPrefix: "vnext-runtime/"
```

| Ayar | Varsayılan | Açıklama |
|---|---|---|
| `FileStorage:KeyPrefix` | boş | Her nesne anahtarının öneki; paylaşılan bir bucket'ta runtime nesnelerini ayırır. **İlk yazımdan sonra asla değiştirilmemelidir** — mevcut handle'lar eski anahtarlarla yazılmıştır. |
| `FileStorage:AllowedBindings` | boş liste | Handle'ı akışlar arasında taşınabilecek **ek** binding'ler (ör. farklı binding tanımlayan akışa handle kopyalayan SubFlow girdi/çıktı eşlemeleri). Boşken bir akış yalnız kendi master şemasının tanımladığı binding'lerin handle'larını kabul eder; başka binding'li bir handle yazmada `400` (`Instance:100048`), okumada `404` alır. |

Boyut sınırları: base64 gövdeyi yaklaşık 4/3 büyütür. Orchestration host'unun Kestrel gövde sınırı **10 MiB**'dır (≈ **7,5 MiB** dosya; aşılırsa `413`); Dapr sidecar'ının sınırı `global.dapr.maxBodySize` (`--max-body-size`, varsayılan **64Mi**). Binding'in `get` yanıtı bellekte tamponlanır.

**Akışlı yükleme sınırı.** <sup>New</sup> v0.0.102 — `transport: stream` / `any` ile bildirilen alanlar baytlarını ayrı bir yükleme isteğiyle (`POST /api/v1/{domain}/workflows/{flow}/files`) alır; bu istek Kestrel'in 10 MiB JSON sınırına değil `FileStorage:Upload:MaxBytes`'a tabidir (varsayılan `67108864` = 64 MiB; aşılırsa depoya bayt yazılmadan `413`). Bu değer orchestration sidecar'ının `--max-body-size` değeriyle (`global.dapr.maxBodySize`) **eşleşmelidir**: birini yükseltirken diğerini de yükseltin. Yükleme biletinin ömrü `FileStorage:Upload:TicketTtlMinutes`'tır (varsayılan `60`).

```yaml
global:
  dapr:
    maxBodySize: 128Mi
orchestrator:
  appEnvConfig:
    FileStorage__Upload__MaxBytes: "134217728"   # 128 MiB = global.dapr.maxBodySize
```

:::warning[S3 ve aws-chunked (Dapr 1.17+)]
Dapr 1.17'den itibaren `bindings.aws.s3`, `https://` endpoint'ine yaptığı her yüklemeyi CRC32 trailer'lı `Content-Encoding: aws-chunked` olarak gönderir. Bu kodlamayı çözmeyen S3 uyumlu bir depo çerçevenin kendisini nesne olarak saklar (AWS S3, MinIO, Ceph, LocalStack, s3mock, moto ve SeaweedFS çözer). Sidecar'da `AWS_REQUEST_CHECKSUM_CALCULATION=when_required` bunu değiştirmez; bileşen metadata'sıyla da kapatılamaz. <sup>New</sup> v0.0.102 runtime her okumayı doğrular ve yükü handle ile eşleşen çerçeveli nesneyi orijinal haliyle servis eder; bucket'ı vNext dışında doğrudan okuyan bir tüketici ise çerçeveyi görür. Tercih sırasıyla seçenekler:

- `aws-chunked` çözen bir depo kullanın (depoda trailer/streaming-signature desteğini açın).
- Güvenilir ağ içinde depoya `http://` ile ulaşın (`disableSSL: "true"`); trafik şifresiz olur.
- Orchestration sidecar'ını daprd 1.16.x'e sabitleyin (`dapr.io/sidecar-image`); diğer tüm Dapr düzeltmelerini geride tutan geçici bir çözümdür.

Ayrıntı: [Dosya Alanları](/docs/how-to/file-fields).
:::

---

## Chart 1.0.123'e geçiş (runtime 0.0.100)

:::warning[Güncellemeden önce]
- **Outbox'ı boşaltın.** Tüm runtime topic adları `vnext.{appDomain}.{environment}.*` olarak değişir. Eski topic'lerde kalan mesajlar tüketilmez; güncellemeden önce yazılmış outbox satırları eski topic adını taşır. Rollout'tan önce outbox'ın boşaldığından emin olun.
- **Kaldırılan gRPC values'ları.** Orchestration → Execution gRPC transport'u runtime'dan kaldırıldı; çağrı her zaman Dapr HTTP service invocation'dır (bkz. [Task Invocation](/docs/configuration/task-invocation)). `execution.grpcPort`, `Kestrel__GrpcPort` ve `orchestrator.appEnvConfig.ExecutionApi__Transport` chart'tan çıkarıldı; bunları set eden bir override etkisizdir.
- **`execution.dapr.protocol` `"http"` kalmalıdır.** Execution sidecar'ını `grpc`'ye çevirmiş bir ortam `http`'ye döndürülmelidir. Dapr sidecar'ının kendi gRPC portları ve OTLP gRPC bundan etkilenmez.
:::

---

## Python Runtime

<sup>New</sup> chart 1.0.127 (runtime 0.0.103) — [Python Task](/docs/components/tasks/python) (type `23`) için domain'in kendi Python handler'larını çalıştıran **isteğe bağlı** Deployment. Orchestrator onu Dapr service invocation ile doğrudan çağırır (`POST v1/invoke`, kontrat sürümü 1); hiçbir vNext servisi Python taşımaz. Varsayılan olarak kapalıdır — Python task'ı olmayan bir domain ek bir şey deploy etmez.

```yaml
pythonRuntime:
  enabled: true
  replicaCount: 1
  image:
    # DOMAIN'in image'ı: FROM ghcr.io/burgan-tech/vnext/python-runtime:<sürüm> üzerine
    # handler'lar ve sabitlenmiş requirement'lar. Zorunlu; appVersion varsayılanı yoktur.
    repository: registry.example.com/core/python-runtime
    tag: "1.4.0"
  config:
    handlersPackage: handlers
    maxWorkers: 4
    maxRequestBytes: 4194304
    maxOutputBytes: 4194304
  networkPolicy:
    enabled: true   # yalnızca bu release'in orchestrator pod'larından ingress
```

| Alan | Varsayılan | Açıklama |
|---|---|---|
| `enabled` | `false` | Runtime'ı açar ve orchestrator'a `Workflow__PythonRuntime__AppId` verir. Kapalıyken her Python task'ı `503` ile düşer |
| `image.repository` / `tag` / `digest` | boş | Domain'in image'ı — **zorunlu**; eksikse render başarısız olur. Sürüm vNext'in değil domain'indir |
| `replicaCount` | `1` | Çağrılar pod başına tek process'i paylaşır ve CPU-yoğun handler'lar GIL ile sınırlıdır: thread değil replica ile ölçekleyin |
| `dapr.appId` | boş | Boş = `vnext-<appDomain>-python-runtime-app`. Orchestrator aynı değere yönlendirilir; override başka bir şey gerektirmez |
| `dapr.maxBodySize` / `httpMaxRequestSize` | boş | Boş = `global.dapr.*` |
| `service.port` | `8080` | Runtime'ın dinleme portu; `dapr.io/app-port` buradan türetilir |
| `config.handlersPackage` | `handlers` | `VNEXT_PYTHON_HANDLERS` |
| `config.maxWorkers` | `4` | `VNEXT_PYTHON_MAX_WORKERS` — pod başına eşzamanlı handler çağrısı |
| `config.maxRequestBytes` / `maxOutputBytes` | `4194304` | `VNEXT_PYTHON_MAX_REQUEST_BYTES` / `_OUTPUT_BYTES` — istek sınırını Dapr body size içinde tutun |
| `extraEnvConfig` | `{}` | Handler ayarları için ek ortam değişkenleri. **Secret konmaz** — Dapr secret store kullanın |
| `resources` / `resourcesFallback` | `{}` / 100m–1000m CPU, 256Mi–1Gi | Boş `resources` = `global.resources.default`, o da yoksa `resourcesFallback`. En ağır handler'a göre boyutlayın |
| `autoscaling.*` | kapalı, 1–5 replica, %80 CPU/bellek | HPA |
| `networkPolicy.enabled` | `true` | Ingress yalnızca bu release'in orchestrator pod'larından (Dapr sidecar'ı üzerinden). Egress kısıtlanmaz. NetworkPolicy destekleyen CNI gerekir; `extraIngress` ek kurallar içindir (ör. Prometheus) |
| `tmpSizeLimit` | `128Mi` | Salt-okur kök üzerinde yazılabilir `/tmp` (emptyDir) |
| `podSecurityContext` / `securityContext` | UID/GID 65532, non-root, drop ALL, read-only root | Base image'ın beklediği sertleştirme |

Pod service-account token'ı mount etmez (`automountServiceAccountToken: false`) ve `/v1/health` liveness/readiness probe'larıyla çalışır. App-id seviyesinde ek kısıt isteyen cluster'lar runtime sidecar'ı için yalnız orchestrator app-id'sini kabul eden bir Dapr `Configuration` `accessControl` politikası ekleyebilir. Base image `ghcr.io/burgan-tech/vnext/python-runtime` vNext release'leriyle yayımlanır.

Yapılandırma ayrıntısı: [Python Runtime Yapılandırması](/docs/configuration/python). Chart kaynağı: [`charts/vnext/values.yaml` → `pythonRuntime`](https://github.com/burgan-tech/vnext-helm-charts/blob/master/charts/vnext/values.yaml).

---

## DbMigrator — Schema Migration Timeout'ları

`db-migrator` Job'ı, her flow'un PostgreSQL şemasına migration uygularken `SchemaMigration` bölümünü kullanır:

```json
{
  "SchemaMigration": {
    "CommandTimeoutSeconds": 600,
    "LockExpirySeconds": 900
  }
}
```

| Anahtar | Tip | Varsayılan | Açıklama |
|---------|-----|------------|----------|
| `CommandTimeoutSeconds` | integer | `600` | Şema migration sırasında her statement için komut timeout'u. Büyük tabloları yeniden yazan data migration'ları (ör. incident backfill) Npgsql'in 30 sn'lik varsayılanını kolayca aşabilir |
| `LockExpirySeconds` | integer | `900` | Bir şemanın migration'ı etrafında tutulan distributed lock'un süresi. `CommandTimeoutSeconds`'tan **büyük** olmalıdır — aksi halde bir migration statement'ı hâlâ çalışırken lock süresi dolabilir ve ikinci bir migrator aynı şemayı eşzamanlı başlatabilir |

Helm chart üzerinden `db-migrator.appEnvConfig` altında `SchemaMigration__CommandTimeoutSeconds` / `SchemaMigration__LockExpirySeconds` ortam değişkenleriyle override edilebilir; isteğe bağlıdır, tanımlanmazsa yukarıdaki kod varsayılanları geçerlidir. Migrator, herhangi bir şema başarısız olursa non-zero exit code ile çıkar.

:::warning[Runtime v0.0.105 — DbMigrator hostlardan önce]
<sup>New</sup> v0.0.105 `Instances` tablosuna nullable `ContinuationClaimedAt` kolonu eklenir (migration `20261109120000_AddInstanceContinuationClaim`; park edilmiş Busy continuation'ının tek sefer claim edilmesi için — bkz. [Transition Pipeline](/docs/concepts/transition-pipeline)). `db-migrator` Job'ını orchestrator ve worker'lar yayılmadan **önce** çalıştırın. Konfigürasyon değişikliği gerekmez.
:::

## PostgreSQL Bağlantı Adı (`Application Name`)

<sup>New</sup> v0.0.105 Her host, PostgreSQL connection string'lerini (`ConnectionStrings:Default` ve her `ConnectionStrings:Domains:*` girdisi) başlangıçta normalize eder: connection string'de `Application Name` **yoksa** ekler. Ad şu sırayla çözülür:

1. `OTEL_SERVICE_NAME`
2. `DAPR_APP_ID`
3. Host'un sabit adı: `vnext-orchestration`, `vnext-db-migrator`, `vnext-worker-inbox`, `vnext-worker-outbox`

Böylece `pg_stat_activity` ve PgBouncer `SHOW CLIENTS` çıktısında bağlantının hangi host'a ait olduğu görünür (önceden `application_name` boştu). Connection string'de zaten bir `Application Name` varsa o kazanır; string'in geri kalanı **değiştirilmez**. Pool boyutu bilinçli olarak runtime'a eklenmedi — production'da hostlar PgBouncer üzerinden bağlanır ve sunucu tarafı bağlantı limiti PgBouncer'dadır; pool ayarlarını connection string'de / deployment'ta tutmaya devam edin.
