import type {
  TourismApiResponse,
  TourismContent,
  TourismQueryParams,
} from './tourismTypes'

const yeongjuKeyword = '영주'

interface TourismProxyResponse {
  ok: boolean
  items?: TourismContent[]
  emptyReason?: 'missing_api_key' | 'no_data' | 'api_error'
  message?: string
}

export async function getYeongjuTourismContents(): Promise<TourismApiResponse> {
  return requestTourismProxy({ type: 'areaBased' })
}

export async function searchYeongjuTourismByKeyword(
  keyword: string,
): Promise<TourismApiResponse> {
  const query = [yeongjuKeyword, keyword].filter(Boolean).join(' ')
  return requestTourismProxy({ type: 'keyword', keyword: query })
}

export function normalizeTourismItem(raw: TourismContent): TourismContent {
  return {
    contentId: raw.contentId,
    contentTypeId: raw.contentTypeId,
    title: raw.title,
    address: raw.address,
    mapX: raw.mapX,
    mapY: raw.mapY,
    firstImage: raw.firstImage,
    firstImage2: raw.firstImage2,
    tel: raw.tel,
    overview: raw.overview,
    areaCode: raw.areaCode,
    sigunguCode: raw.sigunguCode,
    category: raw.category,
    source: raw.source,
  }
}

async function requestTourismProxy(
  params: TourismQueryParams & { type: 'areaBased' | 'keyword' },
): Promise<TourismApiResponse> {
  const url = new URL('/api/tourism', window.location.origin)
  url.searchParams.set('type', params.type)
  if (params.keyword) url.searchParams.set('keyword', params.keyword)
  if (params.contentTypeId) {
    url.searchParams.set('contentTypeId', params.contentTypeId)
  }

  try {
    const response = await fetch(url)
    const data = (await response.json()) as TourismProxyResponse
    const contents = (data.items ?? []).map(normalizeTourismItem)

    if (data.emptyReason === 'missing_api_key') {
      return {
        contents: [],
        status: 'missing-api-key',
        reason: 'missing_api_key',
        message: data.message,
      }
    }

    if (!data.ok || data.emptyReason === 'api_error') {
      return {
        contents: [],
        status: 'error',
        reason: 'api_error',
        message: data.message,
      }
    }

    return {
      contents,
      status: contents.length > 0 ? 'ready' : 'empty',
      reason: contents.length > 0 ? undefined : 'no_data',
      message: data.message,
    }
  } catch {
    return {
      contents: [],
      status: 'error',
      reason: 'api_error',
      message: '공공데이터를 불러오는 중 문제가 발생했습니다.',
    }
  }
}
