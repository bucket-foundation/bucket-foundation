# information-foraging: Canon Index

**Branch**: `04-information/information-foraging/`
**Scope**: foundation-tier only. The primary formal theory of information-seeking as a cost-benefit optimization problem.
**Seeded**: 2026-09-10 (canon intake pass two, `intake/ros-canon-promotion-2`), promoted from `_intake/research-os-k12-literature/`. One record, resolved live via `tools/canon-pipeline/canon.py resolve <doi>`, passed RUBRIC.md Stage-0 (E1-E9) and Stage-2 (`canon_score >= 70`), converged via `python3 tools/canon-pipeline/intake.py bucket-canon/04-information/information-foraging --min-score 70` (added=1, changed=True on first run; added=0, kept=1, changed=False on both re-runs, confirming idempotence).
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
| Information foraging. | `10.1037/0033-295x.106.4.643` | 70 | CANON | People adapt information-seeking strategy to maximize the rate of valuable information gained per unit cost, by direct analogy to optimal foraging theory in animal ecology; information scent, the perceived proximity of a cue to the sought information, predicts the path a searcher follows even when it is not the objectively shortest one, and foraging strategy shifts with how the information environment is structured, patchy versus uniform. |

## Branch placement

Placed in `04-information/` rather than `07-mind/` on this pass's task brief. `04-information/README.md`'s own boundary rule against `07-mind` turns on whether a result is a limit on what any information-seeker can do in principle, or a model of what a biological searcher in fact does; this paper sits close to that line, since it is a model of actual human search behavior stated in the formal, optimization language the theory borrows from ecology. See `04-information/README.md`'s "vs `07-mind/`" section for the placement note this dossier adds.

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
| `10.1037/0033-295x.106.4.643` | Pirolli P. and Card S. 1999, "Information foraging." (*Psychological Review*) | the primary source cited in `_intake/research-os-k12-literature/hci-human-ai-collaboration/pirolli-card-1999-information-foraging.md` | yes (the founding formal statement of information foraging theory, by its originators) | pass (journal-article, non-retracted, concept match on "information") | 70 | **Y** |

The record reports a formal theory with testable predictions, and clears the outcome and application exclusion at E7 on that basis: it states no intervention effect size.

**PROTOCOL.md §4.1 envelope field mapping.** Citation-only mapping, same convention as the other pass-2 dossiers: `foundation_branches` = `["04-information"]`, `provenance_signoff` carried alongside as the pending-approval marker this pass adds.

_last updated: 2026-09-10 by canon-pipeline (intake/ros-canon-promotion-2)_
