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

  const type = resolveResultType(scores, answers)

  return {
    type,
    scores,
    completedAt: new Date().toISOString(),
  }
}

function resolveResultType(scores: ScoreTable, answers: AnswerOption[]) {
  const highestScore = Math.max(...seonbiTypePriority.map((type) => scores[type]))
  const tiedTypes = seonbiTypePriority.filter((type) => scores[type] === highestScore)

  if (tiedTypes.length === 1) return tiedTypes[0]

  return pickBalancedTieType(tiedTypes, answers)
}

function pickBalancedTieType(tiedTypes: SeonbiType[], answers: AnswerOption[]) {
  const answerSignature = answers.map((answer) => answer.id).join('|')
  const tieIndex = createStableHash(answerSignature) % tiedTypes.length
  return tiedTypes[tieIndex]
}

function createStableHash(value: string) {
  return Array.from(value).reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) >>> 0
  }, 0)
}
