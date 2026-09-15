# cognitive-load: Canon Index

**Branch**: `07-mind/cognitive-load/`
**Scope**: foundation-tier only. The founding statement of cognitive load theory.
**Seeded**: 2026-09-11 (canon intake pass three, `intake/ros-canon-promotion-3`), promoted from the foundation Kirschner, Sweller, and Clark 2006 (`_intake/research-os-k12-literature/project-based-inquiry-learning/kirschner-sweller-clark-2006-minimal-guidance-does-not-work.md`) rests on rather than states itself. One record, resolved live via `tools/canon-pipeline/canon.py resolve <doi>`, passed RUBRIC.md Stage-0 (E1-E9) and Stage-2 (`canon_score >= 70`), converged via `python3 tools/canon-pipeline/intake.py bucket-canon/07-mind/cognitive-load --min-score 70` (added=1, changed=True on first run; added=0, kept=1, changed=False on the re-run, confirming idempotence).
**Status**: pass-3 hand-verified seed.

## Files in this dossier

| File | Purpose |
|------|---------|
| `CANON_INDEX.md` | This manifest. Authoritative: a file not listed here is not canon. |
| `queries.txt` | Operator-curated seed identifiers (the RUBRIC Stage-2 allow-list). |
| `primary-papers.yaml` | Machine-emitted, gate-passed record (the served layer). Carries a hand-added `provenance_signoff: "pending: gianyrox"` field per the ros-11 named-human-sign-off rule: nothing here is an approved canon entry until a founder signs off. |
| `primary-papers.bib` | BibTeX twin. |

## Canon entries

| Title | DOI | canon_score | tier | Principle (foundation-tier claim) |
|---|---|---|---|---|
| Cognitive Load During Problem Solving: Effects on Learning | `10.1207/s15516709cog1202_4` | 85 | CANON | A novice learner's working memory is a limited resource; an unguided problem-solving search (means-ends analysis) consumes that resource on the search itself, leaving less capacity to build the schema the task is meant to teach. Worked examples remove the search demand and teach the same schema at lower cognitive load. Primary evidence: two problem-solving experiments (algebra transformation problems, geometry problems) contrasting conventional problem-solving practice against worked-example study, each replicated across problem sets. |

## Discipline

Inherited from `bucket-canon/README.md` and `_intake/2026-05-19-canon-intake/RUBRIC.md`.

- Only canon-tier: axioms, laws, principles, primary derivations. No outcomes, no transcript, no commentariat.
- The record passed RUBRIC.md Stage-0 hard gate (E1-E9) and `canon_score >= 70` (`intake.py --min-score 70`).
- The anchor DOI was hand-verified to resolve to the intended foundational primary work before seeding.
- The record carries `provenance_signoff: "pending: gianyrox"`: the ros-11 governance rule requires a named human approver before any canon entry counts as approved, and no sign-off has happened yet.
- Superseded entries move to `_archive/<YYYY-MM>/`. Re-runs converge (stable `bkt-sha1(doi)` ids).

## Verification, 2026-09-11 seed

| DOI | resolved to (author, year, title) | intended work | primary? | E1-E9 | score | VERIFIED |
|---|---|---|---|---|---|---|
| `10.1207/s15516709cog1202_4` | Sweller J. 1988, "Cognitive Load During Problem Solving: Effects on Learning" (*Cognitive Science*) | the founding text of cognitive load theory that Kirschner, Sweller, and Clark 2006 (`_intake/research-os-k12-literature/project-based-inquiry-learning/`) argues from, rather than states itself | yes (the originator's own primary statement of the theory, journal-article, non-retracted, on-topic against `04-information`/`07-mind` branch hints) | pass | 85 | **Y** |

The record states a mechanism of human cognitive architecture (working-memory capacity and its allocation between task-intrinsic and extraneous load) and its primary experimental evidence, clearing E7 as foundation-tier and staying out of `sub-outcomes/`.

**PROTOCOL.md §4.1 envelope field mapping.** Same citation-only mapping as `07-mind/memory-systems/CANON_INDEX.md`, `07-mind/curiosity-and-motivation/CANON_INDEX.md`, and `07-mind/cognition-and-automation/CANON_INDEX.md` document; `foundation_branches` = `["07-mind"]`, `provenance_signoff` carried alongside as the pending-approval marker this pass adds.

_last updated: 2026-09-11 by canon-pipeline (intake/ros-canon-promotion-3)_
