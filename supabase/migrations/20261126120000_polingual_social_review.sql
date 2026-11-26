alter table bucket.polingual_social_posts add column if not exists hashtags text not null default '';
alter table bucket.polingual_social_posts add column if not exists slides text[] not null default '{}';
alter table bucket.polingual_social_posts add column if not exists sent jsonb not null default '{}'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('polingual-social', 'polingual-social', true, 10485760, array['image/jpeg'])
on conflict (id) do nothing;
