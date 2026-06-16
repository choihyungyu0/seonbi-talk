import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CommonButton } from '../components/common/CommonButton'
import { AppLayout } from '../components/layout/AppLayout'
import { ResultCard } from '../components/result/ResultCard'
import { ShareResultButton } from '../components/result/ShareResultButton'
import { seonbiTypeInfo } from '../data/seonbiTypes'
import { seonbiTypes, type SeonbiType } from '../features/seonbi-test/types'
import { saveResultImage } from '../features/result/saveResultImage'
import { loadTestResult } from '../lib/storage'

const toegyeCourseSavedKey = 'yeongju-toegye-3d-course-saved'

function newImage(fileName: string) {
  return encodeURI(`/images/new/${fileName}`)
}

const seonbiResultData = {
  type: 'toegye',
  title: '퇴계형 선비',
  badge: '선비 유형 콘텐츠',
  subtitle: '깊은 성찰과 배움으로 마음을 다스리는 선비',
  description:
    '고요한 마음으로 자신을 돌아보고, 끊임없는 배움을 통해 인격을 수양하는 퇴계형 선비입니다. 영주의 선비 문화 속에서 내면의 지혜를 키우고, 세상을 너그럽게 바라보며 조용히 길을 찾아가는 여정을 떠나보세요.',
  heroImage: newImage('image-Photoroom (27).png'),
  saveButtonImage: newImage('image-Photoroom (42).png'),
  stats: [
    {
      label: '배움 포인트',
      value: '12,580P',
      icon: newImage('image-removebg-preview (48).png'),
    },
    {
      label: '추천 코스',
      value: '8개',
      icon: newImage('image-removebg-preview (49).png'),
    },
    {
      label: '체험 난이도',
      value: '보통',
      icon: newImage('image-removebg-preview (53).png'),
    },
  ],
  aiReasons: [
    {
      title: '성찰과 배움',
      text: '깊은 성찰을 통해 자신을 돌아보고, 배움을 삶에 적용하여 마음을 다스립니다.',
      icon: newImage('image-removebg-preview (45).png'),
    },
    {
      title: '퇴계의 학문 정신',
      text: '퇴계 이황의 학문과 가르침을 따라 올바른 지식과 덕을 갖추는 삶을 지향합니다.',
      icon: newImage('image-removebg-preview (50).png'),
    },
    {
      title: '어울리는 장소',
      text: '소수서원에서 학문을 익히고, 선비촌에서 선비의 일상을 체험하며, 부석사에서 마음을 비워보세요.',
      icon: newImage('image-removebg-preview (56).png'),
    },
    {
      title: '오늘의 추천 활동',
      text: '선비 문화 체험, 서원 탐방, 독서와 기록을 통해 내면의 성장을 경험해보세요.',
      icon: newImage('image-removebg-preview (47).png'),
    },
  ],
  categories: [
    { label: '유교 문화', icon: newImage('image-Photoroom (44).png') },
    { label: '전통 건축', icon: newImage('image-Photoroom (45).png') },
    { label: '역사 인물', icon: newImage('image-Photoroom (46).png') },
    { label: '자연 경관', icon: newImage('image-Photoroom (47).png') },
    { label: '전통 체험', icon: newImage('image-Photoroom (48).png') },
  ],
  themes: [
    {
      type: 'toegye',
      label: '퇴계형 선비',
      thumbnail: newImage('image-Photoroom (53).png'),
      active: true,
    },
    {
      type: 'yulgok',
      label: '율곡형 선비',
      thumbnail: newImage('f0eca584-0776-45f4-9af5-88044b7455f2.png'),
      active: false,
    },
    {
      type: 'cheosa',
      label: '처사형 선비',
      thumbnail: newImage('47fbed27-5eed-4a5f-9e6a-d5a3a1e5eaa5.png'),
      active: false,
    },
    {
      type: 'uguk',
      label: '우국형 선비',
      thumbnail: newImage('5e77728a-f6df-4983-8f1f-de6b0b51f47c.png'),
      active: false,
    },
  ],
} as const

function isSeonbiType(value: string | undefined): value is SeonbiType {
  return seonbiTypes.includes(value as SeonbiType)
}

export function ResultPage() {
  const cardRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const { type: routeType } = useParams()
  const [isSavingImage, setIsSavingImage] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [courseStatusMessage, setCourseStatusMessage] = useState('')
  const [isCourseSaved, setIsCourseSaved] = useState(() => {
    try {
      return window.localStorage.getItem(toegyeCourseSavedKey) === 'true'
    } catch {
      return false
    }
  })
  const result = loadTestResult()
  const requestedType = isSeonbiType(routeType) ? routeType : null
  const shouldShowToegyeResult = requestedType === 'toegye' || result?.type === 'toegye'

  if (!result && !shouldShowToegyeResult) {
    return <EmptyResultState />
  }

  function startToegyeCourse() {
    navigate('/tour-3d')
  }

  function saveToegyeCourse() {
    try {
      const nextSavedState = !isCourseSaved
      // TODO: Replace this local toggle with My Page course persistence when that API exists.
      window.localStorage.setItem(toegyeCourseSavedKey, String(nextSavedState))
      setIsCourseSaved(nextSavedState)
      setCourseStatusMessage(nextSavedState ? '퇴계형 선비길 코스를 저장했습니다.' : '코스 저장을 해제했습니다.')
    } catch {
      setCourseStatusMessage('코스 저장에 실패했습니다. 다시 시도해주세요.')
    }
  }

  function showThemePendingMessage(themeLabel: string) {
    // TODO: Route these cards to premium result detail pages when the other type screens are implemented.
    setCourseStatusMessage(`${themeLabel} 결과 화면은 준비 중입니다.`)
  }

  async function handleSaveImage() {
    if (!cardRef.current) return

    setIsSavingImage(true)
    setStatusMessage('')

    try {
      await saveResultImage(cardRef.current)
      setStatusMessage('결과 이미지를 저장했습니다.')
    } catch {
      setStatusMessage('이미지 저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSavingImage(false)
    }
  }

  if (shouldShowToegyeResult) {
    return (
      <AppLayout hideChatbot hideBottomNavigation>
        <section className="seonbi-result-page" aria-labelledby="seonbi-result-title">
          <div className="seonbi-result-inner">
            <div className="seonbi-result-main-grid">
              <SeonbiResultHeroCard />
              <SeonbiResultSummary />
              <AiRecommendationExplanation />
            </div>

            <div className="seonbi-result-bottom-grid">
              <SeonbiCategoryPanel />
              <SeonbiResultActions
                isCourseSaved={isCourseSaved}
                onSaveCourse={saveToegyeCourse}
                onStartCourse={startToegyeCourse}
              />
              <SeonbiThemeCollection onThemePending={showThemePendingMessage} />
            </div>

            {courseStatusMessage && (
              <p className="seonbi-result-status" role="status">
                {courseStatusMessage}
              </p>
            )}
          </div>
        </section>
      </AppLayout>
    )
  }

  if (!result) {
    return <EmptyResultState />
  }

  const typeInfo = seonbiTypeInfo[result.type]

  return (
    <AppLayout hideChatbot hideBottomNavigation>
      <section className="page-section page-container result-page">
        <div className="section-heading center">
          <p className="section-kicker">선비유형 결과</p>
          <h1>당신의 선비 기질은...</h1>
        </div>
        <div className="result-card-capture" ref={cardRef}>
          <ResultCard typeInfo={typeInfo} result={result} />
        </div>
        <div className="page-actions center">
          <Link className="common-button common-button--primary" to="/course">
            영주 추천 코스 보기
          </Link>
          <CommonButton
            type="button"
            variant="secondary"
            disabled={isSavingImage}
            isLoading={isSavingImage}
            loadingLabel="이미지 저장 중..."
            onClick={handleSaveImage}
          >
            결과 이미지 저장
          </CommonButton>
          <ShareResultButton
            typeInfo={typeInfo}
            disabled={isSavingImage}
            onStatusChange={setStatusMessage}
          />
        </div>
        {statusMessage && (
          <p className="disabled-notice result-notice" role="status">
            {statusMessage}
          </p>
        )}
      </section>
    </AppLayout>
  )
}

function EmptyResultState() {
  return (
    <AppLayout hideChatbot hideBottomNavigation>
      <section className="page-section page-container result-page">
        <article className="surface-card empty-result-card">
          <h1>아직 선비유형 테스트 결과가 없습니다.</h1>
          <p>테스트를 먼저 진행해주세요.</p>
          <Link className="common-button common-button--primary" to="/test">
            선비유형 테스트 시작하기
          </Link>
        </article>
      </section>
    </AppLayout>
  )
}

function SeonbiResultHeroCard() {
  return (
    <figure className="seonbi-result-hero-card" aria-label="퇴계형 선비 이미지">
      <img src={seonbiResultData.heroImage} alt="서원 정원에서 글을 쓰며 성찰하는 퇴계형 선비" />
    </figure>
  )
}

function SeonbiResultSummary() {
  return (
    <section className="seonbi-result-summary" aria-labelledby="seonbi-result-title">
      <span className="seonbi-result-badge">{seonbiResultData.badge}</span>
      <h1 id="seonbi-result-title">{seonbiResultData.title}</h1>
      <p className="seonbi-result-subtitle">{seonbiResultData.subtitle}</p>
      <p className="seonbi-result-description">{seonbiResultData.description}</p>

      <dl className="seonbi-result-stat-grid">
        {seonbiResultData.stats.map((stat) => (
          <div className="seonbi-result-stat-card" key={stat.label}>
            <dt>
              <img src={stat.icon} alt="" />
              {stat.label}
            </dt>
            <dd>{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

function AiRecommendationExplanation() {
  return (
    <aside className="seonbi-ai-panel" aria-labelledby="seonbi-ai-title">
      <h2 id="seonbi-ai-title">AI 추천 해설</h2>
      <div className="seonbi-ai-list">
        {seonbiResultData.aiReasons.map((reason) => (
          <article className="seonbi-ai-row" key={reason.title}>
            <img src={reason.icon} alt="" />
            <div>
              <h3>{reason.title}</h3>
              <p>{reason.text}</p>
            </div>
          </article>
        ))}
      </div>
    </aside>
  )
}

function SeonbiCategoryPanel() {
  return (
    <section className="seonbi-result-panel seonbi-category-panel" aria-labelledby="seonbi-category-title">
      <h2 id="seonbi-category-title">선비 카테고리</h2>
      <div className="seonbi-category-list">
        {seonbiResultData.categories.map((category) => (
          <div className="seonbi-category-item" key={category.label}>
            <span>
              <img src={category.icon} alt="" />
            </span>
            <strong>{category.label}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

interface SeonbiResultActionsProps {
  isCourseSaved: boolean
  onSaveCourse: () => void
  onStartCourse: () => void
}

function SeonbiResultActions({
  isCourseSaved,
  onSaveCourse,
  onStartCourse,
}: SeonbiResultActionsProps) {
  return (
    <section className="seonbi-result-actions" aria-label="퇴계형 선비길 코스 실행">
      <button
        type="button"
        className="seonbi-start-button"
        onClick={onStartCourse}
        aria-label="퇴계형 시작하기"
      >
        <span>퇴계형 시작하기</span>
      </button>
      <button
        type="button"
        className="seonbi-save-button"
        onClick={onSaveCourse}
        aria-label={isCourseSaved ? '퇴계형 코스 저장 해제' : '퇴계형 코스 저장'}
        aria-pressed={isCourseSaved}
      >
        <img src={seonbiResultData.saveButtonImage} alt="" />
        <span className="seonbi-visually-hidden">코스 저장</span>
      </button>
    </section>
  )
}

interface SeonbiThemeCollectionProps {
  onThemePending: (themeLabel: string) => void
}

function SeonbiThemeCollection({ onThemePending }: SeonbiThemeCollectionProps) {
  return (
    <section className="seonbi-result-panel seonbi-theme-panel" aria-labelledby="seonbi-theme-title">
      <h2 id="seonbi-theme-title">선비 테마 컬렉션</h2>
      <div className="seonbi-theme-list">
        {seonbiResultData.themes.map((theme) => (
          <button
            type="button"
            className={theme.active ? 'seonbi-theme-card is-active' : 'seonbi-theme-card'}
            key={theme.type}
            onClick={() => {
              if (!theme.active) onThemePending(theme.label)
            }}
            aria-pressed={theme.active}
          >
            <span className="seonbi-theme-image-wrap">
              <img src={theme.thumbnail} alt="" />
              {theme.active && <b aria-hidden="true">✓</b>}
            </span>
            <strong>{theme.label}</strong>
          </button>
        ))}
      </div>
    </section>
  )
}
