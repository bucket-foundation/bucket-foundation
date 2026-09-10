-- Research OS <-> hypothesis engine bridge, ros-12 item 2 ("the outbox has
-- no reader yet"). `hte.corpus.research_os_outbox.load`/`load_and_consume`
-- (`tools/hypothesis-engine`) read `public.research_os_productions_outbox`
-- filtered to `consumed_at is null`, then set `consumed_at` on every row
-- they read, so a repeat campaign run never re-ingests the same production
-- twice. The column did not exist before this migration
-- (`20260910010000_research_os_engine_bridge.sql`'s own table definition
-- has no analog to it): additive, idempotent (`add column if not exists`),
-- matching every other migration in this repo.

alter table public.research_os_productions_outbox
  add column if not exists consumed_at timestamptz;

create index if not exists research_os_productions_outbox_unconsumed_idx
  on public.research_os_productions_outbox (created_at)
  where consumed_at is null;
