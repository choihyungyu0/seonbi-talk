import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { seonbiTypes, type SeonbiType } from '../features/seonbi-test/types'
import { loadTestResult } from '../lib/storage'

function newImage(fileName: string) {
  return encodeURI(`/images/new/${fileName}`)
}

interface SeonbiResultStat {
  label: string
  value: string
  icon: string
}

interface SeonbiResultReason {
  title: string
  text: string
  icon: string
}

interface SeonbiResultCategory {
  label: string
  icon: string
}

interface SeonbiResultData {
  type: SeonbiType
  title: string
  shortLabel: string
  badge: string
  subtitle: string
  description: string
  heroImage: string
  heroAlt: string
  saveButtonImage: string
  nextRoute: string
  stats: SeonbiResultStat[]
  aiReasons: SeonbiResultReason[]
  categories: SeonbiResultCategory[]
}

const themeThumbnails: Record<SeonbiType, string> = {
  toegye: newImage('image-Photoroom (53).png'),
  yulgok: newImage('f0eca584-0776-45f4-9af5-88044b7455f2.png'),
  cheosa: newImage('47fbed27-5eed-4a5f-9e6a-d5a3a1e5eaa5.png'),
  uguk: newImage('5e77728a-f6df-4983-8f1f-de6b0b51f47c.png'),
}

const seonbiResultDataByType: Record<SeonbiType, SeonbiResultData> = {
  toegye: {
    type: 'toegye',
    title: '퇴계형 선비',
    shortLabel: '퇴계형',
    badge: '선비 유형 콘텐츠',
    subtitle: '깊은 성찰과 배움으로 마음을 다스리는 선비',
    description:
      '고요한 마음으로 자신을 돌아보고, 끊임없는 배움을 통해 인격을 수양하는 퇴계형 선비입니다. 영주의 선비 문화 속에서 내면의 지혜를 키우고, 세상을 너그럽게 바라보며 조용히 길을 찾아가는 여정을 떠나보세요.',
    heroImage: newImage('image-Photoroom (53).png'),
    heroAlt: '서원에서 글을 쓰는 퇴계형 선비',
    saveButtonImage: newImage('image-Photoroom (42).png'),
    nextRoute: '/tour-3d?course=toegye',
    stats: [
      { label: '배움 포인트', value: '12,580P', icon: newImage('image-removebg-preview (50).png') },
      { label: '추천 코스', value: '8개', icon: newImage('image-removebg-preview (52).png') },
      { label: '체험 난이도', value: '보통', icon: newImage('image-removebg-preview (53).png') },
    ],
    aiReasons: [
      {
        title: '성찰과 배움',
        text: '깊은 성찰을 통해 자신을 돌아보고, 배움을 삶에 적용하며 마음을 다스립니다.',
        icon: newImage('image-removebg-preview (45).png'),
      },
      {
        title: '퇴계의 학문 정신',
        text: '퇴계 이황의 학문과 가르침을 따라 올바른 지식과 덕을 갖추는 삶을 지향합니다.',
        icon: newImage('image-removebg-preview (50).png'),
      },
      {
        title: '어울리는 장소',
        text: '소수서원에서 학문을 익히고, 선비촌에서 선비의 일상을 체험하며 마음을 비워보세요.',
        icon: newImage('image-removebg-preview (56).png'),
      },
      {
        title: '오늘의 추천 활동',
        text: '서원 문화 체험, 서원 탐방, 독서와 기록을 통해 내면의 성장을 경험해보세요.',
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
  },
  yulgok: {
    type: 'yulgok',
    title: '율곡형 선비',
    shortLabel: '율곡형',
    badge: '선비 유형 콘텐츠',
    subtitle: '현실을 읽고 계획을 세우는 실용형 선비',
    description:
      '생각을 실행으로 옮기고, 복잡한 문제를 차분히 정리하는 율곡형 선비입니다. 영주의 문화 거점과 생활 동선을 함께 살피며, 배움이 오늘의 선택과 행동으로 이어지는 실용적인 여정을 즐깁니다.',
    heroImage: newImage('f0eca584-0776-45f4-9af5-88044b7455f2.png'),
    heroAlt: '책을 들고 생각하는 율곡형 선비',
    saveButtonImage: newImage('image-Photoroom (42).png'),
    nextRoute: '/tour-3d?course=yulgok',
    stats: [
      { label: '실용 포인트', value: '11,940P', icon: newImage('image-removebg-preview (36).png') },
      { label: '추천 코스', value: '7개', icon: newImage('image-removebg-preview (49).png') },
      { label: '체험 난이도', value: '보통', icon: newImage('image-removebg-preview (63).png') },
    ],
    aiReasons: [
      {
        title: '계획과 실행',
        text: '목적지와 이동 동선을 먼저 정리하고, 필요한 정보를 빠르게 확인하는 여행 흐름과 잘 맞습니다.',
        icon: newImage('image-removebg-preview (36).png'),
      },
      {
        title: '율곡의 실천 정신',
        text: '배움을 현실에 적용하는 태도를 따라 문화 체험과 생활 거점을 균형 있게 연결합니다.',
        icon: newImage('image-removebg-preview (48).png'),
      },
      {
        title: '어울리는 장소',
        text: '선비세상과 풍기 권역, 소수서원을 연결해 배움과 실제 경험이 이어지도록 추천합니다.',
        icon: newImage('image-removebg-preview (46).png'),
      },
      {
        title: '오늘의 추천 활동',
        text: '동선 비교, 체험 예약 확인, 기록 정리를 통해 효율적인 선비길을 만들어보세요.',
        icon: newImage('image-Photoroom (56).png'),
      },
    ],
    categories: [
      { label: '실용 동선', icon: newImage('image-removebg-preview (49).png') },
      { label: '시장 탐방', icon: newImage('image-Photoroom - 2026-06-15T233226.301.png') },
      { label: '역사 이해', icon: newImage('image-Photoroom (46).png') },
      { label: '교통 거점', icon: newImage('d.png') },
      { label: '데이터 추천', icon: newImage('image-Photoroom (32).png') },
    ],
  },
  cheosa: {
    type: 'cheosa',
    title: '처사형 선비',
    shortLabel: '처사형',
    badge: '선비 유형 콘텐츠',
    subtitle: '자연 속에서 소박하게 뜻을 지키는 은둔형 선비',
    description:
      '자연을 벗 삼아 깊이 사색하고, 마음을 비우며 살아가는 선비입니다. 번잡한 세상을 벗어나 조용한 곳에서 스스로를 돌아보고, 소박한 삶 속에서 진정한 자유와 평안을 찾습니다. 느리게 걷고, 깊이 보고, 마음에 머무는 여행을 즐깁니다.',
    heroImage: newImage('image-Photoroom (27).png'),
    heroAlt: '자연 속 정자에서 사색하는 처사형 선비',
    saveButtonImage: newImage('image-Photoroom (42).png'),
    nextRoute: '/tour-3d?course=cheosa',
    stats: [
      { label: '자연 포인트', value: '10,860P', icon: newImage('image-removebg-preview (51).png') },
      { label: '추천 코스', value: '6개', icon: newImage('image-removebg-preview (52).png') },
      { label: '체험 난이도', value: '쉬움', icon: newImage('image-removebg-preview (53).png') },
    ],
    aiReasons: [
      {
        title: '자연과 사색',
        text: '숲과 물, 산과 바람이 있는 고요한 장소에서 마음을 비우고 깊은 사색을 떠나보세요.',
        icon: newImage('image-removebg-preview (54).png'),
      },
      {
        title: '처사의 삶',
        text: '욕심을 덜고 소박하게, 마음의 평안을 지키며 자연과 더불어 살아가는 지혜를 배웁니다.',
        icon: newImage('image-removebg-preview (55).png'),
      },
      {
        title: '어울리는 장소',
        text: '무섬마을, 부석사, 소수서원 등 조용하고 아름다운 자연과 고즈넉한 공간을 추천합니다.',
        icon: newImage('image-removebg-preview (56).png'),
      },
      {
        title: '오늘의 추천 활동',
        text: '느린 여행지 탐방, 차 한 잔의 여유, 글쓰기 등으로 마음의 평온을 경험해보세요.',
        icon: newImage('image-removebg-preview (47).png'),
      },
    ],
    categories: [
      { label: '자연 경관', icon: newImage('image-Photoroom (47).png') },
      { label: '고요한 길', icon: newImage('image-removebg-preview (52).png') },
      { label: '사색 명소', icon: newImage('image-removebg-preview (45).png') },
      { label: '전통 건축', icon: newImage('image-Photoroom (45).png') },
      { label: '느린 여행', icon: newImage('image-removebg-preview (63).png') },
    ],
  },
  uguk: {
    type: 'uguk',
    title: '우국형 선비',
    shortLabel: '우국형',
    badge: '선비 유형 콘텐츠',
    subtitle: '정의감과 책임감으로 길을 여는 실천형 선비',
    description:
      '공동체의 안녕과 옳은 선택을 중요하게 생각하는 우국형 선비입니다. 역사와 장소가 품은 이야기를 따라가며, 배움을 행동으로 옮기고 다음 사람을 위한 책임 있는 여행을 만들어갑니다.',
    heroImage: newImage('5e77728a-f6df-4983-8f1f-de6b0b51f47c.png'),
    heroAlt: '갑옷을 입고 깃발을 든 우국형 선비',
    saveButtonImage: newImage('image-Photoroom (42).png'),
    nextRoute: '/tour-3d?course=uguk',
    stats: [
      { label: '충의 포인트', value: '13,240P', icon: newImage('image-removebg-preview (62).png') },
      { label: '추천 코스', value: '7개', icon: newImage('image-removebg-preview (27).png') },
      { label: '체험 난이도', value: '보통', icon: newImage('image-removebg-preview (35).png') },
    ],
    aiReasons: [
      {
        title: '책임과 실천',
        text: '장소가 품은 역사적 의미를 확인하고, 오늘의 선택으로 연결하는 활동과 잘 맞습니다.',
        icon: newImage('image-removebg-preview (62).png'),
      },
      {
        title: '우국의 정신',
        text: '공동체를 생각하는 마음과 책임감을 중심으로 선비길의 역사적 맥락을 따라갑니다.',
        icon: newImage('image-removebg-preview (27).png'),
      },
      {
        title: '어울리는 장소',
        text: '소수서원, 선비세상, 무섬마을을 연결해 배움과 행동의 균형을 느낄 수 있습니다.',
        icon: newImage('image-removebg-preview (56).png'),
      },
      {
        title: '오늘의 추천 활동',
        text: '역사 해설 듣기, 공공데이터 기반 동선 확인, 기록 미션으로 여행의 의미를 남겨보세요.',
        icon: newImage('image-removebg-preview (70).png'),
      },
    ],
    categories: [
      { label: '충절 역사', icon: newImage('image-removebg-preview (62).png') },
      { label: '공동체', icon: newImage('image-Photoroom (21).png') },
      { label: '실천 미션', icon: newImage('image-Photoroom (24).png') },
      { label: '문화유산', icon: newImage('image-Photoroom (45).png') },
      { label: '기록 미션', icon: newImage('image-removebg-preview (70).png') },
    ],
  },
}

function isSeonbiType(value: string | undefined): value is SeonbiType {
  return seonbiTypes.includes(value as SeonbiType)
}

export function ResultPage() {
  const navigate = useNavigate()
  const { type: routeType } = useParams()
  const [courseStatusMessage, setCourseStatusMessage] = useState('')
  const result = loadTestResult()
  const pathSegments = window.location.pathname.split('/').filter(Boolean)
  const pathnameType = pathSegments[pathSegments.length - 1]
  const requestedType =
    isSeonbiType(routeType) ? routeType : isSeonbiType(pathnameType) ? pathnameType : null
  const selectedType = requestedType ?? result?.type ?? null
  const selectedResultData = selectedType ? seonbiResultDataByType[selectedType] : null
  const [isCourseSaved, setIsCourseSaved] = useState(() => {
    if (!selectedType) return false
    try {
      return window.localStorage.getItem(getCourseSavedKey(selectedType)) === 'true'
    } catch {
      return false
    }
  })

  if (!selectedResultData) {
    return <EmptyResultState />
  }

  const activeResultData = selectedResultData

  function startCourse() {
    navigate(activeResultData.nextRoute)
  }

  function saveCourse() {
    try {
      const nextSavedState = !isCourseSaved
      // TODO: Replace this local toggle with My Page course persistence when that API exists.
      window.localStorage.setItem(getCourseSavedKey(activeResultData.type), String(nextSavedState))
      setIsCourseSaved(nextSavedState)
      setCourseStatusMessage(
        nextSavedState
          ? `${activeResultData.shortLabel} 선비길 코스를 저장했습니다.`
          : '코스 저장을 해제했습니다.',
      )
    } catch {
      setCourseStatusMessage('코스 저장에 실패했습니다. 다시 시도해주세요.')
    }
  }

  return (
    <AppLayout hideChatbot hideBottomNavigation>
      <section className="seonbi-result-page" aria-labelledby="seonbi-result-title">
        <div className="seonbi-result-inner">
          <div className="seonbi-result-main-grid">
            <SeonbiResultHeroCard data={selectedResultData} />
            <SeonbiResultSummary data={selectedResultData} />
            <AiRecommendationExplanation data={selectedResultData} />
          </div>

          <div className="seonbi-result-bottom-grid">
            <SeonbiCategoryPanel data={selectedResultData} />
            <SeonbiResultActions
              data={selectedResultData}
              isCourseSaved={isCourseSaved}
              onSaveCourse={saveCourse}
              onStartCourse={startCourse}
            />
            <SeonbiThemeCollection
              activeType={selectedResultData.type}
              onSelectTheme={(type) => navigate(`/test/result/${type}`)}
            />
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

function getCourseSavedKey(type: SeonbiType) {
  return `yeongju-${type}-3d-course-saved`
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

function SeonbiResultHeroCard({ data }: { data: SeonbiResultData }) {
  return (
    <figure className="seonbi-result-hero-card" aria-label={`${data.title} 이미지`}>
      <img src={data.heroImage} alt={data.heroAlt} />
    </figure>
  )
}

function SeonbiResultSummary({ data }: { data: SeonbiResultData }) {
  return (
    <section className="seonbi-result-summary" aria-labelledby="seonbi-result-title">
      <span className="seonbi-result-badge">{data.badge}</span>
      <h1 id="seonbi-result-title">{data.title}</h1>
      <p className="seonbi-result-subtitle">{data.subtitle}</p>
      <p className="seonbi-result-description">{data.description}</p>

      <dl className="seonbi-result-stat-grid">
        {data.stats.map((stat) => (
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

function AiRecommendationExplanation({ data }: { data: SeonbiResultData }) {
  return (
    <aside className="seonbi-ai-panel" aria-labelledby="seonbi-ai-title">
      <h2 id="seonbi-ai-title">AI 추천 해설</h2>
      <div className="seonbi-ai-list">
        {data.aiReasons.map((reason) => (
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

function SeonbiCategoryPanel({ data }: { data: SeonbiResultData }) {
  return (
    <section className="seonbi-result-panel seonbi-category-panel" aria-labelledby="seonbi-category-title">
      <h2 id="seonbi-category-title">선비 카테고리</h2>
      <div className="seonbi-category-list">
        {data.categories.map((category) => (
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
  data: SeonbiResultData
  isCourseSaved: boolean
  onSaveCourse: () => void
  onStartCourse: () => void
}

function SeonbiResultActions({
  data,
  isCourseSaved,
  onSaveCourse,
  onStartCourse,
}: SeonbiResultActionsProps) {
  return (
    <section className="seonbi-result-actions" aria-label={`${data.shortLabel} 선비길 코스 실행`}>
      <button
        type="button"
        className="seonbi-start-button"
        onClick={onStartCourse}
        aria-label={`${data.shortLabel} 시작하기`}
      >
        <span>{data.shortLabel} 시작하기</span>
      </button>
      <button
        type="button"
        className="seonbi-save-button"
        onClick={onSaveCourse}
        aria-label={isCourseSaved ? `${data.shortLabel} 코스 저장 해제` : `${data.shortLabel} 코스 저장`}
        aria-pressed={isCourseSaved}
      >
        <img src={data.saveButtonImage} alt="" />
        <span className="seonbi-visually-hidden">코스 저장</span>
      </button>
    </section>
  )
}

interface SeonbiThemeCollectionProps {
  activeType: SeonbiType
  onSelectTheme: (type: SeonbiType) => void
}

function SeonbiThemeCollection({ activeType, onSelectTheme }: SeonbiThemeCollectionProps) {
  return (
    <section className="seonbi-result-panel seonbi-theme-panel" aria-labelledby="seonbi-theme-title">
      <h2 id="seonbi-theme-title">선비 테마 컬렉션</h2>
      <div className="seonbi-theme-list">
        {seonbiTypes.map((type) => {
          const theme = seonbiResultDataByType[type]
          const isActive = type === activeType
          return (
          <button
            type="button"
            className={isActive ? 'seonbi-theme-card is-active' : 'seonbi-theme-card'}
            key={theme.type}
            onClick={() => onSelectTheme(type)}
            aria-pressed={isActive}
          >
            <span className="seonbi-theme-image-wrap">
              <img src={themeThumbnails[type]} alt="" />
              {isActive && <b aria-hidden="true">✓</b>}
            </span>
            <strong>{theme.title}</strong>
          </button>
          )
        })}
      </div>
    </section>
  )
}
