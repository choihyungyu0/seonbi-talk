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

interface KakaoDirectionsResponse {
  routes?: Array<{
    sections?: Array<{
      roads?: Array<{
        vertexes?: number[]
      }>
    }>
  }>
}

const KAKAO_DIRECTIONS_ENDPOINT =
  'https://apis-navi.kakaomobility.com/v1/directions'
const ROUTE_TIMEOUT_MS = 7000
const MIN_ROUTE_POINTS = 2
const MAX_ROUTE_POINTS = 4
const ROUTE_FAILURE_MESSAGE = '경로를 불러오지 못했습니다.'

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

  const validation = getValidatedRoutePoints(request.body)
  if (!validation.ok) {
    response.status(400).json({
      ok: false,
      message: validation.message,
    })
    return
  }

  const points = validation.points
  const kakaoApiKey =
    process.env.KAKAO_MOBILITY_REST_API_KEY ?? process.env.KAKAO_REST_API_KEY

  if (!kakaoApiKey) {
    response.status(200).json({
      ok: false,
      message: ROUTE_FAILURE_MESSAGE,
    })
    return
  }

  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), ROUTE_TIMEOUT_MS)

  try {
    const routeResponse = await fetch(createKakaoDirectionsUrl(points), {
      method: 'GET',
      headers: {
        Authorization: `KakaoAK ${kakaoApiKey}`,
      },
      signal: abortController.signal,
    })

    if (!routeResponse.ok) {
      response.status(200).json({
        ok: false,
        message: ROUTE_FAILURE_MESSAGE,
      })
      return
    }

    const data = (await routeResponse.json().catch(() => ({}))) as KakaoDirectionsResponse
    const path = extractKakaoRoutePath(data)
    if (path.length < 2) {
      response.status(200).json({
        ok: false,
        message: ROUTE_FAILURE_MESSAGE,
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
      message: ROUTE_FAILURE_MESSAGE,
    })
  } finally {
    clearTimeout(timeoutId)
  }
}

type RoutePointsValidation =
  | {
      ok: true
      points: RouteCoordinate[]
    }
  | {
      ok: false
      message: string
    }

function getValidatedRoutePoints(body: unknown): RoutePointsValidation {
  const parsedBody = parseRequestBody(body)
  const rawPoints = parsedBody.points

  if (!Array.isArray(rawPoints)) {
    return {
      ok: false,
      message: '경로 좌표를 확인할 수 없습니다.',
    }
  }

  if (rawPoints.length < MIN_ROUTE_POINTS || rawPoints.length > MAX_ROUTE_POINTS) {
    return {
      ok: false,
      message: '경로 좌표는 2개 이상 4개 이하로 입력해야 합니다.',
    }
  }

  const points: RouteCoordinate[] = []
  for (const point of rawPoints) {
    if (!point || typeof point !== 'object') {
      return {
        ok: false,
        message: '경로 좌표 형식이 올바르지 않습니다.',
      }
    }

    const coordinate = point as Partial<RouteCoordinate>
    if (!isValidCoordinate(coordinate.lat, coordinate.lng)) {
      return {
        ok: false,
        message: '경로 좌표 범위가 올바르지 않습니다.',
      }
    }

    points.push({
      lat: coordinate.lat,
      lng: coordinate.lng,
    })
  }

  return {
    ok: true,
    points,
  }
}

function parseRequestBody(body: unknown): RouteRequestBody {
  if (typeof body !== 'string') return body as RouteRequestBody

  try {
    return JSON.parse(body) as RouteRequestBody
  } catch {
    return {}
  }
}

function createKakaoDirectionsUrl(points: RouteCoordinate[]) {
  const [origin, ...remainingPoints] = points
  const destination = remainingPoints[remainingPoints.length - 1]
  const waypoints = remainingPoints.slice(0, -1)
  const searchParams = new URLSearchParams({
    origin: formatKakaoCoordinate(origin),
    destination: formatKakaoCoordinate(destination),
    priority: 'RECOMMEND',
  })

  if (waypoints.length > 0) {
    searchParams.set('waypoints', waypoints.map(formatKakaoCoordinate).join('|'))
  }

  return `${KAKAO_DIRECTIONS_ENDPOINT}?${searchParams.toString()}`
}

function formatKakaoCoordinate(point: RouteCoordinate) {
  return `${point.lng},${point.lat}`
}

function extractKakaoRoutePath(data: KakaoDirectionsResponse) {
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
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}
