import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CommonButton } from '../components/common/CommonButton'
import { StatusBadge } from '../components/common/StatusBadge'
import { AppLayout } from '../components/layout/AppLayout'

type AdminSessionStatus = 'checking' | 'authenticated' | 'unauthenticated'
type DashboardStatus = 'idle' | 'loading' | 'ready' | 'error'
type DashboardRange = 'today' | '7d' | '30d' | 'all'

interface AdminDashboard {
  summary: {
    totalUsers: number
    totalEvents: number
    totalFavorites: number
    totalJudgeHistories: number
  }
  seonbiTypeDistribution: Record<string, number>
  judgeStats: {
    textBasedCount: number
    imageBasedCount: number
    modeCounts: Record<string, number>
    typeCounts: Record<string, number>
  }
  courseStats: {
    favoriteTopCourses: Array<{
      title: string
      count: number
      contentType: string
    }>
    contentTypeCounts: Record<string, number>
  }
  behaviorFunnel: Array<{
    key: string
    label: string
    count: number
    conversionRate: number | null
  }>
  publicDataStatus: {
    basis: string
    periodSensitive: boolean
    attractionCount: number
    cultureCount: number
    accommodationCount: number
    restaurantCount: number
    missingCoordinateCount: number
    missingImageCount: number
    lastSyncedAt: string | null
    unavailableMetrics: string[]
  }
  ragStatus: {
    totalDocuments: number
    tourismPlaceDocuments: number
    seonbiPersonaDocuments: number
    judgeModeDocuments: number
    recommendationRuleDocuments: number
    lastUpdatedAt: string | null
  }
  recentActivities: Array<{
    eventType: string
    createdAt: string
    summary: string
  }>
}

interface AdminDashboardResponse {
  ok?: boolean
  dashboard?: AdminDashboard
}

const ranges: Array<{ value: DashboardRange; label: string }> = [
  { value: 'today', label: '오늘' },
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: 'all', label: '전체' },
]

const seonbiTypeLabels: Record<string, string> = {
  toegye: '퇴계형',
  yulgok: '율곡형',
  cheosa: '처사형',
  uguk: '우국형',
}

const judgeModeLabels: Record<string, string> = {
  default: '기본 선비',
  strict: '엄격한 선비',
  practical: '현실적인 선비',
  hermit: '은둔 선비',
  righteous: '의병 선비',
  praise: '칭찬 선비',
  roast: '팩폭 선비',
  petition: '상소문 변환',
  poison: '사약 판정',
}

export function AdminPage() {
  const navigate = useNavigate()
  const [sessionStatus, setSessionStatus] = useState<AdminSessionStatus>('checking')
  const [dashboardStatus, setDashboardStatus] = useState<DashboardStatus>('idle')
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null)
  const [range, setRange] = useState<DashboardRange>('30d')
  const [statusMessage, setStatusMessage] = useState('')
  const isCheckingSession = sessionStatus === 'checking'
  const isAuthenticated = sessionStatus === 'authenticated'
  const hasNoData = useMemo(() => {
    if (!dashboard) return false
    return (
      dashboard.summary.totalEvents === 0 &&
      dashboard.summary.totalFavorites === 0 &&
      dashboard.summary.totalJudgeHistories === 0
    )
  }, [dashboard])

  useEffect(() => {
    let ignore = false

    async function checkAdminSession() {
      try {
        const response = await fetch('/api/admin/session', {
          method: 'GET',
          credentials: 'include',
        })
        const data = (await response.json().catch(() => ({}))) as { ok?: boolean }
        if (ignore) return

        if (response.ok && data.ok) {
          setSessionStatus('authenticated')
          return
        }

        setSessionStatus('unauthenticated')
      } catch {
        if (!ignore) setSessionStatus('unauthenticated')
      }
    }

    void checkAdminSession()

    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (sessionStatus !== 'unauthenticated') return
    navigate('/login', { replace: true, state: { from: '/admin' } })
  }, [navigate, sessionStatus])

  useEffect(() => {
    if (!isAuthenticated) return
    let ignore = false

    async function loadDashboard() {
      setDashboardStatus('loading')
      setStatusMessage('')

      try {
        const response = await fetch(`/api/admin/dashboard?range=${range}`, {
          method: 'GET',
          credentials: 'include',
        })

        if (response.status === 401) {
          setSessionStatus('unauthenticated')
          return
        }

        const data = (await response.json().catch(() => ({}))) as AdminDashboardResponse
        if (ignore) return

        if (!response.ok || !data.ok || !data.dashboard) {
          setDashboardStatus('error')
          setStatusMessage('대시보드 데이터를 불러오지 못했습니다.')
          return
        }

        setDashboard(data.dashboard)
        setDashboardStatus('ready')
      } catch {
        if (!ignore) {
          setDashboardStatus('error')
          setStatusMessage('대시보드 데이터를 불러오지 못했습니다.')
        }
      }
    }

    void loadDashboard()

    return () => {
      ignore = true
    }
  }, [isAuthenticated, range])

  async function handleLogout() {
    setStatusMessage('')

    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      setStatusMessage('관리자 로그아웃 요청을 완료하지 못했습니다.')
      return
    }

    navigate('/login', { replace: true })
  }

  return (
    <AppLayout hideNavigation adminMode>
      <section className="admin-page page-container">
        <div className="admin-header admin-dashboard-header">
          <div>
            <StatusBadge tone="neutral">관리자</StatusBadge>
            <h1>관리자 대시보드</h1>
            <p>사용자 행동 데이터와 추천 흐름을 비식별 통계로 확인합니다.</p>
          </div>
          {isAuthenticated && (
            <div className="admin-header-actions">
              <div className="admin-range-filter" aria-label="대시보드 기간 필터">
                {ranges.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={range === item.value ? 'active' : ''}
                    onClick={() => setRange(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <CommonButton type="button" variant="secondary" onClick={() => void handleLogout()}>
                관리자 로그아웃
              </CommonButton>
            </div>
          )}
        </div>

        {isCheckingSession && (
          <article className="surface-card admin-auth-card" role="status">
            <StatusBadge tone="neutral">확인 중</StatusBadge>
            <h2>관리자 세션을 확인하고 있습니다.</h2>
            <p>잠시만 기다려주세요.</p>
          </article>
        )}

        {isAuthenticated && dashboardStatus === 'loading' && (
          <section className="admin-dashboard-grid" role="status">
            {Array.from({ length: 4 }).map((_, index) => (
              <article className="surface-card admin-skeleton-card" key={index}>
                <span />
                <strong />
                <small />
              </article>
            ))}
          </section>
        )}

        {isAuthenticated && dashboardStatus === 'error' && (
          <article className="surface-card admin-auth-card" role="status">
            <StatusBadge tone="neutral">오류</StatusBadge>
            <h2>대시보드 데이터를 불러오지 못했습니다.</h2>
            <p>잠시 후 다시 시도해주세요.</p>
          </article>
        )}

        {isAuthenticated && dashboardStatus === 'ready' && dashboard && (
          <>
            {hasNoData && (
              <p className="disabled-notice admin-status-message" role="status">
                아직 수집된 분석 데이터가 없습니다.
              </p>
            )}

            <section className="admin-dashboard-grid" aria-label="요약 지표">
              <SummaryCard label="총 사용자" value={dashboard.summary.totalUsers} icon="人" />
              <SummaryCard label="총 이벤트" value={dashboard.summary.totalEvents} icon="↗" />
              <SummaryCard
                label="관심 코스 저장"
                value={dashboard.summary.totalFavorites}
                icon="□"
              />
              <SummaryCard
                label="선비의 한마디 생성"
                value={dashboard.summary.totalJudgeHistories}
                icon="言"
              />
            </section>

            <section className="admin-analytics-grid">
              <BehaviorFunnel steps={dashboard.behaviorFunnel} />
              <PublicDataStatusPanel status={dashboard.publicDataStatus} />
              <RagStatusPanel status={dashboard.ragStatus} />
              <ChartPanel
                title="선비유형 분포"
                rows={toChartRows(dashboard.seonbiTypeDistribution, seonbiTypeLabels)}
              />
              <ChartPanel
                title="한마디 모드 사용량"
                rows={toChartRows(dashboard.judgeStats.modeCounts, judgeModeLabels)}
              />
              <TopCourses courses={dashboard.courseStats.favoriteTopCourses} />
              <ChartPanel
                title="카테고리별 추천/저장 비율"
                rows={toChartRows(dashboard.courseStats.contentTypeCounts)}
              />
              <RecentActivities activities={dashboard.recentActivities} />
              <PrivacyPanel />
            </section>
          </>
        )}

        {statusMessage && dashboardStatus !== 'error' && (
          <p className="disabled-notice admin-status-message" role="status">
            {statusMessage}
          </p>
        )}
      </section>
    </AppLayout>
  )
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: string
}) {
  return (
    <article className="surface-card admin-summary-card">
      <span className="admin-summary-icon" aria-hidden="true">
        {icon}
      </span>
      <div>
        <span>{label}</span>
        <strong>{formatNumber(value)}</strong>
      </div>
    </article>
  )
}

function ChartPanel({ title, rows }: { title: string; rows: ChartRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.value, 0)

  return (
    <article className="surface-card admin-chart-panel">
      <h2>{title}</h2>
      {total === 0 ? (
        <p className="admin-empty-panel">아직 수집된 분석 데이터가 없습니다.</p>
      ) : (
        <div className="admin-bar-list">
          {rows.map((row) => (
            <div className="admin-bar-row" key={row.label}>
              <span>{row.label}</span>
              <div className="admin-bar-track">
                <i style={{ width: `${Math.max(row.percent, 4)}%` }} />
              </div>
              <strong>
                {row.percent.toFixed(1)}% ({formatNumber(row.value)})
              </strong>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

function TopCourses({
  courses,
}: {
  courses: AdminDashboard['courseStats']['favoriteTopCourses']
}) {
  return (
    <article className="surface-card admin-chart-panel">
      <h2>인기 저장 코스 TOP 5</h2>
      {courses.length === 0 ? (
        <p className="admin-empty-panel">아직 수집된 분석 데이터가 없습니다.</p>
      ) : (
        <ol className="admin-top-course-list">
          {courses.map((course, index) => (
            <li key={`${course.title}-${course.contentType}`}>
              <span>{index + 1}</span>
              <strong>{course.title}</strong>
              <em>{course.contentType}</em>
              <small>{formatNumber(course.count)}</small>
            </li>
          ))}
        </ol>
      )}
    </article>
  )
}

function BehaviorFunnel({
  steps,
}: {
  steps: AdminDashboard['behaviorFunnel']
}) {
  const maxCount = Math.max(...steps.map((step) => step.count), 0)

  return (
    <article className="surface-card admin-chart-panel admin-funnel-panel">
      <div className="admin-panel-heading">
        <h2>사용자 행동 퍼널</h2>
        <span>선택 기간 기준</span>
      </div>
      <div className="admin-funnel-list">
        {steps.map((step, index) => {
          const width = maxCount > 0 ? (step.count / maxCount) * 100 : 0
          return (
            <div className="admin-funnel-step" key={step.key}>
              <span>{index + 1}</span>
              <div>
                <strong>{step.label}</strong>
                <div className="admin-funnel-track">
                  <i style={{ width: `${Math.max(width, step.count > 0 ? 5 : 0)}%` }} />
                </div>
              </div>
              <em>{formatNumber(step.count)}</em>
              <small>
                {step.conversionRate === null
                  ? '기준 단계'
                  : `${step.conversionRate.toFixed(1)}%`}
              </small>
            </div>
          )
        })}
      </div>
    </article>
  )
}

function PublicDataStatusPanel({
  status,
}: {
  status: AdminDashboard['publicDataStatus']
}) {
  const metrics = [
    { label: '관광지 데이터 수', value: status.attractionCount },
    { label: '문화시설 데이터 수', value: status.cultureCount },
    { label: '숙박 데이터 수', value: status.accommodationCount },
    { label: '음식점 데이터 수', value: status.restaurantCount },
    { label: '좌표 누락 데이터 수', value: status.missingCoordinateCount },
    { label: '이미지 누락 데이터 수', value: status.missingImageCount },
  ]

  return (
    <article className="surface-card admin-chart-panel admin-public-data-panel">
      <div className="admin-panel-heading">
        <h2>공공데이터 연동 상태</h2>
        <span>{status.periodSensitive ? status.basis : '전체 기준'}</span>
      </div>
      <dl className="admin-public-data-grid">
        {metrics.map((metric) => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{formatNumber(metric.value)}</dd>
          </div>
        ))}
        <div>
          <dt>최종 조회/동기화 시각</dt>
          <dd>{status.lastSyncedAt ? formatDateTime(status.lastSyncedAt) : '데이터 없음'}</dd>
        </div>
      </dl>
      {status.unavailableMetrics.length > 0 && (
        <p className="admin-data-note">
          {status.unavailableMetrics.join(', ')}은 수집 예정입니다.
        </p>
      )}
    </article>
  )
}

function RagStatusPanel({
  status,
}: {
  status: AdminDashboard['ragStatus']
}) {
  const metrics = [
    { label: 'RAG 문서 수', value: status.totalDocuments },
    { label: '관광지 문서 수', value: status.tourismPlaceDocuments },
    { label: '선비유형 문서 수', value: status.seonbiPersonaDocuments },
    { label: '모드 문서 수', value: status.judgeModeDocuments },
    { label: '추천 규칙 문서 수', value: status.recommendationRuleDocuments },
  ]

  return (
    <article className="surface-card admin-chart-panel admin-rag-status-panel">
      <div className="admin-panel-heading">
        <h2>AI 참고 데이터 상태</h2>
        <span>전체 기준</span>
      </div>
      {status.totalDocuments === 0 ? (
        <p className="admin-empty-panel">아직 등록된 AI 참고 데이터가 없습니다.</p>
      ) : (
        <>
          <dl className="admin-rag-status-grid">
            {metrics.map((metric) => (
              <div key={metric.label}>
                <dt>{metric.label}</dt>
                <dd>{formatNumber(metric.value)}</dd>
              </div>
            ))}
          </dl>
          <p className="admin-data-note">
            마지막 업데이트: {status.lastUpdatedAt ? formatDateTime(status.lastUpdatedAt) : '데이터 없음'}
          </p>
        </>
      )}
    </article>
  )
}

function RecentActivities({
  activities,
}: {
  activities: AdminDashboard['recentActivities']
}) {
  return (
    <article className="surface-card admin-chart-panel admin-recent-panel">
      <h2>최근 활동</h2>
      {activities.length === 0 ? (
        <p className="admin-empty-panel">아직 수집된 분석 데이터가 없습니다.</p>
      ) : (
        <div className="admin-activity-table">
          <span>시간</span>
          <span>사용자</span>
          <span>이벤트</span>
          {activities.map((activity) => (
            <div className="admin-activity-row" key={`${activity.createdAt}-${activity.eventType}`}>
              <time dateTime={activity.createdAt}>{formatDateTime(activity.createdAt)}</time>
              <span>익명 사용자</span>
              <strong>{activity.summary}</strong>
            </div>
          ))}
        </div>
      )}
    </article>
  )
}

function PrivacyPanel() {
  return (
    <article className="surface-card admin-privacy-panel">
      <h2>개인정보 보호 원칙</h2>
      <ul>
        <li>입력 원문 미표시</li>
        <li>사진 원본 미표시</li>
        <li>이메일과 전화번호 미수집</li>
        <li>정확한 위치 좌표 미표시</li>
      </ul>
      <p>모든 데이터는 비식별 통계 목적으로만 사용됩니다.</p>
    </article>
  )
}

interface ChartRow {
  label: string
  value: number
  percent: number
}

function toChartRows(values: Record<string, number>, labels: Record<string, string> = {}) {
  const total = Object.values(values).reduce((sum, value) => sum + value, 0)

  return Object.entries(values)
    .map(([key, value]) => ({
      label: labels[key] ?? key,
      value,
      percent: total > 0 ? (value / total) * 100 : 0,
    }))
    .sort((first, second) => second.value - first.value)
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('ko-KR').format(value)
}

function formatDateTime(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}
