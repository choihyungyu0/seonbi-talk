import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import adminDashboardHandler from './api/admin/dashboard'
import adminLogoutHandler from './api/admin/logout'
import adminRagSeedHandler from './api/admin/rag/seed'
import adminSessionHandler from './api/admin/session'
import adminVerifyHandler from './api/admin/verify'
import judgeHandler from './api/judge'
import ragChatHandler from './api/rag-chat'
import ragSearchHandler from './api/rag/search'
import routeHandler from './api/route'
import tourismHandler from './api/tourism'

type LocalApiQuery = Record<string, string | string[]>

interface LocalApiRequest {
  method?: string
  body?: unknown
  headers?: {
    cookie?: string
  }
  query: LocalApiQuery
}

interface LocalApiResponse {
  status(code: number): LocalApiResponse
  json(body: unknown): void
  setHeader(name: string, value: string): void
}

type LocalApiHandler = (
  request: LocalApiRequest,
  response: LocalApiResponse,
) => void | Promise<void>

const localApiHandlers: Record<string, LocalApiHandler> = {
  '/admin/dashboard': adminDashboardHandler as LocalApiHandler,
  '/admin/logout': adminLogoutHandler as LocalApiHandler,
  '/admin/rag/seed': adminRagSeedHandler as LocalApiHandler,
  '/admin/session': adminSessionHandler as LocalApiHandler,
  '/admin/verify': adminVerifyHandler as LocalApiHandler,
  '/judge': judgeHandler as LocalApiHandler,
  '/rag-chat': ragChatHandler as LocalApiHandler,
  '/rag/search': ragSearchHandler as LocalApiHandler,
  '/route': routeHandler as LocalApiHandler,
  '/tourism': tourismHandler as LocalApiHandler,
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    process.env[key] ??= value
  }

  return {
    plugins: [react(), localVercelApiPlugin()],
  }
})

function localVercelApiPlugin(): Plugin {
  return {
    name: 'local-vercel-api',
    configureServer(server) {
      server.middlewares.use('/api', async (request, response, next) => {
        const url = new URL(request.url ?? '/', 'http://localhost')
        const handler = localApiHandlers[url.pathname]
        if (!handler) {
          next()
          return
        }

        const query = createLocalApiQuery(url.searchParams)

        try {
          await handler(
            {
              method: request.method,
              body: await readLocalApiBody(request),
              headers: {
                cookie: request.headers.cookie,
              },
              query,
            },
            createLocalApiResponse(response),
          )
        } catch {
          response.statusCode = 500
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.end(
            JSON.stringify({
              ok: false,
              message: '로컬 API 프록시를 실행하지 못했습니다.',
            }),
          )
        }
      })
    },
  }
}

function createLocalApiQuery(searchParams: URLSearchParams): LocalApiQuery {
  const query: LocalApiQuery = {}

  for (const [key, value] of searchParams.entries()) {
    const existingValue = query[key]
    if (!existingValue) {
      query[key] = value
    } else if (Array.isArray(existingValue)) {
      existingValue.push(value)
    } else {
      query[key] = [existingValue, value]
    }
  }

  return query
}

function readLocalApiBody(request: {
  method?: string
  setEncoding(encoding: BufferEncoding): void
  on(event: 'data', listener: (chunk: string) => void): void
  on(event: 'end', listener: () => void): void
  on(event: 'error', listener: (error: Error) => void): void
}) {
  if (request.method === 'GET' || request.method === 'HEAD') {
    return Promise.resolve(undefined)
  }

  return new Promise<string | undefined>((resolve, reject) => {
    let body = ''
    request.setEncoding('utf8')
    request.on('data', (chunk) => {
      body += chunk
    })
    request.on('end', () => {
      resolve(body || undefined)
    })
    request.on('error', reject)
  })
}

function createLocalApiResponse(response: {
  statusCode: number
  headersSent: boolean
  setHeader(name: string, value: string | string[]): void
  end(data?: string): void
}): LocalApiResponse {
  return {
    status(code) {
      response.statusCode = code
      return this
    },
    json(body) {
      if (!response.headersSent) {
        response.setHeader('Content-Type', 'application/json; charset=utf-8')
      }
      response.end(JSON.stringify(body))
    },
    setHeader(name, value) {
      response.setHeader(name, normalizeLocalApiHeader(name, value))
    },
  }
}

function normalizeLocalApiHeader(name: string, value: string) {
  if (name.toLowerCase() !== 'set-cookie') return value

  return value.replace(/;\s*Secure\b/gi, '')
}
