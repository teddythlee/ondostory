-- Split a dedicated `car` cluster: car content hit 3 posts (battery replacement,
-- DMV vehicle registration, windshield glass repair), which is the "split at 3+"
-- threshold. Move them out of `settlement` into their own hub.

-- Make room to slot `car` right after `settlement` (sort_order 2).
update clusters set sort_order = sort_order + 1 where sort_order >= 2;

insert into clusters (key, emoji, title, nav_label, tagline, sort_order) values
  ('car', '🚗', '미국 자동차 가이드', '자동차',
   '배터리 교체, 유리 수리, DMV 차량 등록 등 미국에서 차를 소유하며 직접 겪은 실무를 모았습니다.', 2);

-- settlement no longer covers car/DMV
update clusters set
  tagline = '은행·송금·계좌·병원 등 미국에 자리 잡으며 직접 겪은 실무를 모았습니다.',
  updated_at = now()
where key = 'settlement';

-- reassign the 3 car posts
update posts set cluster = 'car', updated_at = now() where slug in (
  'review-honda-pilot-battery-replacement',
  'california-dmv-vehicle-registration-address-change',
  'buena-park-auto-glass-repair-review'
);
