-- Yeongju Seonbi Supabase schema
-- Run in the Supabase SQL editor. Review policies before applying to production.

create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (
    event_type in (
      'home_visit',
      'test_completed',
      'tourism_card_clicked',
      'judge_used',
      'judge_image_used',
      'judge_share_clicked',
      'result_share_clicked',
      'favorite_course_added',
      'favorite_course_removed'
    )
  ),
  session_id text not null,
  user_id uuid references auth.users(id) on delete set null,
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

create index if not exists analytics_events_user_id_idx
  on public.analytics_events (user_id);

alter table public.analytics_events enable row level security;

drop policy if exists "Allow anonymous analytics inserts" on public.analytics_events;

create policy "Allow anonymous analytics inserts"
  on public.analytics_events
  for insert
  to anon, authenticated
  with check (
    event_type in (
      'home_visit',
      'test_completed',
      'tourism_card_clicked',
      'judge_used',
      'judge_image_used',
      'judge_share_clicked',
      'result_share_clicked',
      'favorite_course_added',
      'favorite_course_removed'
    )
    and session_id is not null
    and (
      seonbi_type is null
      or seonbi_type in ('toegye', 'yulgok', 'cheosa', 'uguk')
    )
  );

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

create index if not exists favorite_courses_created_at_idx
  on public.favorite_courses (created_at desc);

alter table public.favorite_courses enable row level security;

drop policy if exists "Users can read own favorite courses" on public.favorite_courses;
drop policy if exists "Users can insert own favorite courses" on public.favorite_courses;
drop policy if exists "Users can update own favorite courses" on public.favorite_courses;
drop policy if exists "Users can delete own favorite courses" on public.favorite_courses;

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

create policy "Users can update own favorite courses"
  on public.favorite_courses
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own favorite courses"
  on public.favorite_courses
  for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.judge_histories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  seonbi_type text check (
    seonbi_type is null or seonbi_type in ('toegye', 'yulgok', 'cheosa', 'uguk')
  ),
  advice text not null,
  modern_translation text not null,
  share_text text not null,
  judge_mode text not null default 'default' check (
    judge_mode in (
      'default',
      'strict',
      'practical',
      'hermit',
      'righteous',
      'praise',
      'roast',
      'petition',
      'poison'
    )
  ),
  has_image boolean not null default false,
  has_text boolean not null default false,
  emotion_tag text,
  situation_tag text,
  advice_tag text,
  created_at timestamptz not null default now()
);

create index if not exists judge_histories_user_created_idx
  on public.judge_histories (user_id, created_at desc);

alter table public.judge_histories enable row level security;

drop policy if exists "Users can insert own judge histories" on public.judge_histories;
drop policy if exists "Users can read own judge histories" on public.judge_histories;
drop policy if exists "Users can delete own judge histories" on public.judge_histories;

create policy "Users can insert own judge histories"
  on public.judge_histories
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can read own judge histories"
  on public.judge_histories
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can delete own judge histories"
  on public.judge_histories
  for delete
  to authenticated
  using (auth.uid() = user_id);

create table if not exists public.rag_documents (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (
    source_type in (
      'tourism_place',
      'seonbi_persona',
      'judge_mode',
      'recommendation_rule'
    )
  ),
  source_id text not null,
  title text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id)
);

create index if not exists rag_documents_embedding_idx
  on public.rag_documents
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists rag_documents_source_idx
  on public.rag_documents (source_type, source_id);

create or replace function public.set_rag_documents_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rag_documents_set_updated_at on public.rag_documents;

create trigger rag_documents_set_updated_at
before update on public.rag_documents
for each row
execute function public.set_rag_documents_updated_at();

create or replace function public.match_rag_documents(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  id uuid,
  source_type text,
  source_id text,
  title text,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
as $$
  select
    rag_documents.id,
    rag_documents.source_type,
    rag_documents.source_id,
    rag_documents.title,
    rag_documents.content,
    rag_documents.metadata,
    1 - (rag_documents.embedding <=> query_embedding) as similarity
  from public.rag_documents
  order by rag_documents.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 10);
$$;

alter table public.rag_documents enable row level security;
