-- 이미지 권리·출처를 URL만으로 추측하지 않고 증빙과 함께 관리한다.
-- 품질 점검은 이 자산대장을 기준으로 출처 불명/외부 핫링크/중복 사용을 경고한다.

create table image_assets (
  image_url text primary key,
  host text not null default '',
  storage_path text,
  origin_type text not null default 'unknown'
    check (origin_type in ('unknown', 'original', 'licensed_stock', 'ai_generated', 'business_provided')),
  rights_status text not null default 'unverified'
    check (rights_status in ('unverified', 'verified', 'rejected')),
  source_url text,
  creator text,
  license_name text,
  verification_note text not null default '',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);

create table post_image_usages (
  post_id uuid not null references posts(id) on delete cascade,
  image_url text not null references image_assets(image_url) on delete cascade,
  placement text not null check (placement in ('cover', 'body')),
  alt_text text not null default '',
  last_seen_at timestamptz not null default now(),
  primary key (post_id, image_url, placement)
);

create index image_assets_rights_idx on image_assets(rights_status, updated_at desc);
create index post_image_usages_image_idx on post_image_usages(image_url);

alter table image_assets enable row level security;
alter table post_image_usages enable row level security;

create policy "Service role full access image_assets"
  on image_assets using (auth.role() = 'service_role');
create policy "Service role full access post_image_usages"
  on post_image_usages using (auth.role() = 'service_role');
