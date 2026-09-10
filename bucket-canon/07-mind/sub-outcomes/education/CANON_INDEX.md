# sub-outcomes/education: Outcome Index

**Tier is OUTCOME.** Every record below reports an intervention effect
size (a tutoring or mastery-learning outcome), excluded from
`bucket-canon/07-mind/` proper by RUBRIC.md Stage-0 rule E7 ("outcomes are downstream, NOT canon"). <!-- voice-ignore-line -->
See `README.md` in this
folder for the full tier and dependency convention, and
`05-biophysics/README.md`'s `sub-outcomes/longevity/` entry for the
precedent this folder mirrors.

**Branch**: `07-mind/sub-outcomes/education/`
**Scope**: Tutoring and mastery-learning intervention studies and
meta-analyses: effect sizes for one-to-one tutoring, mastery-based
feedback loops, and step-based versus answer-based intelligent tutoring
systems.
**Seeded**: 2026-09-10 (Research OS for K-12 canon-intake promotion,
`intake/ros-canon-promotion`). Four records promoted from
`_intake/research-os-k12-literature/`, all machine-resolved via
`tools/canon-pipeline/canon.py resolve <doi>`, all outcome-tiered by hand
per RUBRIC E7.

## Files in this dossier

| File | Purpose |
|------|---------|
| `CANON_INDEX.md` | This manifest. |
| `queries.txt` | Operator-curated seed identifiers. |
| `primary-papers.yaml` | Machine-resolved records, `tier: OUTCOME` and `depends_on_foundation` added by hand. |
| `primary-papers.bib` | BibTeX twin. |

## Outcome entries

| Title | DOI | canon_score | tier | Depends on (canon foundation) | Finding |
|---|---|---|---|---|---|
| The 2 Sigma Problem: The Search for Methods of Group Instruction as Effective as One-to-One Tutoring | `10.3102/0013189x013006004` | 70 | OUTCOME | Roediger and Karpicke 2006, `10.1111/j.1745-6916.2006.00012.x` (`07-mind/memory-systems/`) | One-to-one tutoring plus mastery-based corrective feedback moves the average tutored student two standard deviations above a conventionally taught control; names the ceiling group instruction chases. |
| Effectiveness of Mastery Learning Programs: A Meta-Analysis | `10.3102/00346543060002265` | 65 | OUTCOME | Roediger and Karpicke 2006, `10.1111/j.1745-6916.2006.00012.x` (`07-mind/memory-systems/`) | Across 108 controlled studies, group-based mastery learning raised scores by about 0.5 SD, well below Bloom 1984's two-sigma figure: the large-sample replication check on Bloom's claim. |
| The Relative Effectiveness of Human Tutoring, Intelligent Tutoring Systems, and Other Tutoring Systems | `10.1080/00461520.2011.611369` | 70 | OUTCOME | Roediger and Karpicke 2006, `10.1111/j.1745-6916.2006.00012.x` (`07-mind/memory-systems/`) | Step-based intelligent tutoring systems (feedback on intermediate steps) approach human-tutoring effect size (~0.75-1 SD); answer-based systems reach only ~0.3 SD. |
| Effectiveness of Intelligent Tutoring Systems | `10.3102/0034654315581420` | 65 | OUTCOME | Roediger and Karpicke 2006, `10.1111/j.1745-6916.2006.00012.x` (`07-mind/memory-systems/`) | Across 50 controlled evaluations, intelligent tutoring systems raised scores by about 0.66 SD on average; weaker study designs inflate the pooled estimate. |

## Discipline

- Every record resolved live via `canon.py resolve <doi>` (Crossref +
  OpenAlex), same resolver `07-mind/memory-systems/` uses.
- `tier: OUTCOME` and `depends_on_foundation` are hand-added fields, not
  part of the machine-emitted schema; `canon-primary.ts` does not walk this
  path (`bucket-canon/<branch>/<concept>/primary-papers.yaml` is one level
  deep from the branch; this dossier sits two levels down, at
  `sub-outcomes/education/`), so nothing here is served on the canon
  surface. This path is citeable directly; `/api/research` is the served
  canon surface and sits above it.
- Superseded entries move to `_archive/<YYYY-MM>/`, same convention as
  canon dossiers.

_last updated: 2026-09-10 by canon-intake (intake/ros-canon-promotion)_
