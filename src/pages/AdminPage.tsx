import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandLoading } from '../components/common/BrandLoading'
import { CommonButton } from '../components/common/CommonButton'
import { StatusBadge } from '../components/common/StatusBadge'
import { AppLayout } from '../components/layout/AppLayout'
import {
  loadYeongjuEnrichmentData,
  type YeongjuEnrichmentData,
} from '../features/tourism/yeongjuEnrichment'

type AdminSessionStatus = 'checking' | 'authenticated' | 'unauthenticated'
type DashboardStatus = 'idle' | 'loading' | 'ready' | 'error'
type DashboardRange = 'today' | '7d' | '30d' | 'all'
type RagSeedStatus = 'idle' | 'loading' | 'success' | 'error'
type RagSearchStatus = 'idle' | 'loading' | 'ready' | 'error'
type AdminSectionKey = 'funnel' | 'quality' | 'local' | 'recommendations' | 'activity'
type AdminIconName =
  | 'activity'
  | 'bookmark'
  | 'chart'
  | 'database'
  | 'funnel'
  | 'map'
  | 'message'
  | 'shield'
  | 'users'

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
    hasDirectEntry?: boolean
  }>
  publicDataStatus: {
    basis: string
    periodSensitive: boolean
    totalPlaceCount: number
    attractionCount: number
    cultureCount: number
    accommodationCount: number
    restaurantCount: number
    categoryCounts: Record<string, number>
    missingCoordinateCount: number
    missingImageCount: number
    missingPhoneCount: number
    missingAddressCount: number
    phoneMetricStatus: string
    duplicateTitleCount: number
    duplicateTitleAddressCount: number
    mapUnavailableCount: number
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
  insights: string[]
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

interface RagSearchResult {
  title: string
  content: string
  metadata: Record<string, unknown>
  similarity?: number
  source_type?: string
}

interface RagSearchResponse {
  ok?: boolean
  documents?: RagSearchResult[]
}

interface AdminSectionOption {
  key: AdminSectionKey
  label: string
  caption: string
  value: string
  icon: AdminIconName
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
  const [ragSeedStatus, setRagSeedStatus] = useState<RagSeedStatus>('idle')
  const [ragSearchQuery, setRagSearchQuery] = useState('')
  const [ragSearchStatus, setRagSearchStatus] = useState<RagSearchStatus>('idle')
  const [ragSearchResults, setRagSearchResults] = useState<RagSearchResult[]>([])
  const [ragSearchMessage, setRagSearchMessage] = useState('')
  const [enrichmentData, setEnrichmentData] = useState<YeongjuEnrichmentData | null>(null)
  const [activeAdminSection, setActiveAdminSection] = useState<AdminSectionKey>('funnel')
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
  const adminSectionOptions = useMemo(
    () => (dashboard ? createAdminSectionOptions(dashboard, enrichmentData) : []),
    [dashboard, enrichmentData],
  )

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

  const loadDashboard = useCallback(
    async (options: { silent?: boolean; ignore?: () => boolean } = {}) => {
      if (!options.silent) {
        setDashboardStatus('loading')
      }
      setStatusMessage('')

      try {
        const response = await fetch(`/api/admin/dashboard?range=${range}`, {
          method: 'GET',
          credentials: 'include',
        })

        if (response.status === 401) {
          if (options.ignore?.()) return
          setSessionStatus('unauthenticated')
          return
        }

        const data = (await response.json().catch(() => ({}))) as AdminDashboardResponse
        if (options.ignore?.()) return

        if (!response.ok || !data.ok || !data.dashboard) {
          setDashboardStatus('error')
          setStatusMessage('대시보드 데이터를 불러오지 못했습니다.')
          return
        }

        setDashboard(data.dashboard)
        setDashboardStatus('ready')
      } catch {
        if (!options.ignore?.()) {
          setDashboardStatus('error')
          setStatusMessage('대시보드 데이터를 불러오지 못했습니다.')
        }
      }
    },
    [range],
  )

  useEffect(() => {
    if (!isAuthenticated) return
    let ignore = false

    void Promise.resolve().then(() => loadDashboard({ ignore: () => ignore }))

    return () => {
      ignore = true
    }
  }, [isAuthenticated, loadDashboard])

  useEffect(() => {
    if (!isAuthenticated) return
    let ignore = false

    async function loadEnrichment() {
      const data = await loadYeongjuEnrichmentData()
      if (!ignore) setEnrichmentData(data)
    }

    void loadEnrichment()

    return () => {
      ignore = true
    }
  }, [isAuthenticated])

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

  async function handleRagSeed() {
    setRagSeedStatus('loading')

    try {
      const response = await fetch('/api/admin/rag/seed', {
        method: 'POST',
        credentials: 'include',
      })
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean }

      if (!response.ok || !data.ok) {
        setRagSeedStatus('error')
        return
      }

      setRagSeedStatus('success')
      await loadDashboard({ silent: true })
    } catch {
      setRagSeedStatus('error')
    }
  }

  async function handleRagSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = ragSearchQuery.trim()
    if (!query) {
      setRagSearchStatus('idle')
      setRagSearchResults([])
      setRagSearchMessage('검색어를 입력해주세요.')
      return
    }

    setRagSearchStatus('loading')
    setRagSearchMessage('')
    setRagSearchResults([])

    try {
      const response = await fetch('/api/rag/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          matchCount: 5,
        }),
      })
      const data = (await response.json().catch(() => ({}))) as RagSearchResponse

      if (!response.ok || !data.ok) {
        setRagSearchStatus('error')
        setRagSearchMessage('AI 참고 데이터 검색에 실패했습니다.')
        return
      }

      const results = (data.documents ?? []).slice(0, 5)
      setRagSearchResults(results)
      setRagSearchStatus('ready')
      setRagSearchMessage(
        results.length === 0 ? '관련 참고 데이터를 찾지 못했습니다.' : '',
      )
    } catch {
      setRagSearchStatus('error')
      setRagSearchMessage('AI 참고 데이터 검색에 실패했습니다.')
    }
  }

  return (
    <AppLayout hideNavigation hideChatbot adminMode>
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
            <BrandLoading message="관리자 세션을 확인하고 있습니다." />
            <h2>관리자 세션을 확인하고 있습니다.</h2>
            <p>잠시만 기다려주세요.</p>
          </article>
        )}

        {isAuthenticated && dashboardStatus === 'loading' && (
          <>
            <BrandLoading
              className="admin-dashboard-loading"
              message="영주 관광 데이터를 살피는 중입니다."
            />
            <section className="admin-dashboard-grid" role="status">
              {Array.from({ length: 4 }).map((_, index) => (
                <article className="surface-card admin-skeleton-card" key={index}>
                  <span />
                  <strong />
                  <small />
                </article>
              ))}
            </section>
          </>
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

            <div className="admin-command-center">
              <section
                className="admin-dashboard-grid admin-dashboard-grid--compact"
                aria-label="요약 지표"
              >
                <SummaryCard label="총 사용자" value={dashboard.summary.totalUsers} icon="users" />
                <SummaryCard label="총 이벤트" value={dashboard.summary.totalEvents} icon="activity" />
                <SummaryCard
                  label="관심 코스 저장"
                  value={dashboard.summary.totalFavorites}
                  icon="bookmark"
                />
                <SummaryCard
                  label="선비의 한마디 생성"
                  value={dashboard.summary.totalJudgeHistories}
                  icon="message"
                />
              </section>

              <AdminSectionTabs
                activeSection={activeAdminSection}
                onChange={setActiveAdminSection}
                options={adminSectionOptions}
              />

              <InsightPanel insights={dashboard.insights} />
            </div>

            <section
              className="admin-active-dashboard"
              id={`admin-section-panel-${activeAdminSection}`}
              role="tabpanel"
              aria-labelledby={`admin-section-tab-${activeAdminSection}`}
            >
              {activeAdminSection === 'funnel' && (
                <BehaviorFunnel steps={dashboard.behaviorFunnel} />
              )}
              {activeAdminSection === 'quality' && (
                <AiPublicDataQualityPanel
                  searchMessage={ragSearchMessage}
                  searchQuery={ragSearchQuery}
                  searchResults={ragSearchResults}
                  searchStatus={ragSearchStatus}
                  seedStatus={ragSeedStatus}
                  publicDataStatus={dashboard.publicDataStatus}
                  ragStatus={dashboard.ragStatus}
                  onSearch={handleRagSearch}
                  onSearchQueryChange={setRagSearchQuery}
                  onSeed={() => void handleRagSeed()}
                />
              )}
              {activeAdminSection === 'local' && (
                <LocalPublicDataPanel data={enrichmentData} />
              )}
              {activeAdminSection === 'recommendations' && (
                <div className="admin-analytics-grid admin-analytics-grid--selected">
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
                </div>
              )}
              {activeAdminSection === 'activity' && (
                <div className="admin-analytics-grid admin-analytics-grid--selected">
                  <RecentActivities activities={dashboard.recentActivities} />
                  <PrivacyPanel />
                </div>
              )}
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

function InsightPanel({ insights }: { insights: string[] }) {
  const items =
    insights.length > 0 ? insights : ['아직 충분한 분석 데이터가 없습니다.']

  return (
    <article className="surface-card admin-weekly-insight-panel">
      <div className="admin-panel-heading">
        <div>
          <StatusBadge>인사이트</StatusBadge>
          <h2>이번 주 인사이트</h2>
        </div>
        <span>선택 기간 기준</span>
      </div>
      <p>비식별 행동 데이터를 바탕으로 개선 포인트를 요약합니다.</p>
      <ul>
        {items.map((insight) => (
          <li key={insight}>{insight}</li>
        ))}
      </ul>
    </article>
  )
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string
  value: number
  icon: AdminIconName
}) {
  return (
    <article className="surface-card admin-summary-card">
      <span className="admin-summary-icon" aria-hidden="true">
        <AdminIcon name={icon} />
      </span>
      <div>
        <span>{label}</span>
        <strong>{formatNumber(value)}</strong>
      </div>
    </article>
  )
}

function AdminSectionTabs({
  options,
  activeSection,
  onChange,
}: {
  options: AdminSectionOption[]
  activeSection: AdminSectionKey
  onChange: (section: AdminSectionKey) => void
}) {
  return (
    <nav className="surface-card admin-section-tabs" aria-label="관리자 상세 섹션">
      <div className="admin-section-tabs-heading">
        <StatusBadge tone="neutral">섹션</StatusBadge>
        <h2>관리 영역</h2>
      </div>
      <div className="admin-section-tab-list" role="tablist" aria-label="관리자 상세 보기">
        {options.map((option) => {
          const isActive = activeSection === option.key
          return (
            <button
              key={option.key}
              id={`admin-section-tab-${option.key}`}
              type="button"
              role="tab"
              aria-controls={`admin-section-panel-${option.key}`}
              aria-selected={isActive}
              className={isActive ? 'admin-section-tab active' : 'admin-section-tab'}
              onClick={() => onChange(option.key)}
            >
              <span className="admin-section-tab-icon" aria-hidden="true">
                <AdminIcon name={option.icon} />
              </span>
              <span>
                <strong>{option.label}</strong>
                <small>{option.caption}</small>
              </span>
              <em>{option.value}</em>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function AdminIcon({ name }: { name: AdminIconName }) {
  const commonProps = {
    className: 'admin-icon',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2,
    viewBox: '0 0 24 24',
  }

  switch (name) {
    case 'activity':
      return (
        <svg {...commonProps}>
          <path d="M3 12h4l3-7 4 14 3-7h4" />
        </svg>
      )
    case 'bookmark':
      return (
        <svg {...commonProps}>
          <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-3-6 3V5a1 1 0 0 1 1-1Z" />
        </svg>
      )
    case 'chart':
      return (
        <svg {...commonProps}>
          <path d="M4 19V5" />
          <path d="M4 19h16" />
          <path d="M8 16v-5" />
          <path d="M12 16V8" />
          <path d="M16 16v-3" />
        </svg>
      )
    case 'database':
      return (
        <svg {...commonProps}>
          <ellipse cx="12" cy="5" rx="7" ry="3" />
          <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
          <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
        </svg>
      )
    case 'funnel':
      return (
        <svg {...commonProps}>
          <path d="M4 5h16l-6 7v5l-4 2v-7L4 5Z" />
        </svg>
      )
    case 'map':
      return (
        <svg {...commonProps}>
          <path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z" />
          <path d="M9 3v15" />
          <path d="M15 6v15" />
        </svg>
      )
    case 'message':
      return (
        <svg {...commonProps}>
          <path d="M5 6h14v9H8l-3 3V6Z" />
          <path d="M9 10h6" />
          <path d="M9 13h4" />
        </svg>
      )
    case 'shield':
      return (
        <svg {...commonProps}>
          <path d="M12 3 19 6v5c0 4.4-2.8 8-7 10-4.2-2-7-5.6-7-10V6l7-3Z" />
          <path d="m9 12 2 2 4-5" />
        </svg>
      )
    case 'users':
      return (
        <svg {...commonProps}>
          <path d="M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="9.5" cy="7" r="3" />
          <path d="M21 20v-2a3.2 3.2 0 0 0-2.4-3.1" />
          <path d="M16.8 4.2a3 3 0 0 1 0 5.6" />
        </svg>
      )
  }
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

function LocalPublicDataPanel({ data }: { data: YeongjuEnrichmentData | null }) {
  if (!data) {
    return (
      <article className="surface-card admin-chart-panel">
        <h2>영주 보강 데이터 적용 현황</h2>
        <p className="admin-empty-panel">보강 데이터를 불러오는 중입니다.</p>
      </article>
    )
  }

  const inventoryRows = data.sourceInventory
    .filter((item) => item.appliedRows > 0)
    .map((item) => ({
      label: item.label,
      value: item.appliedRows,
    }))
    .sort((first, second) => second.value - first.value)
    .slice(0, 8)
  const maxInventoryRows = Math.max(...inventoryRows.map((row) => row.value), 1)
  const trendRows = data.visitorDemand.latestMonthlyTrend.slice(-6)
  const maxVisitors = Math.max(...trendRows.map((row) => row.visitors), 1)
  const weather = data.weatherSummary

  return (
    <article className="surface-card admin-chart-panel admin-local-data-panel">
      <div className="admin-panel-heading">
        <h2>영주 보강 데이터 적용 현황</h2>
        <span>{formatDateTime(data.generatedAt)}</span>
      </div>
      <MetricGrid
        metrics={[
          { label: '맛집', value: data.localRestaurants.length },
          { label: '안심식당', value: data.safeRestaurants.length },
          { label: '농어촌민박', value: data.ruralHomestays.length },
          { label: '공중화장실', value: data.publicToilets.length },
          {
            label: '무장애 화장실',
            value: data.accessibilitySummary?.accessiblePublicToilets ?? 0,
          },
          {
            label: '단기예보',
            value: weather?.forecastDate ? weather.forecastDate : '수집 전',
          },
        ]}
      />
      <div className="admin-quality-subchart">
        <strong>적용 데이터셋 상위</strong>
        <div className="admin-bar-list">
          {inventoryRows.map((row) => (
            <div className="admin-bar-row" key={row.label}>
              <span>{row.label}</span>
              <div className="admin-bar-track">
                <i style={{ width: `${Math.max((row.value / maxInventoryRows) * 100, 4)}%` }} />
              </div>
              <strong>{formatNumber(row.value)}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="admin-quality-subchart">
        <strong>소수서원 최근 월별 입장객</strong>
        <div className="admin-bar-list">
          {trendRows.map((row) => (
            <div className="admin-bar-row" key={row.month}>
              <span>{row.month}</span>
              <div className="admin-bar-track">
                <i style={{ width: `${Math.max((row.visitors / maxVisitors) * 100, 4)}%` }} />
              </div>
              <strong>{formatNumber(row.visitors)}</strong>
            </div>
          ))}
        </div>
      </div>
      {weather && (
        <p className="admin-data-note">
          날씨 근거: {weather.sky ?? '미확인'}, 강수확률{' '}
          {formatNumber(weather.precipitationProbability ?? 0)}%, 자외선{' '}
          {weather.uvIndex?.level ?? '미확인'}
        </p>
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
                {getFunnelRateLabel(step, index)}
              </small>
              {step.hasDirectEntry && (
                <b className="admin-funnel-overflow-chip">직접 진입 포함</b>
              )}
            </div>
          )
        })}
      </div>
    </article>
  )
}

function getFunnelRateLabel(
  step: AdminDashboard['behaviorFunnel'][number],
  index: number,
) {
  if (index === 0) return '기준 단계'
  if (step.hasDirectEntry) return '100%+'
  if (step.conversionRate === null) return '전 단계 0'
  return `${step.conversionRate.toFixed(1)}%`
}

function AiPublicDataQualityPanel({
  searchMessage,
  searchQuery,
  searchResults,
  searchStatus,
  seedStatus,
  publicDataStatus,
  ragStatus,
  onSearch,
  onSearchQueryChange,
  onSeed,
}: {
  searchMessage: string
  searchQuery: string
  searchResults: RagSearchResult[]
  searchStatus: RagSearchStatus
  seedStatus: RagSeedStatus
  publicDataStatus: AdminDashboard['publicDataStatus']
  ragStatus: AdminDashboard['ragStatus']
  onSearch: (event: React.FormEvent<HTMLFormElement>) => void
  onSearchQueryChange: (value: string) => void
  onSeed: () => void
}) {
  const ragDocumentMetrics = [
    { label: '전체 문서', value: ragStatus.totalDocuments },
    { label: '관광지', value: ragStatus.tourismPlaceDocuments },
    { label: '선비유형', value: ragStatus.seonbiPersonaDocuments },
    { label: '한마디 모드', value: ragStatus.judgeModeDocuments },
    { label: '추천 규칙', value: ragStatus.recommendationRuleDocuments },
  ]
  const publicDataMetrics = [
    { label: '전체 장소', value: publicDataStatus.totalPlaceCount },
    { label: '좌표 누락', value: publicDataStatus.missingCoordinateCount },
    { label: '이미지 누락', value: publicDataStatus.missingImageCount },
    { label: '전화번호 누락', value: publicDataStatus.phoneMetricStatus },
    { label: '주소 누락', value: publicDataStatus.missingAddressCount },
    { label: '지도 표시 어려움', value: publicDataStatus.mapUnavailableCount },
    { label: '동일 title 의심', value: publicDataStatus.duplicateTitleCount },
    {
      label: '동일 title+주소 의심',
      value: publicDataStatus.duplicateTitleAddressCount,
    },
  ]
  const ragSearchQuality = createRagSearchQuality(searchStatus, searchResults)
  const enrichmentItems = createEnrichmentItems(publicDataStatus, ragStatus)

  return (
    <article className="surface-card admin-chart-panel admin-ai-quality-panel">
      <div className="admin-panel-heading">
        <h2>AI/공공데이터 품질 관리</h2>
        <span>{publicDataStatus.periodSensitive ? publicDataStatus.basis : '전체 기준'}</span>
      </div>

      <div className="admin-quality-card-grid">
        <section className="admin-quality-card">
          <h3>AI 참고 데이터 상태</h3>
          {ragStatus.totalDocuments === 0 ? (
            <p className="admin-empty-panel">아직 등록된 AI 참고 데이터가 없습니다.</p>
          ) : (
            <>
              <MetricGrid metrics={ragDocumentMetrics} />
              <div className="admin-bar-list">
                {toChartRows(
                  Object.fromEntries(
                    ragDocumentMetrics.slice(1).map((metric) => [
                      metric.label,
                      Number(metric.value),
                    ]),
                  ),
                ).map((row) => (
                  <div className="admin-bar-row" key={row.label}>
                    <span>{row.label}</span>
                    <div className="admin-bar-track">
                      <i style={{ width: `${Math.max(row.percent, 4)}%` }} />
                    </div>
                    <strong>{formatNumber(row.value)}</strong>
                  </div>
                ))}
              </div>
              <p className="admin-data-note">
                마지막 업데이트: {ragStatus.lastUpdatedAt ? formatDateTime(ragStatus.lastUpdatedAt) : '데이터 없음'}
              </p>
            </>
          )}
          <div className="admin-rag-actions">
            <CommonButton
              type="button"
              disabled={seedStatus === 'loading'}
              isLoading={seedStatus === 'loading'}
              loadingLabel="업데이트 중..."
              onClick={onSeed}
            >
              AI 참고 데이터 업데이트
            </CommonButton>
            {seedStatus === 'success' && (
              <p className="success-message" role="status">
                AI 참고 데이터가 업데이트되었습니다.
              </p>
            )}
            {seedStatus === 'error' && (
              <p className="form-error" role="status">
                AI 참고 데이터 업데이트에 실패했습니다.
              </p>
            )}
          </div>
        </section>

        <section className="admin-quality-card">
          <h3>RAG 검색 품질</h3>
          <MetricGrid
            metrics={[
              { label: '최근 검색 테스트 결과 수', value: ragSearchQuality.resultCount },
              { label: '검색 결과 없음 비율', value: ragSearchQuality.noResultRate },
              { label: '평균 similarity', value: ragSearchQuality.averageSimilarity },
            ]}
          />
          <p className="admin-data-note">{ragSearchQuality.basis}</p>
          <form className="admin-rag-search-form" onSubmit={onSearch}>
            <label className="field" htmlFor="admin-rag-search">
              <span>AI 참고 데이터 검색 테스트</span>
              <input
                id="admin-rag-search"
                type="search"
                placeholder="예: 율곡형 진로 걱정 현실적인 조언"
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
              />
            </label>
            <CommonButton
              type="submit"
              variant="secondary"
              disabled={searchStatus === 'loading'}
              isLoading={searchStatus === 'loading'}
              loadingLabel="검색 중..."
            >
              검색
            </CommonButton>
          </form>
          {searchMessage && (
            <p
              className={searchStatus === 'error' ? 'form-error' : 'admin-data-note'}
              role="status"
            >
              {searchMessage}
            </p>
          )}
          {searchResults.length > 0 && (
            <div className="admin-rag-search-results">
              {searchResults.map((result, index) => (
                <article key={`${result.title}-${index}`}>
                  <div>
                    <strong>{result.title}</strong>
                    <span>{getRagSourceTypeLabel(result.source_type)}</span>
                    {typeof result.similarity === 'number' && (
                      <em>{result.similarity.toFixed(3)}</em>
                    )}
                  </div>
                  <p>{createContentPreview(result.content)}</p>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="admin-quality-card">
          <h3>공공데이터 품질</h3>
          <MetricGrid metrics={publicDataMetrics} />
          <div className="admin-quality-subchart">
            <strong>카테고리별 데이터 수</strong>
            {toChartRows(publicDataStatus.categoryCounts).length === 0 ? (
              <p className="admin-empty-panel">아직 수집된 분석 데이터가 없습니다.</p>
            ) : (
              <div className="admin-bar-list">
                {toChartRows(publicDataStatus.categoryCounts).map((row) => (
                  <div className="admin-bar-row" key={row.label}>
                    <span>{row.label}</span>
                    <div className="admin-bar-track">
                      <i style={{ width: `${Math.max(row.percent, 4)}%` }} />
                    </div>
                    <strong>{formatNumber(row.value)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="admin-data-note">
            최종 조회/동기화 시각: {publicDataStatus.lastSyncedAt ? formatDateTime(publicDataStatus.lastSyncedAt) : '데이터 없음'}
          </p>
          {publicDataStatus.unavailableMetrics.length > 0 && (
            <p className="admin-data-note">
              {publicDataStatus.unavailableMetrics.join(', ')}은 수집 예정입니다.
            </p>
          )}
        </section>

        <section className="admin-quality-card">
          <h3>보강 필요 항목</h3>
          <ul className="admin-quality-action-list">
            {enrichmentItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </div>
    </article>
  )
}

function MetricGrid({
  metrics,
}: {
  metrics: Array<{ label: string; value: number | string }>
}) {
  return (
    <dl className="admin-quality-metric-grid">
      {metrics.map((metric) => (
        <div key={metric.label}>
          <dt>{metric.label}</dt>
          <dd>
            {typeof metric.value === 'number' ? formatNumber(metric.value) : metric.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

function createRagSearchQuality(
  searchStatus: RagSearchStatus,
  searchResults: RagSearchResult[],
) {
  if (searchStatus !== 'ready') {
    return {
      resultCount: '수집 전',
      noResultRate: '수집 전',
      averageSimilarity: '수집 전',
      basis: '관리자 검색 테스트를 실행하면 검색 테스트 기준으로 표시됩니다.',
    }
  }

  const similarities = searchResults
    .map((result) => result.similarity)
    .filter((similarity): similarity is number => typeof similarity === 'number')
  const averageSimilarity =
    similarities.length > 0
      ? similarities.reduce((sum, value) => sum + value, 0) / similarities.length
      : null

  return {
    resultCount: searchResults.length,
    noResultRate: searchResults.length === 0 ? '100%' : '0%',
    averageSimilarity:
      averageSimilarity === null ? '검색 테스트 기준' : averageSimilarity.toFixed(3),
    basis: '검색 테스트 기준입니다. 사용자 질문 원문은 저장하거나 표시하지 않습니다.',
  }
}

function createEnrichmentItems(
  publicDataStatus: AdminDashboard['publicDataStatus'],
  ragStatus: AdminDashboard['ragStatus'],
) {
  const items: string[] = []

  if (publicDataStatus.missingImageCount > 0) {
    items.push('이미지가 없는 관광지가 있습니다.')
  }
  if (publicDataStatus.missingCoordinateCount > 0) {
    items.push('좌표가 없는 장소는 지도 추천에서 제외될 수 있습니다.')
  }
  if (publicDataStatus.phoneMetricStatus === '수집 전' || publicDataStatus.missingPhoneCount > 0) {
    items.push('전화번호가 없는 장소는 상세 안내 품질이 낮을 수 있습니다.')
  }
  if (
    Math.min(
      ragStatus.tourismPlaceDocuments,
      ragStatus.seonbiPersonaDocuments,
      ragStatus.judgeModeDocuments,
      ragStatus.recommendationRuleDocuments,
    ) < 3
  ) {
    items.push('RAG 문서가 적은 유형은 AI 답변 품질이 낮을 수 있습니다.')
  }
  if (publicDataStatus.missingAddressCount > 0) {
    items.push('주소가 없는 장소는 상세 안내와 동선 설명 품질이 낮을 수 있습니다.')
  }
  if (
    publicDataStatus.duplicateTitleCount > 0 ||
    publicDataStatus.duplicateTitleAddressCount > 0
  ) {
    items.push('중복 의심 장소는 관리자 확인 후 정리하는 것이 좋습니다.')
  }

  return items.length > 0 ? items : ['현재 관측 기준으로 즉시 보강할 항목이 없습니다.']
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

function createAdminSectionOptions(
  dashboard: AdminDashboard,
  enrichmentData: YeongjuEnrichmentData | null,
): AdminSectionOption[] {
  const enrichmentTotal = enrichmentData
    ? enrichmentData.sourceInventory.reduce((sum, item) => sum + item.appliedRows, 0)
    : null

  return [
    {
      key: 'funnel',
      label: '사용자 행동',
      caption: '방문·추천·공유',
      value: `${formatNumber(dashboard.behaviorFunnel.length)}단계`,
      icon: 'funnel',
    },
    {
      key: 'quality',
      label: 'AI/데이터',
      caption: 'RAG·공공데이터',
      value: `${formatNumber(dashboard.ragStatus.totalDocuments)}문서`,
      icon: 'database',
    },
    {
      key: 'local',
      label: '영주 보강',
      caption: '로컬 데이터',
      value: enrichmentTotal === null ? '수집 중' : `${formatNumber(enrichmentTotal)}건`,
      icon: 'map',
    },
    {
      key: 'recommendations',
      label: '추천/저장',
      caption: '유형·코스',
      value: `${formatNumber(dashboard.summary.totalFavorites)}저장`,
      icon: 'chart',
    },
    {
      key: 'activity',
      label: '활동/보호',
      caption: '로그·원칙',
      value: `${formatNumber(dashboard.recentActivities.length)}건`,
      icon: 'shield',
    },
  ]
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

function getRagSourceTypeLabel(value: unknown) {
  if (value === 'tourism_place') return '관광지'
  if (value === 'seonbi_persona') return '선비유형'
  if (value === 'judge_mode') return '한마디 모드'
  if (value === 'recommendation_rule') return '추천 규칙'
  return '참고 데이터'
}

function createContentPreview(content: string) {
  const normalized = content.replace(/\s+/g, ' ').trim()
  return normalized.length > 140 ? `${normalized.slice(0, 140)}...` : normalized
}
