interface AdminLogoutRequest {
  method?: string
}

interface AdminLogoutResponse {
  status(code: number): AdminLogoutResponse
  json(body: AdminResponseBody): void
  setHeader(name: string, value: string): void
}

interface AdminResponseBody {
  ok: boolean
  message?: string
}

const adminSessionCookieName = 'seonbi_admin_session'

export default function handler(
  request: AdminLogoutRequest,
  response: AdminLogoutResponse,
) {
  response.setHeader('Cache-Control', 'no-store')

  if (request.method !== 'POST') {
    response.status(405).json({
      ok: false,
      message: '지원하지 않는 요청입니다.',
    })
    return
  }

  response.setHeader(
    'Set-Cookie',
    [
      `${adminSessionCookieName}=`,
      'HttpOnly',
      'Secure',
      'SameSite=Lax',
      'Path=/',
      'Max-Age=0',
    ].join('; '),
  )
  response.status(200).json({ ok: true })
}
