-- posts.noindex — 글 단위 색인 보류 플래그 (가역적)
--
-- 배경: AdSense가 두 번째로 "가치 없는 콘텐츠"로 반려했다. 최근 6주 GSC 기준
-- 64편 중 검색에 노출된 글이 17편뿐이고, 나머지는 색인돼 있어도 구글이 보여주지 않는다.
-- 심사에서 불리하게 작용할 수 있는 얇은 단편(지역 식당·이벤트 후기 등)을 한시적으로
-- 색인에서 빼고, 승인 후 다시 켜는 전략. 글을 삭제하거나 비공개로 돌리지 않는다.
--
-- 동작: noindex=true 면
--   1) /blog/<slug> 가 robots: noindex, follow 로 렌더된다(링크는 계속 따라가게 둔다)
--   2) sitemap.xml 에서 빠진다
--   3) 사이트 안에서는 그대로 보이고 읽힌다 — 되살리려면 이 컬럼만 false 로 바꾸면 끝
--
-- 선정 기준(2026-10-01): 최근 6주(9/14~10/1 스냅샷) 노출 0 + 생애 노출 10 이하
--   + 본문 3,000자 미만 + 중심축(housing = 렌트·이사) 아님 + 정책 페이지 아님.
-- 중심축 글과 분량 있는 가이드(DMV 갱신·이민 서류·집 구매 등)는 노출이 0이어도 유지한다.
-- 중심축을 깊게 파는 전략의 대상이고, 사이트의 실질 분량이기 때문.

alter table posts add column if not exists noindex boolean not null default false;

comment on column posts.noindex is
  '색인 보류 플래그. true면 robots noindex,follow + sitemap 제외. 글은 사이트에 그대로 노출된다. AdSense 승인 후 false로 복구 대상.';

create index if not exists posts_noindex_idx on posts(noindex) where noindex;

update posts set noindex = true, updated_at = now()
where slug in (
  -- food: 노출 0~10, 2,100~2,900자 지역 식당·집밥 단편
  'artesia-gangnam-kimbob-review',
  'broken-yolk-buena-park',
  'charcoal-pork-belly-american-home',
  'dana-point-restaurant-picks-apizza-doho-oven-pizza-review',
  'irvine-mochi-dessert-cafe-review',
  'sushi-damu-tustin-ayce-review',
  -- travel: 지난 시즌 이벤트·동네 산책
  'irvine-promenade-recommendations-walk-around',
  'oc-independence-day-fireworks-tustin',
  -- kids: 노출 0, 얇은 학원·검진 단편
  'kumon-review-irvine-tustin-tutoring',
  'sports-physical-exer-irvine',
  -- car / shopping: 사이트 최단 글(1,958자)과 지난 세일 후기
  'review-honda-pilot-battery-replacement',
  'irvine-stussy-outlet-sale'
);
