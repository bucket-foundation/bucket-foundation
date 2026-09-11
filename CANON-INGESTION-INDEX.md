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

### 07-mind promotions, PR #9 `intake/ros-canon-promotion`

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

### 07-mind and 04-information promotions, pass two, `intake/ros-canon-promotion-2`

Thirteen more papers promoted from `_intake/research-os-k12-literature/`
(pass two of the same corpus, PR #9 was pass one), all resolved live via
`tools/canon-pipeline/canon.py resolve <doi>` (Crossref + OpenAlex). Six
canon-tier across three new dossiers, converged idempotently through
`tools/canon-pipeline/intake.py --min-score 70` (each ran twice, second
run `added=0` on every dossier); seven outcome-tier, added to the
existing `07-mind/sub-outcomes/education/` per RUBRIC.md Stage-0 rule E7.
Every record in this pass, and every record carried over from pass one,
carries `provenance_signoff: "pending: gianyrox"` per the ros-11 named-
human-sign-off governance rule: a named founder is the pending approver
on every promoted record, and no sign-off has happened yet.

| Title | Path | Tier |
|---|---|---|
| The Psychology of Curiosity: A Review and Reinterpretation | `bucket-canon/07-mind/curiosity-and-motivation/primary-papers.yaml` | canon |
| States of Curiosity Modulate Hippocampus-Dependent Learning via the Dopaminergic Circuit | `bucket-canon/07-mind/curiosity-and-motivation/primary-papers.yaml` | canon |
| The "What" and "Why" of Goal Pursuits: Human Needs and the Self-Determination of Behavior | `bucket-canon/07-mind/curiosity-and-motivation/primary-papers.yaml` | canon |
| Pay Enough or Don't Pay at All | `bucket-canon/07-mind/curiosity-and-motivation/primary-papers.yaml` | canon |
| Ironies of automation | `bucket-canon/07-mind/cognition-and-automation/primary-papers.yaml` | canon |
| Information foraging. | `bucket-canon/07-mind/information-foraging/primary-papers.yaml` (moved 2026-09-11 from `04-information/`, see `bucket-canon/TAXONOMY_NOTES.md`) | canon |
| AI tutoring outperforms in-class active learning: an RCT introducing a novel research-based design in an authentic educational setting | `bucket-canon/07-mind/sub-outcomes/education/primary-papers.yaml` | outcome |
| Generative AI without guardrails can harm learning: Evidence from high school mathematics | `bucket-canon/07-mind/sub-outcomes/education/primary-papers.yaml` | outcome |
| Tutor CoPilot: A Human-AI Approach for Scaling Real-Time Expertise | `bucket-canon/07-mind/sub-outcomes/education/primary-papers.yaml` | outcome |
| From Chalkboards to Chatbots: Evaluating the Impact of Generative AI on Learning Outcomes in Nigeria | `bucket-canon/07-mind/sub-outcomes/education/primary-papers.yaml` | outcome |
| Your Brain on ChatGPT: Accumulation of Cognitive Debt when Using an AI Assistant for Essay Writing Task | `bucket-canon/07-mind/sub-outcomes/education/primary-papers.yaml` | outcome |
| When Combinations of Humans and AI Are Useful: A Systematic Review and Meta-Analysis | `bucket-canon/07-mind/sub-outcomes/education/primary-papers.yaml` | outcome |
| Does the Whole Exceed its Parts? The Effect of AI Explanations on Complementary Team Performance | `bucket-canon/07-mind/sub-outcomes/education/primary-papers.yaml` | outcome |

One taxonomy question logged rather than resolved: whether the two
human-AI complementarity meta-analyses need a dedicated
`sub-outcomes/human-ai-collaboration/` home instead of sharing
`sub-outcomes/education/`. Full context: `bucket-canon/TAXONOMY_NOTES.md`.
These sit outside the FTS counts above until a future pass runs them
through the same full-text index.

### 04-information hypothesis-engine artifacts, PR #10

Seven Bucket-authored primary-method artifacts entered `04-information`.
These are repo-native contributions added by hand. They sit outside the
FTS counts above until a future pass runs them through the same
full-text index.

| Title | Path | Type | DOI |
|---|---|---|---|
| A Hypothesis Engine over History (design paper) | `papers/history-hypothesis-engine/main.tex` | primary method | [10.5281/zenodo.22694649](https://doi.org/10.5281/zenodo.22694649) |
| AI Hypothesis Generation for Scientific Discovery, 2026 | `_intake/hypothesis-engine/SURVEY-AI-HYPOTHESIS-GENERATION.md` | review | - |
| History Hypothesis Engine: Design Spec | `_intake/hypothesis-engine/HISTORY-HYPOTHESIS-ENGINE-SPEC.md` | design spec | - |
| Hypothesis Engine: Ideal State and Unknowns | `_intake/hypothesis-engine/IDEAL-STATE-AND-UNKNOWNS-SPEC.md` | design spec | - |
| Timeline and Combinatorics Spec | `_intake/hypothesis-engine/TIMELINE-AND-COMBINATORICS-SPEC.md` | design spec | - |
| Crosswalk: History Hypothesis Engine vs Quantum Algorithm Discovery | `_intake/hypothesis-engine/CROSSWALK-QUANTUM-ALGORITHM-DISCOVERY.md` | design spec | - |
| Canon concept node, Hypothesis Address Space and Subjective-Logic Belief | `bucket-canon/04-information/concepts/hypothesis-engine-address-and-belief.md` | canon card | [10.5281/zenodo.22694649](https://doi.org/10.5281/zenodo.22694649) |

Full context: `CANON-CONTRIBUTIONS-2026-09-10.md`.

## Recent additions, 2026-09-10

Build-history write-back. 0 hypothesis card(s) written from `hte.canon_writeback.write_back` over `sacred-history` run `sacred-history-20260910T180835Z`, `canon_tier: candidate` throughout. Promotion to canon stays a human review step, `GOVERNANCE.md`.

| Title | Path | Type |
|---|---|---|
| 07-mind hypotheses index | `bucket-canon/07-mind/hypotheses/INDEX.md` | index |
