/* global Buffer, process */
import { createHmac, timingSafeEqual } from 'node:crypto'
import { createEmptyRagStatus, getRagDocumentStatus } from '../_rag.js'

type DashboardRange = 'today' | '7d' | '30d' | 'all'
type SeonbiType = 'toegye' | 'yulgok' | 'cheosa' | 'uguk'

interface AdminDashboardRequest {
  method?: string
  headers?: {
    cookie?: string
  }
  query?: {
    range?: string | string[]
  }
}

interface AdminDashboardResponse {
  status(code: number): AdminDashboardResponse
  json(body: unknown): void
  setHeader(name: string, value: string): void
}

interface AnalyticsEventRow {
  event_type?: string
  created_at?: string
  seonbi_type?: string | null
  content_id?: string | null
  content_title?: string | null
  content_type_id?: string | null
  metadata?: Record<string, unknown> | null
}

interface FavoriteCourseRow {
  content_id?: string | null
  content_type_id?: string | null
  title?: string | null
  address?: string | null
  first_image?: string | null
  map_x?: number | null
  map_y?: number | null
  created_at?: string
}

interface JudgeHistoryRow {
  seonbi_type?: string | null
  judge_mode?: string | null
  has_image?: boolean | null
  has_text?: boolean | null
  created_at?: string
}

const adminSessionCookieName = 'seonbi_admin_session'
const seonbiTypes: SeonbiType[] = ['toegye', 'yulgok', 'cheosa', 'uguk']
const contentTypeLabels: Record<string, string> = {
  '12': '관광지',
  '14': '문화시설',
  '15': '축제/공연',
  '25': '여행코스',
  '28': '레포츠',
  '32': '숙박',
  '38': '쇼핑',
  '39': '음식점',
}
const funnelEventAliases = {
  homeVisit: ['home_visit', 'home_viewed', 'page_view_home', 'page_home_view'],
  testCompleted: ['test_completed', 'seonbi_test_completed'],
  courseViewed: [
    'tourism_card_clicked',
    'course_viewed',
    'course_recommendation_viewed',
  ],
  favoriteSaved: [
    'favorite_course_added',
    'favorite_course_saved',
    'favorite_course_created',
  ],
  judgeCreated: ['judge_used', 'judge_created'],
  resultShared: ['result_share_clicked', 'judge_share_clicked', 'result_shared'],
} as const

export default async function handler(
  request: AdminDashboardRequest,
  response: AdminDashboardResponse,
) {
  response.setHeader('Cache-Control', 'no-store')

  if (request.method !== 'GET') {
    response.status(405).json({
      ok: false,
      message: '지원하지 않는 요청입니다.',
    })
    return
  }

  if (!hasValidAdminSession(request.headers?.cookie ?? '')) {
    response.status(401).json({
      ok: false,
      message: '관리자 세션이 필요합니다.',
    })
    return
  }

  const supabase = getSupabaseServerConfig()
  if (!supabase) {
    response.status(200).json(createEmptyDashboard())
    return
  }

  const range = normalizeRange(request.query?.range)
  const dateFilter = getDateFilter(range)

  const [analyticsEvents, favoriteCourses, judgeHistories, totalUsers, ragStatus] =
    await Promise.all([
      fetchSupabaseRows<AnalyticsEventRow>(
        supabase,
        'analytics_events',
        'event_type,created_at,seonbi_type,content_id,content_title,content_type_id,metadata',
        dateFilter,
        1000,
      ),
      fetchSupabaseRows<FavoriteCourseRow>(
        supabase,
        'favorite_courses',
        'content_id,content_type_id,title,address,first_image,map_x,map_y,created_at',
        dateFilter,
        1000,
      ),
      fetchSupabaseRows<JudgeHistoryRow>(
        supabase,
        'judge_histories',
        'seonbi_type,judge_mode,has_image,has_text,created_at',
        dateFilter,
        1000,
      ),
      fetchTotalUsers(supabase),
      getRagDocumentStatus(),
    ])

  response.status(200).json({
    ok: true,
    range,
    dashboard: createDashboard({
      analyticsEvents,
      favoriteCourses,
      judgeHistories,
      totalUsers,
      ragStatus,
    }),
  })
}

function createDashboard(input: {
  analyticsEvents: AnalyticsEventRow[]
  favoriteCourses: FavoriteCourseRow[]
  judgeHistories: JudgeHistoryRow[]
  totalUsers: number
  ragStatus: ReturnType<typeof createEmptyRagStatus>
}) {
  const judgeStats = createJudgeStats(input.judgeHistories, input.analyticsEvents)
  const courseStats = createCourseStats(input.favoriteCourses, input.analyticsEvents)
  const behaviorFunnel = createBehaviorFunnel(input.analyticsEvents)
  const publicDataStatus = createPublicDataStatus(
    input.favoriteCourses,
    input.analyticsEvents,
  )

  return {
    summary: {
      totalUsers: input.totalUsers,
      totalEvents: input.analyticsEvents.length,
      totalFavorites: input.favoriteCourses.length,
      totalJudgeHistories: input.judgeHistories.length,
    },
    seonbiTypeDistribution: createSeonbiTypeDistribution(input.analyticsEvents),
    judgeStats,
    courseStats,
    behaviorFunnel,
    publicDataStatus,
    ragStatus: input.ragStatus,
    insights: createDashboardInsights({
      analyticsEvents: input.analyticsEvents,
      favoriteCourses: input.favoriteCourses,
      judgeHistories: input.judgeHistories,
      behaviorFunnel,
      courseStats,
      ragStatus: input.ragStatus,
    }),
    recentActivities: createRecentActivities(input.analyticsEvents),
  }
}

function createEmptyDashboard() {
  return {
    ok: true,
    range: 'all',
    dashboard: createDashboard({
      analyticsEvents: [],
      favoriteCourses: [],
      judgeHistories: [],
      totalUsers: 0,
      ragStatus: createEmptyRagStatus(),
    }),
  }
}

function createSeonbiTypeDistribution(rows: AnalyticsEventRow[]) {
  return Object.fromEntries(
    seonbiTypes.map((type) => [
      type,
      rows.filter((row) => row.event_type === 'test_completed' && row.seonbi_type === type)
        .length,
    ]),
  ) as Record<SeonbiType, number>
}

function createJudgeStats(
  judgeHistories: JudgeHistoryRow[],
  analyticsEvents: AnalyticsEventRow[],
) {
  const modeCounts = countBy(
    judgeHistories,
    (row) => normalizeText(row.judge_mode) ?? 'default',
  )
  const typeCounts = countBy(judgeHistories, (row) => normalizeText(row.seonbi_type))
  const imageEvents = analyticsEvents.filter(
    (row) => row.event_type === 'judge_image_used',
  ).length

  return {
    textBasedCount: judgeHistories.filter((row) => row.has_text).length,
    imageBasedCount:
      judgeHistories.filter((row) => row.has_image).length ||
      imageEvents,
    modeCounts,
    typeCounts,
  }
}

function createCourseStats(
  favoriteCourses: FavoriteCourseRow[],
  analyticsEvents: AnalyticsEventRow[],
) {
  const favoriteMap = new Map<
    string,
    { title: string; contentType: string; count: number }
  >()

  favoriteCourses.forEach((row) => {
    const key = normalizeText(row.content_id) ?? normalizeText(row.title)
    if (!key) return

    const current = favoriteMap.get(key)
    if (current) {
      current.count += 1
      return
    }

    favoriteMap.set(key, {
      title: normalizeText(row.title) ?? '제목 없는 코스',
      contentType: getContentTypeLabel(row.content_type_id),
      count: 1,
    })
  })

  const contentTypeCounts = countBy(
    [
      ...favoriteCourses.map((row) => row.content_type_id),
      ...analyticsEvents.map((row) => row.content_type_id),
    ],
    (contentTypeId) => getContentTypeLabel(contentTypeId),
  )

  return {
    favoriteTopCourses: Array.from(favoriteMap.values())
      .sort((first, second) => second.count - first.count)
      .slice(0, 5),
    contentTypeCounts,
  }
}

function createBehaviorFunnel(rows: AnalyticsEventRow[]) {
  const steps = [
    {
      key: 'home',
      label: '홈 방문',
      eventTypes: funnelEventAliases.homeVisit,
    },
    {
      key: 'test',
      label: '선비유형 테스트 완료',
      eventTypes: funnelEventAliases.testCompleted,
    },
    {
      key: 'course',
      label: '추천 코스 조회',
      eventTypes: funnelEventAliases.courseViewed,
    },
    {
      key: 'favorite',
      label: '관심 코스 저장',
      eventTypes: funnelEventAliases.favoriteSaved,
    },
    {
      key: 'judge',
      label: '선비의 한마디 생성',
      eventTypes: funnelEventAliases.judgeCreated,
    },
    {
      key: 'share',
      label: '결과 공유',
      eventTypes: funnelEventAliases.resultShared,
    },
  ]

  return steps.map((step, index) => {
    const count = countEventsByAliases(rows, step.eventTypes)
    const previousStep = index > 0 ? steps[index - 1] : null
    const previousCount = previousStep ? countEventsByAliases(rows, previousStep.eventTypes) : count
    const rawConversionRate =
      index === 0 || previousCount === 0
        ? null
        : Math.round((count / previousCount) * 1000) / 10
    const hasDirectEntry = Boolean(rawConversionRate && rawConversionRate > 100)

    return {
      key: step.key,
      label: step.label,
      count,
      conversionRate:
        rawConversionRate === null ? null : Math.min(rawConversionRate, 100),
      hasDirectEntry,
    }
  })
}

function countEventsByAliases(
  rows: AnalyticsEventRow[],
  eventTypes: readonly string[],
) {
  return rows.filter((row) => eventTypes.includes(row.event_type ?? '')).length
}

function createDashboardInsights(input: {
  analyticsEvents: AnalyticsEventRow[]
  favoriteCourses: FavoriteCourseRow[]
  judgeHistories: JudgeHistoryRow[]
  behaviorFunnel: ReturnType<typeof createBehaviorFunnel>
  courseStats: ReturnType<typeof createCourseStats>
  ragStatus: ReturnType<typeof createEmptyRagStatus>
}) {
  const insights: string[] = []
  const totalBehaviorSignals =
    input.analyticsEvents.length +
    input.favoriteCourses.length +
    input.judgeHistories.length

  if (totalBehaviorSignals < 3) {
    return ['아직 충분한 분석 데이터가 없습니다.']
  }

  const strongestFunnelStep = input.behaviorFunnel
    .filter((step) => step.count > 0)
    .sort((first, second) => second.count - first.count)[0]

  if (strongestFunnelStep?.key === 'course') {
    insights.push('추천 코스 조회가 가장 활발합니다.')
  } else if (strongestFunnelStep?.key === 'test') {
    insights.push('선비유형 테스트 완료가 활발하게 일어나고 있습니다.')
  } else if (strongestFunnelStep?.key === 'judge') {
    insights.push('선비의 한마디 생성이 증가하고 있어 AI 상호작용 기능의 활용도가 있습니다.')
  }

  const testStep = input.behaviorFunnel.find((step) => step.key === 'test')
  const courseStep = input.behaviorFunnel.find((step) => step.key === 'course')
  if (testStep && courseStep && testStep.count > 0 && courseStep.count > 0) {
    insights.push('선비유형 테스트 완료 후 추천 코스로 이어지는 흐름이 확인됩니다.')
  }

  const favoriteStep = input.behaviorFunnel.find((step) => step.key === 'favorite')
  if (
    courseStep &&
    favoriteStep &&
    courseStep.count >= 5 &&
    favoriteStep.count / courseStep.count < 0.2
  ) {
    insights.push('관심 코스 저장률이 낮아 저장 버튼 노출 개선 여지가 있습니다.')
  }

  if (input.judgeHistories.length > 0) {
    insights.push('선비의 한마디 생성이 확인되어 AI 상호작용 기능이 사용되고 있습니다.')
  }

  if (input.ragStatus.totalDocuments > 0) {
    insights.push(`AI 참고 데이터 ${input.ragStatus.totalDocuments}개가 등록되어 있습니다.`)
  }

  if (Object.keys(input.courseStats.contentTypeCounts).length > 0) {
    const topContentType = Object.entries(input.courseStats.contentTypeCounts).sort(
      (first, second) => second[1] - first[1],
    )[0]
    if (topContentType) {
      insights.push(`${topContentType[0]} 카테고리 반응이 가장 많이 관측되었습니다.`)
    }
  }

  return dedupeInsights(insights).slice(0, 5)
}

function dedupeInsights(insights: string[]) {
  return Array.from(new Set(insights))
}

function createPublicDataStatus(
  favoriteCourses: FavoriteCourseRow[],
  analyticsEvents: AnalyticsEventRow[],
) {
  const observedRows = [
    ...favoriteCourses.map((row) => ({
      contentTypeId: row.content_type_id,
      contentId: row.content_id,
      title: row.title,
      address: row.address,
      hasCoordinates:
        row.map_x !== undefined &&
        row.map_x !== null &&
        row.map_y !== undefined &&
        row.map_y !== null,
      hasImage: Boolean(normalizeText(row.first_image)),
      hasAddress: Boolean(normalizeText(row.address)),
      hasPhone: null,
      createdAt: row.created_at,
    })),
    ...analyticsEvents
      .filter((row) => normalizeText(row.content_id) || normalizeText(row.content_type_id))
      .map((row) => ({
        contentTypeId: row.content_type_id,
        contentId: row.content_id,
        title: row.content_title,
        address: null,
        hasCoordinates: null,
        hasImage: null,
        hasAddress: null,
        hasPhone: null,
        createdAt: row.created_at,
      })),
  ]
  const uniqueRows = dedupeObservedPublicData(observedRows)
  const contentTypeCounts = countBy(uniqueRows, (row) => getContentTypeLabel(row.contentTypeId))
  const latestDate = uniqueRows
    .map((row) => normalizeText(row.createdAt))
    .filter(Boolean)
    .sort((first, second) => String(second).localeCompare(String(first)))[0]

  return {
    basis: '저장/이벤트 관측 기준',
    periodSensitive: true,
    totalPlaceCount: uniqueRows.length,
    attractionCount: contentTypeCounts['관광지'] ?? 0,
    cultureCount: contentTypeCounts['문화시설'] ?? 0,
    accommodationCount: contentTypeCounts['숙박'] ?? 0,
    restaurantCount: contentTypeCounts['음식점'] ?? 0,
    categoryCounts: contentTypeCounts,
    missingCoordinateCount: uniqueRows.filter((row) => row.hasCoordinates === false)
      .length,
    missingImageCount: uniqueRows.filter((row) => row.hasImage === false).length,
    missingAddressCount: uniqueRows.filter((row) => row.hasAddress === false).length,
    missingPhoneCount: 0,
    phoneMetricStatus: '수집 전',
    duplicateTitleCount: countDuplicateGroups(uniqueRows, (row) => row.title),
    duplicateTitleAddressCount: countDuplicateGroups(uniqueRows, (row) =>
      row.title && row.address ? `${row.title}|${row.address}` : null,
    ),
    mapUnavailableCount: uniqueRows.filter((row) => row.hasCoordinates === false)
      .length,
    lastSyncedAt: latestDate ?? null,
    unavailableMetrics:
      uniqueRows.length === 0
        ? ['TourAPI 전체 동기화 총량', '전화번호 누락 수']
        : ['전화번호 누락 수'],
  }
}

function dedupeObservedPublicData(
  rows: Array<{
    contentTypeId?: string | null
    contentId?: string | null
    title?: string | null
    address?: string | null
    hasCoordinates: boolean | null
    hasImage: boolean | null
    hasAddress: boolean | null
    hasPhone: boolean | null
    createdAt?: string
  }>,
) {
  const rowMap = new Map<string, (typeof rows)[number]>()

  rows.forEach((row) => {
    const key =
      normalizeText(row.contentId) ??
      [normalizeText(row.contentTypeId), normalizeText(row.createdAt)]
        .filter(Boolean)
        .join(':')
    if (!key) return

    const current = rowMap.get(key)
    rowMap.set(key, {
      ...current,
      ...row,
      title: current?.title ?? row.title,
      address: current?.address ?? row.address,
      hasCoordinates: current?.hasCoordinates ?? row.hasCoordinates,
      hasImage: current?.hasImage ?? row.hasImage,
      hasAddress: current?.hasAddress ?? row.hasAddress,
      hasPhone: current?.hasPhone ?? row.hasPhone,
    })
  })

  return Array.from(rowMap.values())
}

function countDuplicateGroups<T>(items: T[], getKey: (item: T) => string | null | undefined) {
  return Object.values(countBy(items, getKey)).filter((count) => count > 1).length
}

function createRecentActivities(rows: AnalyticsEventRow[]) {
  return [...rows]
    .sort((first, second) =>
      String(second.created_at ?? '').localeCompare(String(first.created_at ?? '')),
    )
    .slice(0, 10)
    .map((row) => ({
      eventType: normalizeText(row.event_type) ?? 'unknown',
      createdAt: normalizeText(row.created_at) ?? '',
      summary: getActivitySummary(row),
    }))
}

function getActivitySummary(row: AnalyticsEventRow) {
  if (row.event_type === 'home_visit') return '홈 방문'
  if (row.event_type === 'test_completed') return '선비유형 테스트 완료'
  if (row.event_type === 'tourism_card_clicked') return '관광지 카드 클릭'
  if (row.event_type === 'judge_image_used') return '사진 기반 한마디 생성'
  if (row.event_type === 'judge_used') return '선비의 한마디 생성'
  if (row.event_type === 'favorite_course_added') return '관심 코스 저장'
  if (row.event_type === 'favorite_course_removed') return '관심 코스 해제'
  if (row.event_type === 'judge_share_clicked') return '한마디 공유'
  if (row.event_type === 'result_share_clicked') return '선비유형 결과 공유'
  return '사용자 활동'
}

async function fetchSupabaseRows<T>(
  supabase: SupabaseServerConfig,
  tableName: string,
  select: string,
  dateFilter: string | null,
  limit: number,
) {
  const url = new URL(`${supabase.url}/rest/v1/${tableName}`)
  url.searchParams.set('select', select)
  url.searchParams.set('order', 'created_at.desc')
  url.searchParams.set('limit', String(limit))
  if (dateFilter) url.searchParams.set('created_at', `gte.${dateFilter}`)

  const response = await fetch(url, {
    method: 'GET',
    headers: createSupabaseHeaders(supabase),
  })

  if (!response.ok) return []
  const data = await response.json().catch(() => [])
  return Array.isArray(data) ? (data as T[]) : []
}

async function fetchTotalUsers(supabase: SupabaseServerConfig) {
  if (!supabase.usesServiceRole) return 0

  const url = new URL(`${supabase.url}/auth/v1/admin/users`)
  url.searchParams.set('page', '1')
  url.searchParams.set('per_page', '1')

  const response = await fetch(url, {
    method: 'GET',
    headers: createSupabaseHeaders(supabase),
  })

  if (!response.ok) return 0
  const totalCount = response.headers.get('x-total-count')
  if (totalCount) return Number(totalCount) || 0

  const data = (await response.json().catch(() => ({}))) as {
    total?: unknown
    users?: unknown
  }
  if (typeof data.total === 'number') return data.total
  return Array.isArray(data.users) ? data.users.length : 0
}

interface SupabaseServerConfig {
  url: string
  key: string
  usesServiceRole: boolean
}

function getSupabaseServerConfig(): SupabaseServerConfig | null {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY
  const key = serviceRoleKey ?? anonKey

  if (!url || !key) return null

  return {
    url,
    key,
    usesServiceRole: Boolean(serviceRoleKey),
  }
}

function createSupabaseHeaders(supabase: SupabaseServerConfig) {
  return {
    apikey: supabase.key,
    Authorization: `Bearer ${supabase.key}`,
    'Content-Type': 'application/json',
  }
}

function getDateFilter(range: DashboardRange) {
  if (range === 'all') return null

  const date = new Date()
  if (range === 'today') {
    date.setHours(0, 0, 0, 0)
  } else {
    date.setDate(date.getDate() - (range === '7d' ? 7 : 30))
  }

  return date.toISOString()
}

function normalizeRange(value: string | string[] | undefined): DashboardRange {
  const range = Array.isArray(value) ? value[0] : value
  if (range === 'today' || range === '7d' || range === '30d' || range === 'all') {
    return range
  }
  return '30d'
}

function hasValidAdminSession(cookieHeader: string) {
  const adminSessionSecret = process.env.ADMIN_SESSION_SECRET
  if (!adminSessionSecret) return false

  const sessionCookie = parseCookies(cookieHeader)[adminSessionCookieName]
  if (!sessionCookie) return false

  return safeEqual(sessionCookie, createAdminSessionToken(adminSessionSecret))
}

function parseCookies(cookieHeader: string) {
  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const separatorIndex = cookie.indexOf('=')
        if (separatorIndex === -1) return [cookie, '']
        return [
          cookie.slice(0, separatorIndex),
          decodeURIComponent(cookie.slice(separatorIndex + 1)),
        ]
      }),
  )
}

function createAdminSessionToken(secret: string) {
  return createHmac('sha256', secret).update('seonbi-admin-session').digest('hex')
}

function safeEqual(firstValue: string, secondValue: string) {
  const firstBuffer = Buffer.from(firstValue)
  const secondBuffer = Buffer.from(secondValue)
  if (firstBuffer.length !== secondBuffer.length) return false
  return timingSafeEqual(firstBuffer, secondBuffer)
}

function countBy<T>(items: T[], getKey: (item: T) => string | null | undefined) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = getKey(item)
    if (!key) return counts
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})
}

function getContentTypeLabel(contentTypeId: string | null | undefined) {
  const id = normalizeText(contentTypeId)
  if (!id) return '기타'
  return contentTypeLabels[id] ?? `유형 ${id}`
}

function normalizeText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}
