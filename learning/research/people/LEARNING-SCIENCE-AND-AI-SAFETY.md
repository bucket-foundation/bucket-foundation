# Bucket Academy — Learning Science & AI-Tutor Safety (the Evidence Base)

**Pillar:** People · **Bead:** bkt-xo0 · **Author:** People pillar (Nucleus) · 2026-06-11
**Pilot domain:** biophysics general-exam prep
**Mandate:** *Not fast — correct and amazing.* This document is the **evidence base** that
makes Bucket Academy actually *teach* (not gamify-toward-nothing), plus the **AI-tutor
safety floor** that keeps a confidently-wrong physics explanation from teaching a lasting
misconception.

> **Read alongside:** `KNOWLEDGE-ARCHITECTURE.md` (Concept Atom, dependency graph, R/A/D/T
> mastery signal) and `PRODUCT.md` (the learning loop, tiers, art-as-dual-coding). This file
> supplies the *why* — the studies — behind every feature those two files propose, and the
> caveats that separate a real learning tool from a gamified toy.

**Sourcing rule honored:** every claim below traces to a named, legal/open source (journal
abstract, ERIC, PMC, arXiv, ACL Anthology, NeurIPS/PMLR, author archive). No shadow
libraries. Three numeric figures are flagged `[verify]` where the primary PDF was
binary-encoded and the number comes from consistent secondary citation; they are safe to
*use* but should be page-checked before any external publication.

---

## 0. The two load-bearing ideas (read this even if you read nothing else)

1. **Learning ≠ performance.** Bjork & Bjork's *New Theory of Disuse* (1992) splits memory
   into **storage strength** (how well-learned, only ever increases) and **retrieval
   strength** (how accessible *right now*, decays). Conditions that *lower* momentary
   retrieval strength — and therefore *feel harder and look worse in the session* — can
   build *more* storage strength. Every high-evidence technique below (spacing, retrieval
   practice, interleaving) is an instance of this. The corollary is a recurring trap: **the
   methods that work feel worse than the methods that don't**, so learners reliably choose
   wrong. This is the single strongest argument for *system-imposed* (algorithmic)
   scheduling and for *honest* progress signals.

2. **In a teaching product, a confident wrong answer is the worst failure mode.** RLHF
   trains chat models to *sound helpful and certain*, and it measurably **degrades
   calibration** (OpenAI GPT-4 System Card, 2023: "the post-training process hurts
   calibration significantly"). A fluent, confident, wrong derivation installs a durable
   misconception — the opposite of teaching. Section 6 is therefore not optional polish; it
   is the safety floor.

---

## 1. THE EVIDENCE BASE — high-leverage techniques and how Bucket uses them

### 1.1 The utility tiering (start here)

Dunlosky, Rawson, Marsh, Nathan & Willingham (2013), *Improving Students' Learning With
Effective Learning Techniques* (*Psychological Science in the Public Interest* 14(1), 4–58)
rated ten common techniques. The verdict the whole product should internalize:

| Utility | Techniques |
|---|---|
| **HIGH** | **Practice testing** (retrieval), **Distributed practice** (spacing) |
| **MODERATE** | Elaborative interrogation, Self-explanation, **Interleaved practice** |
| **LOW** | Summarization, **Highlighting/underlining**, Keyword mnemonic, Imagery-for-text, **Rereading** |

The most *common* student strategies — highlighting and rereading — are *low utility*. The
two highest-leverage strategies — testing and spacing — are *underused*. **Bucket's core
loop is built on the two HIGH-utility techniques and refuses to ship the LOW ones as
primary study modes.**

---

### 1.2 Spaced repetition / distributed practice

**The forgetting curve.** Ebbinghaus (1885), *Über das Gedächtnis* — the first experimental
memory study; established that retention falls steeply in the first hours/day then
decelerates, and (Ch. VIII) that **distributing** repetitions over time beats **massing**
them.

**The anchoring meta-analysis.** Cepeda, Pashler, Vul, Wixted & Rohrer (2006),
*Distributed practice in verbal recall tasks: A review and quantitative synthesis*
(*Psychological Bulletin* 132(3), 354–380) — **839 assessments across 317 experiments in
184 articles**. Distributed practice reliably beats massed; the central finding is an
**interaction**: the inter-study interval that maximizes retention *grows* as the retention
interval grows. (Cite the interaction, not a single "spacing %", which is condition-dependent.)

**The optimal-gap rule.** Cepeda, Vul, Rohrer, Wixted & Pashler (2008), *Spacing effects in
learning: A temporal ridgeline of optimal retention* (*Psychological Science* 19(11),
1095–1102) — >1,350 participants, gaps up to 3.5 months, tests up to 1 year out. **Optimal
gap as a proportion of the retention interval shrinks as that interval grows**: ≈20–40% of
the delay for a 1-week target, ≈5–10% for a 1-year target. Practically: remember for a week
→ review ~1–2 days later; remember for a year → review ~3–4 weeks later. The penalty for
*too-short* gaps is steeper than for somewhat-too-long.

**Algorithmic lineage (the scheduler).** SuperMemo **SM-2** (Woźniak, 1987–90) →
Difficulty-Stability-Retrievability modeling (Averell & Heathcote, 2011, *J. Mathematical
Psychology*) → **FSRS** (Ye, 2022), now Anki's default since v23.10 (Nov 2023). On an open
benchmark of ~700M+ Anki reviews, FSRS hits target retention with materially lower error
than SM-2 and needs ~20–30% fewer reviews for equal retention. *Caveat:* this is an
*engineering* benchmark on self-selected users, not a randomized cognitive experiment —
cite it as scheduling efficiency, not a clean learning effect.

> **Bucket mapping.** `engine/` runs **FSRS** as the scheduler (already specced in
> `PRODUCT.md`), targeting a configurable retention (e.g. 90%). The **daily path** surfaces
> due reviews at intervals the spacing literature endorses. Because the optimal gap depends
> on *how long you need to remember*, Exam-Simulator mode (a fixed exam date) should set the
> retention target and gap schedule from the **time-to-exam**, not a generic default — a
> direct application of the Cepeda 2008 ridgeline.

---

### 1.3 Retrieval practice / the testing effect

**The classroom demonstration.** Roediger & Karpicke (2006), *Test-enhanced learning*
(*Psychological Science* 17(3), 249–255). Study prose, then either **restudy** or take a
**free-recall test** (no feedback); final test at 5 min / 2 days / 1 week. **Crossover:** at
5 min restudy slightly wins (≈.81 vs .75); at **1 week testing substantially wins (≈.56 vs
.42)** `[verify Exp. 2]`. Restudy buys short-term performance; retrieval buys long-term
retention.

**Retrieval is the mechanism.** Karpicke & Roediger (2008), *The critical importance of
retrieval for learning* (*Science* 319, 966–968). Swahili-English vocab, 2×2 drop-study ×
drop-test. On the 1-week test, conditions that **kept testing ≈ 80%** recall vs **dropped
testing ≈ 33–36%**; continued *studying* of already-learned items did essentially nothing.
And the **metacognitive failure**: students' predicted recall was *uncorrelated* with actual
recall — they did not know testing was working.

**The meta-analysis (effect sizes).** Adesope, Trevisan & Sundararajan (2017), *Rethinking
the use of tests* (*Review of Educational Research* 87(3), 659–701) — 272 effect sizes from
188 experiments. Practice testing vs restudy: **g ≈ 0.51**; vs filler/no-activity:
**g ≈ 0.93**. Robust across format and level; strongest with feedback.

> **Bucket mapping — this is the R/A/D/T mastery ladder.** The `mastery_signal` field on
> each Concept Atom (`recall | apply | derive | teach`) is **retrieval at increasing depth**:
> - **R (Recall)** — free recall / cloze of the atom's statement.
> - **A (Apply)** — use it on a new instance (interleaving lives here, §1.4).
> - **D (Derive)** — reconstruct the result from prerequisites (the deepest single-learner
>   retrieval; maps to the atom's `requires` edges).
> - **T (Teach-back)** — explain it to the tutor / a "protégé," who probes for gaps. This is
>   **self-explanation** (Dunlosky MODERATE-utility) and the **protégé effect**: generating
>   an explanation *for someone else* forces elaborative retrieval and surfaces holes.
>
> **Always-with-feedback** is a hard requirement (Adesope: effects strongest with feedback;
> failed retrieval without feedback can entrench errors). And the daily loop must be built on
> *retrieval*, not rereading — the atom's Feynman explanation is the *teach* surface, but the
> *study* surface is always a test.

---

### 1.4 Interleaving vs blocking

**Math foundation.** Rohrer & Taylor (2007), *The shuffling of mathematics problems improves
learning* (*Instructional Science* 35(6), 481–498). Mixed (interleaved) practice *hurt*
during the session but **more than doubled** test accuracy a day later (interleaved ≈63% vs
blocked ≈20%) `[verify]`.

**Elementary replication.** Taylor & Rohrer (2010), *The effects of interleaved practice*
(*Applied Cognitive Psychology* 24(6), 837–848). Interleaving impaired practice but
**roughly doubled** next-day accuracy (≈77% vs 38%) `[verify]`, chiefly by cutting
**discrimination errors** — interleaving teaches *which* procedure to use, not just *how*.

**Ecological RCT.** Rohrer, Dedrick & Stershic (2015), *Interleaved practice improves
mathematics learning* (*J. Educational Psychology* 107(3), 900–908). 126 seventh-graders,
~3 months, surprise test ~1 month later: interleaved ≈80% vs blocked ≈38% `[verify]`
(follow-up RCTs report d ≈ 0.83).

**The metacognitive-illusion caveat (critical).** In *every* study, **learners feel blocking
is better** — it produces higher in-session performance and a false sense of mastery.
Interleaving also helps most when items are **confusable and require discrimination**, and
is partly confounded with spacing (it inherently spaces each type).

> **Bucket mapping.** The dependency graph is the *substrate* for principled interleaving:
> mix atoms that are **siblings/confusable** (share `requires` or `unlocks` neighborhoods),
> not random cards. The **Apply (A)** level and Exam-Simulator deliberately interleave
> across a branch's nucleus. **Surface the illusion honestly** (§4): tell the learner "this
> mixed set will feel harder and your in-session score will dip — that dip is the method
> working," so the lower fluency doesn't read as failure.

---

### 1.5 Desirable difficulties (the unifying theory)

Bjork & Bjork (1992, *New Theory of Disuse*; 1994 coins the term; 2011 *Making things hard
on yourself, but in a good way*). A **desirable difficulty** slows acquisition and depresses
short-term performance but **enhances long-term retention and transfer**. Canonical list:
**spacing, interleaving, varying practice conditions, and testing/generation** — i.e. *all
of §1.2–1.4 are the same phenomenon*. The load-bearing **boundary condition**: a difficulty
is only *desirable* if the learner can **overcome it via successful retrieval** (has the
prerequisites + gets feedback). If retrieval fails entirely with no support, it is just a
difficulty — *undesirable*.

> **Bucket mapping.** "Auto-difficulty" (`PRODUCT.md` §2) must keep each learner in the
> **desirable** zone: hard enough to force effortful retrieval, not so hard that retrieval
> fails. FSRS retrievability is the dial — schedule reviews near the edge of forgetting, not
> deep in over-learning. And **never present a frontier atom before its `requires`
> prerequisites are mastered** — the dependency graph is precisely the mechanism that keeps
> difficulty *desirable* rather than *defeating*. This is also why the tutor must *gate on
> mastery* (§2) rather than let a learner skip ahead into undesirable difficulty.

---

### 1.6 Dual coding & multimedia — the scientific justification for AI concept ART

This is the section that decides whether the art is a **moat or a liability**. The evidence
says the *same image* is a large asset or a measurable harm depending solely on whether it is
**conceptually load-bearing**.

**Dual Coding Theory.** Paivio (1971, 1986; 1991 retrospective). Verbal (logogens) and
visual (imagens) systems are functionally independent but interconnected; an item encoded in
**both** has two retrieval routes, so memory is **additive**. Pictures and concrete imageable
words beat abstract words.

**Picture Superiority Effect (the hard evidence).**
- Shepard (1967): after one exposure to ~600 items, recognition ≈90% words / ≈98%
  **pictures** (near-ceiling).
- Standing (1973), *Learning 10,000 pictures*: ~83% recognition over **10,000** images —
  enormous pictorial capacity.
- Nelson, Reed & Walling (1976): established the effect and a **distinctiveness** mechanism.
- *Honesty caveat:* the **mechanism** is debated — Higdon et al. (2025, *QJEP*) argue
  **distinctiveness**, not literal dual coding, drives it. This does **not** weaken the
  product case: under *every* account, a **distinctive, meaningful** image improves memory.
  Distinctiveness is itself a design lever (clean, concept-focused art beats busy "beautiful"
  art).

**Mayer's Cognitive Theory of Multimedia Learning (CTML)** (Mayer, 2009, *Multimedia
Learning*; 2014/2021 *Cambridge Handbook*; 2017 *J. Computer Assisted Learning*). Built on
three assumptions: **dual channels** (← Paivio), **limited capacity** (← Sweller/Baddeley),
**active processing**. Reported median effect sizes (Mayer's own syntheses):

| Principle | What it says | Median *d* |
|---|---|---|
| **Multimedia** | words + pictures > words alone | **≈ 1.35** |
| **Spatial contiguity** | put words next to the graphic they label | **≈ 1.10** |
| **Temporal contiguity** | sync narration with the matching animation | **≈ 1.22** |
| **Coherence** | **REMOVE extraneous** words/pictures/sounds (the anti-decoration rule) | **≈ 0.86** |
| **Redundancy** | don't add on-screen text identical to narration | **≈ 0.86** |
| **Modality** | spoken words + graphics > printed words + graphics | **≈ 0.76** |
| **Segmenting** | learner-paced chunks | **≈ 0.70–0.79** |
| **Pre-training** | teach component names/concepts first | **≈ 0.46–0.85** |
| **Signaling** | cue/highlight the essential parts | **≈ 0.41** |
| **Personalization / Voice** | conversational style; human narration | **≈ 1.3 / 0.74** |

The **multimedia principle (d ≈ 1.35) is one of the largest effects in the literature** —
the green light for concept art. But **contiguity (d ≈ 1.10 / 1.22)** says *placement and
timing matter as much as inclusion*, and **coherence (d ≈ 0.86)** is the constraint: cut
anything extraneous.

**The seductive-details effect — the rule that governs the whole feature.** Interesting-but-
irrelevant material (including images) **reduces** learning.
- Harp & Mayer (1998), *How seductive details do their damage* (*J. Educational Psychology*
  90(3), 414–434): seductive details → fewer recalled main ideas and fewer transfer
  solutions, by **priming wrong schemas** (active mis-structuring, not mere distraction).
- Rey (2012) meta-analysis: seductive details hurt **retention d = −0.30** and **transfer
  d = −0.48** — transfer (deep understanding) damaged more.
- Sundararajan & Adesope (2020), *Keep it coherent* (*Educational Psychology Review* 32,
  707–734): 58 studies; small-to-medium **negative** effect that holds **across modality** —
  a seductive *picture* is as harmful as a seductive *story* — and is **worst for low-prior-
  knowledge learners** (i.e. novices — *exactly Bucket's user*) and worst for transfer.

**Cognitive Load Theory** (Sweller, 1988; Sweller, van Merriënboer & Paas, 1998) explains
the mechanism: working memory is tiny; **extraneous load** (bad/decorative visuals, split
attention, redundancy) wastes it, leaving less for **germane** schema-building. A good image
*offloads* to the visual channel and *lowers* extraneous load; a decorative one *adds* load
and may prime wrong schemas.

> **Bucket mapping — the `art_prompt` contract.** This is the difference between Bucket's
> "art is the wedge" being a learning moat or a `d = −0.3` own-goal. **Enforce on every
> generated image:**
> 1. **Load-bearing test** — the image must depict the *idea* (a mechanism, structure,
>    relationship, the terms of an equation), not the topic's *vibe*. *"If I removed this,
>    would the learner lose information?"* No → cut it.
> 2. **No decorative eye-candy** — banned, because it is *negative* for novices and transfer.
> 3. **Always image + word**, never either alone (multimedia principle). Label/annotate.
> 4. **Spatial contiguity** — labels ON the relevant part of the art, not in a separate
>    legend.
> 5. **Signaling** — arrows/highlight/zoom direct attention to the load-bearing element;
>    strip irrelevant detail.
> 6. **Distinctive, not busy** — distinctiveness drives memory; clean beats ornate.
> 7. **Pre-train before complex diagrams** — introduce component names first.
> 8. The example atom's `art_prompt` ("a ladder of energy levels with population fading
>    exponentially upward") is *correct* — it diagrams the Boltzmann distribution's
>    *meaning*. The "collectible trading-card" framing in `PRODUCT.md` §2 must inherit these
>    rules: a shareable card whose art is decorative would be a pedagogical regression.
>
> **One-line thesis for the spec:** *generate diagrams of the idea, correctly placed and
> labeled — never decorative illustration of the topic.*

---

### 1.7 Elaboration, self-explanation, worked examples, expertise reversal

- **Elaborative interrogation & self-explanation** — MODERATE utility (Dunlosky 2013).
  Asking *why/how* and explaining steps to oneself improves comprehension and transfer.
  → Bucket's **Derive (D)** and **Teach-back (T)** levels, and the Socratic tutor (§2).
- **Worked examples & the expertise-reversal effect** (Sweller; Kalyuga et al.). Novices
  learn more from **studying worked examples** than from unsupported problem-solving (lower
  extraneous load); but as expertise grows, worked examples become *redundant* and even
  *harm* — experts learn more by solving. The optimal support **reverses** with expertise.
  → **Fade scaffolding with mastery.** Early atoms show full worked derivations; as FSRS
  stability/mastery rises, the system removes steps (a "completion/faded" sequence) and
  shifts the learner from *studying* derivations to *generating* them. The tutor must read
  mastery state and **not** over-explain to an advanced learner.

---

## 2. THE 2-SIGMA PROBLEM & WHETHER AN AI TUTOR CAN APPROACH IT

**Bloom's claim.** Bloom (1984), *The 2 Sigma Problem* (*Educational Researcher* 13(6),
4–16): 1:1 tutoring **+ mastery learning** moved the average student to ~**98th percentile**
(≈**2σ**) above a conventional class. Source data = two small unpublished dissertations
(Anania ≈2.0σ, Burke ≈2.3σ); group mastery learning alone ≈1.0σ.

**Honest replication caveat (use 2σ as a ceiling, not a fact).**
- Nickow, Oreopoulos & Quan (2020, NBER WP 27476): meta-analysis of **96 randomized
  tutoring RCTs**, mean ≈ **0.37σ** — **none** reached 2σ.
- Kraft (2020, *Educational Researcher*): Bloom's figure "anchored unrealistically large"
  expectations; a "large" education RCT effect is ≈0.20σ.
- von Hippel (*Education Next*): the 2σ came from tiny samples and **bundled** tutoring with
  formative testing + corrective feedback + retesting; the **testing-and-feedback** component
  alone explained ~half the effect.
- **Bottom line:** real high-dosage tutoring ≈ **0.3–0.5σ** (still among the best
  interventions in education), not 2σ.

**Mastery learning.** Kulik, Kulik & Bangert-Drowns (1990), *Effectiveness of Mastery
Learning Programs* (*Review of Educational Research* 60(2), 265–299): 108 evaluations,
average ≈ **0.5σ** (LFM ≈0.59σ, PSI ≈0.49σ), **larger for weaker students**; effects bigger
on aligned local tests than standardized ones; partly bought with **more time-on-task**.

**Intelligent Tutoring Systems — the key result.** VanLehn (2011), *The Relative
Effectiveness of Human Tutoring, ITS, and Other Tutoring Systems* (*Educational Psychologist*
46(4), 197–221): **human tutoring d ≈ 0.79**, **ITS d ≈ 0.76** (ITS ≈ human tutors), answer-
based CAI d ≈ 0.31. The **"interaction plateau"**: the decisive jump is **answer-level
(≈0.3) → step-level feedback (≈0.76)**; going from step-level to full human dialogue adds
little. Kulik & Fletcher (2016): median ITS ≈ **0.66σ** (again larger on aligned tests).
At scale, effects shrink: Cognitive Tutor Algebra I (Pane/RAND 2014) **+0.21σ** in year 2.

**Feedback is the engine.** Hattie & Timperley (2007), *The Power of Feedback* (*RER* 77(1),
81–112): feedback among the most powerful influences (synthesis ≈0.79σ) — **but highly
variable; ~32% of feedback effects are negative** (Kluger & DeNisi). Effective feedback
answers *Where am I going? How am I going? Where to next?* and operates at the **process /
self-regulation** level, **not** the praise/answer-revealing level.

**Modern LLM tutors — both sides.**
- **The positive (guardrailed).** Kestin, Miller, Klales, Milbourne & Ponti (2024/2025),
  *AI tutoring outperforms in-class active learning: an RCT* (*Scientific Reports*; Research
  Square preprint, CC-BY). N=194 Harvard physics, crossover RCT. AI-tutor learning gains
  **>2× active-lecture**, in **less time** (median 49 min); effect ≈ **0.63** standardized
  (ceiling-corrected 0.73–1.3σ). Crucially, the AI was **carefully prompt-engineered**
  (growth-mindset, cognitive-load management, **hints not answers**) — *not* vanilla ChatGPT.
- **The cautionary (unguarded).** Bastani et al. (2024/2025), *Generative AI Without
  Guardrails Can Harm Learning* (*PNAS*). ~1,000 high-schoolers. With **unguarded GPT-4**,
  assisted scores rose **+48%** but the **unassisted exam fell −17% vs control** — students
  used it as a **crutch**. A **guardrailed "GPT Tutor"** (hints, answer-withholding) erased
  the harm (≈0). Same model, opposite outcomes — **the variable is pedagogical scaffolding.**
- **Design exemplar (not RCT-grade).** Khanmigo (Khan Academy) uses a Socratic,
  answer-withholding design; adoption scaled ~68k → ~700k users, but **no published learning-
  outcomes RCT yet** — treat as a design pattern, not efficacy evidence.

> **Bucket mapping — what makes the AI tutor effective (and safe to call a "tutor").**
> The evidence converges on a precise design:
> 1. **Step-level, process-level feedback** — feedback on the *reasoning step*, not just
>    right/wrong, and never the bare answer (VanLehn plateau; Hattie & Timperley). This is
>    where the ≈0.3 → ≈0.76 jump lives, and it's *reachable without full dialogue*.
> 2. **Socratic, answer-withholding** — the tutor asks *you* questions and gives **hints**,
>    not solutions (Kestin's design beat lectures; Bastani's unguarded answer-giving *hurt*).
>    `PRODUCT.md` already names "Socratic AI tutor" — this evidence makes answer-withholding a
>    **hard requirement**, not a style choice. Guard against the **"crutch"** failure mode.
> 3. **Mastery gating** — don't unlock the next atom until the current one is mastered
>    (mastery learning ≈0.5σ; the dependency graph is the gate). Aligns with §1.5 (keeps
>    difficulty *desirable*).
> 4. **Realistic target.** We aim for the **ITS / guardrailed-LLM band (~0.5–0.8σ)**, which
>    is genuinely excellent — **not** the folklore 2σ. Set product expectations and any
>    marketing claim to the *replicated* numbers.

---

## 3. MOTIVATION — Self-Determination Theory, gamification, and the crowding-out risk

**The framework.** Ryan & Deci (2000), *Self-Determination Theory…* (*American Psychologist*
55(1), 68–78). Three basic psychological needs drive intrinsic motivation and well-being:
**autonomy** (volition), **competence** (effectance/mastery), **relatedness** (connection).
Contexts that **support autonomy + competence** enhance intrinsic motivation; **controlling**
contexts (contingent rewards, surveillance, pressure) **undermine** it.

**The KEY RISK — overjustification / crowding-out.**
- Lepper, Greene & Nisbett (1973): promising children an **expected reward** for an
  already-loved activity (drawing) **halved** their later free-choice time doing it.
- Deci, Koestner & Ryan (1999), *A meta-analytic review…* (*Psychological Bulletin* 125(6),
  627–668): **128 experiments**. **Expected, tangible, contingent rewards undermine intrinsic
  motivation** — engagement-contingent **d = −0.40**, completion-contingent **d = −0.36**,
  performance-contingent **d = −0.28**. **Unexpected** and **task-noncontingent** rewards did
  *not* undermine. **Verbal rewards / positive competence feedback ENHANCED** intrinsic
  motivation. Undermining was **strongest for children and for interesting tasks** — exactly
  the profile of a gamified *learning* app.
- **Translation:** **points, streaks, and badges are expected, contingent, tangible-
  equivalent rewards** — the precise structure most likely to **crowd out** intrinsic
  interest in learning.

**What gamification actually buys.** Sailer & Homner (2020), *The Gamification of Learning: A
Meta-Analysis* (*Educational Psychology Review* 32, 77–112): **cognitive g = 0.49**,
motivational g = 0.36, behavioral g = 0.25 — but the **motivational/behavioral effects are
statistically *unstable*** under rigorous-study subsets. So *don't overclaim* "gamification
boosts motivation." Hamari, Koivisto & Sarsa (2014): effects are **highly context-dependent**
with **novelty effects that fade**. Ryan, Rigby & Przybylski (2006): games motivate when they
**satisfy SDT needs** (autonomy + competence), not when they merely dispense points.

**Duolingo — where it helps, where it's shallow.** Peer-reviewed work (Jiang et al. 2021,
*Foreign Language Annals*; the CALICO English study) and Duolingo's own efficacy reports
support **receptive** gains (reading/listening comparable to several university semesters).
But independent systematic reviews (Shortt et al. 2021, *CALL*) find the literature skewed
toward **engagement/attitudes**, obscuring whether *deep* learning happens, and critics note
it is **translation-heavy, over-reliant on extrinsic rewards, and weak on production/
conversation**. The honest framing: **gamification optimizes the metric it rewards (daily
engagement), which is not the same as the learning goal.**

> **Bucket mapping — gamify the *needs*, not the *metric*.**
> - **Autonomy:** the daily session is **5–20 min, learner's choice** (`PRODUCT.md` §3);
>   let learners pick the next branch/atom and **self-set goals**. Avoid dark-pattern
>   notifications and forced paths.
> - **Competence:** make XP/progress **informational, not controlling** — show *what you can
>   now do* and *what it unlocked downstream on the graph* (genuine mastery signal), and lean
>   on **positive competence feedback** (which *enhances* intrinsic motivation) over salient
>   contingent prizes.
> - **Relatedness:** co-op leagues, shared streaks, reading-group cohorts (`PRODUCT.md` §5)
>   satisfy relatedness *without* making the prize the point.
> - **Guard the streak.** Because expected contingent rewards crowd out intrinsic interest,
>   **soften streak pressure**: streak-freeze/repair, no manipulative loss-aversion pushes,
>   and **never let "keep the streak" substitute for "learn"** (the explicit Duolingo
>   anti-pattern in `PRODUCT.md` §1). Tie rewards to **mastery events** (a desirable,
>   competence-signaling milestone), not raw daily app-opens.
> - **Don't overclaim.** Internal metrics and any external copy should treat gamification's
>   motivational lift as real-but-fragile (Sailer & Homner), and rest the product's learning
>   claim on §1–§2, not on streaks.

---

## 4. METACOGNITION — calibration, the illusion of knowing, and honest progress

**Learners misjudge what they know.**
- Kruger & Dunning (1999), *Unskilled and unaware of it* (*JPSP* 77(6), 1121–1134):
  bottom-quartile performers overestimated their rank by ~**50 percentile points**; lacking
  the skill also means lacking the metacognition to see the lack. (*Rigor note:* part of the
  raw pattern is regression/better-than-average artifact — Krueger & Mueller 2002 — but the
  overconfidence is robust.)
- Bjork, Dunlosky & Kornell (2013), *Self-Regulated Learning: Beliefs, Techniques, and
  Illusions* (*Annual Review of Psychology* 64, 417–444): **subjective fluency** (the ease of
  rereading/processing) is a **misleading cue** — it raises judgments of learning even when
  later recall doesn't follow. This is **why rereading and massing feel effective but
  aren't**, and why learners prefer the inferior methods (§0, §1.4).
- Koriat (1997); Koriat & Bjork (2005): judgments of learning are **cue-based** and
  fluency cues create **illusions of competence** (e.g. "foresight bias" when the answer is
  present at study). These illusions are **remedied by *test* experience** and by **delaying**
  the judgment.

**Testing + spacing fix overconfidence.** Retrieval gives a **diagnostic** signal of what is
*actually* retrievable; restudy inflates confidence without diagnosticity. A **failed
retrieval attempt directly reduces overconfidence** — honest feedback restudy never delivers
(ScienceDirect, 2014; PMC6509741 on retrieval-improved JOLs). Spacing prevents the false
fluency of cramming, so both *learning* and *self-assessment accuracy* improve.

> **Bucket mapping — surface honest progress, never fake encouragement.**
> - **Calibrate, then show it.** Ask the learner to **predict** before each retrieval
>   ("how confident are you?"), then show predicted-vs-actual. Persistent gaps train
>   calibration and break the illusion of knowing.
> - **Let people fail (with feedback).** Failed retrievals are the mechanism that corrects
>   overconfidence — design the loop so a miss is framed as diagnostic signal, not a
>   shame-event.
> - **No fake "you're doing great."** Progress must be **diagnostic and true**: a mastery
>   heatmap that shows real weak atoms, a forgetting-curve view, an **honest exam-readiness
>   estimate** derived from FSRS retrievability across the nucleus (`PRODUCT.md` §4). Empty
>   praise is both a metacognition failure *and* (per §3) a controlling reward; competence-
>   *informational* feedback is the SDT-aligned alternative.
> - **Name the interleaving/spacing illusion in the UI** (§1.4): tell the learner a
>   mixed/spaced set will feel harder and dip their in-session score *on purpose*.

---

## 5. The unifying insight across §3 and §4

Shallow gamification (§3) and the illusion of knowing (§4) are the **same failure mode from
two angles**: both optimize a *felt signal* — streak satisfaction / processing fluency —
that is **decoupled from the real goal** (durable, transferable competence). SDT prescribes
**need-supportive, informational** feedback; metacognition research prescribes **retrieval-
based, spaced** assessment that delivers **honest** competence signals. They converge on one
design rule: **replace controlling/fluency-based signals with diagnostic, competence-
supporting feedback.** That single rule is Bucket Academy's pedagogical spine.

---

## 6. AI-TUTOR SAFETY — the floor engineering must implement

In a teaching product, **a confidently-wrong explanation is the worst output** — it installs
a durable misconception in exactly the way good teaching installs durable knowledge.
Biophysics makes this acute: it is full of common-but-wrong intuitions, and **niche/sparse
subfields are where LLMs fabricate most** (JMIR 2025 below). The safety design attacks one
chain: *RLHF makes models sound confident while breaking calibration → grounding, citation
enforcement, abstention, and evaluation re-introduce truth and humility.*

**The mechanism we are defending against.** OpenAI GPT-4 System Card (2023, arXiv:2303.08774):
the base model is well-calibrated, but **"the post-training process [RLHF] hurts calibration
significantly"** — GPT-4 "can be confidently wrong … not taking care to double-check." Tian
et al. (2023) and Kadavath et al. (2022) confirm on open models. **⇒ Never trust raw model
token-confidence as a safety signal; verify externally.**

**Hallucination taxonomy (adopt as product vocabulary).** Ji et al. (2023, *ACM Computing
Surveys*; arXiv:2202.03629) and Huang et al. (2023/2025, arXiv:2311.05232):
- **Intrinsic** (contradicts the source) vs **extrinsic** (unverifiable from the source).
- **Faithfulness** (consistency with the *provided context*) vs **factuality** (consistency
  with *ground truth*). These are distinct: a tutor can be faithful to a bad passage yet
  non-factual. **We must measure both** — RAG raises faithfulness; a human-verified canon
  raises factuality.

**Grounding (RAG) — necessary, not sufficient.** Lewis et al. (2020, NeurIPS; arXiv:
2005.11401): grounding to a retrieved corpus produces more factual, less hallucinated output.
But it can fail: Liu et al. (2023, *TACL*, "Lost in the Middle") — relevant evidence buried
mid-context is under-used; Shi et al. (2023, ICML) — **a single irrelevant passage** degrades
accuracy (mitigated by self-consistency + an explicit "ignore irrelevant context"
instruction). **⇒ Rerank, keep context tight, threshold on relevance, and abstain on weak
retrieval rather than guessing.**

**Citations — the fabrication risk is severe and worst exactly where we operate.** LLMs
free-generate plausible-but-fake references: across studies, **18–77% of citations
fabricated** depending on model/domain, ~45% of "real-looking" ones carry bibliographic
errors; JMIR Mental Health (2025, mental.jmir.org/2025/1/e80371) — GPT-4o fabricated **19.9%**
overall, rising to **28–29% for sparse/niche topics** vs 6% for well-covered ones. **⇒
Citations must be retrieved canon IDs from a closed set, validated against the canon index at
render time — never model-generated.** Pair with a RARR-style attribute-then-revise pass
(Gao et al. 2023, ACL): every claim must map to a retrieved span or be revised/flagged.

**Uncertainty & abstention — teach it to say "I don't know."** Kadavath et al. (2022,
arXiv:2207.05221): models can self-evaluate (P(True), P(IK)), and **P(IK) rises when relevant
sources are in context**. Tian et al. (2023, arXiv:2305.14975): for RLHF models, **verbalized
confidence is better-calibrated** than the (RLHF-degraded) token probabilities. **⇒ Elicit
verbalized confidence, condition it on whether canon was retrieved, and gate
abstention/escalation on it.** In teaching, **abstention is the safe failure mode** — "I'm
not certain; here's what the canon does say" prevents misconception installation.

**Evaluation harness (block deploys on regression).**
- **FActScore** (Min et al. 2023, EMNLP; arXiv:2305.14251): decompose each explanation into
  **atomic claims**, score % supported by canon — catches the one wrong sentence in a correct
  paragraph.
- **TruthfulQA-style** (Lin et al. 2022, ACL; arXiv:2109.07958): an adversarial set built
  from **known biophysics misconceptions** — the tutor must not reproduce common-but-wrong
  intuitions.
- Track **citation-validity rate** and **context-faithfulness**. **LLM-as-judge is screening
  only**, calibrated against a human gold set.

**Education-specific & multi-turn.** SafeTutors (Hazra et al. 2026, arXiv:2603.17373):
pedagogical harm is widespread and **compounds over a session — 17.7% (single-turn) → 77.8%
(multi-turn)** — across three harm types: **misconception reinforcement**, **over-disclosure**
(giving answers, bypassing productive struggle), **scaffolding collapse**. RLHF **sycophancy**
makes models reluctant to contradict a learner's wrong premise — the opposite of teaching.
**⇒ Per-turn safety re-checks (not just per-message), explicit anti-sycophancy/error-
correction behavior, and human/expert verification for canon-defining content.**

---

## EVIDENCE-BACKED FEATURE REQUIREMENTS (for Product / Engineering / Data)

1. **FSRS scheduler with exam-aware gaps.** Use FSRS (not SM-2). For Exam-Simulator, set
   retention target + review gaps from **time-to-exam** per the Cepeda (2008) ridgeline
   (~20–40% of interval for short horizons, ~5–10% for long). *(Spacing — Cepeda 2006/2008.)*
2. **Retrieval-first loop; the R/A/D/T ladder = retrieval at increasing depth.** Every study
   surface is a **test with feedback**, never rereading. R=recall/cloze, A=apply
   (interleaved), D=derive-from-prereqs, T=teach-back (protégé effect/self-explanation).
   *(Roediger & Karpicke 2006; Karpicke & Roediger 2008; Adesope 2017 g≈0.51–0.93.)*
3. **Feedback is mandatory and process-level.** No retrieval surface ships without immediate,
   reasoning-level feedback (the *why*), never bare praise. *(Adesope 2017; Hattie & Timperley
   2007.)*
4. **Graph-driven interleaving + difficulty kept *desirable*.** Mix confusable sibling atoms
   (shared graph neighborhood); never present an atom before its `requires` are mastered;
   auto-difficulty rides FSRS retrievability to keep retrieval effortful-but-successful.
   *(Rohrer 2007/2010/2015; Bjork & Bjork 2011.)*
5. **The `art_prompt` contract (load-bearing art only).** Enforce the 8-point checklist in
   §1.6: depict the *idea*, image+word, spatial contiguity, signaling, distinctive-not-busy,
   pre-train; **ban decorative art** (it's d≈−0.3 to −0.5 for novices). Collectible cards
   inherit these rules. *(Mayer multimedia d≈1.35 vs Harp & Mayer 1998 / Sundararajan &
   Adesope 2020.)*
6. **Mastery-gated, worked-examples-that-fade.** Unlock downstream atoms only on mastery;
   show full derivations to novices and **fade** them as mastery rises (expertise reversal).
   *(Kulik et al. 1990; Kalyuga/Sweller.)*
7. **Socratic, answer-withholding tutor with step-level feedback.** Hints not answers; guard
   the "crutch" failure mode; target the realistic ~0.5–0.8σ ITS band, not folklore 2σ.
   *(Kestin 2024/25; Bastani 2024/25; VanLehn 2011.)*
8. **Gamify the SDT needs, not the metric.** Informational (not controlling) progress;
   autonomy (choice, self-set goals, no dark patterns); relatedness (cohorts/leagues);
   **soften streaks** (freeze/repair, no loss-aversion pushes) and tie rewards to mastery
   events, not app-opens. *(Ryan & Deci 2000; Deci/Koestner/Ryan 1999 d≈−0.3 to −0.4;
   Sailer & Homner 2020.)*
9. **Honest progress & calibration.** Pre-retrieval confidence prompts + predicted-vs-actual;
   real mastery heatmap, forgetting curves, FSRS-derived exam-readiness; **no fake
   encouragement**; name the spacing/interleaving illusion in-UI. *(Kruger & Dunning 1999;
   Bjork/Dunlosky/Kornell 2013; retrieval-calibration evidence.)*

## AI-TUTOR SAFETY REQUIREMENTS (for Engineering — non-negotiable)

S1. **RAG grounding to a human-verified canon is mandatory.** The tutor answers from
    retrieved canon passages, never parametric memory alone. Canon must be expert-verified
    (RAG gives faithfulness; factuality comes from corpus quality). *(Lewis 2020; Ji 2023.)*
S2. **Retrieval precision: rerank, tight context, edge-placement, relevance threshold.**
    Weak/empty retrieval triggers **abstention**, not a guess; explicit "ignore irrelevant
    context" instruction. *(Liu 2023; Shi 2023.)*
S3. **Closed-set, validated citations — zero free-generation.** Cite only retrieved canon
    IDs; validate every rendered citation against the canon index; drop/flag unresolvable
    ones; RARR-style attribute-then-revise on every claim. *(18–77% fabrication; JMIR 2025
    — worst in sparse domains = biophysics subfields; Gao 2023.)*
S4. **Uncertainty signaling + abstention.** Elicit **verbalized** confidence, condition it on
    whether canon was retrieved, gate abstention/escalation on it; abstention is the safe
    failure mode. *(Kadavath 2022; Tian 2023; GPT-4 card.)*
S5. **Atomic-claim eval harness in CI; block on regression.** FActScore-style %-supported-by-
    canon + a **biophysics-misconception TruthfulQA set** + citation-validity + context-
    faithfulness. LLM-judge = screening only, calibrated to a human gold set. *(Min 2023;
    Lin 2022.)*
S6. **Human-in-the-loop for canon + per-turn multi-turn safety + anti-sycophancy.** Expert
    review for canon-defining/derivation content; re-check safety **every turn** (harm
    compounds 17.7%→77.8%); make the tutor **correct** a wrong premise, never build on it.
    *(SafeTutors 2026.)*
S7. **Never trust the model's own fluency/confidence.** RLHF broke calibration — verification
    is external, layered, and enforced **in code**, not in the system prompt. *(GPT-4 card;
    Huang 2025.)*

## CROSS-PILLAR DEPENDENCIES

- **→ Engineering:** owns S1–S7 (RAG pipeline, reranker, citation validator, abstention
  gate, FActScore/TruthfulQA eval harness in CI, per-turn safety re-checks) and the FSRS
  engine, mastery-gating, worked-example fading. People supplies the eval *spec* and the
  biophysics-misconception item set; Engineering implements and wires the CI block.
- **→ Data:** the **human-verified canon corpus + canon index** that S1/S3 ground against
  (the retrieval substrate must be clean and expert-checked — RAG can only be faithful to what
  it retrieves); the **dependency-graph centrality** that defines the nucleus + the
  confusable-sibling sets that drive principled interleaving (req. 4); FSRS parameter
  optimization and the mastery/forgetting model behind honest progress (req. 9). People needs
  Data to mark which atoms are "canon-defining" (require expert sign-off).
- **→ Product:** must implement informational-not-controlling progress, autonomy-preserving
  flows, softened streaks, the calibration/confidence UI, the "this will feel harder on
  purpose" framing, and the load-bearing-art contract in the design system (reqs. 5, 8, 9).
- **→ Operations:** AI-inference + **art-generation cost model** is the big variable cost, and
  the load-bearing-art rule (req. 5) also *reduces* waste (fewer regenerations of decorative
  images); PDF-import legal boundary and Viatika metering gate the Pro tier.
- **→ Revenue:** any efficacy claim in marketing must cite the **replicated** numbers
  (ITS/guardrailed-LLM ~0.5–0.8σ, mastery ~0.5σ), **not** Bloom's unreplicated 2σ — overclaim
  is both a credibility and a (potential) compliance risk.
- **→ Customer Success:** onboarding must teach the "desirable difficulty" mindset so the
  honest-progress UI and harder-feeling drills don't read as the product being broken.

---

### Verification flags (page-check before any external publication)
1. Roediger & Karpicke 2006 proportions (5-min ≈.81/.75; 1-week ≈.56/.42) — Exp. 2.
2. Taylor & Rohrer 2010 prism test (≈77% vs 38%).
3. Rohrer, Dedrick & Stershic 2015 (≈80% vs 38%; some sources 72%).
All effect sizes from Adesope 2017, Cepeda 2006/2008, Dunlosky 2013, Mayer's CTML medians,
Rey 2012, Deci/Koestner/Ryan 1999, Sailer & Homner 2020, VanLehn 2011, Kulik et al. 1990,
Kestin 2024/25, Bastani 2024/25, and the AI-safety arXiv/ACL/PMC sources are confirmed from
abstracts/author pages/preprints and citable as-is.
