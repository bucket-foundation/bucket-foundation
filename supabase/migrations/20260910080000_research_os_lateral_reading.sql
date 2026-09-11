-- Research OS for K-12, lateral reading (bkt-ros,
-- learning/research-os/PLAN-REVISION-3.md section 2c, "Lateral reading
-- against a single-source Check," STRONG LEAN). Two columns:
--
-- 1. graph.classes.second_source_required: the per-class arm switch for
-- the Check second-source gate (src/lib/research-os/lateral-reading.ts's
-- resolveSecondSourceRequired), the exact same pattern
-- 20260910060000_research_os_forcing.sql's forcing_enabled already
-- established for the cognitive-forcing arm switch. Nullable: null means
-- "no class-level override, read the RESEARCH_OS_SECOND_SOURCE_REQUIRED
-- env var instead." A real true/false pins a class to one arm regardless
-- of the env default, so a pilot can run a comparison arm's classes on
-- the same deployment as the default-on arm's classes.
--
-- 2. graph.productions.lateral_reading_flag: the production-guard flag
-- (src/lib/research-os/production-guard.ts's lateralReadingFlag),
-- "single-source" or null, computed once at submit time by
-- /api/research-os/production's POST against this learner's own
-- "corroboration"-kind evidence events, the same "computed once, never
-- recomputed" discipline 20260910060000_research_os_production_guard.sql's
-- duplicate_flag already keeps. Informational only, never blocks an
-- accept decision the way an unverified source does.
--
-- Idempotent: safe to re-run, matching every other migration in this repo.

alter table graph.classes add column if not exists second_source_required boolean;

alter table graph.productions add column if not exists lateral_reading_flag text check (lateral_reading_flag in ('single-source'));
