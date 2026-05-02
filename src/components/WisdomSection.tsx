export function WisdomSection() {
  return (
    <section className="section wisdom-section" id="선비-한마디">
      <div className="wisdom-visual" aria-hidden="true">
        <span>書</span>
      </div>
      <div className="wisdom-panel">
        <p className="eyebrow">KOREAN TRADITIONAL WISDOM</p>
        <h2>선비의 한마디</h2>
        <label htmlFor="wisdom-input">지금 어떤 생각을 하고 계신가요?</label>
        <textarea
          id="wisdom-input"
          placeholder="한마디 생성 기능은 연동 후 사용할 수 있습니다."
          aria-describedby="wisdom-help"
        />
        <button className="button button-primary" type="button">
          공공데이터 조회 후 사용
        </button>
        <p id="wisdom-help" className="helper-text">
          입력 내용은 현재 저장하거나 전송하지 않습니다.
        </p>
      </div>
    </section>
  )
}
