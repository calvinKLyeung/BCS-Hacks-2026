-- CampusSwap schema. Paste into the Supabase SQL editor and run once.
-- The 384 below must match EMBEDDING_DIMS (all-MiniLM-L6-v2 outputs 384 dims).

create extension if not exists vector;

create table if not exists users (
  id uuid primary key,                -- same as auth.users.id
  email text not null unique,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references users(id),
  campus_id text not null default 'ubc',
  type text not null check (type in ('free', 'sell')),
  price numeric(10,2),                -- required when type = 'sell', null when 'free'
  title text not null,
  description text not null default '',
  tag text not null check (tag in ('course_material','furniture','decoration','stationery','other')),
  condition text not null check (condition in ('like_new','good','usable','poor')),
  condition_reason text not null default '',
  visible_defects text[] not null default '{}',
  photos text[] not null default '{}', -- public URLs
  pickup_point_id text not null,
  pickup_name text not null,
  lat double precision not null,
  lng double precision not null,
  embedding vector(384),
  status text not null default 'available' check (status in ('available','taken')),
  created_at timestamptz not null default now(),
  constraint price_matches_type check (
    (type = 'sell' and price is not null and price >= 0) or
    (type = 'free' and price is null)
  )
);

create index if not exists listings_campus_status_idx on listings (campus_id, status);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id),
  from_user uuid not null references users(id),
  to_user uuid not null references users(id),
  body text not null,
  created_at timestamptz not null default now()
);

-- Vector search used by RAG
create or replace function match_listings(
  query_embedding vector(384),
  match_count int,
  filter_campus text,
  filter_type text default null,
  filter_tag text default null
)
returns table (id uuid, similarity float)
language sql stable as $$
  select l.id, 1 - (l.embedding <=> query_embedding) as similarity
  from listings l
  where l.campus_id = filter_campus
    and l.status = 'available'
    and l.embedding is not null
    and (filter_type is null or l.type = filter_type)
    and (filter_tag is null or l.tag = filter_tag)
  order by l.embedding <=> query_embedding
  limit match_count;
$$;

-- RLS on, no policies: only the backend's service role key can read/write.
alter table users enable row level security;
alter table listings enable row level security;
alter table messages enable row level security;

-- Public storage bucket for photos
insert into storage.buckets (id, name, public)
values ('listing-photos', 'listing-photos', true)
on conflict (id) do nothing;
