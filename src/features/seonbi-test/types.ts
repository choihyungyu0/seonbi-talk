export const seonbiTypes = ['toegye', 'yulgok', 'cheosa', 'uguk'] as const

export const seonbiTypeNames = ['퇴계형', '율곡형', '처사형', '우국형'] as const

export type SeonbiType = (typeof seonbiTypes)[number]

export type SeonbiTypeName = (typeof seonbiTypeNames)[number]

export type ScoreTable = Record<SeonbiType, number>

export interface AnswerOption {
  id: string
  label: string
  scores: Partial<ScoreTable>
}

export interface Question {
  id: string
  prompt: string
  options: AnswerOption[]
}

export interface TestResult {
  type: SeonbiType
  scores: ScoreTable
  completedAt: string
}

export interface SeonbiTypeInfo {
  id: SeonbiType
  name: SeonbiTypeName
  title: string
  description: string
  oneLineJudgement: string
  joseonTitle: string
  stats: {
    학문: number
    절개: number
    풍류: number
    개혁: number
  }
  recommendedRoute: string[]
  friendInviteText: string
  tags: string[]
  travelStyle: string
  recommendedKeywords: string[]
}
