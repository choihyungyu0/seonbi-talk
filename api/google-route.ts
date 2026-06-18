/* global process */

interface VercelRequestLike {
  method?: string
  body?: unknown
}

interface VercelResponseLike {
  status(code: number): VercelResponseLike
  json(body: GoogleRouteProxyResponse): void
  setHeader(name: string, value: string): void
}

interface RouteCoordinate {
  lat: number
  lng: number
}

interface RouteStop extends RouteCoordinate {
  id?: string
  order?: number
  name?: string
}

interface GoogleRouteRequestBody {
  stops?: unknown
}

interface GoogleRouteProxyResponse {
  ok: boolean
  route?: {
    distanceMeters: number
    duration: string
    encodedPolyline: string
    legs: unknown[]
  }
  message?: string
}

interface GoogleComputeRoutesResponse {
  routes?: Array<{
    distanceMeters?: number
    duration?: string
    polyline?: {
      encodedPolyline?: string
    }
    legs?: unknown[]
  }>
}

const GOOGLE_ROUTES_PROTOCOL = 'https:'
const GOOGLE_ROUTES_HOST = 'routes.googleapis.com'
const GOOGLE_ROUTES_ENDPOINT = `${GOOGLE_ROUTES_PROTOCOL}//${GOOGLE_ROUTES_HOST}/directions/v2:computeRoutes`
const GOOGLE_ROUTES_TIMEOUT_MS = 9000
const MIN_ROUTE_STOPS = 2
const MAX_ROUTE_STOPS = 25
const ROUTE_FAILURE_MESSAGE = 'Google 경로를 불러오지 못했습니다.'
const GOOGLE_ROUTES_FIELD_MASK =
  'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs'

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

  const validation = getValidatedRouteStops(request.body)
  if (!validation.ok) {
    response.status(400).json({
      ok: false,
      message: validation.message,
    })
    return
  }

  const googleServerKey = process.env.GOOGLE_MAPS_SERVER_KEY
  if (!googleServerKey) {
    response.status(200).json({
      ok: false,
      message: ROUTE_FAILURE_MESSAGE,
    })
    return
  }

  const abortController = new AbortController()
  const timeoutId = setTimeout(() => abortController.abort(), GOOGLE_ROUTES_TIMEOUT_MS)

  try {
    const routeResponse = await fetch(GOOGLE_ROUTES_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleServerKey,
        'X-Goog-FieldMask': GOOGLE_ROUTES_FIELD_MASK,
      },
      body: JSON.stringify(createGoogleRouteRequestBody(validation.stops)),
      signal: abortController.signal,
    })

    if (!routeResponse.ok) {
      response.status(200).json({
        ok: false,
        message: ROUTE_FAILURE_MESSAGE,
      })
      return
    }

    const data = (await routeResponse.json().catch(() => ({}))) as GoogleComputeRoutesResponse
    const route = data.routes?.[0]
    const encodedPolyline = route?.polyline?.encodedPolyline

    if (!route || !encodedPolyline) {
      response.status(200).json({
        ok: false,
        message: ROUTE_FAILURE_MESSAGE,
      })
      return
    }

    response.status(200).json({
      ok: true,
      route: {
        distanceMeters: route.distanceMeters ?? 0,
        duration: route.duration ?? '',
        encodedPolyline,
        legs: route.legs ?? [],
      },
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

type RouteStopsValidation =
  | {
      ok: true
      stops: RouteStop[]
    }
  | {
      ok: false
      message: string
    }

function getValidatedRouteStops(body: unknown): RouteStopsValidation {
  const parsedBody = parseRequestBody(body)
  const rawStops = parsedBody.stops

  if (!Array.isArray(rawStops)) {
    return {
      ok: false,
      message: '코스 좌표를 확인할 수 없습니다.',
    }
  }

  if (rawStops.length < MIN_ROUTE_STOPS || rawStops.length > MAX_ROUTE_STOPS) {
    return {
      ok: false,
      message: '코스 지점은 2개 이상 25개 이하로 입력해야 합니다.',
    }
  }

  const stops: RouteStop[] = []
  for (const rawStop of rawStops) {
    if (!rawStop || typeof rawStop !== 'object') {
      return {
        ok: false,
        message: '코스 지점 형식이 올바르지 않습니다.',
      }
    }

    const stop = rawStop as Partial<RouteStop>
    const coordinate = {
      lat: stop.lat,
      lng: stop.lng,
    }

    if (!isValidRouteCoordinate(coordinate)) {
      return {
        ok: false,
        message: '코스 좌표 범위가 올바르지 않습니다.',
      }
    }

    stops.push({
      id: typeof stop.id === 'string' ? stop.id : undefined,
      order: typeof stop.order === 'number' ? stop.order : undefined,
      name: typeof stop.name === 'string' ? stop.name : undefined,
      lat: coordinate.lat,
      lng: coordinate.lng,
    })
  }

  return {
    ok: true,
    stops: stops.sort((firstStop, secondStop) => {
      return (firstStop.order ?? 0) - (secondStop.order ?? 0)
    }),
  }
}

function parseRequestBody(body: unknown): GoogleRouteRequestBody {
  if (typeof body !== 'string') return body as GoogleRouteRequestBody

  try {
    return JSON.parse(body) as GoogleRouteRequestBody
  } catch {
    return {}
  }
}

function createGoogleRouteRequestBody(stops: RouteStop[]) {
  const [origin, ...remainingStops] = stops
  const destination = remainingStops[remainingStops.length - 1]
  const intermediates = remainingStops.slice(0, -1)

  return {
    origin: toGoogleWaypoint(origin),
    destination: toGoogleWaypoint(destination),
    intermediates: intermediates.map(toGoogleWaypoint),
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_UNAWARE',
    computeAlternativeRoutes: false,
    polylineQuality: 'HIGH_QUALITY',
    languageCode: 'ko-KR',
    units: 'METRIC',
  }
}

function toGoogleWaypoint(stop: RouteCoordinate) {
  return {
    location: {
      latLng: {
        latitude: stop.lat,
        longitude: stop.lng,
      },
    },
  }
}

function isValidRouteCoordinate(
  coordinate: Partial<RouteCoordinate>,
): coordinate is RouteCoordinate {
  return isValidCoordinate(coordinate.lat, coordinate.lng)
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
    lng <= 180 &&
    (lat !== 0 || lng !== 0)
  )
}
