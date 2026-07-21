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

A non-matching event returns 200 by design (no redelivery); mapping failures return 500 and are retried per resiliency policy; delivery to a non-event transition is rejected with `NotAnEventTransition`.

> 🚧 Full English translation is pending. See the [Turkish page](/docs/how-to/event-driven-workflows) for the complete contract, correlation rules, Dapr Subscription examples, runtime behavior table, and testing guide.

## Related

- [Workflow component](/docs/components/workflow) — the `event` field and `triggerType` enum
- [Interfaces → IEventMapping](/docs/components/interfaces)
- [Instance Filtering](/docs/how-to/instance-filtering)
