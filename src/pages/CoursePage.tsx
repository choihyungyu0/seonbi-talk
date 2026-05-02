import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { StatusBadge } from '../components/common/StatusBadge'
import { TourismCard } from '../components/tourism/TourismCard'
import { CourseMap } from '../components/tourism/CourseMap'
import { seonbiTypeInfo } from '../data/seonbiTypes'
import {
  getYeongjuAccommodations,
  getYeongjuCultureFacilities,
  getYeongjuRestaurants,
  getYeongjuTourismContents,
  getYeongjuTouristAttractions,
} from '../features/tourism/tourismApi'
import { recommendCourseForSeonbiType } from '../features/tourism/recommendation'
import type {
  TourismApiResponse,
  TourismContent,
  TourismDataStatus,
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

export function CoursePage() {
  const testResult = useMemo(() => loadTestResult(), [])
  const [activeFilter, setActiveFilter] = useState<TourismFilterId>('all')
  const [selectedContentId, setSelectedContentId] = useState<string | undefined>()
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

  const recommendedCourse = testResult
    ? recommendCourseForSeonbiType(testResult.type, tourismState.contents)
    : null
  const typeInfo = testResult ? seonbiTypeInfo[testResult.type] : null
  const recommendedItems = recommendedCourse?.items ?? []
  const shouldShowCards = tourismState.status === 'ready' && tourismState.contents.length > 0
  const shouldShowAllCards = tourismState.status === 'ready' && tourismState.contents.length > 0

  function selectTourismItem(item: TourismContent) {
    setSelectedContentId(getTourismItemKey(item))
    void trackEvent('tourism_card_clicked', {
      seonbiType: testResult?.type,
      contentId: item.contentId,
      contentTitle: item.title,
      contentTypeId: item.contentTypeId,
    })
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

        {!testResult && (
          <article className="surface-card empty-result-card course-empty-result">
            <h2>아직 선비유형 테스트 결과가 없습니다.</h2>
            <p>
              테스트를 먼저 진행하면 유형에 맞는 영주 코스를 추천받을 수 있습니다.
            </p>
            <Link className="common-button common-button--primary" to="/test">
              선비유형 테스트 시작하기
            </Link>
          </article>
        )}

        <div className="keyword-list course-keywords" aria-label="영주 대표 키워드">
          {yeongjuKeywords.map((keyword) => (
            <span key={keyword}>{keyword}</span>
          ))}
        </div>

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
                    onSelect={selectTourismItem}
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
                    onSelect={selectTourismItem}
                  />
                ))}
              </section>
            )}
          </div>
          <CourseMap
            items={tourismState.contents}
            selectedContentId={selectedContentId}
          />
        </div>
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
