import { useEffect, useMemo, useState } from 'react'
import DeckGL from '@deck.gl/react'
import type { Color } from '@deck.gl/core'
import { HexagonLayer } from '@deck.gl/aggregation-layers'
import MapboxMap, { NavigationControl } from 'react-map-gl/mapbox'
import { Link, useSearchParams } from 'react-router-dom'
import 'mapbox-gl/dist/mapbox-gl.css'
import { BrandLoading } from '../components/common/BrandLoading'
import { StatusBadge } from '../components/common/StatusBadge'
import { AppLayout } from '../components/layout/AppLayout'
import {
  getYeongjuAccommodations,
  getYeongjuCultureFacilities,
  getYeongjuTouristAttractions,
  searchYeongjuTourismByKeyword,
} from '../features/tourism/tourismApi'
import type {
  TourismApiResponse,
  TourismContent,
  TourismContentSource,
} from '../features/tourism/tourismTypes'
import {
  getTourismContentSourceLabel,
  loadYeongjuEnrichmentData,
  type YeongjuEnrichmentData,
} from '../features/tourism/yeongjuEnrichment'

type HeatmapMode = 'tourism' | 'facility' | 'festival'
type HeatmapCategory =
  | 'tour'
  | 'festival'
  | 'course'
  | 'parking'
  | 'toilet'
  | 'lodging'
  | 'food'
  | 'rural'

interface HeatmapPoint {
  id: string
  title: string
  category: HeatmapCategory
  coordinates: [number, number]
  address?: string
  source: TourismContentSource | 'fallback' | 'visual-sample'
  weights: Record<HeatmapMode, number>
}

interface HeatmapDataState {
  status: 'loading' | 'ready'
  points: HeatmapPoint[]
  message?: string
}

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
const defaultRadiusMeters = 600
const visualSampleSpread = 0.032
const heatmapColorRange: Color[] = [
  [49, 130, 189],
  [107, 174, 214],
  [189, 215, 231],
  [254, 217, 118],
  [253, 141, 60],
  [227, 26, 28],
]
const heatmapModes: Record<
  HeatmapMode,
  {
    label: string
    metricLabel: string
    description: string
    radius: number
    elevationScale: number
    colorRange: Color[]
  }
> = {
  tourism: {
    label: '관광 집중도',
    metricLabel: '예상 집중도',
    description: '관광지와 문화시설 좌표를 묶어 영주 권역별 관광 수요 추정을 보여줍니다.',
    radius: defaultRadiusMeters,
    elevationScale: 6,
    colorRange: heatmapColorRange,
  },
  facility: {
    label: '편의시설 밀도',
    metricLabel: '편의시설 밀도',
    description: '주차장, 화장실, 숙박처럼 여행 편의를 받쳐주는 지점을 함께 묶습니다.',
    radius: defaultRadiusMeters,
    elevationScale: 6,
    colorRange: heatmapColorRange,
  },
  festival: {
    label: '축제 동선',
    metricLabel: '축제 동선 집중도',
    description: '영주역과 주요 관광 거점을 잇는 축제 방문 흐름을 추정해 표시합니다.',
    radius: defaultRadiusMeters,
    elevationScale: 6,
    colorRange: heatmapColorRange,
  },
}

const yeongjuInitialViewState = {
  longitude: 128.6241,
  latitude: 36.8057,
  zoom: 11.05,
  minZoom: 9,
  maxZoom: 15,
  pitch: 55,
  bearing: -25,
}

const fallbackHeatmapPoints: HeatmapPoint[] = [
  createFallbackPoint('sosu-seowon', '소수서원', 'tour', [128.5808, 36.9252], {
    tourism: 10,
    facility: 3,
    festival: 8,
  }),
  createFallbackPoint('seonbichon', '선비촌', 'course', [128.5816, 36.9237], {
    tourism: 8,
    facility: 4,
    festival: 7,
  }),
  createFallbackPoint('seonbi-world', '선비세상', 'festival', [128.5843, 36.9198], {
    tourism: 9,
    facility: 5,
    festival: 9,
  }),
  createFallbackPoint('museom-village', '무섬마을', 'tour', [128.6222, 36.7295], {
    tourism: 8,
    facility: 3,
    festival: 7,
  }),
  createFallbackPoint('buseoksa', '부석사', 'tour', [128.6878, 36.998], {
    tourism: 10,
    facility: 3,
    festival: 6,
  }),
  createFallbackPoint('yeongju-station', '영주역', 'festival', [128.6264, 36.8115], {
    tourism: 4,
    facility: 6,
    festival: 10,
  }),
  createFallbackPoint('sosu-parking', '소수서원 주차장', 'parking', [128.5797, 36.9258], {
    tourism: 2,
    facility: 8,
    festival: 6,
  }),
  createFallbackPoint('seonbichon-toilet', '선비촌 공중화장실', 'toilet', [128.5823, 36.9231], {
    tourism: 2,
    facility: 7,
    festival: 6,
  }),
  createFallbackPoint('seonbi-world-parking', '선비세상 주차장', 'parking', [128.585, 36.9202], {
    tourism: 2,
    facility: 8,
    festival: 7,
  }),
  createFallbackPoint('museom-toilet', '무섬마을 공중화장실', 'toilet', [128.6208, 36.7303], {
    tourism: 2,
    facility: 7,
    festival: 5,
  }),
  createFallbackPoint('buseoksa-parking', '부석사 주차장', 'parking', [128.6889, 36.9974], {
    tourism: 2,
    facility: 8,
    festival: 4,
  }),
  createFallbackPoint('yeongju-stay', '영주역 인근 숙박', 'lodging', [128.6248, 36.8099], {
    tourism: 2,
    facility: 8,
    festival: 7,
  }),
]
const expandedFallbackHeatmapPoints = dedupeHeatmapPoints([
  ...fallbackHeatmapPoints,
  ...createVisualSamplePoints(fallbackHeatmapPoints),
])

export function TourismHeatmapPage() {
  const [searchParams] = useSearchParams()
  const requestedMode = getHeatmapMode(searchParams.get('mode'))
  const [selectedMode, setSelectedMode] = useState<HeatmapMode | null>(null)
  const activeMode = selectedMode ?? requestedMode
  const [radiusMeters, setRadiusMeters] = useState(defaultRadiusMeters)
  const [dataState, setDataState] = useState<HeatmapDataState>({
    status: 'loading',
    points: expandedFallbackHeatmapPoints,
  })

  useEffect(() => {
    let ignore = false

    async function loadHeatmapData() {
      const [attractions, cultureFacilities, accommodations, festivals, enrichment] =
        await Promise.all([
        getYeongjuTouristAttractions(),
        getYeongjuCultureFacilities(),
        getYeongjuAccommodations(),
        searchYeongjuTourismByKeyword('축제'),
        loadYeongjuEnrichmentData(),
      ])
      if (ignore) return

      setDataState(
        createHeatmapDataState(
          [attractions, cultureFacilities, accommodations, festivals],
          enrichment,
        ),
      )
    }

    void loadHeatmapData()

    return () => {
      ignore = true
    }
  }, [])

  const modeConfig = heatmapModes[activeMode]
  const activePoints = useMemo(
    () => getModePoints(dataState.points, activeMode),
    [activeMode, dataState.points],
  )
  const totalWeight = useMemo(
    () => activePoints.reduce((sum, point) => sum + point.weights[activeMode], 0),
    [activeMode, activePoints],
  )
  const apiPointCount = activePoints.filter((point) => point.source === 'TourAPI').length
  const localPointCount = activePoints.filter((point) => isLocalHeatmapSource(point.source)).length
  const fallbackPointCount = activePoints.filter((point) => point.source === 'fallback').length
  const samplePointCount = activePoints.filter((point) => point.source === 'visual-sample').length
  const topPoints = useMemo(
    () =>
      [...activePoints]
        .filter((point) => point.source !== 'visual-sample')
        .sort((a, b) => b.weights[activeMode] - a.weights[activeMode])
        .slice(0, 6),
    [activeMode, activePoints],
  )
  const layers = useMemo(() => {
    if (activePoints.length === 0) return []

    return [
      new HexagonLayer<HeatmapPoint>({
        id: `yeongju-${activeMode}-hexagon-layer`,
        data: activePoints,
        getPosition: (point) => point.coordinates,
        getColorWeight: (point) => point.weights[activeMode],
        getElevationWeight: (point) => point.weights[activeMode],
        colorRange: modeConfig.colorRange,
        colorAggregation: 'SUM',
        elevationAggregation: 'SUM',
        elevationScale: modeConfig.elevationScale,
        elevationRange: [0, 900],
        extruded: true,
        radius: radiusMeters,
        coverage: 0.75,
        upperPercentile: 98,
        elevationUpperPercentile: 98,
        pickable: true,
        autoHighlight: true,
        gpuAggregation: false,
      }),
    ]
  }, [activeMode, activePoints, modeConfig, radiusMeters])

  return (
    <AppLayout hideBottomNavigation>
      <section className="page-section page-container heatmap-page">
        <div className="section-heading center">
          <StatusBadge>3D 히트맵</StatusBadge>
          <h1>영주시 관광 집중도 3D 히트맵</h1>
          <p>
            영주시 관광지, 주차장, 화장실, 숙박 좌표를 위도·경도 배열로 변환해
            예상 집중도와 편의시설 밀도, 관광 수요 추정을 비교합니다. 데이터가 적을
            때는 샘플 기반 시각화 포인트로 분포를 보강합니다.
          </p>
        </div>

        <section className="surface-card heatmap-mode-panel" aria-labelledby="heatmap-mode-title">
          <div className="heatmap-mode-header">
            <div>
              <StatusBadge tone="brown">레이어 전환</StatusBadge>
              <h2 id="heatmap-mode-title">지도 레이어 선택</h2>
              <p>{modeConfig.description}</p>
            </div>
            <Link className="heatmap-3d-link" to="/tour-3d">
              AI 선비길 3D 미리보기
            </Link>
          </div>
          <div className="course-category-tabs heatmap-mode-tabs" aria-label="히트맵 모드">
            {Object.entries(heatmapModes).map(([mode, config]) => {
              const isActive = activeMode === mode
              return (
                <button
                  key={mode}
                  type="button"
                  className={isActive ? 'active' : ''}
                  aria-pressed={isActive}
                  onClick={() => setSelectedMode(mode as HeatmapMode)}
                >
                  {config.label}
                </button>
              )
            })}
          </div>
        </section>

        <div className="heatmap-layout">
          <section className="surface-card heatmap-map-card" aria-labelledby="heatmap-map-title">
            <div className="map-panel-header">
              <div>
                <h2 id="heatmap-map-title">{modeConfig.label}</h2>
                <span>Mapbox + deck.gl HexagonLayer</span>
              </div>
              <StatusBadge tone={samplePointCount > 0 || fallbackPointCount > 0 ? 'brown' : 'green'}>
                {localPointCount > 0 ? '공공데이터 보강' : samplePointCount > 0 ? '샘플 기반 예상 집중도' : 'TourAPI 기반'}
              </StatusBadge>
            </div>
            <p className="map-panel-note">
              가까운 좌표는 반경 {radiusMeters.toLocaleString()}m 육각형으로 묶어 3D
              기둥 높이로 표현합니다.
            </p>
            <div className="heatmap-map-shell">
              <div className="heatmap-map-controller" aria-label="지도 컨트롤러">
                <strong>MAP CONTROLLER</strong>
                <span>{modeConfig.metricLabel}</span>
                <label>
                  <span>Radius</span>
                  <input
                    type="range"
                    min="300"
                    max="1200"
                    step="50"
                    value={radiusMeters}
                    onChange={(event) => setRadiusMeters(Number(event.currentTarget.value))}
                  />
                </label>
                <small>
                  Radius - <output>{radiusMeters}</output> meters
                </small>
                <small>{activePoints.length.toLocaleString()} Locations</small>
              </div>
              {dataState.status === 'loading' && (
                <div className="heatmap-loading-overlay">
                  <BrandLoading message="영주 관광 좌표를 불러오는 중입니다." />
                </div>
              )}
              {mapboxToken ? (
                <DeckGL
                  initialViewState={yeongjuInitialViewState}
                  controller
                  layers={layers}
                  getTooltip={({ object }) => createHexagonTooltip(object, activeMode)}
                >
                  <MapboxMap
                    mapboxAccessToken={mapboxToken}
                    mapStyle="mapbox://styles/mapbox/dark-v11"
                    reuseMaps
                  >
                    <NavigationControl position="top-right" showCompass />
                  </MapboxMap>
                </DeckGL>
              ) : (
                <div className="heatmap-token-empty">
                  <StatusBadge tone="neutral">환경변수 필요</StatusBadge>
                  <strong>Mapbox 토큰을 설정하면 3D 히트맵 지도가 표시됩니다.</strong>
                  <span>VITE_MAPBOX_TOKEN</span>
                </div>
              )}
            </div>
          </section>

          <aside className="heatmap-side-panel" aria-label="히트맵 상세 정보">
            <section className="surface-card heatmap-info-card">
              <StatusBadge>데이터</StatusBadge>
              <h2>좌표 변환 기준</h2>
              <p>
                TourAPI의 mapX/mapY와 영주시 축제·주차장·관광지·맛집·안심식당·
                민박·공중화장실 좌표를 [경도, 위도] 배열로 변환하고, 부족한
                영역만 대표 지점 주변 샘플로 보강합니다.
              </p>
              {dataState.message && <p className="heatmap-data-message">{dataState.message}</p>}
            </section>

            <section className="surface-card heatmap-info-card">
              <StatusBadge tone="brown">상위 지점</StatusBadge>
              <h2>{modeConfig.metricLabel} 기준</h2>
              <ol className="heatmap-point-list">
                {topPoints.map((point) => (
                  <li key={`${point.id}-${activeMode}`}>
                    <span>
                      <strong>{point.title}</strong>
                      <small>{getCategoryLabel(point.category)} · {getHeatmapSourceLabel(point.source)}</small>
                    </span>
                    <em>{point.weights[activeMode]}</em>
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>

        <dl className="heatmap-summary-grid" aria-label="히트맵 데이터 요약">
          <div className="surface-card heatmap-summary-card">
            <dt>{modeConfig.metricLabel}</dt>
            <dd>{Math.round(totalWeight)}</dd>
          </div>
          <div className="surface-card heatmap-summary-card">
            <dt>좌표 지점</dt>
            <dd>{activePoints.length}</dd>
          </div>
          <div className="surface-card heatmap-summary-card">
            <dt>TourAPI 재사용</dt>
            <dd>{apiPointCount}</dd>
          </div>
          <div className="surface-card heatmap-summary-card">
            <dt>공공데이터 보강</dt>
            <dd>{localPointCount}</dd>
          </div>
          <div className="surface-card heatmap-summary-card">
            <dt>샘플 기반</dt>
            <dd>{samplePointCount}</dd>
          </div>
        </dl>
      </section>
    </AppLayout>
  )
}

function createHeatmapDataState(
  responses: TourismApiResponse[],
  enrichment: YeongjuEnrichmentData | null,
): HeatmapDataState {
  const [attractions, cultureFacilities, accommodations, festivals] = responses
  const responsePoints = dedupeHeatmapPoints([
    ...toHeatmapPoints(attractions.contents, 'tour'),
    ...toHeatmapPoints(cultureFacilities.contents, 'course'),
    ...toHeatmapPoints(accommodations.contents, 'lodging'),
    ...toHeatmapPoints(festivals.contents, 'festival'),
    ...toParkingPoints([...attractions.contents, ...cultureFacilities.contents]),
  ])
  const enrichmentPoints = enrichment ? toEnrichmentHeatmapPoints(enrichment) : []
  const publicDataPoints = dedupeHeatmapPoints([...responsePoints, ...enrichmentPoints])
  const basePoints = addFallbackPoints(publicDataPoints)
  const visualSamplePoints = createVisualSamplePoints(fallbackHeatmapPoints)
  const mergedPoints = dedupeHeatmapPoints([...basePoints, ...visualSamplePoints])
  const apiPointCount = publicDataPoints.filter((point) => point.source === 'TourAPI').length
  const localPointCount = publicDataPoints.filter((point) =>
    isLocalHeatmapSource(point.source),
  ).length

  return {
    status: 'ready',
    points: mergedPoints,
    message: createDataMessage(
      responses,
      apiPointCount,
      localPointCount,
      mergedPoints.length,
      visualSamplePoints.length,
    ),
  }
}

function toHeatmapPoints(
  contents: TourismContent[],
  fallbackCategory: HeatmapCategory,
): HeatmapPoint[] {
  return contents.flatMap((item) => {
    if (!isValidCoordinate(item.mapX, item.mapY)) return []

    const category = getTourismCategory(item, fallbackCategory)
    const title = item.title?.trim() || item.name?.trim() || '영주 관광 지점'
    const weights = normalizeWeights(getApiWeights(category))

    return {
      id: item.contentId ?? `${category}-${title}-${item.mapX}-${item.mapY}`,
      title,
      category,
      coordinates: [item.mapX as number, item.mapY as number],
      address: item.address,
      source: item.source ?? 'TourAPI',
      weights,
    }
  })
}

function toParkingPoints(contents: TourismContent[]): HeatmapPoint[] {
  return contents.flatMap((item) => {
    if (!isValidCoordinate(item.mapX, item.mapY) || !item.parking?.trim()) return []

    const title = item.title?.trim() || item.name?.trim() || '영주 관광지'
    return {
      id: `parking-${item.contentId ?? `${title}-${item.mapX}-${item.mapY}`}`,
      title: `${title} 주차 정보`,
      category: 'parking' as const,
      coordinates: [item.mapX as number, item.mapY as number],
      address: item.address,
      source: item.source ?? 'TourAPI',
      weights: normalizeWeights({
        tourism: 2,
        facility: 7,
        festival: 4,
      }),
    }
  })
}

function toEnrichmentHeatmapPoints(data: YeongjuEnrichmentData): HeatmapPoint[] {
  const visitorDemandPoint: HeatmapPoint = {
    id: `visitor-demand-${data.visitorDemand.placeId}`,
    title: `${data.visitorDemand.placeName} 입장객 수요`,
    category: 'course',
    coordinates: data.visitorDemand.coordinates,
    source: 'SosuVisitorStats',
    weights: normalizeWeights({
      tourism: data.visitorDemand.peakMonth.demandIndex,
      facility: 4,
      festival: 7,
    }),
  }

  const tourismPoints = data.tourismSupplements.flatMap((item): HeatmapPoint[] => {
    if (!isValidCoordinate(item.mapX, item.mapY)) return []

    return [
      {
        id: `tourism-standard-${item.id}`,
        title: item.title,
        category: 'tour',
        coordinates: [item.mapX as number, item.mapY as number],
        address: item.address,
        source: item.source,
        weights: normalizeWeights({
          tourism: 8,
          facility: item.parkingCapacity ? 5 : 3,
          festival: 5,
        }),
      },
    ]
  })

  const festivalPoints = data.festivals.flatMap((item): HeatmapPoint[] => {
    if (!isValidCoordinate(item.mapX, item.mapY)) return []

    return [
      {
        id: `festival-open-data-${item.id}`,
        title: item.title,
        category: 'festival',
        coordinates: [item.mapX as number, item.mapY as number],
        address: item.address ?? item.venue,
        source: item.source,
        weights: normalizeWeights({
          tourism: 6,
          facility: 3,
          festival: 10,
        }),
      },
    ]
  })
  const officialFestivalPoints = data.officialSeonbiFestival &&
    isValidCoordinate(data.officialSeonbiFestival.mapX, data.officialSeonbiFestival.mapY)
      ? [
          {
            id: `official-festival-${data.officialSeonbiFestival.id}`,
            title: data.officialSeonbiFestival.title,
            category: 'festival' as const,
            coordinates: [
              data.officialSeonbiFestival.mapX as number,
              data.officialSeonbiFestival.mapY as number,
            ] as [number, number],
            address: data.officialSeonbiFestival.address,
            source: data.officialSeonbiFestival.source,
            weights: normalizeWeights({
              tourism: 8,
              facility: 5,
              festival: 10,
            }),
          },
        ]
      : []

  const parkingPoints = data.parkingLots.flatMap((item): HeatmapPoint[] => {
    if (!isValidCoordinate(item.mapX, item.mapY)) return []

    return [
      {
        id: `parking-standard-${item.id}`,
        title: item.title,
        category: 'parking',
        coordinates: [item.mapX as number, item.mapY as number],
        address: item.address,
        source: item.source,
        weights: normalizeWeights({
          tourism: 2,
          facility: clampNumber(4 + item.capacity / 80, 4, 10),
          festival: item.title.includes('선비') || item.title.includes('소수') ? 7 : 4,
        }),
      },
    ]
  })
  const ruralTourismPoints = data.ruralTourismFacilities.flatMap((item): HeatmapPoint[] => {
    if (!isValidCoordinate(item.mapX, item.mapY)) return []

    return [
      {
        id: `rural-tourism-${item.id}`,
        title: item.title,
        category: 'rural',
        coordinates: [item.mapX as number, item.mapY as number],
        address: item.address,
        source: item.source,
        weights: normalizeWeights({
          tourism: item.coordinateSource === 'known-place' ? 9 : 7,
          facility: 4,
          festival: item.title.includes('선비') || item.title.includes('소수') ? 8 : 5,
        }),
      },
    ]
  })
  const restaurantPoints = [
    ...data.localRestaurants.map((item) => ({
      id: `good-restaurant-${item.id}`,
      item,
      baseWeight: 5,
    })),
    ...data.safeRestaurants.map((item) => ({
      id: `safe-restaurant-${item.id}`,
      item,
      baseWeight: 7,
    })),
  ].flatMap(({ id, item, baseWeight }): HeatmapPoint[] => {
    if (!isValidCoordinate(item.mapX, item.mapY)) return []

    return [
      {
        id,
        title: item.title,
        category: 'food',
        coordinates: [item.mapX as number, item.mapY as number],
        address: item.address,
        source: item.source,
        weights: normalizeWeights({
          tourism: 3,
          facility: baseWeight,
          festival: 6,
        }),
      },
    ]
  })
  const homestayPoints = data.ruralHomestays.flatMap((item): HeatmapPoint[] => {
    if (!isValidCoordinate(item.mapX, item.mapY)) return []

    return [
      {
        id: `rural-homestay-${item.id}`,
        title: item.title,
        category: 'lodging',
        coordinates: [item.mapX as number, item.mapY as number],
        address: item.address,
        source: item.source,
        weights: normalizeWeights({
          tourism: 2,
          facility: clampNumber(5 + (item.roomCount ?? 0) / 2, 5, 10),
          festival: 6,
        }),
      },
    ]
  })
  const toiletPoints = data.publicToilets.flatMap((item): HeatmapPoint[] => {
    if (!isValidCoordinate(item.mapX, item.mapY)) return []

    return [
      {
        id: `public-toilet-${item.id}`,
        title: item.title,
        category: 'toilet',
        coordinates: [item.mapX as number, item.mapY as number],
        address: item.address,
        source: item.source,
        weights: normalizeWeights({
          tourism: 2,
          facility: clampNumber(
            5 + item.disabledToiletCount / 2 + (item.emergencyBell ? 1 : 0),
            5,
            10,
          ),
          festival: 5,
        }),
      },
    ]
  })

  return dedupeHeatmapPoints([
    visitorDemandPoint,
    ...tourismPoints,
    ...festivalPoints,
    ...officialFestivalPoints,
    ...parkingPoints,
    ...ruralTourismPoints,
    ...restaurantPoints,
    ...homestayPoints,
    ...toiletPoints,
  ])
}

function addFallbackPoints(apiPoints: HeatmapPoint[]) {
  const fallbackPoints = fallbackHeatmapPoints.filter((point) => {
    if (point.category === 'parking' || point.category === 'toilet') return true
    if (point.category === 'lodging') return true

    const apiHasCategory = apiPoints.some((apiPoint) => apiPoint.category === point.category)
    return !apiHasCategory
  })

  return dedupeHeatmapPoints([...apiPoints, ...fallbackPoints])
}

function createVisualSamplePoints(anchorPoints: HeatmapPoint[]) {
  return anchorPoints.flatMap((point) =>
    jitterAroundPoint(point, getVisualSampleCount(point), visualSampleSpread),
  )
}

function jitterAroundPoint(
  point: HeatmapPoint,
  count: number,
  spread: number,
): HeatmapPoint[] {
  const seed = hashString(point.id)

  return Array.from({ length: count }, (_, index) => {
    const angle = seededRandom(seed + index * 17) * Math.PI * 2
    const distance = Math.sqrt(seededRandom(seed + index * 31)) * spread
    const sampleWeight = 1 + Math.round(seededRandom(seed + index * 47))

    return {
      id: `${point.id}-visual-sample-${index}`,
      title: point.title,
      category: point.category,
      coordinates: [
        roundCoordinate(point.coordinates[0] + Math.cos(angle) * distance),
        roundCoordinate(point.coordinates[1] + Math.sin(angle) * distance * 0.78),
      ],
      source: 'visual-sample',
      weights: normalizeWeights({
        tourism: Math.min(sampleWeight, point.weights.tourism),
        facility: Math.min(sampleWeight, point.weights.facility),
        festival: Math.min(sampleWeight, point.weights.festival),
      }),
    }
  })
}

function getVisualSampleCount(point: HeatmapPoint) {
  const peakWeight = Math.max(...Object.values(point.weights))
  const categoryBoost =
    point.category === 'tour' || point.category === 'course' || point.category === 'festival'
      ? 10
      : 8

  return clampNumber(Math.round(peakWeight * categoryBoost), 60, 120)
}

function dedupeHeatmapPoints(points: HeatmapPoint[]) {
  const uniquePoints = new Map<string, HeatmapPoint>()

  for (const point of points) {
    const key = `${point.category}-${point.coordinates[0].toFixed(5)}-${point.coordinates[1].toFixed(5)}`
    if (!uniquePoints.has(key)) uniquePoints.set(key, point)
  }

  return Array.from(uniquePoints.values())
}

function getModePoints(points: HeatmapPoint[], mode: HeatmapMode) {
  const categoriesByMode: Record<HeatmapMode, HeatmapCategory[]> = {
    tourism: ['tour', 'festival', 'course', 'rural'],
    facility: ['parking', 'toilet', 'lodging', 'food'],
    festival: ['festival', 'tour', 'parking', 'toilet', 'food', 'rural'],
  }

  return points.filter((point) => categoriesByMode[mode].includes(point.category))
}

function getHeatmapMode(mode: string | null): HeatmapMode {
  if (mode === 'facility' || mode === 'festival' || mode === 'tourism') return mode
  return 'tourism'
}

function createFallbackPoint(
  id: string,
  title: string,
  category: HeatmapCategory,
  coordinates: [number, number],
  weights: Record<HeatmapMode, number>,
): HeatmapPoint {
  return {
    id,
    title,
    category,
    coordinates,
    source: 'fallback',
    weights: normalizeWeights(weights),
  }
}

function getTourismCategory(
  item: TourismContent,
  fallbackCategory: HeatmapCategory,
): HeatmapCategory {
  if (item.contentTypeId === '15') return 'festival'
  if (item.contentTypeId === '32') return 'lodging'
  if (item.contentTypeId === '39') return 'food'
  if (item.contentTypeId === '14') return 'course'
  if (item.contentTypeId === '12') return 'tour'
  if (item.title?.includes('축제') || item.category?.includes('축제')) return 'festival'
  return fallbackCategory
}

function getApiWeights(category: HeatmapCategory): Record<HeatmapMode, number> {
  if (category === 'festival') {
    return { tourism: 6, facility: 2, festival: 10 }
  }

  if (category === 'lodging') {
    return { tourism: 2, facility: 8, festival: 6 }
  }

  if (category === 'food') {
    return { tourism: 3, facility: 7, festival: 6 }
  }

  if (category === 'rural') {
    return { tourism: 7, facility: 4, festival: 5 }
  }

  if (category === 'course') {
    return { tourism: 8, facility: 3, festival: 7 }
  }

  return { tourism: 7, facility: 2, festival: 6 }
}

function normalizeWeights(weights: Record<HeatmapMode, number>): Record<HeatmapMode, number> {
  return {
    tourism: normalizeWeight(weights.tourism),
    facility: normalizeWeight(weights.facility),
    festival: normalizeWeight(weights.festival),
  }
}

function normalizeWeight(value: number) {
  return clampNumber(Math.round(value), 1, 10)
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function hashString(value: string) {
  return [...value].reduce((hash, character) => {
    return (hash * 31 + character.charCodeAt(0)) >>> 0
  }, 2166136261)
}

function seededRandom(seed: number) {
  const value = Math.sin(seed) * 10000
  return value - Math.floor(value)
}

function roundCoordinate(value: number) {
  return Number(value.toFixed(6))
}

function isValidCoordinate(lng?: number, lat?: number) {
  return (
    typeof lng === 'number' &&
    typeof lat === 'number' &&
    Number.isFinite(lng) &&
    Number.isFinite(lat)
  )
}

function createDataMessage(
  responses: TourismApiResponse[],
  apiPointCount: number,
  localPointCount: number,
  mergedPointCount: number,
  visualSampleCount: number,
) {
  const hasMissingApiKey = responses.some((response) => response.status === 'missing-api-key')
  const hasError = responses.some((response) => response.status === 'error')

  if (apiPointCount === 0 && localPointCount === 0) {
    return `공공데이터 좌표를 불러오지 못해 소수서원, 선비촌, 선비세상, 무섬마을, 부석사, 영주역 주변 샘플 기반 시각화 ${visualSampleCount}개를 사용했습니다.`
  }

  if (hasMissingApiKey) {
    return `일부 TourAPI 설정이 없어도 영주시 보강 공공데이터 ${localPointCount}개를 적용했고, ${mergedPointCount}개 좌표 중 샘플 기반 시각화 ${visualSampleCount}개를 함께 사용했습니다.`
  }

  if (hasError) {
    return `일부 공공데이터 요청이 실패해도 영주시 보강 공공데이터 ${localPointCount}개를 적용했고, ${mergedPointCount}개 좌표 중 샘플 기반 시각화 ${visualSampleCount}개를 함께 사용했습니다.`
  }

  if (visualSampleCount > 0) {
    return `${apiPointCount}개 TourAPI 좌표와 영주시 보강 공공데이터 ${localPointCount}개를 적용하고, 시각적 분포 확인을 위해 샘플 기반 시각화 ${visualSampleCount}개를 보강했습니다.`
  }

  return `${apiPointCount}개 TourAPI 좌표와 영주시 보강 공공데이터 ${localPointCount}개를 적용했습니다.`
}

function createHexagonTooltip(object: unknown, activeMode: HeatmapMode) {
  if (!object || typeof object !== 'object') return null

  const bin = object as {
    count?: number
    elevationValue?: number
    points?: HeatmapPoint[]
  }
  const points = bin.points ?? []
  const names = points
    .slice(0, 4)
    .map((point) => escapeHtml(point.title))
    .join(', ')
  const label = heatmapModes[activeMode].metricLabel

  return {
    html: `<strong>${heatmapModes[activeMode].label}</strong><br />${label}: ${Math.round(
      bin.elevationValue ?? 0,
    )}<br />좌표 지점: ${bin.count ?? points.length}<br />${names}`,
    style: {
      color: '#1c1b1b',
      backgroundColor: '#fffdf9',
      border: '1px solid #e1ddd6',
      borderRadius: '10px',
      boxShadow: '0 12px 28px rgba(35, 47, 37, 0.14)',
      fontSize: '12px',
      lineHeight: '1.5',
      padding: '10px 12px',
    },
  }
}

function getCategoryLabel(category: HeatmapCategory) {
  if (category === 'festival') return '축제'
  if (category === 'course') return '코스'
  if (category === 'parking') return '주차장'
  if (category === 'toilet') return '화장실'
  if (category === 'lodging') return '숙박'
  if (category === 'food') return '음식점'
  if (category === 'rural') return '농촌관광'
  return '관광지'
}

function getHeatmapSourceLabel(source: HeatmapPoint['source']) {
  if (source === 'fallback') return '대표 지점'
  if (source === 'visual-sample') return '시각화 샘플'
  return getTourismContentSourceLabel(source)
}

function isLocalHeatmapSource(source: HeatmapPoint['source']) {
  return source !== 'TourAPI' && source !== 'fallback' && source !== 'visual-sample'
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
