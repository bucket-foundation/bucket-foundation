-- Research OS for K-12, the Production provenance guard (bkt-ros,
-- production guard bead). Five columns on graph.productions closing the
-- gaps that bead names: quote-locator source verification, duplicate
-- detection against prior work and canon, an optional-to-required
-- counter-evidence field (Osborne 2010), and a computed citation-
-- incentive-eligibility flag (GOVERNANCE.md: payment only after canon
-- acceptance). See learning/research-os/PRODUCTION-GUARD.md for the full
-- rule set and src/lib/research-os/production-guard.ts for the pure
-- functions that compute each value; this migration only adds the
-- columns those functions' callers write to and read from.
--
-- Idempotent: safe to re-run, matching every other migration in this repo.

-- source_provenance: parallel array to `sources`, one entry per source
-- line, {"text","verified"}. Computed and written at submit time by
-- /api/research-os/production's POST (production-guard.ts's
-- checkSourceProvenance against this learner's own "quote"-kind evidence
-- events), read but never recomputed by the review queue (task item 5).
alter table graph.productions add column if not exists source_provenance jsonb not null default '[]'::jsonb;

-- duplicate_flag: null, or {"matchId","matchOrigin","score"} when this
-- production's claim text scored at or above production-guard.ts's
-- DUPLICATE_OVERLAP_THRESHOLD against the learner's own prior work, a
-- classmate's accepted work in the same class, or a canon claim text.
-- Never blocks submission; always visible to the reviewer (task item 2).
alter table graph.productions add column if not exists duplicate_flag jsonb;

-- counter_evidence: the learner's own rebuttal notes, [{"text": string}],
-- optional in Phase 0, required at submission for an internalization-tier
-- production (production-guard.ts's requiresCounterEvidence, Osborne
-- 2010's argumentation case: the reasoning benefit comes from defending a
-- claim against a challenge).
alter table graph.productions add column if not exists counter_evidence jsonb not null default '[]'::jsonb;

-- counter_evidence_required: a snapshot of production-guard.ts's
-- requiresCounterEvidence(fromStage), taken at the same submit-time
-- moment source_provenance and duplicate_flag are computed. The live
-- submit route already refuses a submission that needs counter-evidence
-- and has none (defense in depth: this column lets the review queue
-- surface "missing counter-evidence" for a production written by any
-- other path, e.g. a pre-guard row, with no re-derivation of fromStage
-- needed at read time).
alter table graph.productions add column if not exists counter_evidence_required boolean not null default false;

-- production_incentive_eligible: computed once, at the moment a
-- reviewer's decision flips `status` to 'accepted' (production-guard.ts's
-- computeIncentiveEligible), true only when the target node's linked
-- canon record (graph.nodes.provenance.paper_id) carries a raw
-- provenance_signoff value starting with "approved" (GOVERNANCE.md,
-- "Canon sign-off"). No payment code reads this column yet; it exists so
-- a future payout pass has a real, audited eligibility signal to read
-- instead of re-deriving one.
alter table graph.productions add column if not exists production_incentive_eligible boolean not null default false;
