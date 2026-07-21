-- car 클러스터를 settlement로 병합.
-- car는 3편(<5편)짜리 얇은 허브였고, 자동차는 원래 '정착 실무'의 일부라 되돌린다.
-- /guides/car 는 아직 구글 색인 전이지만, sitemap에 올라가 있었으므로
-- next.config.ts에서 /guides/settlement 로 308 리다이렉트한다(GSC 404 방지).

update posts set cluster = 'settlement' where cluster = 'car';
delete from clusters where key = 'car';
