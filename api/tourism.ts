/* global process */
import type { TourismContent } from '../src/features/tourism/tourismTypes'

type TourismProxyType = 'areaBased' | 'keyword'
type TourismEmptyReason = 'missing_api_key' | 'no_data' | 'api_error'

interface VercelRequestLike {
  method?: string
  query: {
    type?: string | string[]
    keyword?: string | string[]
    contentTypeId?: string | string[]
  }
}

interface VercelResponseLike {
  status(code: number): VercelResponseLike
  json(body: TourismProxyResponse): void
  setHeader(name: string, value: string): void
}

interface TourismProxyResponse {
  ok: boolean
  items: TourismContent[]
  emptyReason?: TourismEmptyReason
  message?: string
}

interface RawTourismItem {
  contentid?: string
  contenttypeid?: string
  title?: string
  addr1?: string
  addr2?: string
  mapx?: string | number
  mapy?: string | number
  firstimage?: string
  firstimage2?: string
  tel?: string
  overview?: string
  areacode?: string
  sigungucode?: string
  cat1?: string
  cat2?: string
  cat3?: string
}

interface RawTourApiBody {
  response?: {
    body?: {
      items?: {
        item?: RawTourismItem[] | RawTourismItem
      }
    }
  }
}

const defaultNumOfRows = '12'
const yeongjuKeyword = '영주'

export default async function handler(
  request: VercelRequestLike,
  response: VercelResponseLike,
) {
  response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')

  if (request.method && request.method !== 'GET') {
    response.status(405).json({
      ok: false,
      items: [],
      emptyReason: 'api_error',
      message: '지원하지 않는 요청입니다.',
    })
    return
  }

  // TourAPI 서비스키는 서버 환경변수로만 관리한다.
  // VITE_ 접두사를 사용하지 않는다.
  // 프론트 코드에 서비스키를 넣지 않는다.
  const baseUrl = process.env.TOUR_API_BASE_URL
  const serviceKey = process.env.TOUR_API_SERVICE_KEY

  if (!baseUrl || !serviceKey) {
    response.status(200).json({
      ok: true,
      items: [],
      emptyReason: 'missing_api_key',
      message: '공공데이터 서비스키 설정 후 관광 정보를 불러올 수 있습니다.',
    })
    return
  }

  try {
    const url = buildTourApiUrl(baseUrl, serviceKey, request.query)
    const tourApiResponse = await fetch(url)

    if (!tourApiResponse.ok) {
      response.status(502).json({
        ok: false,
        items: [],
        emptyReason: 'api_error',
        message: '공공데이터를 불러오는 중 문제가 발생했습니다.',
      })
      return
    }

    const data = (await tourApiResponse.json()) as RawTourApiBody
    const rawItems = data.response?.body?.items?.item
    const rawItemList = Array.isArray(rawItems)
      ? rawItems
      : rawItems
        ? [rawItems]
        : []
    const items = rawItemList.map(normalizeTourismItem)

    response.status(200).json({
      ok: true,
      items,
      emptyReason: items.length > 0 ? undefined : 'no_data',
      message:
        items.length > 0
          ? undefined
          : '조건에 맞는 영주 관광 정보가 없습니다.',
    })
  } catch {
    response.status(500).json({
      ok: false,
      items: [],
      emptyReason: 'api_error',
      message: '공공데이터를 불러오는 중 문제가 발생했습니다.',
    })
  }
}

function buildTourApiUrl(
  baseUrl: string,
  serviceKey: string,
  query: VercelRequestLike['query'],
) {
  const url = new URL(baseUrl)
  const proxyType = getQueryValue(query.type) as TourismProxyType | undefined
  const keyword = getQueryValue(query.keyword)
  const contentTypeId = getQueryValue(query.contentTypeId)

  url.searchParams.set('MobileOS', 'ETC')
  url.searchParams.set('MobileApp', 'YeongjuSeonbiGil')
  url.searchParams.set('_type', 'json')
  url.searchParams.set('serviceKey', serviceKey)
  url.searchParams.set('numOfRows', defaultNumOfRows)
  url.searchParams.set('pageNo', '1')

  // 지역코드 조회 후 확정 필요. 확정 전에는 임의 areaCode/sigunguCode를
  // 하드코딩하지 않고 영주 키워드 검색 기반으로 제한한다.
  if (proxyType === 'keyword') {
    url.searchParams.set('keyword', [yeongjuKeyword, keyword].filter(Boolean).join(' '))
  } else {
    url.searchParams.set('keyword', yeongjuKeyword)
  }

  if (contentTypeId) {
    url.searchParams.set('contentTypeId', contentTypeId)
  }

  return url
}

function normalizeTourismItem(raw: RawTourismItem): TourismContent {
  const address = [raw.addr1, raw.addr2].filter(Boolean).join(' ') || undefined

  return {
    contentId: raw.contentid,
    contentTypeId: raw.contenttypeid,
    title: raw.title,
    address,
    mapX: toNumber(raw.mapx),
    mapY: toNumber(raw.mapy),
    firstImage: raw.firstimage,
    firstImage2: raw.firstimage2,
    tel: raw.tel,
    overview: raw.overview,
    areaCode: raw.areacode,
    sigunguCode: raw.sigungucode,
    category: [raw.cat1, raw.cat2, raw.cat3].filter(Boolean).join('>') || undefined,
    source: 'TourAPI',
  }
}

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function toNumber(value: string | number | undefined) {
  if (value === undefined || value === '') return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}
