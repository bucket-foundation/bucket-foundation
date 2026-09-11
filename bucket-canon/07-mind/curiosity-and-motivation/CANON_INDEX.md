# curiosity-and-motivation: Canon Index

**Branch**: `07-mind/curiosity-and-motivation/`
**Scope**: foundation-tier only. Primary theoretical and experimental statements of how curiosity, intrinsic need satisfaction, and incentive structure govern human motivation and information-seeking: the information-gap account of curiosity, its hippocampal and dopaminergic mechanism, self-determination theory, and the non-monotonic effect of small incentives on effort.
**Seeded**: 2026-09-10 (canon intake pass two, `intake/ros-canon-promotion-2`), promoted from `_intake/research-os-k12-literature/`. Four records, all resolved live via `tools/canon-pipeline/canon.py resolve <doi>`, all passed RUBRIC.md Stage-0 (E1-E9) and Stage-2 (`canon_score >= 70`), converged via `python3 tools/canon-pipeline/intake.py bucket-canon/07-mind/curiosity-and-motivation --min-score 70` (added=4, changed=True on first run; added=0, kept=4, changed=False on both re-runs, confirming idempotence).
**Status**: pass-2 hand-verified seed. Every DOI confirmed to resolve to the intended foundational primary (see Verification table below).

## Files in this dossier

| File | Purpose |
|------|---------|
| `CANON_INDEX.md` | This manifest. Authoritative: a file not listed here is not canon. |
| `queries.txt` | Operator-curated seed identifiers (the RUBRIC Stage-2 allow-list). |
| `primary-papers.yaml` | Machine-emitted, gate-passed records (the served layer). Each record carries a hand-added `provenance_signoff: "pending: gianyrox"` field per the ros-11 named-human-sign-off rule: nothing here is an approved canon entry until a founder signs off. |
| `primary-papers.bib` | BibTeX twin. |

## Canon entries

| Title | DOI | canon_score | tier | Principle (foundation-tier claim) |
|---|---|---|---|---|
| The Psychology of Curiosity: A Review and Reinterpretation | `10.1037/0033-2909.116.1.75` | 70 | CANON | Curiosity is the felt gap between current and desired knowledge, a state of deprivation rather than pure reward-seeking; the gap account predicts curiosity peaks at intermediate rather than extreme uncertainty, and rises when the gap is named and specific rather than diffuse. |
| States of Curiosity Modulate Hippocampus-Dependent Learning via the Dopaminergic Circuit | `10.1016/j.neuron.2014.08.060` | 75 | CANON | A high-curiosity state raises memory for the answer that resolves the curiosity and, alongside it, for unrelated material encountered nearby, and this spillover tracks hippocampal and dopaminergic-circuit activity, the mechanistic anchor for the information-gap account. |
| The "What" and "Why" of Goal Pursuits: Human Needs and the Self-Determination of Behavior | `10.1207/s15327965pli1104_01` | 70 | CANON | Intrinsic motivation rests on three basic psychological needs, autonomy, competence, and relatedness; extrinsic motivators split into controlled forms (compliance, reward-seeking) and autonomous forms (an externally set goal the person has internalized), the founding statement of self-determination theory. |
| Pay Enough or Don't Pay at All | `10.1162/003355300554917` | 70 | CANON | A small monetary incentive can perform worse than no incentive at all: a field study of daycare late fines and a matched lab task both show a non-monotonic relation between payment size and the behavior it is meant to encourage. |

## Discipline

Inherited from `bucket-canon/README.md` and `_intake/2026-05-19-canon-intake/RUBRIC.md`.

- Only canon-tier: axioms, laws, principles, primary derivations. No outcomes, no transcript, no commentariat.
- Every record passed RUBRIC.md Stage-0 hard gate (E1-E9) and `canon_score >= 70` (`intake.py --min-score 70`).
- Every anchor DOI was hand-verified to resolve to the intended foundational primary work before seeding.
- Every record carries `provenance_signoff: "pending: gianyrox"`: the ros-11 governance rule requires a named human approver before any canon entry counts as approved, and no sign-off has happened yet.
- Superseded entries move to `_archive/<YYYY-MM>/`. Re-runs converge (stable `bkt-sha1(doi)` ids).

## Verification, 2026-09-10 seed

| DOI | resolved to (author, year, title) | intended work | primary? | E1-E9 | score | VERIFIED |
|---|---|---|---|---|---|---|
| `10.1037/0033-2909.116.1.75` | Loewenstein G. 1994, "The Psychology of Curiosity: A Review and Reinterpretation" (*Psychological Bulletin*) | Loewenstein's information-gap theory of curiosity, the primary source cited in `_intake/research-os-k12-literature/educational-methods/loewenstein-1994-psychology-of-curiosity.md` | yes (the primary statement, by its originator, of the reinterpretation the psychology literature cites as the information-gap account) | pass (journal-article, non-retracted, concept match on "curiosity") | 70 | **Y** |
| `10.1016/j.neuron.2014.08.060` | Gruber M.J., Gelman B.D. and Ranganath C. 2014, "States of Curiosity Modulate Hippocampus-Dependent Learning via the Dopaminergic Circuit" (*Neuron*) | the primary source cited in `_intake/research-os-k12-literature/educational-methods/gruber-gelman-ranganath-2014-curiosity-hippocampus-learning.md` | yes (original fMRI experiment) | pass (journal-article, non-retracted, concept match on "curiosity"/"hippocampus") | 75 | **Y** |
| `10.1207/s15327965pli1104_01` | Deci E.L. and Ryan R.M. 2000, "The 'What' and 'Why' of Goal Pursuits: Human Needs and the Self-Determination of Behavior" (*Psychological Inquiry*) | the primary source cited in `_intake/research-os-k12-literature/educational-methods/deci-ryan-2000-self-determination-theory.md` | yes (the founding statement of self-determination theory, by its originators) | pass (journal-article, non-retracted, concept match on "self-determination theory"/"autonomy") | 70 | **Y** |
| `10.1162/003355300554917` | Gneezy U. and Rustichini A. 2000, "Pay Enough or Don't Pay at All" (*The Quarterly Journal of Economics*) | the primary source cited in `_intake/research-os-k12-literature/educational-methods/gneezy-rustichini-2000-pay-enough-or-dont-pay.md` | yes (original field and lab experiments) | pass (journal-article, non-retracted; branch hint empty in the mechanical scan, hand-confirmed on-topic against the source card) | 70 | **Y** |

All four records report a primary theoretical or experimental mechanism of curiosity, motivation, or incentive response, and clear the outcome and application exclusion at E7 on that basis: none reports an intervention effect size against a downstream goal, each states a general principle.

**PROTOCOL.md §4.1 envelope field mapping.** `bucket-canon/` holds citations only, per `tools/canon-pipeline/README.md`'s Non-Redistribution Policy, so a citation-only record satisfies the envelope's required identity fields directly: `title` = `primary-papers.yaml` `title`, `source.url` = `canonical_url` (`https://doi.org/<doi>`), `doi` = `doi`, `canon_tier` = `CANON` (this table's `tier` column), `foundation_branches` = `["07-mind"]`, `provenance` = `sources_consulted` + `fetched_at`, with `provenance_signoff` carried alongside as the pending-approval marker this pass adds.

_last updated: 2026-09-10 by canon-pipeline (intake/ros-canon-promotion-2)_
