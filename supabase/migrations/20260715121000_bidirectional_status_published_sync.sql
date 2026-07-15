-- Make the status<->published sync bidirectional for the transition window.
-- Before the new app code is deployed, the live (old) app still writes the
-- boolean `published`; after deploy, code writes `status`. This trigger keeps
-- whichever one the caller set authoritative and derives the other, so both
-- old and new writers behave correctly. Remove together with `published`
-- once the migration to `status` is complete.

create or replace function sync_published_from_status()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.published and new.status = 'draft' then
      -- old writer: set published=true, left status at its default
      new.status := 'published';
    else
      -- new writer (status authoritative) or a non-published row
      new.published := (new.status = 'published');
    end if;
  else  -- UPDATE
    if new.status is distinct from old.status then
      -- status was changed (new writer) -> derive published
      new.published := (new.status = 'published');
    elsif new.published is distinct from old.published then
      -- published was changed (old writer) -> derive status
      new.status := case when new.published then 'published' else 'draft' end;
    end if;
  end if;
  return new;
end;
$$;
