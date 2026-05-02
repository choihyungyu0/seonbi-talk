---
name: fix-expo-runtime-error
description: Fix Expo runtime errors without masking root causes.
---

# Purpose

Resolve Expo runtime failures with a clear reproduction, root-cause hypothesis, and verification path.

# When to use

Use for Expo bundling, module resolution, runtime, WebView, environment, or API-related errors.

# Steps

1. Capture the exact error message.
2. Identify whether the error is bundling, module resolution, runtime, WebView, env, or API-related.
3. Reproduce with the smallest path.
4. Check whether recent changes touched dependencies, env, routing, or WebView.
5. Avoid random dependency upgrades.
6. Preserve fallback UI.
7. Run typecheck and lint.
8. Run Expo manually only when runtime behavior changed.
9. Report what was verified and what still needs device testing.

# Required verification

- `npx.cmd tsc --noEmit`
- `npm.cmd run lint`
- `npx.cmd expo start -c` when runtime verification is required.

# Reporting checklist

- Exact error captured.
- Root cause or current hypothesis.
- Commands run and results.
- Device/browser coverage.
- Remaining runtime risk.
