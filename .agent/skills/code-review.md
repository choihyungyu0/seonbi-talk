---
name: code-review
description: Review changes for correctness, scope, risk, and verification.
---

# Purpose

Catch behavioral regressions, risky scope expansion, missing tests, and incomplete verification.

# When to use

Use before commit, before final reporting, or when asked for a review.

# Steps

1. Inspect the diff.
2. Check for unrelated file changes.
3. Check for fallback removal, secret exposure, production URL changes, and dependency changes.
4. Confirm tests or fixtures cover changed logic.
5. Confirm verification commands match `docs/harness/verification-matrix.md`.

# Required verification

- Run relevant harness scripts.
- Run typecheck and lint for source changes.

# Reporting checklist

- Findings first, ordered by severity.
- Missing verification.
- Residual risk.
