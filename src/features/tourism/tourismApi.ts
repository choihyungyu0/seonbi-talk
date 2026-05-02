import type {
  TourismApiResponse,
  TourismContent,
  TourismQueryParams,
} from './tourismTypes'

const defaultNumOfRows = 12
const yeongjuKeyword = '영주'

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

export async function getYeongjuTourismContents(): Promise<TourismApiResponse> {
  return requestTourismContents({ keyword: yeongjuKeyword })
}

export async function searchYeongjuTourismByKeyword(
  keyword: string,
): Promise<TourismApiResponse> {
  const query = [yeongjuKeyword, keyword].filter(Boolean).join(' ')
  return requestTourismContents({ keyword: query })
}

export function normalizeTourismItem(raw: RawTourismItem): TourismContent {
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

async function requestTourismContents(
  params: TourismQueryParams,
): Promise<TourismApiResponse> {
  const baseUrl = import.meta.env.VITE_TOUR_API_BASE_URL as string | undefined
  const serviceKey = import.meta.env.VITE_TOUR_API_SERVICE_KEY as string | undefined

  // VITE_ values are exposed to the browser. Move this request behind a
  // serverless proxy before using real production keys.
  if (!baseUrl || !serviceKey) {
    return {
      contents: [],
      status: 'missing-api-key',
      reason: 'missing-api-key',
      message: '공공데이터 연동 준비 중',
    }
  }

  try {
    const url = buildTourApiUrl(baseUrl, serviceKey, params)
    const response = await fetch(url)
    if (!response.ok) {
      return {
        contents: [],
        status: 'error',
        reason: 'error',
        message: '공공데이터 조회에 실패했습니다.',
      }
    }

    const data = (await response.json()) as RawTourApiBody
    const rawItems = data.response?.body?.items?.item
    const items = Array.isArray(rawItems)
      ? rawItems
      : rawItems
        ? [rawItems]
        : []
    const contents = items.map(normalizeTourismItem)

    return {
      contents,
      status: contents.length > 0 ? 'ready' : 'empty',
      reason: contents.length > 0 ? undefined : 'empty-data',
    }
  } catch {
    return {
      contents: [],
      status: 'error',
      reason: 'error',
      message: '공공데이터 조회에 실패했습니다.',
    }
  }
}

function buildTourApiUrl(
  baseUrl: string,
  serviceKey: string,
  params: TourismQueryParams,
) {
  const url = new URL(baseUrl)
  url.searchParams.set('MobileOS', 'ETC')
  url.searchParams.set('MobileApp', 'YeongjuSeonbiGil')
  url.searchParams.set('_type', 'json')
  url.searchParams.set('serviceKey', serviceKey)
  url.searchParams.set('numOfRows', String(params.numOfRows ?? defaultNumOfRows))
  url.searchParams.set('pageNo', String(params.pageNo ?? 1))

  if (params.keyword) url.searchParams.set('keyword', params.keyword)
  if (params.areaCode) url.searchParams.set('areaCode', params.areaCode)
  if (params.sigunguCode) url.searchParams.set('sigunguCode', params.sigunguCode)
  if (params.contentTypeId) {
    url.searchParams.set('contentTypeId', params.contentTypeId)
  }

  return url
}

function toNumber(value: string | number | undefined) {
  if (value === undefined || value === '') return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}
