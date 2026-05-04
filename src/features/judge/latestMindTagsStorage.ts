import type { JudgeAnalysis } from './judgeTypes'

export interface StoredMindTags {
  emotionTag?: string
  situationTag?: string
  adviceTag?: string
  savedAt: string
}

const latestMindTagsStorageKey = 'yeongju-seonbi-latest-mind-tags'
const latestMindTagsMaxAgeMs = 7 * 24 * 60 * 60 * 1000

export function saveLatestMindTags(analysis: JudgeAnalysis | undefined) {
  if (typeof window === 'undefined') return

  const mindTags = sanitizeMindTags(analysis)
  if (!hasAnyMindTag(mindTags)) return

  try {
    window.localStorage.setItem(
      latestMindTagsStorageKey,
      JSON.stringify({
        ...mindTags,
        savedAt: new Date().toISOString(),
      }),
    )
  } catch {
    // 마음 태그 저장 실패는 사용자 흐름을 막지 않는다.
  }
}

export function loadLatestMindTags() {
  if (typeof window === 'undefined') return null

  try {
    const rawValue = window.localStorage.getItem(latestMindTagsStorageKey)
    if (!rawValue) return null

    const parsedValue = JSON.parse(rawValue) as Partial<StoredMindTags>
    if (!isFreshSavedAt(parsedValue.savedAt)) {
      window.localStorage.removeItem(latestMindTagsStorageKey)
      return null
    }

    const mindTags = sanitizeMindTags(parsedValue)
    return hasAnyMindTag(mindTags) ? mindTags : null
  } catch {
    return null
  }
}

function sanitizeMindTags(value: Partial<JudgeAnalysis> | undefined) {
  return {
    emotionTag: sanitizeTag(value?.emotionTag),
    situationTag: sanitizeTag(value?.situationTag),
    adviceTag: sanitizeTag(value?.adviceTag),
  }
}

function sanitizeTag(value: unknown) {
  if (typeof value !== 'string') return undefined
  const tag = value.replace(/\s+/g, ' ').trim().slice(0, 12)
  return tag || undefined
}

function hasAnyMindTag(value: Partial<JudgeAnalysis>) {
  return Boolean(value.emotionTag || value.situationTag || value.adviceTag)
}

function isFreshSavedAt(value: unknown) {
  if (typeof value !== 'string') return false
  const savedAtTime = new Date(value).getTime()
  if (Number.isNaN(savedAtTime)) return false
  return Date.now() - savedAtTime <= latestMindTagsMaxAgeMs
}
