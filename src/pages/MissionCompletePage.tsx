import type { CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import './MissionCompletePage.css'

const completedSteps = [
  '소수서원',
  '선비촌',
  '부석사',
  '무섬마을',
  '선비의 한마디',
] as const

const journeyReportData = {
  courseType: '퇴계형',
  title: '퇴계형 선비길 여정 완료 리포트',
  subtitle: '영주의 선비길을 따라 남긴 배움과 기록을 확인해보세요.',
  completion: '5 / 5 완료',
  completedSteps,
  stats: [
    {
      label: '방문 장소',
      value: '5곳',
      asset: '1 (2).png',
      alt: '소수서원 건물 아이콘',
    },
    {
      label: '완료 미션',
      value: '5개',
      asset: 'image-Photoroom (17).png',
      alt: '완료한 두루마리 아이콘',
    },
    {
      label: '남긴 한마디',
      value: '5개',
      asset: 'image-Photoroom (2).png',
      alt: '한마디 말풍선 아이콘',
    },
    {
      label: '획득 배지',
      value: '5개',
      asset: 'image-Photoroom (100).png',
      alt: '획득 배지 아이콘',
    },
  ],
  routeSummary: [
    { label: '총 이동', value: '4시간 20분', asset: 'image-Photoroom - 2026-06-15T233215.021.png' },
    { label: '완료 기록', value: '5개', asset: 'image-Photoroom (17).png' },
    { label: '추천 신뢰도', value: '92%', asset: 'image-Photoroom (70).png' },
  ],
  reflections: [
    {
      place: '소수서원',
      quote: '배움은 오늘의 마음을 가다듬는 데서 시작된다.',
      asset: '1 (2).png',
    },
    {
      place: '선비촌',
      quote: '배움은 책상 위에만 머무는 것이 아니라 일상의 태도 속에서도 이어진다.',
      asset: 'image-removebg-preview (84).png',
    },
    {
      place: '부석사',
      quote: '고요한 풍경 속에서 마음이 천천히 비워졌다.',
      asset: '1 (5).png',
    },
    {
      place: '무섬마을',
      quote: '느리게 걷는 길 위에서 오래 남는 생각을 만났다.',
      asset: '1 (3).png',
    },
    {
      place: '선비의 한마디',
      quote: '오늘의 길은 나를 돌아보는 시간이 되었다.',
      asset: '1 (6).png',
    },
  ],
  aiAnalysis: {
    finalType: '퇴계형 선비',
    chips: ['성찰', '배움', '차분함', '수양'],
    description:
      '이번 여정은 조용한 공간에서 배움과 성찰을 쌓아가는 퇴계형 선비의 흐름과 잘 맞습니다. 기록의 대부분이 자기 수양과 마음 정리에 가까운 키워드를 담고 있습니다.',
    scores: [
      { label: '성찰', value: 92 },
      { label: '배움', value: 88 },
      { label: '차분함', value: 85 },
      { label: '소통', value: 72 },
    ],
  },
  badges: [
    { label: '소수서원\n배움 배지', asset: 'b (2).png' },
    { label: '선비촌\n생활 배지', asset: '1 (4).png' },
    { label: '부석사\n사색 배지', asset: '1 (5).png' },
    { label: '무섬마을\n고요한 길 배지', asset: '1 (3).png' },
    { label: '퇴계형\n완주 배지', asset: 'image-Photoroom (100).png', featured: true },
  ],
  nextRecommendation: {
    title: '처사형 자연 사색 코스도 둘러보세요.',
    body: '이번 여정에서 자연과 사색 키워드가 높게 나타났습니다.',
    thumbnail: 'image-removebg-preview (84).png',
  },
}

const routeStops = [
  { label: '1. 소수서원', x: 16, y: 26 },
  { label: '2. 선비촌', x: 55, y: 35 },
  { label: '3. 부석사', x: 26, y: 58 },
  { label: '4. 무섬마을', x: 60, y: 72 },
  { label: '5. 선비의 한마디', x: 42, y: 88 },
]

function imageAsset(fileName: string) {
  return encodeURI(`/images/new/${fileName}`)
}

export function MissionCompletePage() {
  const navigate = useNavigate()

  async function handleShareCard() {
    // TODO: Connect this to a dedicated share-card creation route when that screen exists.
    const shareText = `${journeyReportData.title} - ${journeyReportData.completion}`

    try {
      if (navigator.share) {
        await navigator.share({
          title: journeyReportData.title,
          text: shareText,
        })
        return
      }

      await navigator.clipboard?.writeText(shareText)
    } catch {
      // Sharing is optional; the report actions should stay stable if the browser blocks it.
    }
  }

  return (
    <AppLayout hideBottomNavigation hideChatbot>
      <section className="mission-complete-page" aria-labelledby="journey-report-title">
        <div className="journey-report-inner">
          <JourneyCompletionHeader />
          <CompletionStatsRow />
          <section className="journey-report-main" aria-label="여정 완료 리포트 대시보드">
            <CompletedCourseMapCard />
            <JourneyReflectionTimelineCard />
            <AiJourneyAnalysisCard />
          </section>
          <section className="journey-report-bottom" aria-label="획득 배지와 다음 추천">
            <EarnedBadgesCard />
            <NextRecommendationCard onRecommend={() => navigate('/course')} />
          </section>
          <JourneyReportActionBar
            onArchive={() => navigate('/mypage')}
            onShareCard={() => void handleShareCard()}
            onEvidence={() => navigate('/ai-evidence-graph')}
            onHome={() => navigate('/')}
          />
        </div>
      </section>
    </AppLayout>
  )
}

function JourneyCompletionHeader() {
  return (
    <header className="journey-report-header">
      <img
        className="journey-report-status-image"
        src={imageAsset('image-Photoroom (85).png')}
        alt="여정 완료"
      />
      <h1 id="journey-report-title">{journeyReportData.title}</h1>
      <p>{journeyReportData.subtitle}</p>
      <strong>{journeyReportData.completion}</strong>
      <CompletedProgressStepper />
    </header>
  )
}

function CompletedProgressStepper() {
  return (
    <ol className="journey-report-stepper" aria-label="완료한 코스 단계">
      {journeyReportData.completedSteps.map((step, index) => (
        <li key={step} className={index === journeyReportData.completedSteps.length - 1 ? 'is-final' : ''}>
          <span className="journey-report-step-marker" aria-hidden="true">
            <span>✓</span>
          </span>
          <span className="journey-report-step-label">
            {index + 1}. {step}
          </span>
        </li>
      ))}
    </ol>
  )
}

function CompletionStatsRow() {
  return (
    <section className="journey-report-stats" aria-label="여정 완료 요약">
      {journeyReportData.stats.map((stat) => (
        <article className="journey-report-stat-card" key={stat.label}>
          <img src={imageAsset(stat.asset)} alt={stat.alt} />
          <div>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        </article>
      ))}
    </section>
  )
}

function CompletedCourseMapCard() {
  return (
    <article className="journey-card journey-course-map-card">
      <CardTitle>완료 코스 지도</CardTitle>
      <div className="journey-map-stage">
        <img
          className="journey-map-art"
          src={imageAsset('5f559915-e454-4bd4-a077-d0f1d7204bd2.png')}
          alt=""
        />
        <img
          className="journey-map-temple journey-map-temple--sosu"
          src={imageAsset('1 (2).png')}
          alt=""
        />
        <img
          className="journey-map-temple journey-map-temple--village"
          src={imageAsset('image-removebg-preview (84).png')}
          alt=""
        />
        <svg className="journey-map-route" viewBox="0 0 100 100" aria-hidden="true">
          <path d="M17 29 C24 50 44 24 55 35 S49 58 28 58 S39 78 60 72 S52 91 42 88" />
        </svg>
        {routeStops.map((stop) => (
          <div
            className="journey-map-stop"
            key={stop.label}
            style={{ '--stop-x': `${stop.x}%`, '--stop-y': `${stop.y}%` } as CSSProperties}
          >
            <span aria-hidden="true">✓</span>
            <strong>{stop.label}</strong>
          </div>
        ))}
        <div className="journey-map-controls" aria-hidden="true">
          <span>+</span>
          <span>−</span>
          <span>⌖</span>
        </div>
        <div className="journey-map-ribbon">퇴계형 코스 완료</div>
        <dl className="journey-route-summary">
          {journeyReportData.routeSummary.map((item) => (
            <div key={item.label}>
              <dt>
                <img src={imageAsset(item.asset)} alt="" />
                {item.label}
              </dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </article>
  )
}

function JourneyReflectionTimelineCard() {
  return (
    <article className="journey-card journey-timeline-card">
      <CardTitle>나의 선비길 기록</CardTitle>
      <ol className="journey-reflection-list">
        {journeyReportData.reflections.map((reflection, index) => (
          <li key={reflection.place}>
            <span className="journey-reflection-number">{index + 1}</span>
            <img src={imageAsset(reflection.asset)} alt="" />
            <div>
              <strong>{reflection.place}</strong>
              <p>“{reflection.quote}”</p>
            </div>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="journey-detail-button"
        onClick={() => {
          window.location.hash = 'journey-records'
        }}
      >
        기록 자세히 보기
        <span aria-hidden="true">›</span>
      </button>
      <img
        className="journey-timeline-scroll"
        src={imageAsset('image-Photoroom (77).png')}
        alt=""
      />
    </article>
  )
}

function AiJourneyAnalysisCard() {
  return (
    <aside className="journey-card journey-ai-card">
      <CardTitle>AI가 분석한 나의 여정</CardTitle>
      <div className="journey-ai-top">
        <img
          className="journey-ai-scholar"
          src={imageAsset('image-Photoroom (71).png')}
          alt=""
        />
        <div className="journey-ai-copy">
          <span>최종 유형</span>
          <strong>{journeyReportData.aiAnalysis.finalType}</strong>
          <div className="journey-ai-chips" aria-label="AI 분석 키워드">
            {journeyReportData.aiAnalysis.chips.map((chip) => (
              <em key={chip}>{chip}</em>
            ))}
          </div>
        </div>
      </div>
      <p>{journeyReportData.aiAnalysis.description}</p>
      <RadarScoreChart />
    </aside>
  )
}

function RadarScoreChart() {
  return (
    <div className="journey-radar" aria-label="여정 성향 점수">
      <svg viewBox="0 0 220 166" role="img" aria-labelledby="journey-radar-title">
        <title id="journey-radar-title">성찰 92, 배움 88, 차분함 85, 소통 72</title>
        <g className="journey-radar-grid">
          <polygon points="110,18 176,83 110,148 44,83" />
          <polygon points="110,38 156,83 110,128 64,83" />
          <polygon points="110,58 136,83 110,108 84,83" />
          <line x1="110" y1="18" x2="110" y2="148" />
          <line x1="44" y1="83" x2="176" y2="83" />
          <line x1="110" y1="18" x2="176" y2="83" />
          <line x1="110" y1="18" x2="44" y2="83" />
        </g>
        <polygon className="journey-radar-shape" points="110,23 169,83 110,138 58,83" />
        <g className="journey-radar-points">
          <circle cx="110" cy="23" r="4" />
          <circle cx="169" cy="83" r="4" />
          <circle cx="110" cy="138" r="4" />
          <circle cx="58" cy="83" r="4" />
        </g>
      </svg>
      <div className="journey-radar-label journey-radar-label--top">
        <span>성찰</span>
        <strong>92</strong>
      </div>
      <div className="journey-radar-label journey-radar-label--right">
        <span>배움</span>
        <strong>88</strong>
      </div>
      <div className="journey-radar-label journey-radar-label--bottom">
        <span>차분함</span>
        <strong>85</strong>
      </div>
      <div className="journey-radar-label journey-radar-label--left">
        <span>소통</span>
        <strong>72</strong>
      </div>
    </div>
  )
}

function EarnedBadgesCard() {
  return (
    <article className="journey-card journey-badges-card">
      <CardTitle>획득 배지</CardTitle>
      <ul className="journey-badge-list">
        {journeyReportData.badges.map((badge) => (
          <li key={badge.label} className={badge.featured ? 'is-featured' : ''}>
            <img src={imageAsset(badge.asset)} alt="" />
            <span>{badge.label}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

function NextRecommendationCard({ onRecommend }: { onRecommend: () => void }) {
  return (
    <article className="journey-card journey-next-card">
      <CardTitle>다음 추천</CardTitle>
      <img
        className="journey-next-thumb"
        src={imageAsset(journeyReportData.nextRecommendation.thumbnail)}
        alt=""
      />
      <div>
        <h2>{journeyReportData.nextRecommendation.title}</h2>
        <p>{journeyReportData.nextRecommendation.body}</p>
        <AssetButton
          label="새 코스 추천받기"
          asset="image-Photoroom (79).png"
          className="journey-next-button"
          onClick={onRecommend}
        />
      </div>
    </article>
  )
}

function JourneyReportActionBar({
  onArchive,
  onShareCard,
  onEvidence,
  onHome,
}: {
  onArchive: () => void
  onShareCard: () => void
  onEvidence: () => void
  onHome: () => void
}) {
  return (
    <footer className="journey-report-action-bar" aria-label="여정 완료 액션">
      <AssetButton
        label="나의 기록 보관하기"
        asset="image-Photoroom (81).png"
        className="journey-action-primary"
        onClick={onArchive}
      />
      <AssetButton
        label="공유 카드 만들기"
        asset="image-Photoroom (82).png"
        onClick={onShareCard}
      />
      <AssetButton
        label="AI 추천 근거 보기"
        asset="image-Photoroom (83).png"
        onClick={onEvidence}
      />
      <AssetButton
        label="홈으로 돌아가기"
        asset="image-Photoroom (84).png"
        className="journey-action-home"
        onClick={onHome}
      />
    </footer>
  )
}

function AssetButton({
  label,
  asset,
  className = '',
  onClick,
}: {
  label: string
  asset: string
  className?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className={['journey-asset-button', className].filter(Boolean).join(' ')}
      onClick={onClick}
    >
      <img src={imageAsset(asset)} alt="" />
      <span>{label}</span>
    </button>
  )
}

function CardTitle({ children }: { children: string }) {
  return (
    <h2 className="journey-card-title">
      <span aria-hidden="true">✤</span>
      {children}
      <span aria-hidden="true">✤</span>
    </h2>
  )
}
