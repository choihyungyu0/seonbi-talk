/* global process */
import type { YeongjuWeatherSummary } from '../src/features/tourism/yeongjuEnrichment'

// 영주 여행 판단 근거 패널의 '날씨'를 실시간으로 제공하는 프록시.
// 기상청(KMA) 단기예보(getVilageFcst) + 생활기상 자외선지수(getUVIdxV5)를
// data.go.kr 공용 서비스키(TOUR_API_SERVICE_KEY)로 서버측에서 호출한다.
// (서버측 http 호출이라 키 노출·CORS·혼합콘텐츠 문제가 없다.)
// 오프라인 빌드 스크립트 scripts/build-yeongju-enrichment.py 의 로직을 이식했으며,
// 기준시각(base_date/base_time, UV time)만 하드코딩 대신 매 호출마다 KST 기준으로 계산한다.

interface VercelRequestLike {
  method?: string
}

interface VercelResponseLike {
  status(code: number): VercelResponseLike
  json(body: WeatherProxyResponse): void
  setHeader(name: string, value: string): void
}

type WeatherEmptyReason = 'missing_api_key' | 'api_error' | 'method_not_allowed'

interface WeatherProxyResponse {
  ok: boolean
  weatherSummary?: YeongjuWeatherSummary
  observedAt?: string
  reason?: WeatherEmptyReason
}

interface KmaForecastItem {
  category?: string
  fcstDate?: string
  fcstTime?: string
  fcstValue?: string
}

interface KmaUvItem {
  date?: string
  h0?: string
  h3?: string
  h6?: string
  h9?: string
  h12?: string
}

interface KmaBody {
  response?: {
    header?: { resultCode?: string; resultMsg?: string }
    body?: { items?: { item?: unknown } }
  }
}

const KST_OFFSET_MS = 9 * 60 * 60 * 1000
const YEONGJU_GRID = { nx: 89, ny: 111 }
const YEONGJU_AREA_NO = '4721000000'
const VILAGE_FCST_URL =
  'http://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst'
const UV_INDEX_URL =
  'http://apis.data.go.kr/1360000/LivingWthrIdxServiceV5/getUVIdxV5'
// 단기예보 발표시각(KST). 각 시각 +10분쯤 자료가 열려 안전마진을 둔다.
const VILAGE_BASE_TIMES = [2, 5, 8, 11, 14, 17, 20, 23]

export default async function handler(
  request: VercelRequestLike,
  response: VercelResponseLike,
) {
  if (request.method && request.method !== 'GET') {
    response.setHeader('Cache-Control', 'no-store')
    response.status(405).json({ ok: false, reason: 'method_not_allowed' })
    return
  }

  const serviceKey = process.env.TOUR_API_SERVICE_KEY
  if (!serviceKey) {
    response.setHeader('Cache-Control', 'no-store')
    response.status(200).json({ ok: false, reason: 'missing_api_key' })
    return
  }

  try {
    const nowKst = new Date(Date.now() + KST_OFFSET_MS)
    const forecastItems = await fetchVilageForecast(serviceKey, nowKst)

    if (forecastItems.length === 0) {
      response.setHeader('Cache-Control', 'no-store')
      response.status(200).json({ ok: false, reason: 'api_error' })
      return
    }

    const uvItem = await fetchUvIndex(serviceKey, nowKst)
    const weatherSummary = buildWeatherSummary(forecastItems, uvItem, nowKst)

    // 라이브 응답은 30분 엣지 캐시(KMA 호출 최소화 + 반응성 유지).
    response.setHeader(
      'Cache-Control',
      's-maxage=1800, stale-while-revalidate=3600',
    )
    response.status(200).json({
      ok: true,
      weatherSummary,
      observedAt: toKstIso(nowKst),
    })
  } catch {
    response.setHeader('Cache-Control', 'no-store')
    response.status(200).json({ ok: false, reason: 'api_error' })
  }
}

async function fetchVilageForecast(
  serviceKey: string,
  nowKst: Date,
): Promise<KmaForecastItem[]> {
  const { baseDate, baseTime } = computeVilageBase(nowKst)
  const url = new URL(VILAGE_FCST_URL)
  url.searchParams.set('serviceKey', serviceKey)
  url.searchParams.set('dataType', 'JSON')
  url.searchParams.set('pageNo', '1')
  url.searchParams.set('numOfRows', '120')
  url.searchParams.set('base_date', baseDate)
  url.searchParams.set('base_time', baseTime)
  url.searchParams.set('nx', String(YEONGJU_GRID.nx))
  url.searchParams.set('ny', String(YEONGJU_GRID.ny))

  const res = await fetch(url.toString())
  if (!res.ok) return []
  const body = (await res.json().catch(() => null)) as KmaBody | null
  return extractItems(body) as KmaForecastItem[]
}

// UV는 부가 정보라 best-effort. 계산한 3시간 슬롯이 아직 미발표면 직전 슬롯을 한 번 더 시도한다.
async function fetchUvIndex(
  serviceKey: string,
  nowKst: Date,
): Promise<KmaUvItem | null> {
  for (const time of computeUvTimes(nowKst)) {
    try {
      const url = new URL(UV_INDEX_URL)
      url.searchParams.set('serviceKey', serviceKey)
      url.searchParams.set('dataType', 'JSON')
      url.searchParams.set('pageNo', '1')
      url.searchParams.set('numOfRows', '10')
      url.searchParams.set('areaNo', YEONGJU_AREA_NO)
      url.searchParams.set('time', time)

      const res = await fetch(url.toString())
      if (!res.ok) continue
      const body = (await res.json().catch(() => null)) as KmaBody | null
      const items = extractItems(body) as KmaUvItem[]
      if (items.length > 0) return items[0]
    } catch {
      // 다음 슬롯 시도
    }
  }
  return null
}

function buildWeatherSummary(
  items: KmaForecastItem[],
  uv: KmaUvItem | null,
  nowKst: Date,
): YeongjuWeatherSummary {
  const first = firstForecastTime(items)
  const values: Record<string, string> = {}
  for (const item of items) {
    if (
      item.category &&
      cleanText(item.fcstDate) === first.date &&
      cleanText(item.fcstTime) === first.time
    ) {
      values[item.category] = cleanText(item.fcstValue)
    }
  }

  const pop = toInt(values.POP)
  const uvValues = uv
    ? [uv.h0, uv.h3, uv.h6, uv.h9, uv.h12]
        .map(toInt)
        .filter((value): value is number => value !== undefined)
    : []
  const maxUv = uvValues.length > 0 ? Math.max(...uvValues) : 0

  const guidance: string[] = []
  if (pop !== undefined && pop >= 50) {
    guidance.push('강수확률이 높아 실내 체험과 짧은 이동 동선을 우선합니다.')
  }
  if (maxUv >= 8) {
    guidance.push('자외선지수가 높아 그늘·실내 휴식 지점을 함께 추천합니다.')
  }
  if (guidance.length === 0) {
    guidance.push('야외 관광과 실내 휴식 지점을 함께 조합할 수 있는 날씨입니다.')
  }

  const { baseDate, baseTime } = computeVilageBase(nowKst)
  const summary: YeongjuWeatherSummary = {
    locationLabel: '영주시 중심 격자',
    nx: YEONGJU_GRID.nx,
    ny: YEONGJU_GRID.ny,
    baseDate: `${baseDate.slice(0, 4)}-${baseDate.slice(4, 6)}-${baseDate.slice(6, 8)}`,
    baseTime: `${baseTime.slice(0, 2)}:${baseTime.slice(2, 4)}`,
    forecastDate: formatForecastTime(first),
    temperatureC: toInt(values.TMP),
    precipitationProbability: pop,
    precipitationType: precipitationTypeLabel(values.PTY),
    sky: skyLabel(values.SKY),
    guidance,
    source: 'KmaWeatherForecast',
  }

  if (uv) {
    summary.uvIndex = {
      areaNo: YEONGJU_AREA_NO,
      issuedAt: cleanText(uv.date) || undefined,
      current: toInt(uv.h0),
      maxNext12Hours: maxUv,
      level: uvLevel(maxUv),
    }
  }

  return summary
}

function computeVilageBase(nowKst: Date): { baseDate: string; baseTime: string } {
  // 발표 +10분 안전마진. 자정 직후(02:10 이전)는 전날 2300 발표를 사용한다.
  const cutoff = new Date(nowKst.getTime() - 10 * 60 * 1000)
  const hour = cutoff.getUTCHours()
  let slot = -1
  for (const candidate of VILAGE_BASE_TIMES) {
    if (candidate <= hour) slot = candidate
  }
  if (slot === -1) {
    const prev = new Date(cutoff.getTime() - 24 * 60 * 60 * 1000)
    return { baseDate: ymd(prev), baseTime: '2300' }
  }
  return { baseDate: ymd(cutoff), baseTime: `${pad2(slot)}00` }
}

function computeUvTimes(nowKst: Date): string[] {
  // UV는 3시간 간격 발표. 계산 슬롯과 직전 슬롯(발표 지연 대비)을 순서대로 반환.
  const cutoff = new Date(nowKst.getTime() - 10 * 60 * 1000)
  const slotHour = cutoff.getUTCHours() - (cutoff.getUTCHours() % 3)
  const primary = new Date(cutoff)
  primary.setUTCHours(slotHour, 0, 0, 0)
  const fallback = new Date(primary.getTime() - 3 * 60 * 60 * 1000)
  return [uvTime(primary), uvTime(fallback)]
}

function extractItems(body: KmaBody | null): unknown[] {
  const item = body?.response?.body?.items?.item
  if (Array.isArray(item)) return item
  if (item && typeof item === 'object') return [item]
  return []
}

function firstForecastTime(items: KmaForecastItem[]): {
  date: string
  time: string
} {
  const slots = new Set<string>()
  for (const item of items) {
    const date = cleanText(item.fcstDate)
    const time = cleanText(item.fcstTime)
    if (date && time) slots.add(`${date}\t${time}`)
  }
  const sorted = [...slots].sort()
  if (sorted.length === 0) return { date: '', time: '' }
  const [date, time] = sorted[0].split('\t')
  return { date, time }
}

function formatForecastTime(slot: { date: string; time: string }): string | undefined {
  if (!slot.date || !slot.time) return undefined
  return `${slot.date.slice(0, 4)}-${slot.date.slice(4, 6)}-${slot.date.slice(6, 8)} ${slot.time.slice(0, 2)}:${slot.time.slice(2, 4)}`
}

function precipitationTypeLabel(value: string | undefined): string {
  const labels: Record<string, string> = {
    '0': '없음',
    '1': '비',
    '2': '비/눈',
    '3': '눈',
    '4': '소나기',
  }
  return labels[cleanText(value)] ?? '미확인'
}

function skyLabel(value: string | undefined): string {
  const labels: Record<string, string> = { '1': '맑음', '3': '구름많음', '4': '흐림' }
  return labels[cleanText(value)] ?? '미확인'
}

function uvLevel(value: number): string {
  if (value >= 11) return '위험'
  if (value >= 8) return '매우 높음'
  if (value >= 6) return '높음'
  if (value >= 3) return '보통'
  return '낮음'
}

function toKstIso(nowKst: Date): string {
  return (
    `${nowKst.getUTCFullYear()}-${pad2(nowKst.getUTCMonth() + 1)}-${pad2(nowKst.getUTCDate())}` +
    `T${pad2(nowKst.getUTCHours())}:${pad2(nowKst.getUTCMinutes())}:${pad2(nowKst.getUTCSeconds())}+09:00`
  )
}

function ymd(date: Date): string {
  return `${date.getUTCFullYear()}${pad2(date.getUTCMonth() + 1)}${pad2(date.getUTCDate())}`
}

function uvTime(date: Date): string {
  return `${ymd(date)}${pad2(date.getUTCHours())}`
}

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

function cleanText(value: unknown): string {
  if (value === null || value === undefined) return ''
  // 전각 공백(U+3000)을 일반 공백으로 치환. 리터럴 대신 코드포인트로 표기한다.
  return String(value).split(String.fromCharCode(0x3000)).join(' ').trim()
}

function toInt(value: unknown): number | undefined {
  const text = cleanText(value)
  if (!text) return undefined
  const parsed = Number.parseFloat(text)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : undefined
}
