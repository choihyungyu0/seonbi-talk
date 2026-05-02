import type { SeonbiType } from '../seonbi-test/types'
import { getStoredAuthUser } from '../auth/authApi'
import { insertSupabaseRow } from '../../lib/supabase'

type AnalyticsEventType =
  | 'test_completed'
  | 'tourism_card_clicked'
  | 'judge_used'
  | 'judge_share_clicked'
  | 'result_share_clicked'
  | 'favorite_course_added'
  | 'favorite_course_removed'

interface AnalyticsPayload {
  seonbiType?: SeonbiType
  contentId?: string
  contentTitle?: string
  contentTypeId?: string
  metadata?: Record<string, string | number | boolean | null>
}

interface AnalyticsEvent extends AnalyticsPayload {
  eventType: AnalyticsEventType
  sessionId: string
  userId?: string
  createdAt: string
}

const analyticsTableName = 'analytics_events'
const sessionStorageKey = 'yeongju-seonbi-anonymous-session-id'
const fallbackStorageKey = 'yeongju-seonbi-analytics-events'
const maxFallbackEvents = 100

export async function trackEvent(
  eventType: AnalyticsEventType,
  payload: AnalyticsPayload = {},
) {
  const event = createAnalyticsEvent(eventType, payload)
  const result = await insertSupabaseRow(analyticsTableName, toSupabaseRow(event))

  if (!result.ok) {
    saveFallbackEvent(event)
  }
}

export function getAnonymousSessionId() {
  const savedSessionId = window.localStorage.getItem(sessionStorageKey)
  if (savedSessionId) return savedSessionId

  const sessionId = createRandomId()
  window.localStorage.setItem(sessionStorageKey, sessionId)
  return sessionId
}

function createAnalyticsEvent(
  eventType: AnalyticsEventType,
  payload: AnalyticsPayload,
): AnalyticsEvent {
  return {
    eventType,
    sessionId: getAnonymousSessionId(),
    userId: getStoredAuthUser()?.id,
    createdAt: new Date().toISOString(),
    seonbiType: payload.seonbiType,
    contentId: payload.contentId,
    contentTitle: payload.contentTitle,
    contentTypeId: payload.contentTypeId,
    metadata: payload.metadata,
  }
}

function toSupabaseRow(event: AnalyticsEvent) {
  return {
    event_type: event.eventType,
    session_id: event.sessionId,
    user_id: event.userId,
    created_at: event.createdAt,
    seonbi_type: event.seonbiType,
    content_id: event.contentId,
    content_title: event.contentTitle,
    content_type_id: event.contentTypeId,
    metadata: event.metadata ?? {},
  }
}

function saveFallbackEvent(event: AnalyticsEvent) {
  try {
    const currentEvents = loadFallbackEvents()
    const nextEvents = [...currentEvents, event].slice(-maxFallbackEvents)
    window.localStorage.setItem(fallbackStorageKey, JSON.stringify(nextEvents))
  } catch {
    // Analytics must never block the user-facing flow.
  }
}

function loadFallbackEvents(): AnalyticsEvent[] {
  const rawEvents = window.localStorage.getItem(fallbackStorageKey)
  if (!rawEvents) return []

  try {
    const parsed = JSON.parse(rawEvents)
    return Array.isArray(parsed) ? (parsed as AnalyticsEvent[]) : []
  } catch {
    return []
  }
}

function createRandomId() {
  if (crypto.randomUUID) return crypto.randomUUID()

  const randomValues = crypto.getRandomValues(new Uint32Array(4))
  return Array.from(randomValues, (value) => value.toString(16)).join('-')
}
