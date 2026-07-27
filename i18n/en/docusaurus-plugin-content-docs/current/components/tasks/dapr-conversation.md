---
sidebar_position: 15
title: Dapr Conversation Task
description: Task that invokes an LLM/AI provider through the Dapr Conversation building block
---

# Dapr Conversation Task (Type: `20`)

The Dapr Conversation Task (`type: "20"`) invokes an **LLM/AI provider** through Dapr's **Conversation building block**, giving workflows a **provider-agnostic** way to run prompts (OpenAI, Anthropic, AWS Bedrock, …) over the same Dapr sidecar used by the other Dapr task types.

The provider and its credentials live in a **domain-owned** Dapr `conversation` component (e.g. `openai`); the task only references that component name (`componentName`) and the messages (`inputs`). Required config: `componentName`. Optional: `inputs` (array of `role`/`content` messages), `parameters` (provider string parameters such as `model`, `maxTokens`), `metadata`, `contextId`, `temperature`, `scrubPII`, and `timeoutSeconds` (default 30). To add the runtime component, see [vnext-helm-charts #28](https://github.com/burgan-tech/vnext-helm-charts/pull/28).

> 🚧 Full English translation is pending. See the [Turkish page](/docs/components/tasks/dapr-conversation) for the complete configuration tables, message structure, mapping example, and response reference.
