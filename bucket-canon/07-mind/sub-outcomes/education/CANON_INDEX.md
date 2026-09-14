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

**Extended**: 2026-09-14, canon intake pass three (`intake/ros-canon-promotion-3`).
Ten more records promoted from the same corpus, the batch this pass's own
`_intake/research-os-k12-literature/project-based-inquiry-learning/` and
`source-evaluation/` cards named as outcome-tier siblings of the new
`07-mind/cognitive-load/` foundation (Sweller 1988): five guidance-and-inquiry
outcome studies depending on that new foundation (Chen and Yang 2019;
Furtak, Seidel, Iverson and Briggs 2012; Lazonder and Harmsen 2016;
Kirschner, Sweller and Clark 2006; Hmelo-Silver, Duncan and Chinn 2007,
the direct reply to Kirschner, Sweller and Clark), two source-evaluation
studies depending on the information-foraging foundation (Wineburg and
McGrew 2019; Breakstone et al. 2021), and three student-research-experience
studies depending on the curiosity-and-motivation foundation (Grinnell,
Dalley and Reisch 2020; Bangera and Brownell 2014; Sadler, Burgin,
McKinney and Ponjuán 2010). Every record in this pass carries
`provenance_signoff: "pending: gianyrox"` per the same ros-11 rule.

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
| Generative AI without guardrails can harm learning: Evidence from high school mathematics | `10.1073/pnas.2422633122` | 75 | OUTCOME | Roediger and Karpicke 2006, `10.1111/j.1745-6916.2006.00012.x` (`07-mind/memory-systems/`) | Unrestricted GPT-4 access on math practice raised practice performance about 48 percent but lowered unassisted exam performance about 17 percent; a hint-only guardrail kept the practice gain and removed the exam harm. |
| When Combinations of Humans and AI Are Useful: A Systematic Review and Meta-Analysis | `10.1038/s41562-024-02024-1` | 75 | OUTCOME | Pirolli and Card 1999, `10.1037/0033-295x.106.4.643` (`07-mind/information-foraging/`) | Across the reviewed studies, human-AI combinations beat the better of the two alone on decision tasks but fell short of the better of the two alone on content-creation tasks; task decomposability was the strongest moderator. |
| AI tutoring outperforms in-class active learning: an RCT introducing a novel research-based design in an authentic educational setting | `10.1038/s41598-025-97652-6` | 60 | OUTCOME | Roediger and Karpicke 2006, `10.1111/j.1745-6916.2006.00012.x` (`07-mind/memory-systems/`) | In a randomized within-class crossover, students using a pedagogically structured AI tutor learned more, in less time, and reported higher engagement than students in a research-validated active-learning class session on the same content. |
| Does the Whole Exceed its Parts? The Effect of AI Explanations on Complementary Team Performance | `10.1145/3411764.3445717` | 60 | OUTCOME | Pirolli and Card 1999, `10.1037/0033-295x.106.4.643` (`07-mind/information-foraging/`) | Team performance exceeding both the human alone and the AI alone was rare across the study's tasks even when AI explanations raised participants' stated trust; explanations that raised trust did not raise accuracy in step. |
| From Chalkboards to Chatbots: Evaluating the Impact of Generative AI on Learning Outcomes in Nigeria | `10.1596/1813-9450-11125` | 50 | OUTCOME | Roediger and Karpicke 2006, `10.1111/j.1745-6916.2006.00012.x` (`07-mind/memory-systems/`) | Students given structured access to an AI tutor for six weeks gained close to two years of typical learning progress on an English-proficiency measure; effects concentrated among lower-performing students and girls. |
| Your Brain on ChatGPT: Accumulation of Cognitive Debt when Using an AI Assistant for Essay Writing Task | `10.48550/arxiv.2506.08872` | 30 | OUTCOME | Sparrow, Liu and Wegner 2011, `10.1126/science.1207745` (`07-mind/memory-systems/`) | An EEG study of essay writing under three conditions found progressively weaker neural connectivity and weaker later recall of one's own essay content in the LLM-assisted condition than in the search-engine-assisted or brain-only conditions. |
| Tutor CoPilot: A Human-AI Approach for Scaling Real-Time Expertise | `10.48550/arxiv.2410.03017` | 10 | OUTCOME | Roediger and Karpicke 2006, `10.1111/j.1745-6916.2006.00012.x` (`07-mind/memory-systems/`) | In a large field deployment, students working with tutors who had real-time AI-generated suggestions showed higher topic mastery, with the largest gains for tutors with less certification or experience. |

## Outcome entries, pass three

| Title | DOI | canon_score | tier | Depends on (canon foundation) | Finding |
|---|---|---|---|---|---|
| Revisiting the effects of project-based learning on students' academic achievement: A meta-analysis investigating moderators | `10.1016/j.edurev.2018.11.001` | 65 | OUTCOME | Sweller 1988, `10.1207/s15516709cog1202_4` (`07-mind/cognitive-load/`) | Pooled across studies, project-based learning raised student academic achievement, with the effect varying by implementation feature rather than holding as one fixed quantity. |
| Experimental and Quasi-Experimental Studies of Inquiry-Based Science Teaching | `10.3102/0034654312457206` | 70 | OUTCOME | Sweller 1988, `10.1207/s15516709cog1202_4` (`07-mind/cognitive-load/`) | Across 37 studies, inquiry-based science teaching produced a mean effect size of 0.50; teacher-led activities outperformed student-led ones by about 0.40 SD. |
| Meta-Analysis of Inquiry-Based Learning: Effects of Guidance | `10.3102/0034654315627366` | 75 | OUTCOME | Sweller 1988, `10.1207/s15516709cog1202_4` (`07-mind/cognitive-load/`) | Across 72 studies, guidance during inquiry-based learning showed facilitative effects on learning activities (d = 0.66), performance success (d = 0.71), and learning outcomes (d = 0.50). |
| Why Minimal Guidance During Instruction Does Not Work: An Analysis of the Failure of Constructivist, Discovery, Problem-Based, Experiential, and Inquiry-Based Teaching | `10.1207/s15326985ep4102_1` | 80 | OUTCOME | Sweller 1988, `10.1207/s15516709cog1202_4` (`07-mind/cognitive-load/`) | Argues minimally guided instruction underperforms guided instruction for learners without high prior knowledge, grounded in cognitive-load theory and expert-novice differences. |
| Scaffolding and Achievement in Problem-Based and Inquiry Learning: A Response to Kirschner, Sweller, and Clark (2006) | `10.1080/00461520701263368` | 70 | OUTCOME | Sweller 1988, `10.1207/s15516709cog1202_4` (`07-mind/cognitive-load/`) | Direct reply to Kirschner, Sweller and Clark 2006, arguing problem-based and inquiry learning are extensively scaffolded approaches that reduce cognitive load rather than the unguided discovery learning that paper conflates them with. |
| High school science fair: Positive and negative outcomes | `10.1371/journal.pone.0229237` | 65 | OUTCOME | Deci and Ryan 2000, `10.1207/s15327965pli1104_01` (`07-mind/curiosity-and-motivation/`) | Among students uninterested in a science or engineering career who were required to participate in science fair, about 10 percent reported research misconduct; a participation requirement reduced the share reporting increased interest relative to voluntary participants. |
| Lateral Reading and the Nature of Expertise: Reading Less and Learning More When Evaluating Digital Information | `10.1177/016146811912101102` | 65 | OUTCOME | Pirolli and Card 1999, `10.1037/0033-295x.106.4.643` (`07-mind/information-foraging/`) | Professional fact checkers evaluate websites by leaving the page to check other sources, "lateral reading," while historians and students stayed within a site and were misled by superficial cues. |
| Students' Civic Online Reasoning: A National Portrait | `10.3102/0013189x211017495` | 50 | OUTCOME | Pirolli and Card 1999, `10.1037/0033-295x.106.4.643` (`07-mind/information-foraging/`) | Across 3,446 US high school students, 96 percent never learned that a site claiming factual climate reporting had fossil-fuel-industry ties, and two-thirds could not distinguish news from ads. |
| Course-Based Undergraduate Research Experiences Can Make Scientific Research More Inclusive | `10.1187/cbe.14-06-0099` | 90 | OUTCOME | Deci and Ryan 2000, `10.1207/s15327965pli1104_01` (`07-mind/curiosity-and-motivation/`) | A course-embedded research experience reaches every enrolled student rather than only the subset who apply for, are selected into, and can afford an independent research internship. |
| Learning science through research apprenticeships: A critical review of the literature | `10.1002/tea.20326` | 80 | OUTCOME | Deci and Ryan 2000, `10.1207/s15327965pli1104_01` (`07-mind/curiosity-and-motivation/`) | Across 53 studies, research apprenticeships produced career-aspiration, content-understanding, and confidence gains with more consistency than nature-of-science-understanding gains; duration and an explicit outcome focus shaped which outcomes appeared. |

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
- Two pass-two records fall below CONTRIBUTING.md's informational
  `canon_score` floor: Kosmyna et al. 2025 (score 30) and Wang et al.
  2024, Tutor CoPilot (score 10), both recent arXiv preprints the
  mechanical citation-count and peer-review-type signals undercount. Each
  carries a `+anchor:` override line in `canon_score_reasons`, per
  RUBRIC.md's founder-override convention, naming the reviewer and the
  reason for keeping the record instead of demoting it to `candidate`.
  Both DOIs are DataCite-registered arXiv records; `sources_consulted`
  reads `[datacite, openalex]` rather than `[crossref, openalex]`,
  since Crossref returns no record for either.
- Pass three's ten records depend on three different foundations rather
  than defaulting to `07-mind/memory-systems/`: five guidance-and-inquiry
  outcome studies depend on the new `07-mind/cognitive-load/` foundation
  (Sweller 1988) this same pass promoted, since each reports an effect
  or argument about instructional guidance the working-memory-capacity
  mechanism underwrites; two source-evaluation studies depend on
  `07-mind/information-foraging/` (Pirolli and Card 1999), since lateral
  reading and its absence are read as a patch-leaving decision in that
  foundation's own terms; three student-research-experience studies
  depend on `07-mind/curiosity-and-motivation/` (Deci and Ryan 2000,
  self-determination theory), since access, confidence, and
  requirement-driven misconduct are read as autonomy, competence, and
  relatedness effects. Each record's own `relation` field in
  `primary-papers.yaml` states the source paper's own finding
  separately from the promoting pass's mechanism reading, the same
  discipline pass one and two follow.
- Every record in pass three carries `provenance_signoff: "pending:
  gianyrox"` per the same ros-11 governance rule.

_last updated: 2026-09-14 by canon-intake (intake/ros-canon-promotion-3)_
