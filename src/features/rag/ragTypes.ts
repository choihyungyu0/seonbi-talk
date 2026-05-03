export type RagSourceType =
  | 'tourism_place'
  | 'seonbi_persona'
  | 'judge_mode'
  | 'recommendation_rule'

export interface RagDocument {
  source_type: RagSourceType
  source_id: string
  title: string
  content: string
  metadata: Record<string, string | number | boolean | null>
  similarity?: number
}
