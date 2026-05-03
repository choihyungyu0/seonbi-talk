import type { SeonbiType } from '../seonbi-test/types'

export type JudgeMode =
  | 'default'
  | 'strict'
  | 'practical'
  | 'hermit'
  | 'righteous'
  | 'praise'
  | 'roast'
  | 'petition'
  | 'poison'

export interface JudgeResult {
  seonbiAdvice: string
  modernTranslation: string
  shareText: string
  imageObservation?: string
}

export type JudgeEmptyReason = 'missing_api_key' | 'invalid_input' | 'api_error'

export interface JudgeResponse {
  ok: boolean
  result?: JudgeResult
  emptyReason?: JudgeEmptyReason
  message?: string
}

export interface JudgeRequestBody {
  text?: string
  seonbiType?: SeonbiType
  judgeMode?: JudgeMode
  imageDataUrl?: string
  imageMimeType?: string
}

export interface JudgeAdviceRequest {
  text?: string
  seonbiType?: SeonbiType
  judgeMode?: JudgeMode
  imageDataUrl?: string
  imageMimeType?: string
}
