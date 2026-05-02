import { getSupabaseConfig } from '../../lib/supabase'

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
  user?: SupabaseAuthUser
}

type AuthChangeHandler = (user: AuthUser | null) => void

const authSessionKey = 'yeongju-seonbi-auth-session'
const authChangeEventName = 'yeongju-seonbi-auth-change'
const authHandlers = new Set<AuthChangeHandler>()

export async function signUp(email: string, password: string, nickname?: string) {
  const response = await requestAuth<SupabaseAuthResponse>('signup', {
    method: 'POST',
    body: {
      email,
      password,
      data: nickname?.trim() ? { nickname: nickname.trim() } : undefined,
    },
  })

  if (response.access_token && response.user) {
    saveSession(createSession(response))
    notifyAuthChange()
  }

  return toAuthUser(response.user)
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
    expiresAt: response.expires_in
      ? Date.now() + response.expires_in * 1000
      : undefined,
    user: toAuthUser(response.user),
  }
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

  if (response.status === 400 && message.includes('Email not confirmed')) {
    return '이메일 인증 후 로그인해주세요.'
  }
  if (response.status === 400 || response.status === 401) {
    return '이메일 또는 비밀번호를 확인해주세요.'
  }
  if (message.includes('already registered')) {
    return '이미 가입된 이메일입니다.'
  }

  return '인증 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
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
