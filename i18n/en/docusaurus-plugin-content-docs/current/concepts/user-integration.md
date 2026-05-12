---
sidebar_position: 8
title: User Integration
description: vNext's Backend-Driven View user interaction loop
---

# User Integration

The vNext platform models **user interaction** as a natural part of the workflow flow. **View** definitions are made at **state** or **transition** level within a process. The **vNext Client Workflow Manager SDK** orchestrates this, delivering the **correct view** and **data** to the user during state and transition cycles.

The **Backend-Driven View** approach **minimizes** mobile/web platform release cycles — UI changes ship with backend deploys only.

## Interaction Loop

```mermaid
flowchart TD
  Start(["Instance Start"]) --> StateFn["State Function<br/><i>client long-polling</i>"]

  StateFn --> StatusCheck{"status.code?"}
  StatusCheck -->|"A (Active)"| ViewCheck{"View needed?"}
  StatusCheck -->|"C (Completed)"| Done(["Process done"])

  ViewCheck -->|Yes| ViewFn["View Function<br/><i>fetch view definition</i>"]
  ViewCheck -->|No| Render

  ViewFn --> DataFn["Data Function<br/><i>if data is needed</i>"]
  DataFn --> Render["Render UI"]

  Render --> UserAction["User triggers a transition"]
  UserAction --> TransCheck{"Transition view<br/>exists?"}

  TransCheck -->|Yes| Modal["Modal / Popup"]
  TransCheck -->|No| Submit

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

## Step by Step

1. **Start instance**: `POST /api/v1/{domain}/workflows/{wf}/instances/start` (typically `sync=false`)
2. **Long-polling**: Client calls `GET /functions/state` and waits until `status.code = "A"` (Active)
3. **State response**: Once an active state is reached, the response includes the current state and whether a view is required
4. **View request**: If a view exists, the client fetches the view definition via `GET /functions/view`
5. **Data request**: If the view needs data, the client fetches via `GET /functions/data`
6. **Render**: The view is rendered with data
7. **Pre-transition check**: Before the user submits a transition, check whether a transition-specific view exists (popup/modal confirmation)
8. **Submit**: Transition is triggered via `PATCH /instances/{id}/transitions/{key}`
9. **Long-poll again**: Re-poll the State function for status changes
10. **End of process**: Loop ends when `status.code = "C"` (Completed)

## Validation

- The client uses form validation **annotations** if **Schema** definitions exist
- Real-time validation on the front-end; re-validation on submit at the backend
- See [Schema component](/docs/components/schema)

## Related

- [Async / Sync](/docs/how-to/async-sync) — why long-polling is needed
- [View component](/docs/components/view) — view definition
- [Built-in Functions](/docs/components/functions/built-in) — State / Data / View
- [Schema component](/docs/components/schema) — form validation
