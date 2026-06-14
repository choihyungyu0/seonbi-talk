import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { seonbiQuestions } from '../features/seonbi-test/questions'
import { calculateTestResult } from '../features/seonbi-test/scoring'
import type { AnswerOption } from '../features/seonbi-test/types'
import { saveTestResult } from '../lib/storage'

const optionLabels = ['A', 'B', 'C', 'D']
const testBadgeImage = '/images/stay/image-Photoroom (8).png'
const progressMedallionImage = '/images/stay/image-Photoroom (5).png'
const optionIllustrations = [
  '/images/stay/image-Photoroom (3).png',
  '/images/stay/image-Photoroom (4).png',
  '/images/stay/image-Photoroom (6).png',
  '/images/stay/image-Photoroom (7).png',
]

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
    console.debug('[seonbi-test] result calculated', {
      type: result.type,
      scores: result.scores,
    })
    saveTestResult(result)
    navigate('/result')
  }

  return (
    <AppLayout className="test-app-shell" hideChatbot hideBottomNavigation>
      <section className="test-page">
        <span className="test-side-ornament" aria-hidden="true" />
        <div className="test-progress-shell">
          <div className="progress-row">
            <span>
              {currentStep} / {seonbiQuestions.length} 문항
            </span>
            <strong>{Math.round(progress)}% 완료</strong>
          </div>
          <div className="progress-track" aria-hidden="true">
            <span className="test-progress-fill" style={{ width: `${progress}%` }} />
            <img
              className="test-progress-medallion"
              src={progressMedallionImage}
              alt=""
              style={{ left: `${progress}%` }}
            />
          </div>
        </div>

        <article className="question-card test-question-card" aria-labelledby="test-question-title">
          <img className="test-type-badge" src={testBadgeImage} alt="선비유형 테스트" />
          <h1 id="test-question-title">{question.prompt}</h1>
          <div className="test-title-divider" aria-hidden="true" />
          <div className="choice-list">
            {question.options.map((option, index) => (
              <button
                type="button"
                className={selectedAnswer?.id === option.id ? 'choice active' : 'choice'}
                key={option.id}
                onClick={() => selectAnswer(option)}
                aria-pressed={selectedAnswer?.id === option.id}
              >
                <span className="test-choice-label">{optionLabels[index]}</span>
                <span className="test-choice-text">{option.label}</span>
                <img
                  className="test-choice-illustration"
                  src={optionIllustrations[index]}
                  alt=""
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </article>

        <div className="page-actions spread test-page-actions">
          <button
            type="button"
            className="test-nav-button test-nav-button--previous"
            disabled={currentIndex === 0}
            onClick={goPrevious}
          >
            <span className="test-nav-chevron test-nav-chevron--left" aria-hidden="true" />
            이전
          </button>
          <button
            type="button"
            className="test-nav-button test-nav-button--next"
            disabled={!selectedAnswer}
            onClick={goNext}
          >
            {isLastQuestion ? '결과 보기' : '다음'}
            <span className="test-nav-chevron test-nav-chevron--right" aria-hidden="true" />
          </button>
        </div>
      </section>
    </AppLayout>
  )
}
