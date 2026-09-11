-- Research OS for K-12, faded guidance for low-prior-knowledge learners
-- (bkt-ros ros-14). See learning/research-os/GUIDANCE.md for the full
-- design account.
--
-- Two additive columns, both idempotent (`add column if not exists`),
-- matching every other migration in this repo:
--
-- graph.nodes.worked_example: an authored (not verbatim) grade-appropriate
-- model explanation of the node's own idea plus the source it rests on,
-- {"text": string, "source": string}. Nullable, no default: most nodes
-- carry none (db.ts's toWorkedExample treats a missing or malformed value
-- as absent, never a half-built example). Seeded on the sky-blue path's
-- first six nodes by supabase/seed/research-os-sky-blue.json's own
-- worked_example key, written by scripts/seed-research-os.mjs.
--
-- graph.classes.research_os_guidance_enabled: the per-class arm switch
-- (item 4, "mirrors the forcing switch from PR #63"). PR #63 (cognitive
-- forcing) had not merged into main as of this migration; no existing
-- forcing-switch column was found on graph.classes to mirror the name and
-- default of, so this adds its own, following graph.classes' own existing
-- convention (a plain boolean, default true -- the base product behavior
-- is guidance ON, a pilot opts a specific class OUT for its control arm,
-- matching PR #63's review pass, once merged, to confirm whether the two
-- switches should be renamed onto one shared naming convention; see
-- GUIDANCE.md's own "Open questions" note).
alter table graph.nodes add column if not exists worked_example jsonb;

alter table graph.classes add column if not exists research_os_guidance_enabled boolean not null default true;
