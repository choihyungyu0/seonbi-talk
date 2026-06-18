export interface RouteCoordinate {
  lat: number
  lng: number
}

export interface CourseStop extends RouteCoordinate {
  id: string
  order: number
  name: string
  address: string
  iconPath: `/images/new/${string}`
}

export interface CourseRoute {
  id: string
  name: string
  stops: readonly CourseStop[]
  customPath?: readonly RouteCoordinate[]
}

export const toegyeCourseStops = [
  {
    id: 'sosu-seowon',
    order: 1,
    name: '소수서원',
    address: '경상북도 영주시 순흥면 소백로 2740',
    lat: 36.92556,
    lng: 128.58,
    iconPath: '/images/new/b (2).png',
  },
  {
    id: 'seonbichon',
    order: 2,
    name: '선비촌',
    address: '경상북도 영주시 순흥면 소백로 2796',
    lat: 36.928557,
    lng: 128.582677,
    iconPath: '/images/new/1 (4).png',
  },
  {
    id: 'buseoksa',
    order: 3,
    name: '부석사',
    address: '경상북도 영주시 부석면 부석사로 345',
    lat: 36.998969,
    lng: 128.68746,
    iconPath: '/images/new/1 (5).png',
  },
  {
    id: 'museom-village',
    order: 4,
    name: '무섬마을',
    address: '경상북도 영주시 문수면 무섬로234번길 41',
    lat: 36.7331746,
    lng: 128.6210331,
    iconPath: '/images/new/1 (3).png',
  },
  {
    id: 'seonbi-record',
    order: 5,
    name: '선비의 한마디 기록',
    address: '경상북도 영주시 영주동 일대',
    lat: 36.8056858,
    lng: 128.6240551,
    iconPath: '/images/new/1 (6).png',
  },
] as const satisfies readonly CourseStop[]

export type ToegyeCourseStopId = (typeof toegyeCourseStops)[number]['id']

export const toegyeCourseRoute = {
  id: 'toegye-reflection-course',
  name: '퇴계형 사색 코스',
  stops: toegyeCourseStops,
  customPath: [
    { lat: 36.92556, lng: 128.58 },
    { lat: 36.928557, lng: 128.582677 },
    { lat: 36.9281, lng: 128.5892 },
    { lat: 36.9531, lng: 128.626 },
    { lat: 36.998969, lng: 128.68746 },
    { lat: 36.9484, lng: 128.6735 },
    { lat: 36.8766, lng: 128.6428 },
    { lat: 36.8056858, lng: 128.6240551 },
    { lat: 36.7331746, lng: 128.6210331 },
    { lat: 36.8056858, lng: 128.6240551 },
  ],
} as const satisfies CourseRoute
