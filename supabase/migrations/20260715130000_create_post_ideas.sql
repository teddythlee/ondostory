-- Idea inbox for the semi-auto drafting pipeline.
-- Humans drop a topic + experience bullets here (from the admin, phone-friendly,
-- no LLM/MCP needed at capture time). Later a Claude Code session — or a
-- scheduled cloud agent (cron) — reads status='pending' rows, generates a draft
-- per the ondostory-draft skill, inserts it into posts (status='draft'), and
-- marks the idea 'done' with a link to the created post.

create table post_ideas (
  id          uuid primary key default extensions.uuid_generate_v4(),
  topic       text not null,
  bullets     text not null default '',
  status      text not null default 'pending'
              check (status in ('pending', 'processing', 'done', 'skipped')),
  post_id     uuid references posts(id) on delete set null,  -- generated draft
  note        text,                                          -- optional processing note
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index post_ideas_status_idx on post_ideas (status, created_at);

-- Admin-only: RLS on with no public policies, so only the service role
-- (supabaseAdmin) can read/write. Never exposed to the public site.
alter table post_ideas enable row level security;
