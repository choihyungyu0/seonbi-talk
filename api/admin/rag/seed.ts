import { hasValidAdminSession } from '../../_adminAuth'
import { type RagDocumentInput, upsertRagDocuments } from '../../_rag'

interface RagSeedRequest {
  method?: string
  headers?: {
    cookie?: string
  }
}

interface RagSeedResponse {
  status(code: number): RagSeedResponse
  json(body: unknown): void
  setHeader(name: string, value: string): void
}

export default async function handler(
  request: RagSeedRequest,
  response: RagSeedResponse,
) {
  response.setHeader('Cache-Control', 'no-store')

  if (request.method !== 'POST') {
    response.status(405).json({
      ok: false,
      message: '지원하지 않는 요청입니다.',
    })
    return
  }

  if (!hasValidAdminSession(request.headers?.cookie ?? '')) {
    response.status(401).json({
      ok: false,
      message: '관리자 세션이 필요합니다.',
    })
    return
  }

  try {
    const count = await upsertRagDocuments(seedDocuments)
    response.status(200).json({ ok: true, count })
  } catch {
    response.status(500).json({
      ok: false,
      message: 'AI 참고 데이터 등록 중 문제가 발생했습니다.',
    })
  }
}

const seedDocuments: RagDocumentInput[] = [
  {
    source_type: 'seonbi_persona',
    source_id: 'toegye',
    title: '퇴계형 선비',
    content:
      '퇴계형은 학문, 원칙, 성찰, 내면 수양을 중시한다. 조언은 차분하고 깊이 있게 하며, 감정을 가라앉히고 올바른 기준을 세우도록 돕는다.',
    metadata: { seonbiType: 'toegye' },
  },
  {
    source_type: 'seonbi_persona',
    source_id: 'yulgok',
    title: '율곡형 선비',
    content:
      '율곡형은 현실 문제 해결, 실천, 계획, 시간 활용을 중시한다. 조언은 실행 가능한 다음 행동과 우선순위를 짚는 방식이 어울린다.',
    metadata: { seonbiType: 'yulgok' },
  },
  {
    source_type: 'seonbi_persona',
    source_id: 'cheosa',
    title: '처사형 선비',
    content:
      '처사형은 자연, 여유, 마음 비움, 쉼을 중시한다. 조언은 속도를 낮추고 조용히 회복하는 방향으로 부드럽게 안내한다.',
    metadata: { seonbiType: 'cheosa' },
  },
  {
    source_type: 'seonbi_persona',
    source_id: 'uguk',
    title: '우국형 선비',
    content:
      '우국형은 정의감, 책임감, 공동체, 행동을 중시한다. 조언은 옳은 일을 작게라도 실천하도록 힘을 북돋는 방향이 좋다.',
    metadata: { seonbiType: 'uguk' },
  },
  ...[
    ['default', '기본 선비', '선비유형의 말투와 가치관을 자연스럽게 유지한다.'],
    ['strict', '엄격한 선비', '절제와 수양을 중심으로 말하되 사용자를 모욕하지 않는다.'],
    ['practical', '현실적인 선비', '바로 할 수 있는 현실적 해결책을 짧고 구체적으로 제안한다.'],
    ['hermit', '은둔 선비', '쉼, 자연, 마음 비움, 속도 낮추기를 중심으로 조언한다.'],
    ['righteous', '의병 선비', '책임, 정의감, 공동체, 작은 행동 촉구를 중심으로 답한다.'],
    ['praise', '칭찬 선비', '따뜻한 칭찬과 격려를 먼저 건네며 부드럽게 안내한다.'],
    ['roast', '팩폭 선비', '불쾌하지 않은 직설 유머로 말하되 혐오와 모욕은 피한다.'],
    ['petition', '상소문 변환', '고민을 짧은 상소문처럼 바꾸고 현대어 해석에 실천 조언을 붙인다.'],
    ['poison', '사약 판정', '과장된 밈 판정을 하되 실제 위해 표현은 피하고 안전한 비유만 사용한다.'],
  ].map(([sourceId, title, content]) => ({
    source_type: 'judge_mode' as const,
    source_id: sourceId,
    title,
    content,
    metadata: { judgeMode: sourceId },
  })),
  ...[
    [
      'sosu-seowon',
      '소수서원',
      '소수서원은 영주의 대표적인 서원 문화 자원이다. 학문, 성찰, 선비 정신과 연결해 차분한 조언이나 추천 맥락에 활용하기 좋다.',
      '12',
    ],
    [
      'buseoksa',
      '부석사',
      '부석사는 영주의 대표 사찰이자 역사 문화 자원이다. 고요함, 사색, 오래된 시간의 감각, 마음을 낮추는 조언과 잘 어울린다.',
      '12',
    ],
    [
      'museom-village',
      '무섬마을',
      '무섬마을은 물길과 전통 마을 풍경이 어우러진 영주의 여행지다. 쉼, 산책, 느린 회복, 관계를 돌아보는 맥락에 적합하다.',
      '12',
    ],
    [
      'seonbi-world',
      '선비세상',
      '선비세상은 선비 문화와 체험을 연결하는 영주의 관광 자원이다. 가족 여행, 체험, 실천형 추천, 선비 정체성 설명에 활용할 수 있다.',
      '12',
    ],
    [
      'punggi-ginseng-market',
      '풍기인삼시장',
      '풍기인삼시장은 영주의 지역 특산물과 시장 경험을 연결하는 장소다. 현실적인 동선, 활기, 회복과 건강의 비유에 활용하기 좋다.',
      '39',
    ],
  ].map(([sourceId, title, content, contentTypeId]) => ({
    source_type: 'tourism_place' as const,
    source_id: sourceId,
    title,
    content,
    metadata: { area: '영주', contentTypeId },
  })),
  {
    source_type: 'recommendation_rule',
    source_id: 'seonbi-type-route-rule',
    title: '선비유형별 추천 규칙',
    content:
      '퇴계형은 소수서원과 부석사처럼 사색과 학문성이 강한 장소를, 율곡형은 선비세상과 풍기인삼시장처럼 실용적이고 동선이 분명한 장소를, 처사형은 무섬마을과 부석사처럼 느린 쉼이 있는 장소를, 우국형은 소수서원과 선비세상처럼 가치와 행동의 서사가 있는 장소를 우선 연결한다.',
    metadata: { rule: 'recommendation' },
  },
]
