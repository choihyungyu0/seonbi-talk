/* global process */

interface VercelRequestLike {
  method?: string
  body?: unknown
}

interface VercelResponseLike {
  status(code: number): VercelResponseLike
  json(body: RouteProxyResponse): void
  setHeader(name: string, value: string): void
}

interface RouteCoordinate {
  lat: number
  lng: number
}

interface RouteRequestBody {
  points?: unknown
}

interface RouteProxyResponse {
  ok: boolean
  path?: RouteCoordinate[]
  source?: 'directions-api'
  message?: string
}

interface ExternalRouteResponse {
  path?: RouteCoordinate[]
  route?: {
    path?: RouteCoordinate[]
  }
  routes?: Array<{
    path?: RouteCoordinate[]
    sections?: Array<{
      roads?: Array<{
        vertexes?: number[]
      }>
    }>
  }>
}

export default async function handler(
  request: VercelRequestLike,
  response: VercelResponseLike,
) {
  response.setHeader('Cache-Control', 'no-store')

  if (request.method && request.method !== 'POST') {
    response.status(405).json({
      ok: false,
      message: '지원하지 않는 요청입니다.',
    })
    return
  }

  const points = getRoutePoints(request.body)
  if (points.length < 2) {
    response.status(400).json({
      ok: false,
      message: '경로 좌표를 확인할 수 없습니다.',
    })
    return
  }

  // 경로 API URL과 키는 서버 환경변수로만 관리한다.
  // 프론트에는 길찾기 REST 키를 노출하지 않는다.
  const routeApiUrl = process.env.ROUTE_DIRECTIONS_API_URL
  const routeApiKey = process.env.ROUTE_DIRECTIONS_API_KEY

  if (!routeApiUrl || !routeApiKey) {
    response.status(200).json({
      ok: false,
      message: '길찾기 API 환경변수가 설정되지 않았습니다.',
    })
    return
  }

  try {
    const routeResponse = await fetch(routeApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${routeApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ points }),
    })

    if (!routeResponse.ok) {
      response.status(200).json({
        ok: false,
        message: '길찾기 API 호출에 실패했습니다.',
      })
      return
    }

    const data = (await routeResponse.json().catch(() => ({}))) as ExternalRouteResponse
    const path = normalizeRoutePath(data)
    if (path.length < 2) {
      response.status(200).json({
        ok: false,
        message: '길찾기 경로를 확인할 수 없습니다.',
      })
      return
    }

    response.status(200).json({
      ok: true,
      path,
      source: 'directions-api',
    })
  } catch {
    response.status(200).json({
      ok: false,
      message: '길찾기 API 처리 중 문제가 발생했습니다.',
    })
  }
}

function getRoutePoints(body: unknown) {
  const parsedBody = parseRequestBody(body)
  const rawPoints = Array.isArray(parsedBody.points) ? parsedBody.points : []

  return rawPoints
    .map((point) => {
      if (!point || typeof point !== 'object') return null
      const coordinate = point as Partial<RouteCoordinate>
      if (!isValidCoordinate(coordinate.lat, coordinate.lng)) return null
      return {
        lat: coordinate.lat,
        lng: coordinate.lng,
      }
    })
    .filter((point): point is RouteCoordinate => Boolean(point))
}

function parseRequestBody(body: unknown): RouteRequestBody {
  if (typeof body !== 'string') return body as RouteRequestBody

  try {
    return JSON.parse(body) as RouteRequestBody
  } catch {
    return {}
  }
}

function normalizeRoutePath(data: ExternalRouteResponse) {
  const directPath = data.path ?? data.route?.path
  if (directPath) return directPath.filter((point) => isValidCoordinate(point.lat, point.lng))

  const vertexes =
    data.routes?.[0]?.sections?.flatMap((section) => {
      return section.roads?.flatMap((road) => road.vertexes ?? []) ?? []
    }) ?? []

  const path: RouteCoordinate[] = []
  for (let index = 0; index < vertexes.length - 1; index += 2) {
    const lng = vertexes[index]
    const lat = vertexes[index + 1]
    if (isValidCoordinate(lat, lng)) {
      path.push({ lat, lng })
    }
  }

  return path
}

function isValidCoordinate(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng)
  )
}
