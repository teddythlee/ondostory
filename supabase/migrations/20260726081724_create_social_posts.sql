-- 스레드 자동발행: posts.social_hook 컬럼 + social_posts 발행 이력 테이블
-- 주의: posts.id 는 uuid (bigint 아님) — FK/타입 이에 맞춤

alter table posts add column social_hook text;

create table social_posts (
  id            uuid primary key default extensions.uuid_generate_v4(),
  post_id       uuid not null references posts(id) on delete cascade,
  platform      text not null default 'threads',
  text          text not null,
  -- pending: 아직 안 보냄 / dispatched: Make가 접수함(스레드 게시 확인 아님) / failed: Make 호출 실패
  status        text not null default 'pending',
  error         text,
  dispatched_at timestamptz,
  created_at    timestamptz not null default now(),
  -- 중복 발행 방지의 핵심: post당 platform 하나. 재실행/재편집에도 두 번째 insert가 막힌다.
  unique (post_id, platform)
);

create index social_posts_status_idx on social_posts (status);

-- 서버(supabaseAdmin=service_role)만 접근. RLS 켜두고 정책 없음 = anon/authenticated 차단.
alter table social_posts enable row level security;
