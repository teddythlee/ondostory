-- 글자수(공백 제외) 표시용. HTML 태그와 모든 공백을 제거한 뒤 글자 수를 세는 생성 컬럼.
-- STORED generated column이라 content가 바뀌면 자동 재계산된다. 목록 쿼리(content 미포함)에서도
-- 이 값만 싸게 가져올 수 있다.

alter table posts add column content_chars int
  generated always as (
    char_length(regexp_replace(regexp_replace(content, '<[^>]+>', '', 'g'), '\s', '', 'g'))
  ) stored;
