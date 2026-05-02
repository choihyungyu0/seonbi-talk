---
name: prepare-commit
description: Prepare a safe commit after verification.
---

# Purpose

Make sure the repository is ready for a human-reviewed commit.

# When to use

Use after implementation and verification, before committing or opening a pull request.

# Steps

1. Inspect `git status --short`.
2. Inspect the diff for scope and risky changes.
3. Run required verification.
4. Confirm no skipped tests, secrets, production URL changes, or fallback deletion.
5. Summarize changed files and verification results.

# Required verification

- `npx.cmd tsc --noEmit`
- `npm.cmd run lint`
- Harness scripts.
- Targeted tests when applicable.

# Reporting checklist

- Commit-ready status.
- Files included.
- Commands run and results.
- Known risks.
