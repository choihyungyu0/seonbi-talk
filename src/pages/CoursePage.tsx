import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { StatusBadge } from '../components/common/StatusBadge'
import { ProtectedFeaturePrompt } from '../components/common/ProtectedFeaturePrompt'
import { TourismCard } from '../components/tourism/TourismCard'
import { CourseMap } from '../components/tourism/CourseMap'
import { TourismDetailPanel } from '../components/tourism/TourismDetailPanel'
import { seonbiTypeInfo } from '../data/seonbiTypes'
import {
  getYeongjuAccommodations,
  getYeongjuCultureFacilities,
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
import {
  createTourismRecommendationReason,
  recommendCourseForSeonbiType,
} from '../features/tourism/recommendation'
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

const yeongjuKeywords = ['소수서원', '선비세상', '무섬마을', '부석사', '풍기인삼']
const yeongjuCenterLocation: RouteCoordinate = {
  lat: 36.8057,
  lng: 128.624,
}
const tourismFilters = [
  { id: 'all', label: '전체', contentTypeId: undefined },
  { id: 'attraction', label: '관광지', contentTypeId: '12' },
  { id: 'culture', label: '문화시설', contentTypeId: '14' },
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

export function CoursePage() {
  const testResult = useMemo(() => loadTestResult(), [])
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
  const [detailState, setDetailState] = useState<TourismDetailState>({
    status: 'idle',
  })
  const [tourismState, setTourismState] = useState<TourismPageState>({
    status: testResult ? 'loading' : 'empty',
    contents: [],
    reason: testResult ? undefined : 'no_test_result',
  })

  useEffect(() => {
    if (!testResult) return

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
  }, [activeFilter, testResult])

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

  const recommendedCourse = useMemo(() => {
    return testResult
      ? recommendCourseForSeonbiType(testResult.type, tourismState.contents)
      : null
  }, [testResult, tourismState.contents])
  const typeInfo = testResult ? seonbiTypeInfo[testResult.type] : null
  const recommendedItems = useMemo(() => recommendedCourse?.items ?? [], [recommendedCourse])
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
  const selectedRecommendationTitle = getRecommendationTitle(activeFilter)
  const selectedDataTitle = getTourismDataTitle(activeFilter)
  const selectedEmptyTitle = getTourismEmptyTitle(activeFilter)
  const selectedRecommendationDescription = getRecommendationDescription(activeFilter)
  const locationMessage = isLocationFallback
    ? `위치 권한이 없어 영주 중심 기준으로 가까운 ${activeFilterLabel} 추천 코스 3곳을 표시합니다.`
    : `현재 위치 기준 가까운 ${activeFilterLabel} 추천 코스 3곳`
  const routeLabel = `현재 위치 기준 가까운 ${activeFilterLabel} 추천 경로`
  const shouldShowCards = tourismState.status === 'ready' && tourismState.contents.length > 0
  const shouldShowAllCards = tourismState.status === 'ready' && tourismState.contents.length > 0
  const activeSeonbiType = testResult?.type

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

  const selectTourismItem = useCallback((item: TourismContent) => {
    if (!activeSeonbiType) return

    setSelectedContentId(getTourismItemKey(item))
    void openTourismDetail(item)
    void trackEvent('tourism_card_clicked', {
      seonbiType: activeSeonbiType,
      contentId: item.contentId,
      contentTitle: item.title,
      contentTypeId: item.contentTypeId,
    })
  }, [activeSeonbiType, openTourismDetail])

  if (!testResult) {
    return (
      <AppLayout>
        <section className="page-section page-container">
          <ProtectedFeaturePrompt />
        </section>
      </AppLayout>
    )
  }

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

  return (
    <AppLayout>
      <section className="page-section page-container">
        <div className="section-heading">
          <StatusBadge>추천 코스</StatusBadge>
          <h1>유형별 영주 관광 추천 코스</h1>
          <p>
            {typeInfo
              ? `${typeInfo.name} 결과를 기준으로 실제 공공데이터 안에서만 추천합니다.`
              : '선비유형 테스트 결과를 기준으로 추천 코스를 준비합니다.'}
          </p>
        </div>

        <div className="keyword-list course-keywords" aria-label="영주 대표 키워드">
          {yeongjuKeywords.map((keyword) => (
            <span key={keyword}>{keyword}</span>
          ))}
        </div>

        <section className="surface-card course-category-panel" aria-labelledby="course-category-title">
          <div>
            <StatusBadge tone="brown">유형 선택</StatusBadge>
            <h2 id="course-category-title">코스 유형 선택</h2>
            <p>
              관광지, 문화시설, 숙박, 음식점 중 원하는 유형을 골라 추천 코스를 확인하세요.
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

        {favoriteMessage && (
          <p className="disabled-notice course-favorite-notice" role="status">
            {favoriteMessage}{' '}
            {!getStoredAuthUser() && <a href="/login">로그인</a>}
          </p>
        )}

        <div className="course-layout">
          <div className="tourism-list">
            {tourismState.status === 'loading' && (
              <TourismEmptyState title="영주 관광 공공데이터를 불러오고 있습니다." />
            )}
            {tourismState.status === 'missing-api-key' && (
              <TourismEmptyState title="공공데이터 서비스키 설정 후 관광 정보를 불러올 수 있습니다." />
            )}
            {tourismState.status === 'error' && (
              <TourismEmptyState
                title="공공데이터를 불러오는 중 문제가 발생했습니다."
                description={tourismState.message}
              />
            )}
            {tourismState.status === 'empty' && testResult && (
              <TourismEmptyState title={selectedEmptyTitle} />
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
  if (filterId === 'accommodation') return getYeongjuAccommodations()
  if (filterId === 'restaurant') return getYeongjuRestaurants()
  return getYeongjuTourismContents()
}

function getTourismFilterLabel(filterId: TourismFilterId) {
  return tourismFilters.find((filter) => filter.id === filterId)?.label ?? '전체'
}

function getTourismDataTitle(filterId: TourismFilterId) {
  if (filterId === 'attraction') return '영주 관광지 데이터 보기'
  if (filterId === 'culture') return '영주 문화시설 데이터 보기'
  if (filterId === 'accommodation') return '영주 숙박 데이터 보기'
  if (filterId === 'restaurant') return '영주 음식점 데이터 보기'
  return '전체 영주 관광 데이터 보기'
}

function getRecommendationTitle(filterId: TourismFilterId) {
  if (filterId === 'attraction') return '내 선비유형에 맞는 영주 관광지 추천'
  if (filterId === 'culture') return '내 선비유형에 맞는 영주 문화시설 추천'
  if (filterId === 'accommodation') return '내 선비유형에 맞는 영주 숙박 추천'
  if (filterId === 'restaurant') return '내 선비유형에 맞는 영주 음식점 추천'
  return '내 선비유형에 맞는 영주 추천 코스'
}

function getTourismEmptyTitle(filterId: TourismFilterId) {
  if (filterId === 'all') return '조건에 맞는 영주 관광 정보가 없습니다.'
  return '선택한 유형의 영주 공공데이터를 찾지 못했습니다.'
}

function getRecommendationDescription(filterId: TourismFilterId) {
  const label = getTourismFilterLabel(filterId)
  if (filterId === 'all') {
    return '실제 영주 관광 공공데이터 중 선비유형 성향과 가까운 장소를 우선 추천합니다.'
  }

  return `실제 영주 ${label} 공공데이터 중 선비유형 성향과 가까운 장소를 우선 추천합니다.`
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

interface TourismEmptyStateProps {
  title: string
  description?: string
}

function TourismEmptyState({ title, description }: TourismEmptyStateProps) {
  return (
    <article className="surface-card tourism-empty-state">
      <StatusBadge tone="neutral">공공데이터</StatusBadge>
      <h2>{title}</h2>
      <p>{description ?? '관광지 정보는 실제 공공데이터 연동 후 표시됩니다.'}</p>
      <p>가짜 관광지 데이터는 사용하지 않습니다.</p>
    </article>
  )
}
