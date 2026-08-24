# Learning-Science Canon: Ranked for Building an AI Math Tutor

**Bead:** bkt-mxj · 2026-07-21 · Author: bkt-nuc (Nucleus, Bucket Foundation)
**Scope:** the most influential science-of-learning concepts and their canonical
primary papers + strongest meta-analyses, ranked by leverage for **post-training and
product design of an AI tutor**, with a deliberate bias toward **math learning**.

> **Where this lives and why.** Bucket's seven gdrive canon branches
> (`bucket-canon/01-mathematics` … `07-mind`) hold **foundations only**, axioms, real
> math, laws, primary derivations. Pedagogy is an *applied* layer, so it does not belong
> in those branches. `KNOWLEDGE-ARCHITECTURE.md` already defines the in-repo `learning/`
> tree as the "pedagogy" layer that sits over the corpus, and every learning-science
> deliverable so far (`research/people/LEARNING-SCIENCE-AND-AI-SAFETY.md`, the landscape
> docs) is in-repo markdown. This index follows that pattern: it is markdown under
> `learning/research/`. It is not a gdrive PDF mirror. The gdrive `research/*-canon/` mirror is
> reserved for canon-tier primary-source PDFs; learning-science papers are cited here by
> DOI. They are not re-hosted. See `ACQUISITION-LEDGER.md` for the acquisition record.

> **Relationship to the People-pillar doc.** `research/people/LEARNING-SCIENCE-AND-AI-SAFETY.md`
> (2026-06-11) is the deep *evidence base*, effect sizes, safety floor, feature
> requirements. This is the **ranked decision layer** on top of it. It orders the
> techniques by build-leverage, adds the math-specific and AI-tutor-specific papers that
> doc did not cover (productive failure, the canonical self-explanation, scaffolding/ZPD,
> deliberate practice, the K, 12-math ITS meta-analysis), and ends with a single paper
> recommendation for an external audience.

---

## Ranking method

Each concept is scored on three axes, then ordered by their product:

- **Evidence strength**, meta-analysis / commissioned review > multi-site RCT > single
  RCT / quasi-experiment > seminal-but-small. A large effect from one lab counts for less
  than a moderate effect replicated across a meta-analysis.
- **Math relevance**, does the mechanism have direct evidence *in mathematics* (problem
  types, procedures, derivations), or is it general-purpose transferred to math?
- **AI-tutor leverage**, how directly the mechanism converts into a post-training or
  product decision for a tutor: a scheduler, a reward-shaping rule, a dialogue policy, a
  content-generation constraint. A mechanism you can *implement in code* outranks one you
  can only keep in mind.

Effect-size convention: Cohen's *d* and Hedges's *g* are roughly interchangeable here;
"σ" means standard deviations of the outcome. A `[verify]` tag means the number comes from
consistent secondary citation because the primary PDF was not machine-readable at check
time, safe to use internally, page-check before external publication.

---

## Top 5 shortlist

| # | Concept | Anchor citation | Why it tops the list |
|---|---|---|---|
| 1 | **Retrieval practice / testing effect** | Karpicke & Roediger 2008 (*Science*); Adesope et al. 2017 meta (g≈0.51-0.93) | Highest-utility technique in the master review; large meta-analytic effect; converts into the tutor's core loop, *elicit recall before re-explaining*. |
| 2 | **Spacing / distributed practice** | Cepeda et al. 2006 meta (317 experiments); Cepeda et al. 2008 ridgeline | The other HIGH-utility technique; the Cepeda 2008 optimal-gap rule *is* a per-student review scheduler you can ship. |
| 3 | **Interleaving in math** | Rohrer, Dedrick & Stershic 2015 (RCT, *JEP*); Rohrer & Taylor 2007 | Math-specific and huge; teaches *which* procedure applies, not just how, the exact failure mode a math tutor must fix. |
| 4 | **Productive failure** | Kapur 2014 (*Cognitive Science*); Kapur 2016 (*Educational Psychologist*) | Math-specific, contrarian, and the sharpest statement of *where an AI tutor should withhold help*, struggle before instruction. |
| 5 | **Feedback + the ITS interaction plateau** | Hattie & Timperley 2007; VanLehn 2011; Steenbergen-Hu & Cooper 2013 (K, 12 math meta) | Step-level, process-level feedback is the single lever that moves a tutor from d≈0.3 to d≈0.76, and the K, 12-math meta is the reality check on shipping it at scale. |

The master map that sits above all five: **Dunlosky et al. 2013** (below, entry 0), the
commissioned review that ranks the techniques and tells you which to build and which to
refuse.

---

## The ranked canon

### 0: Dunlosky et al. 2013, the Map

- **Concept:** which study techniques work, ranked by utility.
- **Citation:** Dunlosky, J., Rawson, K. A., Marsh, E. J., Nathan, M. J., & Willingham,
  D. T. (2013). *Improving Students' Learning With Effective Learning Techniques: Promising
  Directions From Cognitive and Educational Psychology.* **Psychological Science in the
  Public Interest, 14(1), 4-58.** DOI: 10.1177/1529100612453266.
- **Finding:** rated 10 common techniques. **HIGH utility: practice testing (retrieval),
  distributed practice (spacing).** MODERATE: elaborative interrogation, self-explanation,
  interleaved practice. LOW: summarization, highlighting/underlining, keyword mnemonic,
  imagery-for-text, rereading. The most *common* student strategies (highlighting,
  rereading) are LOW utility.
- **Evidence tier:** commissioned synthesis of the whole literature, the strongest
  single citation for "what to prioritize."
- **AI-tutor translation:** this is the build-priority list. The tutor's default modes are
  the two HIGH techniques; it should never ship rereading/highlighting as a primary study
  mode. Everything below is an expansion of this ranking.
- **Why it ranks here:** it is the meta-anchor above any single mechanism, so it sits above the
  numbered list rather than inside it.

---

### 1: Retrieval Practice / the Testing Effect

- **Concept:** retrieving a fact *strengthens* it more than restudying it. Testing is a
  memory-modifying event, not just measurement.
- **Canonical papers:**
  - Roediger, H. L., & Karpicke, J. D. (2006). *Test-enhanced learning: Taking memory tests
    improves long-term retention.* **Psychological Science, 17(3), 249-255.** DOI:
    10.1111/j.1467-9280.2006.01693.x. Crossover: at 5 min restudy slightly wins
    (≈.81 vs.75); at **1 week testing wins (≈.56 vs.42)** `[verify Exp. 2]`.
  - Karpicke, J. D., & Roediger, H. L. (2008). *The critical importance of retrieval for
    learning.* **Science, 319(5865), 966-968.** DOI: 10.1126/science.1152408. On a 1-week
    test, conditions that kept testing ≈80% recall vs dropped-testing ≈33-36%; continued
    *study* of already-learned items did almost nothing. Students' predicted recall was
    **uncorrelated** with actual recall, they did not know testing was working.
  - Adesope, O. O., Trevisan, D. A., & Sundararajan, N. (2017). *Rethinking the use of tests:
    A meta-analysis of practice testing.* **Review of Educational Research, 87(3), 659-701.**
    DOI: 10.3102/0034654316689306. 272 effect sizes / 188 experiments. Testing vs restudy
    **g≈0.51**; vs no-activity **g≈0.93**. Strongest **with feedback**.
- **Evidence tier:** meta-analysis + landmark RCTs.
- **Math relevance:** general, with strong transfer to procedural and conceptual math when
  paired with feedback.
- **AI-tutor translation:** the core loop is **retrieve-then-teach**, the tutor prompts the
  student to produce the answer/step *before* it explains, and grades the attempt. In
  post-training terms: reward the model for eliciting a student attempt and giving feedback
  on it; penalize front-loading the explanation. Feedback is mandatory (Adesope: effects
  strongest with feedback; unfed failed retrieval can entrench errors).
- **Why it ranks #1:** highest-utility technique in the master review, large meta-analytic
  effect, and it maps onto the single most implementable tutor behavior.

### 2: Spacing / Distributed Practice

- **Concept:** the same study time spread over intervals beats massing it; the optimal gap
  depends on how long you need to remember.
- **Canonical papers:**
  - Ebbinghaus, H. (1885). *Über das Gedächtnis (Memory: A Contribution to Experimental
    Psychology).* The forgetting curve and the first evidence that distributing repetitions
    beats massing them. Seminal.
  - Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). *Distributed
    practice in verbal recall tasks: A review and quantitative synthesis.* **Psychological
    Bulletin, 132(3), 354-380.** DOI: 10.1037/0033-2909.132.3.354. 839 assessments / 317
    experiments. Central result is an **interaction**: the optimal inter-study interval grows
    as the retention interval grows.
  - Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). *Spacing effects
    in learning: A temporal ridgeline of optimal retention.* **Psychological Science, 19(11),
    1095-1102.** DOI: 10.1111/j.1467-9280.2008.02209.x. Optimal gap ≈20-40% of the retention
    interval for short horizons, ≈5-10% for long. Too-short gaps hurt more than too-long ones.
- **Evidence tier:** meta-analysis + large parametric study.
- **Math relevance:** strong; spacing of problem sets is a direct curriculum lever.
- **AI-tutor translation:** a **per-student review scheduler**. FSRS (Bucket's engine
  already) is the modern implementation. The Cepeda 2008 ridgeline gives the exam-aware
  variant: set the review gap from *time-to-test* rather than a generic default. Post-training
  angle: the model does not schedule; the scheduler is deterministic infrastructure the model
  reads from.
- **Why it ranks #2:** the second HIGH-utility technique and the one with the cleanest
  "turn the finding into an algorithm" path.

### 3: Interleaving in Mathematics

- **Concept:** mixing problem *types* within a practice set (instead of blocking one type)
  depresses in-session performance but sharply improves delayed test accuracy, chiefly by
  teaching *which* procedure a problem calls for.
- **Canonical papers:**
  - Rohrer, D., & Taylor, K. (2007). *The shuffling of mathematics problems improves
    learning.* **Instructional Science, 35(6), 481-498.** DOI: 10.1007/s11251-007-9015-8.
    Interleaving hurt during practice but more than doubled next-day accuracy
    (≈63% vs ≈20%) `[verify]`.
  - Rohrer, D., Dedrick, R. F., & Stershic, S. (2015). *Interleaved practice improves
    mathematics learning.* **Journal of Educational Psychology, 107(3), 900-908.** DOI:
    10.1037/edu0000001. 126 seventh-graders, ~3 months, surprise test ~1 month later:
    interleaved ≈80% vs blocked ≈38% `[verify]` (follow-up RCTs report d≈0.83).
- **Evidence tier:** classroom RCT in real math + supporting studies.
- **Math relevance:** highest, the effect is *native to math* and is about procedure
  discrimination, the exact skill K, 12 students lack.
- **AI-tutor translation:** the tutor's problem selector should **mix confusable problem
  types** (siblings in the knowledge graph). Vary problem types rather than drilling one to fluency first.
  This is a curriculum/sequencing decision, implemented in the item selector rather than the model.
  Surface the illusion: warn the student that a mixed set feels harder on purpose.
- **Why it ranks #3:** it is the most math-specific high-evidence mechanism, and the failure
  it fixes ("student can execute a method but can't tell when to use it") is the signature
  weakness of blocked textbook practice a tutor is meant to repair.

### 4, Productive failure

- **Concept:** having students **attempt to solve a novel problem before being taught the
  method**, even when they fail, produces better conceptual understanding and transfer than
  direct instruction first, *provided* the failed exploration is followed by consolidation.
- **Canonical papers:**
  - Kapur, M. (2014). *Productive Failure in Learning Math.* **Cognitive Science, 38(5),
    1008-1022.** DOI: 10.1111/cogs.12107. Students who generated (and mostly failed at) their
    own solutions to unfamiliar math problems before instruction outperformed a direct-
    instruction group on conceptual understanding and transfer, despite equivalent procedural
    fluency.
  - Kapur, M. (2016). *Examining Productive Failure, Productive Success, Unproductive Failure,
    and Unproductive Success in Learning.* **Educational Psychologist, 51(2), 289-299.** DOI:
    10.1080/00461520.2016.1155457. The 2×2 that reframes the design space: direct instruction
    can be a "productive success" against pure discovery yet an "unproductive success" against
    well-designed productive failure. Delayed/assisted struggle followed by consolidation is
    the target cell.
- **Evidence tier:** quasi-experimental classroom studies + a-cited synthesis;
  moderated by design (the consolidation phase is required, unstructured struggle is not
  enough).
- **Math relevance:** highest. The approach was developed and validated in math classrooms.
- **AI-tutor translation:** this is the **reward-shaping constraint that protects struggle**.
  A tutor optimized to maximize in-the-moment success will hand over the method immediately
  and destroy the learning. Post-training and dialogue-policy implications: (a) delay direct
  instruction, let the student generate and compare multiple (wrong) approaches first;
  (b) withhold worked solutions until after a generative attempt; (c) reward the model for
  *productive* struggle and for the consolidation turn that follows, favoring depth over fastest-to-
  correct. Pair with a guard against unproductive failure (give just enough scaffold that the
  struggle stays within reach, see entries 6 and 12).
- **Why it ranks #4:** it is the most direct evidence-based answer to "**where should an AI
  tutor *not* help**," which is the question a math-tutor company most needs settled.

### 5: Feedback and the ITS Interaction Plateau

- **Concept:** feedback is among the most powerful influences on learning, but its quality is
  what matters, the decisive jump for a tutor is from telling the student *right/wrong* to
  giving feedback *on the reasoning step*.
- **Canonical papers:**
  - Hattie, J., & Timperley, H. (2007). *The Power of Feedback.* **Review of Educational
    Research, 77(1), 81-112.** DOI: 10.3102/003465430298487. Feedback synthesis ≈0.79σ, but
    variable, a large share of feedback effects are *negative*. Effective feedback
    answers *Where am I going? How am I going? Where to next?* and operates at the process /
    self-regulation level, above praise or bare answers.
  - VanLehn, K. (2011). *The Relative Effectiveness of Human Tutoring, Intelligent Tutoring
    Systems, and Other Tutoring Systems.* **Educational Psychologist, 46(4), 197-221.** DOI:
    10.1080/00461520.2011.611369. Human tutoring d≈0.79, ITS d≈0.76 (ITS ≈ human tutors),
    answer-based CAI d≈0.31. The **interaction plateau**: the decisive gain is answer-level
    (≈0.3) → **step-level feedback (≈0.76)**; full natural-language dialogue adds little on top.
  - Steenbergen-Hu, S., & Cooper, H. (2013). *A meta-analysis of the effectiveness of
    intelligent tutoring systems on K, 12 students' mathematical learning.* **Journal of
    Educational Psychology, 105(4), 970-987.** DOI: 10.1037/a0032447. Overall K, 12 math ITS
    effect g≈0.09 (ns); ~0 to slightly negative for low-achievers; larger with a full
    school-year of use. The sobering scale check.
- **Evidence tier:** two syntheses + a domain-specific meta-analysis.
- **Math relevance:** high (VanLehn's ITS corpus and Steenbergen-Hu are math-heavy).
- **AI-tutor translation:** build for **step-level, process-level feedback**, grade and
  respond to the reasoning move, not just the final answer. That is where the ≈0.3→≈0.76 jump
  lives, and an LLM can reach it *without* needing full open-ended dialogue. The
  Steenbergen-Hu result is the warning: generic K, 12 math ITS deployments have
  averaged near zero, so the product bet is that *modern LLM step-level feedback + guardrails*
  clears a bar that older template-based ITS did not, treat that as a hypothesis to validate,
  not a given.
- **Why it ranks #5:** it names the exact lever (step-level feedback) that separates a real
  tutor from a homework-answer bot, and pairs it with the meta-analytic reality of shipping to
  K, 12 math.

### 6: Cognitive Load and the Expertise Reversal Effect

- **Concept:** working memory is tiny; instruction that spends it on extraneous load teaches
  less. Novices learn more from **studying worked examples** than from unsupported problem-
  solving, but that advantage **reverses** as expertise grows.
- **Canonical papers:**
  - Sweller, J. (1988). *Cognitive load during problem solving: Effects on learning.*
    **Cognitive Science, 12(2), 257-285.** DOI: 10.1207/s15516709cog1202_4. Means-ends
    problem solving imposes heavy extraneous load and teaches schemas poorly; worked examples
    do better. Developed on math/physics problems.
  - Sweller, J., van Merriënboer, J. J. G., & Paas, F. (1998). *Cognitive architecture and
    instructional design.* **Educational Psychology Review, 10(3), 251-296.** DOI:
    10.1023/A:1022193728205. The consolidated theory (intrinsic / extraneous / germane load).
  - Kalyuga, S., Ayres, P., Chandler, P., & Sweller, J. (2003). *The Expertise Reversal
    Effect.* **Educational Psychologist, 38(1), 23-31.** DOI: 10.1207/S15326985EP3801_4.
    Instructional support that helps novices becomes redundant and can *harm* experts; optimal
    support fades with expertise.
- **Evidence tier:** seminal theory + a well-replicated moderator effect.
- **Math relevance:** high, the worked-example effect was largely established in algebra and
  geometry.
- **AI-tutor translation:** **fade scaffolding as mastery rises.** Show full worked
  derivations to novices; as the student's mastery estimate climbs, drop steps (completion /
  faded-example sequences) and shift them from *studying* solutions to *generating* them. The
  tutor must read a per-concept mastery state and not over-explain to an advanced learner,
  over-help is a measured harm, not just wasted tokens.
- **Why it ranks #6:** it gives the tutor its *adaptivity rule* (how much to show, when to
  stop showing), which is exactly the knob an AI tutor is best positioned to turn.

### 7, Self-explanation

- **Concept:** students who spontaneously explain *why* each step of a worked example follows
  learn far more than those who don't; prompting the explanation induces the effect.
- **Canonical papers:**
  - Chi, M. T. H., Bassok, M., Lewis, M. W., Reimann, P., & Glaser, R. (1989).
    *Self-explanations: How students study and use examples in learning to solve problems.*
    **Cognitive Science, 13(2), 145-182.** DOI: 10.1207/s15516709cog1302_1. "Good" students
    generated many more self-explanations while studying physics worked examples than "Poor"
    students; the explaining drove the gain, ahead of the example itself.
  - Chi, M. T. H., de Leeuw, N., Chiu, M.-H., & LaVancher, C. (1994). *Eliciting
    self-explanations improves understanding.* **Cognitive Science, 18(3), 439-477.** DOI:
    10.1207/s15516709cog1803_3. *Prompting* students to self-explain (here, biology text)
    improved understanding, the effect can be induced, not just observed.
- **Evidence tier:** seminal + the causal prompting study; MODERATE utility in Dunlosky 2013.
- **Math relevance:** high (the 1989 study is math/physics problem-solving).
- **AI-tutor translation:** a first-class dialogue move, the tutor asks *"why does this step
  follow?"* / *"what rule justifies this?"* rather than narrating. Maps to Bucket's Derive and
  Teach-back mastery levels. Post-training: reward eliciting a student explanation and probing
  it for gaps; a tutor that only *gives* explanations leaves the highest-leverage cognitive
  work undone.
- **Why it ranks #7:** high-leverage and cheap to implement as a prompt policy, but the
  evidence tier is seminal/MODERATE rather than meta-analytic HIGH.

### 8, Desirable difficulties

- **Concept:** conditions that slow acquisition and depress in-session performance, spacing,
  interleaving, testing, varying conditions, *enhance* long-term retention and transfer. The
  methods that work feel worse than the methods that don't.
- **Canonical papers:**
  - Bjork, R. A. (1994). *Memory and metamemory considerations in the training of human
    beings.* In Metcalfe & Shimamura (Eds.), *Metacognition: Knowing about Knowing*, 185-205,
    MIT Press. (Coins "desirable difficulties.")
  - Bjork, E. L., & Bjork, R. A. (2011). *Making things hard on yourself, but in a good way:
    Creating desirable difficulties to enhance learning.* In *Psychology and the Real World*
    (Worth), 56-64. The load-bearing boundary: a difficulty is *desirable* only if the learner
    can overcome it via successful retrieval (has prerequisites + gets feedback).
  - (Root theory: Bjork & Bjork, 1992, *A New Theory of Disuse*, storage vs retrieval
    strength; the reason performance ≠ learning.)
- **Evidence tier:** theoretical synthesis unifying the meta-analytic entries above.
- **Math relevance:** general (its instances, entries 1-3, carry the math evidence).
- **AI-tutor translation:** the design principle behind auto-difficulty, keep the student in
  the zone where retrieval is effortful *and* succeeds, never so hard that it fails outright.
  And the UX corollary: **tell the student the harder-feeling drills are the method working**,
  so an in-session dip doesn't read as the product being broken or the student failing.
- **Why it ranks #8:** it explains *why* 1-3 work and gives one clean design rule, but as a
  theory rather than a standalone implementable mechanism it sits below its own instances.

### 9: Guardrailed LLM Tutors

- **Concept:** an LLM tutor's effect on learning flips sign depending on whether it is
  guardrailed to withhold answers and give hints, the same model helps or harms.
- **Canonical papers:**
  - Kestin, G., Miller, K., Klales, A., Milbourne, J., & Ponti, G. (2024/2025). *AI tutoring
    outperforms in-class active learning: an RCT.* **Scientific Reports** (Research Square
    preprint, CC-BY). N=194 Harvard physics, crossover RCT. AI-tutor gains >2× active-lecture
    in less time; effect ≈0.63σ (ceiling-corrected higher). The AI was **prompt-engineered**
    (hints not answers, cognitive-load management, growth mindset), beyond vanilla ChatGPT.
  - Bastani, H., Bastani, O., et al. (2024/2025). *Generative AI Without Guardrails Can Harm
    Learning.* **PNAS.** ~1,000 high-schoolers on math practice. **Unguarded GPT-4** raised
    assisted scores +48% but dropped the **unassisted** exam **−17% vs control** (crutch
    effect); a **guardrailed "GPT Tutor"** (hints, answer-withholding) erased the harm (≈0).
    Same model, opposite outcomes, the variable is pedagogical scaffolding.
- **Evidence tier:** RCTs, recent, pre-print/early-publication, cite as strong-but-fresh.
- **Math relevance:** high (Bastani is math practice; Kestin is physics problem-solving).
- **AI-tutor translation:** this pair *is* the post-training brief. **Answer-withholding is a
  hard requirement, ahead of any style choice.** Optimize the tutor to give hints and elicit steps;
  measure the *unassisted* outcome, because the assisted score is exactly what over-help
  inflates while learning falls. This is the empirical twin of productive failure (entry 4)
  in the AI setting.
- **Why it ranks #9 despite being on-topic:** the effect is large and directly about AI
  tutors, but the evidence is two recent RCTs rather than a settled meta-analysis, so it
  ranks below the meta-analytic mechanisms it operationalizes.

### 10: Mastery Learning and the 2-Sigma Aspiration

- **Concept:** require mastery of each unit before advancing; 1:1 tutoring + mastery learning
  once produced a ~2σ gain, a ceiling to aim at rather than a shippable number.
- **Canonical papers:**
  - Bloom, B. S. (1984). *The 2 Sigma Problem: The Search for Methods of Group Instruction as
    Effective as One-to-One Tutoring.* **Educational Researcher, 13(6), 4-16.** DOI:
    10.3102/0013189X013006004. 1:1 tutoring + mastery ≈2σ; group mastery learning alone ≈1σ.
    Source data were two small dissertations.
  - Kulik, C.-L. C., Kulik, J. A., & Bangert-Drowns, R. L. (1990). *Effectiveness of Mastery
    Learning Programs: A Meta-Analysis.* **Review of Educational Research, 60(2), 265-299.**
    DOI: 10.3102/00346543060002265. 108 evaluations, average ≈0.5σ, larger for weaker
    students, partly bought with more time-on-task.
  - Reality check on 2σ: Nickow, Oreopoulos & Quan (2020, NBER WP 27476), 96 tutoring RCTs,
    mean ≈0.37σ, none reached 2σ. Real high-dosage tutoring ≈0.3-0.5σ.
- **Evidence tier:** seminal claim + meta-analysis + the correction literature.
- **Math relevance:** high (much of the tutoring/mastery corpus is math).
- **AI-tutor translation:** **mastery-gating**, do not unlock the next concept until the
  current one is mastered; the prerequisite graph is the gate. Set the product's efficacy
  target to the *replicated* band (~0.5σ mastery, ~0.5-0.8σ for good ITS/guardrailed LLM),
  never Bloom's unreplicated 2σ. Overclaiming 2σ is both a credibility and a compliance risk.
- **Why it ranks #10:** the mechanism (mastery-gating) is solid and implementable, but its
  fame rests on a number that did not replicate, so it earns a rank below the cleaner effects.

### 11: Scaffolding and the Zone of Proximal Development

- **Concept:** a tutor supports a learner through what they cannot yet do alone, then
  withdraws support as competence grows, the origin of "scaffolding."
- **Canonical papers:**
  - Wood, D., Bruner, J. S., & Ross, G. (1976). *The Role of Tutoring in Problem Solving.*
    **Journal of Child Psychology and Psychiatry, 17(2), 89-100.** DOI:
    10.1111/j.1469-7610.1976.tb00381.x. Introduces scaffolding and its six tutoring functions
    (recruitment, reduction of degrees of freedom, direction maintenance, marking critical
    features, frustration control, demonstration).
  - Vygotsky, L. S. (1978). *Mind in Society: The Development of Higher Psychological
    Processes.* Harvard University Press. The Zone of Proximal Development, the gap between
    solo and assisted performance. Seminal, theoretical.
- **Evidence tier:** seminal / foundational (not effect-size evidence).
- **Math relevance:** general, but the whole ITS field is a formalization of it.
- **AI-tutor translation:** the conceptual charter for adaptive help, *give exactly enough
  support to keep the problem inside reach, then fade it* (the mechanism entry 6 quantifies
  and entry 4 bounds). Bruner's six functions read almost as a spec for tutor dialogue moves.
- **Why it ranks #11:** it is the root idea behind entries 4/5/6/10, but as theory rather than
  a measured mechanism it ranks below them.

### 12, Deliberate practice

- **Concept:** expert performance is built by sustained, effortful practice
  targeting weaknesses at the edge of current ability, with feedback.
- **Canonical papers:**
  - Ericsson, K. A., Krampe, R. Th., & Tesch-Römer, C. (1993). *The role of deliberate
    practice in the acquisition of expert performance.* **Psychological Review, 100(3),
    363-406.** DOI: 10.1037/0033-295X.100.3.363.
  - Correction: Macnamara, B. N., Hambrick, D. Z., & Oswald, F. L. (2014). *Deliberate
    practice and performance… A meta-analysis.* **Psychological Science, 25(8), 1608-1618.**
    DOI: 10.1177/0956797614535810. Deliberate practice explained ~26% of variance in games,
    ~21% in music, but only ~4% in education, much less than the "10,000-hour" folklore.
- **Evidence tier:** seminal theory, meaningfully qualified by later meta-analysis.
- **Math relevance:** general; the *targeting-weaknesses* principle transfers to math drilling.
- **AI-tutor translation:** justifies **weakness-targeted practice selection**, the tutor
  spends time where the student's mastery estimate is lowest and the concept is high-leverage,
  at the edge of ability, with immediate feedback (this is entry 8's "desirable" zone made
  operational). Cite the *targeting* principle; do not repeat the "10,000 hours" claim.
- **Why it ranks #12:** the principle is useful and implementable, but the education-domain
  effect is small and the popular version is overstated, so it earns the lowest build-priority
  of the core set.

### 13: Dual Coding and Multimedia Learning

- **Concept:** words + a load-bearing picture beat words alone, because the two encodings give
  two retrieval routes, *if* the image depicts the idea and nothing extraneous.
- **Canonical papers:**
  - Paivio, A. (1971/1986). *Dual Coding Theory.* Verbal and visual systems are independent
    but interconnected; dual-encoded items have additive memory.
  - Mayer, R. E. (2009/2021). *Multimedia Learning* (Cambridge University Press). The CTML
    principles: multimedia (d≈1.35), spatial + temporal contiguity (d≈1.10/1.22), **coherence**
    (remove extraneous, d≈0.86), signaling, pre-training.
  - Guardrail: Sundararajan, N., & Adesope, O. (2020). *Keep it coherent: A meta-analysis of
    the seductive details effect.* **Educational Psychology Review, 32, 707-734.** DOI:
    10.1007/s10648-020-09522-4. Interesting-but-irrelevant images *hurt*, worst for novices
    and for transfer.
- **Evidence tier:** large multimedia effects + a meta-analytic guardrail.
- **Math relevance:** high for diagrammatic math (number lines, area models, graphs).
- **AI-tutor translation:** generated visuals must **diagram the idea**, labeled on the
  relevant part, with everything decorative stripped. A tutor that emits pretty-but-vibe art
  imposes a measured *−0.3 to −0.5* penalty on the exact novice learners it serves. Bucket's
  `art_prompt` contract (People doc §1.6) already encodes this.
- **Why it ranks #13:** large effects, but for a *math* tutor the visual layer is a
  supporting capability rather than the core learning loop, high value, lower build-priority
  than 1-7.

---

## Papers the People-pillar doc already covers in depth

Motivation / Self-Determination Theory (Ryan & Deci 2000; Deci, Koestner & Ryan 1999,
rewards can crowd out intrinsic motivation, d≈−0.3 to −0.4), gamification meta-analysis
(Sailer & Homner 2020), metacognition / illusions of knowing (Kruger & Dunning 1999; Bjork,
Dunlosky & Kornell 2013), and the full **AI-tutor safety floor** (RLHF calibration damage,
hallucination taxonomy, RAG grounding, closed-set citation validation, abstention, FActScore
/ TruthfulQA eval, SafeTutors multi-turn harm 17.7%→77.8%) all live in
`research/people/LEARNING-SCIENCE-AND-AI-SAFETY.md` §3, §4, §6. They are load-bearing for any
AI tutor but are ranked there; this file does not re-rank them.

---

## Citations that could not be fully page-verified

- **Effect proportions tagged `[verify]`** (Roediger & Karpicke 2006 Exp. 2 proportions;
  Rohrer & Taylor 2007 and Rohrer/Dedrick/Stershic 2015 accuracy percentages) come from
  consistent secondary citation; the *direction and magnitude* are robust, page-check the exact
  numbers before external publication. (Same flags as the People doc's verification list.)
- **Kestin et al.** and **Bastani et al.** are recent RCTs in preprint / early publication;
  venues (*Scientific Reports*, *PNAS*) and designs are confirmed, exact page/issue may still
  be settling, cite year-flexibly (2024/2025).
- All other DOIs/venues above were verified against publisher records or indexing databases
  (Wiley, APA, SAGE, Taylor & Francis, PubMed, ERIC) during this sweep.

---

## The one-paragraph thesis

If you are post-training an AI math tutor, four mechanisms carry most of the weight and all
point the same direction: **make the student retrieve before you explain** (retrieval
practice), **space and interleave the problems** (scheduling + procedure discrimination),
**let them struggle before you instruct** (productive failure), and **give feedback on the
reasoning step, with the answer withheld** (the interaction plateau + guardrailed-LLM RCTs).
Every one of those is a decision about *when the tutor should hold back*, which is why a
company that cares about where AI can't help should read the productive-failure and
answer-withholding literature before the "AI teaches everything" literature.
