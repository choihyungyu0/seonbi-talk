import type { CourseStop, RouteCoordinate } from '../../data/courseStops'
import { decodeRoutePolyline } from '../../utils/decodeRoutePolyline'

export type GoogleCourseRouteSource = 'google-routes-api'

export interface GoogleCourseRouteResult {
  path: RouteCoordinate[]
  distanceMeters: number
  duration: string
  source: GoogleCourseRouteSource
}

interface GoogleRouteApiResponse {
  ok: boolean
  route?: {
    distanceMeters?: number
    duration?: string
    encodedPolyline?: string
    legs?: unknown[]
  }
  message?: string
}

export async function requestGoogleCourseRoute(
  stops: readonly CourseStop[],
): Promise<GoogleCourseRouteResult | null> {
  if (stops.length < 2) return null

  try {
    const response = await fetch('/api/google-route', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        stops: stops.map(({ id, order, name, lat, lng }) => ({
          id,
          order,
          name,
          lat,
          lng,
        })),
      }),
    })
    const data = (await response.json().catch(() => ({}))) as GoogleRouteApiResponse
    const route = data.route
    const encodedPolyline = route?.encodedPolyline

    if (!response.ok || !data.ok || !route || !encodedPolyline) return null

    const path = decodeRoutePolyline(encodedPolyline)
    if (path.length < 2) return null

    return {
      path,
      distanceMeters:
        typeof route.distanceMeters === 'number' ? route.distanceMeters : 0,
      duration: route.duration ?? '',
      source: 'google-routes-api',
    }
  } catch {
    return null
  }
}
