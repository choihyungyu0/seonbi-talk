import { getStoredAccessToken, getStoredAuthUser } from '../auth/authApi'
import { trackEvent } from '../analytics/trackEvent'
import type { TourismContent } from '../tourism/tourismTypes'
import { getSupabaseConfig } from '../../lib/supabase'

export interface FavoriteCourse {
  user_id: string
  content_id: string
  content_type_id?: string
  title?: string
  address?: string
  first_image?: string
  map_x?: number
  map_y?: number
}

const favoriteTableName = 'favorite_courses'

export async function getFavoriteCourses() {
  const auth = getFavoriteAuth()
  if (!auth) return []

  const url = createFavoriteUrl()
  url.searchParams.set('select', '*')
  url.searchParams.set('user_id', `eq.${auth.userId}`)

  const response = await requestFavorites<FavoriteCourse[]>(url, {
    method: 'GET',
    accessToken: auth.accessToken,
  })

  return response ?? []
}

export async function isFavoriteCourse(contentId: string) {
  const auth = getFavoriteAuth()
  if (!auth) return false

  const url = createFavoriteUrl()
  url.searchParams.set('select', 'content_id')
  url.searchParams.set('user_id', `eq.${auth.userId}`)
  url.searchParams.set('content_id', `eq.${contentId}`)
  url.searchParams.set('limit', '1')

  const response = await requestFavorites<Array<Pick<FavoriteCourse, 'content_id'>>>(
    url,
    {
      method: 'GET',
      accessToken: auth.accessToken,
    },
  )

  return Boolean(response?.length)
}

export async function addFavoriteCourse(item: TourismContent) {
  const auth = getFavoriteAuth()
  if (!auth) throw new Error('로그인하면 관심 코스를 저장할 수 있습니다.')
  if (!item.contentId) throw new Error('저장할 관광지 식별자가 없습니다.')

  const favorite = createFavoriteCourse(auth.userId, item)
  const url = createFavoriteUrl()

  await requestFavorites(url, {
    method: 'POST',
    accessToken: auth.accessToken,
    body: favorite,
    prefer: 'resolution=merge-duplicates,return=minimal',
  })
  void trackEvent('favorite_course_added', {
    contentId: item.contentId,
    contentTitle: item.title,
    contentTypeId: item.contentTypeId,
  })
}

export async function removeFavoriteCourse(contentId: string) {
  const auth = getFavoriteAuth()
  if (!auth) throw new Error('로그인하면 관심 코스를 저장할 수 있습니다.')

  const url = createFavoriteUrl()
  url.searchParams.set('user_id', `eq.${auth.userId}`)
  url.searchParams.set('content_id', `eq.${contentId}`)

  await requestFavorites(url, {
    method: 'DELETE',
    accessToken: auth.accessToken,
    prefer: 'return=minimal',
  })
  void trackEvent('favorite_course_removed', {
    contentId,
  })
}

function createFavoriteCourse(userId: string, item: TourismContent): FavoriteCourse {
  return {
    user_id: userId,
    content_id: item.contentId ?? '',
    content_type_id: item.contentTypeId,
    title: item.title,
    address: item.address,
    first_image: item.firstImage || item.firstImage2,
    map_x: item.mapX,
    map_y: item.mapY,
  }
}

function getFavoriteAuth() {
  const user = getStoredAuthUser()
  const accessToken = getStoredAccessToken()
  if (!user?.id || !accessToken) return null

  return {
    userId: user.id,
    accessToken,
  }
}

function createFavoriteUrl() {
  const { url } = getSupabaseConfig()
  return new URL(`${url}/rest/v1/${favoriteTableName}`)
}

async function requestFavorites<T = unknown>(
  url: URL,
  options: {
    method: 'GET' | 'POST' | 'DELETE'
    accessToken: string
    body?: FavoriteCourse
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
    throw new Error('관심 코스 처리 중 문제가 발생했습니다.')
  }

  return (await response.json().catch(() => undefined)) as T | undefined
}
