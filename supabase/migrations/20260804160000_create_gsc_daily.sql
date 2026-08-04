-- GSC 일별 총계 저장 테이블.
-- gsc_snapshots는 28일 '구간' 집계를 주기적으로 뜬 것이라 날짜별 추세 차트를 그릴 수 없다.
-- 이 테이블은 하루 단위(date dimension) 총계를 upsert로 쌓아 노출·클릭·CTR·순위의
-- 시계열(일별 추세 라인차트)을 만든다. GSC는 ~3일 지연이라 매일 최근 며칠을 겹쳐 upsert한다.

create table gsc_daily (
  day date primary key,                          -- GSC 집계 날짜
  clicks int not null default 0,
  impressions int not null default 0,
  ctr real not null default 0,
  position real not null default 0,
  updated_at timestamptz not null default now()
);

create index gsc_daily_day_idx on gsc_daily (day desc);

-- RLS: 관리자 전용 데이터. 공개(anon) 접근 차단, service_role만.
alter table gsc_daily enable row level security;

create policy "Service role full access gsc_daily"
  on gsc_daily
  using (auth.role() = 'service_role');
