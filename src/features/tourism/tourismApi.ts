import type {
  TourismApiResponse,
  TourismContent,
  TourismDetailResponse,
  TourismQueryParams,
} from './tourismTypes'

const yeongjuKeyword = '영주'
const yeongjuAreaCode = '35'
const yeongjuSigunguCode = '12'
const tourismContentTypes = {
  attraction: '12',
  culture: '14',
  accommodation: '32',
  restaurant: '39',
} as const

interface TourismProxyResponse {
  ok: boolean
  items?: TourismContent[]
  emptyReason?: 'missing_api_key' | 'no_data' | 'api_error'
  message?: string
}

export async function getYeongjuTourismContents(): Promise<TourismApiResponse> {
  return requestTourismProxy(createYeongjuAreaBasedParams())
}

export async function getYeongjuTouristAttractions(): Promise<TourismApiResponse> {
  return requestTourismProxy(
    createYeongjuAreaBasedParams(tourismContentTypes.attraction),
  )
}

export async function getYeongjuCultureFacilities(): Promise<TourismApiResponse> {
  return requestTourismProxy(
    createYeongjuAreaBasedParams(tourismContentTypes.culture),
  )
}

export async function getYeongjuAccommodations(): Promise<TourismApiResponse> {
  return requestTourismProxy(
    createYeongjuAreaBasedParams(tourismContentTypes.accommodation),
  )
}

export async function getYeongjuRestaurants(): Promise<TourismApiResponse> {
  return requestTourismProxy(
    createYeongjuAreaBasedParams(tourismContentTypes.restaurant),
  )
}

export async function searchYeongjuTourismByKeyword(
  keyword: string,
): Promise<TourismApiResponse> {
  const query = [yeongjuKeyword, keyword].filter(Boolean).join(' ')
  return requestTourismProxy({ type: 'keyword', keyword: query })
}

export async function getTourismDetail(
  contentId: string,
  contentTypeId: string,
): Promise<TourismDetailResponse> {
  const [commonResponse, introResponse, imageResponse] = await Promise.all([
    requestTourismProxy({ type: 'detailCommon', contentId }),
    requestTourismProxy({ type: 'detailIntro', contentId, contentTypeId }),
    requestTourismProxy({ type: 'detailImage', contentId }),
  ])

  if (commonResponse.status === 'error' || introResponse.status === 'error') {
    return {
      status: 'error',
      reason: 'api_error',
      message: '상세 정보를 불러오는 중 문제가 발생했습니다.',
    }
  }

  const commonItem = commonResponse.contents[0]
  const introItem = introResponse.contents[0]

  if (!commonItem && !introItem) {
    return {
      status: 'empty',
      reason: 'no_data',
      message: '상세 정보가 없습니다.',
    }
  }

  return {
    status: 'ready',
    detail: {
      item: {
        ...commonItem,
        ...introItem,
      },
      images: imageResponse.status === 'ready' ? imageResponse.contents : [],
    },
  }
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
    homepage: raw.homepage,
    operatingHours: raw.operatingHours,
    restDate: raw.restDate,
    useFee: raw.useFee,
    parking: raw.parking,
    originImage: raw.originImage,
    smallImage: raw.smallImage,
    imageName: raw.imageName,
    areaCode: raw.areaCode,
    sigunguCode: raw.sigunguCode,
    category: raw.category,
    source: raw.source,
  }
}

function createYeongjuAreaBasedParams(contentTypeId?: string) {
  return {
    type: 'areaBased' as const,
    areaCode: yeongjuAreaCode,
    sigunguCode: yeongjuSigunguCode,
    contentTypeId,
  }
}

async function requestTourismProxy(
  params: TourismQueryParams,
): Promise<TourismApiResponse> {
  const url = new URL('/api/tourism', window.location.origin)
  url.searchParams.set('type', params.type ?? 'areaBased')
  if (params.keyword) url.searchParams.set('keyword', params.keyword)
  if (params.areaCode) url.searchParams.set('areaCode', params.areaCode)
  if (params.sigunguCode) url.searchParams.set('sigunguCode', params.sigunguCode)
  if (params.contentId) url.searchParams.set('contentId', params.contentId)
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
