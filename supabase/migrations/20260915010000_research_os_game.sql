-- Research OS, the game layer (ros-33): XP, levels, streaks, badges on the
-- learner profile. INTEGRATION-PLAN.md section 6. Rules in
-- src/lib/research-os/game.ts; awarded inside recordEvidence (db.ts) so
-- every level transition, wherever it is recorded, counts once.
alter table graph.learner_profiles add column if not exists xp integer not null default 0;
alter table graph.learner_profiles add column if not exists streak_days integer not null default 0;
alter table graph.learner_profiles add column if not exists last_active_day date;
-- [{"kind": "internalized" | "produced", "node_id": "<uuid>", "at": "<iso>"}]
alter table graph.learner_profiles add column if not exists badges jsonb not null default '[]'::jsonb;
create index if not exists learner_profiles_xp_idx on graph.learner_profiles (xp desc);
