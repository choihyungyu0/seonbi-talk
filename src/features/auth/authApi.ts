import { getSupabaseConfig } from '../../lib/supabase'
import type { OAuthProvider } from './authTypes'

export interface AuthUser {
  id: string
  email?: string
  nickname?: string
}

interface AuthSession {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  user: AuthUser
}

interface SupabaseAuthUser {
  id: string
  email?: string
  user_metadata?: {
    nickname?: string
    name?: string
  }
}

interface SupabaseAuthResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  expires_at?: number
  user?: SupabaseAuthUser
}

interface SignUpResult {
  user: AuthUser
  signedIn: boolean
  requiresEmailConfirmation: boolean
}

type SupabaseSignupResponse = SupabaseAuthResponse | SupabaseAuthUser

type AuthChangeHandler = (user: AuthUser | null) => void

const authSessionKey = 'yeongju-seonbi-auth-session'
const authChangeEventName = 'yeongju-seonbi-auth-change'
const authReturnToKey = 'yeongju-auth-return-to'
const authHandlers = new Set<AuthChangeHandler>()

export async function signUp(
  email: string,
  password: string,
  nickname?: string,
): Promise<SignUpResult> {
  const response = await requestAuth<SupabaseSignupResponse>('signup', {
    method: 'POST',
    body: {
      email,
      password,
      data: nickname?.trim() ? { nickname: nickname.trim() } : undefined,
    },
  })
  const user = getSignupUser(response)
  const hasSession = isAuthResponse(response) && Boolean(response.access_token && user)

  if (hasSession) {
    saveSession(createSession({ ...response, user }))
    notifyAuthChange()
  }

  return {
    user: toAuthUser(user),
    signedIn: hasSession,
    requiresEmailConfirmation: !hasSession,
  }
}

export async function signIn(email: string, password: string) {
  const response = await requestAuth<SupabaseAuthResponse>(
    'token?grant_type=password',
    {
      method: 'POST',
      body: {
        email,
        password,
      },
    },
  )

  if (!response.access_token || !response.user) {
    throw new Error('로그인 응답을 확인할 수 없습니다.')
  }

  const session = createSession(response)
  saveSession(session)
  notifyAuthChange()
  return session.user
}

export function signInWithOAuthProvider(
  provider: OAuthProvider,
  returnTo = getSafeCurrentPath(),
) {
  const { url, isConfigured } = getSupabaseConfig()

  if (!isConfigured) {
    throw new Error('Supabase Auth 환경변수가 설정되지 않았습니다.')
  }

  const safeReturnTo = normalizeReturnTo(returnTo)
  if (safeReturnTo) {
    window.sessionStorage.setItem(authReturnToKey, safeReturnTo)
  }

  const redirectTo = `${window.location.origin}/auth/callback`
  const oauthUrl = `${url}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(
    redirectTo,
  )}`

  window.location.assign(oauthUrl)
}

export async function completeOAuthSignInFromUrl(
  url = window.location.href,
  hash = window.location.hash,
) {
  const params = getOAuthCallbackParams(url, hash)
  const errorMessage =
    params.get('error_description') ?? params.get('error') ?? params.get('message')

  if (errorMessage) {
    throw new Error('간편로그인 처리 중 문제가 발생했습니다.')
  }

  const accessToken = params.get('access_token')
  if (!accessToken) {
    throw new Error('간편로그인 세션을 확인할 수 없습니다.')
  }

  const user = await requestAuth<SupabaseAuthUser>('user', {
    method: 'GET',
    accessToken,
  })

  const session = createSession({
    access_token: accessToken,
    refresh_token: params.get('refresh_token') ?? undefined,
    expires_in: toNumber(params.get('expires_in')),
    expires_at: toNumber(params.get('expires_at')),
    user,
  })

  saveSession(session)
  notifyAuthChange()

  return session.user
}

export function consumeOAuthReturnTo() {
  const returnTo = normalizeReturnTo(window.sessionStorage.getItem(authReturnToKey))
  window.sessionStorage.removeItem(authReturnToKey)
  return returnTo
}

export async function signOut() {
  const session = getStoredSession()

  if (session) {
    await requestAuth('logout', {
      method: 'POST',
      accessToken: session.accessToken,
      allowFailure: true,
    })
  }

  clearSession()
  notifyAuthChange()
}

export async function getCurrentUser() {
  const session = getStoredSession()
  if (!session) return null

  try {
    const user = await requestAuth<SupabaseAuthUser>('user', {
      method: 'GET',
      accessToken: session.accessToken,
    })
    const authUser = toAuthUser(user)
    saveSession({ ...session, user: authUser })
    return authUser
  } catch {
    clearSession()
    notifyAuthChange()
    return null
  }
}

export function getStoredAuthUser() {
  return getStoredSession()?.user ?? null
}

export function getStoredAccessToken() {
  return getStoredSession()?.accessToken
}

export function onAuthStateChange(handler: AuthChangeHandler) {
  authHandlers.add(handler)

  function handleStorage(event: StorageEvent) {
    if (event.key === authSessionKey) handler(getStoredAuthUser())
  }

  function handleLocalChange() {
    handler(getStoredAuthUser())
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(authChangeEventName, handleLocalChange)

  return () => {
    authHandlers.delete(handler)
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(authChangeEventName, handleLocalChange)
  }
}

function createSession(response: SupabaseAuthResponse): AuthSession {
  if (!response.access_token || !response.user) {
    throw new Error('인증 세션을 만들 수 없습니다.')
  }

  return {
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    expiresAt: getExpiresAt(response),
    user: toAuthUser(response.user),
  }
}

function getExpiresAt(response: SupabaseAuthResponse) {
  if (response.expires_at) {
    return response.expires_at > 10_000_000_000
      ? response.expires_at
      : response.expires_at * 1000
  }

  return response.expires_in ? Date.now() + response.expires_in * 1000 : undefined
}

async function requestAuth<T = unknown>(
  path: string,
  options: {
    method: 'GET' | 'POST'
    body?: Record<string, unknown>
    accessToken?: string
    allowFailure?: boolean
  },
): Promise<T> {
  const { url, anonKey, isConfigured } = getSupabaseConfig()

  if (!isConfigured) {
    throw new Error('Supabase Auth 환경변수가 설정되지 않았습니다.')
  }

  const response = await fetch(`${url}/auth/v1/${path}`, {
    method: options.method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${options.accessToken ?? anonKey}`,
      'Content-Type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    if (options.allowFailure) return {} as T
    throw new Error(await getFriendlyAuthError(response))
  }

  return (await response.json().catch(() => ({}))) as T
}

async function getFriendlyAuthError(response: Response) {
  const data = (await response.json().catch(() => ({}))) as {
    msg?: string
    error_description?: string
    message?: string
  }
  const message = data.msg ?? data.error_description ?? data.message ?? ''

  if (message.includes('already registered') || message.includes('User already registered')) {
    return '이미 가입된 이메일입니다.'
  }
  if (message.includes('Password should be at least')) {
    return '비밀번호는 6자 이상이어야 합니다.'
  }
  if (response.status === 400 && message.includes('Email not confirmed')) {
    return '이메일 인증 후 로그인해주세요.'
  }
  if (response.status === 400 || response.status === 401) {
    return '이메일 또는 비밀번호를 확인해주세요.'
  }

  return '인증 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
}

function getSignupUser(response: SupabaseSignupResponse) {
  if (isAuthResponse(response) && response.user) return response.user
  if (isSupabaseAuthUser(response)) return response
  throw new Error('회원가입은 완료되었지만 사용자 정보를 확인할 수 없습니다.')
}

function isAuthResponse(response: SupabaseSignupResponse): response is SupabaseAuthResponse {
  return 'access_token' in response || 'refresh_token' in response || 'user' in response
}

function isSupabaseAuthUser(response: SupabaseSignupResponse): response is SupabaseAuthUser {
  return 'id' in response && typeof response.id === 'string'
}

function toAuthUser(user: SupabaseAuthUser | undefined): AuthUser {
  if (!user) throw new Error('사용자 정보를 확인할 수 없습니다.')

  return {
    id: user.id,
    email: user.email,
    nickname: user.user_metadata?.nickname ?? user.user_metadata?.name,
  }
}

function saveSession(session: AuthSession) {
  window.localStorage.setItem(authSessionKey, JSON.stringify(session))
}

function getStoredSession(): AuthSession | null {
  const rawSession = window.localStorage.getItem(authSessionKey)
  if (!rawSession) return null

  try {
    const session = JSON.parse(rawSession) as AuthSession
    return session.accessToken && session.user?.id ? session : null
  } catch {
    return null
  }
}

function clearSession() {
  window.localStorage.removeItem(authSessionKey)
}

function notifyAuthChange() {
  const user = getStoredAuthUser()
  authHandlers.forEach((handler) => handler(user))
  window.dispatchEvent(new Event(authChangeEventName))
}

function getOAuthCallbackParams(url: string, hash: string) {
  const params = new URLSearchParams(new URL(url).search)
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''))

  hashParams.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value)
  })

  return params
}

function getSafeCurrentPath() {
  return `${window.location.pathname}${window.location.search}`
}

function normalizeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return null
  if (value.startsWith('/auth/callback') || value.startsWith('/login')) return null
  return value
}

function toNumber(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}
