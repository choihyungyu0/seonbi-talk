import type { YeongjuWeatherSummary } from './yeongjuEnrichment'

export interface LiveWeather {
  weatherSummary: YeongjuWeatherSummary
  observedAt: string
}

interface WeatherProxyResponse {
  ok: boolean
  weatherSummary?: YeongjuWeatherSummary
  observedAt?: string
}

// /api/weather(기상청 프록시)에서 실시간 날씨를 받아온다.
// 실패(키 없음·API 장애·네트워크)하면 null을 반환하고, 호출부는 정적 스냅샷으로 폴백한다.
export async function fetchLiveWeather(): Promise<LiveWeather | null> {
  try {
    const response = await fetch('/api/weather')
    if (!response.ok) return null

    const data = (await response.json().catch(() => null)) as WeatherProxyResponse | null
    if (!data?.ok || !data.weatherSummary) return null

    return {
      weatherSummary: data.weatherSummary,
      observedAt: data.observedAt ?? new Date().toISOString(),
    }
  } catch {
    return null
  }
}
