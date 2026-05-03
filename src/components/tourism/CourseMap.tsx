import { useEffect, useMemo, useRef, useState } from 'react'
import type { TourismContent } from '../../features/tourism/tourismTypes'
import type { RouteCoordinate, RoutePathSource } from '../../features/tourism/routeApi'
import {
  getKakaoMapAppKey,
  type KakaoMap,
  type KakaoMarker,
  loadKakaoMapsSdk,
  type KakaoPolyline,
  type KakaoMapsWindow,
} from '../../features/map/kakaoMapLoader'

interface CourseMapProps {
  items: TourismContent[]
  routeItems?: TourismContent[]
  routePath?: RouteCoordinate[]
  routeSource?: RoutePathSource
  currentLocation?: RouteCoordinate
  currentLocationLabel?: string
  locationMessage?: string
  selectedContentId?: string
  onSelectItem?: (item: TourismContent) => void
}

type CourseMapStatus = 'loading' | 'ready' | 'missing-key' | 'no-coordinates' | 'error'

interface CoordinateItem {
  id: string
  title: string
  lat: number
  lng: number
  item: TourismContent
}

interface MarkerRef {
  id: string
  marker: KakaoMarker
}

export function CourseMap({
  items,
  routeItems = [],
  routePath = [],
  routeSource = 'straight-line',
  currentLocation,
  currentLocationLabel = '내 위치',
  locationMessage,
  selectedContentId,
  onSelectItem,
}: CourseMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<KakaoMap | null>(null)
  const markerRefs = useRef<MarkerRef[]>([])
  const currentLocationMarkerRef = useRef<KakaoMarker | null>(null)
  const polylineRef = useRef<KakaoPolyline | null>(null)
  const [loadStatus, setLoadStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const appKey = getKakaoMapAppKey()

  const coordinateItems = useMemo(() => {
    return items
      .filter((item) => item.mapX !== undefined && item.mapY !== undefined)
      .map((item): CoordinateItem => ({
        id: item.contentId ?? `${item.title}-${item.mapX}-${item.mapY}`,
        title: item.title ?? '관광지 정보',
        lat: item.mapY as number,
        lng: item.mapX as number,
        item,
      }))
  }, [items])

  const routeCoordinateItems = useMemo(() => {
    const uniqueItems = new Map<string, TourismContent>()
    for (const item of routeItems) {
      const id = item.contentId ?? `${item.title}-${item.mapX}-${item.mapY}`
      if (!uniqueItems.has(id)) uniqueItems.set(id, item)
    }

    return Array.from(uniqueItems.values())
      .filter((item) => item.mapX !== undefined && item.mapY !== undefined)
      .map((item) => ({
        lat: item.mapY as number,
        lng: item.mapX as number,
      }))
  }, [routeItems])

  const routeLinePath = useMemo(() => {
    if (routePath.length >= 2) return routePath
    if (!currentLocation) return routeCoordinateItems
    return [currentLocation, ...routeCoordinateItems]
  }, [currentLocation, routeCoordinateItems, routePath])

  useEffect(() => {
    if (coordinateItems.length === 0) {
      markerRefs.current.forEach(({ marker }) => marker.setMap(null))
      markerRefs.current = []
      currentLocationMarkerRef.current?.setMap(null)
      currentLocationMarkerRef.current = null
      polylineRef.current?.setMap(null)
      polylineRef.current = null
      return
    }

    if (!appKey) {
      return
    }

    const sdkAppKey = appKey
    let ignore = false

    async function renderMap() {
      setLoadStatus('loading')

      try {
        const maps = await loadKakaoMapsSdk(sdkAppKey)
        if (ignore || !mapContainerRef.current) return

        const centerItem = coordinateItems[0]
        const center = new maps.LatLng(centerItem.lat, centerItem.lng)
        const map =
          mapRef.current ??
          new maps.Map(mapContainerRef.current, {
            center,
            level: 5,
          })

        map.setCenter(center)
        mapRef.current = map

        markerRefs.current.forEach(({ marker }) => marker.setMap(null))
        markerRefs.current = coordinateItems.map((item) => {
          const marker = new maps.Marker({
            map,
            position: new maps.LatLng(item.lat, item.lng),
            title: item.title,
          })
          marker.setZIndex(1)
          maps.event.addListener(marker, 'click', () => onSelectItem?.(item.item))

          return {
            id: item.id,
            marker,
          }
        })

        currentLocationMarkerRef.current?.setMap(null)
        currentLocationMarkerRef.current = null
        if (currentLocation) {
          const currentLocationMarker = new maps.Marker({
            map,
            position: new maps.LatLng(currentLocation.lat, currentLocation.lng),
            title: currentLocationLabel,
          })
          currentLocationMarker.setZIndex(30)
          currentLocationMarkerRef.current = currentLocationMarker
        }

        polylineRef.current?.setMap(null)
        polylineRef.current = null
        if (routeLinePath.length >= 2) {
          polylineRef.current = new maps.Polyline({
            map,
            path: routeLinePath.map((item) => new maps.LatLng(item.lat, item.lng)),
            strokeWeight: 5,
            strokeColor: '#2386FF',
            strokeOpacity: 0.85,
            strokeStyle: 'solid',
          })
        }

        setLoadStatus('ready')
      } catch {
        setLoadStatus('error')
      }
    }

    void renderMap()

    return () => {
      ignore = true
    }
  }, [
    appKey,
    coordinateItems,
    currentLocation,
    currentLocationLabel,
    onSelectItem,
    routeLinePath,
  ])

  useEffect(() => {
    if (!selectedContentId || !mapRef.current) return

    const selectedItem = coordinateItems.find((item) => item.id === selectedContentId)
    const maps = (window as KakaoMapsWindow).kakao?.maps
    if (!selectedItem || !maps) return

    mapRef.current.setCenter(new maps.LatLng(selectedItem.lat, selectedItem.lng))
    markerRefs.current.forEach(({ id, marker }) => {
      marker.setZIndex(id === selectedContentId ? 20 : 1)
    })
  }, [coordinateItems, selectedContentId])

  const status = getDisplayStatus({
    appKey,
    coordinateCount: coordinateItems.length,
    loadStatus,
  })

  return (
    <aside className="surface-card map-panel">
      <div className="map-panel-header">
        <h2>지도</h2>
        <span>현재 위치 기준 추천 경로</span>
      </div>
      <p className="map-panel-note">
        {locationMessage ?? '현재 위치 기준 가까운 추천 코스 3곳'}
        {routeSource === 'straight-line' && ' · 길찾기 API 미설정 시 직선 경로로 표시됩니다.'}
      </p>
      <div className="course-map-shell">
        {status !== 'ready' && (
          <div className="map-empty">
            <span aria-hidden="true">◇</span>
            <p>{getStatusMessage(status)}</p>
          </div>
        )}
        <div
          ref={mapContainerRef}
          className={status === 'ready' ? 'course-map-canvas ready' : 'course-map-canvas'}
          aria-label="영주 관광 지도"
        />
      </div>
    </aside>
  )
}

function getDisplayStatus({
  appKey,
  coordinateCount,
  loadStatus,
}: {
  appKey: string | undefined
  coordinateCount: number
  loadStatus: 'loading' | 'ready' | 'error'
}): CourseMapStatus {
  if (coordinateCount === 0) return 'no-coordinates'
  if (!appKey) return 'missing-key'
  return loadStatus
}

function getStatusMessage(status: CourseMapStatus) {
  if (status === 'loading') return '지도를 불러오고 있습니다.'
  if (status === 'missing-key') {
    return '카카오 지도 키 설정 후 지도를 표시할 수 있습니다.'
  }
  if (status === 'no-coordinates') return '좌표 정보가 있는 관광지가 없습니다.'
  return '지도를 불러오는 중 문제가 발생했습니다.'
}
