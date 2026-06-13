import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { StatusBadge } from '../components/common/StatusBadge'

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
]

let googleMapsScriptPromise: Promise<void> | null = null

export function GoogleTour3DPreviewPage() {
  const mapHostRef = useRef<HTMLDivElement>(null)
  const mapElementRef = useRef<GoogleMap3DElement | null>(null)
  const markerElementsRef = useRef<Map<string, GoogleMap3DMarkerElement>>(new Map())
  const [searchParams] = useSearchParams()
  const requestedPlaceId = searchParams.get('place')
  const requestedSpot = useMemo(
    () => tour3DSpots.find((spot) => spot.id === requestedPlaceId) ?? null,
    [requestedPlaceId],
  )
  const [status, setStatus] = useState<GoogleMaps3DLoadStatus>('idle')
  const [message, setMessage] = useState('')
  const [activePlaceId, setActivePlaceId] = useState(
    requestedSpot?.id ?? initialCamera.id,
  )
  const [selectedSpotId, setSelectedSpotId] = useState(
    requestedSpot?.id ?? tour3DSpots[0]?.id ?? '',
  )
  const [courseSpotIds, setCourseSpotIds] = useState<Set<string>>(() => new Set())
  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const activePlaceName = useMemo(() => {
    if (activePlaceId === initialCamera.id) return initialCamera.name
    return (
      tour3DSpots.find((place) => place.id === activePlaceId)?.name ??
      initialCamera.name
    )
  }, [activePlaceId])
  const selectedSpot = useMemo(
    () => tour3DSpots.find((spot) => spot.id === selectedSpotId) ?? null,
    [selectedSpotId],
  )
  const isSelectedSpotAdded = selectedSpot ? courseSpotIds.has(selectedSpot.id) : false

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

  function addSelectedSpotToCourse() {
    if (!selectedSpot) return
    setCourseSpotIds((previousSpotIds) => {
      const nextSpotIds = new Set(previousSpotIds)
      nextSpotIds.add(selectedSpot.id)
      return nextSpotIds
    })
  }

  return (
    <AppLayout hideBottomNavigation>
      <main className="page-section page-container tour3d-page">
        <section className="tour3d-heading">
          <StatusBadge>Google 3D Maps</StatusBadge>
          <div>
            <h1>AI 선비길 3D 미리보기</h1>
            <p>영주 주요 관광지를 Google 3D 지도 카메라로 미리 살펴봅니다.</p>
          </div>
        </section>

        <section className="tour3d-layout">
          <div className="tour3d-map-card">
            <div className="tour3d-map-toolbar">
              <div>
                <span>현재 위치</span>
                <strong>{activePlaceName}</strong>
              </div>
              <button
                type="button"
                disabled={status !== 'ready'}
                onClick={resetToYeongju}
              >
                영주시
              </button>
            </div>
            <div className="tour3d-map-shell">
              <div className="tour3d-map-host" ref={mapHostRef} />
              {status !== 'ready' && (
                <div className="tour3d-map-fallback" role="status">
                  <strong>{getStatusTitle(status)}</strong>
                  <p>{message || getStatusMessage(status)}</p>
                </div>
              )}
            </div>
          </div>

          <aside className="tour3d-control-panel" aria-label="관광지 선택">
            <div>
              <StatusBadge tone="brown">관광지 선택</StatusBadge>
              <h2>3D 카메라 이동</h2>
            </div>
            <div className="tour3d-place-grid">
              {tour3DSpots.map((place) => (
                <button
                  type="button"
                  key={place.id}
                  className={place.id === selectedSpotId ? 'is-active' : ''}
                  disabled={status === 'loading'}
                  onClick={() => selectSpot(place)}
                >
                  {place.name}
                </button>
              ))}
            </div>
            <Tour3DSpotDetailCard
              spot={selectedSpot}
              isAdded={isSelectedSpotAdded}
              onAddToCourse={addSelectedSpotToCourse}
            />
            <p className="tour3d-quality-note">
              실제 3D 품질은 Google 3D Tiles 제공 범위에 따라 달라질 수
              있습니다.
            </p>
          </aside>
        </section>
      </main>
    </AppLayout>
  )
}

interface Tour3DSpotDetailCardProps {
  spot: Tour3DSpot | null
  isAdded: boolean
  onAddToCourse: () => void
}

function Tour3DSpotDetailCard({
  spot,
  isAdded,
  onAddToCourse,
}: Tour3DSpotDetailCardProps) {
  if (!spot) {
    return (
      <section className="tour3d-detail-card tour3d-detail-card-empty" aria-live="polite">
        <StatusBadge tone="neutral">상세 정보</StatusBadge>
        <h2>관광지를 선택해주세요</h2>
        <p>지도 마커나 관광지 버튼을 선택하면 AI 추천 이유와 편의 접근성을 볼 수 있습니다.</p>
      </section>
    )
  }

  return (
    <section className="tour3d-detail-card" aria-live="polite">
      <div className="tour3d-detail-card-head">
        <StatusBadge>{spot.placeType}</StatusBadge>
        <strong>{spot.score}</strong>
      </div>
      <h2>{spot.name}</h2>
      <div className="tour3d-tag-row" aria-label="선비유형 태그">
        {spot.seonbiTags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <dl className="tour3d-detail-list">
        <div>
          <dt>공공데이터 출처</dt>
          <dd>{spot.publicDataSource}</dd>
        </div>
        <div>
          <dt>AI 추천 이유</dt>
          <dd>{spot.aiReason}</dd>
        </div>
      </dl>
      <div className="tour3d-access-grid" aria-label="주차장 화장실 숙박 접근성">
        <div>
          <span>주차장</span>
          <p>{spot.accessibility.parking}</p>
        </div>
        <div>
          <span>화장실</span>
          <p>{spot.accessibility.toilet}</p>
        </div>
        <div>
          <span>숙박</span>
          <p>{spot.accessibility.lodging}</p>
        </div>
      </div>
      <button
        type="button"
        className="tour3d-add-course-button"
        disabled={isAdded}
        onClick={onAddToCourse}
      >
        {isAdded ? '코스에 추가됨' : '코스에 추가'}
      </button>
    </section>
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
