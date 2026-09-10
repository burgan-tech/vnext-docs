---
sidebar_position: 7
title: Python Configuration
description: Python Task execution modes, limits, and container/Kubernetes settings on the Execution host
---

# Python Configuration

:::note
Translation pending — the Turkish page is the source of truth.
:::

The Execution host's `Python` appsettings section (added in v0.0.88) configures [Python Task](/docs/components/tasks/python) (type `23`) execution: `Enabled`, `DefaultMode`, `EnabledModes`, `MaxTimeoutSeconds` (default 50), code/input/output/stdout/stderr size limits, `AllowedModules` (a governance policy, not a security boundary), and per-mode sections `PythonNet`, `Process`, and `Container` (with a `Kubernetes` sub-section for the Kubernetes container driver).

A startup-validated timeout budget hierarchy applies: `Python:MaxTimeoutSeconds` must stay below `ExecutionApi:InvocationTimeoutSeconds`, which must stay below `WorkflowExecution:TransitionJobTimeoutSeconds`, which must stay below the chain lock lease. Violating this hierarchy fails the application at startup instead of surfacing as a production race window.

Kubernetes RBAC (ServiceAccount, Role, RoleBinding) for the Job/Pod/`pods/attach` permissions the Kubernetes container driver needs is provided by the `vnext-helm-charts` repository, not by this repo.
