import { useEffect, useMemo, useState } from 'react'
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
import { recommendCourseForSeonbiType } from '../features/tourism/recommendation'
import type {
  TourismApiResponse,
  TourismContent,
  TourismDataStatus,
  TourismDetail,
  TourismEmptyStateReason,
} from '../features/tourism/tourismTypes'
import { trackEvent } from '../features/analytics/trackEvent'
import { loadTestResult } from '../lib/storage'

const yeongjuKeywords = ['소수서원', '선비세상', '무섬마을', '부석사', '풍기인삼']
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
  const [activeFilter, setActiveFilter] = useState<TourismFilterId>('all')
  const [selectedContentId, setSelectedContentId] = useState<string | undefined>()
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

  const recommendedCourse = testResult
    ? recommendCourseForSeonbiType(testResult.type, tourismState.contents)
    : null
  const typeInfo = testResult ? seonbiTypeInfo[testResult.type] : null
  const recommendedItems = recommendedCourse?.items ?? []
  const shouldShowCards = tourismState.status === 'ready' && tourismState.contents.length > 0
  const shouldShowAllCards = tourismState.status === 'ready' && tourismState.contents.length > 0

  if (!testResult) {
    return (
      <AppLayout>
        <section className="page-section page-container">
          <ProtectedFeaturePrompt />
        </section>
      </AppLayout>
    )
  }
  const activeTestResult = testResult

  function selectTourismItem(item: TourismContent) {
    setSelectedContentId(getTourismItemKey(item))
    void openTourismDetail(item)
    void trackEvent('tourism_card_clicked', {
      seonbiType: activeTestResult.type,
      contentId: item.contentId,
      contentTitle: item.title,
      contentTypeId: item.contentTypeId,
    })
  }

  async function openTourismDetail(item: TourismContent) {
    setDetailState({
      status: 'ready',
      item,
      detail: {
        item,
        images: [],
      },
    })

    const response = await getTourismDetail(item)
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
              <TourismEmptyState title="조건에 맞는 영주 관광 정보가 없습니다." />
            )}
            {shouldShowCards && (
              <section className="tourism-section-block">
                <div className="tourism-section-heading">
                  <StatusBadge>추천 코스</StatusBadge>
                  <h2>내 선비유형에 맞는 영주 추천 코스</h2>
                  <p>
                    실제 영주 관광 공공데이터 중 유형 성향과 가까운 장소를 우선 추천합니다.
                  </p>
                </div>
                {recommendedItems.map((item) => (
                  <TourismCard
                    key={getTourismItemKey(item)}
                    item={item}
                    selected={selectedContentId === getTourismItemKey(item)}
                    isFavorite={Boolean(
                      item.contentId && favoriteContentIds.has(item.contentId),
                    )}
                    onSelect={selectTourismItem}
                    onToggleFavorite={toggleFavoriteCourse}
                  />
                ))}
              </section>
            )}
            {shouldShowAllCards && (
              <section className="tourism-section-block">
                <div className="tourism-section-heading">
                  <StatusBadge tone="brown">공공데이터</StatusBadge>
                  <h2>전체 영주 관광 데이터 보기</h2>
                </div>
                <div className="filter-tabs" aria-label="관광 데이터 필터">
                  {tourismFilters.map((filter) => (
                    <button
                      key={filter.id}
                      type="button"
                      className={activeFilter === filter.id ? 'active' : ''}
                      onClick={() => setActiveFilter(filter.id)}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                {tourismState.contents.map((item) => (
                  <TourismCard
                    key={getTourismItemKey(item)}
                    item={item}
                    selected={selectedContentId === getTourismItemKey(item)}
                    isFavorite={Boolean(
                      item.contentId && favoriteContentIds.has(item.contentId),
                    )}
                    onSelect={selectTourismItem}
                    onToggleFavorite={toggleFavoriteCourse}
                  />
                ))}
              </section>
            )}
          </div>
          <div className="course-side-panel">
            <CourseMap
              items={tourismState.contents}
              selectedContentId={selectedContentId}
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
          onClose={() => setDetailState({ status: 'idle' })}
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

function getTourismItemKey(item: TourismContent) {
  return item.contentId ?? `${item.title}-${item.mapX}-${item.mapY}`
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
