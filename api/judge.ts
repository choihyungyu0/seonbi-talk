/* global process */
import { searchRagDocuments } from './_rag.js'
import type { RagSourceType } from './_rag.js'

type JudgeEmptyReason = 'missing_api_key' | 'invalid_input' | 'api_error'
type SeonbiType = 'toegye' | 'yulgok' | 'cheosa' | 'uguk'
type JudgeMode =
  | 'default'
  | 'strict'
  | 'practical'
  | 'hermit'
  | 'righteous'
  | 'praise'
  | 'roast'
  | 'petition'
  | 'poison'

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
  ragReferences?: JudgeRagReference[]
  emptyReason?: JudgeEmptyReason
  message?: string
}

interface JudgeRagReference {
  title: string
  sourceType: RagSourceType
  sourceId: string
}

interface JudgeResult {
  seonbiAdvice: string
  modernTranslation: string
  shareText: string
  imageObservation?: string
  analysis?: JudgeAnalysis
}

interface JudgeAnalysis {
  emotionTag?: string
  situationTag?: string
  adviceTag?: string
}

type JudgeTextField =
  | 'seonbiAdvice'
  | 'modernTranslation'
  | 'shareText'
  | 'imageObservation'

interface JudgeRequestBody {
  text?: unknown
  seonbiType?: unknown
  judgeMode?: unknown
  imageDataUrl?: unknown
  imageMimeType?: unknown
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
const maxImageDataUrlLength = 1_200_000
const allowedImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
const ragSourceTypePriority: Record<RagSourceType, number> = {
  tourism_place: 0,
  seonbi_persona: 1,
  judge_mode: 2,
  recommendation_rule: 3,
}
const koreanFallbackResult: JudgeResult = {
  seonbiAdvice:
    '잠시 숨을 고르고 오늘의 마음을 차분히 살펴보시게. 작은 실천 하나가 길을 바르게 열어줄 것이네.',
  modernTranslation: '오늘의 마음을 차분히 살피고, 작은 실천부터 시작해보세요.',
  shareText: '오늘도 마음을 바르게 세우고 한 걸음씩 나아가보세요.',
  imageObservation: '사진의 분위기는 차분히 살피되, 오늘 할 수 있는 작은 행동에 집중해보세요.',
}
const seonbiTypePrompts: Record<SeonbiType, string> = {
  toegye:
    '사용자의 선비유형은 퇴계형이다. 학문, 원칙, 성찰, 내면 수양을 중시하는 말투와 가치관을 담아 답한다.',
  yulgok:
    '사용자의 선비유형은 율곡형이다. 현실 문제 해결, 실천, 시간 활용을 중시하는 말투와 가치관을 담아 답한다.',
  cheosa:
    '사용자의 선비유형은 처사형이다. 자연, 여유, 마음 비움, 쉼을 중시하는 말투와 가치관을 담아 답한다.',
  uguk:
    '사용자의 선비유형은 우국형이다. 정의감, 책임감, 행동, 공동체를 중시하는 말투와 가치관을 담아 답한다.',
}
const judgeModePrompts: Record<JudgeMode, string> = {
  default: '기본 선비 모드다. 앞선 선비유형 말투와 가치관을 자연스럽게 유지한다.',
  strict:
    '엄격한 선비 모드다. 절제, 수양, 도덕적 훈계를 중심으로 하되 사용자를 모욕하지 않는다.',
  practical:
    '현실적인 선비 모드다. 실천, 시간 관리, 현실적 해결책을 짧고 구체적으로 제안한다.',
  hermit:
    '은둔 선비 모드다. 자연, 쉼, 마음 비움, 속도를 늦추는 조언을 중심으로 답한다.',
  righteous:
    '의병 선비 모드다. 정의감, 책임, 공동체, 작은 행동 촉구를 중심으로 답한다.',
  praise:
    '칭찬만 하는 선비 모드다. 따뜻한 칭찬과 격려를 중심으로 답하고 부족한 점도 부드럽게 말한다.',
  roast:
    '팩폭 선비 모드다. 불쾌하지 않은 선에서 웃긴 직설 조언을 하되 외모, 정체성, 혐오, 모욕 표현은 금지한다.',
  petition:
    '상소문 변환 모드다. 사용자의 고민을 짧은 상소문 형식으로 바꾸고, 현대어 해석에는 실천 조언을 덧붙인다.',
  poison:
    '사약 판정 모드다. 과장된 밈 느낌으로 가볍게 판정하되 자해, 죽음 조장, 실제 위해 표현으로 보이지 않게 "마음의 사약", "게으름 퇴치 탕약" 같은 안전한 비유만 사용한다.',
}

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
  const seonbiType = getSeonbiType(request.body)
  const judgeMode = getJudgeMode(request.body)
  const imageInput = getImageInput(request.body)
  const validationMessage = validateInput(inputText, Boolean(imageInput))
  if (validationMessage) {
    response.status(400).json({
      ok: false,
      emptyReason: 'invalid_input',
      message: validationMessage,
    })
    return
  }

  if (imageInput?.error) {
    response.status(400).json({
      ok: false,
      emptyReason: 'invalid_input',
      message: imageInput.error,
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
    const ragContext = await createRagContext(
      inputText,
      seonbiType,
      judgeMode,
      Boolean(imageInput?.dataUrl),
    )
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
              '사진 속 인물이 있어도 신원, 이름, 나이, 성별, 민감정보를 추정하지 않는다.',
              '의학, 법률, 금융, 안전 위기 판단은 단정하지 말고 전문가나 긴급 도움을 안내한다.',
              imageInput?.dataUrl
                ? '사진이 있으면 보이는 분위기와 상황만 간단히 해석하고 사용자를 비난하지 않는다.'
                : '',
              '반드시 JSON 객체만 반환한다.',
              '필드는 seonbiAdvice, modernTranslation, shareText를 반드시 사용한다.',
              '사진이 있으면 imageObservation 필드를 추가할 수 있다.',
              '가능하면 analysis 객체를 추가하고 emotionTag, situationTag, adviceTag에는 짧은 한국어 태그만 넣는다.',
              'analysis 태그는 사용자 원문을 복사하지 말고 감정, 상황, 조언 방향을 비식별 단어로만 요약한다.',
              'JSON key 이름은 seonbiAdvice, modernTranslation, shareText를 유지하되 모든 value는 반드시 한국어로만 작성한다.',
              '영어, 로마자 문장, 영어 번역문을 출력하지 않는다.',
              'modernTranslation은 영어 번역이 아니라 쉬운 현대 한국어 풀이이다.',
              '사용자가 영어로 입력해도 seonbiAdvice, modernTranslation, shareText, imageObservation은 모두 한국어로 작성한다.',
              'shareText도 한국어로만 작성한다.',
              '반환 형식 예시: {"seonbiAdvice":"선비 말투의 한국어 조언","modernTranslation":"쉬운 현대 한국어 풀이","shareText":"공유용 한국어 문구","analysis":{"emotionTag":"걱정","situationTag":"진로","adviceTag":"실천"}}',
              getSeonbiTypePrompt(seonbiType),
              getJudgeModePrompt(judgeMode),
              ragContext.promptContext,
            ].join(' '),
          },
          {
            role: 'user',
            content: createUserMessageContent(inputText, imageInput?.dataUrl),
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

      response.status(imageInput?.dataUrl ? 200 : 502).json(
        imageInput?.dataUrl
          ? createImageFallbackResponse(seonbiType, judgeMode, ragContext.references)
          : createSafeFailureResponse()
      )
      return
    }

    const data = (await openAiResponse.json()) as OpenAiChatResponse
    const content = data.choices?.[0]?.message?.content
    const parsedResult = parseJudgeResult(content)

    if (!parsedResult) {
      console.warn('[judge] OpenAI response parse failed', {
        hasContent: Boolean(content),
        contentPreview: content?.slice(0, 200) || '',
      })

      response.status(imageInput?.dataUrl ? 200 : 502).json(
        imageInput?.dataUrl
          ? createImageFallbackResponse(seonbiType, judgeMode, ragContext.references)
          : createSafeFailureResponse()
      )
      return
    }

    const result = sanitizeJudgeResult(parsedResult)

    response.status(200).json({
      ok: true,
      result,
      ragReferences: ragContext.references,
    })
  } catch (error) {
    console.error('[judge] request failed', {
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error),
    })

    response.status(imageInput?.dataUrl ? 200 : 500).json(
      imageInput?.dataUrl
        ? createImageFallbackResponse(seonbiType, judgeMode)
        : createSafeFailureResponse(),
    )
  }
}

async function createRagContext(
  inputText: string,
  seonbiType: SeonbiType | undefined,
  judgeMode: JudgeMode,
  hasImage: boolean,
) {
  try {
    const query = [
      seonbiType ?? '선비',
      judgeMode,
      inputText || (hasImage ? '사진 기반 고민' : ''),
    ]
      .filter(Boolean)
      .join(' ')
      .slice(0, 800)
    const documents = await searchRagDocuments(query, 5)
    const safeDocuments = documents
      .filter((document) => document.title && document.content)
      .slice(0, 5)

    if (safeDocuments.length === 0) {
      return {
        promptContext: '',
        references: [],
      }
    }

    const references = createJudgeRagReferences(safeDocuments)

    return {
      promptContext: [
        '[영주선비길 참고 데이터]',
        ...safeDocuments.map((document, index) =>
          [
            `${index + 1}. ${document.title}`,
            `- ${summarizeRagContent(document.content)}`,
          ].join('\n'),
        ),
        '주의: 참고 데이터는 답변의 근거로만 사용한다. 참고 데이터에 없는 운영시간, 요금, 주소는 지어내지 않는다. 사용자에게 RAG 내부 구조를 설명하지 않는다.',
      ].join('\n\n'),
      references,
    }
  } catch {
    return {
      promptContext: '',
      references: [],
    }
  }
}

function createJudgeRagReferences(
  documents: Array<{
    title: string
    source_id?: string
    source_type?: RagSourceType
  }>,
): JudgeRagReference[] {
  const seenReferenceKeys = new Set<string>()
  const seenTitles = new Set<string>()
  const references: JudgeRagReference[] = []

  const sortedDocuments = [...documents].sort(
    (first, second) =>
      getRagSourceTypePriority(first.source_type) -
      getRagSourceTypePriority(second.source_type),
  )

  for (const document of sortedDocuments) {
    if (!document.title || !document.source_id || !document.source_type) continue

    const normalizedTitle = normalizeReferenceKey(document.title)
    const referenceKey = [
      normalizedTitle,
      document.source_type,
      normalizeReferenceKey(document.source_id),
    ].join(':')

    if (seenTitles.has(normalizedTitle) || seenReferenceKeys.has(referenceKey)) continue

    seenTitles.add(normalizedTitle)
    seenReferenceKeys.add(referenceKey)
    references.push({
      title: document.title,
      sourceType: document.source_type,
      sourceId: document.source_id,
    })

    if (references.length >= 3) break
  }

  return references
}

function normalizeReferenceKey(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function getRagSourceTypePriority(sourceType: RagSourceType | undefined) {
  return sourceType ? ragSourceTypePriority[sourceType] : Number.MAX_SAFE_INTEGER
}

function summarizeRagContent(content: string) {
  return content.replace(/\s+/g, ' ').trim().slice(0, 260)
}

function getInputText(body: unknown) {
  const parsedBody = parseRequestBody(body)
  const value = parsedBody?.text
  return typeof value === 'string' ? value.trim() : ''
}

function getSeonbiType(body: unknown): SeonbiType | undefined {
  const parsedBody = parseRequestBody(body)
  const value = parsedBody?.seonbiType
  return isSeonbiType(value) ? value : undefined
}

function getJudgeMode(body: unknown): JudgeMode {
  const parsedBody = parseRequestBody(body)
  const value = parsedBody?.judgeMode
  return isJudgeMode(value) ? value : 'default'
}

function getImageInput(body: unknown):
  | {
      dataUrl?: string
      mimeType?: string
      error?: string
    }
  | undefined {
  const parsedBody = parseRequestBody(body)
  const dataUrl = parsedBody?.imageDataUrl
  const mimeType = parsedBody?.imageMimeType

  if (typeof dataUrl !== 'string' || !dataUrl) return undefined
  if (dataUrl.length > maxImageDataUrlLength) {
    return {
      error: '이미지 용량이 큽니다. 더 작은 이미지를 올려주세요.',
    }
  }

  const normalizedMimeType = typeof mimeType === 'string' ? mimeType : ''
  if (!allowedImageMimeTypes.includes(normalizedMimeType)) {
    return {
      error: 'JPG, PNG, WebP 이미지만 올릴 수 있습니다.',
    }
  }

  const dataUrlPrefix = `data:${normalizedMimeType};base64,`
  if (!dataUrl.startsWith(dataUrlPrefix)) {
    return {
      error: '이미지 형식을 확인할 수 없습니다.',
    }
  }

  return {
    dataUrl,
    mimeType: normalizedMimeType,
  }
}

function parseRequestBody(body: unknown): JudgeRequestBody {
  return typeof body === 'string' ? parseJsonBody(body) : (body as JudgeRequestBody)
}

function parseJsonBody(body: string): JudgeRequestBody {
  try {
    return JSON.parse(body) as JudgeRequestBody
  } catch {
    return {}
  }
}

function validateInput(text: string, hasImage: boolean) {
  if (!text && !hasImage) return '고민을 적거나 사진을 올려주세요.'
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

function createUserMessageContent(inputText: string, imageDataUrl: string | undefined) {
  const promptText = [
    inputText ? `입력 문장: ${inputText}` : '입력 문장: 없음',
    imageDataUrl
      ? [
          '사진을 함께 참고해 장면의 분위기와 상황을 짧게 해석한다.',
          '사진 속 사람의 신원, 이름, 나이, 성별, 민감정보는 추정하지 않는다.',
          '사용자를 비난하지 말고 선비유형에 맞는 짧고 인상적인 한마디를 만든다.',
        ].join(' ')
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  if (!imageDataUrl) return promptText

  return [
    {
      type: 'text',
      text: promptText,
    },
    {
      type: 'image_url',
      image_url: {
        url: imageDataUrl,
      },
    },
  ]
}

function isSeonbiType(value: unknown): value is SeonbiType {
  return (
    value === 'toegye' ||
    value === 'yulgok' ||
    value === 'cheosa' ||
    value === 'uguk'
  )
}

function isJudgeMode(value: unknown): value is JudgeMode {
  return (
    value === 'default' ||
    value === 'strict' ||
    value === 'practical' ||
    value === 'hermit' ||
    value === 'righteous' ||
    value === 'praise' ||
    value === 'roast' ||
    value === 'petition' ||
    value === 'poison'
  )
}

function getSeonbiTypePrompt(seonbiType: SeonbiType | undefined) {
  return seonbiType ? seonbiTypePrompts[seonbiType] : ''
}

function getJudgeModePrompt(judgeMode: JudgeMode) {
  return judgeModePrompts[judgeMode]
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
      imageObservation:
        typeof parsed.imageObservation === 'string'
          ? parsed.imageObservation
          : undefined,
      analysis: parseJudgeAnalysis(parsed.analysis),
    }
  } catch {
    return undefined
  }
}

function parseJudgeAnalysis(value: unknown): JudgeAnalysis | undefined {
  if (!value || typeof value !== 'object') return undefined
  const analysis = value as Record<string, unknown>
  const parsedAnalysis = {
    emotionTag: sanitizeAnalysisTag(analysis.emotionTag),
    situationTag: sanitizeAnalysisTag(analysis.situationTag),
    adviceTag: sanitizeAnalysisTag(analysis.adviceTag),
  }

  return parsedAnalysis.emotionTag ||
    parsedAnalysis.situationTag ||
    parsedAnalysis.adviceTag
    ? parsedAnalysis
    : undefined
}

function sanitizeAnalysisTag(value: unknown) {
  if (typeof value !== 'string') return undefined
  const tag = value.replace(/\s+/g, ' ').trim().slice(0, 12)
  if (!tag || containsLikelyEnglishSentence(tag)) return undefined
  return tag
}

function sanitizeJudgeResult(result: JudgeResult): JudgeResult {
  return {
    seonbiAdvice: sanitizeKoreanResultField(result.seonbiAdvice, 'seonbiAdvice'),
    modernTranslation: sanitizeKoreanResultField(
      result.modernTranslation,
      'modernTranslation',
    ),
    shareText: sanitizeKoreanResultField(result.shareText, 'shareText'),
    imageObservation:
      typeof result.imageObservation === 'string'
        ? sanitizeKoreanResultField(result.imageObservation, 'imageObservation')
        : undefined,
    analysis: result.analysis,
  }
}

function sanitizeKoreanResultField(
  value: string,
  field: JudgeTextField,
): string {
  const trimmedValue = value.trim()
  if (!trimmedValue || containsLikelyEnglishSentence(trimmedValue)) {
    return koreanFallbackResult[field] ?? koreanFallbackResult.modernTranslation
  }

  return trimmedValue
}

function containsLikelyEnglishSentence(value: string) {
  const alphabetWords = value.match(/[A-Za-z]{3,}/g) ?? []
  if (alphabetWords.length >= 2) return true

  const compactValue = value.replace(/\s+/g, '')
  if (!compactValue) return false

  const alphabetCount = (compactValue.match(/[A-Za-z]/g) ?? []).length
  return alphabetCount >= 8 && alphabetCount / compactValue.length >= 0.22
}

function createImageFallbackResponse(
  seonbiType: SeonbiType | undefined,
  judgeMode: JudgeMode,
  ragReferences: JudgeRagReference[] = [],
): JudgeProxyResponse {
  const typeLabel = getSeonbiTypeLabel(seonbiType)
  const modeLabel = getJudgeModeLabel(judgeMode)

  return {
    ok: true,
    result: {
      seonbiAdvice:
        `${modeLabel}의 기운으로 살펴보니, 사진 속 분위기를 정확히 읽지는 못했지만 잠시 숨을 고르고 오늘의 마음을 바르게 세워보시게.`,
      modernTranslation:
        '사진 분석은 잠시 어려웠지만, 지금의 상황을 차분히 바라보고 작은 실천부터 시작해보세요.',
      shareText: `${typeLabel} 선비의 ${modeLabel}: 사진 속 분위기를 정확히 읽지는 못했지만, 잠시 숨을 고르고 오늘의 마음을 바르게 세워보시게.`,
      imageObservation: '사진의 세부 분위기를 불러오지 못했습니다.',
    },
    ragReferences,
  }
}

function createSafeFailureResponse(): JudgeProxyResponse {
  return {
    ok: false,
    emptyReason: 'api_error',
    message: '선비의 한마디를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
  }
}

function getSeonbiTypeLabel(seonbiType: SeonbiType | undefined) {
  if (seonbiType === 'toegye') return '퇴계형'
  if (seonbiType === 'yulgok') return '율곡형'
  if (seonbiType === 'cheosa') return '처사형'
  if (seonbiType === 'uguk') return '우국형'
  return '선비'
}

function getJudgeModeLabel(judgeMode: JudgeMode) {
  if (judgeMode === 'strict') return '엄격 모드'
  if (judgeMode === 'practical') return '현실 모드'
  if (judgeMode === 'hermit') return '은둔 모드'
  if (judgeMode === 'righteous') return '의병 모드'
  if (judgeMode === 'praise') return '칭찬 모드'
  if (judgeMode === 'roast') return '팩폭 모드'
  if (judgeMode === 'petition') return '상소문 모드'
  if (judgeMode === 'poison') return '사약 모드'
  return '기본 모드'
}
