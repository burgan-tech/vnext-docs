---
id: event-driven-workflows
title: Event-Driven Workflows
sidebar_label: Event-Driven Workflows
description: Starting workflow instances and triggering transitions with external pub/sub events
---

# Event-Driven Workflows

vNext can react to external pub/sub events in two independent ways:

1. **Start a new workflow instance** — the event is declared on the **workflow** (`attributes.event`), delivered with `?action=start`.
2. **Run a transition on an existing instance** — the event is declared on a **transition** (`transition.event` with `"triggerType": 3`), delivered with `?action=transition&transitionKey=<key>`. Event transitions are supported on state transitions and shared transitions only.

The mapping script implements the **`IEventMapping`** interface and returns an `EventMappingResult` — an `InstanceKey` + `Body`, or (when the payload carries no key) a `Selector` built with the fluent `InstanceQuery` and terminated with `First()`/`Last()`. CloudEvent envelopes are unwrapped before the script runs; selectors are automatically scoped to the target workflow.

Delivery infrastructure is **domain-owned**: a single generic runtime endpoint (`POST /api/v1/{domain}/workflows/{workflow}/instances/events`) receives everything, while topics, Dapr Subscription YAMLs, and the pub/sub component live with the domain — shipping a new event needs no runtime redeploy. The [vnext helm chart](https://github.com/burgan-tech/vnext-helm-charts/pull/25) supports `global.pubsubComponents` / `global.subscriptionComponents` values for rendering the Dapr resources.

**Runtime topic names.** <sup>New</sup> v0.0.100 — every topic the runtime uses for its own events (outbox, inbox, SubFlow notifications) is `vnext.{APP_DOMAIN}.{environment}.{event}.v{n}`, where `{environment}` is `ASPNETCORE_ENVIRONMENT` lower-cased (unset means `production`) — for example `vnext.core.production.instance.sub.completed.v1`. The events are `instance.canceled`, `instance.canceled.child`, `instance.completed.cleanup`, `instance.faulted.child`, `instance.faulted.cleanup`, `instance.sub.canceled`, `instance.sub.completed`, `instance.sub.faulted`, `instance.sub.state.changed`, `transition.continuation.requested` and the outbox wakeup `aether.outbox.wakeup`. The prefix exists for the Kafka ACL, which grants each domain's user only `vnext.{domain}.*`. All runtime topic names change in v0.0.100: messages left on the old topics are not consumed and outbox rows keep the topic name they were written with, so **drain the outbox before rolling out**.

Topics a domain authors itself (a [DaprPubSub Task](/docs/components/tasks/dapr-pubsub)'s `topic`, a domain-owned Dapr `Subscription`) are used verbatim — the runtime adds no prefix. Under Kafka they must follow `vnext.{domain}.*` (for example `vnext.my-domain.production.order-flow`) or be granted to the domain explicitly.

A non-matching event returns 200 by design (no redelivery); mapping failures return 500 and are retried per resiliency policy; delivery to a non-event transition is rejected with `NotAnEventTransition`.

> 🚧 Full English translation is pending. See the [Turkish page](/docs/how-to/event-driven-workflows) for the complete contract, correlation rules, Dapr Subscription examples, runtime behavior table, and testing guide.

## Related

- [Workflow component](/docs/components/workflow) — the `event` field and `triggerType` enum
- [Interfaces → IEventMapping](/docs/components/interfaces)
- [Instance Filtering](/docs/how-to/instance-filtering)
