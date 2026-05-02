# Supabase Auth

SafeExit uses Supabase Auth for email/password sign up and sign in. The browser
uses only public Supabase values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Do not put a Supabase service role key, OpenAI key, TourAPI key, or password in
frontend code or localStorage.

## Supabase Setup

In Supabase Dashboard:

1. Enable Email provider under Authentication.
2. Decide whether email confirmation is required.
3. Add the deployed site URL to Auth URL configuration.
4. Add local development URL as an allowed redirect URL when testing locally.

## Email Confirmation Behavior

When email confirmation is ON, sign up can succeed without an active login
session. The app shows:

`이메일 인증 후 로그인해주세요.`

When confirmation is OFF, Supabase may return a session immediately. The app
stores the session token and user id locally, then the user can continue signed
in.

## Analytics user_id

Anonymous analytics continue to use `anonymousSessionId`. When a user is signed
in, analytics events also include `user_id`, which is the Supabase Auth user id.
Email, nickname, name, phone number, and passwords are not stored in analytics.

If the existing `analytics_events` table does not have `user_id`, add it:

```sql
alter table public.analytics_events
  add column if not exists user_id uuid references auth.users(id);

create index if not exists analytics_events_user_id_idx
  on public.analytics_events (user_id);
```

If this column or table is missing, analytics writes may fail, and the app falls
back to localStorage without breaking the user flow.
