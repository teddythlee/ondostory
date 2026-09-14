-- AdSense 승인 준비를 위한 콘텐츠 품질 운영 시스템.
-- 검색 성과와 별개로 본문 자체의 구체성·경험성·중복 위험을 스냅샷으로 남기고,
-- 사람이 보강 상태와 메모를 관리한다. 점수는 Google의 판정이 아닌 내부 우선순위 지표다.

create table quality_scan_runs (
  id uuid primary key default uuid_generate_v4(),
  source text not null default 'manual' check (source in ('manual', 'scheduled')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  post_count int not null default 0,
  critical_count int not null default 0,
  watch_count int not null default 0,
  healthy_count int not null default 0,
  created_at timestamptz not null default now()
);

create table content_quality_reviews (
  id uuid primary key default uuid_generate_v4(),
  run_id uuid not null references quality_scan_runs(id) on delete cascade,
  post_id uuid not null references posts(id) on delete cascade,
  slug_snapshot text not null,
  score int not null check (score between 0 and 100),
  risk_level text not null check (risk_level in ('critical', 'watch', 'healthy')),
  priority_score real not null default 0,
  factors jsonb not null default '[]'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  content_fingerprint text not null default '',
  created_at timestamptz not null default now(),
  unique (run_id, post_id)
);

create table quality_work_items (
  post_id uuid primary key references posts(id) on delete cascade,
  state text not null default 'queued'
    check (state in ('queued', 'improving', 'monitoring', 'resolved')),
  notes text not null default '',
  manual_checks jsonb not null default '{"originalValue":false,"experienceEvidence":false,"factChecked":false,"intentComplete":false}'::jsonb,
  started_at timestamptz,
  resolved_at timestamptz,
  updated_at timestamptz not null default now()
);

create index quality_scan_runs_created_idx on quality_scan_runs(created_at desc);
create index content_quality_reviews_run_idx on content_quality_reviews(run_id, priority_score desc);
create index content_quality_reviews_post_idx on content_quality_reviews(post_id, created_at desc);
create index quality_work_items_state_idx on quality_work_items(state, updated_at desc);

alter table quality_scan_runs enable row level security;
alter table content_quality_reviews enable row level security;
alter table quality_work_items enable row level security;

create policy "Service role full access quality_scan_runs"
  on quality_scan_runs using (auth.role() = 'service_role');
create policy "Service role full access content_quality_reviews"
  on content_quality_reviews using (auth.role() = 'service_role');
create policy "Service role full access quality_work_items"
  on quality_work_items using (auth.role() = 'service_role');
