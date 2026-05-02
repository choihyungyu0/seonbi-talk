/* global process */
import type { TourismContent } from '../src/features/tourism/tourismTypes'

type TourismProxyType =
  | 'areaCode'
  | 'sigunguCode'
  | 'areaBased'
  | 'keyword'
  | 'detailCommon'
  | 'detailIntro'
  | 'detailImage'
type TourismEmptyReason = 'missing_api_key' | 'no_data' | 'api_error'

interface VercelRequestLike {
  method?: string
  query: {
    type?: string | string[]
    areaCode?: string | string[]
    sigunguCode?: string | string[]
    keyword?: string | string[]
    contentId?: string | string[]
    contentTypeId?: string | string[]
    pageNo?: string | string[]
    numOfRows?: string | string[]
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
  debug?: TourismDebugInfo
}

interface TourismDebugInfo {
  endpoint: string
  status?: number
  statusText?: string
  tourApiHeaderResultCode?: string
  tourApiHeaderResultMsg?: string
}

interface RawTourismItem {
  code?: string
  name?: string
  rnum?: string | number
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
  homepage?: string
  usetime?: string
  usetimeculture?: string
  opentime?: string
  restdate?: string
  restdateculture?: string
  restdatefood?: string
  restdateshopping?: string
  usefee?: string
  usefeeleports?: string
  usefeeparking?: string
  parking?: string
  parkingculture?: string
  parkingfood?: string
  parkingleports?: string
  parkingshopping?: string
  originimgurl?: string
  smallimageurl?: string
  imgname?: string
  areacode?: string
  sigungucode?: string
  cat1?: string
  cat2?: string
  cat3?: string
}

interface RawTourApiBody {
  response?: {
    header?: {
      resultCode?: string
      resultMsg?: string
    }
    body?: {
      items?: '' | Record<string, never> | {
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

  let tourApiUrl: URL
  let proxyType: TourismProxyType

  try {
    const builtUrl = buildTourApiUrl(baseUrl, serviceKey, request.query)
    tourApiUrl = builtUrl.url
    proxyType = builtUrl.proxyType
  } catch {
    response.status(400).json({
      ok: false,
      items: [],
      emptyReason: 'api_error',
      message: '공공데이터 요청 파라미터를 확인해주세요.',
    })
    return
  }

  const debugBase = createDebugInfo(tourApiUrl)

  try {
    const tourApiResponse = await fetch(tourApiUrl)
    const data = (await tourApiResponse.json().catch(() => ({}))) as RawTourApiBody
    const debug = createDebugInfo(tourApiUrl, tourApiResponse, data)

    if (!tourApiResponse.ok || data.response?.header?.resultCode !== '0000') {
      response.status(tourApiResponse.ok ? 200 : 502).json({
        ok: false,
        items: [],
        emptyReason: 'api_error',
        message: '공공데이터를 불러오는 중 문제가 발생했습니다.',
        debug: getDevelopmentDebug(debug),
      })
      return
    }

    const rawItemList = getRawItemList(data)
    const items = rawItemList.map((item) => normalizeTourismItem(item, proxyType))

    response.status(200).json({
      ok: true,
      items,
      emptyReason: items.length > 0 ? undefined : 'no_data',
      message:
        items.length > 0
          ? undefined
          : '조건에 맞는 영주 관광 정보가 없습니다.',
      debug: getDevelopmentDebug(debug),
    })
  } catch {
    response.status(500).json({
      ok: false,
      items: [],
      emptyReason: 'api_error',
      message: '공공데이터를 불러오는 중 문제가 발생했습니다.',
      debug: getDevelopmentDebug(debugBase),
    })
  }
}

function buildTourApiUrl(
  baseUrl: string,
  serviceKey: string,
  query: VercelRequestLike['query'],
) {
  const proxyType = normalizeProxyType(getQueryValue(query.type))
  const url = new URL(`${normalizeBaseUrl(baseUrl)}/${getEndpointPath(proxyType)}`)
  const areaCode = getQueryValue(query.areaCode)
  const sigunguCode = getQueryValue(query.sigunguCode)
  const keyword = getQueryValue(query.keyword) || yeongjuKeyword
  const contentId = getQueryValue(query.contentId)
  const contentTypeId = getQueryValue(query.contentTypeId)
  const pageNo = getQueryValue(query.pageNo) || '1'
  const numOfRows = getQueryValue(query.numOfRows) || defaultNumOfRows

  url.searchParams.set('MobileOS', 'ETC')
  url.searchParams.set('MobileApp', 'YeongjuSeonbiGil')
  url.searchParams.set('_type', 'json')
  url.searchParams.set('serviceKey', serviceKey)
  url.searchParams.set('numOfRows', numOfRows)
  url.searchParams.set('pageNo', pageNo)

  if (isDetailProxyType(proxyType)) {
    if (!contentId) throw new Error('contentId is required for detail type')
    url.searchParams.set('contentId', contentId)

    if (proxyType === 'detailCommon') {
      url.searchParams.set('defaultYN', 'Y')
      url.searchParams.set('firstImageYN', 'Y')
      url.searchParams.set('areacodeYN', 'Y')
      url.searchParams.set('catcodeYN', 'Y')
      url.searchParams.set('addrinfoYN', 'Y')
      url.searchParams.set('mapinfoYN', 'Y')
      url.searchParams.set('overviewYN', 'Y')
    }

    if (proxyType === 'detailIntro') {
      if (!contentTypeId) throw new Error('contentTypeId is required for detailIntro')
      url.searchParams.set('contentTypeId', contentTypeId)
    }

    if (proxyType === 'detailImage') {
      url.searchParams.set('imageYN', 'Y')
      url.searchParams.set('subImageYN', 'Y')
    }

    return { url, proxyType }
  }

  if (proxyType === 'sigunguCode') {
    if (!areaCode) throw new Error('areaCode is required for sigunguCode')
    url.searchParams.set('areaCode', areaCode)
  }

  if (proxyType === 'keyword') {
    url.searchParams.set('keyword', keyword)
    url.searchParams.set('arrange', 'A')
  }

  if (proxyType === 'areaBased') {
    // 지역코드 조회 후 확정 필요. 확정 전에는 임의 areaCode/sigunguCode를
    // 하드코딩하지 않고 클라이언트가 전달한 값만 사용한다.
    if (areaCode) url.searchParams.set('areaCode', areaCode)
    if (sigunguCode) url.searchParams.set('sigunguCode', sigunguCode)
    if (contentTypeId) url.searchParams.set('contentTypeId', contentTypeId)
  }

  if (proxyType === 'areaCode' && areaCode) {
    url.searchParams.set('areaCode', areaCode)
  }

  return { url, proxyType }
}

function normalizeProxyType(type: string | undefined): TourismProxyType {
  if (
    type === 'areaCode' ||
    type === 'sigunguCode' ||
    type === 'keyword' ||
    type === 'areaBased' ||
    type === 'detailCommon' ||
    type === 'detailIntro' ||
    type === 'detailImage'
  ) {
    return type
  }

  return 'areaBased'
}

function getEndpointPath(type: TourismProxyType) {
  if (type === 'areaCode' || type === 'sigunguCode') return 'areaCode2'
  if (type === 'keyword') return 'searchKeyword2'
  if (type === 'detailCommon') return 'detailCommon2'
  if (type === 'detailIntro') return 'detailIntro2'
  if (type === 'detailImage') return 'detailImage2'
  return 'areaBasedList2'
}

function isDetailProxyType(type: TourismProxyType) {
  return (
    type === 'detailCommon' ||
    type === 'detailIntro' ||
    type === 'detailImage'
  )
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '')
}

function getRawItemList(data: RawTourApiBody) {
  const items = data.response?.body?.items
  if (!items || typeof items === 'string') return []
  if (!('item' in items) || !items.item) return []
  return Array.isArray(items.item) ? items.item : [items.item]
}

function normalizeTourismItem(
  raw: RawTourismItem,
  proxyType: TourismProxyType,
): TourismContent {
  const address = [raw.addr1, raw.addr2].filter(Boolean).join(' ') || undefined
  const code = raw.code

  return {
    code,
    name: raw.name,
    contentId: raw.contentid,
    contentTypeId: raw.contenttypeid,
    title: raw.title ?? raw.name,
    address,
    mapX: toNumber(raw.mapx),
    mapY: toNumber(raw.mapy),
    firstImage: raw.firstimage,
    firstImage2: raw.firstimage2,
    tel: raw.tel,
    overview: raw.overview,
    homepage: raw.homepage,
    operatingHours: raw.usetime ?? raw.usetimeculture ?? raw.opentime,
    restDate:
      raw.restdate ??
      raw.restdateculture ??
      raw.restdatefood ??
      raw.restdateshopping,
    useFee: raw.usefee ?? raw.usefeeleports ?? raw.usefeeparking,
    parking:
      raw.parking ??
      raw.parkingculture ??
      raw.parkingfood ??
      raw.parkingleports ??
      raw.parkingshopping,
    originImage: raw.originimgurl,
    smallImage: raw.smallimageurl,
    imageName: raw.imgname,
    areaCode: raw.areacode ?? (proxyType === 'areaCode' ? code : undefined),
    sigunguCode:
      raw.sigungucode ?? (proxyType === 'sigunguCode' ? code : undefined),
    category: [raw.cat1, raw.cat2, raw.cat3].filter(Boolean).join('>') || undefined,
    source: 'TourAPI',
  }
}

function createDebugInfo(
  url: URL,
  response?: Response,
  data?: RawTourApiBody,
): TourismDebugInfo {
  return {
    endpoint: createSafeEndpoint(url),
    status: response?.status,
    statusText: response?.statusText,
    tourApiHeaderResultCode: data?.response?.header?.resultCode,
    tourApiHeaderResultMsg: data?.response?.header?.resultMsg,
  }
}

function createSafeEndpoint(url: URL) {
  const safeUrl = new URL(url.toString())
  safeUrl.searchParams.delete('serviceKey')
  return `${safeUrl.pathname}${safeUrl.search}`
}

function getDevelopmentDebug(debug: TourismDebugInfo) {
  return process.env.NODE_ENV === 'production' ? undefined : debug
}

function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function toNumber(value: string | number | undefined) {
  if (value === undefined || value === '') return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}
