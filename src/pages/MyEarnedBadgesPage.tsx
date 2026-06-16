import { type ReactNode, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import {
  getStoredAuthUser,
  onAuthStateChange,
  type AuthUser,
} from '../features/auth/authApi'
import './MyBadgeArchivePage.css'

export { MyPage } from './MySeonbiRecordsPage'

interface BadgeRecord {
  id: string
  name: string
  subtitle: string
  status: 'earned' | 'locked'
  asset: string
  selected?: boolean
}

interface BadgeGoal {
  name: string
  condition: string
  progress: string
  earned: number
  total: number
  asset: string
}

const assets = {
  sidebarScenery: '9092f33e-babb-498e-a64e-e7519725f168.png',
  headerLandscape: '17275d50-d105-4762-b2ab-b9cc7ca98b1c.png',
  recordIcon: 'image-Photoroom (15).png',
  reflectionIcon: 'image-Photoroom (2).png',
  badgeIcon: 'image-Photoroom (3).png',
  savedIcon: 'image-Photoroom (5).png',
  compass: 'image-Photoroom (56).png',
  shareIcon: 'image-Photoroom (16).png',
  homeIcon: 'image-Photoroom (59).png',
  evidenceIcon: 'image-Photoroom (32).png',
  summaryBadgeIcon: 'image-Photoroom - 2026-06-15T232113.489.png',
  summaryFlagIcon: 'image-Photoroom - 2026-06-15T232120.072.png',
  summaryRareIcon: 'image-removebg-preview (62).png',
  summaryTargetIcon: 'image-Photoroom - 2026-06-15T232132.531.png',
  lockIcon: 'image-removebg-preview (10).png',
  sosuBadge: 'image-removebg-preview (21).png',
  seonbichonBadge: 'image-Photoroom (73).png',
  buseoksaBadge: 'image-Photoroom (92).png',
  museomBadge: 'image-Photoroom (93).png',
  toegyeBadge: 'image-Photoroom (100).png',
  yulgokLockedBadge: 'image-removebg-preview (1).png',
  cheosaLockedBadge: 'image-removebg-preview (3).png',
  ugukLockedBadge: 'image-removebg-preview (5).png',
}

const badgeData = {
  stats: [
    { label: '획득 배지', value: '5개', asset: assets.summaryBadgeIcon },
    { label: '완주 배지', value: '1개', asset: assets.summaryFlagIcon },
    { label: '희귀 배지', value: '1개', asset: assets.summaryRareIcon },
    { label: '다음 목표', value: '1개', asset: assets.summaryTargetIcon },
  ],
  progress: {
    overall: 62,
    rows: [
      { label: '코스 배지', earned: 5, total: 8, asset: assets.badgeIcon },
      { label: '유형 배지', earned: 1, total: 4, asset: assets.summaryBadgeIcon },
      { label: '특별 배지', earned: 0, total: 3, asset: assets.summaryTargetIcon },
    ],
  },
  unlockGoals: [
    { name: '율곡형 탐구 배지', remaining: '남은 조건 1개', asset: assets.yulgokLockedBadge },
    { name: '처사형 자연 배지', remaining: '남은 조건 2개', asset: assets.cheosaLockedBadge },
    { name: '우국형 실천 배지', remaining: '남은 조건 2개', asset: assets.ugukLockedBadge },
  ],
  badges: [
    { id: 'sosu-learning', name: '소수서원', subtitle: '배움 배지', status: 'earned', asset: assets.sosuBadge },
    { id: 'seonbichon-life', name: '선비촌', subtitle: '생활 배지', status: 'earned', asset: assets.seonbichonBadge },
    { id: 'buseoksa-reflection', name: '부석사', subtitle: '사색 배지', status: 'earned', asset: assets.buseoksaBadge },
    { id: 'museom-slow-road', name: '무섬마을', subtitle: '고요한 길 배지', status: 'earned', asset: assets.museomBadge },
    { id: 'toegye-complete', name: '퇴계형', subtitle: '완주 배지', status: 'earned', asset: assets.toegyeBadge, selected: true },
    { id: 'yulgok-explore', name: '율곡형', subtitle: '탐구 배지', status: 'locked', asset: assets.yulgokLockedBadge },
    { id: 'cheosa-nature', name: '처사형', subtitle: '자연 배지', status: 'locked', asset: assets.cheosaLockedBadge },
    { id: 'uguk-practice', name: '우국형', subtitle: '실천 배지', status: 'locked', asset: assets.ugukLockedBadge },
  ] satisfies BadgeRecord[],
  selectedBadge: {
    name: '퇴계형 완주 배지',
    description:
      '영주선비길의 모든 코스를 완주하고, 선비의 정신을 온전히 체득한 이에게 수여되는 배지입니다.',
    earnedAt: '2025.05.12',
    condition: '전체 여정 완료',
    type: '퇴계형',
    asset: assets.toegyeBadge,
  },
  nextGoals: [
    { name: '율곡형 탐구 배지', condition: '영주 유교 유적지 6곳 방문', progress: '5 / 6', earned: 5, total: 6, asset: assets.yulgokLockedBadge },
    { name: '처사형 자연 배지', condition: '자연 명소 10곳 방문', progress: '6 / 10', earned: 6, total: 10, asset: assets.cheosaLockedBadge },
    { name: '우국형 실천 배지', condition: '선비 정신 실천 미션 5회 완료', progress: '3 / 5', earned: 3, total: 5, asset: assets.ugukLockedBadge },
  ] satisfies BadgeGoal[],
}

const sidebarItems = [
  { label: '나의 선비길 기록', asset: assets.recordIcon, to: '/mypage/records', active: false },
  { label: '나의 한마디', asset: assets.reflectionIcon, to: '/mypage/one-line', active: false },
  { label: '획득 배지', asset: assets.badgeIcon, to: '/mypage/badges', active: true },
  { label: '저장한 코스', asset: assets.savedIcon, to: '/mypage/saved-courses', active: false },
]

const badgeFilters = ['전체', '획득', '미획득', '완주', '희귀']

function imageAsset(fileName: string) {
  return encodeURI(`/images/new/${fileName}`)
}

export function MyEarnedBadgesPage() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredAuthUser())
  const [shareMessage, setShareMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => onAuthStateChange(setUser), [])

  async function handleShareBadge(source = '퇴계형 완주 배지') {
    const shareText = `${source} - 영주선비길 획득 배지 5개, 전체 달성률 62%`

    try {
      if (navigator.share) {
        await navigator.share({ title: '영주선비길 획득 배지', text: shareText })
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
            <p>획득 배지와 남은 배지 목표는 로그인한 사용자에게만 표시됩니다.</p>
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
    <AppLayout className="my-badges-app" hideBottomNavigation hideChatbot>
      <section className="my-badges" aria-labelledby="my-badges-title">
        <div className="my-badges-shell">
          <MyPageSidebar />
          <main className="my-badges-main">
            <MyBadgesHeader />
            <BadgeStatsRow />
            <section className="my-badges-dashboard" aria-label="획득 배지 대시보드">
              <BadgeProgressPanel />
              <BadgeGallery />
              <SelectedBadgeInfoPanel onShareBadge={(source) => void handleShareBadge(source)} />
            </section>
            <NextBadgeGoals />
            <MyBadgesActionBar
              shareMessage={shareMessage}
              onEvidence={() => navigate('/ai-evidence-graph')}
              onHome={() => navigate('/')}
              onRecommend={() => navigate('/course')}
              onShareBadge={(source) => void handleShareBadge(source)}
            />
          </main>
        </div>
      </section>
    </AppLayout>
  )
}

function MyPageSidebar() {
  return (
    <aside className="my-badges-sidebar" aria-label="마이페이지 메뉴">
      <img className="my-badges-sidebar-art" src={imageAsset(assets.sidebarScenery)} alt="" />
      <div className="my-badges-sidebar-inner">
        <h2>마이페이지</h2>
        <nav aria-label="마이페이지 세부 메뉴">
          {sidebarItems.map((item) => (
            <Link
              className={item.active ? 'is-active' : ''}
              key={item.label}
              to={item.to}
              aria-current={item.active ? 'page' : undefined}
            >
              <img src={imageAsset(item.asset)} alt="" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  )
}

function MyBadgesHeader() {
  return (
    <header className="my-badges-header">
      <div>
        <span className="my-badges-eyebrow">마이페이지</span>
        <h1 id="my-badges-title">획득 배지</h1>
        <p>여정에서 얻은 배지를 모아 보고, 아직 남은 배지도 확인해보세요.</p>
      </div>
    </header>
  )
}

function BadgeStatsRow() {
  return (
    <section className="my-badges-stats" aria-label="획득 배지 요약">
      {badgeData.stats.map((stat) => (
        <article className="my-badges-stat-card" key={stat.label}>
          <img src={imageAsset(stat.asset)} alt="" />
          <div>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        </article>
      ))}
    </section>
  )
}

function BadgeProgressPanel() {
  const { progress } = badgeData
  const circumference = 2 * Math.PI * 45
  const dashOffset = circumference * (1 - progress.overall / 100)

  return (
    <article className="my-badges-card badge-progress-panel">
      <CardTitle>배지 진행 현황</CardTitle>
      <div className="badge-progress-ring" aria-label={`전체 달성률 ${progress.overall}%`}>
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle className="progress-ring-track" cx="60" cy="60" r="45" />
          <circle
            className="progress-ring-value"
            cx="60"
            cy="60"
            r="45"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <span>전체 달성률</span>
        <strong>{progress.overall}%</strong>
      </div>
      <div className="badge-progress-rows">
        {progress.rows.map((row) => (
          <div className="badge-progress-row" key={row.label}>
            <img src={imageAsset(row.asset)} alt="" />
            <div>
              <span>{row.label}</span>
              <div className="badge-progress-track">
                <span style={{ width: `${(row.earned / row.total) * 100}%` }} />
              </div>
            </div>
            <strong>
              {row.earned} / {row.total}
            </strong>
          </div>
        ))}
      </div>
      <section className="unlock-goals" aria-label="다가오는 해금 목표">
        <h3>다가오는 해금 목표</h3>
        <div className="unlock-goal-list">
          {badgeData.unlockGoals.map((goal) => (
            <button className="unlock-goal-row" key={goal.name} type="button">
              <img src={imageAsset(goal.asset)} alt="" />
              <span>
                <strong>{goal.name}</strong>
                <small>{goal.remaining}</small>
              </span>
              <b aria-hidden="true">›</b>
            </button>
          ))}
        </div>
      </section>
    </article>
  )
}

function BadgeGallery() {
  return (
    <article className="my-badges-card badge-gallery-panel">
      <div className="badge-gallery-heading">
        <CardTitle>배지 보관함</CardTitle>
        <div className="badge-filter-chips" aria-label="배지 필터">
          {badgeFilters.map((filter) => (
            <button className={filter === '전체' ? 'is-active' : ''} key={filter} type="button">
              {filter}
            </button>
          ))}
        </div>
      </div>
      <ul className="badge-gallery-grid">
        {badgeData.badges.map((badge) => (
          <BadgeGalleryCard badge={badge} key={badge.id} />
        ))}
      </ul>
    </article>
  )
}

function BadgeGalleryCard({ badge }: { badge: BadgeRecord }) {
  return (
    <li
      className={[
        'badge-gallery-card',
        badge.status === 'locked' ? 'is-locked' : '',
        badge.selected ? 'is-selected' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="badge-image-frame">
        <img src={imageAsset(badge.asset)} alt="" />
        {badge.status === 'locked' && (
          <span className="badge-lock-mark" aria-hidden="true">
            <img src={imageAsset(assets.lockIcon)} alt="" />
          </span>
        )}
      </div>
      <strong>{badge.name}</strong>
      <span>{badge.subtitle}</span>
    </li>
  )
}

function SelectedBadgeInfoPanel({ onShareBadge }: { onShareBadge: (source?: string) => void }) {
  const badge = badgeData.selectedBadge

  return (
    <article className="my-badges-card selected-badge-panel">
      <CardTitle>선택한 배지 정보</CardTitle>
      <div className="selected-badge-preview">
        <img src={imageAsset(badge.asset)} alt="" />
      </div>
      <h2>{badge.name}</h2>
      <p>{badge.description}</p>
      <dl className="selected-badge-details">
        <div>
          <dt>획득일</dt>
          <dd>{badge.earnedAt}</dd>
        </div>
        <div>
          <dt>획득 조건</dt>
          <dd>{badge.condition}</dd>
        </div>
        <div>
          <dt>유형</dt>
          <dd>{badge.type}</dd>
        </div>
      </dl>
      <button
        className="badge-button badge-button--primary selected-share-button"
        type="button"
        onClick={() => onShareBadge(badge.name)}
      >
        <img src={imageAsset(assets.shareIcon)} alt="" />
        배지 공유하기
      </button>
    </article>
  )
}

function NextBadgeGoals() {
  return (
    <section className="my-badges-card next-badge-goals" aria-label="다음 목표 배지">
      <div className="next-goals-heading">
        <CardTitle>다음 목표 배지</CardTitle>
        <span aria-hidden="true">›</span>
      </div>
      <div className="next-goal-list">
        {badgeData.nextGoals.map((goal) => (
          <article className="next-goal-card" key={goal.name}>
            <img src={imageAsset(goal.asset)} alt="" />
            <div>
              <strong>{goal.name}</strong>
              <span>{goal.condition}</span>
              <div className="next-goal-progress">
                <span style={{ width: `${(goal.earned / goal.total) * 100}%` }} />
              </div>
            </div>
            <b>{goal.progress}</b>
          </article>
        ))}
      </div>
    </section>
  )
}

function MyBadgesActionBar({
  shareMessage,
  onEvidence,
  onHome,
  onRecommend,
  onShareBadge,
}: {
  shareMessage: string
  onEvidence: () => void
  onHome: () => void
  onRecommend: () => void
  onShareBadge: (source?: string) => void
}) {
  return (
    <footer className="my-badges-action-bar" aria-label="획득 배지 액션">
      <button
        className="badge-button badge-button--primary action-primary"
        type="button"
        onClick={() => onShareBadge('퇴계형 완주 배지')}
      >
        <img src={imageAsset(assets.shareIcon)} alt="" />
        배지 공유하기
      </button>
      <button className="badge-button badge-button--secondary" type="button" onClick={onRecommend}>
        <img src={imageAsset(assets.compass)} alt="" />
        새 코스 추천받기
      </button>
      <button className="badge-button badge-button--secondary" type="button" onClick={onEvidence}>
        <img src={imageAsset(assets.evidenceIcon)} alt="" />
        AI 추천 근거 보기
      </button>
      <button className="badge-button badge-button--quiet" type="button" onClick={onHome}>
        <img src={imageAsset(assets.homeIcon)} alt="" />
        홈으로 돌아가기
      </button>
      <p className={shareMessage ? 'share-status is-visible' : 'share-status'} role="status">
        {shareMessage}
      </p>
    </footer>
  )
}

function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="badge-card-title">
      <span aria-hidden="true">◇</span>
      {children}
      <span aria-hidden="true">◇</span>
    </h2>
  )
}
