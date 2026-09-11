# cognition-and-automation: Canon Index

**Branch**: `07-mind/cognition-and-automation/`
**Scope**: foundation-tier only. The founding statement of automation-induced skill decay in human operators.
**Seeded**: 2026-09-10 (canon intake pass two, `intake/ros-canon-promotion-2`), promoted from `_intake/research-os-k12-literature/`. One record, resolved live via `tools/canon-pipeline/canon.py resolve <doi>`, passed RUBRIC.md Stage-0 (E1-E9) and Stage-2 (`canon_score >= 70`), converged via `python3 tools/canon-pipeline/intake.py bucket-canon/07-mind/cognition-and-automation --min-score 70` (added=1, changed=True on first run; added=0, kept=1, changed=False on both re-runs, confirming idempotence).
**Status**: pass-2 hand-verified seed.

## Files in this dossier

| File | Purpose |
|------|---------|
| `CANON_INDEX.md` | This manifest. Authoritative: a file not listed here is not canon. |
| `queries.txt` | Operator-curated seed identifiers (the RUBRIC Stage-2 allow-list). |
| `primary-papers.yaml` | Machine-emitted, gate-passed records (the served layer). Carries a hand-added `provenance_signoff: "pending: gianyrox"` field per the ros-11 named-human-sign-off rule: nothing here is an approved canon entry until a founder signs off. |
| `primary-papers.bib` | BibTeX twin. |

## Canon entries

| Title | DOI | canon_score | tier | Principle (foundation-tier claim) |
|---|---|---|---|---|
| Ironies of automation | `10.1016/0005-1098(83)90046-8` | 70 | CANON | Automating a task removes the operator's routine practice at it, so when the automation fails or reaches a limit, the human is asked to perform, or to monitor, at the exact moment they are least prepared to; the more reliable the automation, the less opportunity the operator has to maintain the underlying skill, a structural consequence of automating well rather than a defect of any one system. |

## Discipline

Inherited from `bucket-canon/README.md` and `_intake/2026-05-19-canon-intake/RUBRIC.md`.

- Only canon-tier: axioms, laws, principles, primary derivations. No outcomes, no transcript, no commentariat.
- The record passed RUBRIC.md Stage-0 hard gate (E1-E9) and `canon_score >= 70` (`intake.py --min-score 70`).
- The anchor DOI was hand-verified to resolve to the intended foundational primary work before seeding.
- The record carries `provenance_signoff: "pending: gianyrox"`: the ros-11 governance rule requires a named human approver before any canon entry counts as approved, and no sign-off has happened yet.
- Superseded entries move to `_archive/<YYYY-MM>/`. Re-runs converge (stable `bkt-sha1(doi)` ids).

## Verification, 2026-09-10 seed

| DOI | resolved to (author, year, title) | intended work | primary? | E1-E9 | score | VERIFIED |
|---|---|---|---|---|---|---|
| `10.1016/0005-1098(83)90046-8` | Bainbridge L. 1983, "Ironies of automation" (*Automatica*) | the primary source cited in `_intake/research-os-k12-literature/hci-human-ai-collaboration/bainbridge-1983-ironies-of-automation.md` | yes (the founding statement, by its author, of the automation-skill-decay thesis) | pass (journal-article, non-retracted; branch hint empty in the mechanical scan, hand-confirmed on-topic against the source card) | 70 | **Y** |

The record reports a theoretical and observational mechanism of skill and attention under partial automation, and clears the outcome and application exclusion at E7 on that basis: it states no intervention effect size.

**PROTOCOL.md §4.1 envelope field mapping.** Same citation-only mapping as `07-mind/memory-systems/CANON_INDEX.md` and `07-mind/curiosity-and-motivation/CANON_INDEX.md` document; `foundation_branches` = `["07-mind"]`, `provenance_signoff` carried alongside as the pending-approval marker this pass adds.

_last updated: 2026-09-10 by canon-pipeline (intake/ros-canon-promotion-2)_
