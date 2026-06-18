export interface DecodedRouteCoordinate {
  lat: number
  lng: number
}

export function decodeRoutePolyline(encodedPolyline: string): DecodedRouteCoordinate[] {
  const coordinates: DecodedRouteCoordinate[] = []
  let index = 0
  let lat = 0
  let lng = 0

  while (index < encodedPolyline.length) {
    const decodedLat = decodePolylineValue(encodedPolyline, index)
    index = decodedLat.nextIndex
    lat += decodedLat.value

    const decodedLng = decodePolylineValue(encodedPolyline, index)
    index = decodedLng.nextIndex
    lng += decodedLng.value

    coordinates.push({
      lat: lat / 100000,
      lng: lng / 100000,
    })
  }

  return coordinates
}

function decodePolylineValue(encodedPolyline: string, startIndex: number) {
  let result = 0
  let shift = 0
  let index = startIndex
  let byte: number

  do {
    if (index >= encodedPolyline.length) {
      throw new Error('Encoded polyline is incomplete.')
    }

    byte = encodedPolyline.charCodeAt(index) - 63
    result |= (byte & 0x1f) << shift
    shift += 5
    index += 1
  } while (byte >= 0x20)

  return {
    value: result & 1 ? ~(result >> 1) : result >> 1,
    nextIndex: index,
  }
}
