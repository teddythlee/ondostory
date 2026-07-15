-- Expand topic clusters: split the overloaded `settlement` bucket and give the
-- 4 unclustered posts a home. Principle: no 1-2 post clusters yet — merge thin
-- themes into `settlement` now, split them out (car / health / product reviews)
-- once each grows to 3+ posts.
--
-- Result (6 clusters, each >= 3 posts):
--   settlement  정착 실무 (금융·행정·자동차·의료)  5
--   housing     렌트·이사                          4  [new]
--   kids        자녀교육·학교                      3  [new]
--   food        맛집·집밥                          5
--   travel      여행·나들이                        5
--   shopping    쇼핑·생활정보                      3  [new]

-- 1. Narrow the existing `settlement` cluster (now = settling-in practicalities)
update clusters set
  emoji = '🧭',
  title = '미국 정착 실무 가이드',
  nav_label = '정착 실무',
  tagline = '은행·송금·DMV·자동차·병원 등 미국에 자리 잡으며 직접 겪은 실무를 모았습니다.',
  sort_order = 1,
  updated_at = now()
where key = 'settlement';

update clusters set sort_order = 4, updated_at = now() where key = 'food';
update clusters set
  tagline = '남가주에 살며 직접 다녀온 여행지와 근교 나들이·로컬 이벤트 후기를 모았습니다.',
  sort_order = 5, updated_at = now()
where key = 'travel';

-- 2. New clusters
insert into clusters (key, emoji, title, nav_label, tagline, sort_order) values
  ('housing',  '🏠', '미국 렌트·이사 가이드',   '렌트·이사',
     '아파트·하우스 렌트, 이사, 디파짓 정산까지 직접 겪은 주거 경험을 모았습니다.', 2),
  ('kids',     '🎒', '미국 자녀교육·학교 가이드', '자녀교육',
     '학원·백투스쿨·학교 행정 등 아이를 키우며 겪은 미국 교육 경험을 모았습니다.', 3),
  ('shopping', '🛍️', '미국 쇼핑·생활정보',       '쇼핑·생활',
     '세일·중고거래·생활 꿀팁 등 미국 생활에 필요한 정보를 모았습니다.', 6);

-- 3. Reassign posts (only the ones that move; settlement/food keep their rest)
update posts set cluster = 'housing', updated_at = now() where slug in (
  'irvine-company-moveout-review',
  'us-apartment-vs-house-rentals',
  'morning-at-tustin-ranch',
  'u-haul-rental-review-10-foot-truck'
);

update posts set cluster = 'kids', updated_at = now() where slug in (
  'kumon-review-irvine-tustin-tutoring',
  'back-to-school-shopping-list',
  'sports-physical-exer-irvine'
);

update posts set cluster = 'travel', updated_at = now() where slug in (
  'irvine-promenade-recommendations-walk-around',
  'oc-independence-day-fireworks-tustin'
);

update posts set cluster = 'shopping', updated_at = now() where slug in (
  'cos-south-coast-plaza-review',
  'us-secondhand-marketplace-apps',
  'watch-2026-world-cup-korea'
);
