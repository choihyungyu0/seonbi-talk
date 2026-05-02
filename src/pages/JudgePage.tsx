import { useState } from 'react'
import { CommonButton } from '../components/common/CommonButton'
import { StatusBadge } from '../components/common/StatusBadge'
import { AppLayout } from '../components/layout/AppLayout'

export function JudgePage() {
  const [text, setText] = useState('')

  return (
    <AppLayout>
      <section className="page-section page-container judge-page">
        <div className="section-heading center">
          <StatusBadge>선비의 한마디</StatusBadge>
          <h1>선비의 한마디</h1>
          <p>실제 AI API 연결은 다음 단계에서 진행합니다.</p>
        </div>
        <div className="judge-grid">
          <div className="wisdom-visual" aria-hidden="true">
            書
          </div>
          <form className="surface-card judge-form">
            <label htmlFor="judge-text">지금 어떤 생각을 하고 계신가요?</label>
            <textarea
              id="judge-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="오늘의 생각을 적어보세요."
            />
            <CommonButton type="button" disabled={!text.trim()}>
              한마디 받아보기
            </CommonButton>
          </form>
        </div>
        <section className="surface-card judge-result" aria-label="결과 영역">
          <h2>선비의 한마디</h2>
          <p>문장을 입력하면 선비의 한마디가 표시됩니다.</p>
          <h3>현대어 해석</h3>
          <p>문장을 입력하면 선비의 한마디가 표시됩니다.</p>
          <h3>공유용 문구</h3>
          <p>문장을 입력하면 선비의 한마디가 표시됩니다.</p>
        </section>
      </section>
    </AppLayout>
  )
}
