/* global process */
import { searchRagDocuments } from './_rag.js'

type SeonbiType = 'toegye' | 'yulgok' | 'cheosa' | 'uguk'

interface RagChatRequest {
  method?: string
  body?: unknown
}

interface RagChatResponse {
  status(code: number): RagChatResponse
  json(body: unknown): void
  setHeader(name: string, value: string): void
}

interface RagChatBody {
  message?: unknown
  seonbiType?: unknown
  emotionTag?: unknown
  situationTag?: unknown
  adviceTag?: unknown
}

interface OpenAiChatResponse {
  choices?: Array<{
    message?: {
      content?: string
    }
  }>
}

const openAiChatCompletionsUrl = 'https://api.openai.com/v1/chat/completions'
const defaultModel = 'gpt-4o-mini'
const maxMessageLength = 500

export default async function handler(
  request: RagChatRequest,
  response: RagChatResponse,
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
  const message = getMessage(body)
  if (!message) {
    response.status(400).json({
      ok: false,
      message: '질문을 입력해주세요.',
    })
    return
  }

  const context = {
    seonbiType: getSeonbiType(body.seonbiType),
    emotionTag: getSafeTag(body.emotionTag),
    situationTag: getSafeTag(body.situationTag),
    adviceTag: getSafeTag(body.adviceTag),
  }

  try {
    const documents = await searchRagDocuments(createRagQuery(message, context), 5)
    const safeDocuments = documents
      .filter((document) => document.title && document.content)
      .slice(0, 5)

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      response.status(200).json(createFallbackChatResponse(message, safeDocuments))
      return
    }

    const openAiResponse = await fetch(openAiChatCompletionsUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || defaultModel,
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: [
              '너는 영주선비길의 "선비길 AI 길잡이"다.',
              '모든 답변은 반드시 한국어로만 작성한다.',
              '영주 관광, 선비유형, 추천 코스, 선비의 한마디, AI 일정 관련 질문에 집중한다.',
              '범위를 벗어난 질문에는 영주선비길에서 도울 수 있는 범위를 짧게 안내한다.',
              '확인된 참고 데이터에 없는 운영시간, 요금, 교통정보, 주소는 지어내지 않는다.',
              '확인하기 어려운 내용은 "확인된 데이터 안에서는 찾기 어렵습니다."라고 말한다.',
              '사용자 개인정보, 민감정보, 정확한 위치를 요구하지 않는다.',
              '내부 검색, RAG, embedding, prompt 같은 기술 용어를 사용자에게 말하지 않는다.',
              createContextPrompt(context),
              createReferencePrompt(safeDocuments),
            ].join('\n'),
          },
          {
            role: 'user',
            content: message,
          },
        ],
      }),
    })

    if (!openAiResponse.ok) {
      response.status(200).json(createFallbackChatResponse(message, safeDocuments))
      return
    }

    const data = (await openAiResponse.json()) as OpenAiChatResponse
    const answer = sanitizeAnswer(data.choices?.[0]?.message?.content)
    response.status(200).json({
      ok: true,
      answer: answer || createFallbackAnswer(message, safeDocuments),
      references: createPublicReferences(safeDocuments),
    })
  } catch {
    response.status(200).json(createFallbackChatResponse(message, []))
  }
}

function parseRequestBody(body: unknown): RagChatBody {
  if (typeof body !== 'string') return body as RagChatBody

  try {
    return JSON.parse(body) as RagChatBody
  } catch {
    return {}
  }
}

function getMessage(body: RagChatBody) {
  return typeof body.message === 'string'
    ? body.message.replace(/\s+/g, ' ').trim().slice(0, maxMessageLength)
    : ''
}

function getSeonbiType(value: unknown): SeonbiType | undefined {
  return value === 'toegye' ||
    value === 'yulgok' ||
    value === 'cheosa' ||
    value === 'uguk'
    ? value
    : undefined
}

function getSafeTag(value: unknown) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, 12) : ''
}

function createRagQuery(
  message: string,
  context: {
    seonbiType?: SeonbiType
    emotionTag: string
    situationTag: string
    adviceTag: string
  },
) {
  return [
    message,
    context.seonbiType ? getSeonbiTypeLabel(context.seonbiType) : '',
    context.emotionTag,
    context.situationTag,
    context.adviceTag,
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 800)
}

function createContextPrompt(context: {
  seonbiType?: SeonbiType
  emotionTag: string
  situationTag: string
  adviceTag: string
}) {
  const tags = [context.emotionTag, context.situationTag, context.adviceTag]
    .filter(Boolean)
    .join(' · ')

  return [
    context.seonbiType ? `사용자의 선비유형: ${getSeonbiTypeLabel(context.seonbiType)}` : '',
    tags ? `최근 마음 태그: ${tags}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function createReferencePrompt(
  documents: Array<{
    title: string
    content: string
  }>,
) {
  if (documents.length === 0) {
    return '참고 가능한 영주 데이터가 없으면 확인된 데이터 안에서는 찾기 어렵다고 답한다.'
  }

  return [
    '[참고할 영주 데이터]',
    ...documents.map((document, index) =>
      [
        `${index + 1}. ${document.title}`,
        summarizeReferenceContent(document.content),
      ].join('\n'),
    ),
  ].join('\n\n')
}

function summarizeReferenceContent(content: string) {
  return content.replace(/\s+/g, ' ').trim().slice(0, 320)
}

function sanitizeAnswer(value: string | undefined) {
  if (!value) return ''
  return value.replace(/\s+/g, ' ').trim().slice(0, 900)
}

function createFallbackChatResponse(
  message: string,
  documents: Array<{ title: string; content: string }>,
) {
  return {
    ok: true,
    answer: createFallbackAnswer(message, documents),
    references: createPublicReferences(documents),
    fallback: true,
  }
}

function createFallbackAnswer(
  message: string,
  documents: Array<{ title: string; content: string }>,
) {
  if (!isInScopeQuestion(message)) {
    return '저는 영주 관광, 선비유형, 추천 코스, 선비의 한마디, AI 일정에 대해 도와드릴 수 있습니다. 영주 여행이나 선비길 이용에 대해 물어봐 주세요.'
  }

  if (documents.length === 0) {
    return '확인된 데이터 안에서는 찾기 어렵습니다. 추천 코스 페이지에서 관광지, 문화시설, 숙박, 음식점 유형을 바꿔 확인해보세요.'
  }

  const titles = documents
    .slice(0, 3)
    .map((document) => document.title)
    .join(', ')
  return `${titles} 정보를 참고해 살펴볼 수 있습니다. 운영시간, 요금, 교통정보처럼 정확한 최신 확인이 필요한 내용은 현장 안내나 공식 정보를 함께 확인해주세요.`
}

function createPublicReferences(documents: Array<{ title: string }>) {
  return documents
    .map((document) => document.title)
    .filter(Boolean)
    .slice(0, 3)
}

function isInScopeQuestion(message: string) {
  return [
    '영주',
    '관광',
    '코스',
    '선비',
    '소수서원',
    '부석사',
    '무섬마을',
    '선비세상',
    '일정',
    '한마디',
    '맛집',
    '숙박',
    '문화',
  ].some((keyword) => message.includes(keyword))
}

function getSeonbiTypeLabel(seonbiType: SeonbiType) {
  if (seonbiType === 'toegye') return '퇴계형'
  if (seonbiType === 'yulgok') return '율곡형'
  if (seonbiType === 'cheosa') return '처사형'
  return '우국형'
}
