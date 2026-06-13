import type { TourismContent, TourismContentSource } from './tourismTypes'

export interface SourceInventoryItem {
  id: string
  label: string
  fileName: string
  rows: number
  appliedRows: number
  note?: string
}

export interface VisitorDemandSummary {
  placeId: string
  placeName: string
  coordinates: [number, number]
  dateRange: {
    start: string
    end: string
  }
  totalVisitors: number
  paidVisitors: number
  freeVisitors: number
  latestCompleteMonth: {
    month: string
    visitors: number
    freeVisitors: number
    paidVisitors: number
  }
  peakMonth: {
    month: number
    totalVisitors: number
    averageDailyVisitors: number
    demandIndex: number
  }
  monthlyAverageByMonth: Array<{
    month: number
    totalVisitors: number
    averageDailyVisitors: number
    demandIndex: number
  }>
  yearlyTotals: Array<{
    year: number
    visitors: number
  }>
  latestMonthlyTrend: Array<{
    month: string
    visitors: number
    freeVisitors: number
    paidVisitors: number
  }>
}

export interface YeongjuFestival {
  id: string
  title: string
  venue?: string
  startDate?: string
  endDate?: string
  content?: string
  address?: string
  mapX?: number
  mapY?: number
  coordinateSource?: string
  source: 'YeongjuFestivalOpenData'
}

export interface YeongjuTourismSupplement {
  id: string
  title: string
  category?: string
  address?: string
  mapX?: number
  mapY?: number
  parkingCapacity?: number
  overview?: string
  publicFacilities?: string
  lodgingFacilities?: string
  provider?: string
  source: 'NationalTourismStandardData'
}

export interface YeongjuParkingLot {
  id: string
  title: string
  address?: string
  mapX?: number
  mapY?: number
  capacity: number
  feeInfo?: string
  operationDays?: string
  weekdayHours?: string
  hasAccessibleParking: boolean
  provider?: string
  source: 'NationalParkingStandardData'
}

export interface YeongjuRailRoute {
  routeName: string
  weekdayPassengerTrainCount: number
  weekendPassengerTrainCount: number
  weekdayElectricTrainCount: number
  weekendElectricTrainCount: number
  weekdayByTrainType: Record<string, number>
  weekendByTrainType: Record<string, number>
  source: 'KorailRouteFrequencyOpenData'
}

export interface YeongjuLocalRestaurant {
  id: string
  title: string
  address?: string
  tel?: string
  mapX?: number
  mapY?: number
  coordinateSource?: string
  source: 'YeongjuGoodRestaurantOpenData'
}

export interface YeongjuSafeRestaurant extends Omit<YeongjuLocalRestaurant, 'source'> {
  businessType?: string
  businessTypeDetail?: string
  designationDate?: string
  source: 'YeongjuSafeRestaurantOpenData'
}

export interface YeongjuRuralTourismFacility extends Omit<YeongjuLocalRestaurant, 'source'> {
  source: 'YeongjuRuralTourismOpenData'
}

export interface YeongjuRuralHomestay extends Omit<YeongjuLocalRestaurant, 'source'> {
  businessStartDate?: string
  roomCount?: number
  source: 'YeongjuRuralHomestayOpenData'
}

export interface YeongjuPublicToilet extends Omit<YeongjuLocalRestaurant, 'source'> {
  roadAddress?: string
  lotAddress?: string
  openHours?: string
  manager?: string
  emergencyBell: boolean
  emergencyBellPlace?: string
  disabledToiletCount: number
  childToiletCount: number
  source: 'PublicToiletOpenData'
}

export interface YeongjuOfficialSeonbiFestival {
  id: string
  title: string
  startDate: string
  endDate: string
  venues: string[]
  address?: string
  mapX?: number
  mapY?: number
  coordinateSource?: string
  programs: string[]
  homepage?: string
  source: 'YeongjuOfficialFestival'
}

export interface YeongjuWeatherSummary {
  locationLabel: string
  nx: number
  ny: number
  baseDate: string
  baseTime: string
  forecastDate?: string
  temperatureC?: number
  precipitationProbability?: number
  precipitationType?: string
  sky?: string
  uvIndex?: {
    areaNo: string
    issuedAt?: string
    current?: number
    maxNext12Hours?: number
    level?: string
  }
  guidance: string[]
  source: 'KmaWeatherForecast'
}

export interface YeongjuAccessibilitySummary {
  accessibleParkingLots: number
  accessiblePublicToilets: number
  totalParkingLots: number
  totalPublicToilets: number
  guidance: string[]
  source: 'BarrierFreeTourismInfo'
}

export interface YeongjuTransitAccess {
  mainStation: {
    title: string
    mapX: number
    mapY: number
    address?: string
  }
  weekdayPassengerTrainCount: number
  weekendPassengerTrainCount: number
  routeCount: number
  guidance: string
  source: 'TagoTransitOpenData'
}

export interface YeongjuEnrichmentData {
  version: 1
  generatedAt: string
  sourceInventory: SourceInventoryItem[]
  visitorDemand: VisitorDemandSummary
  festivals: YeongjuFestival[]
  tourismSupplements: YeongjuTourismSupplement[]
  parkingLots: YeongjuParkingLot[]
  railAccess: YeongjuRailRoute[]
  localRestaurants: YeongjuLocalRestaurant[]
  safeRestaurants: YeongjuSafeRestaurant[]
  ruralTourismFacilities: YeongjuRuralTourismFacility[]
  ruralHomestays: YeongjuRuralHomestay[]
  publicToilets: YeongjuPublicToilet[]
  officialSeonbiFestival?: YeongjuOfficialSeonbiFestival
  weatherSummary?: YeongjuWeatherSummary
  accessibilitySummary?: YeongjuAccessibilitySummary
  transitAccess?: YeongjuTransitAccess
}

export type LocalTourismContentGroup =
  | 'all'
  | 'attraction'
  | 'culture'
  | 'festival'
  | 'restaurant'
  | 'accommodation'
  | 'experience'

let enrichmentCache: Promise<YeongjuEnrichmentData | null> | null = null

export function loadYeongjuEnrichmentData() {
  if (!enrichmentCache) {
    enrichmentCache = fetch('/data/yeongju-enrichment.json')
      .then(async (response) => {
        if (!response.ok) return null
        return (await response.json()) as YeongjuEnrichmentData
      })
      .catch(() => null)
  }

  return enrichmentCache
}

export async function getLocalTourismContents(
  group: LocalTourismContentGroup = 'all',
  keyword?: string,
) {
  const data = await loadYeongjuEnrichmentData()
  if (!data) return []

  return createLocalTourismContents(data, group).filter((item) =>
    matchesKeyword(item, keyword),
  )
}

export function createLocalTourismContents(
  data: YeongjuEnrichmentData,
  group: LocalTourismContentGroup = 'all',
): TourismContent[] {
  const contents: TourismContent[] = []

  if (group === 'all' || group === 'culture') {
    contents.push(createSosuVisitorContent(data.visitorDemand))
  }

  if (group === 'all' || group === 'attraction') {
    contents.push(...data.tourismSupplements.map(createTourismSupplementContent))
    contents.push(...data.ruralTourismFacilities.map(createRuralTourismFacilityContent))
  }

  if (group === 'all' || group === 'festival') {
    if (data.officialSeonbiFestival) {
      contents.push(createOfficialSeonbiFestivalContent(data.officialSeonbiFestival))
    }
    contents.push(...data.festivals.map(createFestivalContent))
  }

  if (group === 'all' || group === 'restaurant') {
    const restaurantContents = [
      ...data.localRestaurants.map(createLocalRestaurantContent),
      ...data.safeRestaurants.map(createSafeRestaurantContent),
    ]
    contents.push(...(group === 'all' ? restaurantContents.slice(0, 36) : restaurantContents))
  }

  if (group === 'all' || group === 'accommodation') {
    const homestayContents = data.ruralHomestays.map(createRuralHomestayContent)
    contents.push(...(group === 'all' ? homestayContents.slice(0, 24) : homestayContents))
  }

  if (group === 'experience') {
    contents.push(...data.ruralTourismFacilities.map(createRuralTourismFacilityContent))
  }

  return dedupeLocalTourismContents(contents)
}

export function getTourismContentSourceLabel(source: TourismContentSource | undefined) {
  if (source === 'SosuVisitorStats') return '소수서원 입장객'
  if (source === 'YeongjuFestivalOpenData') return '영주시 축제'
  if (source === 'YeongjuOfficialFestival') return '공식 선비문화축제'
  if (source === 'YeongjuGoodRestaurantOpenData') return '영주시 맛집'
  if (source === 'YeongjuSafeRestaurantOpenData') return '안심식당'
  if (source === 'YeongjuRuralTourismOpenData') return '농촌관광시설'
  if (source === 'YeongjuRuralHomestayOpenData') return '농어촌민박'
  if (source === 'NationalTourismStandardData') return '관광지 표준데이터'
  if (source === 'NationalParkingStandardData') return '주차장 표준데이터'
  if (source === 'PublicToiletOpenData') return '공중화장실'
  if (source === 'KorailRouteFrequencyOpenData') return '철도 운행횟수'
  if (source === 'KmaWeatherForecast') return '기상청 단기예보'
  if (source === 'KmaLivingWeatherIndex') return '기상청 생활기상'
  if (source === 'TagoTransitOpenData') return '교통 접근성'
  if (source === 'BarrierFreeTourismInfo') return '무장애 편의근거'
  return 'TourAPI'
}

function createSosuVisitorContent(visitorDemand: VisitorDemandSummary): TourismContent {
  const latestMonth = visitorDemand.latestCompleteMonth

  return {
    contentId: 'local-sosu-visitor-demand',
    contentTypeId: '14',
    title: visitorDemand.placeName,
    address: '경상북도 영주시 순흥면 소수서원 권역',
    mapX: visitorDemand.coordinates[0],
    mapY: visitorDemand.coordinates[1],
    category: '역사문화 관광지',
    overview: `${visitorDemand.dateRange.start}부터 ${visitorDemand.dateRange.end}까지 누적 입장객 ${visitorDemand.totalVisitors.toLocaleString()}명을 기록한 영주 대표 역사문화 거점입니다.`,
    parking: '소수서원·선비촌 권역 주차장 데이터와 함께 검토합니다.',
    source: 'SosuVisitorStats',
    sourceLabel: getTourismContentSourceLabel('SosuVisitorStats'),
    dataEvidence: [
      `누적 입장객 ${visitorDemand.totalVisitors.toLocaleString()}명`,
      `${latestMonth.month} 입장객 ${latestMonth.visitors.toLocaleString()}명`,
      `${visitorDemand.peakMonth.month}월 평균 일 방문 ${visitorDemand.peakMonth.averageDailyVisitors.toLocaleString()}명`,
    ],
  }
}

function createTourismSupplementContent(item: YeongjuTourismSupplement): TourismContent {
  return {
    contentId: `local-${item.id}`,
    contentTypeId: '12',
    title: item.title,
    address: item.address,
    mapX: item.mapX,
    mapY: item.mapY,
    category: item.category,
    overview: item.overview,
    parking: formatParkingCapacity(item.parkingCapacity),
    source: item.source,
    sourceLabel: getTourismContentSourceLabel(item.source),
    parkingCapacity: item.parkingCapacity,
    dataEvidence: [
      item.publicFacilities ? `편의시설: ${item.publicFacilities}` : '',
      item.parkingCapacity ? `주차 가능 ${item.parkingCapacity.toLocaleString()}면` : '',
      item.lodgingFacilities ? `숙박 연계: ${item.lodgingFacilities}` : '',
    ].filter(Boolean),
  }
}

function createFestivalContent(item: YeongjuFestival): TourismContent {
  const period = [item.startDate, item.endDate].filter(Boolean).join(' ~ ')

  return {
    contentId: `local-${item.id}`,
    contentTypeId: '15',
    title: item.title,
    address: item.address ?? item.venue,
    mapX: item.mapX,
    mapY: item.mapY,
    category: '축제',
    overview: item.content,
    operatingHours: period || undefined,
    eventPeriod: period || undefined,
    source: item.source,
    sourceLabel: getTourismContentSourceLabel(item.source),
    coordinateSource: item.coordinateSource,
    dataEvidence: [
      item.venue ? `개최장소: ${item.venue}` : '',
      period ? `기간: ${period}` : '',
      item.coordinateSource === 'representative-venue-keyword'
        ? '원본 좌표가 비어 있어 개최장소 대표 좌표를 적용'
        : '',
    ].filter(Boolean),
  }
}

function createOfficialSeonbiFestivalContent(
  item: YeongjuOfficialSeonbiFestival,
): TourismContent {
  const period = `${item.startDate} ~ ${item.endDate}`

  return {
    contentId: `local-${item.id}`,
    contentTypeId: '15',
    title: item.title,
    address: item.address,
    mapX: item.mapX,
    mapY: item.mapY,
    category: '공식 축제',
    homepage: item.homepage,
    overview: `${item.venues.join(', ')}에서 열리는 영주 대표 선비문화축제입니다. ${item.programs.join(', ')} 프로그램을 여행 동선에 함께 고려합니다.`,
    operatingHours: period,
    eventPeriod: period,
    source: item.source,
    sourceLabel: getTourismContentSourceLabel(item.source),
    coordinateSource: item.coordinateSource,
    dataEvidence: [
      `공식 기간: ${period}`,
      `주요 권역: ${item.venues.join(', ')}`,
      `프로그램: ${item.programs.join(', ')}`,
    ],
  }
}

function createLocalRestaurantContent(item: YeongjuLocalRestaurant): TourismContent {
  return {
    contentId: `local-${item.id}`,
    contentTypeId: '39',
    title: item.title,
    address: item.address,
    mapX: item.mapX,
    mapY: item.mapY,
    tel: item.tel,
    category: '영주맛집',
    overview: '영주시 맛집 현황 공공데이터에 등록된 지역 음식점입니다.',
    source: item.source,
    sourceLabel: getTourismContentSourceLabel(item.source),
    coordinateSource: item.coordinateSource,
    dataEvidence: [
      '영주시 맛집 현황 등록',
      item.address ? `주소: ${item.address}` : '',
      item.coordinateSource === 'address-area-centroid'
        ? '주소 권역 대표 좌표로 지도 표시'
        : '',
    ].filter(Boolean),
  }
}

function createSafeRestaurantContent(item: YeongjuSafeRestaurant): TourismContent {
  const category = item.businessTypeDetail
    ? `안심식당 · ${item.businessTypeDetail}`
    : '안심식당'

  return {
    contentId: `local-${item.id}`,
    contentTypeId: '39',
    title: item.title,
    address: item.address,
    mapX: item.mapX,
    mapY: item.mapY,
    tel: item.tel,
    category,
    overview:
      '영주시 안심식당 공공데이터에 등록된 음식점입니다. 가족 동반 식사 후보를 고를 때 위생·안심 근거로 활용합니다.',
    source: item.source,
    sourceLabel: getTourismContentSourceLabel(item.source),
    coordinateSource: item.coordinateSource,
    designationDate: item.designationDate,
    recommendationSignals: ['안심식당', item.businessTypeDetail ?? '음식점'].filter(Boolean),
    dataEvidence: [
      '안심식당 지정',
      item.businessType ? `업종: ${item.businessType}` : '',
      item.businessTypeDetail ? `세부 업종: ${item.businessTypeDetail}` : '',
      item.designationDate ? `지정일: ${item.designationDate}` : '',
    ].filter(Boolean),
  }
}

function createRuralTourismFacilityContent(
  item: YeongjuRuralTourismFacility,
): TourismContent {
  return {
    contentId: `local-${item.id}`,
    contentTypeId: '12',
    title: item.title,
    address: item.address,
    mapX: item.mapX,
    mapY: item.mapY,
    tel: item.tel,
    category: '농촌관광시설',
    overview:
      '영주시 농촌관광시설 공공데이터에 포함된 체험·관광 후보입니다. 자연·마을·체험형 동선 보강에 활용합니다.',
    source: item.source,
    sourceLabel: getTourismContentSourceLabel(item.source),
    coordinateSource: item.coordinateSource,
    recommendationSignals: ['농촌관광', '체험', '가족형 동선'],
    dataEvidence: [
      '영주시 농촌관광시설 등록',
      item.address ? `주소: ${item.address}` : '',
      item.coordinateSource === 'known-place' ? '주요 관광지 대표 좌표 적용' : '',
    ].filter(Boolean),
  }
}

function createRuralHomestayContent(item: YeongjuRuralHomestay): TourismContent {
  return {
    contentId: `local-${item.id}`,
    contentTypeId: '32',
    title: item.title,
    address: item.address,
    mapX: item.mapX,
    mapY: item.mapY,
    tel: item.tel,
    category: '농어촌민박',
    overview:
      '영주시 농어촌민박 신고 공공데이터에 포함된 숙박 후보입니다. 1박 2일 전환과 권역별 체류 추천에 활용합니다.',
    source: item.source,
    sourceLabel: getTourismContentSourceLabel(item.source),
    coordinateSource: item.coordinateSource,
    roomCount: item.roomCount,
    recommendationSignals: ['숙박', '체류형 여행', '농어촌민박'],
    dataEvidence: [
      '농어촌민박 신고 데이터',
      item.roomCount ? `객실 수 ${item.roomCount.toLocaleString()}실` : '',
      item.businessStartDate ? `영업 시작일: ${item.businessStartDate}` : '',
    ].filter(Boolean),
  }
}

function dedupeLocalTourismContents(contents: TourismContent[]) {
  const uniqueContents = new Map<string, TourismContent>()

  for (const content of contents) {
    const key = [
      content.title?.replace(/\s+/g, '').trim(),
      content.address?.replace(/\s+/g, '').trim(),
      content.contentTypeId,
    ]
      .filter(Boolean)
      .join('|')

    if (!key || !uniqueContents.has(key)) {
      uniqueContents.set(key || content.contentId || String(uniqueContents.size), content)
      continue
    }

    const existing = uniqueContents.get(key)
    if (!existing) continue
    uniqueContents.set(key, {
      ...existing,
      sourceLabel: combineUniqueText(existing.sourceLabel, content.sourceLabel),
      dataEvidence: combineUniqueList(existing.dataEvidence, content.dataEvidence),
      recommendationSignals: combineUniqueList(
        existing.recommendationSignals,
        content.recommendationSignals,
      ),
    })
  }

  return Array.from(uniqueContents.values())
}

function combineUniqueText(...values: Array<string | undefined>) {
  return values
    .filter((value): value is string => Boolean(value?.trim()))
    .filter((value, index, list) => list.indexOf(value) === index)
    .join(' + ')
}

function combineUniqueList(
  first: string[] | undefined,
  second: string[] | undefined,
) {
  return [...(first ?? []), ...(second ?? [])].filter((value, index, list) => {
    return Boolean(value?.trim()) && list.indexOf(value) === index
  })
}

function formatParkingCapacity(capacity: number | undefined) {
  if (!capacity) return undefined
  return `주차 가능 ${capacity.toLocaleString()}면`
}

function matchesKeyword(content: TourismContent, keyword: string | undefined) {
  const normalizedKeyword = keyword?.trim()
  if (!normalizedKeyword) return true

  const searchableText = [
    content.title,
    content.address,
    content.category,
    content.overview,
    content.sourceLabel,
    ...(content.dataEvidence ?? []),
    ...(content.recommendationSignals ?? []),
  ]
    .filter(Boolean)
    .join(' ')

  return searchableText.includes(normalizedKeyword)
}
