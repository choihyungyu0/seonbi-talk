# Admin Dashboard

The admin dashboard is a read-only analytics surface for service operations. It
must expose only aggregated or non-identifying activity data.

## Data Sources

The dashboard API reads from these Supabase tables when available:

- `analytics_events`
- `favorite_courses`
- `judge_histories`
- Supabase Auth admin users endpoint for total user count, only when a server-side
  service role key is configured

The browser never receives Supabase keys from this API.

## Collected Data Used

The dashboard may display:

- Total user count
- Total analytics event count
- Total favorite course saves
- Total saved judge histories
- Seonbi type distribution from completed tests
- Judge mode usage counts
- Judge text/image usage counts
- Favorite course TOP 5 by saved count
- Content type counts for recommendation and favorite activity
- User behavior funnel counts and step conversion rates
- Public data integration status based on observed favorite and analytics rows
- Recent event type, timestamp, and a safe summary label

Favorite course rows are reduced to `title`, `contentType`, and aggregate
`count`. Recent activity rows are reduced to event type labels such as
`선비유형 테스트 완료` or `관심 코스 저장`.

The public data status section does not claim full TourAPI inventory when there
is no dedicated sync table. It uses only observed `favorite_courses` and
`analytics_events` rows for the selected period, and labels the basis as
`저장/이벤트 관측 기준`.

## Data Not Collected Or Displayed

The dashboard must not display:

- User input original text
- Uploaded photo originals, base64 data, or image URLs
- Email addresses
- Passwords
- Phone numbers
- Access tokens, refresh tokens, API keys, or admin codes
- Exact current location coordinates
- Raw `user_id` values

`judge_histories` contains generated advice text for the user-facing My Page
flow, but the admin dashboard API does not select or return `advice`,
`modern_translation`, or `share_text`.

`favorite_courses` can contain address, image, and map coordinate fields for the
user-facing favorite list, but the admin dashboard API does not select or return
those fields.

## Privacy Principles

1. The server verifies the administrator HttpOnly cookie before reading any
   dashboard data.
2. Client-side route protection is only a convenience. `/api/admin/dashboard`
   returns `401` without a valid admin session cookie.
3. Aggregation happens on the server. The response contains counts and safe
   labels, not raw private records.
4. Provider secrets and Supabase service role keys are server-only. They must not
   be added to `VITE_` variables or frontend source.
5. Failed dashboard reads return an error state or empty dashboard shape without
   logging secrets.

## Admin API Structure

Endpoint:

```text
GET /api/admin/dashboard?range=today|7d|30d|all
```

Behavior:

- Allows `GET` only
- Reuses the same `seonbi_admin_session` HMAC cookie validation pattern as
  `/api/admin/session`
- Returns `401` when the admin session is missing or invalid
- Applies `created_at >= ...` filters for `today`, `7d`, and `30d`
- Uses no date filter for `all`
- Reads Supabase from server environment variables:
  - `SUPABASE_URL` or `VITE_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, or
    `VITE_SUPABASE_ANON_KEY`

If a service role key is available, it is used only inside the serverless
function and never returned to the client. If only anon key access is available,
the dashboard depends on existing RLS read policies and may show empty counts
where read access is not permitted.

Response shape:

```ts
{
  ok: true,
  range: 'today' | '7d' | '30d' | 'all',
  dashboard: {
    summary: {
      totalUsers: number,
      totalEvents: number,
      totalFavorites: number,
      totalJudgeHistories: number
    },
    seonbiTypeDistribution: Record<string, number>,
    judgeStats: {
      textBasedCount: number,
      imageBasedCount: number,
      modeCounts: Record<string, number>,
      typeCounts: Record<string, number>
    },
    courseStats: {
      favoriteTopCourses: Array<{
        title: string,
        contentType: string,
        count: number
      }>,
      contentTypeCounts: Record<string, number>
    },
    behaviorFunnel: Array<{
      key: string,
      label: string,
      count: number,
      conversionRate: number | null
    }>,
    publicDataStatus: {
      basis: string,
      periodSensitive: boolean,
      attractionCount: number,
      cultureCount: number,
      accommodationCount: number,
      restaurantCount: number,
      missingCoordinateCount: number,
      missingImageCount: number,
      lastSyncedAt: string | null,
      unavailableMetrics: string[]
    },
    recentActivities: Array<{
      eventType: string,
      createdAt: string,
      summary: string
    }>
  }
}
```

## Behavior Funnel

The funnel is computed from `analytics_events.event_type` for the selected
range:

- `home_viewed` or `page_view_home`: 홈 방문
- `test_completed`: 선비유형 테스트 완료
- `tourism_card_clicked` or `course_viewed`: 추천 코스 조회
- `favorite_course_added` or `favorite_course_saved`: 관심 코스 저장
- `judge_used`: 선비의 한마디 생성
- `result_share_clicked` or `judge_share_clicked`: 결과 공유

Missing event types are returned as `0`. Conversion rate is calculated against
the previous funnel step when the previous step has data.

## Public Data Status

Until a dedicated TourAPI sync table exists, the dashboard shows public data
status from observed rows only:

- Content type counts from favorite and analytics rows
- Missing coordinate count from `favorite_courses.map_x` and `map_y`
- Missing image count from `favorite_courses.first_image`
- Last observed lookup/save timestamp from favorite and analytics rows

The API does not return exact coordinates, addresses, phone numbers, image URLs,
or raw payloads. Unavailable metrics are explicitly marked as `수집 예정` or
`데이터 없음`.

## Future Metrics

Possible future read-only metrics:

- Recommendation conversion rate from course click to favorite save
- Judge mode retention by period
- Seonbi type trend by week
- Most common content type by seonbi type
- Share click rate for results and judge responses
- Anonymous session funnel from test completion to course save

Any future metric must preserve the same privacy boundary: aggregate counts and
safe labels only.
