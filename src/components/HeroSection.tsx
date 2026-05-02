export function HeroSection() {
  return (
    <section className="hero-section" id="top">
      <div className="hero-grid" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="hero-content">
        <p className="eyebrow">SPIRIT OF SEONBI</p>
        <h1>나의 기품이 머무는 길</h1>
        <p className="hero-copy">
          영주의 선비 문화와 여행 경험을 차분하게 탐색하는 디지털 안내
          화면입니다. 관광 정보는 공공데이터 API 조회 후 표시됩니다.
        </p>
        <div className="hero-actions">
          <a className="button button-primary" href="#선비-테스트">
            선비유형 보기
          </a>
          <a className="button button-secondary" href="#추천-코스">
            공공데이터 영역 확인
          </a>
        </div>
      </div>
    </section>
  )
}
