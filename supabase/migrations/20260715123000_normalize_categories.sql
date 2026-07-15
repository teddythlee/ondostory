-- Normalize the messy free-text `category` field into a fixed 2-value vocab.
-- Role split: cluster = 주제(topic hub), category = 글 유형(content type).
--   후기 = 특정 제품·장소·서비스 직접 경험 평가 (default, majority)
--   정보 = 방법·비교·리스트 (how-to / comparison / list)
-- Before: 17 distinct values across 25 posts (near-unique, filter unusable).

-- Everything defaults to 후기 (the blog is overwhelmingly experience reviews)
update posts set category = '후기', updated_at = now()
where slug not in ('about','contact','privacy-policy','terms','disclaimer');

-- Reclassify the how-to / comparison / list posts as 정보
update posts set category = '정보', updated_at = now()
where slug in (
  'us-apartment-vs-house-rentals',                              -- 렌트 비교
  'watch-2026-world-cup-korea',                                 -- 보는 법
  'create-us-child-bank-account',                               -- 계좌 개설 방법
  'how-to-transfer-korean-assets-to-us-house-purchase-funds',  -- 송금 방법
  'sports-physical-exer-irvine',                                -- 절차·준비물
  'us-secondhand-marketplace-apps',                             -- 앱 4개 비교
  'back-to-school-shopping-list',                               -- 준비물 리스트
  'california-dmv-vehicle-registration-address-change'          -- 문제 해결법
);
