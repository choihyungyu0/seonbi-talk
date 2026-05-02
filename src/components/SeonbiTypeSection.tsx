const seonbiTypes = [
  {
    name: '퇴계형',
    tone: '원칙과 학문을 중시하는 유형',
  },
  {
    name: '율곡형',
    tone: '실천과 균형을 중시하는 유형',
  },
  {
    name: '처사형',
    tone: '절제와 사색을 중시하는 유형',
  },
  {
    name: '우국형',
    tone: '책임과 공동체를 중시하는 유형',
  },
]

export function SeonbiTypeSection() {
  return (
    <section className="section seonbi-section" id="선비-테스트">
      <div className="section-heading">
        <p className="eyebrow">SEONBI TYPE</p>
        <h2>선비 유형명은 네 가지로 통일합니다</h2>
        <p>
          테스트 결과와 통계 화면에서 사용하는 유형명은 퇴계형, 율곡형,
          처사형, 우국형만 사용합니다.
        </p>
      </div>
      <div className="type-grid">
        {seonbiTypes.map((type) => (
          <article className="type-card" key={type.name}>
            <span className="type-symbol" aria-hidden="true">
              {type.name.slice(0, 1)}
            </span>
            <h3>{type.name}</h3>
            <p>{type.tone}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
