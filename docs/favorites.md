# Favorite Courses

Favorite courses let signed-in users save TourAPI tourism cards. The browser uses
Supabase anon key plus the current user's Supabase Auth access token. Do not use
service role keys in frontend code.

## Stored Data

The app stores only:

- `user_id`
- `content_id`
- `content_type_id`
- `title`
- `address`
- `first_image`
- `map_x`
- `map_y`

The app does not store email, password, phone number, or judge input text in
`favorite_courses`.

## Table SQL

```sql
create table if not exists public.favorite_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id text not null,
  content_type_id text,
  title text,
  address text,
  first_image text,
  map_x double precision,
  map_y double precision,
  created_at timestamptz not null default now(),
  unique (user_id, content_id)
);

create index if not exists favorite_courses_user_id_idx
  on public.favorite_courses (user_id);
```

## RLS

```sql
alter table public.favorite_courses enable row level security;

create policy "Users can read own favorite courses"
  on public.favorite_courses
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own favorite courses"
  on public.favorite_courses
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own favorite courses"
  on public.favorite_courses
  for delete
  to authenticated
  using (auth.uid() = user_id);
```

If this table or policy is missing, the UI shows a safe failure message and the
rest of the course page continues to work.
