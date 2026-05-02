# Seonbi Test Scoring Checks

The seonbi type test has four answer options for each question. Each option
primarily gives 2 points to one type:

- A-heavy answers: `toegye`
- B-heavy answers: `yulgok`
- C-heavy answers: `cheosa`
- D-heavy answers: `uguk`

## Minimum Manual Cases

Use these answer patterns to verify that every type can be produced.

| Expected type | Answer pattern |
| --- | --- |
| `toegye` | Choose A for all 10 questions |
| `yulgok` | Choose B for all 10 questions |
| `cheosa` | Choose C for all 10 questions |
| `uguk` | Choose D for all 10 questions |

Question 9 option A intentionally splits points between `toegye` and `cheosa`,
but the all-A case still resolves to `toegye` because the other A answers give
direct `toegye` points.

## Tie Handling

If two or more types share the highest score, the result no longer falls back to
a fixed type priority. The scorer creates a stable hash from the selected answer
IDs and uses it to choose among only the tied types. This keeps ties
deterministic for the same answer set while avoiding a permanent bias toward a
single type.
