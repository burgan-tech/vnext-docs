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
2. **The record shows a handle.** The runtime writes the bytes to the store, replaces the field with the handle and saves the record that way. The stored raw request body is also free of the bytes.
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

For the endpoint reference (authorization order, parameters) see [Built-in Functions → File Function](/docs/components/functions/built-in#file-function). To read the file server-side (in a mapping script) use `ScriptBase.GetFileAsync` — see [Mappings → Reading a file](/docs/components/mappings#reading-a-file-getfileasync).

## Status codes

| Code | Error code | When | What to do |
|------|------------|------|-----------|
| `400` | `Instance:100048` (`FileReferenceInvalid`) | `content` and `file` together; unknown `file` reference; a reference on `start`; invalid base64; missing/blank `file` query parameter on `functions/file` | Fix the request: `content` for a new file, the handle/`{file}` read from the record for an existing one. Retrying does not help. |
| `403` | — | `functions/file`: the state's `queryRoles` rejects the caller | An authorization problem; do not retry. |
| `404` | `Instance:100049` (`FileNotFound`) | `file` is not in this instance's stored data; or the file's path is hidden from the caller by `x-roles` | Verify the `owner` instance. A hidden path is deliberately indistinguishable from a missing file. |
| `409` | `InstanceBusy` | A forwarded transition arrived while a parent's subflow is finishing; or the target instance is busy | Retry the same request after a short wait. |
| `413` | — | The request body exceeds a size limit (Kestrel or sidecar) | Reduce the file size or split into several files. Retrying does not help. |
| `503` | `Instance:100047` (`FileStoreUnavailable`) | The blob store (binding) is unreachable on write or read; reading an object that no longer exists in the store also returns this code (see [Known issues](#known-issues)) | Retry with backoff. It returns synchronously, before any `202`; a failed `start` creates no instance and a failed transition leaves the record unchanged. |
| `503` | `Instance:100050` (`FileSchemaUnavailable`) | The flow's master schema cannot be loaded and the body carries an object with a `content` or `file` member (write), or a file is read through `functions/file` | Retry once the schema resolves. Nothing was applied; bodies without a `content`/`file` member are unaffected. |

When a parent has an active subflow, a transition sent to the parent is forwarded to the leaf and the file is written there; the client still receives the **parent's** id and the parent's mode (`202` when async, `200` when sync). The handle's `owner` is the writing (leaf) instance.

## Limits

- **Body size:** base64 inflates bytes by about 4/3. Two limits apply and the smaller one wins: the orchestration host's Kestrel `MaxRequestBodySize` (**10 MiB** in appsettings; the raw-body buffer is also 10 MiB) and the Dapr sidecar's `--max-body-size` (**64 MiB**). Unless the host raises Kestrel's limit, the effective cap is **10 MiB**, i.e. about **7.5 MiB** of file. Exceeding it returns `413`.
- **No delete yet:** when a file is replaced or the field is cleared the old object stays in the store; the runtime does no delete/replace cleanup for now. A rolled-back operation can leave an orphaned object.
- **Only stored handles are readable:** a file is reachable only through a handle in instance data; a client cannot name a store or binding.
- **Task records are not protected:** if a mapping puts bytes into a task request, they are stored in the task record as-is (a developer decision).
- **Do not reuse the master schema as a transition schema:** a transition schema validates the **write** shape, while an `x-storage` node in the master schema describes the persisted handle and cannot declare `content`. If the same schema is used on a transition, a strict (`additionalProperties: false`) node rejects the upload. Give transitions that carry file fields their own schema.

## Known issues

<sup>New</sup> v0.0.100 The runtime's `vnext-meta/known-issues.json` lists the following as open for `>=0.0.100` (no fixed version yet).

| Issue (known-issue id) | Effect | What to do |
|------------------------|--------|-----------|
| Orphans on rollback (`file-store-orphans-on-rollback`) | The object is written to the store **before** the unit of work commits and before the transition is accepted. A later rollback or `409` (Busy, subflow completion window) leaves an unreferenced object; the runtime neither tracks nor collects it. | Apply a lifecycle (expiry) rule on the bucket/directory behind the binding, scoped with `FileStorage:KeyPrefix`. An orphan is harmless to instance data. |
| No delete (`file-store-no-delete`) | Clearing (`null`/absent) or replacing a field never deletes the previous object; there is no retention or garbage collection — every object ever stored for an instance stays in the store. | Manage retention with the store's own lifecycle rules. Do not change `FileStorage:KeyPrefix` after the first write, or stored objects become unreachable. |
| Bytes in task records (`file-in-task-record`) | Task records (`InstanceTask.Request` / `Response`) are not covered by the `x-storage` swap: a mapping that puts file bytes (e.g. a base64 string) into a task request or response stores them in the task record as authored. | Pass the handle, not the content, through mappings; read bytes with `ScriptBase.GetFileAsync` only where the task needs them and do not echo them into task responses. |
| Cross-domain references (`file-trusted-payload-cross-domain`) | The trusted-payload flag does not cross domains: Start/SubProcess trigger tasks, DirectTrigger and proxied SubFlow forwards that target another domain call its public endpoints, so a content-less handle in such a body is rejected there with `400` `Instance:100048`. | Send `content` (base64) rather than a handle in cross-domain bodies, or have the owning domain read the file with `ScriptBase.GetFileAsync`. |
| Seed data not offloaded (`file-seed-data-not-offloaded`) | Instance data appended from a definition's seed data passes no workflow to the write path, so `x-storage` content in seed data stays **inline** in instance data. | Do not put file content in seed data; upload it through a transition after the instance exists. |
| Overlapping async proxy revert (`file-async-proxy-overlapping-revert`) | With two overlapping async requests proxied through one parent to its active SubFlow, a failed forward's revert can clear the Busy stamp the other request set; the next child notification restores the parent's status. | Nothing needed in normal operation (self-heals). Clients should not fire overlapping async transitions at the same parent. |
| Missing object looks like an outage (`file-missing-object-503`) | Reading an object that no longer exists in the store (expired by a lifecycle rule or deleted by hand) returns `503` `Instance:100047`, indistinguishable from a store outage, because the Dapr binding reports both as an invocation error. | Do not expire objects still referenced by instance data. When a `503` persists for one file only, check the store for the object key (`FileStorage:KeyPrefix` + `file`). |
| Duplicate member names (`file-duplicate-property-names`) | If an `x-storage` node repeats a member name (e.g. two `content` or `file` members), the outcome (swap, keep or reject) is undefined. | Send well-formed JSON without duplicate member names; standard JSON serializers never produce them. |

## Related

- [Schema Definition](/docs/how-to/view-consept/schema-tanimi) — the `x-storage` declaration, `x-roles`
- [Instance Data](../concepts/instance-data)
- [Built-in Functions → File Function](/docs/components/functions/built-in#file-function) — endpoint reference
- [Mappings → Reading a file (`GetFileAsync`)](/docs/components/mappings#reading-a-file-getfileasync) — reading a file from a script
- [REST API](/docs/api-reference/rest-api) — error codes
- [Helm Chart](/docs/deployment/helm-chart) — the blob storage binding and `FileStorage` settings
