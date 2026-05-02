import { useEffect, useMemo, useState } from 'react'
import { AppLayout } from '../components/layout/AppLayout'
import { StatusBadge } from '../components/common/StatusBadge'
import { TourismCard } from '../components/tourism/TourismCard'
import { seonbiTypeInfo } from '../data/seonbiTypes'
import { getYeongjuTourismContents } from '../features/tourism/tourismApi'
import { recommendCourseForSeonbiType } from '../features/tourism/recommendation'
import type {
  TourismApiResponse,
  TourismContent,
  TourismDataStatus,
  TourismEmptyStateReason,
} from '../features/tourism/tourismTypes'
import { loadTestResult } from '../lib/storage'

const yeongjuKeywords = ['소수서원', '선비세상', '무섬마을', '부석사', '풍기인삼']

interface TourismPageState {
  status: TourismDataStatus
  contents: TourismContent[]
  reason?: TourismEmptyStateReason
  message?: string
}

export function CoursePage() {
  const testResult = useMemo(() => loadTestResult(), [])
  const [tourismState, setTourismState] = useState<TourismPageState>({
    status: testResult ? 'loading' : 'empty',
    contents: [],
    reason: testResult ? undefined : 'no-test-result',
  })

  useEffect(() => {
    if (!testResult) return

    let ignore = false

    async function loadTourismContents() {
      setTourismState({ status: 'loading', contents: [] })
      const response: TourismApiResponse = await getYeongjuTourismContents()
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
  }, [testResult])

  const recommendedCourse = testResult
    ? recommendCourseForSeonbiType(testResult.type, tourismState.contents)
    : null
  const typeInfo = testResult ? seonbiTypeInfo[testResult.type] : null
  const recommendedItems = recommendedCourse?.items ?? []
  const shouldShowCards = tourismState.status === 'ready' && recommendedItems.length > 0

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

        <div className="course-layout">
          <div className="tourism-list">
            {tourismState.status === 'loading' && (
              <TourismEmptyState title="공공데이터를 조회하고 있습니다." />
            )}
            {!testResult && (
              <TourismEmptyState
                title="선비유형 테스트 결과가 필요합니다."
                description="테스트를 먼저 진행하면 유형에 맞는 추천 코스 영역을 확인할 수 있습니다."
              />
            )}
            {tourismState.status === 'missing-api-key' && (
              <TourismEmptyState title="공공데이터 연동 준비 중" />
            )}
            {tourismState.status === 'error' && (
              <TourismEmptyState
                title="공공데이터 조회 후 추천 코스가 표시됩니다."
                description={tourismState.message ?? '관광지 정보는 실제 공공데이터 연동 후 표시됩니다.'}
              />
            )}
            {tourismState.status === 'empty' && testResult && (
              <TourismEmptyState title="공공데이터 조회 후 추천 코스가 표시됩니다." />
            )}
            {tourismState.status === 'ready' && recommendedItems.length === 0 && (
              <TourismEmptyState title="공공데이터 조회 후 추천 코스가 표시됩니다." />
            )}
            {shouldShowCards &&
              recommendedItems.map((item) => (
                <TourismCard
                  key={item.contentId ?? `${item.title}-${item.mapX}-${item.mapY}`}
                  item={item}
                />
              ))}
          </div>
          <aside className="surface-card map-panel">
            <div className="map-panel-header">
              <h2>지도</h2>
              <span>좌표 데이터 연동 후 지도 표시</span>
            </div>
            <div className="map-empty">
              <span aria-hidden="true">◇</span>
              <p>좌표 데이터 연동 후 지도 표시</p>
            </div>
          </aside>
        </div>
      </section>
    </AppLayout>
  )
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
