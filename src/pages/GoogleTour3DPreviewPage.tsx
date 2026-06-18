import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { CourseProgressBadge } from '../components/course/CourseProgressBadge'
import { CourseMap } from '../components/tourism/CourseMap'
import {
  toegyeCourseStops,
  type CourseStop,
  type RouteCoordinate,
  type ToegyeCourseStopId,
} from '../data/courseStops'
import { seonbiTypes, type SeonbiType } from '../features/seonbi-test/types'
import {
  requestGoogleCourseRoute,
  type GoogleCourseRouteSource,
} from '../features/tourism/googleRouteApi'
import { getTourismPrimaryImageUrl } from '../features/tourism/tourismImageUrl'
import type { TourismContent } from '../features/tourism/tourismTypes'

type GoogleMaps3DLoadStatus = 'idle' | 'loading' | 'ready' | 'missing-key' | 'error'

interface Tour3DCameraTarget {
  id: string
  name: string
  lat: number
  lng: number
  altitude: number
  range: number
  tilt: number
  heading: number
}

interface Tour3DSpot extends Tour3DCameraTarget {
  placeType: string
  score: number
  seonbiTags: string[]
  publicDataSource: string
  aiReason: string
  accessibility: {
    parking: string
    toilet: string
    lodging: string
  }
}

interface GoogleMap3DCenter {
  lat: number
  lng: number
  altitude: number
}

interface GoogleMap3DCamera {
  center: GoogleMap3DCenter
  range: number
  tilt: number
  heading: number
}

interface GoogleMap3DElement extends HTMLElement {
  center?: GoogleMap3DCenter
  range?: number
  tilt?: number
  heading?: number
  mode?: string
  flyCameraTo?: (options: {
    endCamera: GoogleMap3DCamera
    durationMillis?: number
  }) => void
}

interface GoogleMap3DMarkerElement extends HTMLElement {
  position?: GoogleMap3DCenter
  label?: string
  title: string
  altitudeMode?: string
  collisionBehavior?: string
  collisionPriority?: number
  drawsWhenOccluded?: boolean
  extruded?: boolean
  sizePreserved?: boolean
  zIndex?: number
}

interface GoogleMap3DPolylineElement extends HTMLElement {
  altitudeMode?: string
  drawsOccludedSegments?: boolean
  extruded?: boolean
  geodesic?: boolean
  outerColor?: string
  outerWidth?: number
  path?: RouteCoordinate[]
  strokeColor?: string
  strokeWidth?: number
  zIndex?: number
}

interface GoogleMap3DPlaceClickEvent extends Event {
  placeId?: string
  preventDefault: () => void
}

interface GoogleMaps3DLibrary {
  Map3DElement: new (options?: GoogleMap3DCamera & { mode?: string }) => GoogleMap3DElement
  Marker3DInteractiveElement: new (options?: {
    altitudeMode?: string
    collisionBehavior?: string
    collisionPriority?: number
    drawsWhenOccluded?: boolean
    extruded?: boolean
    label?: string
    position?: GoogleMap3DCenter
    sizePreserved?: boolean
    title?: string
    zIndex?: number
  }) => GoogleMap3DMarkerElement
  Polyline3DElement?: new (options?: {
    altitudeMode?: string
    drawsOccludedSegments?: boolean
    extruded?: boolean
    geodesic?: boolean
    outerColor?: string
    outerWidth?: number
    path?: RouteCoordinate[]
    strokeColor?: string
    strokeWidth?: number
    zIndex?: number
  }) => GoogleMap3DPolylineElement
  AltitudeMode?: {
    CLAMP_TO_GROUND?: string
    RELATIVE_TO_GROUND?: string
  }
  CollisionBehavior?: {
    OPTIONAL_AND_HIDES_LOWER_PRIORITY?: string
    REQUIRED?: string
  }
  MapMode?: {
    HYBRID?: string
  }
}

declare global {
  interface Window {
    google?: {
      maps?: {
        importLibrary?: (libraryName: 'maps3d') => Promise<GoogleMaps3DLibrary>
      }
    }
    __yeongjuGoogleMaps3DLoaded?: () => void
    gm_authFailure?: () => void
  }
}

const googleMapsScriptId = 'google-maps-3d-script'
const googleMapsScriptCallback = '__yeongjuGoogleMaps3DLoaded'
const googleMapsLoadTimeoutMs = 15000
const initialCamera: Tour3DCameraTarget = {
  id: 'toegye-route-overview',
  name: '선비길 전체',
  lat: 36.8686,
  lng: 128.6328,
  altitude: 1800,
  range: 42000,
  tilt: 54,
  heading: 352,
}

const courseStopById = new Map<ToegyeCourseStopId, CourseStop>(
  toegyeCourseStops.map((stop) => [stop.id, stop]),
)

function getToegyeCourseStop(stopId: ToegyeCourseStopId) {
  const stop = courseStopById.get(stopId)
  if (!stop) {
    throw new Error(`퇴계형 코스 지점을 찾을 수 없습니다: ${stopId}`)
  }

  return stop
}

type Tour3DRouteStopId = Exclude<ToegyeCourseStopId, 'seonbi-record'>
type Tour3DRouteStop = Extract<
  (typeof toegyeCourseStops)[number],
  { id: Tour3DRouteStopId }
>

const tour3DRouteStops = toegyeCourseStops.filter(
  (stop): stop is Tour3DRouteStop => stop.id !== 'seonbi-record',
)

const tour2DRouteItems: TourismContent[] = tour3DRouteStops.map((stop) => ({
  contentId: stop.id,
  title: stop.name,
  name: stop.name,
  address: stop.address,
  mapX: stop.lng,
  mapY: stop.lat,
  category: 'course',
  source: 'NationalTourismStandardData',
  sourceLabel: '퇴계형 선비길 코스',
  dataEvidence: ['3D 코스 미리보기의 주요 경유지 좌표'],
}))

const tour3DFallbackRoutePath: RouteCoordinate[] = [
  { lat: 36.92556, lng: 128.58 },
  { lat: 36.928557, lng: 128.582677 },
  { lat: 36.9281, lng: 128.5892 },
  { lat: 36.9531, lng: 128.626 },
  { lat: 36.998969, lng: 128.68746 },
  { lat: 36.9484, lng: 128.6735 },
  { lat: 36.8766, lng: 128.6428 },
  { lat: 36.7331746, lng: 128.6210331 },
]

const tour3DSpots: Tour3DSpot[] = [
  {
    id: 'sosu-seowon',
    name: getToegyeCourseStop('sosu-seowon').name,
    lat: getToegyeCourseStop('sosu-seowon').lat,
    lng: getToegyeCourseStop('sosu-seowon').lng,
    altitude: 620,
    range: 4200,
    tilt: 65,
    heading: 10,
    placeType: '유네스코 서원',
    score: 96,
    seonbiTags: ['학문형', '사색형'],
    publicDataSource: '공공데이터포털 TourAPI 관광지 좌표 기반',
    aiReason:
      '한국 성리학의 결을 직접 느끼기 좋은 핵심 지점이라 선비길 대표 코스로 추천합니다.',
    accessibility: {
      parking: '소수서원 주차장 접근성이 좋습니다.',
      toilet: '관람 동선 주변 공중화장실 이용이 가능합니다.',
      lodging: '풍기·영주 시내 숙박권과 연계하기 좋습니다.',
    },
  },
  {
    id: 'seonbichon',
    name: getToegyeCourseStop('seonbichon').name,
    lat: getToegyeCourseStop('seonbichon').lat,
    lng: getToegyeCourseStop('seonbichon').lng,
    altitude: 620,
    range: 3800,
    tilt: 65,
    heading: 15,
    placeType: '전통문화 마을',
    score: 92,
    seonbiTags: ['체험형', '가족형'],
    publicDataSource: '공공데이터포털 TourAPI 문화관광 좌표 기반',
    aiReason:
      '전통가옥과 체험 요소가 밀집해 소수서원 관람 뒤 자연스럽게 이어지는 코스로 좋습니다.',
    accessibility: {
      parking: '소수서원·선비촌 권역 주차장을 함께 이용하기 좋습니다.',
      toilet: '관광지 내부 편의시설 접근이 무난합니다.',
      lodging: '풍기온천·영주 시내 숙박과 묶기 좋습니다.',
    },
  },
  {
    id: 'museom-village',
    name: getToegyeCourseStop('museom-village').name,
    lat: getToegyeCourseStop('museom-village').lat,
    lng: getToegyeCourseStop('museom-village').lng,
    altitude: 520,
    range: 4200,
    tilt: 65,
    heading: -10,
    placeType: '전통마을',
    score: 91,
    seonbiTags: ['풍경형', '느린여행형'],
    publicDataSource: '공공데이터포털 TourAPI 관광지 좌표 기반',
    aiReason:
      '외나무다리와 고택 풍경이 강해 사진과 산책 중심 여행자에게 잘 맞습니다.',
    accessibility: {
      parking: '마을 입구 주차 후 도보 이동을 권장합니다.',
      toilet: '관광안내 동선 주변 공중화장실을 확인하면 좋습니다.',
      lodging: '영주 시내 숙박과 당일 왕복 코스로 묶기 좋습니다.',
    },
  },
  {
    id: 'buseoksa',
    name: getToegyeCourseStop('buseoksa').name,
    lat: getToegyeCourseStop('buseoksa').lat,
    lng: getToegyeCourseStop('buseoksa').lng,
    altitude: 780,
    range: 4600,
    tilt: 65,
    heading: -20,
    placeType: '사찰·문화유산',
    score: 97,
    seonbiTags: ['문화유산형', '풍경형'],
    publicDataSource: '공공데이터포털 TourAPI 관광지 좌표 기반',
    aiReason:
      '무량수전과 산사 조망이 강한 목적지라 영주 여행의 하이라이트로 추천합니다.',
    accessibility: {
      parking: '부석사 관광 주차장 이용 후 도보 진입이 일반적입니다.',
      toilet: '주차장과 관람 동선 주변 편의시설을 활용할 수 있습니다.',
      lodging: '부석·풍기 권역 숙박 또는 영주 시내 숙박과 연계 가능합니다.',
    },
  },
]

const missionCopyByStopId: Record<Tour3DRouteStopId, string> = {
  'sosu-seowon': '학문 정신 해설 듣기',
  seonbichon: '전통 생활 공간 둘러보기',
  buseoksa: '자연 속 사색 미션',
  'museom-village': '고요한 길 걷기',
}

interface RoutePreviewStop {
  spotId: Tour3DRouteStopId
  number: number
  name: string
  mission: string
  iconPath: `/images/new/${string}`
}

interface RouteMarkerDisplayOffset {
  lat: number
  lng: number
  altitude: number
  collisionPriority: number
  zIndex: number
}

type MissionTourApiImageUrls = Partial<Record<Tour3DRouteStopId, string>>

interface TourismProxyImageResponse {
  ok: boolean
  items?: TourismContent[]
}

const missionTourApiImageCacheKey = 'yeongju-tour3d-mission-tourapi-images-v1'
const missionTourApiKeywordBackoffMs = 5 * 60 * 1000
let missionTourApiImageMemoryCache: MissionTourApiImageUrls | null = null
let missionTourApiImageRequestPromise: Promise<MissionTourApiImageUrls> | null = null
let missionTourApiKeywordBackoffUntil = 0

const routePreviewStops: RoutePreviewStop[] = tour3DRouteStops.map((stop) => ({
  spotId: stop.id,
  number: stop.order,
  name: stop.name,
  mission: missionCopyByStopId[stop.id],
  iconPath: stop.iconPath,
}))

// Keep actual route coordinates intact; only spread close marker billboards in overview.
const routeMarkerDisplayOffsets: Partial<Record<Tour3DRouteStopId, RouteMarkerDisplayOffset>> = {
  'sosu-seowon': {
    lat: -0.007,
    lng: -0.0105,
    altitude: 140,
    collisionPriority: 420,
    zIndex: 420,
  },
  seonbichon: {
    lat: 0.0105,
    lng: 0.015,
    altitude: 220,
    collisionPriority: 440,
    zIndex: 440,
  },
}

type MissionSpotId = Tour3DRouteStopId
type MissionChecklistStatus = 'completed' | 'active' | 'idle'

const summaryRows = [
  {
    label: '코스명',
    value: '퇴계형 사색 코스',
    icon: 'image-Photoroom (17).png',
  },
  {
    label: '추천 신뢰도',
    value: '92%',
    icon: 'image-Photoroom (35).png',
  },
  {
    label: '예상 소요 시간',
    value: '3시간 20분',
    icon: 'image-Photoroom (63).png',
  },
  {
    label: '난이도',
    value: '보통',
    icon: 'image-Photoroom (64).png',
  },
  {
    label: '여행 스타일',
    value: '조용한 배움 · 서원 탐방 · 사색 기록',
    icon: 'image-removebg-preview (55).png',
  },
  {
    label: '추천 대상',
    value: '퇴계형 선비에게 어울리는 배움과 성찰 중심 코스',
    icon: 'image-removebg-preview (29).png',
  },
] as const

const recommendationReasons = [
  '소수서원과 선비촌을 중심으로 퇴계형의 배움과 성찰 흐름을 구성했습니다.',
  '부석사의 자연 경관을 연결해 조용한 사색 경험을 강화했습니다.',
  '무섬마을의 느린 길을 끝 지점으로 두어 여정의 여운을 자연스럽게 남깁니다.',
]

const coursePreviewCopy: Record<
  SeonbiType,
  {
    courseName: string
    title: string
    subtitle: string
    routeLabel: string
    style: string
    target: string
    reasons: string[]
  }
> = {
  toegye: {
    courseName: '퇴계형 사색 코스',
    title: '퇴계형 선비길',
    subtitle: '깊은 성찰과 배움을 따라 걷는 영주의 3D 문화 여정',
    routeLabel: '소수서원 → 선비촌 → 부석사 → 무섬마을',
    style: '조용한 배움 · 서원 탐방 · 사색 기록',
    target: '퇴계형 선비에게 어울리는 배움과 성찰 중심 코스',
    reasons: recommendationReasons,
  },
  yulgok: {
    courseName: '율곡형 실용 탐구 코스',
    title: '율곡형 선비길',
    subtitle: '계획과 실행을 연결하는 영주의 3D 실용 탐구 여정',
    routeLabel: '소수서원 → 선비촌 → 부석사 → 무섬마을',
    style: '계획형 동선 · 문화 거점 · 데이터 기반 선택',
    target: '율곡형 선비에게 어울리는 실행과 탐구 중심 코스',
    reasons: [
      '소수서원과 선비촌을 중심으로 배움과 실제 체험이 이어지는 동선을 구성했습니다.',
      '부석사와 무섬마을을 연결해 이동 효율과 장소 의미를 함께 확인하도록 설계했습니다.',
      '무섬마을에서 오늘의 선택과 다음 실행 계획을 차분히 정리할 수 있습니다.',
    ],
  },
  cheosa: {
    courseName: '처사형 자연 사색 코스',
    title: '처사형 선비길',
    subtitle: '자연과 고요함을 따라 천천히 머무는 영주의 3D 사색 여정',
    routeLabel: '소수서원 → 선비촌 → 부석사 → 무섬마을',
    style: '자연 풍경 · 느린 산책 · 마음 비움',
    target: '처사형 선비에게 어울리는 자연과 여유 중심 코스',
    reasons: [
      '부석사와 무섬마을의 고요한 풍경을 중심으로 느린 여행감을 강화했습니다.',
      '소수서원과 선비촌을 앞쪽에 두어 조용한 배움 뒤 자연 사색으로 이어지게 했습니다.',
      '무섬마을에서 마음에 남은 풍경과 생각을 천천히 정리할 수 있습니다.',
    ],
  },
  uguk: {
    courseName: '우국형 역사 실천 코스',
    title: '우국형 선비길',
    subtitle: '역사와 책임의 감각을 따라 움직이는 영주의 3D 실천 여정',
    routeLabel: '소수서원 → 선비촌 → 부석사 → 무섬마을',
    style: '역사 해설 · 공동체 가치 · 실천 기록',
    target: '우국형 선비에게 어울리는 책임과 실천 중심 코스',
    reasons: [
      '소수서원과 선비촌을 통해 선비 정신의 공적 의미를 먼저 확인하도록 구성했습니다.',
      '부석사와 무섬마을을 연결해 장소가 품은 역사와 공동체의 이야기를 따라갑니다.',
      '무섬마을에서 오늘의 배움을 행동과 책임의 언어로 정리할 수 있습니다.',
    ],
  },
}

const evidenceChips = ['TourAPI', '역사문화', '편의시설', '이동 거리', '사용자 성향']

const legendItems = [
  { label: '추천 동선', icon: 'image-Photoroom (40).png' },
  { label: '문화 지점', icon: 'image-Photoroom (13).png' },
]

const missionTags = ['유교 문화', '서원 탐방', '배움', '성찰'] as const

const missionInfoRows = [
  {
    label: '예상 체류',
    value: '40분',
    icon: 'image-removebg-preview (15).png',
  },
  {
    label: '난이도',
    value: '쉬움',
    icon: 'image-Photoroom (17).png',
  },
  {
    label: '추천 신뢰도',
    value: '92%',
    icon: 'image-Photoroom (35).png',
  },
] as const

const missionChecklist = [
  { number: 1, label: '서원 입구 안내문 확인하기', status: 'completed' },
  { number: 2, label: '학문 정신 해설 듣기', status: 'active' },
  { number: 3, label: '가장 인상 깊은 문장 기록하기', status: 'idle' },
  { number: 4, label: '다음 장소로 이동 준비하기', status: 'idle' },
] as const

const missionDetails = {
  'sosu-seowon': {
    heroImage: 'image-removebg-preview (84).png',
    title: '학문 정신 해설 듣기',
    description:
      '퇴계형 선비의 첫 번째 여정은 배움의 공간에서 시작됩니다. 서원의 고요한 분위기 속에서 학문과 성찰의 의미를 천천히 느껴보세요.',
    tags: missionTags,
    stay: '40분',
    difficulty: '쉬움',
    trust: '92%',
    aiText:
      '소수서원은 퇴계형 선비에게 가장 잘 어울리는 시작 지점입니다. 조용한 공간에서 배움의 태도를 되새기고, 오늘의 생각을 기록할 준비를 해보세요.',
    checklist: missionChecklist,
  },
  seonbichon: {
    heroImage: 'image-Photoroom (67).png',
    title: '전통 생활 공간 둘러보기',
    description:
      '선비촌에서는 배움이 책상 위에만 머물지 않고 일상의 태도와 생활 방식으로 이어지는 흐름을 살펴봅니다.',
    tags: ['전통 생활', '배움', '절제', '일상'],
    stay: '35분',
    difficulty: '쉬움',
    trust: '90%',
    aiText:
      '선비촌은 배움이 생활 속 태도와 연결되는 장소입니다. 전통 공간을 천천히 둘러보며 오늘의 생활 감각과 비교해보세요.',
    checklist: [
      { number: 1, label: '선비촌 입구 도착하기', status: 'completed' },
      { number: 2, label: '전통 생활 공간 둘러보기', status: 'active' },
      { number: 3, label: '인상 깊은 생활 방식 기록하기', status: 'idle' },
      { number: 4, label: '다음 장소로 이동 준비하기', status: 'idle' },
    ],
  },
  buseoksa: {
    heroImage: 'image-Photoroom (75).png',
    title: '자연 속 사색 미션',
    description:
      '부석사에서는 산사의 풍경과 고요함 속에서 마음을 정리하고, 오래 남는 생각을 한 문장으로 가다듬습니다.',
    tags: ['사색', '자연', '고요함', '성찰'],
    stay: '50분',
    difficulty: '보통',
    trust: '91%',
    aiText:
      '부석사는 자연 속에서 생각을 비우고 다시 세우기 좋은 장소입니다. 풍경의 리듬을 따라 천천히 사색해보세요.',
    checklist: [
      { number: 1, label: '부석사 입구 도착하기', status: 'completed' },
      { number: 2, label: '자연 속 사색 미션', status: 'active' },
      { number: 3, label: '고요한 풍경 기록하기', status: 'idle' },
      { number: 4, label: '다음 장소로 이동 준비하기', status: 'idle' },
    ],
  },
  'museom-village': {
    heroImage: 'image-Photoroom (76).png',
    title: '고요한 길 걷기',
    description:
      '무섬마을에서는 느린 걸음으로 길과 물길을 따라가며 자신을 돌아보는 조용한 시간을 완성합니다.',
    tags: ['고요한 길', '느림', '여유', '성찰'],
    stay: '45분',
    difficulty: '쉬움',
    trust: '89%',
    aiText:
      '무섬마을은 빠르게 지나가기보다 느리게 머무는 장소입니다. 길 위에서 떠오르는 생각을 붙잡아 기록해보세요.',
    checklist: [
      { number: 1, label: '무섬마을 길 도착하기', status: 'completed' },
      { number: 2, label: '고요한 길 걷기', status: 'active' },
      { number: 3, label: '느린 걸음의 생각 기록하기', status: 'idle' },
      { number: 4, label: '여정 마무리 준비하기', status: 'idle' },
    ],
  },
} as const satisfies Record<
  MissionSpotId,
  {
    heroImage: string
    title: string
    description: string
    tags: readonly string[]
    stay: string
    difficulty: string
    trust: string
    aiText: string
    checklist: readonly {
      number: number
      label: string
      status: MissionChecklistStatus
    }[]
  }
>

function imageAsset(fileName: string) {
  return encodeURI(`/images/new/${fileName}`)
}

function publicImageAsset(path: string) {
  return encodeURI(path)
}

function getMissionHeroImageUrl(
  stop: RoutePreviewStop,
  detail: (typeof missionDetails)[MissionSpotId],
  imageUrls: MissionTourApiImageUrls,
) {
  return imageUrls[stop.spotId] ?? imageAsset(detail.heroImage)
}

async function getMissionTourApiImageUrls() {
  const cachedImageUrls = readMissionTourApiImageCache()
  const missingStops = routePreviewStops.filter((stop) => !cachedImageUrls[stop.spotId])
  if (missingStops.length === 0) return cachedImageUrls

  if (!missionTourApiImageRequestPromise) {
    missionTourApiImageRequestPromise = requestMissingMissionTourApiImageUrls(
      cachedImageUrls,
      missingStops,
    ).finally(() => {
      missionTourApiImageRequestPromise = null
    })
  }

  return missionTourApiImageRequestPromise
}

async function requestMissingMissionTourApiImageUrls(
  cachedImageUrls: MissionTourApiImageUrls,
  missingStops: RoutePreviewStop[],
) {
  const areaBasedUrl = new URL('/api/tourism', window.location.origin)
  areaBasedUrl.searchParams.set('type', 'areaBased')
  areaBasedUrl.searchParams.set('areaCode', '35')
  areaBasedUrl.searchParams.set('sigunguCode', '14')
  areaBasedUrl.searchParams.set('numOfRows', '80')

  const areaBasedResult = await requestTourismProxyItems(areaBasedUrl)
  const areaBasedImageUrls = getMissionImageUrlsFromTourismItems(areaBasedResult.items)
  const mergedAreaBasedImageUrls = mergeMissionTourApiImageUrls(
    cachedImageUrls,
    areaBasedImageUrls,
  )
  writeMissionTourApiImageCache(mergedAreaBasedImageUrls)

  if (areaBasedResult.rateLimited) return mergedAreaBasedImageUrls

  const stillMissingStops = missingStops.filter(
    (stop) => !mergedAreaBasedImageUrls[stop.spotId],
  )
  if (stillMissingStops.length === 0) return mergedAreaBasedImageUrls

  const keywordImageUrls: MissionTourApiImageUrls = {}

  for (const stop of stillMissingStops) {
    if (isMissionTourApiKeywordBackoffActive()) break

    const imageUrl = await getTourApiImageUrlByPlaceName(stop.name)
    if (imageUrl) {
      keywordImageUrls[stop.spotId] = imageUrl
      writeMissionTourApiImageCache(
        mergeMissionTourApiImageUrls(mergedAreaBasedImageUrls, keywordImageUrls),
      )
    }
  }

  return mergeMissionTourApiImageUrls(mergedAreaBasedImageUrls, keywordImageUrls)
}

async function requestTourismProxyItems(url: URL) {
  const response = await fetch(url)
  if (!response.ok) {
    return {
      items: [],
      rateLimited: response.status === 429 || response.status === 502,
    }
  }

  const data = (await response.json()) as TourismProxyImageResponse
  return {
    items: data.ok ? data.items ?? [] : [],
    rateLimited: false,
  }
}

async function getTourApiImageUrlByPlaceName(placeName: string) {
  const url = new URL('/api/tourism', window.location.origin)
  url.searchParams.set('type', 'keyword')
  url.searchParams.set('keyword', placeName)
  url.searchParams.set('numOfRows', '8')

  const result = await requestTourismProxyItems(url)
  if (result.rateLimited) {
    missionTourApiKeywordBackoffUntil = Date.now() + missionTourApiKeywordBackoffMs
    return ''
  }

  const imageContent = result.items.find((item) => {
    const imageUrl = getTourismPrimaryImageUrl(item)
    if (!imageUrl) return false

    return isMatchingMissionPlaceName(item, placeName)
  })

  return imageContent ? getTourismPrimaryImageUrl(imageContent) : ''
}

function getMissionImageUrlsFromTourismItems(items: TourismContent[]) {
  const imageUrls: MissionTourApiImageUrls = {}

  for (const stop of routePreviewStops) {
    const imageContent = items.find((item) => {
      const imageUrl = getTourismPrimaryImageUrl(item)
      return imageUrl && isMatchingMissionPlaceName(item, stop.name)
    })
    const imageUrl = imageContent ? getTourismPrimaryImageUrl(imageContent) : ''
    if (imageUrl) imageUrls[stop.spotId] = imageUrl
  }

  return imageUrls
}

function isMatchingMissionPlaceName(item: TourismContent, placeName: string) {
  const itemTitle = normalizeMissionPlaceName(item.title ?? item.name)
  const normalizedPlaceName = normalizeMissionPlaceName(placeName)
  return (
    itemTitle === normalizedPlaceName ||
    itemTitle.includes(normalizedPlaceName) ||
    normalizedPlaceName.includes(itemTitle)
  )
}

function mergeMissionTourApiImageUrls(
  ...imageUrlSets: MissionTourApiImageUrls[]
) {
  return imageUrlSets.reduce<MissionTourApiImageUrls>((mergedImageUrls, imageUrls) => {
    for (const stop of routePreviewStops) {
      const imageUrl = imageUrls[stop.spotId]
      if (isUsableMissionImageUrl(imageUrl)) {
        mergedImageUrls[stop.spotId] = imageUrl
      }
    }

    return mergedImageUrls
  }, {})
}

function readMissionTourApiImageCache() {
  if (missionTourApiImageMemoryCache) return missionTourApiImageMemoryCache
  if (typeof window === 'undefined') return {}

  try {
    const cachedValue = window.localStorage.getItem(missionTourApiImageCacheKey)
    if (!cachedValue) return {}

    const parsedValue = JSON.parse(cachedValue) as MissionTourApiImageUrls
    missionTourApiImageMemoryCache = mergeMissionTourApiImageUrls(parsedValue)
    return missionTourApiImageMemoryCache
  } catch {
    return {}
  }
}

function writeMissionTourApiImageCache(imageUrls: MissionTourApiImageUrls) {
  const safeImageUrls = mergeMissionTourApiImageUrls(imageUrls)
  missionTourApiImageMemoryCache = safeImageUrls

  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      missionTourApiImageCacheKey,
      JSON.stringify(safeImageUrls),
    )
  } catch {
    // The app can still show the current network result if storage is unavailable.
  }
}

function isUsableMissionImageUrl(value: string | undefined) {
  if (!value) return false

  try {
    const parsedUrl = new URL(value)
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
  } catch {
    return false
  }
}

function isMissionTourApiKeywordBackoffActive() {
  return Date.now() < missionTourApiKeywordBackoffUntil
}

function normalizeMissionPlaceName(value: string | undefined) {
  return value
    ?.replace(/\[[^\]]+\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase() ?? ''
}

function getCourseType(value: string | null | undefined): SeonbiType {
  if (!value) return 'toegye'
  const normalizedValue = value.toLowerCase()
  const exactType = seonbiTypes.find((type) => type === normalizedValue)
  if (exactType) return exactType

  return seonbiTypes.find((type) => normalizedValue.includes(type)) ?? 'toegye'
}

function isMissionSpotId(spotId: string | null | undefined): spotId is MissionSpotId {
  return routePreviewStops.some((stop) => stop.spotId === spotId)
}

let googleMapsScriptPromise: Promise<void> | null = null

type CourseRouteRenderSource = GoogleCourseRouteSource | 'custom-path-fallback'

interface CourseRouteState {
  path: RouteCoordinate[]
  source: CourseRouteRenderSource
  distanceMeters: number
  duration: string
}

const fallbackRouteDurationText = '3시간 20분'

export function GoogleTour3DPreviewPage() {
  const mapHostRef = useRef<HTMLDivElement>(null)
  const mapElementRef = useRef<GoogleMap3DElement | null>(null)
  const maps3dRef = useRef<GoogleMaps3DLibrary | null>(null)
  const markerElementsRef = useRef<Map<string, GoogleMap3DMarkerElement>>(new Map())
  const routePolylineElementsRef = useRef<GoogleMap3DPolylineElement[]>([])
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const courseType = getCourseType(searchParams.get('course'))
  const courseCopy = coursePreviewCopy[courseType]
  const isMissionMode = searchParams.get('mode') === 'mission'
  const requestedPlaceId = searchParams.get('place')
  const requestedSpot = useMemo(
    () =>
      tour3DSpots.find((spot) => spot.id === requestedPlaceId) ??
      (isMissionMode
        ? tour3DSpots.find((spot) => spot.id === routePreviewStops[0].spotId) ?? null
        : null),
    [isMissionMode, requestedPlaceId],
  )
  const [status, setStatus] = useState<GoogleMaps3DLoadStatus>('idle')
  const [message, setMessage] = useState('')
  const [activePlaceId, setActivePlaceId] = useState(
    requestedSpot?.id ?? initialCamera.id,
  )
  const [selectedSpotId, setSelectedSpotId] = useState(
    requestedSpot?.id ?? '',
  )
  const [isCourseSaved, setIsCourseSaved] = useState(() => {
    try {
      return window.localStorage.getItem(`yeongju-${courseType}-3d-course-saved`) === 'true'
    } catch {
      return false
    }
  })
  const [saveStatusMessage, setSaveStatusMessage] = useState('')
  const [activeMapView, setActiveMapView] = useState<'3d' | '2d'>('3d')
  const [missionStatusMessage, setMissionStatusMessage] = useState('')
  const [missionTourApiImageUrls, setMissionTourApiImageUrls] =
    useState<MissionTourApiImageUrls>(() => readMissionTourApiImageCache())
  const [courseRouteState, setCourseRouteState] = useState<CourseRouteState>(() =>
    createFallbackCourseRouteState(),
  )
  const googleMapsApiKey =
    import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY ?? import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const activePlaceName = useMemo(() => {
    if (activePlaceId === initialCamera.id) return initialCamera.name
    return (
      tour3DSpots.find((place) => place.id === activePlaceId)?.name ??
      initialCamera.name
    )
  }, [activePlaceId])
  const activeCameraTarget = useMemo(
    () => tour3DSpots.find((spot) => spot.id === activePlaceId) ?? initialCamera,
    [activePlaceId],
  )
  const currentMissionId = isMissionSpotId(requestedSpot?.id)
    ? requestedSpot.id
    : routePreviewStops[0].spotId
  const currentMissionStop =
    routePreviewStops.find((stop) => stop.spotId === currentMissionId) ?? routePreviewStops[0]
  const currentMissionDetail = missionDetails[currentMissionId]
  const currentMissionIndex = currentMissionStop.number - 1
  const previousMissionStop = routePreviewStops[currentMissionIndex - 1] ?? null
  const nextMissionStop = routePreviewStops[currentMissionIndex + 1] ?? null
  const currentMissionInfoRows = missionInfoRows.map((item) => {
    if (item.label === '예상 체류') return { ...item, value: currentMissionDetail.stay }
    if (item.label === '난이도') return { ...item, value: currentMissionDetail.difficulty }
    if (item.label === '추천 신뢰도') return { ...item, value: currentMissionDetail.trust }
    return item
  })
  const currentMissionProgressSteps = routePreviewStops.map((stop) => ({
    ...stop,
    status:
      stop.number < currentMissionStop.number
        ? ('completed' as const)
        : stop.spotId === currentMissionId
          ? ('active' as const)
          : ('idle' as const),
  }))
  const currentMissionCompletionRoute = `/mission-complete/${currentMissionId}`
  const nextMissionRoute = nextMissionStop
    ? `/tour-3d?mode=mission&place=${nextMissionStop.spotId}&course=${courseType}`
    : currentMissionCompletionRoute
  const previousMissionRoute = previousMissionStop
    ? `/tour-3d?mode=mission&place=${previousMissionStop.spotId}&course=${courseType}`
    : `/tour-3d?course=${courseType}`
  const currentMissionImageUrl = getMissionHeroImageUrl(
    currentMissionStop,
    currentMissionDetail,
    missionTourApiImageUrls,
  )
  const courseRoutePathKey = useMemo(() => {
    return courseRouteState.path
      .map((point) => `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`)
      .join('|')
  }, [courseRouteState.path])
  const routeDistanceText = useMemo(
    () => formatRouteDistance(courseRouteState.distanceMeters),
    [courseRouteState.distanceMeters],
  )
  const routeDurationText = useMemo(
    () => formatRouteDuration(courseRouteState.duration),
    [courseRouteState.duration],
  )
  const currentSummaryRows = summaryRows.map((row) => {
    if (row.label === '코스명') return { ...row, value: courseCopy.courseName }
    if (row.label === '예상 소요 시간') return { ...row, value: routeDurationText }
    if (row.label === '여행 스타일') return { ...row, value: courseCopy.style }
    if (row.label === '추천 대상') return { ...row, value: courseCopy.target }
    return row
  })
  const twoDimensionalRouteSource =
    courseRouteState.source === 'google-routes-api' ? 'directions-api' : 'straight-line'
  const twoDimensionalMapTitle =
    activeMapView === '3d' ? 'AI 선비길 3D 경로' : '카카오 2D 코스 지도'
  const selectTwoDimensionalRouteItem = useCallback((item: TourismContent) => {
    const spot = tour3DSpots.find((place) => place.id === item.contentId)
    if (!spot) return

    setActivePlaceId(spot.id)
    setSelectedSpotId(spot.id)
    const mapElement = mapElementRef.current
    if (mapElement) moveMapCamera(mapElement, spot)
  }, [])

  useEffect(() => {
    if (!isMissionMode) return undefined

    let isDisposed = false

    async function loadMissionTourApiImages() {
      const cachedImageUrls = readMissionTourApiImageCache()
      if (Object.keys(cachedImageUrls).length > 0) {
        setMissionTourApiImageUrls(cachedImageUrls)
      }

      const imageUrls = await getMissionTourApiImageUrls()

      if (isDisposed) return

      setMissionTourApiImageUrls((previousImageUrls) =>
        mergeMissionTourApiImageUrls(previousImageUrls, imageUrls),
      )
    }

    void loadMissionTourApiImages()

    return () => {
      isDisposed = true
    }
  }, [isMissionMode])

  useEffect(() => {
    let isDisposed = false

    async function loadGoogleRoute() {
      const googleRoute = await requestGoogleCourseRoute(tour3DRouteStops)
      if (isDisposed || !googleRoute) return

      setCourseRouteState({
        path: googleRoute.path,
        source: googleRoute.source,
        distanceMeters: googleRoute.distanceMeters,
        duration: googleRoute.duration,
      })
    }

    void loadGoogleRoute()

    return () => {
      isDisposed = true
    }
  }, [])

  useEffect(() => {
    let isDisposed = false
    const previousAuthFailure = window.gm_authFailure
    const previousConsoleError = console.error
    const handleAuthFailure = () => {
      previousAuthFailure?.()
      if (isDisposed) return
      setStatus('error')
      setMessage(
        'Google Maps API 키의 HTTP referrer 제한에서 현재 로컬 주소를 허용해주세요.',
      )
    }

    window.gm_authFailure = handleAuthFailure
    console.error = (...args) => {
      previousConsoleError(...args)
      const googleMapsErrorMessage = getGoogleMapsConsoleErrorMessage(args)
      if (!googleMapsErrorMessage || isDisposed) return

      setStatus('error')
      setMessage(googleMapsErrorMessage)
    }

    async function initializeMap() {
      if (!googleMapsApiKey) {
        setStatus('missing-key')
        setMessage('Google Maps API 키가 설정되지 않았습니다.')
        return
      }

      setStatus('loading')
      setMessage('')

      try {
        await loadGoogleMaps3DScript(googleMapsApiKey)
        const maps3d = await window.google?.maps?.importLibrary?.('maps3d')

        if (!maps3d?.Map3DElement) {
          throw new Error('Google Maps 3D 라이브러리를 불러오지 못했습니다.')
        }
        if (!maps3d.Marker3DInteractiveElement) {
          throw new Error('Google Maps 3D 마커 라이브러리를 불러오지 못했습니다.')
        }
        if (!maps3d.Polyline3DElement) {
          throw new Error('Google Maps 3D 경로 라인 라이브러리를 불러오지 못했습니다.')
        }

        const mapElement = new maps3d.Map3DElement({
          ...toGoogleCamera(initialCamera),
          mode: maps3d.MapMode?.HYBRID ?? 'HYBRID',
        })
        mapElement.className = 'tour3d-map-element'
        mapElement.addEventListener('gmp-error', () => {
          if (isDisposed) return
          setStatus('error')
          setMessage(
            'Google 3D 지도를 초기화하지 못했습니다. API 키 권한, HTTP referrer 제한, Maps JavaScript API 활성화를 확인해주세요.',
          )
        })
        mapElement.addEventListener('gmp-click', preventGooglePlaceDetailsPopover)
        const markerElements = createSpotMarkers(maps3d, mapElement, (spot) => {
          if (isDisposed) return
          setActivePlaceId(spot.id)
          setSelectedSpotId(spot.id)
          moveMapCamera(mapElement, spot)
        })

        if (isDisposed) {
          mapElement.remove()
          return
        }

        markerElements.forEach((marker) => mapElement.append(marker))
        mapHostRef.current?.replaceChildren(mapElement)
        mapElementRef.current = mapElement
        maps3dRef.current = maps3d
        markerElementsRef.current = markerElements
        setStatus('ready')
        if (requestedSpot) {
          setActivePlaceId(requestedSpot.id)
          setSelectedSpotId(requestedSpot.id)
          moveMapCamera(mapElement, requestedSpot)
        }
      } catch (error) {
        if (isDisposed) return
        setStatus('error')
        setMessage(
          error instanceof Error
            ? error.message
            : 'Google 3D 지도를 불러오지 못했습니다.',
        )
      }
    }

    void initializeMap()

    return () => {
      isDisposed = true
      if (window.gm_authFailure === handleAuthFailure) {
        window.gm_authFailure = previousAuthFailure
      }
      if (console.error !== previousConsoleError) {
        console.error = previousConsoleError
      }
      mapElementRef.current?.remove()
      mapElementRef.current = null
      maps3dRef.current = null
      markerElementsRef.current.clear()
      routePolylineElementsRef.current = []
    }
  }, [googleMapsApiKey, requestedSpot])

  useEffect(() => {
    const mapElement = mapElementRef.current
    const maps3d = maps3dRef.current
    if (status !== 'ready' || !mapElement || !maps3d) return

    routePolylineElementsRef.current.forEach((polylineElement) => {
      polylineElement.remove()
    })

    const routePolylineElements = createRoutePolylineElements(maps3d, courseRouteState.path)
    routePolylineElements.forEach((polylineElement) => {
      mapElement.append(polylineElement)
    })
    routePolylineElementsRef.current = routePolylineElements
    mapElement.setAttribute('data-route-source', courseRouteState.source)
    mapElement.setAttribute('data-route-point-count', String(courseRouteState.path.length))

    return () => {
      routePolylineElements.forEach((polylineElement) => {
        polylineElement.remove()
      })
    }
  }, [courseRoutePathKey, courseRouteState.path, courseRouteState.source, status])

  useEffect(() => {
    markerElementsRef.current.forEach((marker, markerId) => {
      const isSelected = markerId === selectedSpotId
      const routeStop = routePreviewStops.find((stop) => stop.spotId === markerId)
      const isRouteStop = Boolean(routeStop)
      const zIndex = getRouteMarkerZIndex(routeStop)
      const collisionPriority = getRouteMarkerCollisionPriority(routeStop)
      marker.zIndex = isSelected ? zIndex + 100 : isRouteStop ? zIndex : 10
      marker.collisionPriority = isSelected
        ? collisionPriority + 100
        : isRouteStop
          ? collisionPriority
          : 20
      marker.drawsWhenOccluded = isSelected || isRouteStop
      marker.extruded = isSelected
      marker.classList.toggle('is-active', isSelected)
    })
  }, [selectedSpotId])

  function moveToPlace(place: Tour3DCameraTarget) {
    setActivePlaceId(place.id)
    const mapElement = mapElementRef.current
    if (!mapElement) return

    moveMapCamera(mapElement, place)
  }

  function selectSpot(spot: Tour3DSpot) {
    setSelectedSpotId(spot.id)
    moveToPlace(spot)
  }

  function resetToFullRoute() {
    setSelectedSpotId('')
    moveToPlace(initialCamera)
  }

  function selectRouteStop(spotId: string) {
    const spot = tour3DSpots.find((place) => place.id === spotId)
    if (!spot) return

    selectSpot(spot)
  }

  function zoomMap(multiplier: number) {
    const mapElement = mapElementRef.current
    if (!mapElement) return

    const currentRange =
      typeof mapElement.range === 'number'
        ? mapElement.range
        : toGoogleCamera(activeCameraTarget).range
    mapElement.range = clamp(currentRange * multiplier, 1200, 12000)
  }

  function resetCompass() {
    const mapElement = mapElementRef.current
    if (!mapElement) return

    mapElement.heading = 0
  }

  function saveCourse() {
    try {
      window.localStorage.setItem(`yeongju-${courseType}-3d-course-saved`, 'true')
    } catch {
      // Saving is progressive enhancement; the UI state still confirms the action.
    }
    setIsCourseSaved(true)
    setSaveStatusMessage(`${courseCopy.courseName}를 저장했습니다.`)
  }

  if (isMissionMode) {
    return (
      <AppLayout hideBottomNavigation hideChatbot>
        <section
          className="page-section page-container tour3d-page tour3d-page--mission"
          aria-labelledby="tour3d-mission-title"
        >
          <section className="tour3d-mission-hero">
            <CourseProgressBadge className="tour3d-course-progress-badge" />
            <h1 id="tour3d-mission-title">{courseCopy.title} 미션 진행</h1>
            <p>{currentMissionStop.name}에서 이어지는 배움과 성찰의 여정</p>

            <div className="tour3d-mission-progress-shell">
              <div className="tour3d-mission-count" aria-label="현재 진행률">
                <strong>{currentMissionStop.number} / {routePreviewStops.length}</strong>
                <span>진행 중</span>
              </div>
              <ol className="tour3d-mission-steps" aria-label="코스 진행 단계">
                {currentMissionProgressSteps.map((step) => (
                  <li
                    key={step.spotId}
                    className={
                      step.status === 'active'
                        ? 'is-active'
                        : step.status === 'completed'
                          ? 'is-completed'
                          : ''
                    }
                  >
                    <span>{step.status === 'completed' ? '✓' : step.number}</span>
                    <strong>{step.name}</strong>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <section className="tour3d-mission-grid" aria-label="미션 진행 대시보드">
            <article className="tour3d-mission-panel tour3d-mission-map-panel">
              <h2>코스 지도</h2>
              <div className="tour3d-map-frame tour3d-mission-map-frame">
                <div className="tour3d-map-host" ref={mapHostRef} />

                <div className="tour3d-map-controls tour3d-mission-map-controls" aria-label="3D 지도 조작">
                  <button
                    type="button"
                    disabled={status !== 'ready'}
                    onClick={() => zoomMap(0.72)}
                    aria-label="지도 확대"
                    title="지도 확대"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    disabled={status !== 'ready'}
                    onClick={() => zoomMap(1.32)}
                    aria-label="지도 축소"
                    title="지도 축소"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    disabled={status !== 'ready'}
                    onClick={resetCompass}
                    aria-label="나침반 초기화"
                    title="나침반 초기화"
                  >
                    N
                  </button>
                </div>

                {status !== 'ready' && (
                  <div className="tour3d-map-fallback" role="status">
                    <strong>{getStatusTitle(status)}</strong>
                    <p>{message || getStatusMessage(status)}</p>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="tour3d-mission-wide-button"
                onClick={() => navigate('/tour-3d')}
              >
                전체 코스 보기
                <span aria-hidden="true">›</span>
              </button>
            </article>

            <article className="tour3d-mission-panel tour3d-current-mission-card">
              <div className="tour3d-mission-panel-ribbon">현재 미션</div>
              <figure className="tour3d-current-mission-image">
                <img
                  src={currentMissionImageUrl}
                  alt={`${currentMissionStop.name} 현재 미션 이미지`}
                />
              </figure>
              <div className="tour3d-current-mission-body">
                <h2>{currentMissionStop.name}</h2>
                <div className="tour3d-current-mission-title">
                  <span>
                    <img src={imageAsset('image-removebg-preview (70).png')} alt="" />
                    미션
                  </span>
                  <h3>{currentMissionDetail.title}</h3>
                </div>
                <p>{currentMissionDetail.description}</p>
                <div className="tour3d-mission-tags" aria-label="미션 키워드">
                  {currentMissionDetail.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <dl className="tour3d-mission-info-row">
                  {currentMissionInfoRows.map((item) => (
                    <div key={item.label}>
                      <dt>
                        <img src={imageAsset(item.icon)} alt="" />
                        {item.label}
                      </dt>
                      <dd>{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </article>

            <aside className="tour3d-mission-side" aria-label="AI 해설과 체크리스트">
              <article className="tour3d-mission-panel tour3d-ai-card">
                <h2>
                  <img src={imageAsset('image-Photoroom (72).png')} alt="" />
                  AI 선비 해설
                </h2>
                <div className="tour3d-ai-card-body">
                  <img src={imageAsset('image-Photoroom (71).png')} alt="" />
                  <p>{currentMissionDetail.aiText}</p>
                </div>
                <button
                  type="button"
                  className="tour3d-ai-listen-button"
                  aria-label="AI 해설 듣기"
                  onClick={() => setMissionStatusMessage('AI 해설을 들을 준비가 완료되었습니다.')}
                >
                  <img src={imageAsset('image-removebg-preview (80).png')} alt="" />
                </button>
                {missionStatusMessage && (
                  <p className="tour3d-mission-status" role="status">
                    {missionStatusMessage}
                  </p>
                )}
              </article>

              <article className="tour3d-mission-panel tour3d-checklist-card">
                <h2>
                  <img src={imageAsset('image-Photoroom (24).png')} alt="" />
                  미션 체크리스트
                </h2>
                <ol>
                  {currentMissionDetail.checklist.map((item) => (
                    <li key={`${currentMissionId}-${item.number}`} className={`is-${item.status}`}>
                      <span aria-hidden="true">
                        {item.status === 'completed' ? '✓' : item.number}
                      </span>
                      <strong>{item.label}</strong>
                      {item.status === 'active' && <em>진행 중</em>}
                    </li>
                  ))}
                </ol>
              </article>
            </aside>
          </section>

          <section className="tour3d-mission-action-bar" aria-label="미션 진행 액션">
            <button
              type="button"
              className="tour3d-mission-action tour3d-mission-action--quiet"
              onClick={() => navigate(previousMissionRoute)}
            >
              <span aria-hidden="true">‹</span>
              이전 장소
            </button>
            <button
              type="button"
              className="tour3d-mission-action tour3d-mission-action--primary"
              onClick={() => navigate(currentMissionCompletionRoute)}
            >
              <img src={imageAsset('image-Photoroom (50).png')} alt="" />
              미션 완료하기
            </button>
            <button
              type="button"
              className="tour3d-mission-action tour3d-mission-action--next"
              onClick={() => navigate(nextMissionRoute)}
            >
              {nextMissionStop ? '다음 장소 보기' : '여정 완료하기'}
              <span aria-hidden="true">›</span>
            </button>
            <button
              type="button"
              className="tour3d-mission-action tour3d-mission-action--quiet"
              onClick={() => navigate('/course')}
            >
              코스 나가기
            </button>
            <button
              type="button"
              className="tour3d-next-destination-card"
              onClick={() => navigate(nextMissionRoute)}
            >
              <img
                src={publicImageAsset(nextMissionStop?.iconPath ?? currentMissionStop.iconPath)}
                alt=""
              />
              <span>
                <strong>
                  {nextMissionStop ? `다음 장소: ${nextMissionStop.name}` : '여정 마무리'}
                </strong>
                <small>{nextMissionStop?.mission ?? currentMissionDetail.title}</small>
                <em>{nextMissionStop ? '다음 미션으로 이동' : '여정 완료 화면으로 이동'}</em>
              </span>
              <b aria-hidden="true">›</b>
            </button>
          </section>
        </section>
      </AppLayout>
    )
  }

  return (
    <AppLayout hideBottomNavigation hideChatbot>
      <section className="page-section page-container tour3d-page">
        <section className="tour3d-heading">
          <CourseProgressBadge className="tour3d-course-progress-badge" />
          <h1>{courseCopy.title} 3D 코스 미리보기</h1>
          <p>{courseCopy.subtitle}</p>
        </section>

        <section className="tour3d-preview-grid">
          <div className="tour3d-map-card">
            <div className="tour3d-map-card-head">
              <div>
                <span>{twoDimensionalMapTitle}</span>
                <strong>{activePlaceName}</strong>
              </div>
              <div className="tour3d-map-card-actions">
                <div className="tour3d-map-view-toggle" role="group" aria-label="지도 보기 방식">
                  <button
                    type="button"
                    className={activeMapView === '3d' ? 'is-active' : ''}
                    aria-pressed={activeMapView === '3d'}
                    onClick={() => setActiveMapView('3d')}
                  >
                    3D 경로
                  </button>
                  <button
                    type="button"
                    className={activeMapView === '2d' ? 'is-active' : ''}
                    aria-pressed={activeMapView === '2d'}
                    onClick={() => setActiveMapView('2d')}
                  >
                    2D 지도
                  </button>
                </div>
              </div>
            </div>
            <div className={`tour3d-map-frame${activeMapView === '2d' ? ' is-2d-active' : ''}`}>
              <div
                className="tour3d-map-host"
                ref={mapHostRef}
                aria-hidden={activeMapView === '2d'}
              />

              <div className="tour3d-map-controls" aria-label="3D 지도 조작">
                <button
                  type="button"
                  disabled={status !== 'ready'}
                  onClick={() => zoomMap(0.72)}
                  aria-label="지도 확대"
                  title="지도 확대"
                >
                  +
                </button>
                <button
                  type="button"
                  disabled={status !== 'ready'}
                  onClick={() => zoomMap(1.32)}
                  aria-label="지도 축소"
                  title="지도 축소"
                >
                  -
                </button>
                <button
                  type="button"
                  disabled={status !== 'ready'}
                  onClick={resetCompass}
                  aria-label="나침반 초기화"
                  title="나침반 초기화"
                >
                  N
                </button>
                <button
                  type="button"
                  disabled={status !== 'ready'}
                  onClick={resetToFullRoute}
                  aria-label="전체 경로 보기"
                  title="전체 경로 보기"
                >
                  R
                </button>
              </div>

              <article className="tour3d-route-card" aria-label={`${courseCopy.courseName} 정보`}>
                <span>{courseCopy.courseName}</span>
                <strong>{courseCopy.routeLabel}</strong>
                <dl>
                  <div>
                    <dt>예상 소요</dt>
                    <dd>{routeDurationText}</dd>
                  </div>
                  <div>
                    <dt>이동 거리</dt>
                    <dd>{routeDistanceText}</dd>
                  </div>
                  <div>
                    <dt>난이도</dt>
                    <dd>보통</dd>
                  </div>
                  <div>
                    <dt>신뢰도</dt>
                    <dd>92%</dd>
                  </div>
                </dl>
              </article>

              <div className="tour3d-map-legend" aria-label="지도 범례">
                {legendItems.map((item) => (
                  <span key={item.label}>
                    <img src={imageAsset(item.icon)} alt="" />
                    {item.label}
                  </span>
                ))}
              </div>

              {status !== 'ready' && (
                <div className="tour3d-map-fallback" role="status">
                  <strong>{getStatusTitle(status)}</strong>
                  <p>{message || getStatusMessage(status)}</p>
                </div>
              )}

              {activeMapView === '2d' && (
                <div className="tour3d-2d-map-overlay">
                  <CourseMap
                    items={tour2DRouteItems}
                    routeItems={tour2DRouteItems}
                    routePath={courseRouteState.path}
                    routeSource={twoDimensionalRouteSource}
                    locationMessage={`${courseCopy.courseName}의 주요 경유지를 2D 지도에서 확인합니다.`}
                    routeLabel={`${courseCopy.courseName} 2D 코스`}
                    selectedContentId={selectedSpotId}
                    onSelectItem={selectTwoDimensionalRouteItem}
                  />
                </div>
              )}
            </div>
          </div>

          <aside className="tour3d-summary-panel" aria-label="AI 추천 코스 요약">
            <div className="tour3d-panel-heading">
              <span>AI 추천 코스 요약</span>
              <h2>{courseCopy.courseName}</h2>
            </div>

            <dl className="tour3d-summary-list">
              {currentSummaryRows.map((row) => (
                <div key={row.label}>
                  <dt>
                    <img src={imageAsset(row.icon)} alt="" />
                    {row.label}
                  </dt>
                  <dd>{row.value}</dd>
                </div>
              ))}
            </dl>

            <section className="tour3d-reason-panel" aria-labelledby="tour3d-reason-title">
              <h3 id="tour3d-reason-title">AI가 이 코스를 추천한 이유</h3>
              <ul>
                {courseCopy.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </section>

            <div className="tour3d-evidence-chips" aria-label="추천 근거">
              {evidenceChips.map((chip) => (
                <span key={chip}>{chip}</span>
              ))}
            </div>

            <button
              type="button"
              className="tour3d-panel-button"
              onClick={() => navigate('/ai-evidence-graph')}
            >
              AI 추천 근거 보기
            </button>
          </aside>
        </section>

        <section className="tour3d-timeline" aria-labelledby="tour3d-timeline-title">
          <h2 id="tour3d-timeline-title">오늘의 선비길 미션 타임라인</h2>
          <div className="tour3d-timeline-track">
            {routePreviewStops.map((stop) => (
              <button
                type="button"
                key={stop.spotId}
                className={stop.spotId === selectedSpotId ? 'is-active' : ''}
                onClick={() => selectRouteStop(stop.spotId)}
              >
                <span>{stop.number}</span>
                <img src={publicImageAsset(stop.iconPath)} alt="" />
                <strong>{stop.name}</strong>
                <small>{stop.mission}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="tour3d-action-bar" aria-label="코스 실행">
          <button
            type="button"
            className="tour3d-action-button tour3d-action-button--back"
            onClick={() => navigate(`/test/result/${courseType}`)}
          >
            이전으로
          </button>
          <button
            type="button"
            className="tour3d-action-button tour3d-action-button--primary"
            onClick={() => navigate(`/tour-3d?mode=mission&place=sosu-seowon&course=${courseType}`)}
          >
            이 코스로 시작하기
          </button>
          <button
            type="button"
            className="tour3d-action-button tour3d-action-button--secondary"
            onClick={() => navigate('/ai-evidence-graph')}
          >
            AI 추천 근거 보기
          </button>
          <button
            type="button"
            className="tour3d-action-button tour3d-action-button--save"
            onClick={saveCourse}
            aria-pressed={isCourseSaved}
          >
            {isCourseSaved ? '저장됨' : '코스 저장'}
          </button>
          {saveStatusMessage && (
            <p className="tour3d-save-status" role="status">
              {saveStatusMessage}
            </p>
          )}
        </section>
      </section>
    </AppLayout>
  )
}

function createFallbackCourseRouteState(): CourseRouteState {
  const path = getFallbackCourseRoutePath()

  return {
    path,
    source: 'custom-path-fallback',
    distanceMeters: getPathDistanceMeters(path),
    duration: '',
  }
}

function getFallbackCourseRoutePath() {
  if (tour3DFallbackRoutePath.length >= 2) {
    return tour3DFallbackRoutePath.map(({ lat, lng }) => ({ lat, lng }))
  }

  return tour3DRouteStops.map(({ lat, lng }) => ({ lat, lng }))
}

function createRoutePolylineElements(
  maps3d: GoogleMaps3DLibrary,
  path: RouteCoordinate[],
) {
  if (!maps3d.Polyline3DElement || path.length < 2) return []

  const altitudeMode = maps3d.AltitudeMode?.RELATIVE_TO_GROUND ?? 'RELATIVE_TO_GROUND'
  const pathWithAltitude = path.map((point) => ({
    ...point,
    altitude: 14,
  }))
  const routeAura = new maps3d.Polyline3DElement({
    altitudeMode,
    drawsOccludedSegments: true,
    extruded: false,
    geodesic: false,
    outerColor: 'rgba(255, 247, 221, 0.78)',
    outerWidth: 0.68,
    path: pathWithAltitude,
    strokeColor: 'rgba(255, 210, 94, 0.58)',
    strokeWidth: 18,
    zIndex: 20,
  })
  const routeLine = new maps3d.Polyline3DElement({
    altitudeMode,
    drawsOccludedSegments: true,
    extruded: false,
    geodesic: false,
    outerColor: '#fff1bd',
    outerWidth: 0.52,
    path: pathWithAltitude,
    strokeColor: '#d68619',
    strokeWidth: 7,
    zIndex: 21,
  })

  routeAura.className = 'tour3d-coordinate-route-line tour3d-coordinate-route-line--aura'
  routeLine.className = 'tour3d-coordinate-route-line'
  routeAura.style.pointerEvents = 'none'
  routeLine.style.pointerEvents = 'none'

  return [routeAura, routeLine]
}

function createRouteMarkerGraphic(stop: RoutePreviewStop) {
  const template = document.createElement('template')
  const svgNamespace = ['http:', '', 'www.w3.org', '2000', 'svg'].join('/')
  const markerGraphic = document.createElementNS(svgNamespace, 'svg')
  markerGraphic.classList.add('tour3d-route-pin')
  markerGraphic.setAttribute('viewBox', '0 0 136 158')
  markerGraphic.setAttribute('role', 'img')
  markerGraphic.setAttribute('aria-label', `${stop.number}번 ${stop.name}`)

  const image = document.createElementNS(svgNamespace, 'image')
  image.classList.add('tour3d-route-pin-image')
  image.setAttribute('href', publicImageAsset(stop.iconPath))
  image.setAttribute('x', '0')
  image.setAttribute('y', '0')
  image.setAttribute('width', '136')
  image.setAttribute('height', '120')
  image.setAttribute('preserveAspectRatio', 'xMidYMid meet')

  const orderHalo = document.createElementNS(svgNamespace, 'circle')
  orderHalo.setAttribute('cx', '28')
  orderHalo.setAttribute('cy', '94')
  orderHalo.setAttribute('r', '17')
  orderHalo.setAttribute('fill', '#fff4d0')
  orderHalo.setAttribute('stroke', '#c7851c')
  orderHalo.setAttribute('stroke-width', '2')

  const order = document.createElementNS(svgNamespace, 'text')
  order.classList.add('tour3d-route-pin-order')
  order.setAttribute('x', '28')
  order.setAttribute('y', '100')
  order.setAttribute('text-anchor', 'middle')
  order.textContent = String(stop.number)

  const labelBackground = document.createElementNS(svgNamespace, 'rect')
  labelBackground.setAttribute('x', '12')
  labelBackground.setAttribute('y', '122')
  labelBackground.setAttribute('width', '112')
  labelBackground.setAttribute('height', '28')
  labelBackground.setAttribute('rx', '14')
  labelBackground.setAttribute('fill', '#fff6d8')
  labelBackground.setAttribute('stroke', '#c7851c')
  labelBackground.setAttribute('stroke-width', '1.5')

  const label = document.createElementNS(svgNamespace, 'text')
  label.classList.add('tour3d-route-pin-label')
  label.setAttribute('x', '68')
  label.setAttribute('y', '141')
  label.setAttribute('text-anchor', 'middle')
  label.textContent = stop.name

  markerGraphic.append(image, orderHalo, order, labelBackground, label)
  template.content.append(markerGraphic)
  return template
}

function getMarkerPosition(
  spot: Tour3DSpot,
  routeStop: RoutePreviewStop | undefined,
): GoogleMap3DCenter {
  const displayOffset = routeStop
    ? routeMarkerDisplayOffsets[routeStop.spotId]
    : undefined

  return {
    lat: spot.lat + (displayOffset?.lat ?? 0),
    lng: spot.lng + (displayOffset?.lng ?? 0),
    altitude: displayOffset?.altitude ?? (routeStop ? 48 : 70),
  }
}

function getRouteMarkerZIndex(routeStop: RoutePreviewStop | undefined) {
  if (!routeStop) return 0

  return routeMarkerDisplayOffsets[routeStop.spotId]?.zIndex ?? 180 + routeStop.number
}

function getRouteMarkerCollisionPriority(routeStop: RoutePreviewStop | undefined) {
  if (!routeStop) return 20

  return (
    routeMarkerDisplayOffsets[routeStop.spotId]?.collisionPriority ??
    180 + routeStop.number
  )
}

function preventGooglePlaceDetailsPopover(event: Event) {
  const placeClickEvent = event as GoogleMap3DPlaceClickEvent
  if (typeof placeClickEvent.placeId === 'string') {
    placeClickEvent.preventDefault()
  }
}

function formatRouteDistance(distanceMeters: number) {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return '계산 중'
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)}m`

  return `${(distanceMeters / 1000).toFixed(1)}km`
}

function formatRouteDuration(duration: string) {
  const totalSeconds = getDurationSeconds(duration)
  if (!totalSeconds) return fallbackRouteDurationText

  const totalMinutes = Math.max(1, Math.round(totalSeconds / 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours <= 0) return `${minutes}분`
  if (minutes <= 0) return `${hours}시간`
  return `${hours}시간 ${minutes}분`
}

function getDurationSeconds(duration: string) {
  const match = /^(\d+(?:\.\d+)?)s$/.exec(duration)
  if (!match) return 0

  return Number(match[1])
}

function getPathDistanceMeters(path: RouteCoordinate[]) {
  let distanceMeters = 0

  for (let index = 1; index < path.length; index += 1) {
    distanceMeters += getCoordinateDistanceMeters(path[index - 1], path[index])
  }

  return distanceMeters
}

function getCoordinateDistanceMeters(firstPoint: RouteCoordinate, secondPoint: RouteCoordinate) {
  const earthRadiusMeters = 6371000
  const firstLat = toRadians(firstPoint.lat)
  const secondLat = toRadians(secondPoint.lat)
  const latDelta = toRadians(secondPoint.lat - firstPoint.lat)
  const lngDelta = toRadians(secondPoint.lng - firstPoint.lng)
  const halfChordLength =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(firstLat) *
      Math.cos(secondLat) *
      Math.sin(lngDelta / 2) *
      Math.sin(lngDelta / 2)
  const angularDistance =
    2 * Math.atan2(Math.sqrt(halfChordLength), Math.sqrt(1 - halfChordLength))

  return earthRadiusMeters * angularDistance
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

function createSpotMarkers(
  maps3d: GoogleMaps3DLibrary,
  mapElement: GoogleMap3DElement,
  onSelectSpot: (spot: Tour3DSpot) => void,
) {
  const markerElements = new Map<string, GoogleMap3DMarkerElement>()
  const altitudeMode = maps3d.AltitudeMode?.RELATIVE_TO_GROUND ?? 'RELATIVE_TO_GROUND'
  const collisionBehavior =
    maps3d.CollisionBehavior?.OPTIONAL_AND_HIDES_LOWER_PRIORITY ??
    maps3d.CollisionBehavior?.REQUIRED ??
    'OPTIONAL_AND_HIDES_LOWER_PRIORITY'
  const requiredCollisionBehavior = maps3d.CollisionBehavior?.REQUIRED ?? 'REQUIRED'

  tour3DSpots.forEach((spot, index) => {
    const routeStop = routePreviewStops.find((stop) => stop.spotId === spot.id)
    const marker = new maps3d.Marker3DInteractiveElement({
      altitudeMode,
      collisionBehavior: routeStop ? requiredCollisionBehavior : collisionBehavior,
      collisionPriority: getRouteMarkerCollisionPriority(routeStop),
      drawsWhenOccluded: Boolean(routeStop),
      extruded: false,
      label: routeStop ? undefined : spot.name,
      position: getMarkerPosition(spot, routeStop),
      sizePreserved: true,
      title: spot.name,
      zIndex: routeStop ? getRouteMarkerZIndex(routeStop) : index + 1,
    })

    marker.className = routeStop
      ? 'tour3d-marker tour3d-route-map-marker'
      : 'tour3d-marker tour3d-spot-map-marker'
    marker.setAttribute(
      'aria-label',
      routeStop
        ? `${routeStop.number}번 ${routeStop.name} 3D 지도에서 보기`
        : `${spot.name} 상세 정보 보기`,
    )
    if (routeStop) {
      marker.dataset.routeStopId = routeStop.spotId
      marker.dataset.actualLat = String(spot.lat)
      marker.dataset.actualLng = String(spot.lng)
      marker.append(createRouteMarkerGraphic(routeStop))
    }
    marker.addEventListener('gmp-click', () => onSelectSpot(spot))
    markerElements.set(spot.id, marker)
  })

  mapElement.setAttribute('data-marker-count', String(markerElements.size))
  mapElement.setAttribute('data-route-marker-count', String(routePreviewStops.length))
  return markerElements
}

function loadGoogleMaps3DScript(apiKey: string) {
  if (window.google?.maps?.importLibrary) return Promise.resolve()
  if (googleMapsScriptPromise) return googleMapsScriptPromise

  googleMapsScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.getElementById(googleMapsScriptId)
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(createLoadError()), {
        once: true,
      })
      return
    }

    const timeoutId = window.setTimeout(() => reject(createLoadError()), googleMapsLoadTimeoutMs)
    window[googleMapsScriptCallback] = () => {
      window.clearTimeout(timeoutId)
      resolve()
    }

    const script = document.createElement('script')
    script.id = googleMapsScriptId
    script.async = true
    script.defer = true
    script.src = createGoogleMapsScriptUrl(apiKey)
    script.onerror = () => {
      window.clearTimeout(timeoutId)
      reject(createLoadError())
    }
    document.head.appendChild(script)
  })

  return googleMapsScriptPromise
}

function createGoogleMapsScriptUrl(apiKey: string) {
  const url = new URL('https://maps.googleapis.com/maps/api/js')
  url.searchParams.set('key', apiKey)
  url.searchParams.set('v', 'alpha')
  url.searchParams.set('loading', 'async')
  url.searchParams.set('libraries', 'maps3d')
  url.searchParams.set('callback', googleMapsScriptCallback)
  return url.toString()
}

function createLoadError() {
  return new Error('Google Maps JavaScript API를 불러오지 못했습니다.')
}

function getGoogleMapsConsoleErrorMessage(args: unknown[]) {
  const consoleMessage = args
    .map((arg) => {
      if (typeof arg === 'string') return arg
      if (arg instanceof Error) return arg.message
      return ''
    })
    .join(' ')

  if (!consoleMessage.includes('Google Maps JavaScript API error')) return ''
  if (consoleMessage.includes('RefererNotAllowedMapError')) {
    return 'Google Maps API 키의 HTTP referrer 제한에서 현재 로컬 주소를 허용해주세요.'
  }
  if (consoleMessage.includes('ApiNotActivatedMapError')) {
    return 'Google Cloud Console에서 Maps JavaScript API가 활성화되어 있는지 확인해주세요.'
  }
  if (consoleMessage.includes('BillingNotEnabledMapError')) {
    return 'Google Cloud 프로젝트의 결제 설정이 활성화되어 있는지 확인해주세요.'
  }
  if (consoleMessage.includes('InvalidKeyMapError')) {
    return 'VITE_GOOGLE_MAPS_BROWSER_KEY 또는 VITE_GOOGLE_MAPS_API_KEY 값이 올바른 Google Maps JavaScript API 키인지 확인해주세요.'
  }

  return 'Google Maps JavaScript API 설정을 확인해주세요.'
}

function moveMapCamera(mapElement: GoogleMap3DElement, place: Tour3DCameraTarget) {
  const camera = toGoogleCamera(place)
  if (typeof mapElement.flyCameraTo === 'function') {
    mapElement.flyCameraTo({
      endCamera: camera,
      durationMillis: 1500,
    })
    return
  }

  mapElement.center = camera.center
  mapElement.range = camera.range
  mapElement.tilt = camera.tilt
  mapElement.heading = camera.heading
}

function toGoogleCamera(place: Tour3DCameraTarget): GoogleMap3DCamera {
  return {
    center: {
      lat: place.lat,
      lng: place.lng,
      altitude: place.altitude,
    },
    range: place.range,
    tilt: place.tilt,
    heading: place.heading,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getStatusTitle(status: GoogleMaps3DLoadStatus) {
  if (status === 'missing-key') return 'API 키 설정 필요'
  if (status === 'error') return '3D 지도 로딩 실패'
  return '3D 지도를 준비하고 있습니다'
}

function getStatusMessage(status: GoogleMaps3DLoadStatus) {
  if (status === 'missing-key') {
    return 'VITE_GOOGLE_MAPS_BROWSER_KEY 또는 기존 VITE_GOOGLE_MAPS_API_KEY 환경변수를 설정한 뒤 개발 서버를 다시 시작해주세요.'
  }
  if (status === 'error') {
    return 'API 키, Maps JavaScript API 활성화 여부, maps3d 라이브러리 접근 권한을 확인해주세요.'
  }
  return 'Google Maps JavaScript API와 maps3d 라이브러리를 불러오는 중입니다.'
}
