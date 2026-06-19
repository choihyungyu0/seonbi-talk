export interface RouteCoordinate {
  lat: number
  lng: number
}

export type RoutePathSource = 'directions-api' | 'curated-route' | 'straight-line'

interface RouteApiResponse {
  ok: boolean
  path?: RouteCoordinate[]
  source?: RoutePathSource
  message?: string
}

export async function requestRoutePath(points: RouteCoordinate[]) {
  if (points.length < 2) return null

  try {
    const response = await fetch('/api/route', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ points }),
    })
    const data = (await response.json().catch(() => ({}))) as RouteApiResponse

    if (!response.ok || !data.ok || !data.path || data.path.length < 2) {
      return null
    }

    return {
      path: data.path,
      source: data.source ?? 'directions-api',
    }
  } catch {
    return null
  }
}
