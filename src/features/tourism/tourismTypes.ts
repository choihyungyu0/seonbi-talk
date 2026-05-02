export type TourismDataStatus = 'empty' | 'loading' | 'ready' | 'error'

export interface TourismCardModel {
  label: string
  title: string
  status: TourismDataStatus
}

export interface TourismCoordinateState {
  status: 'not-connected' | 'connected'
  message: string
}
