import type { SeonbiType } from '../seonbi-test/types'

export interface JudgeResult {
  seonbiAdvice: string
  modernTranslation: string
  shareText: string
}

export type JudgeEmptyReason = 'missing_api_key' | 'invalid_input' | 'api_error'

export interface JudgeResponse {
  ok: boolean
  result?: JudgeResult
  emptyReason?: JudgeEmptyReason
  message?: string
}

export interface JudgeRequestBody {
  text: string
  seonbiType?: SeonbiType
}
