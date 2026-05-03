# RAG Reference Data

SafeExit uses RAG to let `/api/judge` reference Yeongju tourism data, seonbi
persona settings, judge mode rules, and non-identifying recommendation rules.
This is not model fine-tuning. User submissions are used only for transient
retrieval and answer generation.

## Structure

1. Admin-only seed API creates approved reference documents.
2. The server creates OpenAI embeddings for each reference document.
3. Supabase stores the document and embedding in `rag_documents`.
4. `/api/judge` creates a temporary embedding from the request context.
5. Supabase RPC `match_rag_documents` returns the most relevant reference rows.
6. `/api/judge` adds safe title/content summaries to the OpenAI prompt.

The browser never receives OpenAI keys, Supabase service role keys, raw
embeddings, or administrator secrets.

## Stored Data

Allowed RAG source types:

- `tourism_place`: public Yeongju tourism place summaries
- `seonbi_persona`: 퇴계형, 율곡형, 처사형, 우국형 character settings
- `judge_mode`: default/strict/practical/hermit/righteous/praise/roast/petition/poison mode rules
- `recommendation_rule`: non-identifying route and recommendation rules

Each document has:

- `source_type`
- `source_id`
- `title`
- `content`
- `metadata`
- `embedding`
- timestamps

## Data Not Stored

Do not store these in RAG documents or seed data:

- User 고민 원문 전체
- Uploaded photo originals
- Base64 image data
- Email addresses
- Passwords
- Phone numbers
- Exact current location coordinates
- API keys, OAuth secrets, access tokens, refresh tokens, or admin codes

User text can be sent to OpenAI embeddings only as a transient search query. It
must not be inserted into `rag_documents`.

## Supabase SQL

Enable pgvector:

```sql
create extension if not exists vector;
```

Create `rag_documents`:

```sql
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
```

Keep `updated_at` current:

```sql
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
```

Create match RPC:

```sql
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
```

## RLS And Server Keys

Recommended baseline:

```sql
alter table public.rag_documents enable row level security;
```

Do not add public write policies. Seed and search should run on serverless API
routes. Use a Supabase service role key only in server environment variables,
never in `VITE_` variables or frontend code.

If you choose anon-key search, add a carefully reviewed read-only RPC policy.
The safer default is server-only service role access.

## APIs

Search:

```text
POST /api/rag/search
{
  "query": "toegye default 소수서원",
  "matchCount": 5
}
```

The response returns only `title`, `content`, `metadata`, and `similarity`.

Seed:

```text
POST /api/admin/rag/seed
```

The seed endpoint verifies the administrator session cookie before creating
embeddings and upserting documents.

## Judge Integration

`/api/judge` builds a temporary search query from:

- seonbi type
- judge mode
- user text, or a generic image-based query when an image is present

RAG search failures return no context and the existing judge flow continues.
When documents are found, the prompt receives:

```text
[영주선비길 참고 데이터]
1. 제목
- 내용 요약
```

The model is instructed not to invent operating hours, fees, or addresses that
are not in the reference data, and not to expose RAG internals to users.

## Future Expansion

- Add an admin UI button for seeding and refreshing RAG documents.
- Add a dedicated TourAPI sync table for full public-data inventory status.
- Add document review status fields such as `draft`, `approved`, and `archived`.
- Add scheduled refresh jobs for public tourism summaries.
- Add source URL metadata for public documents when the data license requires it.
