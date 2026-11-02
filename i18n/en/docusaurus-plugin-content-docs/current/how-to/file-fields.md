---
id: file-fields
title: File Fields (x-storage)
sidebar_label: File Fields
description: How a FilePicker field round-trips with the runtime — the x-storage write shape, the persisted handle, the echo rule, viewing through functions/file, status codes and limits
---

# File Fields (`x-storage`)

When a master-schema field carries `x-storage`, the bytes of a file sent to that field are **not** kept inside the instance data. The runtime writes them to a configured blob store (a Dapr output binding) and puts a small **handle** in the field's place. The client reads that handle as data, sends it back when editing the form, and downloads the file itself through `functions/file`. A field without `x-storage` behaves as before (bytes stay inline). <sup>New</sup> v0.0.100

This page is for client developers. For declaring the field in the schema, see [Schema Definition](/docs/how-to/view-consept/schema-tanimi); for setting up the binding component (blob storage), see [Helm Chart](/docs/deployment/helm-chart).

## Write shape

The client sends the file in the transition (or `start`) body, at the field path:

```json
{
  "identityDocument": {
    "name": "passport.pdf",
    "mimeType": "application/pdf",
    "size": 204800,
    "content": "<base64>"
  }
}
```

`content` exists only on the way **in**; no read surface returns the bytes. `size` is the client's guess and is ignored — the stored value is the decoded byte count. For array fields (`x-storage` on `items`) every element is a separate file.

## Persisted handle

The record (instance data, transition record, every read) carries this in place of the bytes:

```json
{
  "component": "vnext-blob-s3",
  "file": "7c9e4c2a-5f7e-4a51-9c11-0b8b6c1d2e3f",
  "name": "passport.pdf",
  "mimeType": "application/pdf",
  "size": 204800,
  "eTag": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  "owner": { "domain": "onboarding", "flow": "kyc-main-flow", "instance": "8394783-..." }
}
```

| Field | Meaning |
|-------|---------|
| `component` | Name of the binding the file was written to. Informational; the client never sends it back. |
| `file` | A runtime-generated GUID. It is **not** the client file name. |
| `name`, `mimeType` | The name and type the client sent. |
| `size` | Decoded byte count (authoritative). |
| `eTag` | SHA-256 of the bytes, lower-case hex, 64 chars. Quoted in the HTTP `ETag` header. |
| `owner` | The instance that wrote the file (`domain`, `flow`, `instance`). Tells you **which instance** to call `functions/file` on. |

## The round trip

1. **Pick and send.** The user picks a file; the client puts the base64 in `content` in the transition (or `start`) body.
2. **The record shows a handle.** The runtime writes the bytes to the store, replaces the field with the handle and saves the record that way. The stored raw request body is also free of the bytes. <sup>New</sup> v0.0.102 — The swap removes only `content` and writes the seven handle members; any other member the client put on the same object (a FilePicker row's `documentType`, per-file metadata) is **kept** and reaches the mapping and the record. Before, the swap cleared the node and those members were dropped before the mapping ran. A strict master schema (`additionalProperties: false` on the file node) must declare such members under the node's `properties`.
3. **Echo when editing the form.** When a record update does not change the file, send the field back in either form: the handle exactly as you read it, or just `{ "file": "<id>" }`. The runtime looks for the same `file` id at the same field path in the instance's stored data (for arrays: any element of the same array) and, if found, replaces the field with the **stored handle**; any name/type/size/eTag the client sent is ignored.
4. **View / download.** Call `functions/file` on the instance named by the handle's `owner` (below).

Setting the field to `null` or omitting it clears the field, but **nothing is deleted** from the store (see [Limits](#limits)).

### Echo rules

| Body | Result |
|------|--------|
| `content` only | Written as a new file |
| `file` only (+ optional metadata) | Becomes the stored handle if it exists in the stored data; otherwise `400` |
| `content` and `file` together | `400` |
| a `file` reference on `start` | `400` (there is no stored data yet) |

## Streamed upload (`transport: stream`)

<sup>New</sup> v0.0.102 — A field declared with `"transport": "stream"` or `"any"` in the schema takes its bytes from a **separate upload request** instead of a base64 string in the JSON body. The file is never inflated by base64, never held in a JSON body, and is bounded by `FileStorage:Upload:MaxBytes` (default 64 MiB) rather than the 10 MiB JSON body limit. For the declaration see [Schema Definition → `x-storage`](/docs/how-to/view-consept/schema-tanimi).

| `transport` | How the client sends the bytes |
|-------------|--------------------------------|
| `inline` (default) | Base64 `content` in the JSON body ([Write shape](#write-shape)) |
| `stream` | Streamed upload only; inline `content` from a client is refused with `400` `Instance:100048` |
| `any` | Both |

Choose `stream` for large files (scanned documents, TIFFs, long PDFs) or anything that may exceed about 7.5 MiB; `inline` is enough for small files in a single request.

**1. Upload.** Send the raw bytes to the flow's `files` endpoint:

```http
POST /api/v1/{domain}/workflows/{flow}/files?path=files[]&name=scan.tiff[&version=1.0.0]
Content-Type: image/tiff
Content-Length: 31457280

<raw bytes>
```

```json
201 Created
{ "file": "6f1c…", "component": "vnext-blob-s3", "path": "files[]", "name": "scan.tiff", "mimeType": "image/tiff",
  "size": 31457280, "eTag": "<sha256 of the bytes received>", "expiresAt": "2026-10-31T13:00:00+00:00" }
```

**2. Reference it.** Before `expiresAt`, send only the `file` id where the field lives, in a `start` or transition body:

```json
{ "attributes": { "files": [ { "file": "6f1c…", "documentType": "invoice" } ] } }
```

- **`path`** is the field path as the schema folds it: `passport`, `customer.tax`, `files[]`, `documents[].doc`. An unknown path, a field whose `transport` is `inline`, or a missing `Content-Length` → `400` `Instance:100048`. A store failure → `503` `Instance:100047`.
- **Size limit.** A body above `MaxBytes` is `413` before any byte is stored. `FileStorage:Upload:MaxBytes` (default 67108864 = 64 MiB) **must match** the orchestration sidecar's `--max-body-size`; raise both together.
- **Integrity.** The body is read into one buffer of exactly `Content-Length` bytes, hashed, and handed to the field's Dapr binding as one message. `size` and `eTag` are computed from the bytes received, never taken from the client; a body shorter or longer than its `Content-Length` is not stored.
- **Single-use ticket.** The upload is staged in the distributed cache for `FileStorage:Upload:TicketTtlMinutes` (default 60); it is not in any instance yet. The ticket is accepted only for the **same flow, path and component** it was uploaded for, and **once**: of two requests claiming the same upload at once only one succeeds (`200`/`202`), the other gets `400`. A request that fails after the claim (a store failure) puts the ticket back until it expires. The same upload twice in one body, an expired or unknown id, or an upload made for another path → `400` `Instance:100048`.
- **Handle.** The swap writes the handle with this instance as `owner`; the node's other members (`documentType`) are kept, as for inline uploads.
- **Authorization.** Knowing the GUID is the claim: it is random and only the uploader received it. Like `start`, the upload route carries no runtime authorization; gate it at the gateway the same way.
- **Expired uploads.** An upload never referenced before its ticket expires leaves its object in the store (see [Known issues](#known-issues)).

## Reading a file — `functions/file`

```
GET|HEAD {domain}/workflows/{workflow}/instances/{instance}/functions/file?file=<guid>
```

- Use the handle's `owner.flow` / `owner.instance` as `{workflow}` / `{instance}`. If a parent's data shows a handle that came from a subflow, call the subflow instance (`owner`); the call does not descend from the parent.
- `file` must exist in an `x-storage` field of **that** instance's own stored data.
- Access is checked against the state's `queryRoles` and the `x-roles` grants of the file's path and its ancestor paths.

### Headers and caching

| Header | Value |
|--------|-------|
| `Content-Type` | the stored `mimeType` (`application/octet-stream` when it does not parse) |
| `ETag` | `"<eTag>"` (quoted) |
| `Accept-Ranges` | `bytes` |
| `Cache-Control` | `private, max-age=31536000, immutable` |
| `X-Content-Type-Options` | `nosniff` |
| `Content-Security-Policy` | `sandbox; default-src 'none'` (always — the type is client-declared, so the response never runs as a document of this origin) |
| `Content-Disposition` | `inline; filename*=UTF-8''…`; **`attachment`** for active types (`text/html`, `application/xhtml+xml`, `image/svg+xml`, `text/xml`, `application/xml`, `text/javascript`, `application/javascript` and any `+xml`) |

- **Conditional request:** send `If-None-Match: "<eTag>"`; a match returns `304` without a store read. Because the `file` id is tied to its content, the response can be cached as `immutable`.
- **Range:** `Range: bytes=…` returns `206 Partial Content`; an unsatisfiable range returns `416`. The slice is taken in memory (the whole file is read from the store), so Range saves network traffic, not store reads.
- **HEAD:** returns headers only.

### Read integrity

<sup>New</sup> v0.0.102 — Every read (`functions/file`, `internal/file`, `GetFileAsync`) checks the bytes the store returns against the handle before serving them:

| Stored bytes | Result |
|--------------|--------|
| Length = `size` and sha256 = `eTag` | Served |
| A complete `aws-chunked` frame whose payload matches the handle | The payload (the original file) is served; warning log `20512` (`FileRecoveredFromChunkedFrame`) |
| Anything else | `503` `Instance:100047` (`FileStoreUnavailable`); error log `20513` (`FileIntegrityMismatch`) names the stored and expected sizes |

The frame case comes from Dapr 1.17+ `bindings.aws.s3` uploads over TLS (see [S3 operations note](#s3-operations-note-aws-chunked)). Before, whatever the store returned was served (e.g. a framed object 44+ bytes longer than the file, with an `ETag` naming the original); now bytes that do not match answer `503` instead of a corrupt body. The response body is streamed over the verified binding `get`; files above 4 MB now read back too (before, the gRPC receive cap in the runtime's Dapr client made them answer `503`).

For the endpoint reference (authorization order, parameters) see [Built-in Functions → File Function](/docs/components/functions/built-in#file-function). To read the file server-side (in a mapping script) use `ScriptBase.GetFileAsync` — see [Mappings → Reading a file](/docs/components/mappings#reading-a-file-getfileasync).

## Status codes

| Code | Error code | When | What to do |
|------|------------|------|-----------|
| `400` | `Instance:100048` (`FileReferenceInvalid`) | `content` and `file` together; unknown `file` reference; a reference on `start`; invalid base64; missing/blank `file` query parameter on `functions/file` | Fix the request: `content` for a new file, the handle/`{file}` read from the record for an existing one. Retrying does not help. |
| `403` | — | `functions/file`: the state's `queryRoles` rejects the caller | An authorization problem; do not retry. |
| `404` | `Instance:100049` (`FileNotFound`) | `file` is not in this instance's stored data; or the file's path is hidden from the caller by `x-roles` | Verify the `owner` instance. A hidden path is deliberately indistinguishable from a missing file. |
| `409` | `InstanceBusy` | A forwarded transition arrived while a parent's subflow is finishing; or the target instance is busy | Retry the same request after a short wait. |
| `413` | — | The request body exceeds a size limit (Kestrel or sidecar); on a streamed upload the body exceeds `FileStorage:Upload:MaxBytes` | Reduce the file size, split it into several files, or use `transport: stream` for large files. Retrying does not help. |
| `503` | `Instance:100047` (`FileStoreUnavailable`) | The blob store (binding) is unreachable on write or read; reading an object that no longer exists in the store also returns this code (see [Known issues](#known-issues)); <sup>New</sup> v0.0.102 so do stored bytes that do not match the handle's `size`/`eTag` (see [Read integrity](#read-integrity)) | Retry with backoff. It returns synchronously, before any `202`; a failed `start` creates no instance and a failed transition leaves the record unchanged. |
| `503` | `Instance:100050` (`FileSchemaUnavailable`) | The flow's master schema cannot be loaded and the body carries an object with a `content` or `file` member (write), or a file is read through `functions/file` | Retry once the schema resolves. Nothing was applied; bodies without a `content`/`file` member are unaffected. |

When a parent has an active subflow, a transition sent to the parent is forwarded to the leaf and the file is written there; the client still receives the **parent's** id and the parent's mode (`202` when async, `200` when sync). The handle's `owner` is the writing (leaf) instance.

## Processing a file in a script

<sup>New</sup> v0.0.102 — A script can read a stored file, process it in memory with System.IO streams and write the result back as an `x-storage` file:

```csharp
var source = await GetFileAsync(context.Runtime.Domain, context.Instance.Flow, context.Instance.Id.ToString(), handle.file);
using var input = source.OpenRead();                    // read-only, seekable MemoryStream over the verified bytes
var output = new MemoryStream();
// … hand input/output to a plugin library (PDF, TIFF, image) mounted in Scripting:Sandbox:PluginDirectory …
output.Position = 0;
var converted = await PutFileAsync(context.Runtime.Domain, context.Instance.Flow, context.Instance.Id.ToString(),
    "vnext-blob-s3", output, "converted.pdf", "application/pdf");
return new ScriptResponse { Data = new { convertedDocument = converted } };   // an x-storage path of the master schema
```

- **`ScriptFile.OpenRead()`** wraps the verified bytes in a new read-only, seekable stream on every call.
- **`PutFileAsync(domain, flow, instance, component, byte[] | Stream, name?, mimeType?)`** stores the bytes and returns a `ScriptStoredFile` in the persisted handle shape (`component`, `file`, `name`, `mimeType`, `size`, `eTag`, `owner`). `size` and `eTag` are computed from the bytes written. Placed at an `x-storage` path of the mapping or task output, it is a valid handle in the trusted swap and is kept as is. Rules: the domain must be served by this runtime; the component must be an `x-storage` binding of that flow (latest version) or in `FileStorage:AllowedBindings`; the size is capped by `FileStorage:Upload:MaxBytes`. A refusal or a store failure throws (the task fails like any helper failure). A stream that cannot report its length is buffered first.
- An object a script writes but no output keeps is an orphan, like any unreferenced object.

With the sandbox on, a script may use only the in-memory stream types; the file system stays closed:

| Allowed | Banned |
|---------|--------|
| `System.IO`: `Stream`, `MemoryStream`, `BufferedStream`, `BinaryReader`, `BinaryWriter`, `TextReader`, `TextWriter`, `StringReader`, `StringWriter`, `StreamReader`, `StreamWriter`, `SeekOrigin`, `IOException`, `EndOfStreamException`, `InvalidDataException` | `File`, `FileStream`, `FileInfo`, `Directory`, `Path`, `DriveInfo`, `UnmanagedMemoryStream`, pipes, memory-mapped files and the rest of `System.IO` |
| `System.IO.Compression`: `GZipStream`, `DeflateStream`, `BrotliStream`, `ZLibStream`, `CompressionLevel`, `CompressionMode`, `ZipArchive`, `ZipArchiveEntry`, `ZipArchiveMode` (the `System.IO.Compression` assembly must be granted) | `System.IO.Compression.ZipFile` |
| | `StreamReader(string path, …)` / `StreamWriter(string path, …)` (constructors that open a file by path) |

For the full ban list (including reflection and process-termination members) see [Scripting / Sandbox](/docs/configuration/scripting).

## Deleting and listing files

The runtime has no delete endpoint and never deletes an object. <sup>New</sup> v0.0.102 — A flow that owns retention deletes, reads or lists objects itself with a [Dapr Binding task](/docs/components/tasks/dapr-binding) (type `2`) on the store's Dapr binding component.

1. **Reach the component.** `x-storage` components are scoped to the orchestration app-id, while binding tasks run in the Execution service by default. Either set `Workflow:TaskInvocation:Modes:daprbinding = Local` (the task then runs from the orchestration sidecar; see [Task Invocation](/docs/configuration/task-invocation)), or scope the component to the Execution app-id too.
2. **Name the object.** In the input mapping, set the per-call shape on the task: `task.SetMetadata(new() { ["key"] = FileObjectKey(handle.file) })` (`bindings.aws.s3`; `fileName` for `bindings.localstorage`), and `task.SetOperation("delete" | "get" | "list")` / `task.SetData(…)` when the definition does not fix them. `FileObjectKey(file)` is `FileStorage:KeyPrefix` + file id (a non-GUID is refused).
3. **Read the answer.** The task's response reaches the output mapping: `Data` is the binding's body as JSON when it parses (e.g. `list`), else as text, else as base64 (`get` of a binary object); `Metadata["DataEncoding"]` says which; `Headers` holds the binding's response metadata. A failure carries the sidecar's reason (for example `couldn't find output binding …`) instead of the generic Dapr client message.
4. **Clear the field.** After a delete, set the field to `null` (an `updateData` or a mapping): a handle whose object is gone answers `503` on read.

**Retention pattern.** Retention tied to the instance ("delete seven days after completion") cannot run on the completed instance itself (a completed instance takes no transition). Either run a scheduled housekeeping flow that queries completed instances (`GetInstances`) and deletes their objects, or keep the instance in a retention state with a timeout before its finish.

## S3 operations note (aws-chunked)

The runtime never talks to a store directly: every write is a `create` on the component's Dapr binding. Since Dapr 1.17, `bindings.aws.s3` sends every upload over `https://` as `Content-Encoding: aws-chunked` with a CRC32 trailer. AWS S3, MinIO, Ceph, LocalStack, s3mock, moto and SeaweedFS decode it; a store that does not keeps the frame as the object (a 6265-byte PDF becomes a 6309-byte object). `AWS_REQUEST_CHECKSUM_CALCULATION=when_required` on the sidecar does **not** change this, and no component metadata does.

The runtime verifies such objects on read and serves a framed object whose payload matches its handle as the original ([Read integrity](#read-integrity)); it cannot store the object unframed. A consumer that reads the bucket directly (not through vNext) sees the frame. Options, in order of preference:

| Option | Effect |
|--------|--------|
| Use a store that decodes `aws-chunked` (enable trailer/streaming-signature support on it) | Objects are stored as the file; nothing else changes |
| Reach the store over `http://` inside a trusted network (`disableSSL: "true"`) | The SDK signs the full payload, no frame; traffic is unencrypted |
| Pin the orchestration sidecar to daprd 1.16.x (`dapr.io/sidecar-image`) | 1.16 uploads unframed; a stopgap that holds back every other Dapr fix |

<sup>New</sup> v0.0.102 — Objects are now written to S3 with `Content-Type` metadata (before, the store sent a `contentType` key that `bindings.aws.s3` does not read, so objects had no media type). Direct S3 readers (presigned URLs, consoles, lifecycle tooling) see the real type on new writes; `functions/file` was never affected, since it serves the handle's `mimeType`. Objects already stored keep the type they were written with.

## Limits

- **Body size:** base64 inflates bytes by about 4/3. Two limits apply and the smaller one wins: the orchestration host's Kestrel `MaxRequestBodySize` (**10 MiB** in appsettings; the raw-body buffer is also 10 MiB) and the Dapr sidecar's `--max-body-size` (**64 MiB**). Unless the host raises Kestrel's limit, the effective cap is **10 MiB**, i.e. about **7.5 MiB** of file. Exceeding it returns `413`. <sup>New</sup> v0.0.102 — For larger files declare the field with `transport: stream`; a [streamed upload](#streamed-upload-transport-stream) is bounded by `FileStorage:Upload:MaxBytes` (64 MiB), not by the JSON body limit.
- **No delete yet:** when a file is replaced or the field is cleared the old object stays in the store; the runtime does no delete/replace cleanup for now. A rolled-back operation can leave an orphaned object.
- **Only stored handles are readable:** a file is reachable only through a handle in instance data; a client cannot name a store or binding.
- **Task records are not protected:** if a mapping puts bytes into a task request, they are stored in the task record as-is (a developer decision).
- **Master schema without `$schema`:** <sup>New</sup> v0.0.102 — a master schema that declares no `$schema` is evaluated as Draft 2020-12, which ignores vocabulary keywords such as `x-storage`. Before, the schema published but the first write failed with a `500` **after** its files were already stored (leaving orphans). Declaring `$schema` is still recommended.
- **Do not reuse the master schema as a transition schema:** a transition schema validates the **write** shape, while an `x-storage` node in the master schema describes the persisted handle and cannot declare `content`. If the same schema is used on a transition, a strict (`additionalProperties: false`) node rejects the upload. Give transitions that carry file fields their own schema.

## Known issues

<sup>New</sup> v0.0.100 The runtime's `vnext-meta/known-issues.json` lists the following as open for `>=0.0.100` (no fixed version yet). The entries added with v0.0.102 are open for `>=0.0.102`.

| Issue (known-issue id) | Effect | What to do |
|------------------------|--------|-----------|
| Orphans on rollback (`file-store-orphans-on-rollback`) | The object is written to the store **before** the unit of work commits and before the transition is accepted. A later rollback or `409` (Busy, subflow completion window) leaves an unreferenced object; the runtime neither tracks nor collects it. | Apply a lifecycle (expiry) rule on the bucket/directory behind the binding, scoped with `FileStorage:KeyPrefix`. An orphan is harmless to instance data. |
| No delete (`file-store-no-delete`) | Clearing (`null`/absent) or replacing a field never deletes the previous object; there is no retention or garbage collection — every object ever stored for an instance stays in the store. | Manage retention with the store's own lifecycle rules. Do not change `FileStorage:KeyPrefix` after the first write, or stored objects become unreachable. |
| Bytes in task records (`file-in-task-record`) | Task records (`InstanceTask.Request` / `Response`) are not covered by the `x-storage` swap: a mapping that puts file bytes (e.g. a base64 string) into a task request or response stores them in the task record as authored. | Pass the handle, not the content, through mappings; read bytes with `ScriptBase.GetFileAsync` only where the task needs them and do not echo them into task responses. |
| Cross-domain references (`file-trusted-payload-cross-domain`) | The trusted-payload flag does not cross domains: Start/SubProcess trigger tasks, DirectTrigger and proxied SubFlow forwards that target another domain call its public endpoints, so a content-less handle in such a body is rejected there with `400` `Instance:100048`. | Send `content` (base64) rather than a handle in cross-domain bodies, or have the owning domain read the file with `ScriptBase.GetFileAsync`. |
| Seed data not offloaded (`file-seed-data-not-offloaded`) | Instance data appended from a definition's seed data passes no workflow to the write path, so `x-storage` content in seed data stays **inline** in instance data. | Do not put file content in seed data; upload it through a transition after the instance exists. |
| Overlapping async proxy revert (`file-async-proxy-overlapping-revert`) | With two overlapping async requests proxied through one parent to its active SubFlow, a failed forward's revert can clear the Busy stamp the other request set; the next child notification restores the parent's status. | Nothing needed in normal operation (self-heals). Clients should not fire overlapping async transitions at the same parent. |
| Missing object looks like an outage (`file-missing-object-503`) | Reading an object that no longer exists in the store (expired by a lifecycle rule or deleted by hand) returns `503` `Instance:100047`, indistinguishable from a store outage, because the Dapr binding reports both as an invocation error. | Do not expire objects still referenced by instance data. When a `503` persists for one file only, check the store for the object key (`FileStorage:KeyPrefix` + `file`). |
| Unclaimed streamed uploads (`file-staged-upload-orphans`) <sup>New</sup> v0.0.102 | A streamed upload that no `start` or transition claims before its ticket expires leaves its object in the store; the staging entry expires, the object does not. | Use the store's lifecycle rules, as for other `x-storage` orphans. |
| Dapr S3 binding frames TLS uploads (`dapr-s3-binding-frames-tls-uploads`) <sup>New</sup> v0.0.102 | On a daprd 1.17+ sidecar, `bindings.aws.s3` sends every `https` upload as `aws-chunked`; a store that does not decode it keeps the frame as the object. The runtime recovers such objects on read; a consumer reading the bucket directly sees the frame. `AWS_REQUEST_CHECKSUM_CALCULATION` on the sidecar and component metadata do not change it. | Use a store that decodes `aws-chunked`, an `http` endpoint in a trusted network, or pin the sidecar to daprd 1.16.x until components-contrib exposes the option (see [S3 operations note](#s3-operations-note-aws-chunked)). |
| Download response buffered by body logging (`file-download-response-buffered-by-body-logging`) <sup>New</sup> v0.0.102 | Aether's body-logging middleware copies every response not in `Telemetry:Logging:ExcludedPaths` into memory before sending it, even with body logging off, so a `functions/file` / `internal/file` download is held in memory once more after the binding `get`. | Adding the two routes (`/functions/file$`, `/internal/file$`) to `ExcludedPaths` removes the copy, but also their HTTP server spans, because Aether's tracing filter uses the same list. The shipped configuration keeps the spans; the fix belongs in Aether. |
| Duplicate member names (`file-duplicate-property-names`) | If an `x-storage` node repeats a member name (e.g. two `content` or `file` members), the outcome (swap, keep or reject) is undefined. | Send well-formed JSON without duplicate member names; standard JSON serializers never produce them. |

## Related

- [Schema Definition](/docs/how-to/view-consept/schema-tanimi) — the `x-storage` declaration, `x-roles`
- [Instance Data](../concepts/instance-data)
- [Built-in Functions → File Function](/docs/components/functions/built-in#file-function) — endpoint reference
- [Mappings → Reading a file (`GetFileAsync`)](/docs/components/mappings#reading-a-file-getfileasync) — reading a file from a script
- [Dapr Binding Task](/docs/components/tasks/dapr-binding) — deleting, reading and listing objects
- [Scripting / Sandbox](/docs/configuration/scripting) — allowed stream types and banned members in scripts
- [REST API](/docs/api-reference/rest-api) — error codes
- [Helm Chart](/docs/deployment/helm-chart) — the blob storage binding and `FileStorage` settings
