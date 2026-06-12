create or replace function increment_view_count(post_slug text)
returns void
language sql
security definer
as $$
  update posts set view_count = view_count + 1 where slug = post_slug and published = true;
$$;
