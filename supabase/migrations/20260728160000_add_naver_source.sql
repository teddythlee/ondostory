-- 발굴 소스에 '네이버 자동완성'(naver) 추가.
-- 기존 CHECK 제약이 naver를 막으므로 제약을 갈아끼운다.
-- (레딧/community 는 코드에서 기본 off로 내리지만, 과거 후보가 남아 있을 수 있어 제약에는 그대로 둔다.)

alter table idea_candidates drop constraint if exists idea_candidates_source_check;

alter table idea_candidates add constraint idea_candidates_source_check
  check (source in ('gsc_gap','gsc_lowctr','suggest','community','internal_gap','naver'));
