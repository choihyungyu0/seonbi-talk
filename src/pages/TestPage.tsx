import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CommonButton } from '../components/common/CommonButton'
import { StatusBadge } from '../components/common/StatusBadge'
import { AppLayout } from '../components/layout/AppLayout'
import { seonbiQuestions } from '../features/seonbi-test/questions'
import { calculateTestResult } from '../features/seonbi-test/scoring'
import type { AnswerOption } from '../features/seonbi-test/types'
import { saveTestResult } from '../lib/storage'

const optionLabels = ['A', 'B', 'C', 'D']

export function TestPage() {
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, AnswerOption>>({})
  const question = seonbiQuestions[currentIndex]
  const selectedAnswer = answers[question.id]
  const currentStep = currentIndex + 1
  const isLastQuestion = currentStep === seonbiQuestions.length
  const progress = (currentStep / seonbiQuestions.length) * 100

  function selectAnswer(answer: AnswerOption) {
    setAnswers((current) => ({
      ...current,
      [question.id]: answer,
    }))
  }

  function goPrevious() {
    setCurrentIndex((index) => Math.max(index - 1, 0))
  }

  function goNext() {
    if (!selectedAnswer) return
    if (!isLastQuestion) {
      setCurrentIndex((index) => Math.min(index + 1, seonbiQuestions.length - 1))
      return
    }

    const orderedAnswers = seonbiQuestions
      .map((item) => answers[item.id])
      .filter((answer): answer is AnswerOption => Boolean(answer))

    if (orderedAnswers.length !== seonbiQuestions.length) return

    const result = calculateTestResult(orderedAnswers)
    saveTestResult(result)
    navigate('/result')
  }

  return (
    <AppLayout>
      <section className="page-section page-container test-page">
        <div className="progress-row">
          <span>
            {currentStep} / {seonbiQuestions.length} 문항
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
                className={selectedAnswer?.id === option.id ? 'choice active' : 'choice'}
                key={option.id}
                onClick={() => selectAnswer(option)}
              >
                <span>{optionLabels[index]}</span>
                {option.label}
              </button>
            ))}
          </div>
        </article>

        <div className="page-actions spread">
          <CommonButton
            type="button"
            variant="secondary"
            disabled={currentIndex === 0}
            onClick={goPrevious}
          >
            이전
          </CommonButton>
          <CommonButton type="button" disabled={!selectedAnswer} onClick={goNext}>
            {isLastQuestion ? '결과 보기' : '다음'}
          </CommonButton>
        </div>
      </section>
    </AppLayout>
  )
}
