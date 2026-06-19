interface KakaoLatLng {
  getLat(): number
  getLng(): number
}

export interface KakaoLatLngBounds {
  extend(position: KakaoLatLng): void
}

export interface KakaoMap {
  setCenter(position: KakaoLatLng): void
  setBounds(bounds: KakaoLatLngBounds): void
}

interface KakaoMarkerOptions {
  map: KakaoMap
  position: KakaoLatLng
  title?: string
}

export interface KakaoMarker {
  setMap(map: KakaoMap | null): void
  setZIndex(zIndex: number): void
}

export interface KakaoPolyline {
  setMap(map: KakaoMap | null): void
}

interface KakaoMapsApi {
  event: {
    addListener(target: unknown, type: string, handler: () => void): void
  }
  load(callback: () => void): void
  LatLng: new (lat: number, lng: number) => KakaoLatLng
  LatLngBounds: new () => KakaoLatLngBounds
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level: number },
  ) => KakaoMap
  Marker: new (options: KakaoMarkerOptions) => KakaoMarker
  Polyline: new (options: {
    map: KakaoMap
    path: KakaoLatLng[]
    strokeWeight: number
    strokeColor: string
    strokeOpacity: number
    strokeStyle: string
  }) => KakaoPolyline
}

export interface KakaoMapsWindow {
  kakao?: {
    maps?: KakaoMapsApi
  }
}

let kakaoMapLoaderPromise: Promise<KakaoMapsApi> | null = null

export function getKakaoMapAppKey() {
  return import.meta.env.VITE_KAKAO_MAP_JS_KEY as string | undefined
}

export function loadKakaoMapsSdk(appKey: string): Promise<KakaoMapsApi> {
  const existingMaps = (window as KakaoMapsWindow).kakao?.maps
  if (existingMaps) return Promise.resolve(existingMaps)

  if (kakaoMapLoaderPromise) return kakaoMapLoaderPromise

  kakaoMapLoaderPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[data-kakao-map-sdk="true"]',
    )

    if (existingScript) {
      existingScript.addEventListener('load', () => resolveLoadedSdk(resolve, reject))
      existingScript.addEventListener('error', () => reject(new Error('sdk-load-failed')))
      return
    }

    const script = document.createElement('script')
    script.dataset.kakaoMapSdk = 'true'
    script.async = true
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
      appKey,
    )}&autoload=false`
    script.addEventListener('load', () => resolveLoadedSdk(resolve, reject))
    script.addEventListener('error', () => reject(new Error('sdk-load-failed')))
    document.head.appendChild(script)
  })

  return kakaoMapLoaderPromise
}

function resolveLoadedSdk(
  resolve: (maps: KakaoMapsApi) => void,
  reject: (reason?: unknown) => void,
) {
  const maps = (window as KakaoMapsWindow).kakao?.maps
  if (!maps) {
    reject(new Error('kakao-not-defined'))
    return
  }

  maps.load(() => resolve(maps))
}
