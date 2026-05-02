# Verification Matrix

Use this matrix before reporting completion.

| Change type | Required checks | Notes |
| --- | --- | --- |
| Harness documentation only | Harness scripts if changed; dangerous diff check | Typecheck/lint optional unless source changed |
| Harness script change | Run the changed script directly | Also run `check-dangerous-diff.js` when available |
| UI-only change | Typecheck, lint, visual/manual check | Preserve existing user-facing behavior |
| TypeScript component change | Typecheck, lint | Add visual/manual check for visible UI |
| Hook or utility function change | Typecheck, lint, unit tests | Add tests for branching logic |
| Data transformation change | Unit tests and fixture tests | Include representative public-data responses |
| Public-data parser change | Typecheck, lint, fixture tests | Preserve response shape unless explicitly changed |
| Map/WebView change | Typecheck, lint, manual Expo test, WebView log check | Verify fallback UI still appears on failure |
| Kakao Map SDK change | Typecheck, lint, origin/domain verification, WebView log check | Never test from `file://` |
| Environment variable change | Approval, documented full reload, fallback check | Do not edit `.env` without approval |
| Supabase/API change | Typecheck, integration or mock test | Preserve backward-compatible response shape |
| `package.json` change | Approval, install, typecheck, lint, tests | Propose diff first |
| Auth or secrets change | Approval, security review, tests | Never expose service role keys |
| Broad refactor | Approval, full verification suite | Avoid unless explicitly requested |

Current safe baseline commands:

```sh
npx.cmd tsc --noEmit
npm.cmd run lint
node scripts/harness/check-no-skipped-tests.js
node scripts/harness/check-no-secrets.js
node scripts/harness/check-dangerous-diff.js
```
