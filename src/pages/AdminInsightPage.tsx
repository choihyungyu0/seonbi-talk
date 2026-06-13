import { Link } from 'react-router-dom'
import { ImagePlaceholder } from '../components/common/ImagePlaceholder'
import { StatusBadge } from '../components/common/StatusBadge'
import { AppLayout } from '../components/layout/AppLayout'
import { seonbiTypeNames } from '../features/seonbi-test/types'

export function AdminInsightPage() {
  return (
    <AppLayout hideNavigation hideChatbot adminMode>
      <section className="admin-page page-container">
        <div className="admin-header">
          <div>
            <StatusBadge tone="neutral">샘플 화면 / 실제 데이터 연동 전</StatusBadge>
            <h1>관리자 인사이트</h1>
            <p>아직 수집된 참여 데이터가 없습니다.</p>
          </div>
          <Link className="common-button common-button--secondary" to="/">
            일반 서비스로 돌아가기
          </Link>
        </div>

        <div className="admin-card-grid">
          <article className="surface-card admin-stat-card">
            <span>참여 데이터</span>
            <strong>데이터 수집 후 표시됩니다.</strong>
          </article>
          <article className="surface-card admin-stat-card">
            <span>관심 코스</span>
            <strong>데이터 수집 후 표시됩니다.</strong>
          </article>
          <article className="surface-card admin-stat-card">
            <span>저장 기록</span>
            <strong>데이터 수집 후 표시됩니다.</strong>
          </article>
        </div>

        <div className="admin-insight-grid">
          <section className="surface-card admin-panel">
            <h2>선비유형 분포</h2>
            <div className="empty-chart" role="img" aria-label="데이터 수집 전 차트">
              {seonbiTypeNames.map((type) => (
                <span key={type}>{type}</span>
              ))}
            </div>
            <p>데이터 수집 후 표시됩니다.</p>
          </section>
          <section className="surface-card admin-panel">
            <h2>관광 선호 데이터</h2>
            <ImagePlaceholder label="공공데이터 이미지 연동 예정" />
            <p>아직 수집된 참여 데이터가 없습니다.</p>
          </section>
        </div>
      </section>
    </AppLayout>
  )
}
