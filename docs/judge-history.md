# Judge Histories

`judge_histories`는 로그인한 사용자가 받은 `선비의 한마디` 결과를 마이페이지에서 다시 볼 수 있게 저장하는 테이블이다.

## Scope

- 로그인 사용자가 `/judge`에서 한마디 결과를 받으면 저장한다.
- 비로그인 사용자는 저장하지 않고 화면에 결과만 표시한다.
- 마이페이지는 최근 5개 기록만 조회해 표시한다.
- 삭제는 현재 로그인 사용자의 본인 기록에 대해서만 허용한다.

## Table SQL

```sql
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
  created_at timestamptz not null default now()
);

create index if not exists judge_histories_user_created_idx
  on public.judge_histories (user_id, created_at desc);
```

기존 테이블에는 다음 ALTER 문으로 `judge_mode`를 추가한다. 기존 기록은 `default`로 표시한다.

```sql
alter table public.judge_histories
  add column if not exists judge_mode text not null default 'default';

alter table public.judge_histories
  drop constraint if exists judge_histories_judge_mode_check;

alter table public.judge_histories
  add constraint judge_histories_judge_mode_check
  check (
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
  );
```

## RLS Policy

```sql
alter table public.judge_histories enable row level security;

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
```

## Stored Data

저장하는 데이터:

- `user_id`: Supabase Auth user id
- `seonbi_type`
- `advice`
- `modern_translation`
- `share_text`
- `judge_mode`: 없으면 클라이언트에서 `default`로 처리
- `has_image`
- `has_text`
- `created_at`

## Not Stored

저장하지 않는 데이터:

- 업로드한 사진 원본
- `imageDataUrl` 또는 base64
- 사용자가 입력한 원문 전체
- 이메일
- 비밀번호
- 전화번호

## Client Behavior

프론트는 Supabase anon key와 현재 로그인 세션 access token만 사용한다. service role key는 사용하지 않는다. 기록 저장 실패는 `/judge` 결과 표시를 막지 않으며, 마이페이지 조회 실패는 해당 섹션의 실패 안내로만 표시한다.
