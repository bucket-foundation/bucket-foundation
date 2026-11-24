create table if not exists bucket.polingual_social_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  platform text not null check (platform in ('tiktok', 'instagram', 'youtube', 'x', 'threads')),
  scheduled_for timestamptz not null,
  status text not null default 'ready' check (status in ('ready', 'draft_delivered', 'posted', 'skipped')),
  caption text not null default '',
  preview_url text,
  views bigint not null default 0 check (views >= 0),
  likes bigint not null default 0 check (likes >= 0),
  shares bigint not null default 0 check (shares >= 0),
  approved_at timestamptz,
  approved_by text,
  updated_at timestamptz not null default now(),
  unique (slug, platform)
);

create index if not exists polingual_social_posts_scheduled on bucket.polingual_social_posts (scheduled_for);

create table if not exists bucket.polingual_social_metrics (
  post_id uuid not null references bucket.polingual_social_posts (id) on delete cascade,
  captured_at timestamptz not null default now(),
  views bigint not null default 0 check (views >= 0),
  likes bigint not null default 0 check (likes >= 0),
  shares bigint not null default 0 check (shares >= 0),
  primary key (post_id, captured_at)
);

alter table bucket.polingual_social_posts enable row level security;
alter table bucket.polingual_social_posts force row level security;
alter table bucket.polingual_social_metrics enable row level security;
alter table bucket.polingual_social_metrics force row level security;
revoke all on bucket.polingual_social_posts from public, anon, authenticated;
revoke all on bucket.polingual_social_metrics from public, anon, authenticated;
grant select, insert, update on bucket.polingual_social_posts to service_role;
grant select, insert on bucket.polingual_social_metrics to service_role;

create trigger polingual_social_posts_touch before update on bucket.polingual_social_posts
  for each row execute function bucket.touch_updated_at();
