import { searchRagDocuments } from '../_rag.js'

interface RagSearchRequest {
  method?: string
  body?: unknown
}

interface RagSearchResponse {
  status(code: number): RagSearchResponse
  json(body: unknown): void
  setHeader(name: string, value: string): void
}

interface RagSearchBody {
  query?: unknown
  matchCount?: unknown
}

export default async function handler(
  request: RagSearchRequest,
  response: RagSearchResponse,
) {
  response.setHeader('Cache-Control', 'no-store')

  if (request.method !== 'POST') {
    response.status(405).json({
      ok: false,
      message: '지원하지 않는 요청입니다.',
    })
    return
  }

  const body = parseRequestBody(request.body)
  const query = typeof body.query === 'string' ? body.query.trim() : ''
  const matchCount =
    typeof body.matchCount === 'number' && Number.isFinite(body.matchCount)
      ? body.matchCount
      : 5

  if (!query) {
    response.status(400).json({
      ok: false,
      message: '검색어가 필요합니다.',
    })
    return
  }

  try {
    const documents = await searchRagDocuments(query.slice(0, 800), matchCount)
    response.status(200).json({
      ok: true,
      documents: documents.map(({ title, content, metadata, similarity }) => ({
        title,
        content,
        metadata,
        similarity,
      })),
    })
  } catch {
    response.status(200).json({
      ok: true,
      documents: [],
    })
  }
}

function parseRequestBody(body: unknown): RagSearchBody {
  if (typeof body !== 'string') return body as RagSearchBody

  try {
    return JSON.parse(body) as RagSearchBody
  } catch {
    return {}
  }
}
