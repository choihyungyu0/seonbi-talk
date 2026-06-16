import { type ReactNode, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import {
  getStoredAuthUser,
  onAuthStateChange,
  type AuthUser,
} from '../features/auth/authApi'
import './MyPage.css'

export { MyPage } from './MySeonbiRecordsPage'

type ReflectionTag = '성찰' | '배움' | '차분함' | '수양'

interface OneLineRecord {
  id: number
  place: string
  date: string
  quote: string
  tags: ReflectionTag[]
}

interface OneLineStat {
  label: string
  value: string
  asset: string
}

const assets = {
  sidebarScenery: '9092f33e-babb-498e-a64e-e7519725f168.png',
  totalIcon: 'image-Photoroom (15).png',
  shareIcon: 'image-Photoroom (16).png',
  bookIcon: 'image-Photoroom (17).png',
  calendarIcon: 'image-Photoroom (18).png',
  placeIcon: 'image-Photoroom (13).png',
  badgeIcon: 'image-Photoroom (3).png',
  courseIcon: 'image-removebg-preview (26).png',
  printIcon: 'image-Photoroom (10).png',
  homeIcon: 'image-Photoroom (59).png',
  previewScroll: 'image-Photoroom (77).png',
  shareCardIcon: 'image-removebg-preview (72).png',
  writeIcon: 'image-Photoroom (57).png',
  evidenceIcon: 'image-Photoroom (32).png',
  recentEditIcon: 'image-removebg-preview (47).png',
}

const myOneLineData = {
  stats: [
    { label: '전체 기록', value: '5개', asset: assets.totalIcon },
    { label: '공유한 기록', value: '2개', asset: assets.shareIcon },
    { label: '대표 키워드', value: '성찰', asset: assets.bookIcon },
    { label: '최근 작성', value: '2025.05.12', asset: assets.calendarIcon },
  ] satisfies OneLineStat[],
  filters: ['전체', '성찰', '배움', '차분함', '수양'] as const,
  records: [
    {
      id: 1,
      place: '소수서원',
      date: '2025.05.12',
      quote: '배움은 오늘의 마음을 가다듬는 데서 시작된다.',
      tags: ['성찰', '배움', '차분함'],
    },
    {
      id: 2,
      place: '선비촌',
      date: '2025.05.10',
      quote: '배움은 책상 위에만 머무는 것이 아니라 일상의 태도 속에서도 이어진다.',
      tags: ['배움', '성찰', '수양'],
    },
    {
      id: 3,
      place: '부석사',
      date: '2025.05.08',
      quote: '고요한 풍경 속에서 마음이 천천히 비워졌다.',
      tags: ['차분함', '성찰', '수양'],
    },
    {
      id: 4,
      place: '무섬마을',
      date: '2025.05.05',
      quote: '느리게 걷는 길 위에서 오래 남는 생각을 만났다.',
      tags: ['성찰', '차분함'],
    },
    {
      id: 5,
      place: '선비의 한마디',
      date: '2025.05.03',
      quote: '오늘의 길은 나를 돌아보는 시간이 되었다.',
      tags: ['성찰', '배움', '수양'],
    },
  ] satisfies OneLineRecord[],
  selectedRecordId: 1,
  keywordFrequency: [
    { keyword: '성찰', count: 8 },
    { keyword: '배움', count: 6 },
    { keyword: '차분함', count: 4 },
    { keyword: '수양', count: 2 },
  ],
  typeRatios: [
    { keyword: '성찰', ratio: 40 },
    { keyword: '배움', ratio: 30 },
    { keyword: '차분함', ratio: 20 },
    { keyword: '수양', ratio: 10 },
  ],
}

const sidebarItems = [
  { label: '나의 선비길 기록', asset: assets.totalIcon, to: '/mypage/records', active: false },
  { label: '나의 한마디', asset: 'image-Photoroom (69).png', to: '/mypage/one-line', active: true },
  { label: '획득 배지', asset: assets.badgeIcon, to: '/mypage/badges', active: false },
  { label: '저장한 코스', asset: assets.courseIcon, to: '/mypage/saved-courses', active: false },
]

function imageAsset(fileName: string) {
  return encodeURI(`/images/new/${fileName}`)
}

export function MyOneLineArchivePage() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredAuthUser())
  const [shareMessage, setShareMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => onAuthStateChange(setUser), [])

  async function handleShareCard(source = '나의 한마디') {
    // TODO: Replace this fallback with a dedicated share-card creation route when it exists.
    const selectedRecord = myOneLineData.records.find(
      (record) => record.id === myOneLineData.selectedRecordId,
    )
    const shareText = selectedRecord
      ? `${source} - ${selectedRecord.place}: ${selectedRecord.quote}`
      : `${source} - 영주선비길에서 남긴 나의 한마디`

    try {
      if (navigator.share) {
        await navigator.share({
          title: '영주선비길 나의 한마디',
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

  function handleSoftDelete(place: string) {
    setShareMessage(`${place} 기록은 실제 삭제 화면이 연결되면 삭제할 수 있습니다.`)
  }

  if (!user) {
    return (
      <AppLayout hideChatbot>
        <section className="page-section page-container">
          <article className="surface-card empty-result-card protected-feature-card">
            <h1>로그인 후 마이페이지를 이용할 수 있습니다.</h1>
            <p>저장한 관심 코스와 최근 받은 선비의 한마디는 로그인한 사용자에게만 표시됩니다.</p>
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
    <AppLayout className="my-page-one-line-app" hideBottomNavigation hideChatbot>
      <MyPageLayout>
        <MyOneLinePage
          shareMessage={shareMessage}
          onDeleteRecord={handleSoftDelete}
          onEvidence={() => navigate('/ai-evidence-graph')}
          onHome={() => navigate('/')}
          onShareCard={(source) => void handleShareCard(source)}
          onWriteReflection={() => navigate('/judge')}
        />
      </MyPageLayout>
    </AppLayout>
  )
}

function MyPageLayout({ children }: { children: ReactNode }) {
  return (
    <section className="my-page-one-line" aria-labelledby="my-one-line-title">
      <div className="my-page-one-line-shell">
        <MyPageSidebar />
        <div className="my-page-one-line-main">{children}</div>
      </div>
    </section>
  )
}

function MyPageSidebar() {
  return (
    <aside className="my-one-line-sidebar" aria-label="마이페이지 메뉴">
      <img
        className="my-one-line-sidebar-art"
        src={imageAsset(assets.sidebarScenery)}
        alt=""
      />
      <div className="my-one-line-sidebar-inner">
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

function MyOneLinePage({
  shareMessage,
  onDeleteRecord,
  onEvidence,
  onHome,
  onShareCard,
  onWriteReflection,
}: {
  shareMessage: string
  onDeleteRecord: (place: string) => void
  onEvidence: () => void
  onHome: () => void
  onShareCard: (source?: string) => void
  onWriteReflection: () => void
}) {
  const selectedRecord =
    myOneLineData.records.find((record) => record.id === myOneLineData.selectedRecordId) ??
    myOneLineData.records[0]

  return (
    <>
      <MyOneLineHeader />
      <MyOneLineStatsRow />
      <section className="one-line-content-grid" aria-label="나의 한마디 기록 관리">
        <OneLineRecordList
          onDeleteRecord={onDeleteRecord}
          onShareCard={onShareCard}
          onWriteReflection={onWriteReflection}
        />
        <div className="one-line-right-column">
          <SelectedOneLinePreview
            record={selectedRecord}
            onPrint={() => onShareCard('인쇄용 보기')}
            onShareCard={onShareCard}
          />
          <OneLineStatisticsCard />
        </div>
      </section>
      <MyOneLineActionBar
        shareMessage={shareMessage}
        onEvidence={onEvidence}
        onHome={onHome}
        onShareCard={onShareCard}
        onWriteReflection={onWriteReflection}
      />
    </>
  )
}

function MyOneLineHeader() {
  return (
    <header className="my-one-line-header">
      <div>
        <span className="my-one-line-eyebrow">마이페이지</span>
        <h1 id="my-one-line-title">나의 한마디</h1>
        <p>여정 속에서 남긴 생각을 다시 읽고, 정리하고, 공유해보세요.</p>
      </div>
    </header>
  )
}

function MyOneLineStatsRow() {
  return (
    <section className="my-one-line-stats" aria-label="나의 한마디 요약">
      {myOneLineData.stats.map((stat) => (
        <article className="my-one-line-stat-card" key={stat.label}>
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

function OneLineRecordList({
  onDeleteRecord,
  onShareCard,
  onWriteReflection,
}: {
  onDeleteRecord: (place: string) => void
  onShareCard: (source?: string) => void
  onWriteReflection: () => void
}) {
  return (
    <article className="one-line-panel one-line-list-panel">
      <div className="one-line-panel-heading">
        <CardTitle>한마디 기록 목록</CardTitle>
        <label className="one-line-search">
          <span className="sr-only">기록 검색</span>
          <input type="search" placeholder="기록 검색" aria-label="기록 검색" />
        </label>
      </div>
      <div className="one-line-list-controls">
        <div className="one-line-filter-chips" aria-label="기록 필터">
          {myOneLineData.filters.map((filter) => (
            <button className={filter === '전체' ? 'is-active' : ''} key={filter} type="button">
              {filter}
            </button>
          ))}
        </div>
        <div className="one-line-sort-controls" aria-label="기록 정렬">
          <button type="button">최신순</button>
          <button type="button">장소별</button>
        </div>
      </div>
      <ol className="one-line-record-list">
        {myOneLineData.records.map((record) => (
          <OneLineRecordRow
            key={record.id}
            record={record}
            onDeleteRecord={onDeleteRecord}
            onShareCard={onShareCard}
            onWriteReflection={onWriteReflection}
          />
        ))}
      </ol>
    </article>
  )
}

function OneLineRecordRow({
  record,
  onDeleteRecord,
  onShareCard,
  onWriteReflection,
}: {
  record: OneLineRecord
  onDeleteRecord: (place: string) => void
  onShareCard: (source?: string) => void
  onWriteReflection: () => void
}) {
  return (
    <li className="one-line-record-row">
      <span className="one-line-row-number">{record.id}</span>
      <div className="one-line-place-block">
        <img src={imageAsset(assets.placeIcon)} alt="" />
        <span>
          <strong>{record.place}</strong>
          <small>{record.date}</small>
        </span>
      </div>
      <blockquote>{record.quote}</blockquote>
      <div className="one-line-row-tags">
        {record.tags.map((tag) => (
          <span className={`one-line-chip one-line-chip--${tag}`} key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <div className="one-line-row-actions">
        <button type="button" onClick={onWriteReflection}>
          자세히 보기
        </button>
        <button type="button" onClick={() => onShareCard(record.place)}>
          공유
        </button>
        <button type="button" onClick={onWriteReflection}>
          수정
        </button>
        <button className="is-danger" type="button" onClick={() => onDeleteRecord(record.place)}>
          삭제
        </button>
      </div>
    </li>
  )
}

function SelectedOneLinePreview({
  record,
  onPrint,
  onShareCard,
}: {
  record: OneLineRecord
  onPrint: () => void
  onShareCard: (source?: string) => void
}) {
  return (
    <article className="one-line-panel selected-one-line-preview">
      <CardTitle>선택한 한마디 미리보기</CardTitle>
      <div className="selected-preview-card">
        <div className="selected-preview-meta">
          <span>
            <img src={imageAsset(assets.placeIcon)} alt="" />
            {record.place}
          </span>
          <time>{record.date}</time>
        </div>
        <blockquote>
          배움은 오늘의 마음을
          <br />
          가다듬는 데서 시작된다.
        </blockquote>
        <div className="one-line-row-tags selected-preview-tags">
          {record.tags.map((tag) => (
            <span className={`one-line-chip one-line-chip--${tag}`} key={tag}>
              {tag}
            </span>
          ))}
        </div>
        <span className="seal-mark" aria-hidden="true">
          영주
        </span>
        <img
          className="selected-preview-illustration"
          src={imageAsset(assets.previewScroll)}
          alt=""
        />
        <div className="selected-preview-actions">
          <button
            className="one-line-button one-line-button--primary"
            type="button"
            onClick={() => onShareCard('공유 카드 만들기')}
          >
            <img src={imageAsset(assets.shareCardIcon)} alt="" />
            공유 카드 만들기
          </button>
          <button className="one-line-button one-line-button--secondary" type="button" onClick={onPrint}>
            <img src={imageAsset(assets.printIcon)} alt="" />
            인쇄용 보기
          </button>
        </div>
      </div>
    </article>
  )
}

function OneLineStatisticsCard() {
  const maxCount = Math.max(...myOneLineData.keywordFrequency.map((item) => item.count))

  return (
    <article className="one-line-panel one-line-statistics-card">
      <CardTitle>한마디 통계</CardTitle>
      <div className="one-line-mini-stats">
        <MiniStat asset={assets.bookIcon} label="가장 많이 나온 키워드" value="성찰" />
        <MiniStat asset={assets.placeIcon} label="장소별 기록" value="5곳" />
        <MiniStat asset={assets.shareIcon} label="공유 횟수" value="12회" />
        <MiniStat asset={assets.recentEditIcon} label="최근 수정" value="1회" />
      </div>
      <div className="one-line-chart-grid">
        <div className="keyword-chart" aria-label="키워드별 빈도">
          <h3>키워드별 빈도</h3>
          <div className="keyword-bars">
            {myOneLineData.keywordFrequency.map((item) => (
              <div className="keyword-bar-item" key={item.keyword}>
                <span>{item.count}회</span>
                <i style={{ height: `${Math.max(24, (item.count / maxCount) * 100)}%` }} />
                <strong>{item.keyword}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="type-donut" aria-label="기록 유형 비율">
          <h3>기록 유형 비율</h3>
          <div className="donut-visual">
            <span>
              총
              <strong>5개</strong>
            </span>
          </div>
          <div className="donut-legend">
            {myOneLineData.typeRatios.map((item) => (
              <span className={`legend-${item.keyword}`} key={item.keyword}>
                {item.keyword} {item.ratio}%
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

function MiniStat({
  asset,
  label,
  value,
}: {
  asset: string
  label: string
  value: string
}) {
  return (
    <div className="one-line-mini-stat">
      <img src={imageAsset(asset)} alt="" />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function MyOneLineActionBar({
  shareMessage,
  onEvidence,
  onHome,
  onShareCard,
  onWriteReflection,
}: {
  shareMessage: string
  onEvidence: () => void
  onHome: () => void
  onShareCard: (source?: string) => void
  onWriteReflection: () => void
}) {
  return (
    <footer className="my-one-line-action-bar" aria-label="나의 한마디 주요 액션">
      <button
        className="one-line-button one-line-button--primary action-primary"
        type="button"
        onClick={() => onShareCard('공유 카드 만들기')}
      >
        <img src={imageAsset(assets.shareCardIcon)} alt="" />
        공유 카드 만들기
      </button>
      <button className="one-line-button one-line-button--secondary" type="button" onClick={onWriteReflection}>
        <img src={imageAsset(assets.writeIcon)} alt="" />
        새 한마디 남기기
      </button>
      <button className="one-line-button one-line-button--secondary" type="button" onClick={onEvidence}>
        <img src={imageAsset(assets.evidenceIcon)} alt="" />
        AI 추천 근거 보기
      </button>
      <button className="one-line-button one-line-button--quiet" type="button" onClick={onHome}>
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
    <h2 className="one-line-card-title">
      <span aria-hidden="true">✤</span>
      {children}
    </h2>
  )
}
