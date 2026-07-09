-- 토픽 클러스터를 DB로 관리한다. 관리자에서 생성·수정·삭제하고, 글은 posts.cluster로 배정.
-- posts.cluster(text)는 clusters.key를 참조한다.

create table if not exists clusters (
  id uuid primary key default uuid_generate_v4(),
  key text not null unique,                 -- URL 경로: /guides/<key>
  emoji text not null default '📚',
  title text not null,                      -- 허브 H1 + 글 하단 복귀 링크 텍스트
  nav_label text not null default '',       -- 인덱스/내비 짧은 라벨
  tagline text not null default '',
  meta_description text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- posts 테이블과 동일한 RLS 정책: 공개는 전체 읽기, service_role은 전체 권한.
alter table clusters enable row level security;

create policy "Public read clusters"
  on clusters for select
  using (true);

create policy "Service role full access clusters"
  on clusters
  using (auth.role() = 'service_role');

-- 초기 클러스터 시드: 미국 정착(기존 settlement 확장), 맛집.
insert into clusters (key, emoji, title, nav_label, tagline, meta_description, sort_order) values
  (
    'settlement', '📚', '미국 정착 가이드', '정착 가이드',
    '미국에 자리 잡으며 직접 겪은 은행, 차량, 주거, 자녀 실무를 한곳에 모았습니다.',
    '미국 정착 실무 가이드 — 은행 계좌 개설, 캘리포니아 DMV 차량 등록, 렌트·이사, 자녀 학교와 병원까지 직접 겪은 후기 모음.',
    1
  ),
  (
    'food', '🍽️', '미국 맛집·집밥 가이드', '맛집 가이드',
    '오렌지카운티에서 직접 다녀온 한식 맛집과, 집에서 해먹은 삼겹살·집밥 기록을 모았습니다.',
    '미국(오렌지카운티) 한인 맛집과 집밥 가이드 — 꿀돼지 삼겹살, 다나포인트 화덕피자부터 웨버 그릴 숯불구이, 쿠쿠 밥솥 집밥까지 직접 겪은 후기.',
    2
  )
on conflict (key) do nothing;

-- 맛집 클러스터에 글 배정 (정착 9개는 이전 마이그레이션에서 이미 지정됨).
update posts set cluster = 'food'
where slug in (
  'irvine-honey-pig-review',
  'dana-point-restaurant-picks-apizza-doho-oven-pizza-review',
  'charcoal-pork-belly-american-home',
  'cukoo-rice-cooker-black-review'
);

-- 무결성: posts.cluster -> clusters.key. 클러스터 key 변경 시 글도 따라가고,
-- 클러스터 삭제 시 글의 cluster는 null로 풀린다.
alter table posts
  add constraint posts_cluster_fkey
  foreign key (cluster) references clusters (key)
  on update cascade on delete set null;
