# 추천 코스 경로 API

추천 코스 지도는 두 단계로 경로선을 표시한다.

1. 1차 구현: 현재 위치와 가까운 추천 코스 3곳을 파란색 직선 polyline으로 연결한다.
2. 2차 구현: 서버리스 `/api/route`가 Kakao Mobility Directions API를 호출해 실제 도로 경로 좌표를 반환하면, 지도는 해당 좌표 배열을 우선 사용한다.

## 필요한 환경변수

Vercel 서버 환경변수에 아래 둘 중 하나를 설정한다.

- `KAKAO_MOBILITY_REST_API_KEY`
- `KAKAO_REST_API_KEY`

우선순위는 `KAKAO_MOBILITY_REST_API_KEY`가 먼저이고, 없으면 `KAKAO_REST_API_KEY`를 사용한다.

이 키는 서버 전용 REST API 키다. 브라우저 번들에 포함되는 `VITE_` 환경변수로 설정하면 안 된다.

## Vercel 설정

Vercel 프로젝트의 Settings > Environment Variables에서 서버 환경변수를 추가한다.

- Name: `KAKAO_MOBILITY_REST_API_KEY`
- Value: Kakao Mobility Directions 호출 권한이 있는 REST API 키
- Environment: Production, Preview 등 필요한 배포 환경

환경변수를 추가하거나 변경한 뒤에는 새 배포가 필요하다.

## 요청과 응답

프론트는 `/api/route`로 현재 위치와 추천 코스 좌표를 POST한다.

```json
{
  "points": [
    { "lat": 36.8057, "lng": 128.624 },
    { "lat": 36.827, "lng": 128.622 }
  ]
}
```

서버는 첫 좌표를 `origin`, 마지막 좌표를 `destination`, 중간 좌표를 `waypoints`로 Kakao Mobility Directions API에 전달한다. Kakao 요청 좌표는 `lng,lat` 순서를 사용한다.

성공하면 `routes[0].sections[].roads[].vertexes`의 `[lng, lat, ...]` 배열을 `{ lat, lng }` 배열로 변환해 반환한다.

```json
{
  "ok": true,
  "path": [{ "lat": 36.8057, "lng": 128.624 }],
  "source": "directions-api"
}
```

## Fallback 정책

API 키가 없거나 Kakao 호출이 실패하거나 경로 좌표가 부족하면 `/api/route`는 `ok:false`를 반환한다. 프론트의 `requestRoutePath()`는 이를 `null`로 처리하고, `CourseMap`은 기존 파란색 직선 polyline fallback을 사용한다.

외부 API 에러 전문, 사용자 좌표 전문, API 키는 로그나 브라우저 응답에 노출하지 않는다.
