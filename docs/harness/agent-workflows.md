# Agent Workflows

## Plan

Before changing files, the agent must:

- Restate the goal.
- Identify likely touched files.
- Identify risks.
- List verification commands.
- Ask only necessary clarifying questions.

## Critic

Before coding, the agent must review its own plan:

- Is the plan too broad?
- Are unrelated files being changed?
- Is there a safer minimal change?
- Are verification commands enough?
- Is human approval required?

## Build

Only after the plan passes the critic step:

- Make the smallest useful change.
- Preserve existing behavior.
- Add logs, tests, or fixtures when needed.
- Run verification.
- Report results.

## Recovery Loop

If the same task fails twice:

- Stop making random changes.
- Update `.agent/state/current-task.md`.
- Write what was tried.
- Write latest logs.
- Write current hypothesis.
- Write next action.
- Continue only after a clear hypothesis exists.
