import type { AnswerOption, ScoreTable, SeonbiType, TestResult } from './types'

export const seonbiTypePriority: SeonbiType[] = [
  'toegye',
  'yulgok',
  'cheosa',
  'uguk',
]

export function createEmptyScoreTable(): ScoreTable {
  return {
    toegye: 0,
    yulgok: 0,
    cheosa: 0,
    uguk: 0,
  }
}

export function calculateTestResult(answers: AnswerOption[]): TestResult {
  const scores = createEmptyScoreTable()

  for (const answer of answers) {
    for (const type of seonbiTypePriority) {
      scores[type] += answer.scores[type] ?? 0
    }
  }

  const type = seonbiTypePriority.reduce((currentBest, candidate) => {
    if (scores[candidate] > scores[currentBest]) return candidate
    return currentBest
  }, seonbiTypePriority[0])

  return {
    type,
    scores,
    completedAt: new Date().toISOString(),
  }
}
