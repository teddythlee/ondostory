-- GSC 파생 '기회 신호' 일별 스냅샷.
-- 노출/클릭/CTR 같은 원지표(gsc_daily)가 아니라, 매일 계산해 뽑는 인사이트 개수를 쌓는다:
--   opportunities   = 문턱 검색어 수 (순위 8~20위, 노출≥8) — 밀면 1페이지 갈 후보
--   meta_candidates = 제목·메타 손질 후보 수 (노출≥50, CTR<5% 페이지)
-- 90일 롤링 윈도라 과거 재구성이 어려워 오늘부터 매일 1점씩 쌓인다.

create table gsc_signals (
  day date primary key,            -- 집계 기준일(최신 데이터일)
  opportunities int not null default 0,
  meta_candidates int not null default 0,
  updated_at timestamptz not null default now()
);

create index gsc_signals_day_idx on gsc_signals (day desc);

alter table gsc_signals enable row level security;

create policy "Service role full access gsc_signals"
  on gsc_signals
  using (auth.role() = 'service_role');
