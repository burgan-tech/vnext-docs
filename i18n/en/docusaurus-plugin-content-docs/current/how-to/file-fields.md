---
id: file-fields
title: File Fields (x-storage)
sidebar_label: File Fields
description: How a FilePicker field round-trips with the runtime — the x-storage write shape, the persisted handle, the echo rule, viewing through functions/file, status codes and limits
---

# File Fields (`x-storage`)

When a master-schema field carries `x-storage`, the bytes of a file sent to that field are **not** kept inside the instance data. The runtime writes them to a configured blob store (a Dapr output binding) and puts a small **handle** in the field's place. The client reads that handle as data, sends it back when editing the form, and downloads the file itself through `functions/file`. A field without `x-storage` behaves as before (bytes stay inline).

This page is for client developers. For declaring the field in the schema, see [Schema Definition](./view-consept/schema-definition) (Turkish).

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
| `Content-Type` | the stored `mimeType` |
| `ETag` | `"<eTag>"` (quoted) |
| `Accept-Ranges` | `bytes` |
| `Cache-Control` | `private, max-age=31536000, immutable` |
| `X-Content-Type-Options` | `nosniff` |
| `Content-Disposition` | `inline; filename*=UTF-8''…` |

- **Conditional request:** send `If-None-Match: "<eTag>"`; a match returns `304` without a store read. Because the `file` id is tied to its content, the response can be cached as `immutable`.
- **Range:** `Range: bytes=…` returns `206 Partial Content`; an unsatisfiable range returns `416`. The slice is taken in memory (the whole file is read from the store), so Range saves network traffic, not store reads.
- **HEAD:** returns headers only.

## Status codes

| Code | Error code | When | What to do |
|------|------------|------|-----------|
| `400` | `Instance:100048` (`FileReferenceInvalid`) | `content` and `file` together; unknown `file` reference; a reference on `start`; invalid base64 | Fix the request: `content` for a new file, the handle/`{file}` read from the record for an existing one. Retrying does not help. |
| `403` | — | `functions/file`: the state's `queryRoles` rejects the caller | An authorization problem; do not retry. |
| `404` | `Instance:100049` (`FileNotFound`) | `file` is not in this instance's stored data; or the file's path is hidden from the caller by `x-roles` | Verify the `owner` instance. A hidden path is deliberately indistinguishable from a missing file. |
| `409` | `InstanceBusy` | A forwarded transition arrived while a parent's subflow is finishing | Retry the same request after a short wait. |
| `503` | `Instance:100047` (`FileStoreUnavailable`) | The blob store (binding) is unreachable on write | Retry with backoff. It returns synchronously, before any `202`; a failed `start` creates no instance and a failed transition leaves the record unchanged. |

When a parent has an active subflow, a transition sent to the parent is forwarded to the leaf and the file is written there; the client still receives the **parent's** id and the parent's mode (`202` when async, `200` when sync). The handle's `owner` is the writing (leaf) instance.

## Limits

- **Body size:** base64 inflates bytes by about 33%. The orchestration sidecar's request body limit is **64 MiB** by default (`--max-body-size`); your environment may differ. Keep files under that limit.
- **No delete yet:** when a file is replaced or the field is cleared the old object stays in the store; the runtime does no delete/replace cleanup for now. A rolled-back operation can leave an orphaned object.
- **Only stored handles are readable:** a file is reachable only through a handle in instance data; a client cannot name a store or binding.
- **Task records are not protected:** if a mapping puts bytes into a task request, they are stored in the task record as-is (a developer decision).

## Related

- [Schema Definition](./view-consept/schema-definition) — the `x-storage` declaration, `x-roles`
- [Instance Data](../concepts/instance-data)
