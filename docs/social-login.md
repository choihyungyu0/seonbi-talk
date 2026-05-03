# Social Login

SafeExit uses Supabase Auth REST endpoints for Google and Kakao social login.
The frontend must only use these public environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Do not put Google Client Secret, Kakao Client Secret, Supabase service role keys,
OAuth access tokens, or refresh tokens in frontend source, `VITE_` environment
variables, logs, or docs examples. Provider secrets belong only in Supabase
Dashboard and each provider dashboard.

## Supabase OAuth Flow

The login page sends users to:

```text
{VITE_SUPABASE_URL}/auth/v1/authorize?provider={google|kakao}&redirect_to={APP_ORIGIN}/auth/callback
```

After the provider consent flow, Supabase redirects back to
`/auth/callback`. The callback page reads `access_token`, `refresh_token`,
`expires_in`, or `expires_at` from the URL hash or query string, fetches the
current Supabase user, and stores the session in the same local auth storage used
by email/password login.

## Supabase Dashboard

1. Open Supabase Dashboard > Authentication > Providers.
2. Enable Google and Kakao.
3. Paste each provider Client ID and Client Secret into Supabase Dashboard.
4. Open Authentication > URL Configuration.
5. Set the production Site URL to the deployed app origin.
6. Add allowed Redirect URLs for every app callback origin you use.

Required local redirect URL:

```text
http://localhost:5173/auth/callback
```

If Vite uses another local port, add that exact callback URL too.

Required production redirect URL:

```text
https://YOUR_PRODUCTION_DOMAIN/auth/callback
```

For Vercel preview deployments, add the exact preview callback URL or an
approved Supabase wildcard pattern that matches your preview domains.

## Google Provider

1. In Google Cloud Console, create or select an OAuth 2.0 Client ID for a web
   application.
2. Add Supabase Auth callback as an authorized redirect URI:

```text
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

3. Copy the Google Client ID and Client Secret into Supabase Dashboard >
   Authentication > Providers > Google.
4. Do not add the Google Client Secret to `.env.local`, `.env.example`, Vercel
   frontend variables, or React code.

## Kakao Provider

1. In Kakao Developers, create or select the Kakao application.
2. Enable Kakao Login.
3. Add Supabase Auth callback as a redirect URI:

```text
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

4. Copy the Kakao REST API key or client ID value requested by Supabase, and the
   Kakao Client Secret when enabled, into Supabase Dashboard > Authentication >
   Providers > Kakao.
5. Do not add Kakao provider secrets to frontend environment variables or source.

## Vercel Deployment

1. Add only these public frontend variables in Vercel project settings:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

2. In Supabase Auth URL Configuration, add:

```text
https://YOUR_VERCEL_DOMAIN/auth/callback
```

3. In Google and Kakao dashboards, keep the provider redirect URI pointed at the
   Supabase Auth callback:

```text
https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback
```

4. Redeploy or fully reload the app after frontend environment variable changes.

## Local Test Checklist

1. Run the app over HTTP with Vite, for example `npm.cmd run dev`.
2. Visit `http://localhost:5173/login`.
3. Click `Google로 계속하기` or `Kakao로 계속하기`.
4. Confirm the browser leaves for Supabase Auth and then the provider.
5. After consent, confirm the app returns to
   `http://localhost:5173/auth/callback` and then `/mypage` or the saved return
   path.

Never test OAuth callback behavior from a `file://` URL.
