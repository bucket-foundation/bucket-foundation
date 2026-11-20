create table if not exists bucket.testimonials (
  id bigint generated always as identity primary key,
  product text not null default 'polingual',
  person text not null,
  contact text,
  channel text not null,
  quote text not null,
  received_at date not null,
  used_app boolean not null default false,
  consent text not null default 'not_asked' check (consent in ('not_asked', 'asked', 'granted', 'declined')),
  display_name text,
  consent_at date,
  notes text,
  updated_at timestamptz not null default now()
);

alter table bucket.testimonials enable row level security;
revoke all on bucket.testimonials from anon, authenticated;
