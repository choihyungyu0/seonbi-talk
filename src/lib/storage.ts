import {
  seonbiTypes,
  type ScoreTable,
  type SeonbiType,
  type TestResult,
} from '../features/seonbi-test/types'
import { trackEvent } from '../features/analytics/trackEvent'

const testResultKey = 'yeongju-seonbi-test-result'

export function saveTestResult(result: TestResult) {
  window.localStorage.setItem(testResultKey, JSON.stringify(result))
  void trackEvent('test_completed', {
    seonbiType: result.type,
    metadata: {
      completedAt: result.completedAt,
    },
  })
}

export function loadTestResult(): TestResult | null {
  const rawResult = window.localStorage.getItem(testResultKey)
  if (!rawResult) return null

  try {
    const parsedResult = JSON.parse(rawResult) as unknown
    return isTestResult(parsedResult) ? parsedResult : null
  } catch {
    return null
  }
}

function isTestResult(value: unknown): value is TestResult {
  if (!value || typeof value !== 'object') return false

  const result = value as Partial<TestResult>
  return (
    isSeonbiType(result.type) &&
    typeof result.completedAt === 'string' &&
    isScoreTable(result.scores)
  )
}

function isSeonbiType(value: unknown): value is SeonbiType {
  return typeof value === 'string' && seonbiTypes.includes(value as SeonbiType)
}

function isScoreTable(value: unknown): value is ScoreTable {
  if (!value || typeof value !== 'object') return false

  const scores = value as Partial<ScoreTable>
  return seonbiTypes.every((type) => typeof scores[type] === 'number')
}
