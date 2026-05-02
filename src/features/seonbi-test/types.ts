export const seonbiTypeNames = ['퇴계형', '율곡형', '처사형', '우국형'] as const

export type SeonbiTypeName = (typeof seonbiTypeNames)[number]

export interface SeonbiTypeResult {
  name: SeonbiTypeName
  summary: string
  travelStyle: string
}

export interface TestQuestion {
  id: string
  step: number
  total: number
  prompt: string
  options: [string, string]
}
