---
sidebar_position: 16
title: Fan-Out Task
description: Task that runs a referenced inner task once per item of a runtime-resolved collection, in parallel, and joins the outcomes into a single write
---

# Fan-Out Task (Type: `21`)

The Fan-Out Task resolves a collection from instance data **at runtime**, runs a referenced **inner task** once per item of that collection **in parallel**, then joins the per-item outcomes into **one** task result and **one** instance-data write.

It exists for the parallelism a workflow author cannot express at design time: the item count comes from **data**, not from the workflow definition — an array of documents to sign, a list of recipients to notify, a batch of accounts to reconcile.

:::tip[You do not need Fan-Out for static parallelism]
Tasks sharing the same `order` value, whose number is **fixed and known** in the definition, already run in parallel (see [Tasks Overview → Execution Order](/docs/components/tasks/)). Reach for Fan-Out only when the item count comes from **data**.
:::

:::info[Schema support since v0.0.53]
Since `@burgan-tech/vnext-schema@0.0.53` (shipped with runtime images from v0.0.85 on), the `task-definition.schema.json`'s `attributes.type` enum **includes** `21`; `npm run validate` accepts fan-out task definitions. Domains on an older schema package may still see `npm run validate` reject the definition — `publish` and runtime execution work fine either way.
:::

## When NOT to use it

- **The downstream integration has a batch endpoint.** If the service you are calling can take N items in one request, that single call is cheaper and more consistent than N parallel calls through the fan-out machinery (N journal rows, N task-engine invocations, N DI scopes). Reach for Fan-Out when the target genuinely has no batch API, or when the "items" are heterogeneous workflow-internal work (e.g. one `SubProcess` per item) rather than one HTTP call.
- **You need one item's state to affect a later item.** Items run concurrently and independently; there is **no** ordering guarantee between item *executions* (only the final result list is re-sorted by index). A pipeline where item 2 depends on item 1's output does not fit fan-out.
- **You need per-item writes to instance data as items complete.** Fan-out is **single-writer** by design (see [§ The single-write invariant](#the-single-write-invariant-and-why-item-handlers-must-be-pure)). If you need a running counter or streaming progress visible before the batch finishes, this is not the right primitive.

## Task Definition

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

## Configuration Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `mode` | string | No | `"inline"` | **Only** `"inline"` is accepted in this phase; any other value fails task parsing. `"durable"` is **reserved** in the schema and rejected at parse time — the field exists now so introducing durable mode later is not a breaking schema change |
| `itemsPath` | string | No* | none | A `"$."`-rooted **dot-path subset** of JSONPath (property navigation only — **no** filters, wildcards, indices or slices). Parsing fails if it does not start with `"$."`. **Mutually exclusive** with the mapping's `ItemSelector`: configuring both, or neither, is a **runtime** error (the executor checks it, not the JSON schema). A missing path (or any absent intermediate segment) resolves to an **empty batch**, not an error; a path resolving to a non-array value throws |
| `itemAlias` | string | No | none | A readability label for one item (`"document"`, `"payment"`). Surfaced as a structured field on the `FanOutBatchStarted` log line and as the `vnext.fanout.item.alias` tag on every item span; when unset, the neutral label `"item"` is substituted. It plays **no role in input binding** — the default binding sets the branch context's raw `Body` regardless of this value |
| `task` | object | **Yes** | — | Reference to the inner task: `key`, `domain`, `flow`, `version` — **all four required**. Resolved **once per batch** (component cache / task factory) and cloned per item; never re-resolved per item. If the referenced task's type is `21` (Fan-Out itself), the executor rejects the batch before running any item |
| `execution.maxDegreeOfParallelism` | integer | No | `4` | Batch-local concurrency cap (`SemaphoreSlim`). Must be `>= 1`. Deliberately low by default: an unbounded fan-out overwhelms whatever the inner task calls |
| `execution.itemTimeoutSeconds` | integer | No | `30` | Per-item deadline. Must be `>= 1` and `<= batchTimeoutSeconds` |
| `execution.batchTimeoutSeconds` | integer | No | `120` | Whole-batch deadline. Must be `>= 1`. Items still running when it fires are cancelled, counted as `FanOut:BatchTimeout` failures, and `FanOutResult.TimedOut` becomes `true` |
| `join.policy` | string | No | `"allSettled"` | One of `all` / `allSettled` / `quorum` / `firstSuccess` — see [§ Join Policy](#join-policy) |
| `join.minSuccess` | integer | Conditional | none | **Required** and `>= 1` when `policy` is `quorum`; parsing fails otherwise. Ignored (with no warning today) for the other policies |
| `join.resultKey` | string | No | `"fanOutResults"` | Instance-data key the **default output packaging** writes item results under. Applies whenever the default packaging is in play: the task ships no mapping, **or** its mapping does not override `OutputHandler`. Ignored once a mapping overrides `OutputHandler` — that handler's data is the output, keys and all |
| `join.ordered` | boolean | No | `true` | Accepted for forward compatibility with a future durable mode that may stream results in completion order. **In inline mode it is a no-op** — item results are always returned sorted by `Index`, and the executor never reads this flag |
| `errorBoundary` | object | No | none | A normal `ErrorBoundary` (`onError` rules: `action`, `errorCodes`/`errorTypes`, `priority`, `retryPolicy`, `logOnly`) applied **independently to every item** through the **same** engine machinery a state or transition error boundary uses. A retry-exhausted item becomes one `Failed` entry in the result set; it does not, by itself, stop the batch — the join policy decides that |

\* Exactly **one** of `itemsPath` or the mapping's `ItemSelector` must be provided.

## Join Policy

The join policy determines how per-item outcomes become the task's own success or failure.

| `join.policy` | Succeeds when | Empty batch (0 items) |
|---|---|---|
| `all` | Every item succeeded **and** the batch did not time out. The moment the first item fails, the remaining items are cancelled via early-stop | **Succeeds** (vacuously — with no items, no failure is possible) |
| `allSettled` | **Always.** Partial failure is **data**, not an error — the flow branches on the result summary. Succeeds even if the batch timed out | **Succeeds** |
| `quorum` | `succeeded >= minSuccess`, regardless of `timedOut` | **Fails.** `succeeded` is 0, which can never clear a threshold of `>= 1` |
| `firstSuccess` | At least one item succeeded (`succeeded >= 1`); the rest are cancelled via early-stop on the first success. Judges purely on success count, regardless of `timedOut` | **Fails**, for the same reason as `quorum`: `firstSuccess` is definitionally `quorum(minSuccess=1)`, and the two must never diverge on the same input |

:::warning[An empty batch fails the threshold policies]
`all` and `allSettled` **succeed** on an empty batch; `quorum` and `firstSuccess` **fail**. Do not pick a threshold policy in a flow where the collection can legitimately be empty.
:::

Notes:

- The Fan-Out task's own success/failure is an **ordinary task outcome** inside its own transition — a failed join runs the workflow's normal Task → State → Global error boundary chain. Fan-out introduces no new error-boundary concept at that level.
- A failed join (`all` / `quorum` / `firstSuccess` not met) **still carries its full result data** on the task's output: a caller branching on which items failed needs that data in instance data even when the task itself is marked failed.
- This is exactly why `allSettled` is the expected common policy — it lets you inspect `{resultKey}Summary` afterwards from an auto-transition condition; see [§ Branching on partial failure](#error-codes-and-branching-on-partial-failure).

## `IFanOutMapping` — the mapping contract

Authored like any other mapping: a `.csx` script the runtime compiles, referenced from the task's `mapping` field.

```csharp
public interface IFanOutMapping
{
    // OPTIONAL. Only implement this when NOT using itemsPath.
    // Default returns null = "use itemsPath".
    Task<IEnumerable<dynamic>?> ItemSelector(ScriptContext context)
        => Task.FromResult<IEnumerable<dynamic>?>(null);

    // REQUIRED — the only abstract member. Called once per item, on that item's own
    // isolated branch context. Mutates the CLONED inner task directly — this is how a
    // per-item HTTP URL, SOAP envelope, etc. is shaped. The returned ScriptResponse is
    // audit data only; it is NOT merged into instance data.
    Task<ScriptResponse> ItemInputHandler(WorkflowTask task, ScriptContext context, FanOutItem item);

    // OPTIONAL. Called EXACTLY ONCE per batch, after every item has settled. This is the
    // batch's single write point: the returned ScriptResponse.Data becomes the Fan-Out
    // task's output and is merged into instance data as one patch.
    // Default returns null = "use the runtime's default output packaging".
    Task<ScriptResponse?> OutputHandler(ScriptContext context, FanOutResult result);
}
```

Supporting types:

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

There is **no `Attempts` field** on `FanOutItemResult` — the engine's retry count is not surfaced through the result set; attempt visibility lives in the item's `InstanceTask` journal row and in retry span events.

**How `ItemKey` is derived:** for an item object, its `id` string property if present, else its `key` string property, else the item's zero-based index as a string. This applies **uniformly** whether the item came from `itemsPath` (a `JsonElement`) or from `ItemSelector` (a `JsonElement`, an `ExpandoObject`/`IDictionary<string,object?>`, or an arbitrary CLR object read via reflection — e.g. an anonymous type a `.csx` selector returns directly).

### Override only what you need

Two of the three members carry a default implementation, and in both the `null` return means *"I did not override this — use the runtime's behaviour"*:

| Member | Omit it and you get | Override it when |
|---|---|---|
| `ItemSelector` | the task's `itemsPath` | the collection is **computed**, not read from a fixed path |
| `ItemInputHandler` | *(cannot be omitted)* | always — see below |
| `OutputHandler` | the **default output packaging**, byte-for-byte the shape a task shipping no mapping at all produces | you want your own output shape (a summary, failed keys, a domain-specific projection) |

The combinations are free: bind input only, select items only, both, or all three. In particular **overriding input binding does not cost you the default output** — the common case (a fan-out over an HTTP inner task, which *requires* an `ItemInputHandler` because only a mapping can mutate the cloned task's URL/body) is a mapping with exactly one member.

Two details worth knowing:

- **The fallback signal is a `null` *response*, not a null `Data`.** An overriding handler that runs and deliberately returns `new ScriptResponse { Data = null }` **replaces** the default with nothing. Only *not overriding* (or explicitly returning `null`) reaches the default packaging.
- **A handler that THROWS does not fall back.** The batch fails with `FanOut task output handler failed: …` and no data. Substituting the default there would hand the flow a shape its author never wrote and its downstream mappings do not expect.

`ItemInputHandler` is deliberately the odd one out. It has no return channel that could signal "not overridden" — the executor keeps the response it returns as audit data — so a default would have to *silently perform* the flat `SetBody(item.Value)` binding. An author who mistypes the member name or signature in a `.csx` would then get a batch that compiles, runs, and fires N identical **unbound** requests at the inner task's authored endpoint. Keeping it abstract turns that mistake into a **compile error**.

## Example 1 — `itemsPath` + a `SubProcess` inner task

Production usage: in a contract flow, one subprocess (`SubProcessTask`, type `14`) is launched per document under `documents.online`. The example below is a simplified form of the real mapping.

Task definition:

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
    // Binds one document onto its OWN clone of the SubProcessTask. Pure with respect to
    // instance data: it mutates only the cloned task, never the context.
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

        // Deterministic key: (parent instance, document index). A duplicate dispatch targets the
        // SAME child; the runtime's strict idempotency answers 409 and the inner task's
        // acceptedStatusCodes:["409"] absorbs it as success.
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

        // Audit only — an item handler's ScriptResponse is never merged into instance data.
        return Task.FromResult(new ScriptResponse());
    }

    // The batch's ONE write: stamps every launched child onto its document and rebuilds the
    // tracking list from the whole result set at once.
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

:::tip[Why the single write is more than a speed story]
This batch replaced a serial `$self` loop. The old loop wrote the tracking list **once per launch**, so two writes could interleave and drop an id (the classic lost update). With fan-out there is one writer and one write: the list is assembled from the whole result set at once, so the race has no window to occur in.
:::

## Example 2 — `ItemSelector` + a `DirectTrigger` inner task

In the same production flow, the batch that finalizes (or force-cancels) every subprocess. The target list is **computed** — online documents, then offline documents, then ids present only in the tracking list; deduped, array order preserved — which cannot be expressed as an `itemsPath`, so `ItemSelector` produces it. `itemsPath` is **not** configured.

Task definition — note the absent `itemsPath` and the per-item error boundary:

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

That boundary is an `Ignore` rule (`action: 3`) and its rationale is explicit: a target that is already final, unreachable or locked **must not stop the batch**. There is deliberately **no** `"*"` rule — an unexpected error still surfaces, and the output handler flags it as `unexpected`.

Mapping:

```csharp title="FanOutFinalizeSubprocessesMapping.csx"
public class FanOutFinalizeSubprocessesMapping : ScriptBase, IFanOutMapping
{
    // Produces the ordered, deduped target list. Each item carries the subprocess id as `id` —
    // the runtime's key extractor reads that property, so ItemKey becomes the instance id and
    // every log line, span and record is addressable by it for free.
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

    // Points one clone of the DirectTriggerTask at one subprocess.
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

    // The batch's ONE write: derives the dead-letter list from the REAL per-item outcomes.
    public Task<ScriptResponse?> OutputHandler(ScriptContext context, FanOutResult result)
    {
        var skipped = new List<object>();
        var unexpected = 0;

        foreach (var item in result.Items)
        {
            if (item.IsSuccess) continue;

            // 4xx/409 are the expected, ignorable outcomes. Anything else is unexpected and gets
            // flagged — because with allSettled it no longer aborts the parent by itself.
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

:::tip[The visibility this batch buys]
The serial loop **could not see** whether a trigger had succeeded: the cursor task ran after the trigger and, under an `Ignore` boundary, could not rely on the failed task's data being merged. It therefore inferred success from a "proof pair" and deliberately over-reported. Fan-out hands the real per-item outcome (`IsSuccess` + `ErrorCode`) straight to `OutputHandler`, so the dead-letter list is derived from **what actually happened** — it neither over-reports nor guesses.
:::

## The zero-script path and its real limitation

You can skip the mapping entirely when:

- `itemsPath` selects the collection (no `ItemSelector` needed), **and**
- the inner task can consume the raw item value from the branch context's body (e.g. a `ScriptTask` reading `context.Body`), **and**
- the default output shape is acceptable.

With no mapping, the executor:

- **Input**: sets the per-item branch context's body directly — `branch.SetBody(item.Value)` — and nothing else. It does **not** wrap the value under `Data.{itemAlias}` or any other alias-qualified path, regardless of whether `itemAlias` is configured.
- **Output**: writes item results under `join.resultKey` as a list of `{ index, itemKey, isSuccess, data, errorCode, errorMessage, durationMs }`, plus a `{resultKey}Summary` object `{ total, succeeded, failed, timedOut }`. This is the **default packaging**, and it is not exclusive to the zero-script path — a mapping that leaves `OutputHandler` unoverridden gets the identical shape from the identical code.

:::warning[The real limitation: `SetBody` only reaches inner tasks that read the branch body]
Task types whose **own config** must change per item — an `HttpTask`'s URL or templated body, a `SoapTask`'s envelope, a `DaprServiceTask`'s method — are **not shaped by `SetBody` at all**, because those fields live on the cloned task instance, not on the script context body. Any inner task needing that kind of per-item config mutation **requires** an `ItemInputHandler` that mutates the cloned `WorkflowTask` directly.

Needing a mapping for that reason costs you **nothing** on the output side: the **Output** bullet above describes the packaging you keep as long as the mapping does not override `OutputHandler` — same implementation, same shape, same `join.resultKey`.
:::

## The single-write invariant and why item handlers must be pure

Every item runs on its **own** isolated branch context (`ScriptContext.CreateParallelBranch()`) and its **own** DI scope (`IServiceScopeFactory.CreateAsyncScope()`) — mirroring the isolation static parallel task groups already use, with a private EF `DbContext` per item, since the change tracker is not thread-safe. The item runs through the **full** task engine — its own retry loop, its own per-item error boundary, its own `InstanceTask` journal row keyed `{fanOutTaskKey}#{index}` — with one flag flipped: `TaskEngineExecutionOptions.SuppressDataApply = true`. That flag is what stops the item's own output from ever reaching instance data.

The item's branch context is **discarded**, never merged back with `ScriptContext.MergeParallelBranch()`. Merging would collide: N items reusing the same inner task's key inside the shared `TaskResponse` dictionary would trip the duplicate-key guard. Fan-out deliberately does not use that mechanism — it builds its own aggregate (`FanOutResult`) instead.

:::warning[`ItemInputHandler` must be PURE with respect to instance data]
`ItemInputHandler` runs N times concurrently, each on a context that is **thrown away**, so any write it attempted would either be lost or race against its siblings. Do not write to instance data; do not keep shared mutable state across items.

`OutputHandler` is the **only** call in the whole batch whose returned `ScriptResponse.Data` becomes the Fan-Out task's real output — merged into instance data **exactly once**, through the same standard task-output path every other task uses. Leaving it unoverridden does not weaken that: the default packaging takes its place at the same single point, after every item has settled.

**One Fan-Out task execution ⇒ one `InstanceData` patch**, no matter the batch size. The per-item journal rows give you the audit trail without multiplying the write.
:::

## Concurrency and the two-level bulkhead

Two independent caps apply, acquired in this order:

1. **Batch-local**: `execution.maxDegreeOfParallelism` (default `4`) — a plain `SemaphoreSlim` scoped to this one batch.
2. **Process-wide**: [`Workflow:FanOut:MaxConcurrentItems`](../../configuration/workflow-execution) (default `64`) — one singleton `SemaphoreSlim` shared by **every** fan-out batch running in the process, across every instance and workflow.

Effective concurrency for any one item is `min(the batch's remaining maxDop slots, remaining global slots)`.

:::tip[Why the global bulkhead exists: 100 instances × maxDop 5 = 500 calls]
The global cap is what stops **N concurrently-running instances** from multiplying into `N × maxDegreeOfParallelism` simultaneous downstream calls: 100 instances each running a `maxDegreeOfParallelism: 5` fan-out at the same moment is **500 potential concurrent calls** to whatever the inner task hits. The global bulkhead caps the process-wide total at `MaxConcurrentItems` regardless.
:::

`MaxConcurrentItems` is validated **at startup** (`ValidateDataAnnotations().ValidateOnStart()` with `[Range(1, int.MaxValue)]`): a misconfigured `0` would deadlock every fan-out batch in the process on its first item, so it **fails the boot** instead of hanging silently later.

There is **no distributed / domain-level cap** — the bulkhead is per-process. A dedicated distributed counter was considered and deliberately left out of scope: it would put a network round trip's latency on every single item.

## Error codes and branching on partial failure

The codes below are a **public contract** — workflow authors branch on these strings in output handlers, auto-transition conditions and error-boundary rules:

| Code | Meaning |
|---|---|
| `FanOut:ItemTimeout` | The item exceeded its own `itemTimeoutSeconds`. Takes **priority** over the causes below — a slow item that also happened to be caught by a sibling's early stop is still reported as its own timeout, not as "cancelled" |
| `FanOut:BatchTimeout` | The item was cut short because the batch as a whole hit `batchTimeoutSeconds` |
| `FanOut:ItemCancelled` | The item was cancelled by the join policy's early stop — `firstSuccess` already succeeded, or `all` already failed, and this item was still running |
| `FanOut:ItemNotStarted` | The item was cancelled while still queueing for a concurrency slot, with no deadline or early stop to explain it |
| `FanOut:ItemFailed` | Fallback: the item's inner task failed (or threw) with no more specific fan-out-level code — the inner task's own error code, when it has one, **passes through unchanged** instead |

### The recommended partial-failure pattern

1. Use `join.policy: "allSettled"` so the Fan-Out task itself always succeeds.
2. Write `{resultKey}Summary.{total,succeeded,failed,timedOut}` into instance data (or let the default output write it).
3. Let the transition's auto-transition step ([`RunAutomaticTransitionsStep`](../../concepts/transition-pipeline), order `80`) evaluate a condition against that summary — e.g. `failed > 0` routes to a `partial-failure` state, `failed == 0` continues the happy path.

The platform does not decide this for you; it is a workflow-design choice every time.

## Observability

Where to look when a batch runs slow:

### Logs

`WorkflowLogs.cs`, EventId block `101xx`:

| Log | Level | Content |
|---|---|---|
| `FanOutBatchStarted` | Information | task key, item count, `itemAlias` (or the neutral `"item"` when unset), `maxDegreeOfParallelism`, join policy, instance id |
| `FanOutItemFailed` | Warning | one per failed item — item key, index, error code. A failed item is a recoverable outcome the join policy decides on, so it is **not** `Error` |
| `FanOutBatchCompleted` | Information | total / succeeded / failed / duration |
| `FanOutBatchTimedOut` | Warning | how many items had settled before the deadline cut the rest short |
| `FanOutBulkheadSaturated` | Warning | emitted **at most once per batch** — the first time an item has to wait for the **global** bulkhead rather than the batch's own `maxDegreeOfParallelism` |

### Metrics (Prometheus)

Batch-level **only**, with `task_key` and `workflow` labels:

| Metric | Type | Meaning |
|---|---|---|
| `workflow_fanout_batch_size` | histogram | items per batch |
| `workflow_fanout_batch_duration_seconds` | histogram | whole-batch wall clock, queueing included |
| `workflow_fanout_item_failures_total` | counter | incremented **once per batch** by the batch's failed count, not once per item |

There is **no per-item duration metric**: an item is a full task execution through the engine, so its duration is already captured by the engine's own generic per-task duration metric under the **inner task's own key**. There is also **no live concurrency/saturation gauge** — bulkhead pressure is visible only through the once-per-batch `FanOutBulkheadSaturated` log line, not through a metric you can graph continuously.

### Spans

`ActivitySource("BBT.Workflow.Tasks")`; **always on since v0.0.87** (the earlier verbose-tracing requirement — `AetherTracingRuntime.IsVerbose` — was removed). Each item gets its own `FanOut.Item` child span:

- The span is opened **before** the item waits for either concurrency gate.
- It is tagged `vnext.fanout.item.key`, `vnext.fanout.item.index` and `vnext.fanout.item.alias` (the configured `itemAlias`, or the neutral `"item"` when unset) immediately.
- `vnext.fanout.item.queue_wait_ms` is added once its slots are acquired — so the trace **distinguishes** "queued behind the bulkhead" from "the item itself is slow".
- The span's display name is rewritten to `FanOut.Item[{index}] {itemKey}` after the inner engine call renames `Activity.Current` in place, so N sibling items do not all show the same generic task name in the trace.

:::tip[Straggler detection]
There is **no** built-in metric that computes it. The pattern the design intends is `max(item duration) / p50(item duration)` read off the per-item spans under one batch's trace — a fan-out batch's total time is dominated by its single slowest item, so that ratio is the number to look at when a batch runs long. Today that means querying the trace backend by the batch's `task.key` tag and the `FanOut.Item` span name, not reading a ready-made PromQL series.
:::

## Validation

Split across two layers:

- **Definition time (fail-fast, `FanOutTask.Configure`)**: `mode` restricted to `"inline"`; `itemsPath` must start with `"$."` when present; all four fields of the `task` reference required; `maxDegreeOfParallelism >= 1`; timeouts positive and `itemTimeoutSeconds <= batchTimeoutSeconds`; `join.policy` one of the four valid values; `quorum` requires `minSuccess >= 1`.
- **Runtime (executor preflight, cross-component)**: the `itemsPath` XOR `ItemSelector` check (it needs the mapping compiled first, so it cannot be a pure JSON-schema rule) and the nested fan-out rejection (it needs the inner task's resolved type). `WorkflowValidator` is **not** involved — Fan-Out's config lives inside the task component, not the workflow document.

## Author-beware

- **Nested fan-out is rejected.** If the referenced inner `task` resolves to another Fan-Out task (type `21`), the executor fails the batch before running any item. This is not a style preference: a nested batch would **deadlock** against the *same* global bulkhead — the outer batch's items would hold every slot they acquired while their own inner items queue for a slot only an outer item releasing could free.
- **`HumanTask` and `TimerTask` inner tasks are legal but almost certainly wrong.** The inner task type is deliberately unrestricted — no validator rejects them. Running either inline, N times in parallel, blocks the fan-out's per-item execution on something that is not designed to complete inside a bounded `itemTimeoutSeconds`/`batchTimeoutSeconds` window. Nothing stops you from configuring it; nothing about it will work the way you expect.
- **`join.ordered: false` is accepted but is a no-op in inline mode.** Results are always returned sorted by item index. The field exists for forward schema compatibility with a future durable mode that may stream results in completion order.
- **`mode: "durable"` is reserved and rejected.** Only `"inline"` parses today; the field exists in the schema now specifically so introducing durable mode later is not a breaking schema change.
- **`itemAlias` is a reporting label only — it never touches input binding.** Renaming it can change what an operator reads; it can **never** change what the inner task's script receives.

## Measured gain in production

Fan-out replaced serial `$self` loops in a contract approval flow. The old loop spent one full state hop per subprocess, each hop carrying a rule evaluation, a transition record, a remote call and its own instance-data write.

The measured difference on the launch loop: **3 sequential `SubProcess` launches (~3 s) → one parallel batch (~0.6 s)**.

## Related

- [Tasks Overview](/docs/components/tasks/) — task types and the reference mechanism
- [Trigger Task Types](/docs/components/tasks/trigger) — `SubProcessTask` (type `14`) and `DirectTriggerTask` (type `12`); the inner tasks of the two examples above
- [Error Handling](/docs/how-to/error-handling) — `errorBoundary` rules, `action` values and retry policies
- [Instance Data](/docs/concepts/instance-data) — task output versioning and patch semantics
- [Mappings](/docs/components/mappings) — authoring `.csx` mappings and the `ScriptContext`
- Runtime doc: [fan-out-task.md (vnext)](https://github.com/burgan-tech/vnext/blob/master/docs/domain/fan-out-task.md)
- Schema source: [task-definition.schema.json (vnext-schema)](https://github.com/burgan-tech/vnext-schema/blob/master/schemas/task-definition.schema.json)
- Example scenario: [`fan-out-config-matrix` (vnext-example)](https://github.com/burgan-tech/vnext-example/tree/master/core/Workflows/fan-out-config-matrix) — integration scenario covering all four `join.policy` values, the empty-batch rule, `mode: "durable"` rejection, and per-item `errorBoundary`
