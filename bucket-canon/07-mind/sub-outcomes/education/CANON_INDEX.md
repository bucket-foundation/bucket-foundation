# sub-outcomes/education: Outcome Index

**Tier is OUTCOME.** Every record below reports an intervention effect
size (a tutoring or mastery-learning outcome), excluded from
`bucket-canon/07-mind/` proper by RUBRIC.md Stage-0 rule E7 ("outcomes are downstream, NOT canon"). <!-- voice-ignore-line -->
See `README.md` in this
folder for the full tier and dependency convention, and
`05-biophysics/README.md`'s `sub-outcomes/longevity/` entry for the
precedent this folder mirrors.

**Branch**: `07-mind/sub-outcomes/education/`
**Scope**: Tutoring, mastery-learning, and AI-assisted-learning
intervention studies and meta-analyses: effect sizes for one-to-one
tutoring, mastery-based feedback loops, step-based versus answer-based
intelligent tutoring systems, AI-tutoring RCTs, and human-AI
complementarity meta-analyses.
**Seeded**: 2026-09-10 (Research OS for K-12 canon-intake promotion,
`intake/ros-canon-promotion`). Four records promoted from
`_intake/research-os-k12-literature/`, all machine-resolved via
`tools/canon-pipeline/canon.py resolve <doi>`, all outcome-tiered by hand
per RUBRIC E7.
**Extended**: 2026-09-10, canon intake pass two (`intake/ros-canon-promotion-2`).
Seven more records promoted from the same corpus: five AI-tutoring and
generative-AI-in-learning RCTs and field evaluations (Kestin et al. 2025;
Bastani et al. 2025; Wang et al. 2024, Tutor CoPilot; De Simone et al.
2025, Nigeria; Kosmyna et al. 2025), and two human-AI complementarity
meta-analyses (Vaccaro, Almaatouq and Malone 2024; Bansal et al. 2021).
Every record in this pass, and every record carried over from pass one,
now also carries `provenance_signoff: "pending: gianyrox"`, backfilled
onto the pass-one four per the ros-11 named-human-sign-off rule: nothing
here is an approved canon entry until a founder signs off.

## Files in this dossier

| File | Purpose |
|------|---------|
| `CANON_INDEX.md` | This manifest. |
| `queries.txt` | Operator-curated seed identifiers. |
| `primary-papers.yaml` | Machine-resolved records, `tier: OUTCOME`, `depends_on_foundation`, and `provenance_signoff` added by hand. |
| `primary-papers.bib` | BibTeX twin. |

## Outcome entries, pass one

| Title | DOI | canon_score | tier | Depends on (canon foundation) | Finding |
|---|---|---|---|---|---|
| The 2 Sigma Problem: The Search for Methods of Group Instruction as Effective as One-to-One Tutoring | `10.3102/0013189x013006004` | 70 | OUTCOME | Roediger and Karpicke 2006, `10.1111/j.1745-6916.2006.00012.x` (`07-mind/memory-systems/`) | One-to-one tutoring plus mastery-based corrective feedback moves the average tutored student two standard deviations above a conventionally taught control; names the ceiling group instruction chases. |
| Effectiveness of Mastery Learning Programs: A Meta-Analysis | `10.3102/00346543060002265` | 65 | OUTCOME | Roediger and Karpicke 2006, `10.1111/j.1745-6916.2006.00012.x` (`07-mind/memory-systems/`) | Across 108 controlled studies, group-based mastery learning raised scores by about 0.5 SD, well below Bloom 1984's two-sigma figure: the large-sample replication check on Bloom's claim. |
| The Relative Effectiveness of Human Tutoring, Intelligent Tutoring Systems, and Other Tutoring Systems | `10.1080/00461520.2011.611369` | 70 | OUTCOME | Roediger and Karpicke 2006, `10.1111/j.1745-6916.2006.00012.x` (`07-mind/memory-systems/`) | Step-based intelligent tutoring systems (feedback on intermediate steps) approach human-tutoring effect size (~0.75-1 SD); answer-based systems reach only ~0.3 SD. |
| Effectiveness of Intelligent Tutoring Systems | `10.3102/0034654315581420` | 65 | OUTCOME | Roediger and Karpicke 2006, `10.1111/j.1745-6916.2006.00012.x` (`07-mind/memory-systems/`) | Across 50 controlled evaluations, intelligent tutoring systems raised scores by about 0.66 SD on average; weaker study designs inflate the pooled estimate. |

## Outcome entries, pass two

| Title | DOI | canon_score | tier | Depends on (canon foundation) | Finding |
|---|---|---|---|---|---|
| Generative AI without guardrails can harm learning: Evidence from high school mathematics | `10.1073/pnas.2422633122` | 75 | OUTCOME | Roediger and Karpicke 2006, `10.1111/j.1745-6916.2006.00012.x` (`07-mind/memory-systems/`) | Unrestricted GPT-4 access on math practice raised practice performance about 48 percent but lowered unassisted exam performance about 17 percent; a hint-only guardrail kept the practice gain and removed the exam harm, a field test of the retrieval-practice mechanism. |
| When Combinations of Humans and AI Are Useful: A Systematic Review and Meta-Analysis | `10.1038/s41562-024-02024-1` | 75 | OUTCOME | Pirolli and Card 1999, `10.1037/0033-295x.106.4.643` (`04-information/information-foraging/`) | Across the reviewed studies, human-AI combinations beat the better of the two alone on decision tasks but fell short of the better of the two alone on content-creation tasks; task decomposability was the strongest moderator. |
| AI tutoring outperforms in-class active learning: an RCT introducing a novel research-based design in an authentic educational setting | `10.1038/s41598-025-97652-6` | 60 | OUTCOME | Roediger and Karpicke 2006, `10.1111/j.1745-6916.2006.00012.x` (`07-mind/memory-systems/`) | In a randomized within-class crossover, students using a pedagogically structured AI tutor learned more, in less time, and reported higher engagement than students in a research-validated active-learning class session on the same content. |
| Does the Whole Exceed its Parts? The Effect of AI Explanations on Complementary Team Performance | `10.1145/3411764.3445717` | 60 | OUTCOME | Pirolli and Card 1999, `10.1037/0033-295x.106.4.643` (`04-information/information-foraging/`) | Team performance exceeding both the human alone and the AI alone was rare across the study's tasks even when AI explanations raised participants' stated trust; explanations that raised trust did not raise accuracy in step. |
| From Chalkboards to Chatbots: Evaluating the Impact of Generative AI on Learning Outcomes in Nigeria | `10.1596/1813-9450-11125` | 50 | OUTCOME | Roediger and Karpicke 2006, `10.1111/j.1745-6916.2006.00012.x` (`07-mind/memory-systems/`) | Students given structured access to an AI tutor for six weeks gained close to two years of typical learning progress on an English-proficiency measure; effects concentrated among lower-performing students and girls. |
| Your Brain on ChatGPT: Accumulation of Cognitive Debt when Using an AI Assistant for Essay Writing Task | `10.48550/arxiv.2506.08872` | 30 | OUTCOME | Sparrow, Liu and Wegner 2011, `10.1126/science.1207745` (`07-mind/memory-systems/`) | An EEG study of essay writing under three conditions found progressively weaker neural connectivity and weaker later recall of one's own essay content in the LLM-assisted condition than in the search-engine-assisted or brain-only conditions. |
| Tutor CoPilot: A Human-AI Approach for Scaling Real-Time Expertise | `10.48550/arxiv.2410.03017` | 10 | OUTCOME | Roediger and Karpicke 2006, `10.1111/j.1745-6916.2006.00012.x` (`07-mind/memory-systems/`) | In a large field deployment, students working with tutors who had real-time AI-generated suggestions showed higher topic mastery, with the largest gains for tutors with less certification or experience. |

## Discipline

- Every record resolved live via `canon.py resolve <doi>` (Crossref +
  OpenAlex), same resolver `07-mind/memory-systems/` uses.
- `tier: OUTCOME`, `depends_on_foundation`, and `provenance_signoff` are
  hand-added fields, outside the machine-emitted schema;
  `canon-primary.ts` does not walk this path
  (`bucket-canon/<branch>/<concept>/primary-papers.yaml` is one level
  deep from the branch; this dossier sits two levels down, at
  `sub-outcomes/education/`), so nothing here is served on the canon
  surface. This path is citeable directly; `/api/research` is the served
  canon surface and sits above it.
- Two pass-two records (Vaccaro, Almaatouq and Malone 2024; Bansal et al.
  2021) report general human-AI team performance rather than an
  education-specific outcome. `TAXONOMY_NOTES.md` opens a question on
  whether a dedicated `sub-outcomes/human-ai-collaboration/` home should
  split these out; this pass keeps them here, the closest existing home,
  with that pointer.
- Every record, pass one and pass two, carries
  `provenance_signoff: "pending: gianyrox"` per the ros-11 governance
  rule: a named human founder is the pending approver, and no sign-off
  has happened yet.
- Superseded entries move to `_archive/<YYYY-MM>/`, same convention as
  canon dossiers.

_last updated: 2026-09-10 by canon-intake (intake/ros-canon-promotion-2)_
