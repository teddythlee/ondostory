-- Add a richer `status` column to posts and make it the source of truth.
-- The legacy boolean `published` is kept as a derived shadow (via trigger)
-- so any un-migrated reader stays correct. Drop `published` in a later
-- migration once the app fully runs on `status`.

-- 1. New status column (draft is the safe default for agent-inserted drafts)
alter table posts
  add column status text not null default 'draft'
  check (status in ('draft', 'published', 'scheduled', 'archived'));

-- 2. Backfill from the existing boolean (runs before the trigger exists)
update posts
  set status = case when published then 'published' else 'draft' end;

-- 3. Keep `published` in sync as a derived shadow of `status`.
--    App now writes `status`; this guarantees `published` never drifts.
create or replace function sync_published_from_status()
returns trigger
language plpgsql
as $$
begin
  new.published := (new.status = 'published');
  return new;
end;
$$;

create trigger trg_sync_published
  before insert or update on posts
  for each row
  execute function sync_published_from_status();
