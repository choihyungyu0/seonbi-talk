import { type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import {
  getStoredAuthUser,
  onAuthStateChange,
  type AuthUser,
} from '../features/auth/authApi'
import './MySavedCoursesPage.css'

type CourseStatus = '완주' | '저장' | '추천'

interface SavedCourse {
  id: string
  name: string
  status: CourseStatus
  subtitle: string
  places: string
  records?: string
  badges?: string
  expectedTime?: string
  distance: string
  difficulty: string
  completedAt?: string
  theme?: string
  thumbnail: string
  selected?: boolean
  actions: Array<'리포트 보기' | '코스 다시 보기' | '코스 보기' | '저장 해제' | '저장하기'>
}

interface SavedCourseStat {
  label: string
  value: string
  asset: string
}

interface CourseComparison {
  name: string
  score: number
}

interface RecentCourse {
  title: string
  theme: string
  meta: string
  thumbnail: string
}

interface QuickAction {
  title: string
  description: string
  asset: string
  onClick: () => void
}

const assets = {
  sidebarScenery: '9092f33e-babb-498e-a64e-e7519725f168.png',
  headerLandscape: '17275d50-d105-4762-b2ab-b9cc7ca98b1c.png',
  pageLandscape: '5f559915-e454-4bd4-a077-d0f1d7204bd2.png',
  routeMap: '17275d50-d105-4762-b2ab-b9cc7ca98b1c.png',
  natureThumbnail: '9092f33e-babb-498e-a64e-e7519725f168.png',
  hanokThumbnail: 'image-removebg-preview (84).png',
  sosuThumbnail: '1 (2).png',
  scholar: 'image-removebg-preview (19).png',
  recordIcon: 'image-Photoroom (15).png',
  reflectionIcon: 'image-Photoroom (69).png',
  badgeIcon: 'image-Photoroom (3).png',
  savedIcon: 'image-removebg-preview (26).png',
  completedIcon: 'image-removebg-preview (27).png',
  pendingIcon: 'image-removebg-preview (28).png',
  typeIcon: 'image-removebg-preview (29).png',
  reportIcon: 'image-Photoroom (24).png',
  mapIcon: 'image-Photoroom (89).png',
  compassIcon: 'image-Photoroom (56).png',
  evidenceIcon: 'image-Photoroom (32).png',
  homeIcon: 'image-Photoroom (59).png',
  timeIcon: 'image-removebg-preview (15).png',
  personIcon: 'image-removebg-preview (16).png',
  placeIcon: 'image-removebg-preview (17).png',
  flagIcon: 'image-removebg-preview (11).png',
  manageIcon: 'image-removebg-preview (12).png',
  bookIcon: 'image-removebg-preview (48).png',
  bookmarkLineIcon: 'image-removebg-preview (73).png',
}

const mySavedCoursesData = {
  stats: [
    { label: '저장한 코스', value: '3개', asset: assets.savedIcon },
    { label: '완주한 코스', value: '1개', asset: assets.completedIcon },
    { label: '추천 대기', value: '2개', asset: assets.pendingIcon },
    { label: '대표 유형', value: '퇴계형', asset: assets.typeIcon },
  ] satisfies SavedCourseStat[],
  filters: ['전체', '저장', '완주', '추천', '최근 본'],
  courses: [
    {
      id: 'toegye-seonbi-road',
      name: '퇴계형 선비길',
      status: '완주',
      subtitle: '배움과 성찰의 여정',
      places: '5곳',
      records: '5개',
      badges: '5개',
      distance: '18.6km',
      difficulty: '보통',
      completedAt: '2025.05.10',
      thumbnail: assets.routeMap,
      actions: ['리포트 보기', '코스 다시 보기'],
    },
    {
      id: 'cheosa-nature-reflection',
      name: '처사형 자연 사색 코스',
      status: '저장',
      subtitle: '자연 속에서 느리게 걷는 사색 코스',
      places: '4곳',
      expectedTime: '3시간',
      distance: '12.4km',
      difficulty: '쉬움',
      theme: '자연·사색',
      thumbnail: assets.natureThumbnail,
      selected: true,
      actions: ['코스 보기', '저장 해제'],
    },
    {
      id: 'yulgok-learning',
      name: '율곡형 배움 탐구 코스',
      status: '추천',
      subtitle: '사유와 탐구 중심의 학문 코스',
      places: '4곳',
      expectedTime: '3시간 30분',
      distance: '13.8km',
      difficulty: '보통',
      theme: '배움·탐구',
      thumbnail: assets.hanokThumbnail,
      actions: ['코스 보기', '저장하기'],
    },
  ] satisfies SavedCourse[],
  selectedCourse: {
    name: '처사형 자연 사색 코스',
    status: '저장' as CourseStatus,
    tags: ['자연', '사색', '느림', '고요'],
    description:
      '자연 속에서 마음을 비우고 천천히 걷는 사색의 여정입니다. 계곡과 숲길을 따라 걸으며 고요함을 만끽해보세요.',
    expectedTime: '약 3시간',
    recommendedType: '처사형',
    places: '4곳',
    thumbnail: assets.natureThumbnail,
  },
  aiMemo: {
    text: '최근 기록에서 자연과 사색 키워드가 높게 나타나 처사형 코스를 추천합니다.',
    comparisons: [
      { name: '처사형 자연 사색 코스', score: 92 },
      { name: '퇴계형 선비길', score: 78 },
      { name: '율곡형 배움 탐구 코스', score: 65 },
    ] satisfies CourseComparison[],
  },
  recentCourses: [
    {
      title: '소백산 힐링 코스',
      theme: '자연 · 힐링',
      meta: '4곳 · 예상 3시간',
      thumbnail: assets.natureThumbnail,
    },
    {
      title: '선비 문화 탐방 코스',
      theme: '문화 · 역사',
      meta: '5곳 · 예상 4시간',
      thumbnail: assets.sosuThumbnail,
    },
  ] satisfies RecentCourse[],
}

const sidebarItems = [
  { label: '나의 선비길 기록', asset: assets.recordIcon, active: false },
  { label: '나의 한마디', asset: assets.reflectionIcon, active: false },
  { label: '획득 배지', asset: assets.badgeIcon, active: false },
  { label: '저장한 코스', asset: assets.savedIcon, active: true },
]

const routeStops = [
  { place: '소수서원', x: 30, y: 22 },
  { place: '선비촌', x: 44, y: 34 },
  { place: '부석사', x: 58, y: 50 },
  { place: '무섬마을', x: 56, y: 66 },
  { place: '선비세상', x: 58, y: 82 },
]

function imageAsset(fileName: string) {
  return encodeURI(`/images/new/${fileName}`)
}

function statusClass(status: CourseStatus) {
  if (status === '완주') {
    return 'is-completed'
  }

  if (status === '추천') {
    return 'is-recommended'
  }

  return 'is-saved'
}

export function MyPage() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredAuthUser())
  const [actionMessage, setActionMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => onAuthStateChange(setUser), [])

  const selectedCourse = useMemo(
    () => mySavedCoursesData.courses.find((course) => course.selected) ?? mySavedCoursesData.courses[0],
    [],
  )

  function showStableMessage(message: string) {
    setActionMessage(message)
  }

  function handleCourseAction(course: SavedCourse, action: SavedCourse['actions'][number]) {
    if (action === '리포트 보기') {
      navigate('/mission-complete')
      return
    }

    if (action === '코스 다시 보기' || action === '코스 보기') {
      navigate(`/tour-3d?course=${course.id}`)
      return
    }

    if (action === '저장하기') {
      showStableMessage(`${course.name} 저장은 계정 저장 API 연결 후 반영됩니다.`)
      return
    }

    showStableMessage(`${course.name} 저장 해제는 관리 화면 연결 후 반영됩니다.`)
  }

  if (!user) {
    return (
      <AppLayout hideChatbot>
        <section className="page-section page-container">
          <article className="surface-card empty-result-card protected-feature-card">
            <h1>로그인 후 마이페이지를 이용할 수 있습니다.</h1>
            <p>저장한 관심 코스와 최근 본 코스는 로그인한 사용자에게만 표시됩니다.</p>
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
    <AppLayout className="my-saved-courses-app" hideBottomNavigation hideChatbot>
      <section className="my-saved-courses" aria-labelledby="my-saved-courses-title">
        <div className="my-saved-courses-shell">
          <MyPageSidebar />
          <div className="my-saved-courses-main">
            <MySavedCoursesHeader />
            <SavedCoursesStatsRow />
            <section className="saved-courses-content-grid" aria-label="저장한 코스 관리">
              <SavedCourseList selectedCourseId={selectedCourse.id} onCourseAction={handleCourseAction} />
              <div className="saved-courses-right-column">
                <SelectedCourseInfoPanel
                  onStart={() => navigate(`/tour-3d?course=${selectedCourse.id}`)}
                />
                <AiCourseRecommendationMemo />
              </div>
            </section>
            <section className="saved-courses-lower-grid" aria-label="최근 코스와 빠른 작업">
              <RecentCoursesSection onOpenCourse={() => navigate('/course')} />
              <QuickCourseActions
                onCompleted={() => navigate('/tour-3d?course=toegye-seonbi-road')}
                onManage={() => showStableMessage('저장 해제 관리는 계정 저장 API 연결 후 사용할 수 있습니다.')}
                onRecommend={() => navigate('/course')}
              />
            </section>
            <MySavedCoursesActionBar
              actionMessage={actionMessage}
              onCompleted={() => navigate('/tour-3d?course=toegye-seonbi-road')}
              onEvidence={() => navigate('/ai-evidence-graph')}
              onHome={() => navigate('/')}
              onRecommend={() => navigate('/course')}
            />
          </div>
        </div>
      </section>
    </AppLayout>
  )
}

function MyPageSidebar() {
  return (
    <aside className="my-saved-sidebar" aria-label="마이페이지 메뉴">
      <img className="my-saved-sidebar-art" src={imageAsset(assets.sidebarScenery)} alt="" />
      <div className="my-saved-sidebar-inner">
        <h2>마이페이지</h2>
        <nav aria-label="마이페이지 세부 메뉴">
          {sidebarItems.map((item) => (
            <button
              className={item.active ? 'is-active' : ''}
              key={item.label}
              type="button"
              aria-current={item.active ? 'page' : undefined}
            >
              <img src={imageAsset(item.asset)} alt="" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </aside>
  )
}

function MySavedCoursesHeader() {
  return (
    <header className="my-saved-header">
      <div>
        <span className="my-saved-eyebrow">마이페이지</span>
        <h1 id="my-saved-courses-title">저장한 코스</h1>
        <p>관심 있는 선비길 코스를 저장하고 다시 둘러보세요.</p>
      </div>
    </header>
  )
}

function SavedCoursesStatsRow() {
  return (
    <section className="saved-course-stats" aria-label="저장한 코스 요약">
      {mySavedCoursesData.stats.map((stat) => (
        <article className="saved-course-stat-card" key={stat.label}>
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

function SavedCourseList({
  selectedCourseId,
  onCourseAction,
}: {
  selectedCourseId: string
  onCourseAction: (course: SavedCourse, action: SavedCourse['actions'][number]) => void
}) {
  return (
    <article className="saved-panel saved-course-list-panel">
      <div className="saved-panel-heading">
        <CardTitle>저장한 코스 목록</CardTitle>
        <label className="saved-course-search">
          <span className="sr-only">코스 검색</span>
          <input type="search" placeholder="코스 검색" aria-label="코스 검색" />
        </label>
      </div>
      <div className="saved-course-filter-chips" aria-label="코스 필터">
        {mySavedCoursesData.filters.map((filter) => (
          <button className={filter === '전체' ? 'is-active' : ''} key={filter} type="button">
            {filter}
          </button>
        ))}
      </div>
      <ol className="saved-course-list">
        {mySavedCoursesData.courses.map((course) => (
          <SavedCourseCard
            course={course}
            isSelected={course.id === selectedCourseId}
            key={course.id}
            onCourseAction={onCourseAction}
          />
        ))}
      </ol>
    </article>
  )
}

function SavedCourseCard({
  course,
  isSelected,
  onCourseAction,
}: {
  course: SavedCourse
  isSelected: boolean
  onCourseAction: (course: SavedCourse, action: SavedCourse['actions'][number]) => void
}) {
  return (
    <li className={['saved-course-card', isSelected ? 'is-selected' : ''].filter(Boolean).join(' ')}>
      <CourseThumbnail course={course} />
      <div className="saved-course-card-body">
        <div className="saved-course-title-row">
          <h3>{course.name}</h3>
          <span className={`course-status-chip ${statusClass(course.status)}`}>{course.status}</span>
        </div>
        <p>{course.subtitle}</p>
        <div className="saved-course-main-meta">
          <span>장소 {course.places}</span>
          {course.records && <span>기록 {course.records}</span>}
          {course.badges && <span>배지 {course.badges}</span>}
          {course.expectedTime && <span>예상 {course.expectedTime}</span>}
        </div>
        <div className="saved-course-detail-meta">
          {course.completedAt && <span>완주일 {course.completedAt}</span>}
          <span>총 거리 {course.distance}</span>
          <span>난이도 {course.difficulty}</span>
          {course.theme && <span>테마 {course.theme}</span>}
        </div>
      </div>
      <div className="saved-course-card-actions">
        {course.actions.map((action, index) => (
          <button
            className={index === 1 && course.status === '완주' ? 'is-primary' : ''}
            key={action}
            type="button"
            onClick={() => onCourseAction(course, action)}
          >
            <img
              src={imageAsset(action.includes('리포트') ? assets.reportIcon : action.includes('저장') ? assets.bookmarkLineIcon : assets.mapIcon)}
              alt=""
            />
            {action}
          </button>
        ))}
      </div>
      <span className="saved-course-card-arrow" aria-hidden="true">
        ›
      </span>
    </li>
  )
}

function CourseThumbnail({ course }: { course: SavedCourse }) {
  return (
    <div className={`course-thumbnail course-thumbnail--${course.id}`}>
      <img src={imageAsset(course.thumbnail)} alt="" />
      {course.id === 'toegye-seonbi-road' && (
        <ol className="saved-route-stops" aria-label="퇴계형 선비길 방문 순서">
          {routeStops.map((stop, index) => (
            <li
              key={stop.place}
              style={
                {
                  '--stop-x': `${stop.x}%`,
                  '--stop-y': `${stop.y}%`,
                } as Record<string, string>
              }
            >
              <b>{index + 1}</b>
              <span>{stop.place}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function SelectedCourseInfoPanel({ onStart }: { onStart: () => void }) {
  const course = mySavedCoursesData.selectedCourse

  return (
    <article className="saved-panel selected-course-panel">
      <CardTitle>선택한 코스 정보</CardTitle>
      <div className="selected-course-body">
        <img className="selected-course-image" src={imageAsset(course.thumbnail)} alt="" />
        <div className="selected-course-copy">
          <div className="selected-course-title">
            <h3>{course.name}</h3>
            <span className={`course-status-chip ${statusClass(course.status)}`}>{course.status}</span>
          </div>
          <div className="selected-course-tags">
            {course.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
          <p>{course.description}</p>
        </div>
      </div>
      <dl className="selected-course-details">
        <div>
          <img src={imageAsset(assets.timeIcon)} alt="" />
          <dt>예상 시간</dt>
          <dd>{course.expectedTime}</dd>
        </div>
        <div>
          <img src={imageAsset(assets.personIcon)} alt="" />
          <dt>추천 유형</dt>
          <dd>{course.recommendedType}</dd>
        </div>
        <div>
          <img src={imageAsset(assets.placeIcon)} alt="" />
          <dt>방문 장소</dt>
          <dd>{course.places}</dd>
        </div>
      </dl>
      <button className="saved-button saved-button--primary selected-course-start" type="button" onClick={onStart}>
        <span aria-hidden="true">♙</span>
        이 코스 시작하기
      </button>
    </article>
  )
}

function AiCourseRecommendationMemo() {
  const { aiMemo } = mySavedCoursesData

  return (
    <article className="saved-panel ai-course-memo-panel">
      <div>
        <CardTitle>AI 추천 메모</CardTitle>
        <p>{aiMemo.text}</p>
        <section className="ai-course-bars" aria-label="유사 키워드 비교">
          <h3>유사 키워드 비교</h3>
          {aiMemo.comparisons.map((comparison) => (
            <div className="ai-course-bar-row" key={comparison.name}>
              <span>{comparison.name}</span>
              <i>
                <b style={{ width: `${comparison.score}%` }} />
              </i>
              <strong>{comparison.score}%</strong>
            </div>
          ))}
        </section>
      </div>
      <img className="ai-course-scholar" src={imageAsset(assets.scholar)} alt="" />
    </article>
  )
}

function RecentCoursesSection({ onOpenCourse }: { onOpenCourse: () => void }) {
  return (
    <article className="saved-panel recent-courses-panel">
      <CardTitle>최근 본 코스</CardTitle>
      <div className="recent-course-list">
        {mySavedCoursesData.recentCourses.map((course) => (
          <button className="recent-course-card" key={course.title} type="button" onClick={onOpenCourse}>
            <img src={imageAsset(course.thumbnail)} alt="" />
            <span>
              <strong>{course.title}</strong>
              <small>{course.theme}</small>
              <em>{course.meta}</em>
            </span>
            <b aria-hidden="true">›</b>
          </button>
        ))}
      </div>
    </article>
  )
}

function QuickCourseActions({
  onCompleted,
  onManage,
  onRecommend,
}: {
  onCompleted: () => void
  onManage: () => void
  onRecommend: () => void
}) {
  const actions: QuickAction[] = [
    {
      title: '새 코스 추천받기',
      description: 'AI가 나에게 맞는 코스를 추천해드려요.',
      asset: assets.compassIcon,
      onClick: onRecommend,
    },
    {
      title: '완주 코스 다시 보기',
      description: '완주한 코스를 다시 둘러보세요.',
      asset: assets.flagIcon,
      onClick: onCompleted,
    },
    {
      title: '저장 해제 관리',
      description: '저장한 코스 목록을 정리할 수 있어요.',
      asset: assets.manageIcon,
      onClick: onManage,
    },
  ]

  return (
    <article className="saved-panel quick-course-actions-panel">
      <CardTitle>빠른 작업</CardTitle>
      <div className="quick-course-action-list">
        {actions.map((action) => (
          <button key={action.title} type="button" onClick={action.onClick}>
            <img src={imageAsset(action.asset)} alt="" />
            <span>
              <strong>{action.title}</strong>
              <small>{action.description}</small>
            </span>
            <b aria-hidden="true">›</b>
          </button>
        ))}
      </div>
    </article>
  )
}

function MySavedCoursesActionBar({
  actionMessage,
  onCompleted,
  onEvidence,
  onHome,
  onRecommend,
}: {
  actionMessage: string
  onCompleted: () => void
  onEvidence: () => void
  onHome: () => void
  onRecommend: () => void
}) {
  return (
    <footer className="saved-course-action-bar" aria-label="저장한 코스 주요 액션">
      <p className={actionMessage ? 'saved-action-status is-visible' : 'saved-action-status'} role="status">
        {actionMessage}
      </p>
      <button className="saved-button saved-button--primary action-primary" type="button" onClick={onRecommend}>
        <img src={imageAsset(assets.compassIcon)} alt="" />
        새 코스 추천받기
      </button>
      <button className="saved-button saved-button--secondary" type="button" onClick={onCompleted}>
        <img src={imageAsset(assets.flagIcon)} alt="" />
        완주 코스 다시 보기
      </button>
      <button className="saved-button saved-button--secondary" type="button" onClick={onEvidence}>
        <img src={imageAsset(assets.evidenceIcon)} alt="" />
        AI 추천 근거 보기
      </button>
      <button className="saved-button saved-button--quiet" type="button" onClick={onHome}>
        <img src={imageAsset(assets.homeIcon)} alt="" />
        홈으로 돌아가기
      </button>
    </footer>
  )
}

function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="saved-card-title">
      <span aria-hidden="true">✤</span>
      {children}
    </h2>
  )
}
