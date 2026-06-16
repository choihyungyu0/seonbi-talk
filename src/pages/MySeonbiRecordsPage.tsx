import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import {
  getStoredAuthUser,
  onAuthStateChange,
  type AuthUser,
} from '../features/auth/authApi'
import './MyPage.css'

type ReflectionTag = '성찰' | '배움' | '차분함' | '수양'

interface StatCard {
  label: string
  value: string
  icon: string
}

interface ReflectionRecord {
  id: number
  place: string
  date: string
  quote: string
  tags: ReflectionTag[]
  icon: string
}

interface BadgeRecord {
  name: string
  type: string
  icon: string
  featured?: boolean
}

interface NextAction {
  title: string
  description: string
  icon: string
  onClick: () => void
}

const assets = {
  sidebarScenery: '9092f33e-babb-498e-a64e-e7519725f168.png',
  routeMap: '5f559915-e454-4bd4-a077-d0f1d7204bd2.png',
  scholar: 'image-removebg-preview (19).png',
  statJourney: 'image-Photoroom (15).png',
  statReflection: 'image-Photoroom (2).png',
  statBadge: 'image-Photoroom (3).png',
  statType: 'image-removebg-preview (29).png',
  sidebarReflection: 'image-Photoroom (69).png',
  sidebarCourse: 'image-removebg-preview (26).png',
  placeSosu: 'image-Photoroom (20).png',
  placeSeonbi: 'image-Photoroom (75).png',
  placeBuseok: 'image-Photoroom (76).png',
  placeMuseom: 'image-Photoroom (16).png',
  placeScroll: 'image-Photoroom (99).png',
  external: 'image-removebg-preview (46).png',
  edit: 'image-removebg-preview (50).png',
  badgeSosu: 'image-removebg-preview (21).png',
  badgeSeonbi: 'image-removebg-preview (56).png',
  badgeBuseok: 'image-removebg-preview (68).png',
  badgeMuseom: 'image-removebg-preview (52).png',
  badgeToegye: 'image-removebg-preview.png',
  shareCard: 'image-removebg-preview (20).png',
  compass: 'image-removebg-preview (49).png',
  write: 'image-removebg-preview (70).png',
  evidence: 'image-Photoroom (32).png',
  home: 'image-Photoroom (59).png',
}

const summaryCards: StatCard[] = [
  { label: '완료한 여정', value: '1개', icon: assets.statJourney },
  { label: '남긴 한마디', value: '5개', icon: assets.statReflection },
  { label: '획득 배지', value: '5개', icon: assets.statBadge },
  { label: '대표 유형', value: '퇴계형', icon: assets.statType },
]

const sidebarItems = [
  { label: '나의 선비길 기록', icon: assets.statJourney, to: '/mypage/records', active: true },
  { label: '나의 한마디', icon: assets.sidebarReflection, to: '/mypage/one-line', active: false },
  { label: '획득 배지', icon: assets.statBadge, to: '/mypage/badges', active: false },
  { label: '저장한 코스', icon: assets.sidebarCourse, to: '/mypage/saved-courses', active: false },
]

const journeyStops = [
  { place: '소수서원', x: 24, y: 20 },
  { place: '선비촌', x: 34, y: 36 },
  { place: '부석사', x: 50, y: 54 },
  { place: '무섬마을', x: 66, y: 70 },
  { place: '선비의 한마디', x: 78, y: 84 },
]

const reflections: ReflectionRecord[] = [
  {
    id: 1,
    place: '소수서원',
    date: '2025.XX.XX',
    quote: '배움은 오늘의 마음을 가다듬는 데서 시작된다.',
    tags: ['배움', '성찰'],
    icon: assets.placeSosu,
  },
  {
    id: 2,
    place: '선비촌',
    date: '2025.XX.XX',
    quote: '배움은 책상 위에만 머무는 것이 아니라 일상의 태도 속에서도 이어진다.',
    tags: ['배움', '수양'],
    icon: assets.placeSeonbi,
  },
  {
    id: 3,
    place: '부석사',
    date: '2025.XX.XX',
    quote: '고요한 풍경 속에서 마음이 천천히 비워졌다.',
    tags: ['차분함', '성찰'],
    icon: assets.placeBuseok,
  },
  {
    id: 4,
    place: '무섬마을',
    date: '2025.XX.XX',
    quote: '느리게 걷는 길 위에서 오래 남는 생각을 만났다.',
    tags: ['차분함', '수양'],
    icon: assets.placeMuseom,
  },
  {
    id: 5,
    place: '선비의 한마디',
    date: '2025.XX.XX',
    quote: '오늘의 길은 나를 돌아보는 시간이 되었다.',
    tags: ['성찰', '수양'],
    icon: assets.placeScroll,
  },
]

const earnedBadges: BadgeRecord[] = [
  { name: '소수서원', type: '배움 배지', icon: assets.badgeSosu },
  { name: '선비촌', type: '생활 배지', icon: assets.badgeSeonbi },
  { name: '부석사', type: '사색 배지', icon: assets.badgeBuseok },
  { name: '무섬마을', type: '고요한 길 배지', icon: assets.badgeMuseom },
  { name: '퇴계형', type: '완주 배지', icon: assets.badgeToegye, featured: true },
]

const filters: ReflectionTag[] = ['성찰', '배움', '차분함', '수양']

function imageAsset(fileName: string) {
  return encodeURI(`/images/new/${fileName}`)
}

export function MyPage() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredAuthUser())
  const [shareMessage, setShareMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => onAuthStateChange(setUser), [])

  async function handleShareCard() {
    const shareText =
      '영주선비길 나의 기록 - 퇴계형 선비길을 완주하고 5개의 한마디를 남겼습니다.'

    try {
      if (navigator.share) {
        await navigator.share({
          title: '영주선비길 나의 선비길 기록',
          text: shareText,
        })
        setShareMessage('공유 창을 열었습니다.')
        return
      }

      await navigator.clipboard?.writeText(shareText)
      setShareMessage('공유 문구를 복사했습니다.')
    } catch {
      setShareMessage('공유 기능을 사용할 수 없습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  if (!user) {
    return (
      <AppLayout hideChatbot>
        <section className="page-section page-container">
          <article className="surface-card empty-result-card protected-feature-card">
            <h1>로그인 후 마이페이지를 이용할 수 있습니다.</h1>
            <p>완료한 여정과 남긴 한마디는 로그인한 사용자에게만 표시됩니다.</p>
            <div className="page-actions center">
              <Link className="common-button common-button--primary" to="/login">
                로그인하기
              </Link>
              <Link className="common-button common-button--secondary" to="/signup">
                회원가입하기
              </Link>
            </div>
          </article>
        </section>
      </AppLayout>
    )
  }

  return (
    <AppLayout className="my-page-records-app" hideBottomNavigation hideChatbot>
      <section className="my-page-records" aria-labelledby="my-page-records-title">
        <div className="my-page-records-shell">
          <MyPageSidebar />
          <div className="my-page-records-main">
            <PageHeader />
            <SummaryCards />
            <div className="my-records-dashboard">
              <CompletedJourneyCard />
              <ReflectionList onShareCard={() => void handleShareCard()} />
              <AnalysisCard />
              <BadgeArchive />
              <NextActions
                onShareCard={() => void handleShareCard()}
                onRecommend={() => navigate('/course')}
                onWrite={() => navigate('/mission-complete')}
              />
            </div>
            <ActionBar
              shareMessage={shareMessage}
              onShareCard={() => void handleShareCard()}
              onRecommend={() => navigate('/course')}
              onEvidence={() => navigate('/ai-evidence-graph')}
              onHome={() => navigate('/')}
            />
          </div>
        </div>
      </section>
    </AppLayout>
  )
}

function MyPageSidebar() {
  return (
    <aside className="my-records-sidebar" aria-label="마이페이지 메뉴">
      <img
        className="my-records-sidebar-art"
        src={imageAsset(assets.sidebarScenery)}
        alt=""
      />
      <div className="my-records-sidebar-inner">
        <h2>마이페이지</h2>
        <nav>
          {sidebarItems.map((item) => (
            <Link
              className={item.active ? 'is-active' : undefined}
              key={item.label}
              to={item.to}
              aria-current={item.active ? 'page' : undefined}
            >
              <img src={imageAsset(item.icon)} alt="" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  )
}

function PageHeader() {
  return (
    <header className="my-records-header">
      <div>
        <span className="my-records-eyebrow">마이페이지</span>
        <h1 id="my-page-records-title">나의 선비길 기록</h1>
        <p>완료한 여정과 남긴 한마디를 다시 확인하고 관리해보세요.</p>
      </div>
    </header>
  )
}

function SummaryCards() {
  return (
    <section className="my-records-summary" aria-label="나의 기록 요약">
      {summaryCards.map((card) => (
        <article className="my-records-stat-card" key={card.label}>
          <img src={imageAsset(card.icon)} alt="" />
          <div>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </div>
        </article>
      ))}
    </section>
  )
}

function CompletedJourneyCard() {
  return (
    <article className="records-panel completed-journey-card">
      <h2>
        <span aria-hidden="true">◇</span>
        완료한 여정
      </h2>
      <div className="completed-journey-body">
        <div>
          <div className="completed-journey-heading">
            <h3>퇴계형 선비길</h3>
            <span>완주 완료</span>
          </div>
          <div className="route-map-frame">
            <img className="route-map-image" src={imageAsset(assets.routeMap)} alt="" />
            <ol className="route-stop-list" aria-label="완료한 코스 순서">
              {journeyStops.map((stop, index) => (
                <li
                  key={stop.place}
                  style={
                    {
                      '--stop-x': `${stop.x}%`,
                      '--stop-y': `${stop.y}%`,
                    } as Record<string, string>
                  }
                >
                  <span>{index + 1}</span>
                  <strong>{stop.place}</strong>
                </li>
              ))}
            </ol>
          </div>
        </div>
        <dl className="journey-meta">
          <div>
            <dt>진행</dt>
            <dd>5 / 5 완료</dd>
          </div>
          <div>
            <dt>완료일</dt>
            <dd>2025.XX.XX</dd>
          </div>
          <div>
            <dt>방문 장소</dt>
            <dd>5곳</dd>
          </div>
          <div>
            <dt>남긴 한마디</dt>
            <dd>5개</dd>
          </div>
          <div>
            <dt>획득 배지</dt>
            <dd>5개</dd>
          </div>
        </dl>
      </div>
      <div className="completed-course-actions">
        <Link to="/mission-complete">리포트 다시 보기</Link>
        <Link to="/tour-3d">코스 다시 보기</Link>
      </div>
    </article>
  )
}

function ReflectionList({ onShareCard }: { onShareCard: () => void }) {
  return (
    <article className="records-panel reflection-list-card">
      <div className="records-panel-heading">
        <h2>
          <span aria-hidden="true">✧</span>
          나의 한마디 기록
        </h2>
        <label className="record-search">
          <span className="sr-only">기록 검색</span>
          <input type="search" placeholder="기록 검색" />
        </label>
      </div>
      <div className="reflection-filter-row" aria-label="기록 필터">
        <button className="is-active" type="button">
          전체
        </button>
        {filters.map((filter) => (
          <button key={filter} type="button">
            {filter}
          </button>
        ))}
      </div>
      <ol className="reflection-record-list">
        {reflections.map((record) => (
          <li key={record.id}>
            <span className="record-number">{record.id}</span>
            <div className="record-place">
              <img src={imageAsset(record.icon)} alt="" />
              <span>
                <strong>{record.place}</strong>
                <small>{record.date}</small>
              </span>
            </div>
            <p>{record.quote}</p>
            <div className="record-tags">
              {record.tags.map((tag) => (
                <span className={`tag-chip tag-chip--${tag}`} key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            <div className="record-actions">
              <button type="button">자세히 보기</button>
              <button type="button" onClick={onShareCard} aria-label={`${record.place} 공유`}>
                <img src={imageAsset(assets.external)} alt="" />
              </button>
              <button type="button" aria-label={`${record.place} 수정`}>
                <img src={imageAsset(assets.edit)} alt="" />
              </button>
            </div>
          </li>
        ))}
      </ol>
    </article>
  )
}

function AnalysisCard() {
  return (
    <article className="records-panel ai-analysis-card">
      <h2>
        <span aria-hidden="true">✧</span>
        AI 기록 분석
      </h2>
      <div className="analysis-profile">
        <div>
          <span>대표 유형</span>
          <strong>퇴계형 선비</strong>
          <div className="record-tags">
            {filters.map((tag) => (
              <span className={`tag-chip tag-chip--${tag}`} key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
        <img src={imageAsset(assets.scholar)} alt="" />
      </div>
      <div className="analysis-chart-row">
        <div className="radar-chart" aria-label="성찰 92, 배움 88, 차분함 85, 소통 72">
          <span className="radar-label radar-label--top">
            성찰
            <br />
            92
          </span>
          <span className="radar-label radar-label--right">
            배움
            <br />
            88
          </span>
          <span className="radar-label radar-label--bottom">
            차분함
            <br />
            85
          </span>
          <span className="radar-label radar-label--left">
            소통
            <br />
            72
          </span>
          <i />
        </div>
        <p>저장된 기록은 조용한 배움과 자기 성찰의 흐름이 강하게 나타납니다.</p>
      </div>
      <Link className="analysis-evidence-button" to="/ai-evidence-graph">
        AI 추천 근거 보기
      </Link>
    </article>
  )
}

function BadgeArchive() {
  return (
    <article className="records-panel badge-archive-card">
      <div className="records-panel-heading">
        <h2>
          <span aria-hidden="true">◇</span>
          획득 배지 보관함
        </h2>
        <button type="button">배지 전체 보기</button>
      </div>
      <ul className="earned-badge-list">
        {earnedBadges.map((badge) => (
          <li className={badge.featured ? 'is-featured' : undefined} key={badge.name}>
            <img src={imageAsset(badge.icon)} alt="" />
            <strong>{badge.name}</strong>
            <span>{badge.type}</span>
          </li>
        ))}
      </ul>
    </article>
  )
}

function NextActions({
  onShareCard,
  onRecommend,
  onWrite,
}: {
  onShareCard: () => void
  onRecommend: () => void
  onWrite: () => void
}) {
  const actions: NextAction[] = [
    {
      title: '공유 카드 만들기',
      description: '나의 기록을 카드로 만들어 공유해보세요.',
      icon: assets.shareCard,
      onClick: onShareCard,
    },
    {
      title: '새 코스 추천받기',
      description: 'AI가 추천하는 새로운 선비길을 만나보세요.',
      icon: assets.compass,
      onClick: onRecommend,
    },
    {
      title: '한마디 더 남기기',
      description: '더 많은 기록으로 나만의 여정을 채워보세요.',
      icon: assets.write,
      onClick: onWrite,
    },
  ]

  return (
    <article className="records-panel next-actions-card">
      <h2>
        <span aria-hidden="true">◇</span>
        다음 행동
      </h2>
      <div className="next-action-list">
        {actions.map((action) => (
          <button key={action.title} type="button" onClick={action.onClick}>
            <img src={imageAsset(action.icon)} alt="" />
            <span>
              <strong>{action.title}</strong>
              <small>{action.description}</small>
            </span>
          </button>
        ))}
      </div>
    </article>
  )
}

function ActionBar({
  shareMessage,
  onShareCard,
  onRecommend,
  onEvidence,
  onHome,
}: {
  shareMessage: string
  onShareCard: () => void
  onRecommend: () => void
  onEvidence: () => void
  onHome: () => void
}) {
  return (
    <div className="my-records-action-bar">
      <p className={`share-status ${shareMessage ? 'is-visible' : ''}`} role="status">
        {shareMessage}
      </p>
      <button className="action-primary" type="button" onClick={onShareCard}>
        <img src={imageAsset(assets.shareCard)} alt="" />
        공유 카드 만들기
      </button>
      <button type="button" onClick={onRecommend}>
        <img src={imageAsset(assets.compass)} alt="" />
        새 코스 추천받기
      </button>
      <button type="button" onClick={onEvidence}>
        <img src={imageAsset(assets.evidence)} alt="" />
        AI 추천 근거 보기
      </button>
      <button type="button" onClick={onHome}>
        <img src={imageAsset(assets.home)} alt="" />
        홈으로 돌아가기
      </button>
    </div>
  )
}
