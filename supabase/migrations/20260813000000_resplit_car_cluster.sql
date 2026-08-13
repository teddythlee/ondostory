-- Re-split a dedicated `car` cluster. Car content is now 7 posts (자동차 보험,
-- 차 사기, 렌트카, DMV 등록, DMV 면허, 앞유리 수리, 혼다 배터리) — well past the
-- 5-post threshold that caused the 2026-07 merge-back (20260721130000). At 3 posts
-- it was too thin; at 7 it stands on its own and matches how people search
-- (미국 자동차 보험 / 렌트카 / DMV — grouped by "car", not "정착").
--
-- Companion change: the /guides/car → /guides/settlement 308 redirect added in the
-- merge-back is REMOVED from next.config.ts in the same change; otherwise the new
-- car hub would be shadowed by the redirect.
--
-- sort_order 2 is currently a gap (the merge-back deleted car at 2 without
-- re-decrementing), so we slot car back into 2 without touching other clusters.

insert into clusters (key, emoji, title, nav_label, tagline, meta_description, sort_order) values
  ('car', '🚗', '미국 자동차 가이드', '자동차',
   '차 구매·보험·DMV·렌트카·정비까지 미국에서 차를 소유하며 직접 겪은 실무를 모았습니다.',
   '미국 자동차 가이드 — 차 구매·자동차 보험·캘리포니아 DMV 등록/면허·렌트카·앞유리 수리까지 한인이 직접 겪은 후기와 실무 정리.',
   2);

-- settlement tagline no longer leads with car/DMV
update clusters set
  tagline = '은행·계좌·크레딧·비자 서류·병원·통신 등 미국에 자리 잡으며 직접 겪은 실무를 모았습니다.',
  updated_at = now()
where key = 'settlement';

-- reassign the 7 car posts (slugs unchanged → no post redirects needed)
update posts set cluster = 'car', updated_at = now() where slug in (
  'review-honda-pilot-battery-replacement',
  'california-dmv-vehicle-registration-address-change',
  'buena-park-auto-glass-repair-review',
  'california-dmv-license-renewal',
  'us-rental-car-after-arrival',
  'us-buying-first-car',
  'us-car-insurance'
);
