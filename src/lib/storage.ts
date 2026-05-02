import type { TestResult } from '../features/seonbi-test/types'

const testResultKey = 'yeongju-seonbi-test-result'

export function saveTestResult(result: TestResult) {
  window.localStorage.setItem(testResultKey, JSON.stringify(result))
}

export function loadTestResult(): TestResult | null {
  const rawResult = window.localStorage.getItem(testResultKey)
  if (!rawResult) return null

  try {
    return JSON.parse(rawResult) as TestResult
  } catch {
    return null
  }
}
