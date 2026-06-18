import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { BrandLoading } from '../components/common/BrandLoading'
import { StatusBadge } from '../components/common/StatusBadge'
import { CommonButton } from '../components/common/CommonButton'
import { CourseProgressBadge } from '../components/course/CourseProgressBadge'
import { SeonbiPreviewPanel } from '../components/SeonbiPreviewPanel'
import { TourismCard } from '../components/tourism/TourismCard'
import { CourseMap } from '../components/tourism/CourseMap'
import { TourismDetailPanel } from '../components/tourism/TourismDetailPanel'
import { seonbiTypeInfo } from '../data/seonbiTypes'
import {
  getYeongjuAccommodations,
  getYeongjuCultureFacilities,
  getYeongjuExperienceFacilities,
  getYeongjuFestivals,
  getYeongjuRestaurants,
  getYeongjuTourismContents,
  getYeongjuTouristAttractions,
  getTourismDetail,
} from '../features/tourism/tourismApi'
import {
  addFavoriteCourse,
  getFavoriteCourses,
  removeFavoriteCourse,
} from '../features/favorites/favoriteApi'
import { getStoredAuthUser } from '../features/auth/authApi'
import { getRecentJudgeMindTags } from '../features/judge/judgeHistoryApi'
import { loadLatestMindTags } from '../features/judge/latestMindTagsStorage'
import {
  createTourismRecommendationReason,
  formatMindTagFlow,
  recommendCourseForSeonbiType,
} from '../features/tourism/recommendation'
import {
  loadYeongjuEnrichmentData,
  type YeongjuEnrichmentData,
} from '../features/tourism/yeongjuEnrichment'
import type { CourseMindTags } from '../features/tourism/recommendation'
import type {
  TourismApiResponse,
  TourismContent,
  TourismDataStatus,
  TourismDetail,
  TourismEmptyStateReason,
} from '../features/tourism/tourismTypes'
import {
  requestRoutePath,
  type RouteCoordinate,
  type RoutePathSource,
} from '../features/tourism/routeApi'
import { trackEvent } from '../features/analytics/trackEvent'
import { loadTestResult } from '../lib/storage'
import type { SeonbiType } from '../features/seonbi-test/types'

const yeongjuKeywords = ['소수서원', '선비세상', '무섬마을', '부석사', '풍기인삼']
const yeongjuCenterLocation: RouteCoordinate = {
  lat: 36.8056858,
  lng: 128.6240551,
}
const tourismFilters = [
  { id: 'all', label: '전체', contentTypeId: undefined },
  { id: 'attraction', label: '관광지', contentTypeId: '12' },
  { id: 'culture', label: '문화시설', contentTypeId: '14' },
  { id: 'festival', label: '축제', contentTypeId: '15' },
  { id: 'experience', label: '체험', contentTypeId: '12' },
  { id: 'accommodation', label: '숙박', contentTypeId: '32' },
  { id: 'restaurant', label: '음식점', contentTypeId: '39' },
] as const

type TourismFilterId = (typeof tourismFilters)[number]['id']

interface TourismPageState {
  status: TourismDataStatus
  contents: TourismContent[]
  reason?: TourismEmptyStateReason
  message?: string
}

type TourismDetailStatus = 'idle' | 'loading' | 'ready' | 'error'

interface TourismDetailState {
  status: TourismDetailStatus
  item?: TourismContent
  detail?: TourismDetail
  message?: string
}

interface AiItinerary {
  summary: string
  steps: string[]
  closingMessage: string
}

export function CoursePage() {
  const testResult = useMemo(() => loadTestResult(), [])
  const [selectedSeonbiType, setSelectedSeonbiType] = useState<SeonbiType>(
    testResult?.type ?? 'toegye',
  )
  const detailRequestIdRef = useRef(0)
  const routeRequestIdRef = useRef(0)
  const [activeFilter, setActiveFilter] = useState<TourismFilterId>('all')
  const [selectedContentId, setSelectedContentId] = useState<string | undefined>()
  const [currentLocation, setCurrentLocation] = useState<RouteCoordinate>(yeongjuCenterLocation)
  const [isLocationFallback, setIsLocationFallback] = useState(true)
  const [routeState, setRouteState] = useState<{
    key: string
    path: RouteCoordinate[]
    source: RoutePathSource
  }>({
    key: '',
    path: [],
    source: 'straight-line',
  })
  const [favoriteContentIds, setFavoriteContentIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [favoriteMessage, setFavoriteMessage] = useState('')
  const [mindTags, setMindTags] = useState<CourseMindTags | null>(null)
  const [aiItinerary, setAiItinerary] = useState<AiItinerary | null>(null)
  const [detailState, setDetailState] = useState<TourismDetailState>({
    status: 'idle',
  })
  const [tourismState, setTourismState] = useState<TourismPageState>({
    status: 'loading',
    contents: [],
  })
  const [enrichmentData, setEnrichmentData] = useState<YeongjuEnrichmentData | null>(null)

  useEffect(() => {
    let ignore = false

    async function loadTourismContents() {
      setTourismState({ status: 'loading', contents: [] })
      setSelectedContentId(undefined)
      setDetailState({ status: 'idle' })
      const response: TourismApiResponse = await getTourismResponse(activeFilter)
      if (ignore) return

      setTourismState({
        status: response.status,
        contents: response.contents,
        reason: response.reason,
        message: response.message,
      })
    }

    void loadTourismContents()

    return () => {
      ignore = true
    }
  }, [activeFilter])

  useEffect(() => {
    if (!getStoredAuthUser()) return

    let ignore = false

    async function loadFavorites() {
      try {
        const favorites = await getFavoriteCourses()
        if (ignore) return

        setFavoriteContentIds(
          new Set(favorites.map((favorite) => favorite.content_id)),
        )
      } catch {
        if (!ignore) setFavoriteMessage('관심 코스 목록을 불러오지 못했습니다.')
      }
    }

    void loadFavorites()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadMindTags() {
      const localMindTags = loadLatestMindTags()
      const remoteMindTags = getStoredAuthUser()
        ? await getRecentJudgeMindTags(5)
        : null
      if (!ignore) setMindTags(remoteMindTags ?? localMindTags)
    }

    void loadMindTags()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) {
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        })
        setIsLocationFallback(false)
      },
      () => {
        setCurrentLocation(yeongjuCenterLocation)
        setIsLocationFallback(true)
      },
      {
        enableHighAccuracy: false,
        maximumAge: 300000,
        timeout: 7000,
      },
    )
  }, [])

  useEffect(() => {
    let ignore = false

    async function loadEnrichment() {
      const data = await loadYeongjuEnrichmentData()
      if (!ignore) setEnrichmentData(data)
    }

    void loadEnrichment()

    return () => {
      ignore = true
    }
  }, [])

  const recommendedCourse = useMemo(() => {
    return recommendCourseForSeonbiType(
      selectedSeonbiType,
      tourismState.contents,
      mindTags,
    )
  }, [mindTags, selectedSeonbiType, tourismState.contents])
  const typeInfo = seonbiTypeInfo[selectedSeonbiType]
  const recommendedItems = useMemo(() => recommendedCourse.items, [recommendedCourse])
  const routeItems = useMemo(() => {
    return getNearestTourismItems(currentLocation, recommendedItems, 3)
  }, [currentLocation, recommendedItems])
  const routePoints = useMemo(() => {
    return [
      currentLocation,
      ...routeItems.map((item) => ({
        lat: item.mapY as number,
        lng: item.mapX as number,
      })),
    ]
  }, [currentLocation, routeItems])
  const routePointsKey = useMemo(() => {
    return routePoints.map((point) => `${point.lat},${point.lng}`).join('|')
  }, [routePoints])
  const routePath = routeState.key === routePointsKey ? routeState.path : []
  const routeSource = routeState.key === routePointsKey ? routeState.source : 'straight-line'
  const activeFilterLabel = getTourismFilterLabel(activeFilter)
  const selectedRecommendationTitle = getRecommendationTitle(
    activeFilter,
    typeInfo.name,
    Boolean(testResult),
  )
  const selectedDataTitle = getTourismDataTitle(activeFilter)
  const selectedEmptyTitle = getTourismEmptyTitle(activeFilter)
  const selectedRecommendationDescription = getRecommendationDescription(
    activeFilter,
    typeInfo.name,
    Boolean(testResult),
  )
  const locationMessage = isLocationFallback
    ? `위치 권한이 없어 영주 중심 기준으로 가까운 ${activeFilterLabel} 추천 코스 3곳을 표시합니다.`
    : `현재 위치 기준 가까운 ${activeFilterLabel} 추천 코스 3곳`
  const routeLabel = `현재 위치 기준 가까운 ${activeFilterLabel} 추천 경로`
  const shouldShowCards = tourismState.status === 'ready' && tourismState.contents.length > 0
  const shouldShowAllCards = tourismState.status === 'ready' && tourismState.contents.length > 0
  const activeSeonbiType = selectedSeonbiType
  const mindTagFlow = formatMindTagFlow(mindTags)

  useEffect(() => {
    const requestId = routeRequestIdRef.current + 1
    routeRequestIdRef.current = requestId

    if (routePoints.length < 2) {
      return
    }

    async function loadRoutePath() {
      const routeResult = await requestRoutePath(routePoints)
      if (routeRequestIdRef.current !== requestId) return

      if (routeResult?.path.length) {
        setRouteState({
          key: routePointsKey,
          path: routeResult.path,
          source: routeResult.source,
        })
        return
      }

      setRouteState({
        key: routePointsKey,
        path: [],
        source: 'straight-line',
      })
    }

    void loadRoutePath()
  }, [routePoints, routePointsKey])

  const openTourismDetail = useCallback(async (item: TourismContent) => {
    const requestId = detailRequestIdRef.current + 1
    detailRequestIdRef.current = requestId

    setDetailState({
      status: 'ready',
      item,
      detail: {
        item,
        images: [],
      },
    })

    const response = await getTourismDetail(item)
    if (detailRequestIdRef.current !== requestId) return

    if (response.status !== 'ready' || !response.detail) {
      setDetailState({
        status: 'error',
        item,
        message: response.message ?? '상세 정보를 불러오지 못했습니다.',
      })
      return
    }

    setDetailState({
      status: 'ready',
      item,
      detail: response.detail,
    })
  }, [])

  const closeTourismDetail = useCallback(() => {
    detailRequestIdRef.current += 1
    setDetailState({ status: 'idle' })
  }, [])

  const selectSeonbiType = useCallback((seonbiType: SeonbiType) => {
    detailRequestIdRef.current += 1
    setSelectedSeonbiType(seonbiType)
    setSelectedContentId(undefined)
    setDetailState({ status: 'idle' })
    setAiItinerary(null)
  }, [])

  const selectTourismItem = useCallback((item: TourismContent) => {
    setSelectedContentId(getTourismItemKey(item))
    void openTourismDetail(item)
    void trackEvent('tourism_card_clicked', {
      seonbiType: activeSeonbiType,
      contentId: item.contentId,
      contentTitle: item.title,
      contentTypeId: item.contentTypeId,
      metadata: {
        seonbiTypeSource: testResult ? 'test_result' : 'preview',
      },
    })
  }, [activeSeonbiType, openTourismDetail, testResult])

  async function toggleFavoriteCourse(item: TourismContent) {
    setFavoriteMessage('')

    if (!getStoredAuthUser()) {
      setFavoriteMessage('로그인하면 관심 코스를 저장할 수 있습니다.')
      return
    }

    if (!item.contentId) {
      setFavoriteMessage('저장할 관광지 식별자가 없습니다.')
      return
    }

    const isSaved = favoriteContentIds.has(item.contentId)

    try {
      if (isSaved) {
        await removeFavoriteCourse(item.contentId)
        setFavoriteContentIds((current) => {
          const next = new Set(current)
          next.delete(item.contentId ?? '')
          return next
        })
        setFavoriteMessage('관심 코스에서 해제했습니다.')
        return
      }

      await addFavoriteCourse(item)
      setFavoriteContentIds((current) => new Set(current).add(item.contentId ?? ''))
      setFavoriteMessage('관심 코스로 저장했습니다.')
    } catch (error) {
      setFavoriteMessage(
        error instanceof Error
          ? error.message
          : '관심 코스 처리 중 문제가 발생했습니다.',
      )
    }
  }

  function handleCreateAiItinerary() {
    setAiItinerary(createAiItinerary(routeItems, mindTagFlow, activeFilterLabel))
  }

  return (
    <AppLayout hideBottomNavigation>
      <section className="page-section page-container course-page">
        <CourseProgressBadge className="course-page-progress-badge" />
        <div className="section-heading">
          <StatusBadge>추천 코스</StatusBadge>
          <h1>유형별 영주 관광 추천 코스</h1>
          <p>
            {testResult
              ? `${typeInfo.name} 결과를 기준으로 실제 공공데이터 안에서만 추천합니다.`
              : `${typeInfo.name}을 미리 선택해 실제 공공데이터 추천을 체험하고 있습니다.`}
          </p>
        </div>

        <div className="keyword-list course-keywords" aria-label="영주 대표 키워드">
          {yeongjuKeywords.map((keyword) => (
            <span key={keyword}>{keyword}</span>
          ))}
        </div>

        <div className="course-mind-tag-note" aria-label="추천 기준">
          {mindTagFlow ? (
            <>
              <span>마음 태그 반영</span>
              <strong>{mindTagFlow}</strong>
            </>
          ) : (
            <>
              <span>추천 기준</span>
              <strong>선비유형을 기준으로 추천하고 있습니다.</strong>
            </>
          )}
        </div>

        {tourismState.status === 'ready' && tourismState.message && (
          <p className="course-data-source-note">{tourismState.message}</p>
        )}

        {!testResult && (
          <SeonbiPreviewPanel
            selectedType={selectedSeonbiType}
            featureLabel="추천 코스"
            onSelect={selectSeonbiType}
          />
        )}

        <section className="surface-card course-category-panel" aria-labelledby="course-category-title">
          <div>
            <StatusBadge tone="brown">유형 선택</StatusBadge>
            <h2 id="course-category-title">코스 유형 선택</h2>
            <p>
              관광지, 문화시설, 축제, 체험, 숙박, 음식점 중 원하는 유형을 골라
              추천 코스를 확인하세요.
            </p>
          </div>
          <div className="course-category-tabs" aria-label="추천 코스 유형">
            {tourismFilters.map((filter) => {
              const isActive = activeFilter === filter.id
              return (
                <button
                  key={filter.id}
                  type="button"
                  className={isActive ? 'active' : ''}
                  onClick={() => setActiveFilter(filter.id)}
                  aria-pressed={isActive}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
        </section>

        <section className="surface-card course-ai-panel" aria-labelledby="course-ai-title">
          <div>
            <StatusBadge>AI 추천</StatusBadge>
            <h2 id="course-ai-title">AI 추천 기준</h2>
            <p>
              {mindTagFlow
                ? `최근 읽어낸 마음인 '${mindTagFlow}'을 반영해 추천 순서를 조정했습니다.`
                : '선비유형과 관광 공공데이터를 기준으로 추천합니다.'}
            </p>
          </div>
          <div className="course-ai-itinerary">
            <div>
              <h3>AI 선비길 일정</h3>
              <p>추천 장소 3곳을 바탕으로 오늘의 여행 흐름을 만들어드립니다.</p>
            </div>
            <CommonButton
              type="button"
              variant="primary"
              disabled={routeItems.length === 0}
              onClick={handleCreateAiItinerary}
            >
              AI 일정 만들기
            </CommonButton>
          </div>
          {aiItinerary && (
            <div className="course-ai-itinerary-result" aria-live="polite">
              <strong>{aiItinerary.summary}</strong>
              <ol>
                {aiItinerary.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p>{aiItinerary.closingMessage}</p>
            </div>
          )}
        </section>

        <CourseTravelContextPanel data={enrichmentData} />

        {favoriteMessage && (
          <p className="disabled-notice course-favorite-notice" role="status">
            {favoriteMessage}{' '}
            {!getStoredAuthUser() && <a href="/login">로그인</a>}
          </p>
        )}

        <div className="course-layout">
          <div className="tourism-list">
            {tourismState.status === 'loading' && (
              <TourismEmptyState
                title="영주 관광 공공데이터를 불러오고 있습니다."
                description="잠시만 기다려주세요. 불러오기가 길어지면 다른 유형을 선택해 다시 확인할 수 있습니다."
                isLoading
              />
            )}
            {tourismState.status === 'missing-api-key' && (
              <TourismEmptyState
                title="관광 정보를 불러올 준비가 아직 완료되지 않았습니다."
                description="관리자 설정이 완료되면 실제 영주 공공데이터 추천 코스를 확인할 수 있습니다."
              />
            )}
            {tourismState.status === 'error' && (
              <TourismEmptyState
                title="공공데이터를 불러오는 중 문제가 발생했습니다."
                description={
                  tourismState.message ??
                  '잠시 후 다시 시도하거나 다른 코스 유형을 선택해보세요.'
                }
              />
            )}
            {tourismState.status === 'empty' && (
              <TourismEmptyState
                title={selectedEmptyTitle}
                description="현재 조건에서 표시할 관광 정보가 없습니다. 전체 또는 다른 유형을 선택해보세요."
              />
            )}
            {shouldShowCards && (
              <section className="tourism-section-block">
                <div className="tourism-section-heading">
                  <StatusBadge>추천 코스</StatusBadge>
                  <h2>{selectedRecommendationTitle}</h2>
                  <p>현재 선택한 유형: {activeFilterLabel}</p>
                  <p>
                    {selectedRecommendationDescription}
                  </p>
                </div>
                {recommendedItems.map((item) => (
                  <div key={getTourismItemKey(item)}>
                    <TourismCard
                      item={item}
                      selected={selectedContentId === getTourismItemKey(item)}
                      isFavorite={Boolean(
                        item.contentId && favoriteContentIds.has(item.contentId),
                      )}
                      recommendationReason={createTourismRecommendationReason(
                        activeSeonbiType,
                        item,
                        mindTags,
                      )}
                      onSelect={selectTourismItem}
                      onToggleFavorite={toggleFavoriteCourse}
                    />
                  </div>
                ))}
              </section>
            )}
            {shouldShowAllCards && (
              <section className="tourism-section-block">
                <div className="tourism-section-heading">
                  <StatusBadge tone="brown">공공데이터</StatusBadge>
                  <h2>{selectedDataTitle}</h2>
                </div>
                {tourismState.contents.map((item) => (
                  <div key={getTourismItemKey(item)}>
                    <TourismCard
                      item={item}
                      selected={selectedContentId === getTourismItemKey(item)}
                      isFavorite={Boolean(
                        item.contentId && favoriteContentIds.has(item.contentId),
                      )}
                      recommendationReason={createTourismRecommendationReason(
                        activeSeonbiType,
                        item,
                        mindTags,
                      )}
                      onSelect={selectTourismItem}
                      onToggleFavorite={toggleFavoriteCourse}
                    />
                  </div>
                ))}
              </section>
            )}
          </div>
          <div className="course-side-panel">
            <CourseMap
              items={tourismState.contents}
              routeItems={routeItems}
              routePath={routePath}
              routeSource={routeSource}
              currentLocation={currentLocation}
              currentLocationLabel={isLocationFallback ? '영주 중심' : '내 위치'}
              locationMessage={locationMessage}
              routeLabel={routeLabel}
              selectedContentId={selectedContentId}
              onSelectItem={selectTourismItem}
            />
          </div>
        </div>
        <TourismDetailPanel
          selectedItem={detailState.item}
          detail={detailState.detail}
          status={detailState.status}
          message={detailState.message}
          isFavorite={Boolean(
            detailState.item?.contentId &&
              favoriteContentIds.has(detailState.item.contentId),
          )}
          onToggleFavorite={toggleFavoriteCourse}
          onClose={closeTourismDetail}
        />
      </section>
    </AppLayout>
  )
}

function getTourismResponse(filterId: TourismFilterId) {
  if (filterId === 'attraction') return getYeongjuTouristAttractions()
  if (filterId === 'culture') return getYeongjuCultureFacilities()
  if (filterId === 'festival') return getYeongjuFestivals()
  if (filterId === 'experience') return getYeongjuExperienceFacilities()
  if (filterId === 'accommodation') return getYeongjuAccommodations()
  if (filterId === 'restaurant') return getYeongjuRestaurants()
  return getYeongjuTourismContents()
}

function CourseTravelContextPanel({ data }: { data: YeongjuEnrichmentData | null }) {
  if (!data) {
    return (
      <section className="surface-card course-context-panel" aria-label="여행 판단 근거">
        <div className="course-context-heading">
          <div>
            <StatusBadge tone="neutral">판단 근거</StatusBadge>
            <h2>오늘 여행 판단 근거</h2>
          </div>
          <span>불러오는 중</span>
        </div>
        <p className="course-context-empty">영주 보강 데이터를 불러오고 있습니다.</p>
      </section>
    )
  }

  const weather = data.weatherSummary
  const accessibility = data.accessibilitySummary
  const transit = data.transitAccess
  const appliedRows = data.sourceInventory.reduce(
    (sum, item) => sum + item.appliedRows,
    0,
  )
  const latestVisitors = data.visitorDemand.latestCompleteMonth
  const weatherSummary = weather
    ? `${weather.sky ?? '날씨 미확인'} · ${formatTemperature(weather.temperatureC)} · 강수 ${formatPercent(weather.precipitationProbability)}`
    : '기상 데이터 수집 전'
  const uvSummary = weather?.uvIndex?.level
    ? `자외선 ${weather.uvIndex.level}`
    : '자외선 미확인'
  const contextCards = [
    {
      label: '날씨',
      value: weatherSummary,
      detail: `${uvSummary}. ${weather?.guidance[0] ?? '날씨 기반 동선 보정 전입니다.'}`,
    },
    {
      label: '교통',
      value: transit
        ? `영주역 기준 주중 ${formatNumber(transit.weekdayPassengerTrainCount)}회`
        : '교통 데이터 수집 전',
      detail: transit?.guidance ?? '영주역 기준 이동 근거를 확인하는 중입니다.',
    },
    {
      label: '편의',
      value: accessibility
        ? `화장실 ${formatNumber(accessibility.totalPublicToilets)}곳 · 주차장 ${formatNumber(accessibility.totalParkingLots)}곳`
        : '편의 데이터 수집 전',
      detail: accessibility
        ? `무장애 화장실 ${formatNumber(accessibility.accessiblePublicToilets)}곳, 장애인 주차 근거 ${formatNumber(accessibility.accessibleParkingLots)}곳을 추천 보정에 사용합니다.`
        : '편의시설 근거를 확인하는 중입니다.',
    },
    {
      label: '수요',
      value: `${latestVisitors.month} 소수서원 ${formatNumber(latestVisitors.visitors)}명`,
      detail: `총 ${formatNumber(appliedRows)}건의 보강 공공데이터를 추천 후보와 히트맵에 연결했습니다.`,
    },
  ]

  return (
    <section className="surface-card course-context-panel" aria-labelledby="course-context-title">
      <div className="course-context-heading">
        <div>
          <StatusBadge tone="brown">판단 근거</StatusBadge>
          <h2 id="course-context-title">오늘 여행 판단 근거</h2>
        </div>
        <span>{formatShortDate(data.generatedAt)}</span>
      </div>
      <div className="course-context-grid">
        {contextCards.map((card) => (
          <article key={card.label} className="course-context-card">
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value)
}

function formatPercent(value: number | undefined) {
  if (value === undefined) return '미확인'
  return `${formatNumber(value)}%`
}

function formatTemperature(value: number | undefined) {
  if (value === undefined) return '기온 미확인'
  return `${formatNumber(value)}°C`
}

function formatShortDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '최근 갱신'

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function getTourismFilterLabel(filterId: TourismFilterId) {
  return tourismFilters.find((filter) => filter.id === filterId)?.label ?? '전체'
}

function getTourismDataTitle(filterId: TourismFilterId) {
  if (filterId === 'attraction') return '영주 관광지 데이터 보기'
  if (filterId === 'culture') return '영주 문화시설 데이터 보기'
  if (filterId === 'festival') return '영주 축제 데이터 보기'
  if (filterId === 'experience') return '영주 체험 데이터 보기'
  if (filterId === 'accommodation') return '영주 숙박 데이터 보기'
  if (filterId === 'restaurant') return '영주 음식점 데이터 보기'
  return '전체 영주 관광 데이터 보기'
}

function getRecommendationTitle(
  filterId: TourismFilterId,
  seonbiTypeName: string,
  hasTestResult: boolean,
) {
  const ownerLabel = hasTestResult ? '내 선비유형' : seonbiTypeName
  if (filterId === 'attraction') return `${ownerLabel}에 맞는 영주 관광지 추천`
  if (filterId === 'culture') return `${ownerLabel}에 맞는 영주 문화시설 추천`
  if (filterId === 'festival') return `${ownerLabel}에 맞는 영주 축제 추천`
  if (filterId === 'experience') return `${ownerLabel}에 맞는 영주 체험 추천`
  if (filterId === 'accommodation') return `${ownerLabel}에 맞는 영주 숙박 추천`
  if (filterId === 'restaurant') return `${ownerLabel}에 맞는 영주 음식점 추천`
  return `${ownerLabel}에 맞는 영주 추천 코스`
}

function getTourismEmptyTitle(filterId: TourismFilterId) {
  if (filterId === 'all') return '조건에 맞는 영주 관광 정보가 없습니다.'
  return '선택한 유형의 영주 공공데이터를 찾지 못했습니다.'
}

function getRecommendationDescription(
  filterId: TourismFilterId,
  seonbiTypeName: string,
  hasTestResult: boolean,
) {
  const label = getTourismFilterLabel(filterId)
  const sourceLabel = hasTestResult ? '선비유형 성향' : `${seonbiTypeName} 성향`
  if (filterId === 'all') {
    return `실제 영주 관광 공공데이터 중 ${sourceLabel}과 가까운 장소를 우선 추천합니다.`
  }

  return `실제 영주 ${label} 공공데이터 중 ${sourceLabel}과 가까운 장소를 우선 추천합니다.`
}

function getTourismItemKey(item: TourismContent) {
  return item.contentId ?? `${item.title}-${item.mapX}-${item.mapY}`
}

function getNearestTourismItems(
  currentLocation: RouteCoordinate,
  items: TourismContent[],
  limit: number,
) {
  const uniqueItems = new Map<string, TourismContent>()
  for (const item of items) {
    if (item.mapX === undefined || item.mapY === undefined) continue
    const id = getTourismItemKey(item)
    if (!uniqueItems.has(id)) uniqueItems.set(id, item)
  }

  return Array.from(uniqueItems.values())
    .map((item) => ({
      item,
      distance: getHaversineDistance(currentLocation, {
        lat: item.mapY as number,
        lng: item.mapX as number,
      }),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map(({ item }) => item)
}

function getHaversineDistance(from: RouteCoordinate, to: RouteCoordinate) {
  const earthRadiusKm = 6371
  const latDistance = toRadians(to.lat - from.lat)
  const lngDistance = toRadians(to.lng - from.lng)
  const fromLat = toRadians(from.lat)
  const toLat = toRadians(to.lat)
  const haversine =
    Math.sin(latDistance / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDistance / 2) ** 2

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

function createAiItinerary(
  items: TourismContent[],
  mindTagFlow: string,
  filterLabel: string,
): AiItinerary {
  const itineraryItems = items.slice(0, 3)
  if (itineraryItems.length === 0) {
    return {
      summary: '추천 장소가 준비되면 AI 선비길 일정을 만들 수 있습니다.',
      steps: ['관광 데이터를 불러온 뒤 다시 시도해주세요.'],
      closingMessage: '현재는 카드 목록을 먼저 확인해보세요.',
    }
  }

  return {
    summary: mindTagFlow
      ? `최근 마음 흐름 '${mindTagFlow}'에 맞춘 ${filterLabel} 일정입니다.`
      : `선비유형과 현재 선택한 ${filterLabel} 정보를 바탕으로 만든 일정입니다.`,
    steps: itineraryItems.map((item, index) => {
      const title = item.title ?? '영주 추천 장소'
      if (index === 0) return `${title}에서 오늘의 여행을 차분히 시작합니다.`
      if (index === 1) return `${title}로 이동해 영주의 분위기를 이어서 살펴봅니다.`
      return `${title}에서 여정을 정리하며 마무리합니다.`
    }),
    closingMessage: '정확한 이동 시간은 지도와 현장 상황을 함께 확인해주세요.',
  }
}

interface TourismEmptyStateProps {
  title: string
  description?: string
  isLoading?: boolean
}

function TourismEmptyState({ title, description, isLoading = false }: TourismEmptyStateProps) {
  return (
    <article className="surface-card tourism-empty-state">
      {isLoading ? (
        <BrandLoading message="영주 관광 데이터를 살피는 중입니다." />
      ) : (
        <StatusBadge tone="neutral">공공데이터</StatusBadge>
      )}
      <h2>{title}</h2>
      <p>{description ?? '실제 공공데이터 안에서 표시할 수 있는 정보를 확인하고 있습니다.'}</p>
      <p>가짜 관광지 데이터는 사용하지 않으며, 사용 가능한 정보만 보여드립니다.</p>
    </article>
  )
}
