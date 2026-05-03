import { getStoredAccessToken, getStoredAuthUser } from '../auth/authApi'
import type { SeonbiType } from '../seonbi-test/types'
import type { JudgeMode, JudgeResult } from './judgeTypes'
import { getSupabaseConfig } from '../../lib/supabase'

export interface JudgeHistory {
  id?: string
  user_id: string
  seonbi_type?: SeonbiType
  advice: string
  modern_translation: string
  share_text: string
  judge_mode?: JudgeMode
  has_image: boolean
  has_text: boolean
  created_at?: string
}

export interface SaveJudgeHistoryInput {
  seonbiType: SeonbiType
  result: JudgeResult
  judgeMode: JudgeMode
  hasImage: boolean
  hasText: boolean
}

const judgeHistoryTableName = 'judge_histories'

export async function saveJudgeHistory(input: SaveJudgeHistoryInput) {
  const auth = getJudgeHistoryAuth()
  if (!auth) return { ok: false, skipped: true }

  const row: JudgeHistory = {
    user_id: auth.userId,
    seonbi_type: input.seonbiType,
    advice: input.result.seonbiAdvice,
    modern_translation: input.result.modernTranslation,
    share_text: input.result.shareText,
    judge_mode: input.judgeMode,
    has_image: input.hasImage,
    has_text: input.hasText,
  }

  try {
    await requestJudgeHistories(createJudgeHistoryUrl(), {
      method: 'POST',
      accessToken: auth.accessToken,
      body: row,
      prefer: 'return=minimal',
    })
    return { ok: true, skipped: false }
  } catch {
    if (row.judge_mode) {
      const legacyRow = { ...row }
      delete legacyRow.judge_mode
      try {
        await requestJudgeHistories(createJudgeHistoryUrl(), {
          method: 'POST',
          accessToken: auth.accessToken,
          body: legacyRow,
          prefer: 'return=minimal',
        })
        return { ok: true, skipped: false }
      } catch {
        return { ok: false, skipped: false }
      }
    }
    return { ok: false, skipped: false }
  }
}

export async function getRecentJudgeHistories(limit = 5) {
  const auth = getJudgeHistoryAuth()
  if (!auth) return []

  const url = createJudgeHistoryUrl()
  url.searchParams.set('select', '*')
  url.searchParams.set('user_id', `eq.${auth.userId}`)
  url.searchParams.set('order', 'created_at.desc')
  url.searchParams.set('limit', String(limit))

  const response = await requestJudgeHistories<JudgeHistory[]>(url, {
    method: 'GET',
    accessToken: auth.accessToken,
  })

  return response ?? []
}

export async function deleteJudgeHistory(historyId: string) {
  const auth = getJudgeHistoryAuth()
  if (!auth) throw new Error('로그인 후 삭제할 수 있습니다.')

  const url = createJudgeHistoryUrl()
  url.searchParams.set('id', `eq.${historyId}`)
  url.searchParams.set('user_id', `eq.${auth.userId}`)

  await requestJudgeHistories(url, {
    method: 'DELETE',
    accessToken: auth.accessToken,
    prefer: 'return=minimal',
  })
}

function getJudgeHistoryAuth() {
  const user = getStoredAuthUser()
  const accessToken = getStoredAccessToken()
  if (!user?.id || !accessToken) return null

  return {
    userId: user.id,
    accessToken,
  }
}

function createJudgeHistoryUrl() {
  const { url } = getSupabaseConfig()
  return new URL(`${url}/rest/v1/${judgeHistoryTableName}`)
}

async function requestJudgeHistories<T = unknown>(
  url: URL,
  options: {
    method: 'GET' | 'POST' | 'DELETE'
    accessToken: string
    body?: JudgeHistory
    prefer?: string
  },
) {
  const { anonKey, isConfigured } = getSupabaseConfig()
  if (!isConfigured) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  }

  const response = await fetch(url, {
    method: options.method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${options.accessToken}`,
      'Content-Type': 'application/json',
      Prefer: options.prefer ?? 'return=representation',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    throw new Error('선비의 한마디 기록 처리 중 문제가 발생했습니다.')
  }

  return (await response.json().catch(() => undefined)) as T | undefined
}
