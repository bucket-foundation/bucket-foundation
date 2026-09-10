# memory-systems: Canon Index

**Branch**: `07-mind/memory-systems/`
**Scope**: foundation-tier only. Memory systems: Scoville-Milner (patient H.M.), the founding declarative/procedural dissociation and hippocampal basis of episodic memory; the retrieval-practice and external-memory-offloading primaries that bear on how a designed system should schedule review and gate recall.
**Seeded**: 2026-05-19 (bead `bkt-epic-canon-intake`, Data pillar, 4-gap-branch pass-1)
**Extended**: 2026-09-10 (Research OS for K-12 canon-intake promotion, `intake/ros-canon-promotion`). Two records promoted from `_intake/research-os-k12-literature/`: Roediger & Karpicke 2006 (the testing effect) and Sparrow, Liu & Wegner 2011 (Google effects on memory). Both hand-verified against OpenAlex/Crossref, both `canon_score=85`, both passed RUBRIC.md Stage-0 (E1-E9) and Stage-2 (score >= 70). Converged via `python3 tools/canon-pipeline/intake.py bucket-canon/07-mind/memory-systems --min-score 70` (added=2, kept=1, rejected=0, failed=0).
**Status**: pass-1 hand-verified seed, extended pass-2 (see above). Every DOI confirmed to resolve to the intended foundational primary (see `_intake/2026-05-19-canon-intake/PASS1-VERIFICATION.md` for the pass-1 anchor; the two 2026-09-10 additions are verified inline below). Convergent runner (`tools/canon-pipeline/intake.py`) extends from `queries.txt`.

## Files in this dossier

| File | Purpose |
|------|---------|
| `CANON_INDEX.md` | This manifest. Authoritative: a file not listed here is not canon. |
| `queries.txt` | Operator-curated seed identifiers (the RUBRIC §Stage-2 allow-list). |
| `primary-papers.yaml` | Machine-emitted, gate-passed records (the served layer). |
| `primary-papers.bib` | BibTeX twin. |

## Canon entries

| Title | DOI | canon_score | tier | Principle (foundation-tier claim) |
|---|---|---|---|---|
| LOSS OF RECENT MEMORY AFTER BILATERAL HIPPOCAMPAL LESIONS | `10.1136/jnnp.20.1.11` | 80 | CANON | Bilateral medial-temporal-lobe resection (patient H.M.) abolishes the formation of new declarative memory while sparing procedural learning, establishing the hippocampus as the substrate of episodic-memory consolidation and declarative/procedural as a founding dissociation. |
| The Power of Testing Memory: Basic Research and Implications for Educational Practice | `10.1111/j.1745-6916.2006.00012.x` | 85 | CANON | Retrieval practice (a test) produces more durable long-term retention than an equivalent amount of restudying, and the advantage grows with retention interval: the testing effect, synthesized from the experimental retrieval-practice literature the paper reviews and extends. |
| Google Effects on Memory: Cognitive Consequences of Having Information at Our Fingertips | `10.1126/science.1207745` | 85 | CANON | People encode the location of information they expect to be able to look up later at a higher rate than they encode the information itself, extending transactive memory to external, searchable stores, demonstrated experimentally across four studies. |

## Discipline

Inherited from `bucket-canon/README.md` and `_intake/2026-05-19-canon-intake/RUBRIC.md`.

- Only canon-tier: axioms / laws / principles / primary derivations. No outcomes, no transcript, no commentariat.
- Every record passed RUBRIC.md Stage-0 hard gate (E1-E9) + canon_score >= 70 (intake.py --min-score 70).
- Every anchor DOI was hand-verified to resolve to the intended foundational primary work (not a review/textbook/commentary) before seeding.
- Every record carries `provenance_signoff: "pending: gianyrox"`, backfilled 2026-09-10 (canon intake pass two, `intake/ros-canon-promotion-2`) per the ros-11 governance rule: a named human founder is the pending approver, and no sign-off has happened yet.
- Superseded entries move to `_archive/<YYYY-MM>/`. Re-runs converge (stable bkt-sha1(doi) ids).

## Verification, 2026-09-10 addition

Two records added this pass: Roediger & Karpicke 2006; Sparrow, Liu & Wegner
2011. Both were resolved live via `tools/canon-pipeline/canon.py resolve
<doi>` and hand-checked against the source intake files before promotion
(per PASS1-VERIFICATION.md's verification criteria, applied to this pass-2
addition):

| DOI | resolved to (author, year, title) | intended work | primary? | E1-E9 | score | VERIFIED |
|---|---|---|---|---|---|---|
| `10.1111/j.1745-6916.2006.00012.x` | Roediger H.L. & Karpicke J.D. 2006, "The Power of Testing Memory: Basic Research and Implications for Educational Practice" (*Perspectives on Psychological Science*) | Roediger-Karpicke testing-effect synthesis, the primary source cited in `_intake/research-os-k12-literature/educational-methods/roediger-karpicke-2006-power-of-testing.md` | yes (primary review + original experiments) | pass (journal-article, non-retracted, journal-article source format confirmed, concept match on "memory") | 85 | **Y** |
| `10.1126/science.1207745` | Sparrow B., Liu J. & Wegner D.M. 2011, "Google Effects on Memory: Cognitive Consequences of Having Information at Our Fingertips" (*Science*) | Sparrow-Liu-Wegner Google-effects experiments, the primary source cited in `_intake/research-os-k12-literature/hci-human-ai-collaboration/sparrow-liu-wegner-2011-google-effects-on-memory.md` | yes (four original experiments) | pass (journal-article, non-retracted, journal-article source format confirmed, concept match on "memory"/"cognition") | 85 | **Y** |

Both records report a primary experimental mechanism of memory encoding
and clear the outcome/application exclusion at E7 on that basis. Both resolve to
`canon_branch_hints` including `07-mind`; Sparrow et al. also hints `04-information`, left
un-promoted there per the source intake file's own branch assignment
(`hci-human-ai-collaboration`) and this branch's closer fit: the explanandum is human memory,
a psychological effect the paper measures experimentally rather than a formal
information-theoretic bound (see `07-mind/README.md` § vs `04-information/`).

**PROTOCOL.md §4.1 envelope field mapping.** `bucket-canon/` holds citations
only. It carries no `paper.<ext>` and no local bytes (see `tools/canon-pipeline/README.md`'s Non-Redistribution
Policy), so the `sha256`, `purchase`, and `cite.payout_wallet` fields that anchor a full
`bucket/<sha256>/canon.json` sidecar do not apply here; a citation-only record satisfies the
envelope's required identity fields directly: `title` = `primary-papers.yaml` `title`,
`source.url` = `canonical_url` (`https://doi.org/<doi>`), `doi` = `doi`, `canon_tier` =
`CANON` (this table's `tier` column), `foundation_branches` = `["07-mind"]` (`canon_branch_hints`
filtered to the promoted branch), `provenance` = `sources_consulted` + `fetched_at`. If either
record is ever minted into a full `bucket/<sha256>/` (e.g. an OA PDF fetched via `canon.py
fetch`), the sidecar's `sha256`/`purchase`/`cite.payout_wallet` fields get filled in at that
time; today's promotion stops at intake-and-cite, with minting deferred to that later step.

_last updated: 2026-09-10 by canon-pipeline (intake/ros-canon-promotion)_
