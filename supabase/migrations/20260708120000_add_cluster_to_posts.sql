-- posts에 cluster(주제 클러스터) 컬럼 추가.
-- category는 자유 형식 표시용 분류라 SEO 토픽 클러스터로 쓸 수 없어 전용 컬럼을 둔다.
-- 값 예시: 'settlement'(정착/실무), 'local'(로컬 장소), 'review'(제품/여행 리뷰). null = 미분류.
alter table posts add column if not exists cluster text default null;

-- A그룹(정착/실무) 9개 글을 settlement 클러스터로 지정.
update posts set cluster = 'settlement'
where slug in (
  'create-us-child-bank-account',                            -- 체이스 하이스쿨 체킹
  'how-to-transfer-korean-assets-to-us-house-purchase-funds',-- 한국 자산 미국 송금
  'california-dmv-vehicle-registration-address-change',      -- DMV 차량 등록
  'sports-physical-exer-irvine',                             -- 스포츠 피지컬 (Exer)
  'u-haul-rental-review-10-foot-truck',                      -- 유홀 셀프 이사
  'us-apartment-vs-house-rentals',                           -- 아파트 vs 하우스 렌트
  'irvine-company-moveout-review',                           -- Irvine Company 디파짓 정산
  'dami-dental-hawaiian-garden-review',                      -- 다미 치과
  'review-honda-pilot-battery-replacement'                   -- 혼다 파일럿 배터리
);
