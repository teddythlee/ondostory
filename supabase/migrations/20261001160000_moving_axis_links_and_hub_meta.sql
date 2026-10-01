-- 중심축(housing = 렌트·이사) 구조 정비 — docs/moving-cluster-plan.md 1차 실행
--
-- 1) 축의 두 유입 글을 서로 연결한다.
--    유홀 글(최근 28일 746노출·17클릭)과 중고거래 글(408노출·9클릭)이 사이트 유입의
--    대부분인데 서로 링크가 없었다. 유홀 글은 housing 글 5편과 이미 연결돼 있지만
--    '짐 처분' 단계가 비어 있었고, 중고거래 글은 축 밖(COS 세일)으로만 나가고 있었다.
--    문단 통째 교체가 아니라 해당 문장만 부분 교체한다.
--
-- 2) 클러스터 허브 meta_description 채우기 — housing·kids·shopping 이 빈 문자열이라
--    검색결과 설명이 자동 생성에 맡겨져 있었다. housing 은 중심축이라 특히 중요하다.

update posts
set content = replace(
  content,
  '해 버티는 방법도 있다. 짐을 다 옮긴 뒤에도',
  '해 버티는 방법도 있다. 트럭 사이즈를 줄이는 가장 확실한 방법은 옮길 짐을 줄이는 것인데, 가구·가전을 미리 처분할 때는 <a href="/blog/us-secondhand-marketplace-apps">미국 중고거래 앱</a>이 먼저 후보가 된다. 짐을 다 옮긴 뒤에도'
),
  updated_at = now()
where slug = 'u-haul-rental-review-10-foot-truck'
  and content like '%해 버티는 방법도 있다. 짐을 다 옮긴 뒤에도%';

update posts
set content = replace(
  content,
  '<p>중고 말고 새 물건을 저렴하게 노린다면, 사우스코스트플라자 <a href="/blog/cos-south-coast-plaza-review">COS 세일</a> 같은 브랜드 세일 후기도 있다.</p>',
  '<p>중고거래가 가장 많이 필요해지는 때는 이사 전후다. 옮길 짐을 먼저 줄이면 트럭 사이즈와 렌트 비용이 달라지므로, 처분과 이사 일정을 같이 잡는 편이 낫다. 트럭 쪽은 <a href="/blog/u-haul-rental-review-10-foot-truck">유홀 트럭 렌트 총정리</a>에 사이즈·가격·반납까지 정리해뒀다. 중고 말고 새 물건을 저렴하게 노린다면, 사우스코스트플라자 <a href="/blog/cos-south-coast-plaza-review">COS 세일</a> 같은 브랜드 세일 후기도 있다.</p>'
),
  updated_at = now()
where slug = 'us-secondhand-marketplace-apps'
  and content like '%중고 말고 새 물건을 저렴하게 노린다면%';

update clusters set meta_description =
  '미국 렌트·이사 가이드 — 아파트 렌트 계약과 SSN·크레딧 없이 승인받기, 유홀 트럭 이사, 유틸리티 개통, 주소 변경, 디파짓 정산까지 오렌지카운티에서 직접 겪은 순서.',
  updated_at = now()
where key = 'housing' and coalesce(meta_description, '') = '';

update clusters set meta_description =
  '미국 자녀교육 가이드 — 초등 입학 서류, 백투스쿨 준비물, 학원·튜터링, 스포츠 피지컬까지 얼바인·OC에서 아이를 키우며 직접 겪은 학교 행정과 준비 과정.',
  updated_at = now()
where key = 'kids' and coalesce(meta_description, '') = '';

update clusters set meta_description =
  '미국 쇼핑·생활 가이드 — 다이소·코스트코 실측, 중고거래 앱, 브랜드 세일, 한국 직구 관세까지 오렌지카운티에서 직접 사보고 정리한 기록.',
  updated_at = now()
where key = 'shopping' and coalesce(meta_description, '') = '';

-- 3) us-tipping-guide 색인 보류 추가.
--    URL 검사 결과 "발견됨 — 색인 생성되지 않음"이고 lastCrawlTime 이 비어 있다(미크롤).
--    여기에 경험 신호 1개(2,291자), 내부 인바운드 링크 0개(고아 글), 주제 자체가
--    한국어로 이미 포화된 일반론이라 차별성이 없다 → 승인 후 재검토 대상으로 돌린다.
--    같은 상태였던 us-buying-first-car 는 유지한다: 3,867자·구체성 지표 만점·경험 신호 3개이고
--    최근 크롤된 글(스모그 체크 9/29)에서 인바운드 링크가 이미 있어 크롤 예산 문제로 보인다.
update posts set noindex = true, updated_at = now() where slug = 'us-tipping-guide';
