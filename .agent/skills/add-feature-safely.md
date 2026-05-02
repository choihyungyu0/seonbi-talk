---
name: add-feature-safely
description: Add a feature without breaking existing SafeExit flows.
---

# Purpose

Deliver the smallest useful feature while preserving current behavior and fallback safety paths.

# When to use

Use for new UI, data, map, API, or workflow changes.

# Steps

1. Restate the feature and identify the smallest useful version.
2. Identify files likely to change.
3. Check `docs/harness/verification-matrix.md`.
4. Preserve existing user-facing behavior.
5. Do not remove fallback logic.
6. Do not change unrelated files.
7. Add tests or fixtures if business logic changes.
8. Run required verification.
9. Report changed files and risks.

# Required verification

- `npx.cmd tsc --noEmit`
- `npm.cmd run lint`
- Tests if logic changed.
- Visual/manual check if UI changed.

# Reporting checklist

- Files changed.
- Behavior preserved or intentionally changed.
- Verification run.
- Risks and follow-up.
