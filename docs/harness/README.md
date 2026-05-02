# Harness README

The harness is everything around the model that makes agent work reliable: project rules, context files, reusable skills, validation scripts, recovery state, logging expectations, and human approval checkpoints.

## How agents should use this harness

1. Read `AGENTS.md` at the start of every session.
2. Read only the context file relevant to the task.
3. Use `.agent/skills/*` as executable workflows, not as background reading.
4. Run the checks required by `docs/harness/verification-matrix.md`.
5. Report verification honestly, including skipped or failed commands.

## When to read each file

- `docs/harness/failure-modes.md`: before changing risky areas or after a failed attempt.
- `docs/harness/verification-matrix.md`: before reporting completion.
- `docs/harness/agent-workflows.md`: before multi-step changes or debugging.
- `docs/harness/hooks.md`: before wiring local automation or preparing a commit.
- `docs/debugging/kakao-map-debugging.md`: for Kakao Map, WebView, SDK origin, or map fallback issues.

## When to use `.agent/skills`

Use a skill when the task matches its description. Skills are short workflows for recurring tasks such as debugging Kakao Map loading, fixing Expo runtime errors, adding features safely, writing tests, reviewing code, or preparing commits.

## When to update `.agent/state/current-task.md`

If the same task fails twice, stop changing code and update `.agent/state/current-task.md` with what was tried, what failed, latest logs, the current hypothesis, next action, commands run, and files changed. Reload that file before continuing.
