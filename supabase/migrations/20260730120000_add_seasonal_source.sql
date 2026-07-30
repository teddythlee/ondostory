-- 발굴 소스에 '시즌/이벤트'(seasonal) 추가.
-- 다가오는 이벤트(추석 항공권·백투스쿨·블프·택스 등)를 리드타임 맞춰 미리 글감으로 띄운다.

alter table idea_candidates drop constraint if exists idea_candidates_source_check;

alter table idea_candidates add constraint idea_candidates_source_check
  check (source in ('gsc_gap','gsc_lowctr','suggest','community','internal_gap','naver','seasonal'));
