import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'

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
  AltitudeMode?: {
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
  id: 'yeongju',
  name: '영주시',
  lat: 36.8057,
  lng: 128.6241,
  altitude: 900,
  range: 7000,
  tilt: 65,
  heading: 0,
}
const tour3DSpots: Tour3DSpot[] = [
  {
    id: 'yeongju-station',
    name: '영주역',
    lat: 36.8107,
    lng: 128.6245,
    altitude: 520,
    range: 3600,
    tilt: 65,
    heading: 0,
    placeType: '교통 거점',
    score: 88,
    seonbiTags: ['출발형', '도시 산책형'],
    publicDataSource: '공공데이터포털 TourAPI 좌표 체계 기반',
    aiReason:
      '영주 여행을 시작하기 좋은 교통 거점이라 첫 방문자 코스의 기준점으로 추천합니다.',
    accessibility: {
      parking: '역 주변 공영·민영 주차 접근이 비교적 쉽습니다.',
      toilet: '역사 내외 화장실 이용이 편리합니다.',
      lodging: '영주 시내 숙박권과 가장 가깝습니다.',
    },
  },
  {
    id: 'sosu-seowon',
    name: '소수서원',
    lat: 36.9254,
    lng: 128.5801,
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
    name: '선비촌',
    lat: 36.9274,
    lng: 128.5828,
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
    id: 'seonbi-world',
    name: '선비세상',
    lat: 36.9278,
    lng: 128.5878,
    altitude: 620,
    range: 4200,
    tilt: 65,
    heading: 20,
    placeType: '복합문화 테마공간',
    score: 90,
    seonbiTags: ['체험형', '전시형'],
    publicDataSource: '영주시 관광 안내 및 공공 좌표 기반',
    aiReason:
      '선비 문화를 현대적인 전시·체험으로 이해할 수 있어 짧은 일정에도 만족도가 높습니다.',
    accessibility: {
      parking: '대형 방문객을 고려한 주차 동선이 비교적 좋습니다.',
      toilet: '시설 내부 편의시설 이용이 쉽습니다.',
      lodging: '풍기·영주 시내 숙박지와 함께 계획하기 좋습니다.',
    },
  },
  {
    id: 'museom-village',
    name: '무섬마을',
    lat: 36.7348,
    lng: 128.6254,
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
    name: '부석사',
    lat: 36.9981,
    lng: 128.6872,
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
  {
    id: 'seonbi-record',
    name: '선비의 한마디 기록',
    lat: 36.8057,
    lng: 128.6241,
    altitude: 540,
    range: 3600,
    tilt: 62,
    heading: 6,
    placeType: '기록 미션',
    score: 92,
    seonbiTags: ['사색형', '기록형'],
    publicDataSource: '영주선비길 앱 내 미션 흐름 기반',
    aiReason:
      '여정의 끝에서 배움과 감상을 한 문장으로 저장하도록 설계된 퇴계형 마무리 미션입니다.',
    accessibility: {
      parking: '마지막 이동 뒤 머문 장소에서 바로 기록할 수 있습니다.',
      toilet: '현장 이동 전 주변 편의시설을 함께 확인하는 흐름입니다.',
      lodging: '영주 시내 귀환 또는 다음 장소 이동 전 여정을 정리하기 좋습니다.',
    },
  },
]

const routePreviewStops = [
  {
    spotId: 'sosu-seowon',
    number: 1,
    name: '소수서원',
    mission: '학문 정신 해설 듣기',
    icon: 'b (2).png',
    x: 24,
    y: 29,
  },
  {
    spotId: 'seonbichon',
    number: 2,
    name: '선비촌',
    mission: '전통 생활 공간 둘러보기',
    icon: '1 (4).png',
    x: 51,
    y: 43,
  },
  {
    spotId: 'buseoksa',
    number: 3,
    name: '부석사',
    mission: '자연 속 사색 미션',
    icon: '1 (5).png',
    x: 79,
    y: 31,
  },
  {
    spotId: 'museom-village',
    number: 4,
    name: '무섬마을',
    mission: '고요한 길 걷기',
    icon: '1 (3).png',
    x: 77,
    y: 71,
  },
  {
    spotId: 'seonbi-record',
    number: 5,
    name: '선비의 한마디',
    mission: '오늘의 생각 기록하기',
    icon: '1 (6).png',
    x: 31,
    y: 72,
  },
] as const

type MissionSpotId = (typeof routePreviewStops)[number]['spotId']
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
  '마지막에 선비의 한마디 기록 미션을 배치해 여행 경험을 저장할 수 있습니다.',
]

const evidenceChips = ['TourAPI', '역사문화', '편의시설', '이동 거리', '사용자 성향']

const legendItems = [
  { label: '추천 동선', icon: 'image-Photoroom (40).png' },
  { label: '문화 지점', icon: 'image-Photoroom (13).png' },
  { label: '기록 미션', icon: 'image-Photoroom (31).png' },
]

const missionRouteStops = [
  { ...routePreviewStops[0], x: 29, y: 24 },
  { ...routePreviewStops[1], x: 52, y: 39 },
  { ...routePreviewStops[2], x: 32, y: 52 },
  { ...routePreviewStops[3], x: 55, y: 66 },
  { ...routePreviewStops[4], x: 44, y: 82 },
] as const

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
  { number: 4, label: '선비의 한마디에 생각 남기기', status: 'idle' },
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
      { number: 4, label: '선비의 한마디에 생각 남기기', status: 'idle' },
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
      { number: 4, label: '선비의 한마디에 생각 남기기', status: 'idle' },
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
      { number: 4, label: '선비의 한마디에 생각 남기기', status: 'idle' },
    ],
  },
  'seonbi-record': {
    heroImage: 'image-Photoroom (68).png',
    title: '오늘의 생각 기록하기',
    description:
      '마지막 미션은 오늘 지나온 장소의 배움과 사색을 한 문장으로 정리해 나의 기록으로 남기는 단계입니다.',
    tags: ['기록', '완성', '성찰', '여운'],
    stay: '5분',
    difficulty: '쉬움',
    trust: '92%',
    aiText:
      '이제 여정의 끝에서 오늘의 배움과 감상을 하나의 문장으로 정리할 차례입니다. 짧아도 괜찮으니 마음에 남은 것을 남겨보세요.',
    checklist: [
      { number: 1, label: '오늘의 생각 떠올리기', status: 'completed' },
      { number: 2, label: '한 문장으로 정리하기', status: 'active' },
      { number: 3, label: '선비의 한마디 기록 저장하기', status: 'idle' },
      { number: 4, label: '여정 완료 화면 확인하기', status: 'idle' },
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

function isMissionSpotId(spotId: string | null | undefined): spotId is MissionSpotId {
  return routePreviewStops.some((stop) => stop.spotId === spotId)
}

let googleMapsScriptPromise: Promise<void> | null = null

export function GoogleTour3DPreviewPage() {
  const mapHostRef = useRef<HTMLDivElement>(null)
  const mapElementRef = useRef<GoogleMap3DElement | null>(null)
  const markerElementsRef = useRef<Map<string, GoogleMap3DMarkerElement>>(new Map())
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
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
    requestedSpot?.id ?? routePreviewStops[0].spotId,
  )
  const [isCourseSaved, setIsCourseSaved] = useState(() => {
    try {
      return window.localStorage.getItem('yeongju-toegye-3d-course-saved') === 'true'
    } catch {
      return false
    }
  })
  const [saveStatusMessage, setSaveStatusMessage] = useState('')
  const [missionStatusMessage, setMissionStatusMessage] = useState('')
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
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
    ? `/tour-3d?mode=mission&place=${nextMissionStop.spotId}`
    : currentMissionCompletionRoute
  const previousMissionRoute = previousMissionStop
    ? `/tour-3d?mode=mission&place=${previousMissionStop.spotId}`
    : '/tour-3d'

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
      markerElementsRef.current.clear()
    }
  }, [googleMapsApiKey, requestedSpot])

  useEffect(() => {
    markerElementsRef.current.forEach((marker, markerId) => {
      const isSelected = markerId === selectedSpotId
      marker.zIndex = isSelected ? 100 : 10
      marker.collisionPriority = isSelected ? 100 : 20
      marker.drawsWhenOccluded = isSelected
      marker.extruded = isSelected
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

  function resetToYeongju() {
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
      window.localStorage.setItem('yeongju-toegye-3d-course-saved', 'true')
    } catch {
      // Saving is progressive enhancement; the UI state still confirms the action.
    }
    setIsCourseSaved(true)
    setSaveStatusMessage('퇴계형 사색 코스를 저장했습니다.')
  }

  if (isMissionMode) {
    return (
      <AppLayout hideBottomNavigation hideChatbot>
        <section
          className="page-section page-container tour3d-page tour3d-page--mission"
          aria-labelledby="tour3d-mission-title"
        >
          <section className="tour3d-mission-hero">
            <span className="tour3d-preview-badge tour3d-mission-badge">
              <img src={imageAsset('image-removebg-preview (83).png')} alt="" />
              코스 진행
            </span>
            <h1 id="tour3d-mission-title">퇴계형 선비길 미션 진행</h1>
            <p>{currentMissionStop.name}에서 이어지는 배움과 성찰의 여정</p>

            <div className="tour3d-mission-progress-shell">
              <div className="tour3d-mission-count" aria-label="현재 진행률">
                <strong>{currentMissionStop.number} / 5</strong>
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

                <svg
                  className="tour3d-route-svg tour3d-mission-route-svg"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <defs>
                    <filter id="tour3d-mission-route-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="1.25" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <path
                    className="tour3d-route-line tour3d-route-line--aura"
                    d="M 29 24 C 40 27 40 38 52 39 C 48 48 36 47 32 52 C 34 62 50 58 55 66 C 57 75 48 78 44 82"
                  />
                  <path
                    className="tour3d-route-line"
                    d="M 29 24 C 40 27 40 38 52 39 C 48 48 36 47 32 52 C 34 62 50 58 55 66 C 57 75 48 78 44 82"
                  />
                  {missionRouteStops.map((stop) => (
                    <circle
                      key={stop.spotId}
                      className="tour3d-route-spark"
                      cx={stop.x}
                      cy={stop.y}
                      r="0.9"
                    />
                  ))}
                </svg>

                {missionRouteStops.map((stop) => (
                  <button
                    type="button"
                    key={stop.spotId}
                    className={`tour3d-route-marker tour3d-mission-route-marker ${
                      stop.spotId === selectedSpotId ? 'is-active' : ''
                    } ${stop.spotId === currentMissionId ? 'is-current-step' : ''}`}
                    style={{ left: `${stop.x}%`, top: `${stop.y}%` }}
                    disabled={status === 'loading'}
                    onClick={() => selectRouteStop(stop.spotId)}
                    aria-label={`${stop.number}번 ${stop.name} 3D 지도에서 보기`}
                  >
                    <span className="tour3d-route-number">{stop.number}</span>
                    <img src={imageAsset(stop.icon)} alt="" />
                  </button>
                ))}

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
                  src={imageAsset(currentMissionDetail.heroImage)}
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
              {nextMissionStop ? '다음 장소 보기' : '마지막 기록 쓰기'}
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
              <img src={imageAsset(nextMissionStop?.icon ?? currentMissionStop.icon)} alt="" />
              <span>
                <strong>
                  {nextMissionStop ? `다음 장소: ${nextMissionStop.name}` : '마지막 기록 작성'}
                </strong>
                <small>{nextMissionStop?.mission ?? currentMissionDetail.title}</small>
                <em>{nextMissionStop ? '다음 미션으로 이동' : '여정 완료 전 마지막 기록'}</em>
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
          <span className="tour3d-preview-badge">
            <img src={imageAsset('image-Photoroom (40).png')} alt="" />
            3D 코스 프리뷰
          </span>
          <h1>퇴계형 선비길 3D 코스 미리보기</h1>
          <p>깊은 성찰과 배움을 따라 걷는 영주의 3D 문화 여정</p>
        </section>

        <section className="tour3d-preview-grid">
          <div className="tour3d-map-card">
            <div className="tour3d-map-card-head">
              <div>
                <span>AI 선비길 3D 경로</span>
                <strong>{activePlaceName}</strong>
              </div>
              <button
                type="button"
                className="tour3d-mini-reset-button"
                disabled={status !== 'ready'}
                onClick={resetToYeongju}
              >
                영주시
              </button>
            </div>
            <div className="tour3d-map-frame">
              <div className="tour3d-map-host" ref={mapHostRef} />

              <svg
                className="tour3d-route-svg"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <filter id="tour3d-route-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="1.2" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                <path
                  className="tour3d-route-line tour3d-route-line--aura"
                  d="M 24 31 C 33 30 39 43 51 43 C 61 43 67 28 79 31 C 84 44 86 59 77 71 C 64 78 47 64 31 58"
                />
                <path
                  className="tour3d-route-line"
                  d="M 24 31 C 33 30 39 43 51 43 C 61 43 67 28 79 31 C 84 44 86 59 77 71 C 64 78 47 64 31 58"
                />
                {[24, 51, 79, 77, 31].map((cx, index) => (
                  <circle
                    key={cx}
                    className="tour3d-route-spark"
                    cx={cx}
                    cy={[31, 43, 31, 71, 58][index]}
                    r="0.82"
                  />
                ))}
              </svg>

              {routePreviewStops.map((stop) => (
                <button
                  type="button"
                  key={stop.spotId}
                  className={`tour3d-route-marker ${
                    stop.spotId === selectedSpotId ? 'is-active' : ''
                  }`}
                  style={{ left: `${stop.x}%`, top: `${stop.y}%` }}
                  disabled={status === 'loading'}
                  onClick={() => selectRouteStop(stop.spotId)}
                  aria-label={`${stop.number}번 ${stop.name} 3D 지도에서 보기`}
                >
                  <span className="tour3d-route-number">{stop.number}</span>
                  <img src={imageAsset(stop.icon)} alt="" />
                </button>
              ))}

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
                  onClick={resetToYeongju}
                  aria-label="전체 경로 보기"
                  title="전체 경로 보기"
                >
                  R
                </button>
              </div>

              <article className="tour3d-route-card" aria-label="퇴계형 사색 코스 정보">
                <span>퇴계형 사색 코스</span>
                <strong>소수서원 → 선비촌 → 부석사 → 무섬마을 → 선비의 한마디</strong>
                <dl>
                  <div>
                    <dt>예상 소요</dt>
                    <dd>3시간 20분</dd>
                  </div>
                  <div>
                    <dt>이동 거리</dt>
                    <dd>12.6km</dd>
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
            </div>
          </div>

          <aside className="tour3d-summary-panel" aria-label="AI 추천 코스 요약">
            <div className="tour3d-panel-heading">
              <span>AI 추천 코스 요약</span>
              <h2>퇴계형 사색 코스</h2>
            </div>

            <dl className="tour3d-summary-list">
              {summaryRows.map((row) => (
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
                {recommendationReasons.map((reason) => (
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
                <img src={imageAsset(stop.icon)} alt="" />
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
            onClick={() => navigate('/result')}
          >
            이전으로
          </button>
          <button
            type="button"
            className="tour3d-action-button tour3d-action-button--primary"
            onClick={() => navigate('/tour-3d?mode=mission&place=sosu-seowon')}
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

  tour3DSpots.forEach((spot, index) => {
    const marker = new maps3d.Marker3DInteractiveElement({
      altitudeMode,
      collisionBehavior,
      collisionPriority: 20,
      drawsWhenOccluded: false,
      extruded: false,
      label: spot.name,
      position: {
        lat: spot.lat,
        lng: spot.lng,
        altitude: 80,
      },
      sizePreserved: true,
      title: spot.name,
      zIndex: index + 1,
    })

    marker.className = 'tour3d-marker'
    marker.setAttribute('aria-label', `${spot.name} 상세 정보 보기`)
    marker.addEventListener('gmp-click', () => onSelectSpot(spot))
    markerElements.set(spot.id, marker)
  })

  if (!markerElements.has(tour3DSpots[0]?.id ?? '')) return markerElements

  const firstMarker = markerElements.get(tour3DSpots[0].id)
  if (firstMarker) {
    firstMarker.zIndex = 100
    firstMarker.collisionPriority = 100
    firstMarker.drawsWhenOccluded = true
    firstMarker.extruded = true
  }

  mapElement.setAttribute('data-marker-count', String(markerElements.size))
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
    return 'VITE_GOOGLE_MAPS_API_KEY 값이 올바른 Google Maps JavaScript API 키인지 확인해주세요.'
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
    return 'VITE_GOOGLE_MAPS_API_KEY 환경변수를 설정한 뒤 개발 서버를 다시 시작해주세요.'
  }
  if (status === 'error') {
    return 'API 키, Maps JavaScript API 활성화 여부, maps3d 라이브러리 접근 권한을 확인해주세요.'
  }
  return 'Google Maps JavaScript API와 maps3d 라이브러리를 불러오는 중입니다.'
}
