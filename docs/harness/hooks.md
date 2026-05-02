# Harness Hooks

Actual hook automation is not wired in this checkout. The scripts in `scripts/harness/` are standalone checks that can be connected later.

## Before file edit

- Block editing `.env` unless explicitly requested and approved.
- Warn before modifying `package.json`, `app.json`, Supabase config, or deployment config.
- Warn before touching generated files or build outputs.
- Warn before broad refactors.

## After file edit

- Run formatting if available.
- Run TypeScript check for TypeScript changes.
- Run lint for source changes.
- Run targeted tests if a test file or business logic changed.
- Run changed harness scripts directly.

## Before commit

Run:

```sh
npx.cmd tsc --noEmit
npm.cmd run lint
node scripts/harness/check-no-skipped-tests.js
node scripts/harness/check-no-secrets.js
node scripts/harness/check-dangerous-diff.js
```

Run targeted tests when source or business logic changed.

Block commits if:

- Tests are skipped with `.skip`, `xit`, `xdescribe`, or focused with `.only`.
- `console.log` is added outside approved debugging areas.
- Secrets are detected.
- Fallback logic is deleted.
- Production API URLs are changed without approval.

## Dangerous command protection

Require explicit human approval for:

- `rm -rf`.
- `git push --force`.
- Deleting `.env`.
- Deleting tests.
- Changing production API URLs.
- Destructive database commands.
- Deleting fallback logic.
- Broad dependency changes.
