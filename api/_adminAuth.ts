/* global Buffer, process */
import { createHmac, timingSafeEqual } from 'node:crypto'

const adminSessionCookieName = 'seonbi_admin_session'

export function hasValidAdminSession(cookieHeader: string) {
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
