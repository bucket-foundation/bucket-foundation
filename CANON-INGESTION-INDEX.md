# Bucket Foundation

Canon Ingestion Index.

*Updated 2026-05-10T19:35:35*

**Total source documents**: 24,183 · **FTS searchable**: 24,196

## Sources

| Source | Count |
|---|---:|
| YouTube transcripts | 816 |
| Archive.org books | 178 |
| PubMed papers | 7,968 |
| arXiv papers | 179 |
| Project Gutenberg | 109 |
| Wikisource | 87 |
| OpenAlex authors | 375 |
| OpenAlex fanout | 1,603 |
| OpenAlex citers | 10,574 |
| Blog scrapes | 1,624 |
| Kruse blog corpus | 460 |
| AARO archive | 97 |
| PURSUE Release 01 | 113/146 |

## Canon structure

10 branches + 6 primary-axis bridges (time, music, light, information, sound, energy)
+ 6 secondary bridges. See `bucket-canon/_bridges/INDEX.md` and `CANON-MASTER.md`.

## Session totals

Started: 1,159 FTS docs.
Now: **24,196 FTS docs (20.9x growth)**.
Total source docs: 24,183.

## Recent additions, 2026-09-10

Six papers promoted from `_intake/research-os-k12-literature/` into
`bucket-canon/07-mind/` (`intake/ros-canon-promotion`), all resolved live
via `tools/canon-pipeline/canon.py resolve <doi>` (Crossref + OpenAlex).
Two canon-tier, converged idempotently through `tools/canon-pipeline/
intake.py --min-score 70`; four outcome-tier, routed to `sub-outcomes/
education/` per RUBRIC.md Stage-0 rule E7 rather than into the branch
proper. These sit outside the FTS counts above until a future pass runs
them through the same full-text index.

| Title | Path | Tier |
|---|---|---|
| The Power of Testing Memory: Basic Research and Implications for Educational Practice | `bucket-canon/07-mind/memory-systems/primary-papers.yaml` | canon |
| Google Effects on Memory: Cognitive Consequences of Having Information at Our Fingertips | `bucket-canon/07-mind/memory-systems/primary-papers.yaml` | canon |
| The 2 Sigma Problem: The Search for Methods of Group Instruction as Effective as One-to-One Tutoring | `bucket-canon/07-mind/sub-outcomes/education/primary-papers.yaml` | outcome |
| Effectiveness of Mastery Learning Programs: A Meta-Analysis | `bucket-canon/07-mind/sub-outcomes/education/primary-papers.yaml` | outcome |
| The Relative Effectiveness of Human Tutoring, Intelligent Tutoring Systems, and Other Tutoring Systems | `bucket-canon/07-mind/sub-outcomes/education/primary-papers.yaml` | outcome |
| Effectiveness of Intelligent Tutoring Systems | `bucket-canon/07-mind/sub-outcomes/education/primary-papers.yaml` | outcome |

Two taxonomy questions opened, both recorded as candidate homes rather than
promotions: metascience and sociology-of-science branch home (Jones 2009;
Fortunato et al. 2018), and whether AlphaFold (Jumper et al. 2021) becomes
a `05-biophysics` method card or stays a `research-landscape/` entry. Full
context: `bucket-canon/TAXONOMY_NOTES.md`.
