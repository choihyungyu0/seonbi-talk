const features = [
  {
    title: '선비유형 테스트',
    description: '네 가지 선비 유형 체계로 결과명을 통일합니다.',
  },
  {
    title: '추천 코스',
    description: '공공데이터 API 연동 후 관광지와 코스 정보를 표시합니다.',
  },
  {
    title: '선비의 한마디',
    description: '입력 기반 안내 문구를 보여주는 영역입니다.',
  },
]

export function FeatureCards() {
  return (
    <section className="feature-section" aria-label="주요 기능">
      {features.map((feature) => (
        <article className="feature-card" key={feature.title}>
          <span className="feature-icon" aria-hidden="true">
            ✦
          </span>
          <h2>{feature.title}</h2>
          <p>{feature.description}</p>
        </article>
      ))}
    </section>
  )
}
