-- blog-images 스토리지 버킷 + RLS 정책.
-- 원격에는 초기(2026-06-10)에 이미 적용돼 있었으나 로컬 마이그레이션 파일이 없어
-- `supabase db reset`(로컬 파일 기반 복원) 시 버킷이 재생성되지 않는 드리프트가 있었다.
-- 현재 운영 DB 상태를 그대로 재현하도록 백필한다. (이미 존재하는 원격에는 no-op)

-- 버킷: 공개 읽기, 10MB 제한, 이미지 MIME만 허용
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,
  10485760,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 정책 (storage.objects). 재실행 안전하도록 drop 후 create.
drop policy if exists "Public read blog images" on storage.objects;
create policy "Public read blog images"
  on storage.objects for select
  using (bucket_id = 'blog-images');

drop policy if exists "Admin upload blog images" on storage.objects;
create policy "Admin upload blog images"
  on storage.objects for insert
  with check (bucket_id = 'blog-images');

drop policy if exists "Admin delete blog images" on storage.objects;
create policy "Admin delete blog images"
  on storage.objects for delete
  using (bucket_id = 'blog-images');
