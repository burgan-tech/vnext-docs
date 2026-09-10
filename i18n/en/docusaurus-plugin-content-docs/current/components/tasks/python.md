---
sidebar_position: 4
title: Python Task
description: Built-in trusted-code task with a main(input) contract, running CPython in the Execution service
---

# Python Task (Type: `23`)

:::note
Translation pending — the Turkish page is the source of truth.
:::

Python Task (type `23`, experimental, added in v0.0.88) is a built-in trusted-code task that sends a fixed JSON input to the Execution service, which runs it through CPython under one explicitly selected runtime: `pythonNet`, `process`, or `container`. The Python script must define exactly one entry point, `main(input)`; Orchestration `InputHandler`/`OutputHandler` mappings are not executed for this task type.

Configuration includes `script` (`NAT`/`B64` encoded inline code only — `REF` and filesystem paths are rejected), `executionMode`, `input` (any JSON value), and `timeoutSeconds` (default 30, capped by `Python:MaxTimeoutSeconds`, default 50). The return value must be strict JSON (`allow_nan=False`); NumPy/pandas values must be converted with `.item()`/`.tolist()`/`.to_dict()`. Default limits are 256 KiB of code, 2 MiB of input/output, and 32 KiB of captured stdout/stderr. The initial package set (NumPy 2.5.1, pandas 3.0.5, scikit-learn 1.9.0) is hash-locked; no runtime `pip` installs are possible.

The `@burgan-tech/vnext-schema@0.0.53` package does not yet recognize type `23` in its enum, so `npm run validate` rejects it while runtime publish and execution work fine. See [Python Configuration](../../configuration/python) for the full `Python:*` appsettings reference.
