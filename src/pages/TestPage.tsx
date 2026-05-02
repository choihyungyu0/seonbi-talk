import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CommonButton } from '../components/common/CommonButton'
import { StatusBadge } from '../components/common/StatusBadge'
import { AppLayout } from '../components/layout/AppLayout'
import type { TestQuestion } from '../features/seonbi-test/types'

const question: TestQuestion = {
  id: 'q-04',
  step: 4,
  total: 12,
  prompt: '여행 중 더 편안하게 느끼는 순간은 언제인가요?',
  options: ['조용히 사색하며 걷는 시간', '해야 할 일을 차근히 정리하는 시간'],
}

export function TestPage() {
  const [selected, setSelected] = useState('')
  const progress = (question.step / question.total) * 100

  return (
    <AppLayout>
      <section className="page-section page-container test-page">
        <div className="progress-row">
          <span>
            {question.step} / {question.total} 문항
          </span>
          <strong>{Math.round(progress)}% 완료</strong>
        </div>
        <div className="progress-track" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>

        <article className="question-card surface-card">
          <StatusBadge>선비유형 테스트</StatusBadge>
          <h1>{question.prompt}</h1>
          <div className="choice-list">
            {question.options.map((option, index) => (
              <button
                type="button"
                className={selected === option ? 'choice active' : 'choice'}
                key={option}
                onClick={() => setSelected(option)}
              >
                <span>{index === 0 ? 'A' : 'B'}</span>
                {option}
              </button>
            ))}
          </div>
        </article>

        <div className="page-actions spread">
          <CommonButton type="button" variant="secondary">
            이전
          </CommonButton>
          <Link className="common-button common-button--primary" to="/result">
            다음
          </Link>
        </div>
      </section>
    </AppLayout>
  )
}
