---
name: write-tests
description: Add focused tests or fixtures for changed logic.
---

# Purpose

Protect behavior around data transformation, fallbacks, public-data parsing, and utility logic.

# When to use

Use when changing hooks, utilities, data parsers, Supabase/API contracts, or fallback behavior.

# Steps

1. Identify the behavior that can regress.
2. Add the smallest test or fixture that proves it.
3. Include failure and fallback cases.
4. Avoid snapshot-only coverage for business logic.
5. Run targeted tests.

# Required verification

- Targeted test command.
- Typecheck and lint when TypeScript source changed.

# Reporting checklist

- Test files changed.
- Cases covered.
- Commands run and results.
