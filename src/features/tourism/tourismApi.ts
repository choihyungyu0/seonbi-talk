import type {
  TourismApiResponse,
  TourismContent,
  TourismDetailResponse,
  TourismQueryParams,
} from './tourismTypes'
import { getLocalTourismContents, type LocalTourismContentGroup } from './yeongjuEnrichment'

const yeongjuKeyword = '영주'
const yeongjuAreaCode = '35'
// TourAPI areaCode2 기준: 경상북도(areaCode=35) 영주시 sigunguCode=14.
const yeongjuSigunguCode = '14'
const yeongjuAddressKeywords = ['영주시', 'Yeongju']
const yeongjuTitleKeywords = [
  '영주',
  '소수서원',
  '부석사',
  '무섬마을',
  '선비세상',
  '선비촌',
  '풍기',
  '소백산',
  '죽령',
]
const tourismContentTypes = {
  attraction: '12',
  culture: '14',
  festival: '15',
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
  return requestTourismProxyWithLocal(createYeongjuAreaBasedParams(), 'all')
}

export async function getYeongjuTouristAttractions(): Promise<TourismApiResponse> {
  return requestTourismProxyWithLocal(
    createYeongjuAreaBasedParams(tourismContentTypes.attraction),
    'attraction',
  )
}

export async function getYeongjuCultureFacilities(): Promise<TourismApiResponse> {
  return requestTourismProxyWithLocal(
    createYeongjuAreaBasedParams(tourismContentTypes.culture),
    'culture',
  )
}

export async function getYeongjuFestivals(): Promise<TourismApiResponse> {
  return requestTourismProxyWithLocal(
    createYeongjuAreaBasedParams(tourismContentTypes.festival),
    'festival',
  )
}

export async function getYeongjuExperienceFacilities(): Promise<TourismApiResponse> {
  return requestTourismProxyWithLocal(
    { type: 'keyword', keyword: `${yeongjuKeyword} 체험` },
    'experience',
  )
}

export async function getYeongjuAccommodations(): Promise<TourismApiResponse> {
  return requestTourismProxyWithLocal(
    createYeongjuAreaBasedParams(tourismContentTypes.accommodation),
    'accommodation',
  )
}

export async function getYeongjuRestaurants(): Promise<TourismApiResponse> {
  return requestTourismProxyWithLocal(
    createYeongjuAreaBasedParams(tourismContentTypes.restaurant),
    'restaurant',
  )
}

export async function searchYeongjuTourismByKeyword(
  keyword: string,
): Promise<TourismApiResponse> {
  const query = [yeongjuKeyword, keyword].filter(Boolean).join(' ')
  return requestTourismProxyWithLocal(
    { type: 'keyword', keyword: query },
    'all',
    keyword,
  )
}

export async function getTourismDetail(
  selectedItem: TourismContent,
): Promise<TourismDetailResponse> {
  const contentId = selectedItem.contentId
  const contentTypeId = selectedItem.contentTypeId
  const fallbackResponse = createFallbackDetailResponse(selectedItem)

  if (
    !contentId ||
    !contentTypeId ||
    (selectedItem.source && selectedItem.source !== 'TourAPI')
  ) {
    return fallbackResponse
  }

  try {
    const [commonResponse, introResponse, imageResponse] = await Promise.all([
      requestTourismProxy({ type: 'detailCommon', contentId }),
      requestTourismProxy({ type: 'detailIntro', contentId, contentTypeId }),
      requestTourismProxy({ type: 'detailImage', contentId }),
    ])

    warnFailedDetailResponse('detailCommon', commonResponse, contentId, contentTypeId)
    warnFailedDetailResponse('detailIntro', introResponse, contentId, contentTypeId)
    warnFailedDetailResponse('detailImage', imageResponse, contentId, contentTypeId)

    const commonItem = commonResponse.contents[0]
    const introItem = introResponse.contents[0]
    const mergedItem = mergeTourismItems(selectedItem, commonItem, introItem)
    const images = imageResponse.status === 'ready' ? imageResponse.contents : []

    if (hasDisplayableTourismInfo(mergedItem) || images.length > 0) {
      return {
        status: 'ready',
        detail: {
          item: mergedItem,
          images,
        },
      }
    }
  } catch (error) {
    console.warn('[tourism] detail request unavailable', {
      detailType: 'detail',
      status: 'error',
      message: error instanceof Error ? error.message : 'detail request failed',
      contentId,
      contentTypeId,
    })
  }

  return fallbackResponse
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
    sourceLabel: raw.sourceLabel,
    dataEvidence: raw.dataEvidence,
    eventPeriod: raw.eventPeriod,
    parkingCapacity: raw.parkingCapacity,
    coordinateSource: raw.coordinateSource,
    roomCount: raw.roomCount,
    designationDate: raw.designationDate,
    recommendationSignals: raw.recommendationSignals,
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

function createFallbackDetailResponse(
  selectedItem: TourismContent,
): TourismDetailResponse {
  return hasDisplayableTourismInfo(selectedItem)
    ? {
        status: 'ready',
        detail: {
          item: selectedItem,
          images: [],
        },
      }
    : {
        status: 'error',
        reason: 'api_error',
        message: '상세 조회에 필요한 공공데이터 식별자가 없습니다.',
      }
}

function hasDisplayableTourismInfo(item: TourismContent) {
  return Boolean(
    hasText(item.title) ||
      hasText(item.address) ||
      hasText(item.firstImage) ||
      hasText(item.firstImage2) ||
      hasText(item.tel) ||
      hasText(item.overview) ||
      item.mapX !== undefined ||
      item.mapY !== undefined,
  )
}

function mergeTourismItems(...items: Array<TourismContent | undefined>) {
  return items.reduce<TourismContent>((mergedItem, item) => {
    if (!item) return mergedItem

    return {
      ...mergedItem,
      ...Object.fromEntries(
        Object.entries(item).filter(([, value]) => {
          return value !== undefined && value !== ''
        }),
      ),
    }
  }, {})
}

function hasText(value: string | undefined) {
  return Boolean(value?.trim())
}

function warnFailedDetailResponse(
  detailType: 'detailCommon' | 'detailIntro' | 'detailImage',
  response: TourismApiResponse,
  contentId: string,
  contentTypeId: string,
) {
  if (response.status === 'ready') return

  console.warn('[tourism] detail request unavailable', {
    detailType,
    status: response.status,
    message: response.message ?? response.reason ?? 'no detail data',
    contentId,
    contentTypeId,
  })
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
    const normalizedContents = (data.items ?? []).map(normalizeTourismItem)
    const contents = shouldFilterYeongjuContents(params.type)
      ? normalizedContents.filter(isYeongjuTourismContent)
      : normalizedContents

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

async function requestTourismProxyWithLocal(
  params: TourismQueryParams,
  localGroup: LocalTourismContentGroup,
  localKeyword?: string,
): Promise<TourismApiResponse> {
  const [remoteResponse, localContents] = await Promise.all([
    requestTourismProxy(params),
    getLocalTourismContents(localGroup, localKeyword),
  ])
  const contents = mergeTourismContentLists(remoteResponse.contents, localContents)

  if (contents.length === 0) return remoteResponse

  return {
    ...remoteResponse,
    contents,
    status: 'ready',
    reason: undefined,
    message: createMergedTourismMessage(remoteResponse.message, localContents.length),
  }
}

function shouldFilterYeongjuContents(type: TourismQueryParams['type']) {
  return type === 'areaBased' || type === 'keyword' || type === undefined
}

function isYeongjuTourismContent(content: TourismContent) {
  const address = content.address ?? ''
  if (address) {
    return yeongjuAddressKeywords.some((keyword) => address.includes(keyword))
  }

  const searchableText = [
    content.title,
    content.name,
    content.category,
    content.overview,
  ]
    .filter(Boolean)
    .join(' ')

  return yeongjuTitleKeywords.some((keyword) => searchableText.includes(keyword))
}

function mergeTourismContentLists(
  remoteContents: TourismContent[],
  localContents: TourismContent[],
) {
  const uniqueContents = new Map<string, TourismContent>()

  for (const content of localContents) {
    uniqueContents.set(getTourismContentDedupeKey(content), content)
  }

  for (const content of remoteContents) {
    const key = getTourismContentDedupeKey(content)
    const existingContent = uniqueContents.get(key)
    uniqueContents.set(
      key,
      existingContent
        ? mergeTourismContentForDisplay(existingContent, content)
        : content,
    )
  }

  return Array.from(uniqueContents.values())
}

function mergeTourismContentForDisplay(
  localContent: TourismContent,
  remoteContent: TourismContent,
): TourismContent {
  const mergedContent = mergeTourismItems(localContent, remoteContent)
  const sourceLabels = [
    remoteContent.sourceLabel,
    localContent.sourceLabel,
    remoteContent.source === 'TourAPI' ? 'TourAPI' : undefined,
  ]
    .filter(Boolean)
    .filter((label, index, labels) => labels.indexOf(label) === index)

  return {
    ...mergedContent,
    sourceLabel: sourceLabels.join(' + ') || mergedContent.sourceLabel,
    dataEvidence: [
      ...(localContent.dataEvidence ?? []),
      ...(remoteContent.dataEvidence ?? []),
    ].filter((evidence, index, evidenceList) => {
      return evidenceList.indexOf(evidence) === index
    }),
  }
}

function getTourismContentDedupeKey(content: TourismContent) {
  const title = normalizeDedupeText(content.title ?? content.name)
  if (title) return `title:${title}`
  if (content.mapX !== undefined && content.mapY !== undefined) {
    return `coord:${content.mapX.toFixed(5)}:${content.mapY.toFixed(5)}`
  }
  return `id:${content.contentId ?? Math.random().toString(36)}`
}

function normalizeDedupeText(value: string | undefined) {
  return value
    ?.replace(/\[[^\]]+\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase()
}

function createMergedTourismMessage(message: string | undefined, localCount: number) {
  if (localCount === 0) return message

  const localMessage = `영주시 보강 공공데이터 ${localCount}건을 함께 적용했습니다.`
  return message ? `${message} ${localMessage}` : localMessage
}
