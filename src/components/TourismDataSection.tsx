export function TourismDataSection() {
  return (
    <section className="section tourism-section" id="추천-코스">
      <div className="section-heading align-left">
        <p className="eyebrow">PUBLIC DATA AREA</p>
        <h2>추천 코스와 관광 정보</h2>
        <p>
          관광지명, 운영시간, 전화번호, 통계 숫자는 공공데이터 API 조회 후
          표시합니다.
        </p>
      </div>
      <div className="tourism-layout">
        <div className="empty-list" aria-label="관광 데이터 목록">
          <EmptyDataCard title="관광지 목록" />
          <EmptyDataCard title="추천 코스" />
          <EmptyDataCard title="편의시설 정보" />
        </div>
        <aside className="map-placeholder" aria-label="지도 영역">
          <div className="map-toolbar">
            <strong>지도</strong>
            <span>공공데이터 조회 후 표시</span>
          </div>
          <div className="map-canvas">
            <span className="map-icon" aria-hidden="true">
              ◇
            </span>
            <p>좌표 데이터 연동 후 지도 표시</p>
          </div>
        </aside>
      </div>
    </section>
  )
}

function EmptyDataCard({ title }: { title: string }) {
  return (
    <article className="empty-card">
      <div>
        <h3>{title}</h3>
        <p>공공데이터 조회 후 표시</p>
      </div>
      <span className="empty-badge">대기</span>
    </article>
  )
}
