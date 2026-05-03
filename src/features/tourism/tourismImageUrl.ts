import type { TourismContent } from './tourismTypes'

const tourApiImageHost = 'tong.visitkorea.or.kr'

export function normalizeTourApiImageUrl(url: string | undefined) {
  const trimmedUrl = url?.trim()
  if (!trimmedUrl) return ''

  try {
    const parsedUrl = new URL(trimmedUrl)
    if (
      parsedUrl.protocol === 'http:' &&
      parsedUrl.hostname.toLowerCase() === tourApiImageHost
    ) {
      parsedUrl.protocol = 'https:'
      return parsedUrl.toString()
    }
  } catch {
    return trimmedUrl
  }

  return trimmedUrl
}

export function getTourismPrimaryImageUrl(
  item: Pick<TourismContent, 'firstImage' | 'firstImage2'>,
) {
  return normalizeTourApiImageUrl(item.firstImage || item.firstImage2)
}
