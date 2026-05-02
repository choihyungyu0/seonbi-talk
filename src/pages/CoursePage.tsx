import { AppLayout } from '../components/layout/AppLayout'
import { StatusBadge } from '../components/common/StatusBadge'
import { TourismCard } from '../components/tourism/TourismCard'
import type { TourismCardModel } from '../features/tourism/tourismTypes'

const tourismCards: TourismCardModel[] = [
  { label: '소수서원', title: '공공데이터 조회 후 표시', status: 'empty' },
  { label: '선비세상', title: '공공데이터 조회 후 표시', status: 'empty' },
  { label: '무섬마을', title: '공공데이터 조회 후 표시', status: 'empty' },
  { label: '부석사', title: '공공데이터 조회 후 표시', status: 'empty' },
  { label: '풍기인삼', title: '공공데이터 조회 후 표시', status: 'empty' },
]

export function CoursePage() {
  return (
    <AppLayout>
      <section className="page-section page-container">
        <div className="section-heading">
          <StatusBadge>추천 코스</StatusBadge>
          <h1>유형별 영주 관광 추천 코스</h1>
          <p>공공데이터 조회 후 추천 코스가 표시됩니다.</p>
        </div>

        <div className="course-layout">
          <div className="tourism-list">
            {tourismCards.map((card) => (
              <TourismCard key={card.label} item={card} />
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
