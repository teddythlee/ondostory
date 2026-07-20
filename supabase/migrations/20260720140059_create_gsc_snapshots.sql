-- GSC(Google Search Console) 스냅샷 저장 테이블.
-- GSC API는 항상 ~16개월 롤링 집계만 준다 → 시계열(순위 추세·콘텐츠 수정 효과·시즌/YoY 비교)을
-- 남기려면 주기적으로 떠서 저장해야 한다. 보관은 16개월(작년 같은 시즌까지 비교 가능).

create table gsc_snapshots (
  id uuid primary key default uuid_generate_v4(),
  taken_on date not null default current_date,   -- 스냅샷을 캡처한 날
  period_start date not null,                     -- GSC 집계 구간 시작
  period_end date not null,                       -- GSC 집계 구간 끝
  dimension text not null,                        -- 'query' | 'query_page'
  query text,
  page text,
  clicks int not null default 0,
  impressions int not null default 0,
  ctr real not null default 0,
  position real not null default 0,
  created_at timestamptz not null default now()
);

create index gsc_snapshots_period_idx on gsc_snapshots (period_end desc);
create index gsc_snapshots_query_idx on gsc_snapshots (query, period_end desc);

-- RLS: 관리자 전용 데이터. 공개(anon) 접근 차단, service_role만.
alter table gsc_snapshots enable row level security;

create policy "Service role full access gsc_snapshots"
  on gsc_snapshots
  using (auth.role() = 'service_role');
