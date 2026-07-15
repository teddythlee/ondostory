-- Normalize existing tags to the confirmed convention: spaces, not hyphens.
-- (This site splits tags on commas, not spaces, and has no /tag/ routes, so a
-- multi-word tag with spaces is one safe tag. Hyphens only fragmented the
-- global tag set — e.g. "얼바인 학원" vs "얼바인-학원" counted as two.)
--
-- For each post that has a hyphenated tag: replace '-' with ' ', trim, and
-- de-duplicate while preserving original tag order. Posts without hyphen tags
-- are left untouched.

update posts p
set tags = sub.new_tags,
    updated_at = now()
from (
  select id, array_agg(tag order by ord) as new_tags
  from (
    select id, tag, min(ord) as ord
    from (
      select id, btrim(replace(t, '-', ' ')) as tag, ord
      from posts, unnest(tags) with ordinality as u(t, ord)
    ) x
    group by id, tag        -- dedup by normalized tag, keep earliest position
  ) y
  group by id
) sub
where p.id = sub.id
  and exists (select 1 from unnest(p.tags) as t where t like '%-%');
