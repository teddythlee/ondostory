-- 글 본문 변경 이력. 2026-09-14 사고 재발 방지용.
--
-- 사고: 품질 개선 스크립트가 content를 통째로 UPDATE 하면서 4편의 본문이 40~50% 사라졌다.
-- posts 에는 이력이 없고 본문은 git 이 아니라 DB 에만 있어서, 백업을 따로 만든 1편을 빼면
-- 원본을 되돌릴 수 없었다. 이 테이블이 있으면 같은 실수가 "복구 가능한 실수"가 된다.
--
-- 동작: posts 의 본문·제목·요약·메타·커버가 바뀌거나 행이 지워질 때, 트리거가 변경 전
--       스냅샷(OLD)을 여기에 적재한다. updated_at·view_count 만 바뀌는 저장은 적재하지 않는다.
--
-- 복구:  update posts p set content = r.content, updated_at = now()
--        from post_revisions r
--        where r.id = '<revision id>' and p.id = r.post_id;
--
-- 출처 표시: 스크립트에서 아래처럼 세션 변수를 설정하면 source 에 남는다.
--        select set_config('app.change_source', 'improve-watch-posts.mjs', true);

create table post_revisions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  slug text not null,
  title text not null,
  content text not null,
  excerpt text not null default '',
  meta_title text,
  meta_description text,
  cover_image text,
  tags text[] not null default '{}',
  category text,
  cluster text,
  status text,
  published boolean,
  -- content_chars = 이 스냅샷(변경 전)의 길이, next_content_chars = 변경 후 길이.
  -- 둘을 같이 두면 "어떤 수정이 본문을 얼마나 줄였나"를 조인 없이 바로 본다.
  content_chars integer not null,
  next_content_chars integer,
  change_kind text not null check (change_kind in ('baseline', 'update', 'delete')),
  source text not null default 'unknown',
  changed_at timestamptz not null default now()
);

create index post_revisions_post_idx on post_revisions(post_id, changed_at desc);
create index post_revisions_shrink_idx on post_revisions(changed_at desc)
  where next_content_chars is not null;

alter table post_revisions enable row level security;

create policy "Service role full access post_revisions"
  on post_revisions using (auth.role() = 'service_role');

create or replace function archive_post_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  -- 본문/표시에 영향 없는 저장(updated_at, view_count 등)은 이력을 남기지 않는다.
  if tg_op = 'UPDATE'
     and old.content is not distinct from new.content
     and old.title is not distinct from new.title
     and old.excerpt is not distinct from new.excerpt
     and old.meta_title is not distinct from new.meta_title
     and old.meta_description is not distinct from new.meta_description
     and old.cover_image is not distinct from new.cover_image then
    return new;
  end if;

  insert into post_revisions (
    post_id, slug, title, content, excerpt, meta_title, meta_description, cover_image,
    tags, category, cluster, status, published,
    content_chars, next_content_chars, change_kind, source
  ) values (
    old.id, old.slug, old.title, old.content, old.excerpt, old.meta_title, old.meta_description, old.cover_image,
    old.tags, old.category, old.cluster, old.status, old.published,
    char_length(old.content),
    case when tg_op = 'UPDATE' then char_length(new.content) end,
    lower(tg_op),
    coalesce(nullif(current_setting('app.change_source', true), ''), 'unknown')
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$fn$;

create trigger trg_archive_post_revision
  before update or delete on posts
  for each row
  execute function archive_post_revision();

-- 오늘 시점의 본문을 복구 기준점으로 한 번 적재해 둔다.
-- (트리거는 다음 수정부터 동작하므로, 그 전에 무슨 일이 생겨도 되돌릴 지점이 남게)
insert into post_revisions (
  post_id, slug, title, content, excerpt, meta_title, meta_description, cover_image,
  tags, category, cluster, status, published, content_chars, change_kind, source
)
select
  id, slug, title, content, excerpt, meta_title, meta_description, cover_image,
  tags, category, cluster, status, published, char_length(content), 'baseline', 'migration/20260915103000'
from posts;
