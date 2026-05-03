/* global Buffer, process */
import { createHmac, timingSafeEqual } from 'node:crypto'

interface AdminSessionRequest {
  method?: string
  headers?: {
    cookie?: string
  }
}

interface AdminSessionResponse {
  status(code: number): AdminSessionResponse
  json(body: AdminResponseBody): void
  setHeader(name: string, value: string): void
}

interface AdminResponseBody {
  ok: boolean
  message?: string
}

const adminSessionCookieName = 'seonbi_admin_session'

export default function handler(
  request: AdminSessionRequest,
  response: AdminSessionResponse,
) {
  response.setHeader('Cache-Control', 'no-store')

  if (request.method !== 'GET') {
    response.status(405).json({
      ok: false,
      message: '지원하지 않는 요청입니다.',
    })
    return
  }

  const adminSessionSecret = process.env.ADMIN_SESSION_SECRET
  if (!adminSessionSecret) {
    response.status(200).json({ ok: false })
    return
  }

  const sessionCookie = parseCookies(request.headers?.cookie ?? '')[adminSessionCookieName]
  if (!sessionCookie) {
    response.status(200).json({ ok: false })
    return
  }

  response.status(200).json({
    ok: safeEqual(sessionCookie, createAdminSessionToken(adminSessionSecret)),
  })
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
