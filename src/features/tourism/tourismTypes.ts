import type { SeonbiType } from '../seonbi-test/types'

export type TourismDataStatus =
  | 'empty'
  | 'loading'
  | 'ready'
  | 'missing-api-key'
  | 'error'

export type TourismContentType =
  | 'tourist-attraction'
  | 'culture'
  | 'festival'
  | 'course'
  | 'leisure'
  | 'accommodation'
  | 'shopping'
  | 'restaurant'
  | 'unknown'

export type TourismEmptyStateReason =
  | 'missing_api_key'
  | 'no_data'
  | 'no_test_result'
  | 'api_error'

export interface TourismContent {
  contentId?: string
  contentTypeId?: string
  title?: string
  address?: string
  mapX?: number
  mapY?: number
  firstImage?: string
  firstImage2?: string
  tel?: string
  overview?: string
  areaCode?: string
  sigunguCode?: string
  category?: string
  source?: 'TourAPI'
}

export interface TourismApiResponse {
  contents: TourismContent[]
  status: TourismDataStatus
  reason?: TourismEmptyStateReason
  message?: string
}

export interface TourismQueryParams {
  keyword?: string
  areaCode?: string
  sigunguCode?: string
  contentTypeId?: string
  pageNo?: number
  numOfRows?: number
}

export interface RecommendedCourse {
  seonbiType: SeonbiType
  items: TourismContent[]
  reason?: TourismEmptyStateReason
}

export interface TourismCoordinateState {
  status: 'not-connected' | 'connected'
  message: string
}
