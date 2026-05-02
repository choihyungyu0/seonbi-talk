# TourAPI Debugging

Use the Vercel serverless proxy instead of calling TourAPI directly from frontend code. The TourAPI service key must stay in server environment variables.

## Local Test URLs

Use these with `vercel dev`:

- `http://localhost:3000/api/tourism?type=areaCode`
- `http://localhost:3000/api/tourism?type=sigunguCode&areaCode=35`
- `http://localhost:3000/api/tourism?type=keyword&keyword=소수서원`

`areaCode=35` is only an example for testing the sigungu-code endpoint shape. Confirm the actual Gyeongbuk/Yeongju codes from the `areaCode` response before using them as app configuration.

## Expected Proxy Behavior

- Missing `TOUR_API_SERVICE_KEY`: returns `emptyReason: "missing_api_key"`.
- Valid request with no TourAPI items: returns `emptyReason: "no_data"`.
- TourAPI failure or non-success header: returns `emptyReason: "api_error"`.
- Debug output in development may include endpoint path, HTTP status, TourAPI header result code, and TourAPI header result message.

## Security Rules

- Do not use `VITE_` for the TourAPI service key.
- Do not put the service key in frontend code.
- Do not log or return a full URL containing `serviceKey`.
- Keep `TOUR_API_SERVICE_KEY` in server-only environment variables.
