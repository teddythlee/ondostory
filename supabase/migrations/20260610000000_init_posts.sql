-- ondostory blog schema
-- Run this in Supabase SQL Editor

create extension if not exists "uuid-ossp";

create table posts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  slug text not null unique,
  content text not null default '',
  excerpt text not null default '',
  cover_image text,
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  tags text[] not null default '{}',
  meta_title text,
  meta_description text
);

-- Index for published posts (blog listing)
create index posts_published_idx on posts (published, published_at desc);
-- Index for slug lookup
create unique index posts_slug_idx on posts (slug);

-- Row Level Security: public can read published posts
alter table posts enable row level security;

create policy "Public read published posts"
  on posts for select
  using (published = true);

create policy "Service role full access"
  on posts
  using (auth.role() = 'service_role');
