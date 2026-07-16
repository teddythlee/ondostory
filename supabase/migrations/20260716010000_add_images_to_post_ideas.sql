-- Let an idea carry photos captured at the same time (phone-friendly).
-- Images are uploaded to the blog-images storage bucket via /api/upload and
-- their permanent public URLs stored here. When a draft is generated from the
-- idea, these images are embedded into the post.

alter table post_ideas
  add column image_urls text[] not null default '{}';
