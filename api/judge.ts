/* global process */

type JudgeEmptyReason = 'missing_api_key' | 'invalid_input' | 'api_error'

interface VercelRequestLike {
  method?: string
  body?: unknown
}

interface VercelResponseLike {
  status(code: number): VercelResponseLike
  json(body: JudgeProxyResponse): void
  setHeader(name: string, value: string): void
}

interface JudgeProxyResponse {
  ok: boolean
  result?: JudgeResult
  emptyReason?: JudgeEmptyReason
  message?: string
}

interface JudgeResult {
  seonbiAdvice: string
  modernTranslation: string
  shareText: string
}

interface JudgeRequestBody {
  text?: unknown
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
const maxInputLength = 600

export default async function handler(
  request: VercelRequestLike,
  response: VercelResponseLike,
) {
  response.setHeader('Cache-Control', 'no-store')

  if (request.method && request.method !== 'POST') {
    response.status(405).json({
      ok: false,
      emptyReason: 'api_error',
      message: '지원하지 않는 요청입니다.',
    })
    return
  }

  const inputText = getInputText(request.body)
  const validationMessage = validateInput(inputText)
  if (validationMessage) {
    response.status(400).json({
      ok: false,
      emptyReason: 'invalid_input',
      message: validationMessage,
    })
    return
  }

  // OpenAI API 키는 서버 환경변수로만 관리한다.
  // VITE_ 접두사를 사용하지 않고, 프론트 코드에 키를 넣지 않는다.
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    response.status(200).json({
      ok: false,
      emptyReason: 'missing_api_key',
      message: '선비의 한마디 기능은 서버 설정 후 사용할 수 있습니다.',
    })
    return
  }

  try {
    const openAiResponse = await fetch(openAiChatCompletionsUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || defaultModel,
        temperature: 0.8,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              '너는 영주선비길의 "선비의 한마디" 조언가다.',
              '사용자 문장을 선비 말투의 유쾌하고 다정한 조언으로 바꾼다.',
              '외모비하, 혐오, 욕설, 개인정보 판단, 특정 개인 신상 추론은 하지 않는다.',
              '의학, 법률, 금융, 안전 위기 판단은 단정하지 말고 전문가나 긴급 도움을 안내한다.',
              '반드시 JSON 객체만 반환한다.',
              '필드는 seonbiAdvice, modernTranslation, shareText 세 개만 사용한다.',
              '각 필드는 한국어 문자열이어야 한다.',
            ].join(' '),
          },
          {
            role: 'user',
            content: `입력 문장: ${inputText}`,
          },
        ],
      }),
    })

    if (!openAiResponse.ok) {
      const errorText = await openAiResponse.text().catch(() => '')
      console.warn('[judge] OpenAI request failed', {
        status: openAiResponse.status,
        statusText: openAiResponse.statusText,
        model: process.env.OPENAI_MODEL || defaultModel,
        hasApiKey: Boolean(apiKey),
        errorPreview: errorText.slice(0, 300),
      })

      response.status(502).json(createSafeFailureResponse())
      return
    }

    const data = (await openAiResponse.json()) as OpenAiChatResponse
    const content = data.choices?.[0]?.message?.content
    const result = parseJudgeResult(content)

    if (!result) {
      console.warn('[judge] OpenAI response parse failed', {
        hasContent: Boolean(content),
        contentPreview: content?.slice(0, 200) || '',
      })

      response.status(502).json(createSafeFailureResponse())
      return
    }

    response.status(200).json({
      ok: true,
      result,
    })
  } catch (error) {
    console.error('[judge] request failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
    })

    response.status(500).json(createSafeFailureResponse())
  }
}

function getInputText(body: unknown) {
  const parsedBody =
    typeof body === 'string' ? parseJsonBody(body) : (body as JudgeRequestBody)
  const value = parsedBody?.text
  return typeof value === 'string' ? value.trim() : ''
}

function parseJsonBody(body: string): JudgeRequestBody {
  try {
    return JSON.parse(body) as JudgeRequestBody
  } catch {
    return {}
  }
}

function validateInput(text: string) {
  if (!text) return '문장을 입력하면 선비의 한마디를 받을 수 있습니다.'
  if (text.length > maxInputLength) {
    return '문장은 600자 이내로 입력해주세요.'
  }
  if (containsPersonalInfo(text)) {
    return '개인정보가 포함된 문장은 처리할 수 없습니다. 개인을 식별할 수 없게 바꿔 입력해주세요.'
  }
  if (containsUnsafeExpression(text)) {
    return '외모비하, 혐오, 욕설이 포함된 문장은 조언으로 바꿀 수 없습니다.'
  }
  return undefined
}

function containsPersonalInfo(text: string) {
  return (
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text) ||
    /\b01[016789]-?\d{3,4}-?\d{4}\b/.test(text) ||
    /\b\d{6}-?[1-4]\d{6}\b/.test(text)
  )
}

function containsUnsafeExpression(text: string) {
  const unsafePatterns = [
    /못생/,
    /외모\s*비하/,
    /혐오/,
    /장애인\s*비하/,
    /인종\s*차별/,
    /성별\s*차별/,
    /병신/,
    /새끼/,
    /꺼져/,
    /죽어/,
  ]

  return unsafePatterns.some((pattern) => pattern.test(text))
}

function parseJudgeResult(content: string | undefined): JudgeResult | undefined {
  if (!content) return undefined

  try {
    const parsed = JSON.parse(content) as Partial<JudgeResult>
    if (
      typeof parsed.seonbiAdvice !== 'string' ||
      typeof parsed.modernTranslation !== 'string' ||
      typeof parsed.shareText !== 'string'
    ) {
      return undefined
    }

    return {
      seonbiAdvice: parsed.seonbiAdvice,
      modernTranslation: parsed.modernTranslation,
      shareText: parsed.shareText,
    }
  } catch {
    return undefined
  }
}

function createSafeFailureResponse(): JudgeProxyResponse {
  return {
    ok: false,
    emptyReason: 'api_error',
    message: '선비의 한마디를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
  }
}
