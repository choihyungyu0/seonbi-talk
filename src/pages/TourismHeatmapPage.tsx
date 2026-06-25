import { useEffect, useMemo, useState } from 'react'
import DeckGL from '@deck.gl/react'
import type { Color } from '@deck.gl/core'
import { ContourLayer, HeatmapLayer, HexagonLayer } from '@deck.gl/aggregation-layers'
import { PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers'
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

type HeatmapMode = 'demand' | 'facility' | 'gap' | 'route'
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

interface PlaceMarker {
  id: string
  name: string
  category: string
  coordinates: [number, number]
  demandLevel: '높음' | '보통' | '낮음'
  facilityLevel: '충분' | '보통' | '주의'
  routeIncluded: boolean
  description: string
  suggestion: string
}

interface RouteFlow {
  id: string
  name: string
  path: [number, number][]
  color: Color
  width: number
  kind: 'base' | 'active'
}

interface HeatmapDataState {
  status: 'loading' | 'ready'
  points: HeatmapPoint[]
  message?: string
}

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined
const defaultRadiusMeters = 500
const visualSampleSpread = 0.032
const demandColorRange: Color[] = [
  [30, 58, 95, 36],
  [45, 212, 191, 96],
  [250, 204, 21, 172],
  [249, 115, 22, 228],
]
const facilityColorRange: Color[] = [
  [30, 58, 95, 120],
  [37, 99, 235, 160],
  [45, 212, 191, 190],
  [132, 204, 22, 210],
  [250, 204, 21, 235],
]
const heatmapModes: Record<
  HeatmapMode,
  {
    label: string
    tabLabel: string
    metricLabel: string
    description: string
    layerName: string
    mapNote: string
    colorRange: Color[]
  }
> = {
  demand: {
    label: '관광 수요 추정',
    tabLabel: '관광 수요',
    metricLabel: '관광 수요 점수',
    description: '공공데이터와 추천 가중치를 기반으로 관광 수요가 모일 가능성이 높은 권역을 표시합니다.',
    layerName: 'HeatmapLayer',
    mapNote: '부드러운 glow로 소수서원·선비촌, 무섬마을, 부석사 주변의 관광 수요 흐름을 보여줍니다.',
    colorRange: demandColorRange,
  },
  facility: {
    label: '편의시설 밀도',
    tabLabel: '편의시설 밀도',
    metricLabel: '편의시설 밀도',
    description: '주차장, 화장실, 숙박처럼 여행 편의를 받쳐주는 지점을 함께 묶습니다.',
    layerName: 'HexagonLayer',
    mapNote: '반경 안의 편의시설을 낮은 hexbin으로 집계해 과한 3D 기둥 느낌을 줄였습니다.',
    colorRange: facilityColorRange,
  },
  gap: {
    label: '편의시설 공백',
    tabLabel: '편의시설 공백',
    metricLabel: '공백 점수',
    description: '관광 매력은 높지만 화장실, 주차장, 숙박 접근성이 약한 권역을 붉은 영역으로 표시합니다.',
    layerName: 'ContourLayer',
    mapNote: 'ContourLayer가 관광 수요 대비 편의시설 보강이 필요한 영역을 반투명하게 묶어 보여줍니다.',
    colorRange: facilityColorRange,
  },
  route: {
    label: '추천 코스 흐름',
    tabLabel: '추천 코스 흐름',
    metricLabel: '코스 연결성',
    description: 'AI가 생성한 코스 동선을 시간 순서대로 시뮬레이션합니다.',
    layerName: 'PathLayer',
    mapNote: '영주역에서 소수서원·선비촌을 거쳐 무섬마을로 이어지는 추천 코스 흐름을 표시합니다.',
    colorRange: demandColorRange,
  },
}

const yeongjuInitialViewState = {
  longitude: 128.6240551,
  latitude: 36.8056858,
  zoom: 11.05,
  minZoom: 9,
  maxZoom: 15,
  pitch: 55,
  bearing: -25,
}

const fallbackHeatmapPoints: HeatmapPoint[] = [
  createFallbackPoint('sosu-seowon', '소수서원', 'tour', [128.58, 36.92556], {
    demand: 10,
    facility: 3,
    gap: 5,
    route: 8,
  }),
  createFallbackPoint('seonbichon', '선비촌', 'course', [128.582677, 36.928557], {
    demand: 8,
    facility: 4,
    gap: 4,
    route: 9,
  }),
  createFallbackPoint('seonbi-world', '선비세상', 'festival', [128.58932026, 36.937775008], {
    demand: 9,
    facility: 5,
    gap: 3,
    route: 7,
  }),
  createFallbackPoint('museom-village', '무섬마을', 'tour', [128.6210331, 36.7331746], {
    demand: 8,
    facility: 3,
    gap: 8,
    route: 10,
  }),
  createFallbackPoint('buseoksa', '부석사', 'tour', [128.68746, 36.998969], {
    demand: 10,
    facility: 3,
    gap: 7,
    route: 5,
  }),
  createFallbackPoint('yeongju-station', '영주역', 'festival', [128.6242371, 36.81011662], {
    demand: 4,
    facility: 6,
    gap: 2,
    route: 10,
  }),
  createFallbackPoint('sosu-parking', '소수서원 주차장', 'parking', [128.5797, 36.9258], {
    demand: 2,
    facility: 8,
    gap: 1,
    route: 6,
  }),
  createFallbackPoint('seonbichon-toilet', '선비촌 공중화장실', 'toilet', [128.5823, 36.9231], {
    demand: 2,
    facility: 7,
    gap: 1,
    route: 6,
  }),
  createFallbackPoint('seonbi-world-parking', '선비세상 주차장', 'parking', [128.585, 36.9202], {
    demand: 2,
    facility: 8,
    gap: 1,
    route: 7,
  }),
  createFallbackPoint('museom-toilet', '무섬마을 공중화장실', 'toilet', [128.6208, 36.7303], {
    demand: 2,
    facility: 7,
    gap: 1,
    route: 5,
  }),
  createFallbackPoint('buseoksa-parking', '부석사 주차장', 'parking', [128.6889, 36.9974], {
    demand: 2,
    facility: 8,
    gap: 1,
    route: 4,
  }),
  createFallbackPoint('yeongju-stay', '영주역 인근 숙박', 'lodging', [128.6248, 36.8099], {
    demand: 2,
    facility: 8,
    gap: 1,
    route: 7,
  }),
]
const majorPlaceMarkers: PlaceMarker[] = [
  {
    id: 'yeongju-station',
    name: '영주역',
    category: '교통 거점',
    coordinates: [128.6242371, 36.81011662],
    demandLevel: '보통',
    facilityLevel: '충분',
    routeIncluded: true,
    description: '추천 코스의 출발점이자 대중교통 진입 거점입니다.',
    suggestion: '첫 화면에서 환승, 주차, 택시 승강장 안내를 함께 보여주면 코스 진입 부담이 줄어듭니다.',
  },
  {
    id: 'sosu-seowon',
    name: '소수서원',
    category: '역사문화',
    coordinates: [128.58, 36.92556],
    demandLevel: '높음',
    facilityLevel: '보통',
    routeIncluded: true,
    description: '역사문화형 추천 코스에서 가장 강한 수요가 예상되는 핵심 지점입니다.',
    suggestion: '부모님 동반 역사문화 코스의 1순위 권역으로 노출하기 좋습니다.',
  },
  {
    id: 'seonbichon',
    name: '선비촌',
    category: '체험',
    coordinates: [128.582677, 36.928557],
    demandLevel: '높음',
    facilityLevel: '보통',
    routeIncluded: true,
    description: '소수서원과 함께 묶이는 체험형 관광 권역입니다.',
    suggestion: '소수서원 관람 뒤 체험 시간을 자연스럽게 이어주는 카드가 적합합니다.',
  },
  {
    id: 'seonbi-world',
    name: '선비세상',
    category: '축제·체험',
    coordinates: [128.58932026, 36.937775008],
    demandLevel: '높음',
    facilityLevel: '충분',
    routeIncluded: false,
    description: '축제 기간과 가족 체험형 수요가 함께 모이는 지점입니다.',
    suggestion: '행사 기간에는 주차 안내와 혼잡 회피 동선을 먼저 보여주는 것이 좋습니다.',
  },
  {
    id: 'museom-village',
    name: '무섬마을',
    category: '마을 산책',
    coordinates: [128.6210331, 36.7331746],
    demandLevel: '높음',
    facilityLevel: '주의',
    routeIncluded: true,
    description: '사색형 코스 적합도가 높지만 숙박과 편의 안내 보강이 필요한 권역입니다.',
    suggestion: '코스 상세에서 화장실, 주차장, 쉬는 장소 안내를 우선 노출하세요.',
  },
  {
    id: 'buseoksa',
    name: '부석사',
    category: '사찰·문화유산',
    coordinates: [128.68746, 36.998969],
    demandLevel: '높음',
    facilityLevel: '주의',
    routeIncluded: false,
    description: '관광 매력도가 높고 체류 시간이 길지만 접근성 안내가 중요한 지점입니다.',
    suggestion: '대중교통, 주차 후 도보 이동, 주변 휴식 지점을 한 카드에 묶어 보여주세요.',
  },
]
const recommendedRoutePath: [number, number][] = [
  [128.6242371, 36.81011662],
  [128.58, 36.92556],
  [128.582677, 36.928557],
  [128.6210331, 36.7331746],
]
const radiusOptions = [300, 500, 1000]
const primaryLayerModes: HeatmapMode[] = ['demand', 'facility', 'route']
const primaryLayerLabels: Record<HeatmapMode, string> = {
  demand: '관광 집중도',
  facility: '편의시설 밀도',
  gap: '편의시설 공백',
  route: '축제 동선',
}
const metricCardIcons = [
  '/images/new/image-Photoroom (20).png',
  '/images/new/image-Photoroom (21).png',
  '/images/new/image-Photoroom (22).png',
  '/images/new/image-Photoroom (23).png',
]
const topTouristPlaceRankings = [
  { name: '소수서원', score: '9.2' },
  { name: '부석사', score: '9.0' },
  { name: '선비촌', score: '8.8' },
  { name: '무섬마을', score: '8.5' },
  { name: '소수박물관', score: '8.1' },
]
const operationActions = [
  '주차장 안내 강화',
  '화장실 위치 우선 노출',
  '무섬마을 대체 코스 추천',
  '축제 기간 동선 분산',
]
const expandedFallbackHeatmapPoints = dedupeHeatmapPoints([
  ...fallbackHeatmapPoints,
  ...createVisualSamplePoints(fallbackHeatmapPoints),
])

export function TourismHeatmapPage() {
  const [searchParams] = useSearchParams()
  const requestedMode = getHeatmapMode(searchParams.get('mode'))
  const isCompactHeatmapViewport = useCompactHeatmapViewport()
  const [selectedMode, setSelectedMode] = useState<HeatmapMode | null>(null)
  const activeMode = selectedMode ?? requestedMode
  const [radiusMeters, setRadiusMeters] = useState(defaultRadiusMeters)
  const [selectedPlaceId, setSelectedPlaceId] = useState(majorPlaceMarkers[1].id)
  const [routeProgress, setRouteProgress] = useState(0.2)
  const [isLayerControllerOpen, setIsLayerControllerOpen] = useState(false)
  const [dataState, setDataState] = useState<HeatmapDataState>({
    status: 'loading',
    points: expandedFallbackHeatmapPoints,
  })
  const isLayerControllerExpanded = !isCompactHeatmapViewport || isLayerControllerOpen

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

  useEffect(() => {
    if (activeMode !== 'route') return

    let animationFrame = 0
    const startedAt = performance.now()

    function tick(now: number) {
      setRouteProgress(((now - startedAt) / 5200) % 1)
      animationFrame = requestAnimationFrame(tick)
    }

    animationFrame = requestAnimationFrame(tick)

    return () => cancelAnimationFrame(animationFrame)
  }, [activeMode])

  const activePoints = useMemo(
    () => getModePoints(dataState.points, activeMode),
    [activeMode, dataState.points],
  )
  const totalWeight = useMemo(
    () => activePoints.reduce((sum, point) => sum + point.weights[activeMode], 0),
    [activeMode, activePoints],
  )
  const localPointCount = activePoints.filter((point) => isLocalHeatmapSource(point.source)).length
  const fallbackPointCount = activePoints.filter((point) => point.source === 'fallback').length
  const samplePointCount = activePoints.filter((point) => point.source === 'visual-sample').length
  const displaySummary = useMemo(() => createDisplaySummary(dataState.points), [dataState.points])
  const selectedPlace = useMemo(
    () => majorPlaceMarkers.find((place) => place.id === selectedPlaceId) ?? majorPlaceMarkers[1],
    [selectedPlaceId],
  )
  const layers = useMemo(() => {
    const dataLayers = []

    if (activeMode === 'demand') {
      if (isCompactHeatmapViewport) {
        dataLayers.push(
          new ScatterplotLayer<HeatmapPoint>({
            id: 'yeongju-demand-mobile-bubble-layer',
            data: activePoints,
            getPosition: (point) => point.coordinates,
            getRadius: (point) => 120 + point.weights.demand * 85,
            radiusUnits: 'meters',
            radiusMinPixels: 7,
            radiusMaxPixels: 34,
            getFillColor: (point) => getDemandBubbleColor(point.weights.demand),
            getLineColor: [255, 248, 223, 190],
            getLineWidth: 2,
            lineWidthMinPixels: 1,
            lineWidthMaxPixels: 3,
            stroked: true,
            filled: true,
            opacity: 0.72,
            pickable: true,
            autoHighlight: true,
          }),
        )
      } else {
        dataLayers.push(
          new HeatmapLayer<HeatmapPoint>({
            id: 'yeongju-demand-heatmap-layer',
            data: activePoints,
            getPosition: (point) => point.coordinates,
            getWeight: (point) => point.weights.demand,
            colorRange: demandColorRange,
            radiusPixels: 62,
            intensity: 1.15,
            threshold: 0.04,
            aggregation: 'SUM',
            pickable: false,
          }),
        )
      }
    }

    if (activeMode === 'facility') {
      dataLayers.push(
        new HexagonLayer<HeatmapPoint>({
          id: 'yeongju-facility-hexagon-layer',
          data: activePoints,
          getPosition: (point) => point.coordinates,
          getColorWeight: (point) => point.weights.facility,
          getElevationWeight: (point) => point.weights.facility,
          colorRange: facilityColorRange,
          colorAggregation: 'SUM',
          elevationAggregation: 'SUM',
          elevationScale: 4,
          elevationRange: [0, 250],
          extruded: true,
          radius: radiusMeters,
          coverage: 0.82,
          upperPercentile: 95,
          elevationUpperPercentile: 95,
          pickable: true,
          autoHighlight: true,
          gpuAggregation: false,
        }),
      )
    }

    if (activeMode === 'gap') {
      dataLayers.push(
        new ContourLayer<HeatmapPoint>({
          id: 'yeongju-gap-contour-layer',
          data: activePoints,
          getPosition: (point) => point.coordinates,
          getWeight: (point) => point.weights.gap,
          cellSize: radiusMeters,
          aggregation: 'SUM',
          contours: [
            { threshold: [4, 7], color: [248, 113, 113, 72], zIndex: 0 },
            { threshold: [7, 24], color: [220, 38, 38, 118], zIndex: 1 },
            { threshold: 4, color: [185, 28, 28, 220], strokeWidth: 2, zIndex: 2 },
          ],
          pickable: true,
          gpuAggregation: false,
        }),
      )
    }

    if (activeMode === 'route') {
      const activePath = createRouteProgressPath(recommendedRoutePath, routeProgress)
      const routeFlows: RouteFlow[] = [
        {
          id: 'yeongju-recommended-route-base',
          name: '영주역 → 소수서원 → 선비촌 → 무섬마을',
          path: recommendedRoutePath,
          color: [20, 83, 45, 115],
          width: 95,
          kind: 'base',
        },
        {
          id: 'yeongju-recommended-route-active',
          name: 'AI 추천 코스 흐름',
          path: activePath,
          color: [250, 204, 21, 240],
          width: 140,
          kind: 'active',
        },
      ]

      dataLayers.push(
        new PathLayer<RouteFlow>({
          id: 'yeongju-route-path-layer',
          data: routeFlows,
          getPath: (flow) => flow.path,
          getColor: (flow) => flow.color,
          getWidth: (flow) => flow.width,
          widthUnits: 'meters',
          widthMinPixels: 3,
          widthMaxPixels: 14,
          jointRounded: true,
          capRounded: true,
          pickable: true,
        }),
      )
    }

    return [
      ...dataLayers,
      new ScatterplotLayer<PlaceMarker>({
        id: `yeongju-major-place-marker-${activeMode}`,
        data: majorPlaceMarkers,
        getPosition: (point) => point.coordinates,
        getRadius: (place) => (place.id === selectedPlaceId ? 260 : 180),
        radiusUnits: 'meters',
        radiusMinPixels: 7,
        radiusMaxPixels: 16,
        stroked: true,
        filled: true,
        getFillColor: (place) => getMarkerFillColor(place, activeMode, selectedPlaceId),
        getLineColor: (place) =>
          place.id === selectedPlaceId ? [250, 204, 21, 255] : [255, 255, 255, 235],
        getLineWidth: (place) => (place.id === selectedPlaceId ? 4 : 2),
        lineWidthMinPixels: 1,
        lineWidthMaxPixels: 4,
        pickable: true,
        autoHighlight: true,
        onClick: (info) => {
          if (!info.object) return false
          setSelectedPlaceId(info.object.id)
          return true
        },
      }),
      new TextLayer<PlaceMarker>({
        id: `yeongju-major-place-label-${activeMode}`,
        data: majorPlaceMarkers,
        getPosition: (point) => point.coordinates,
        getText: (place) => place.name,
        getColor: (place) =>
          place.id === selectedPlaceId ? [20, 83, 45, 255] : [30, 58, 95, 240],
        getSize: (place) => (place.id === selectedPlaceId ? 15 : 13),
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'bottom',
        getPixelOffset: [0, -16],
        characterSet: 'auto',
        fontFamily: 'system-ui, "Malgun Gothic", "Apple SD Gothic Neo", sans-serif',
        pickable: true,
        onClick: (info) => {
          if (!info.object) return false
          setSelectedPlaceId(info.object.id)
          return true
        },
      }),
    ]
  }, [
    activeMode,
    activePoints,
    isCompactHeatmapViewport,
    radiusMeters,
    routeProgress,
    selectedPlaceId,
  ])

  const metricCards = [
    {
      label: '관광지',
      value: displaySummary.tourismPlaces.toLocaleString(),
      unit: '곳',
      icon: metricCardIcons[0],
    },
    {
      label: '편의시설',
      value: displaySummary.facilities.toLocaleString(),
      unit: '개',
      icon: metricCardIcons[1],
    },
    {
      label: '추천 권역',
      value: displaySummary.recommendedZones.toLocaleString(),
      unit: '개',
      icon: metricCardIcons[2],
    },
    {
      label: '관광 수요 점수',
      value: Math.round(totalWeight).toLocaleString(),
      unit: '점',
      icon: metricCardIcons[3],
    },
  ]

  return (
    <AppLayout hideBottomNavigation hideChatbot>
      <section className="heatmap-page" aria-labelledby="heatmap-page-title">
        <div className="heatmap-page-inner">
          <header className="heatmap-hero">
            <span className="heatmap-eyebrow">공공데이터 기반 시각화</span>
            <h1 id="heatmap-page-title">영주시 관광 집중도 3D 히트맵</h1>
          <p className="heatmap-visually-hidden">
            공공데이터 기반 관광 수요, 편의시설 밀도, 추천 코스 흐름을 시각화합니다.
            데이터가 적을 때는 기존 fallback 대표 지점과 샘플 기반 시각화 포인트로
            분포를 보강합니다.
          </p>
            <p>
              영주의 관광 데이터와 편의시설 정보를 한눈에 확인하고, AI 추천 권역을
              분석해보세요.
            </p>
          </header>

          <section className="heatmap-layer-band" aria-labelledby="heatmap-layer-title">
            <div className="heatmap-layer-heading">
              <img src="/images/new/image-removebg-preview (30).png" alt="" />
              <strong id="heatmap-layer-title">레이어 선택</strong>
            </div>
            <div className="heatmap-layer-tabs" aria-label="히트맵 레이어">
              {primaryLayerModes.map((mode) => {
                const isActive = activeMode === mode || (activeMode === 'gap' && mode === 'facility')
                return (
                  <button
                    key={mode}
                    type="button"
                    className={isActive ? 'active' : ''}
                    aria-pressed={isActive}
                    onClick={() => setSelectedMode(mode)}
                  >
                    {primaryLayerLabels[mode]}
                  </button>
                )
              })}
            </div>
            <Link className="heatmap-preview-button" to="/tour-3d">
              AI 선비길 미리보기
            </Link>
            <div className="heatmap-visually-hidden" aria-hidden="true">
              <StatusBadge tone={samplePointCount > 0 || fallbackPointCount > 0 ? 'brown' : 'green'}>
                {localPointCount > 0 ? '공공데이터 보강' : samplePointCount > 0 ? '샘플 기반 시각화' : 'TourAPI 기반'}
              </StatusBadge>
            데이터가 적을 때는 기존 fallback 대표 지점과 샘플 기반 시각화 포인트로
            분포를 보강합니다.
            </div>
          </section>

          <div className="heatmap-dashboard">
            <section className="heatmap-map-card" aria-labelledby="heatmap-map-title">
              <h2 id="heatmap-map-title" className="heatmap-visually-hidden">
                영주시 관광 집중도
              </h2>
              <div className="heatmap-map-shell">
                <div
                  className={[
                    'heatmap-map-controller',
                    isLayerControllerExpanded ? 'is-open' : 'is-collapsed',
                  ].join(' ')}
                  aria-label="관광 데이터 레이어 컨트롤러"
                >
                  <div className="heatmap-controller-header">
                    <strong>관광 데이터 레이어</strong>
                    <button
                      type="button"
                      className="heatmap-controller-toggle"
                      aria-controls="heatmap-controller-body"
                      aria-expanded={isLayerControllerExpanded}
                      onClick={() => setIsLayerControllerOpen((isOpen) => !isOpen)}
                    >
                      {isLayerControllerExpanded ? '닫기' : '열기'}
                    </button>
                  </div>
                  <div
                    id="heatmap-controller-body"
                    className="heatmap-controller-body"
                    hidden={isCompactHeatmapViewport && !isLayerControllerExpanded}
                  >
                    <div className="heatmap-controller-section">
                      <small>레이어</small>
                      <div className="heatmap-controller-mode-grid">
                        {Object.entries(heatmapModes).map(([mode, config]) => {
                          const isActive = activeMode === mode
                          return (
                            <button
                              key={`controller-${mode}`}
                              type="button"
                              className={isActive ? 'active' : ''}
                              aria-pressed={isActive}
                              onClick={() => setSelectedMode(mode as HeatmapMode)}
                            >
                              {config.tabLabel}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="heatmap-controller-section">
                      <small>분석 반경 설정</small>
                      <div className="heatmap-radius-chips">
                        {radiusOptions.map((radius) => (
                          <button
                            key={radius}
                            type="button"
                            className={radiusMeters === radius ? 'active' : ''}
                            onClick={() => setRadiusMeters(radius)}
                          >
                            {radius === 1000 ? '1km' : `${radius}m`}
                          </button>
                        ))}
                      </div>
                    </div>
                    <dl className="heatmap-controller-stats" aria-label="현재 표시 데이터">
                      <div>
                        <dt>현재 반경</dt>
                        <dd>{radiusMeters === 1000 ? '1km' : `${radiusMeters}m`}</dd>
                      </div>
                      <div>
                        <dt>관광지</dt>
                        <dd>{displaySummary.tourismPlaces.toLocaleString()}곳</dd>
                      </div>
                      <div>
                        <dt>편의시설</dt>
                        <dd>{displaySummary.facilities.toLocaleString()}개</dd>
                      </div>
                      <div>
                        <dt>추천 권역</dt>
                        <dd>{displaySummary.recommendedZones.toLocaleString()}개</dd>
                      </div>
                    </dl>
                    <small className="heatmap-controller-location-count">
                      {activePoints.length.toLocaleString()}개 좌표 렌더링
                    </small>
                  </div>
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
                    getTooltip={({ object }) => createDeckTooltip(object, activeMode)}
                  >
                    <MapboxMap
                      mapboxAccessToken={mapboxToken}
                      mapStyle="mapbox://styles/mapbox/light-v11"
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

                <div className="heatmap-map-legend" aria-label="관광 집중도 범례">
                  <img src="/images/new/image-Photoroom (19).png" alt="낮음 보통 높음" />
                </div>
                <p className="heatmap-map-source">공공데이터 기반 관광 집중도 분석</p>
              </div>
            </section>

            <aside className="heatmap-analysis-sidebar" aria-label="히트맵 상세 정보">
              <section className="heatmap-analysis-card heatmap-ai-card">
                <div className="heatmap-card-title-row">
                  <img src="/images/new/image-removebg-preview (34).png" alt="" />
                  <div>
                    <span>AI 분석 요약</span>
                    <h2>AI 분석 요약</h2>
                  </div>
                  <em>AI 분석 요약</em>
                </div>
                <strong>지금 봐야 할 권역</strong>
                <ul className="heatmap-insight-list">
                  <li>소수서원·선비촌 권역은 역사문화 수요가 높습니다.</li>
                  <li>부석사 권역은 사색형 코스 적합도가 높습니다.</li>
                  <li>무섬마을 주변은 편의시설 보강 후보입니다.</li>
                </ul>
              </section>

              <section className="heatmap-analysis-card heatmap-selected-place">
                <div className="heatmap-card-title-row">
                  <img src="/images/new/image-removebg-preview (46).png" alt="" />
                  <div>
                    <span>선택 장소 정보</span>
                    <h2>선택 장소 정보</h2>
                  </div>
                </div>
                <strong>{selectedPlace.name}</strong>
                <p>{selectedPlace.description}</p>
                <dl className="heatmap-place-meta">
                  <div>
                    <dt>관광 수요</dt>
                    <dd>{selectedPlace.demandLevel}</dd>
                  </div>
                  <div>
                    <dt>편의시설</dt>
                    <dd>{selectedPlace.facilityLevel}</dd>
                  </div>
                  <div>
                    <dt>추천 코스 포함</dt>
                    <dd>{selectedPlace.routeIncluded ? '예' : '아니오'}</dd>
                  </div>
                </dl>
                <p className="heatmap-ai-suggestion">
                  AI 제안: {selectedPlace.suggestion}
                </p>
              </section>

              <section className="heatmap-analysis-card">
                <div className="heatmap-card-title-row">
                  <img src="/images/new/image-removebg-preview (52).png" alt="" />
                  <div>
                    <span>상위 관광 지점</span>
                    <h2>상위 관광 지점</h2>
                  </div>
                </div>
                <ol className="heatmap-point-list">
                  {topTouristPlaceRankings.map((place, index) => (
                    <li key={place.name}>
                      <i>{index + 1}</i>
                      <strong>{place.name}</strong>
                      <em>{place.score}</em>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="heatmap-analysis-card">
                <div className="heatmap-card-title-row">
                  <img src="/images/new/image-removebg-preview (36).png" alt="" />
                  <div>
                    <span>운영 액션</span>
                    <h2>운영 액션</h2>
                  </div>
                </div>
                <div className="heatmap-action-list">
                  {operationActions.map((action) => (
                    <span key={action}>{action}</span>
                  ))}
                </div>
              </section>
            </aside>
          </div>

          <dl className="heatmap-metric-row" aria-label="관광 집중도 요약 지표">
            {metricCards.map((card) => (
              <div key={card.label} className="heatmap-metric-card">
                <img src={card.icon} alt="" />
                <span>
                  <dt>{card.label}</dt>
                  <dd>
                    {card.value}
                    <small>{card.unit}</small>
                  </dd>
                </span>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </AppLayout>
  )
}

function useCompactHeatmapViewport() {
  const [isCompact, setIsCompact] = useState(getCompactHeatmapViewport)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const mediaQuery = window.matchMedia('(max-width: 1180px)')
    const updateCompactState = () => setIsCompact(mediaQuery.matches)
    updateCompactState()
    mediaQuery.addEventListener('change', updateCompactState)

    return () => mediaQuery.removeEventListener('change', updateCompactState)
  }, [])

  return isCompact
}

function getCompactHeatmapViewport() {
  if (typeof window === 'undefined') return false

  return window.matchMedia('(max-width: 1180px)').matches
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
        demand: 2,
        facility: 7,
        gap: 1,
        route: 4,
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
      demand: data.visitorDemand.peakMonth.demandIndex,
      facility: 4,
      gap: 4,
      route: 7,
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
          demand: 8,
          facility: item.parkingCapacity ? 5 : 3,
          gap: item.parkingCapacity ? 3 : 6,
          route: 5,
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
          demand: 6,
          facility: 3,
          gap: 4,
          route: 10,
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
              demand: 8,
              facility: 5,
              gap: 3,
              route: 10,
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
          demand: 2,
          facility: clampNumber(4 + item.capacity / 80, 4, 10),
          gap: 1,
          route: item.title.includes('선비') || item.title.includes('소수') ? 7 : 4,
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
          demand: item.coordinateSource === 'known-place' ? 9 : 7,
          facility: 4,
          gap: item.coordinateSource === 'known-place' ? 5 : 6,
          route: item.title.includes('선비') || item.title.includes('소수') ? 8 : 5,
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
          demand: 3,
          facility: baseWeight,
          gap: 1,
          route: 6,
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
          demand: 2,
          facility: clampNumber(5 + (item.roomCount ?? 0) / 2, 5, 10),
          gap: 1,
          route: 6,
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
          demand: 2,
          facility: clampNumber(
            5 + item.disabledToiletCount / 2 + (item.emergencyBell ? 1 : 0),
            5,
            10,
          ),
          gap: 1,
          route: 5,
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
        demand: Math.min(sampleWeight, point.weights.demand),
        facility: Math.min(sampleWeight, point.weights.facility),
        gap: Math.min(sampleWeight, point.weights.gap),
        route: Math.min(sampleWeight, point.weights.route),
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
    demand: ['tour', 'festival', 'course', 'rural'],
    facility: ['parking', 'toilet', 'lodging', 'food'],
    gap: ['tour', 'festival', 'course', 'rural'],
    route: ['festival', 'tour', 'course', 'parking', 'toilet', 'food', 'rural'],
  }

  return points.filter((point) => categoriesByMode[mode].includes(point.category))
}

function getHeatmapMode(mode: string | null): HeatmapMode {
  if (mode === 'demand' || mode === 'facility' || mode === 'gap' || mode === 'route') return mode
  if (mode === 'tourism') return 'demand'
  if (mode === 'festival') return 'route'
  return 'demand'
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
    return { demand: 6, facility: 2, gap: 4, route: 10 }
  }

  if (category === 'lodging') {
    return { demand: 2, facility: 8, gap: 1, route: 6 }
  }

  if (category === 'food') {
    return { demand: 3, facility: 7, gap: 1, route: 6 }
  }

  if (category === 'rural') {
    return { demand: 7, facility: 4, gap: 6, route: 5 }
  }

  if (category === 'course') {
    return { demand: 8, facility: 3, gap: 5, route: 7 }
  }

  return { demand: 7, facility: 2, gap: 6, route: 6 }
}

function normalizeWeights(weights: Record<HeatmapMode, number>): Record<HeatmapMode, number> {
  return {
    demand: normalizeWeight(weights.demand),
    facility: normalizeWeight(weights.facility),
    gap: normalizeWeight(weights.gap),
    route: normalizeWeight(weights.route),
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

function createDisplaySummary(points: HeatmapPoint[]) {
  const visiblePoints = points.filter((point) => point.source !== 'visual-sample')
  const tourismPlaces = visiblePoints.filter((point) =>
    ['tour', 'festival', 'course', 'rural'].includes(point.category),
  ).length
  const facilities = visiblePoints.filter((point) =>
    ['parking', 'toilet', 'lodging', 'food'].includes(point.category),
  ).length

  return {
    tourismPlaces,
    facilities,
    recommendedZones: majorPlaceMarkers.length,
  }
}

function getDemandBubbleColor(weight: number): Color {
  if (weight >= 8) return [249, 115, 22, 220]
  if (weight >= 6) return [250, 204, 21, 205]
  if (weight >= 4) return [45, 212, 191, 175]
  return [30, 58, 95, 150]
}

function getMarkerFillColor(
  place: PlaceMarker,
  activeMode: HeatmapMode,
  selectedPlaceId: string,
): Color {
  if (place.id === selectedPlaceId) return [250, 204, 21, 245]
  if (activeMode === 'gap' && place.facilityLevel === '주의') return [220, 38, 38, 220]
  if (activeMode === 'facility') return [45, 212, 191, 220]
  if (activeMode === 'route' && place.routeIncluded) return [20, 83, 45, 230]
  return [30, 58, 95, 225]
}

function createRouteProgressPath(path: [number, number][], progress: number) {
  if (path.length < 2) return path

  const segmentLengths = path.slice(1).map((point, index) => {
    const previous = path[index]
    return Math.hypot(point[0] - previous[0], point[1] - previous[1])
  })
  const totalLength = segmentLengths.reduce((sum, value) => sum + value, 0)
  const targetLength = totalLength * clampNumber(progress, 0.05, 1)
  const progressPath: [number, number][] = [path[0]]
  let accumulated = 0

  for (let index = 0; index < segmentLengths.length; index += 1) {
    const segmentLength = segmentLengths[index]
    const start = path[index]
    const end = path[index + 1]

    if (accumulated + segmentLength <= targetLength) {
      progressPath.push(end)
      accumulated += segmentLength
      continue
    }

    const ratio = (targetLength - accumulated) / segmentLength
    progressPath.push([
      roundCoordinate(start[0] + (end[0] - start[0]) * ratio),
      roundCoordinate(start[1] + (end[1] - start[1]) * ratio),
    ])
    break
  }

  return progressPath.length > 1 ? progressPath : [path[0], path[1]]
}

function createDeckTooltip(object: unknown, activeMode: HeatmapMode) {
  if (!isRecord(object)) return null

  if (isPlaceMarker(object)) return createPlaceTooltip(object)
  if (isRouteFlow(object)) return createRouteTooltip(object)
  if (isHexagonBin(object)) return createFacilityTooltip(object, activeMode)
  if (isContourObject(object)) return createGapTooltip()
  if (isHeatmapPoint(object)) return createPointTooltip(object, activeMode)

  return null
}

function createPlaceTooltip(place: PlaceMarker) {
  return createTooltip(`
    <strong>${escapeHtml(place.name)}</strong>
    <span>${escapeHtml(place.category)}</span>
    <hr />
    <div>관광 수요 추정: ${place.demandLevel}</div>
    <div>편의시설: ${place.facilityLevel}</div>
    <div>추천 코스 포함: ${place.routeIncluded ? '예' : '아니오'}</div>
    <p>AI 제안: ${escapeHtml(place.suggestion)}</p>
  `)
}

function createRouteTooltip(route: RouteFlow) {
  return createTooltip(`
    <strong>${escapeHtml(route.name)}</strong>
    <span>추천 코스 흐름</span>
    <hr />
    <div>영주역 → 소수서원 → 선비촌 → 무섬마을</div>
    <p>AI가 생성한 코스 동선을 시간 순서대로 시뮬레이션합니다.</p>
  `)
}

function createFacilityTooltip(
  bin: { count?: number; elevationValue?: number; points: HeatmapPoint[] },
  activeMode: HeatmapMode,
) {
  const counts = countFacilityCategories(bin.points)

  return createTooltip(`
    <strong>${escapeHtml(heatmapModes[activeMode].label)} 권역</strong>
    <span>${escapeHtml(heatmapModes[activeMode].metricLabel)}: ${Math.round(
      bin.elevationValue ?? 0,
    )}</span>
    <hr />
    <div>주차장: ${counts.parking}개</div>
    <div>화장실: ${counts.toilet}개</div>
    <div>숙박: ${counts.lodging}개</div>
    <div>음식점: ${counts.food}개</div>
    <p>AI 제안: 코스 상세에서 가까운 편의시설을 함께 노출하세요.</p>
    <small>${bin.count ?? bin.points.length}개 좌표 집계</small>
  `)
}

function createGapTooltip() {
  return createTooltip(`
    <strong>편의시설 공백 권역</strong>
    <span>관광지는 있지만 편의시설 안내가 필요한 영역</span>
    <hr />
    <div>부족 항목: 화장실 / 주차장 / 숙박</div>
    <p>AI 제안: 코스 상세에서 해당 편의시설 안내를 우선 노출하세요.</p>
  `)
}

function createPointTooltip(point: HeatmapPoint, activeMode: HeatmapMode) {
  return createTooltip(`
    <strong>${escapeHtml(point.title)}</strong>
    <span>${escapeHtml(getCategoryLabel(point.category))}</span>
    <hr />
    <div>${escapeHtml(heatmapModes[activeMode].metricLabel)}: ${point.weights[activeMode]}</div>
    <div>데이터 출처: ${escapeHtml(getHeatmapSourceLabel(point.source))}</div>
    <p>AI 제안: 주변 장소와 함께 묶어 코스 후보로 검토하세요.</p>
  `)
}

function createTooltip(html: string) {
  return {
    html,
    style: {
      color: '#1c1b1b',
      backgroundColor: '#fffdf9',
      border: '1px solid rgba(30, 58, 95, 0.18)',
      borderRadius: '12px',
      boxShadow: '0 18px 36px rgba(35, 47, 37, 0.18)',
      fontSize: '12px',
      lineHeight: '1.55',
      maxWidth: '280px',
      padding: '12px 14px',
    },
  }
}

function countFacilityCategories(points: HeatmapPoint[]) {
  return points.reduce(
    (counts, point) => {
      if (point.category === 'parking') counts.parking += 1
      if (point.category === 'toilet') counts.toilet += 1
      if (point.category === 'lodging') counts.lodging += 1
      if (point.category === 'food') counts.food += 1
      return counts
    },
    { parking: 0, toilet: 0, lodging: 0, food: 0 },
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPlaceMarker(value: unknown): value is PlaceMarker {
  return isRecord(value) && typeof value.name === 'string' && typeof value.suggestion === 'string'
}

function isRouteFlow(value: unknown): value is RouteFlow {
  return isRecord(value) && typeof value.name === 'string' && Array.isArray(value.path)
}

function isHexagonBin(
  value: unknown,
): value is { count?: number; elevationValue?: number; points: HeatmapPoint[] } {
  return isRecord(value) && Array.isArray(value.points)
}

function isContourObject(value: unknown) {
  return isRecord(value) && isRecord(value.contour)
}

function isHeatmapPoint(value: unknown): value is HeatmapPoint {
  return isRecord(value) && typeof value.title === 'string' && Array.isArray(value.coordinates)
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
