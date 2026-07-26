-- v3(Buffer 직접 호출): Buffer가 반환하는 post id 저장용.
-- 나중에 external_id로 Buffer post 상태를 대조/삭제할 수 있다.
alter table social_posts add column external_id text;
