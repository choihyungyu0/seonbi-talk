/* global process */

export type RagSourceType =
  | 'tourism_place'
  | 'seonbi_persona'
  | 'judge_mode'
  | 'recommendation_rule'

export interface RagDocumentInput {
  source_type: RagSourceType
  source_id: string
  title: string
  content: string
  metadata: Record<string, string | number | boolean | null>
}

export interface RagSearchResult {
  title: string
  content: string
  metadata: Record<string, unknown>
  similarity: number
  source_id?: string
  source_type?: RagSourceType
}

interface OpenAiEmbeddingResponse {
  data?: Array<{
    embedding?: number[]
  }>
}

interface SupabaseServerConfig {
  url: string
  key: string
}

export class RagOperationError extends Error {
  operation: string
  status?: number
  responsePreview?: string

  constructor(
    operation: string,
    message: string,
    options: { status?: number; responsePreview?: string } = {},
  ) {
    super(message)
    this.name = 'RagOperationError'
    this.operation = operation
    this.status = options.status
    this.responsePreview = options.responsePreview
  }
}

const openAiEmbeddingsUrl = 'https://api.openai.com/v1/embeddings'
const defaultEmbeddingModel = 'text-embedding-3-small'

export async function createEmbedding(input: string) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.')

  const response = await fetch(openAiEmbeddingsUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_EMBEDDING_MODEL || defaultEmbeddingModel,
      input,
    }),
  })

  if (!response.ok) {
    const responsePreview = await response.text().catch(() => '')
    console.error('[rag] embedding request failed', {
      status: response.status,
      statusText: response.statusText,
      model: process.env.OPENAI_EMBEDDING_MODEL || defaultEmbeddingModel,
      responsePreview: responsePreview.slice(0, 500),
    })
    throw new RagOperationError('embedding', 'Embedding request failed.', {
      status: response.status,
      responsePreview: responsePreview.slice(0, 500),
    })
  }

  const data = (await response.json()) as OpenAiEmbeddingResponse
  const embedding = data.data?.[0]?.embedding
  if (!embedding?.length) throw new Error('Embedding response is empty.')
  return embedding
}

export async function searchRagDocuments(query: string, matchCount = 5) {
  const supabase = getSupabaseServerConfig()
  if (!supabase) {
    console.warn('[rag] search skipped because Supabase server config is missing', {
      hasSupabaseUrl: Boolean(process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL),
      hasSupabaseKey: Boolean(
        process.env.SUPABASE_SERVICE_ROLE_KEY ??
          process.env.SUPABASE_SERVICE_KEY ??
          process.env.SUPABASE_ANON_KEY ??
          process.env.VITE_SUPABASE_ANON_KEY,
      ),
    })
    return []
  }

  const embedding = await createEmbedding(query)
  const response = await fetch(`${supabase.url}/rest/v1/rpc/match_rag_documents`, {
    method: 'POST',
    headers: createSupabaseHeaders(supabase),
    body: JSON.stringify({
      query_embedding: embedding,
      match_count: clampMatchCount(matchCount),
    }),
  })

  if (!response.ok) {
    const responsePreview = await response.text().catch(() => '')
    console.error('[rag] match_rag_documents RPC failed', {
      status: response.status,
      statusText: response.statusText,
      matchCount: clampMatchCount(matchCount),
      responsePreview: responsePreview.slice(0, 800),
    })
    return []
  }
  const data = await response.json().catch(() => [])
  if (!Array.isArray(data)) {
    console.warn('[rag] match_rag_documents returned a non-array response', {
      responseType: typeof data,
    })
    return []
  }
  if (data.length === 0) {
    console.info('[rag] match_rag_documents returned no matching documents', {
      matchCount: clampMatchCount(matchCount),
    })
  }
  return data.map(toRagSearchResult)
}

export async function upsertRagDocuments(documents: RagDocumentInput[]) {
  const supabase = getSupabaseServerConfig()
  if (!supabase) throw new Error('Supabase server config is missing.')

  const rows = await Promise.all(
    documents.map(async (document) => ({
      ...document,
      embedding: await createEmbedding(
        [document.title, document.content, JSON.stringify(document.metadata)].join('\n'),
      ),
    })),
  )

  const response = await fetch(`${supabase.url}/rest/v1/rag_documents`, {
    method: 'POST',
    headers: {
      ...createSupabaseHeaders(supabase),
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(rows),
  })

  if (!response.ok) {
    const responsePreview = await response.text().catch(() => '')
    console.error('[rag] rag_documents upsert failed', {
      status: response.status,
      statusText: response.statusText,
      documentCount: rows.length,
      responsePreview: responsePreview.slice(0, 1200),
    })
    throw new RagOperationError('upsert_rag_documents', 'RAG document upsert failed.', {
      status: response.status,
      responsePreview: responsePreview.slice(0, 1200),
    })
  }
  return rows.length
}

export async function getRagDocumentStatus() {
  const supabase = getSupabaseServerConfig()
  if (!supabase) return createEmptyRagStatus()

  const response = await fetch(
    `${supabase.url}/rest/v1/rag_documents?select=source_type,updated_at&limit=1000`,
    {
      method: 'GET',
      headers: createSupabaseHeaders(supabase),
    },
  )

  if (!response.ok) return createEmptyRagStatus()
  const rows = (await response.json().catch(() => [])) as Array<{
    source_type?: string
    updated_at?: string
  }>

  if (!Array.isArray(rows)) return createEmptyRagStatus()

  return {
    totalDocuments: rows.length,
    tourismPlaceDocuments: rows.filter((row) => row.source_type === 'tourism_place')
      .length,
    seonbiPersonaDocuments: rows.filter((row) => row.source_type === 'seonbi_persona')
      .length,
    judgeModeDocuments: rows.filter((row) => row.source_type === 'judge_mode').length,
    recommendationRuleDocuments: rows.filter(
      (row) => row.source_type === 'recommendation_rule',
    ).length,
    lastUpdatedAt:
      rows
        .map((row) => row.updated_at)
        .filter(Boolean)
        .sort((first, second) => String(second).localeCompare(String(first)))[0] ?? null,
  }
}

export function createEmptyRagStatus() {
  return {
    totalDocuments: 0,
    tourismPlaceDocuments: 0,
    seonbiPersonaDocuments: 0,
    judgeModeDocuments: 0,
    recommendationRuleDocuments: 0,
    lastUpdatedAt: null as string | null,
  }
}

function getSupabaseServerConfig(): SupabaseServerConfig | null {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_ANON_KEY

  if (!url || !key) return null
  return { url, key }
}

function createSupabaseHeaders(supabase: SupabaseServerConfig) {
  return {
    apikey: supabase.key,
    Authorization: `Bearer ${supabase.key}`,
    'Content-Type': 'application/json',
  }
}

function toRagSearchResult(row: Record<string, unknown>): RagSearchResult {
  return {
    title: typeof row.title === 'string' ? row.title : '',
    content: typeof row.content === 'string' ? row.content : '',
    metadata:
      row.metadata && typeof row.metadata === 'object'
        ? (row.metadata as Record<string, unknown>)
        : {},
    similarity: typeof row.similarity === 'number' ? row.similarity : 0,
    source_id: typeof row.source_id === 'string' ? row.source_id : undefined,
    source_type: isRagSourceType(row.source_type) ? row.source_type : undefined,
  }
}

function isRagSourceType(value: unknown): value is RagSourceType {
  return (
    value === 'tourism_place' ||
    value === 'seonbi_persona' ||
    value === 'judge_mode' ||
    value === 'recommendation_rule'
  )
}

function clampMatchCount(value: number) {
  if (!Number.isFinite(value)) return 5
  return Math.min(Math.max(Math.trunc(value), 1), 10)
}
