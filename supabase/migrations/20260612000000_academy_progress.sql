-- Bucket Academy — cross-device progress sync (bkt-su9)
--
-- One row per (user, branch). `data` holds the exact localStorage blob the
-- Academy engine persists under key `bucket-academy/v1/<branch>` (FSRS cards,
-- xp, streak, settings, history). The client merges per-card by latest review
-- and uses `updated_at` as the row-level tiebreaker (most-recent wins).
--
-- Security model: passwordless email-OTP via Supabase Auth. Row-Level Security
-- guarantees a signed-in user can only read/write their OWN rows. The anon key
-- shipped to the browser is public by design; RLS is the real boundary.

create table if not exists public.academy_progress (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  branch     text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, branch)
);

-- Fast "all my branches" reads.
create index if not exists academy_progress_user_idx
  on public.academy_progress (user_id);

-- RLS: users only ever touch their own rows.
alter table public.academy_progress enable row level security;

-- Idempotent policy creation (Postgres has no CREATE POLICY IF NOT EXISTS).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'academy_progress'
      and policyname = 'academy_progress_select_own'
  ) then
    create policy academy_progress_select_own
      on public.academy_progress for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'academy_progress'
      and policyname = 'academy_progress_insert_own'
  ) then
    create policy academy_progress_insert_own
      on public.academy_progress for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'academy_progress'
      and policyname = 'academy_progress_update_own'
  ) then
    create policy academy_progress_update_own
      on public.academy_progress for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'academy_progress'
      and policyname = 'academy_progress_delete_own'
  ) then
    create policy academy_progress_delete_own
      on public.academy_progress for delete
      using (auth.uid() = user_id);
  end if;
end $$;

-- Keep updated_at honest on every write (clients also set it, but this is the
-- server-side source of truth used for conflict resolution).
create or replace function public.academy_progress_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists academy_progress_set_updated_at on public.academy_progress;
create trigger academy_progress_set_updated_at
  before insert or update on public.academy_progress
  for each row execute function public.academy_progress_touch_updated_at();
