# Supabase Analytics Events

SafeExit records anonymous activity events for contest demos and future product
analysis. Events must not include names, emails, phone numbers, exact free-text
judge input, API keys, or other personal data.

## Frontend Environment

The browser may use only public Supabase client values:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

If either value is missing, the app skips Supabase writes and stores the event in
localStorage fallback storage. Do not expose a service role key in frontend code.

## Table SQL

Run this SQL in the Supabase SQL editor.

```sql
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (
    event_type in (
      'test_completed',
      'tourism_card_clicked',
      'judge_used',
      'judge_share_clicked',
      'result_share_clicked'
    )
  ),
  session_id text not null,
  seonbi_type text check (
    seonbi_type is null or seonbi_type in ('toegye', 'yulgok', 'cheosa', 'uguk')
  ),
  content_id text,
  content_title text,
  content_type_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_event_type_idx
  on public.analytics_events (event_type);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);

create index if not exists analytics_events_seonbi_type_idx
  on public.analytics_events (seonbi_type);
```

## RLS Policy

Enable RLS and allow anonymous clients to insert only. Keep reads for service
role, dashboard, or future server-side reporting code.

```sql
alter table public.analytics_events enable row level security;

create policy "Allow anonymous analytics inserts"
  on public.analytics_events
  for insert
  to anon
  with check (
    event_type in (
      'test_completed',
      'tourism_card_clicked',
      'judge_used',
      'judge_share_clicked',
      'result_share_clicked'
    )
    and session_id is not null
    and (
      seonbi_type is null
      or seonbi_type in ('toegye', 'yulgok', 'cheosa', 'uguk')
    )
  );
```

Do not add public `select`, `update`, or `delete` policies unless a separate
privacy review decides how analytics should be exposed.

## Stored Event Shape

The app writes these columns:

- `event_type`
- `session_id`: random anonymous ID stored in localStorage
- `created_at`
- `seonbi_type`
- `content_id`
- `content_title`
- `content_type_id`
- `metadata`

`judge_used` and judge share events do not store the user's submitted text or
generated advice text.
