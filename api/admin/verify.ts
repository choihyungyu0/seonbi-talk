/* global Buffer, process */
import { createHmac, timingSafeEqual } from 'node:crypto'

interface AdminVerifyRequest {
  method?: string
  body?: unknown
}

interface AdminVerifyResponse {
  status(code: number): AdminVerifyResponse
  json(body: AdminResponseBody): void
  setHeader(name: string, value: string): void
}

interface AdminResponseBody {
  ok: boolean
  message?: string
}

interface AdminVerifyBody {
  code?: unknown
}

const adminSessionCookieName = 'seonbi_admin_session'
const adminSessionMaxAge = 60 * 60 * 2
const invalidAdminCodeMessage = '관리자 코드가 올바르지 않습니다.'

export default function handler(
  request: AdminVerifyRequest,
  response: AdminVerifyResponse,
) {
  response.setHeader('Cache-Control', 'no-store')

  if (request.method !== 'POST') {
    response.status(405).json({
      ok: false,
      message: '지원하지 않는 요청입니다.',
    })
    return
  }

  const adminAccessCode = process.env.ADMIN_ACCESS_CODE
  const adminSessionSecret = process.env.ADMIN_SESSION_SECRET
  if (!adminAccessCode || !adminSessionSecret) {
    response.status(200).json({
      ok: false,
      message: invalidAdminCodeMessage,
    })
    return
  }

  const body = parseRequestBody(request.body)
  const submittedCode = typeof body.code === 'string' ? body.code : ''

  if (!safeEqual(submittedCode, adminAccessCode)) {
    response.status(200).json({
      ok: false,
      message: invalidAdminCodeMessage,
    })
    return
  }

  response.setHeader(
    'Set-Cookie',
    serializeAdminCookie(createAdminSessionToken(adminSessionSecret), adminSessionMaxAge),
  )
  response.status(200).json({
    ok: true,
  })
}

function parseRequestBody(body: unknown): AdminVerifyBody {
  if (typeof body !== 'string') return body as AdminVerifyBody

  try {
    return JSON.parse(body) as AdminVerifyBody
  } catch {
    return {}
  }
}

function createAdminSessionToken(secret: string) {
  return createHmac('sha256', secret).update('seonbi-admin-session').digest('hex')
}

function serializeAdminCookie(value: string, maxAge: number) {
  return [
    `${adminSessionCookieName}=${value}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Path=/',
    `Max-Age=${maxAge}`,
  ].join('; ')
}

function safeEqual(firstValue: string, secondValue: string) {
  const firstBuffer = Buffer.from(firstValue)
  const secondBuffer = Buffer.from(secondValue)
  if (firstBuffer.length !== secondBuffer.length) return false
  return timingSafeEqual(firstBuffer, secondBuffer)
}
