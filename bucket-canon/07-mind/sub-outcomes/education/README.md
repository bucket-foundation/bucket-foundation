# sub-outcomes/education: Outcome-tier

## What this folder is

Intervention and meta-analysis studies on tutoring and mastery-learning
effectiveness. Every record here reports an educational outcome (an effect
size on test performance) rather than a primary mechanism of mind. Per
RUBRIC.md Stage-0 rule E7, an outcome/application study does not enter
`bucket-canon/07-mind/` proper; it lives in `sub-outcomes/<topic>/` instead,
the convention `05-biophysics/README.md` documents for `sub-outcomes/
longevity/` (downstream-application records that cross-mirror the gdrive
outcome canon rather than sitting in the foundation-tier branch).

This is the first `sub-outcomes/` folder built under `07-mind/`, mirroring
that documented convention: same dossier shape as a canon folder
(`CANON_INDEX.md`, `primary-papers.yaml`, `primary-papers.bib`,
`queries.txt`), different tier. `canon-primary.ts` only walks
`bucket-canon/<branch>/<concept>/primary-papers.yaml` one level deep, so a
record nested at `sub-outcomes/education/` is not picked up by the site's
canon-serving layer, the same way `sub-claims/<figure>/` is not, keeping
outcome-tier material out of the citeable canon surface by construction.

## Tier

**OUTCOME.** Every record here passes the mechanical
`canon_score` floor (all four score 65-70, see `primary-papers.yaml`), but
is excluded from `bucket-canon/07-mind/` proper by RUBRIC E7 because the
work reports an intervention effect size instead of a primary mechanism
claim.

## Dependency convention

Each record names the `07-mind` canon-tier foundation it depends on, in
`primary-papers.yaml` (`depends_on_foundation`) and in the index table
below. All four entries here depend on the same foundation: the
retrieval-practice / testing-effect mechanism in
`bucket-canon/07-mind/memory-systems/` (Roediger and Karpicke 2006, DOI
`10.1111/j.1745-6916.2006.00012.x`). Mastery learning and step-based
tutoring both work by inserting frequent low-stakes retrieval-and-feedback
checkpoints; the outcome studies here measure the effect size of that
mechanism at the classroom and system scale. Establishing the mechanism
itself is the job of the foundation record they depend on.

## Files in this dossier

| File | Purpose |
|------|---------|
| `CANON_INDEX.md` | Manifest of outcome entries. See its own header for the tier statement. |
| `queries.txt` | Operator-curated seed identifiers. |
| `primary-papers.yaml` | Machine-resolved records (`canon.py resolve`), tier marked by hand. |
| `primary-papers.bib` | BibTeX twin. |
