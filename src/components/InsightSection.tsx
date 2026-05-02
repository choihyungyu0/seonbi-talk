import { seonbiTypeNames } from '../data/seonbiTypes'

export function InsightSection() {
  return (
    <section className="section insight-section">
      <div className="section-heading align-left">
        <p className="eyebrow">DATA INSIGHT</p>
        <h2>데이터 인사이트</h2>
        <p>실제 데이터 연동 전에는 통계 숫자와 기록을 표시하지 않습니다.</p>
      </div>
      <div className="insight-grid">
        <article className="insight-card">
          <h3>성향 테스트 분포</h3>
          <div className="empty-chart" role="img" aria-label="데이터 수집 전 차트">
            {seonbiTypeNames.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
          <p>공공데이터 조회 후 표시</p>
        </article>
        <article className="insight-card dark">
          <h3>실시간 기록</h3>
          <p>데이터 수집 후 표시</p>
        </article>
      </div>
    </section>
  )
}
