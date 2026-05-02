# Failure Modes

| Failure mode | Why it happens | Harness control | Verification |
| --- | --- | --- | --- |
| Changing unrelated files | Agent follows nearby code instead of task scope | `AGENTS.md` scope rule; Plan/Critic workflow | `git diff --stat`; final changed-file report |
| Breaking existing UI while fixing one bug | Fix is too broad or unreviewed | `.agent/skills/add-feature-safely.md`; visual/manual check for UI work | Typecheck, lint, visual/manual check |
| Ignoring TypeScript errors | Agent only tests happy path | Required verification commands | `npx.cmd tsc --noEmit` |
| Solving symptoms instead of root causes | Missing repro and hypothesis | Recovery loop in `agent-workflows.md` | Update `.agent/state/current-task.md` after two failures |
| Hardcoding temporary IP addresses or API keys | Agent wants quick local success | Secret rules and dangerous diff checks | `check-no-secrets.js`; `check-dangerous-diff.js` |
| Removing fallback facility list | Agent treats fallback as dead or duplicate UI | Non-negotiable rule; dangerous diff warning | Diff review for removed fallback terms |
| Creating duplicated logic | Agent copies code instead of finding existing helper | Plan step must identify touched files and existing utilities | Code review skill |
| Forgetting to run tests | Agent stops after edit | Required reporting format | Verification section in final report |
| Modifying environment variables incorrectly | Runtime config changes are tempting | Human approval checkpoint | Review diff; no `.env` edits without approval |
| Breaking WebView or SDK loading flow | Origin, URL, and SDK state are invisible without logs | Kakao debugging guide and skill | WebView log check with structured labels |
| Breaking Kakao Map SDK loading by using wrong origin | Kakao domains must match runtime origin | `debug-kakao-map` skill | Origin/domain verification |
| Testing Kakao Map from `file://` | Static HTML opened directly | `AGENTS.md` rule and debugging guide | Confirm `http://` or `https://` URL |
| Forgetting Expo env changes require full reload | Metro may keep stale env | Expo debugging rule | Document reload steps and retest |
| Removing nearby facility fallback lists | Fallback mistaken for obsolete data | Non-negotiable rule | Diff review; fallback manual check |
| Changing public-data parser without fixture tests | Parser changes look small but affect many records | Verification matrix requires fixture tests | Unit and fixture tests |
| Changing Supabase function response shape | Backend compatibility overlooked | Approval and API change checks | Mock/integration test; consumer review |
| Adding noisy production logs | Debugging code left behind | Logging rules require gating or documentation | Lint/review for `console.log` and labels |
| Editing unrelated UI while fixing map issue | Agent follows visual symptoms | Skill requires preserving surrounding facility list behavior | Diff review and UI/manual check |
