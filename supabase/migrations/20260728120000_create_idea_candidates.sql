-- 자동 글감 발굴(discovery) 결과 테이블.
--
-- post_ideas는 "사람이 겪은 걸 던지는 수동 인박스"다. 여기는 그 앞단 —
-- 매일 크론이 4개 소스에서 글감 후보를 긁어와 점수를 매겨 쌓는 곳.
-- 사람이 /admin/discover 에서 채택하면 post_ideas 로 넘어가고(=기존 파이프라인 합류),
-- 기각하면 dismissed 로 남아 다음 실행 때 다시 올라오지 않는다.
--
-- 소스:
--   gsc_gap      노출은 되는데 8~20위라 클릭이 안 나오는 검색어 (내 데이터, 가장 확실)
--   gsc_lowctr   노출 대비 CTR이 낮은 기존 페이지 → 리라이트 후보
--   suggest      구글 자동완성/연관검색 롱테일
--   community    레딧 등 커뮤니티에서 반복되는 질문
--   internal_gap 클러스터 배분 계획 대비 부족분(구조적 갭)

create table if not exists idea_candidates (
  id            uuid primary key default extensions.uuid_generate_v4(),
  topic         text not null,                    -- 제안 글감(제목형 한 줄)
  query         text,                             -- 근거가 된 검색어/질문
  cluster       text references clusters (key) on update cascade on delete set null,
  source        text not null
                check (source in ('gsc_gap','gsc_lowctr','suggest','community','internal_gap')),
  score         numeric not null default 0,       -- 우선순위 점수 (높을수록 먼저)
  impressions   int not null default 0,           -- GSC 소스일 때 노출수
  position      real,                             -- GSC 소스일 때 평균 게재순위
  evidence      jsonb not null default '{}'::jsonb, -- 소스별 원자료(URL·서브레딧·점수 근거 등)
  rationale     text not null default '',         -- 왜 이 글감인지 한 줄
  status        text not null default 'new'
                check (status in ('new','adopted','dismissed')),
  idea_id       uuid references post_ideas (id) on delete set null,  -- 채택 시 생성된 아이디어
  dedup_key     text not null unique,             -- 정규화된 핵심어 (재실행 시 중복 방지)
  first_seen_on date not null default current_date,
  last_seen_on  date not null default current_date,
  seen_count    int  not null default 1,          -- 며칠 연속 잡혔는지 (반복 = 신호가 진짜)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index idea_candidates_rank_idx   on idea_candidates (status, score desc);
create index idea_candidates_cluster_idx on idea_candidates (cluster, status);

-- 관리자 전용. service_role(supabaseAdmin)만 접근 — 공개 사이트에 절대 노출되지 않는다.
alter table idea_candidates enable row level security;

create policy "Service role full access idea_candidates"
  on idea_candidates
  using (auth.role() = 'service_role');

-- 실행 로그. "어제 돌았나?"를 관리자 화면에서 한 줄로 확인하기 위한 것.
create table if not exists idea_discovery_runs (
  id          uuid primary key default extensions.uuid_generate_v4(),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  ok          boolean not null default false,
  inserted    int not null default 0,             -- 새로 들어온 후보 수
  refreshed   int not null default 0,             -- 이미 있던 후보의 점수 갱신 수
  by_source   jsonb not null default '{}'::jsonb, -- 소스별 수집 개수
  errors      jsonb not null default '[]'::jsonb  -- 소스별 실패 사유 (하나 죽어도 나머지는 진행)
);

create index idea_discovery_runs_recent_idx on idea_discovery_runs (started_at desc);

alter table idea_discovery_runs enable row level security;

create policy "Service role full access idea_discovery_runs"
  on idea_discovery_runs
  using (auth.role() = 'service_role');
