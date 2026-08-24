# Bucket Academy, The Learning-Product Landscape

**Pillar:** Product · **Epic:** bkt-jh0 · **Author:** Product (Nucleus) · 2026-06-14
**Mandate:** Map the ENTIRE field of learning products, dissect the best with real case
Studies, and find the white space Bucket should own.
**Builds on:** `_synthesis/DECISIONS.md`, `_synthesis/UX-SPEC.md`, `product/UX-CASE-STUDIES.md`,
`PRODUCT.md`. The *competitive* counterpart to the UX bible: that one dissected
how to *build* the product (Apple/Duolingo/Whop); this one maps *who else is in the market*, what
they nail, where they fail, and the gap only Bucket can occupy.

> Method note: original analysis only. Competitors are summarized and analyzed in our own words;
> no copyrighted copy, screenshots, or long excerpts are reproduced. Every load-bearing claim
> carries an inline source URL. Numbers are as of mid-2026 unless dated.

---

## 0. The thesis of this document in one paragraph

The learning-product market is **six disconnected categories**, each of which solves one piece of
the learning problem and structurally cannot solve the others. Spaced-repetition tools (Anki,
SuperMemo) own *retention* but have catastrophic authoring friction, no content, no structure, and
ugly lonely UX. Mastery/knowledge-graph systems (Math Academy, ALEKS) own *adaptive sequencing* and
have *proven the core thesis*, explicit prerequisites + mastery + retrieval produces 4× faster,
Durable learning, but are math-only, hand-authored, joyless, and have no AI generation. Concept/
visual products (Brilliant, 3Blue1Brown) own *intuition and beauty* but have no retention engine
and no graph. Language apps (Duolingo et al.) own *habit, gamification, and adaptive scheduling at
scale* but plateau shallow and gamify the metric. AI tutors (Khanmigo, Synthesis) own *conversational
tutoring* but are confident-and-wrong without grounding and have no memory model. PKM tools (Obsidian,
Roam) own *the graph idea* but ship untyped link-hairballs that fail as navigation. **No product
combines a knowledge-graph of foundations + adaptive spaced review + AI-generated thorough lessons +
any-topic generation + a verifiable mastery profile + primary-source canon grounding.** That
six-way combination is empty white space, and it is exactly Bucket's spec.

---

# PART I: THE COMPETITOR MATRIX

Columns: Product · Category · Core mechanic · Pedagogy · UX strength · Fatal flaw · Monetization (one line).

## Spaced repetition / flashcards

| Product | Core mechanic | Pedagogy | UX strength | Fatal flaw | Monetization |
|---|---|---|---|---|---|
| **Anki** | FSRS (default since v23.12), per-card stability/difficulty/retrievability, 17 trained weights, 90% target retention ([faqs.ankiweb.net](https://faqs.ankiweb.net/what-spaced-repetition-algorithm)) | Pure active recall + spacing + cloze; the highest-evidence techniques | Open formats, huge shared-deck ecosystem, add-ons, free core | Brutal authoring friction; UI frozen ~2010; **no structure, no "why," no AI, lonely** | Free desktop/Android; $24.99 one-time iOS |
| **SuperMemo** | SM-2→SM-18; **Incremental Reading** (import text → extract → cards, all in one queue) ([supermemo.guru](https://supermemo.guru/wiki/Algorithm_SM-18)) | Deepest learning-science investment in the category; Wozniak's published forgetting research | Incremental reading is the only real text→cards solution; claims 95-98% lifetime retention | **Windows-only**; UI looks like '95 shareware; months-long learning curve; tiny community | ~$79 one-time |
| **RemNote** | Notes + flashcards + links in one editor; bullet→card shortcut; SM-2/FSRS ([thetoolsverse.com](https://thetoolsverse.com/tools/remnote)) | Active recall *with* source context; AI grades free-text answers | Note-taking + study in one tool; elegant bullet→card; Mastery Tracker | iOS app unreliable; steep dual-model curve; **graph is flat links rather than a prereq DAG**; AI denies its own errors | Free; Pro $6/mo; Lifelong $300 |
| **Mochi** | Markdown flashcards, cloze in prose; FSRS since mid-2025 ([study-genius-ai](https://study-genius-ai.hatolabs.com/blog/mochi-vs-anki-2026)) | Standard recall + spacing; prose authoring nudges elaboration | Cleanest UI in category; cross-device; Markdown-native | No image occlusion; no add-ons; tiny deck library; **no AI, no graph**, a prettier Anki | Free (3 decks); Pro $5/mo or $40/yr |
| **Brainscape** | Confidence-Based Repetition, self-rate 1-5, interval scales on that ([brainscape.com](https://www.brainscape.com/academy/confidence-based-repetition-definition/)) | Spacing (Cepeda) + metacognitive self-rating | Course hierarchy maps to school; publisher-verified decks; polished mobile | Self-rating needs accurate metacognition learners lack (Dunning, Kruger); no free-text; **no graph; CBR unvalidated** | Free; Pro ~$8/mo annual; Lifetime ~$200 |
| **Quizlet** | "Study set" of term/def pairs; weak adaptive "Learn" mode; AI set-gen ([learnclash.com](https://learnclash.com/blog/does-quizlet-have-spaced-repetition)) | Shallow by SR standards; real strength is *content discovery* at scale | Largest study library on earth (300M+ learners); instant onboarding; AI set-gen from notes | SR algorithm weak; killed Q-Chat after 30 mo (AI strategy confusion); inconsistent UGC quality; **no retention model, no structure** | Free (capped); Plus $35.99/yr; $139M ARR ([getlatka](https://getlatka.com/companies/quizlet)) |

## Mastery-based + knowledge-graph

| Product | Core mechanic | Pedagogy | UX strength | Fatal flaw | Monetization |
|---|---|---|---|---|---|
| **Math Academy** | Hand-built DAG (~2,500 topics, ~5 prereqs each); **FIRe**, credit propagates *down* the encompassing graph, penalties *up*; adaptive diagnostic finds the frontier ([mathacademy.com](https://www.mathacademy.com/how-our-ai-works), [justinmath.com](https://www.justinmath.com/individualized-spaced-repetition-in-hierarchical-knowledge-structures/)) | Deliberate practice at edge of ability; interleaving; 7:1 practice:example; retrieval-first | Frictionless placement; proven results; XP economy (1 XP ≈ 1 min) | **Math only**; 100% hand-authored (250+ hrs for weights alone); no AI tutor; austere ugly UX; grind-y; no social/share | $49/mo, no free tier |
| **Khan Academy** | Course Mastery (4 levels, 100 pts/skill); Mastery Challenges (periodic, on a fixed cadence); the original Knowledge Map was **deprecated** ([support.khanacademy.org](https://support.khanacademy.org/hc/en-us/articles/5548760867853)) | Video-first then exercises; low-anxiety; mastery by repeated-correct | Vast free library; zero barrier; trusted; MAP Accelerator showed +26-38% growth ([overdeck.org](https://overdeck.org/portfolios/spotlight/khan-academy-use-of-map-accelerator-associated-with-better-than-projected-gains-in-map-growth-scores)) | Graph removed from UX; no real SR; video-passive → low retention; only ~9% hit 30min/wk threshold | Free consumer; Districts licenses; Khanmigo $44/yr family |
| **Mathigon** (Amplify) | Interactive textbook; invisible internal model predicts prereq struggle; Polypad manipulatives ([mathigon.org](https://mathigon.org/about)) | Constructivism (Papert); read→interact→can't-advance-til-engaged; narrative lessons | **Best visual design + interactivity in the space**; dual-coding; Polypad excellent | No SR, no mastery gates, no adaptive path selection; needs a facilitator; spotty coverage; math only | Free (Amplify loss-leader) |
| **ALEKS** | **Knowledge Space Theory in production**, millions of feasible "knowledge states," the **outer fringe** = ready-to-learn items, 20-25Q Markovian assessment, the "pie" UI ([aleks.com](https://www.aleks.com/about_aleks/knowledge_space_theory)) | Minimal scaffolding, *tells you what's next but barely teaches how* | The pie metaphor works; fast assessment; broader than math (chem, accounting) | **Teaches nothing**; actively hated UX; standalone effect ≈ 0.05σ (0.43σ only as a supplement) ([eric.ed.gov](https://eric.ed.gov/?id=EJ1314175)); learner picks from fringe → unmotivated stall; no SR | B2B, $20+/mo/student, textbook-bundled |

## Concept / visual learning

| Product | Core mechanic | Pedagogy | UX strength | Fatal flaw | Monetization |
|---|---|---|---|---|---|
| **Brilliant** | Interactive problem-first lessons; onboarding quiz picks a tier; Koji AI nudge in-lesson ([e-student.org](https://e-student.org/brilliant-org-review/)) | Constructivism + testing effect via immediate active recall | Polished animated diagrams; 2-min problems; 67-course STEM breadth | **No learner knowledge graph** (gap in logs → wall in calculus, no rerouting); depth sacrificed for interactivity; shallow SR; STEM-only; pricey | Free tier + Premium $13.49/mo annual; $14.3M ARR ([getlatka](https://getlatka.com/companies/Brilliant)) |
| **3Blue1Brown** | YouTube animated explainers (Manim); "Essence of…" series; Summer of Math Exposition ([3blue1brown.com](https://www.3blue1brown.com/blog/some1/)) | **Dual coding**, synchronized narration + animation; aha-moment schema formation | Unmatched visual fidelity; builds intuition; free; ~6M+ subs | **Purely passive**, no retrieval, no progression, no personalization, no retention layer; one-creator catalog | YouTube ads + Patreon; free to user |
| **Mathigon Polypad** | Infinite canvas of 50+ virtual manipulatives ([polypad.amplify.com](https://polypad.amplify.com/)) | Enactive learning / Bruner CPA, manipulate before symbolize | Free, no account, any device, customizable | No curriculum, progression, or assessment; inert without a facilitator | Free (Amplify) |

## Language

| Product | Core mechanic | Pedagogy | UX strength | Fatal flaw | Monetization |
|---|---|---|---|---|---|
| **Duolingo** | **Birdbrain** half-life regression per learner-word (1.25B exercises/day); Max adds Roleplay + Video Call w/ Lily + Explain My Answer; GPT-4 cut course build 80% ([tomdaccord.com](https://www.tomdaccord.com/blog/ai-and-duolingo), [chiefaiofficer.com](https://chiefaiofficer.com/duolingos-ai-strategy-fuels-51-user-growth-and-1b-revenue/)) | Per-item per-learner forgetting model (advance); roleplay = production under pressure | Best streak/notification machine; most sophisticated learner model in consumer ed; AI roleplay | Gamification eats comprehension; no long-form output; no grammar grounding; plateaus shallow | Free / Super $84/yr / Max $168/yr; **135M MAU, ~$1B rev 2025** |
| **Babbel** | Grammar-first, dialogue-anchored, human-authored lessons; tail SRS ([icanlearn.com](https://www.icanlearn.com/babbel/)) | Communicative language teaching; grammar in context | Most structured/coherent curriculum; professionally produced | Killed consumer Babbel Live (human tutors) July 2025; passive-heavy; no Birdbrain-class adaptivity | ~$8/mo annual; 16M+ subs ([skillademia](https://skillademia.com/statistics/babbel-statistics/)) |
| **Busuu** | **Community correction**, native speakers fix your output, you fix theirs; + AI Conversations ([univext.com](https://univext.com/en/blog/340/busuu-review-2026)) | Social-corrective feedback (authentic pragmatics AI can't fully give) | Differentiated community correction at scale; clean UX; McGraw-Hill certs | Correction quality/turnaround varies by language density; no deep adaptive engine; sparse grammar | Premium ~$10-14/mo; 120M registered users |
| **Memrise** | Pivoted from SRS+"mems" to Scenarios + native-speaker video + **MemBot** (GPT-3.5) ([languavibe.com](https://languavibe.com/memrise-review/)) | learn→recognize→converse; native video = dual-coding for phonology | Native-speaker clips best in class; low-anxiety AI speaking | MemBot weak (GPT-3.5); **dropped grammar**; killed beloved "mems" community in 2024 (backlash) | $89.99/yr; Lifetime $249.98 |
| **LingQ** | **Comprehensible input**, read/listen authentic content, tap→save "LingQ," track **known-words** count ([lingq.com](https://www.lingq.com/en/learn-languages-like-steve-kaufmann/)) | Krashen input hypothesis; implicit acquisition from meaningful exposure | Any content you care about; progress metric (known words); rare languages | Free tier near-useless (20 LingQs); clunky dated UX; no gamification; weak speaking; overwhelms beginners | Premium $8.99/mo+ |
| **Pimsleur** | Audio-only; **Graduated Interval Recall** (5s→25s→2m→…→2yr) with spoken production at each interval ([liquisearch.com](https://www.liquisearch.com/spaced_repetition/pimsleurs_graduated-interval_recall)) | The earliest commercial spaced *retrieval*, oral production over recognition | Hands-free (car/walk); forces speaking; organic review | slow (~5-8 words/30-min lesson); no visuals; pricey for pace; no community/AI | $19.95/mo (one lang) / $21/mo all |

## AI tutors

| Product | Core mechanic | Pedagogy + safety | UX strength | Fatal flaw | Monetization |
|---|---|---|---|---|---|
| **Khanmigo** | GPT-4 tutor **grounded against Khan's own exercises/solutions**; Socratic (won't give answers); logs reviewable ([blog.khanacademy.org](https://blog.khanacademy.org/khanmigo-math-computation-and-tutoring-updates/)) | Socratic restraint = structurally resists being a cheat tool; grounding cuts (not kills) hallucination | Socratic guard; teacher tooling; accessible price; grounded in vetted content | **Early arithmetic errors** (accepted 430 for 27²−17²=440; disputed a correct calc) ([iblnews](https://iblnews.org/khanmigo-struggles-with-basic-math-showed-a-report/)); **no learner memory/SR model** | $15/student/yr districts; $44/yr family; free for teachers. 40K→700K students in 1 yr ([aiforcause](https://aiforcause.org/stories/khanmigo-ai-tutor)) |
| **Synthesis Tutor** | Voice-first adaptive math tutor, ages 5-11; game-embedded, real-time difficulty ([synthesis.com](https://www.synthesis.com/tutor)) | Engagement + intuition over rote; strong neurodiverse design; scaffolding via game form (low cheat risk) | Voice removes reading bottleneck; gamified in feel; reluctant-learner engagement | Hard age ceiling 11 (exits when math gets hard); no secondary math; "superhuman" claim not RCT-validated; no graph | $99/yr; ~25K families, ~$10M rev pace ([x.com/synthesischool](https://x.com/synthesischool/status/1940574362807292225)) |
| **LLM-tutor wave** (Sizzle, Querium/StepWise, Riiid, Speak, Photomath, MagicSchool, Brisk) | 3 sub-types: homework-answer engines, teacher-productivity tools, guardrailed tutors. **Speak** (voice language, $1B val, $100M rev 2025) is the standout ([marketdash](https://www.marketdash.com/stock-market-news/53441/ai-language-tutor-speak-hits-100m-revenue-with-voice-first-approach-taking-aim-at-duolingo)) | Varies; most have **no learner model, no SR, no dependency graph** | Speak: voice fluency practice is a defensible LLM use; Querium ~16% test lift | Confident-and-wrong default (RLHF breaks calibration); 80% of student AI-math use is cheating ([jetlearn](https://www.jetlearn.com/blog/80-kids-cheat-math-with-ai--parents-cant-spot-it)); answer-engine ≠ tutor | Mixed; many free/cheap |

## PKM / knowledge graphs

| Product | Core mechanic | Graph model | UX strength | Fatal flaw | Monetization |
|---|---|---|---|---|---|
| **Obsidian** | Local Markdown + `[[wikilinks]]`; 2,000+ plugins; force-directed global graph ([productive.io](https://productive.io/blog/notion-vs-obsidian/)) | **Untyped, undirected** link edges | Local files = zero lock-in; plugin platform; *local* graph useful in context | **Global graph = "the hairball"**, breaks past ~200 notes, beautiful, navigationally useless ([codeculture.store](https://codeculture.store/blogs/developer-culture/obsidian-graph-view-useful)) | Free; Sync $4/mo; Publish $8/mo |
| **Roam** | Bidirectional links + **block references**; daily-notes model ([atlasworkspace.ai](https://www.atlasworkspace.ai/blog/roam-research-alternative)) | Untyped bidirectional | Block-level transclusion; "networked thought"; #roamcult | No free tier ($15/mo) killed it vs free rivals; slow dev; cloud-only lock-in; contracting base | $15/mo |
| **Logseq** | Open-source outliner + graph; 2025 SQLite pivot ([productivitystack.io](https://productivitystack.io/tools/logseq/)) | Untyped bidirectional (outliner adds *implicit* hierarchy) | Free/OSS; local files; block refs; outliner crowd | Rougher UX; breaking DB migration; community-funded slow pace; same graph limits | Free/OSS |
| **Notion** | Block workspace + relational databases; AI at Business tier ([dev.to](https://dev.to/froxell_/notion-vs-obsidian-which-pkm-tool-actually-wins-in-2026-1991)) | **Not a graph**, hierarchical tree + relational DB | Best collaborative editing; powerful DB views; all-in-one | No graph view/navigation; AI moved to $20/user/mo Business tier (2025); tree unwieldy at scale | Free / Plus $10 / Business $20 per user/mo |

---

# PART II, CASE STUDIES

The six most relevant competitors, dissected for what Bucket should steal, what to avoid, and the
specific numbers that should anchor our own targets.

## Case Study 1: Math Academy

The closest analog, and the ceiling we must clear.

Math Academy is the single most important competitor to study because it has **already shipped and
validated the core of Bucket's thesis**: a hand-built directed-acyclic prerequisite graph
(~2,500 topics, ~5 prereqs each, ~10-12k edges), adaptive frontier-finding, and retrieval-first
Practice produce ** faster, more durable learning
([mathacademy.com](https://www.mathacademy.com/how-our-ai-works),
[justinmath.com](https://www.justinmath.com/how-math-academy-creates-its-knowledge-graph/)).

**The replicable mechanic, FIRe (Fractional Implicit Repetition).** Standard SR treats every item
As independent, so learning hundreds of topics creates an unmanageable review backlog. Math Academy
solves this with a *second* graph layered on the prerequisite graph: the **encompassing graph**,
Which encodes "practicing topic B *implicitly* practices prerequisite A to a fractional degree
(0.0-1.0)." When you solve a problem in B, review credit **propagates down** the encompassing graph
To everything B encompasses; failures **propagate up**. Skycak's image: *credit travels down like
lightning bolts, penalties travel up like growing trees*
([frankhecker.com](https://frankhecker.com/2025/02/14/math-academy-part-7/)). In an ideal hierarchy
you never explicitly review A again after mastering B, advanced work keeps resetting A's memory
clock. This collapses O(n) independent review sessions into something far smaller.

**Why this matters for Bucket, and the open question it raises.** Our `_synthesis/DECISIONS.md`
Specs FSRS-6 with one deck per (atom, mastery-signal). FIRe is the *missing optimization on top*: our
`requires`/`unlocks` graph is exactly the prerequisite layer, and we could add an encompassing-weight
layer so that mastering a frontier atom discounts review load on its nucleus prerequisites. **This is
A concrete, high-return borrow that is not yet in our decisions**, flagged below as Move #3.

**The numbers to anchor on.** 8th-graders in Math Academy's Pasadena program routinely pass **AP
Calculus BC** (a 12th-grade exam), most with a **5/5**
([Washington Post](https://www.washingtonpost.com/local/education/calculus-for-eighth-graders-its-the-differential-in-one-school-system/2017/09/15/9877d960-9a2d-11e7-b569-3360011663b4_story.html));
The platform claims **4× speed** vs classroom (180 classroom hrs → 20-40)
([mathacademy.com](https://mathacademy.com/)); **1 XP ≈ 1 minute**, a university course ≈ 3,000 XP.
Note: **no peer-reviewed RCT** exists, consistent with our `DECISIONS.md` decision to cite
only the replicated 0.5-0.8σ band and never make unvalidated claims in our own copy.

**What to avoid (Bucket's wedge against Math Academy).** It is **math-only and 100% hand-authored**
(250+ hours just to estimate encompassing weights for 1,500 topics,
[justinmath.com](https://www.justinmath.com/how-math-academy-creates-its-knowledge-graph/)). It has
**no AI tutor**, stuck means more static problems instead of a Socratic dialogue. The **UX is austere**
(text + static images, no delight, [news.ycombinator.com](https://news.ycombinator.com/item?id=41154618)).
Critics call it **procedural over conceptual**, fluency and test-passing, not *why it's true*
([newsletter.ozwrites.com](https://newsletter.ozwrites.com/p/a-balanced-review-of-math-academy)).
**No social, no share, no creator economy.** Every one of these is a Bucket strength: AI-generated
Thorough lessons across *any* branch, a grounded Socratic tutor, Apple-grade UX, functional art,
Shareable cards, and the Story Protocol contributor rail.

## Case Study 2: ALEKS

Knowledge Space Theory in production.

ALEKS is the *only* shipped product implementing **Knowledge Space Theory**, the same Doignon,
Falmagne framework our `DECISIONS.md` (Decision 10) already adopts for route ordering. Studying ALEKS
is studying our own algorithm in the wild. A domain is a set of items; the **knowledge space** is all
*feasible* states (Algebra 1 ≈ 350 concepts → millions of feasible states); the **outer fringe** of a
State = items you're ready to learn *right now*; a 20-25-question **Markovian assessment** locates
your state; the **"pie" UI** shows mastered vs remaining by topic
([aleks.com](https://www.aleks.com/about_aleks/knowledge_space_theory),
[jmatayoshi.github.io](https://jmatayoshi.github.io/publications/JMP2021_KST_ALEKS_preprint.pdf)).

**The replicable mechanics:** (1) the **outer-fringe = study frontier** concept is exactly our
"frontier shell"; (2) the **fast adaptive assessment** (20-25 Q to place across 350 concepts) is the
model for our onboarding placement quiz (UX-SPEC onboarding step 4); (3) **periodic progress
assessments to confirm *retained* not just *inferred* mastery**, a discipline we should copy so
"mastered" always means "retained" (matches our BKT⊗FSRS fusion, Decision 11).

**The fatal flaw to weaponize:** ALEKS **barely teaches**. It tells you what's next then asks you to
Figure it out with minimal instruction, students describe being *tested rather than taught*, and the
standalone effect size is **≈0.05σ**, rising to **0.43σ only as a supplement to human teaching**
([eric.ed.gov](https://eric.ed.gov/?id=EJ1314175),
[thehomeschoolmom.com](https://www.thehomeschoolmom.com/homeschool-curriculum-reviews/aleks/)). The
UX is *actively hated*. **This is the exact gap Bucket fills: KST routing (ALEKS's strength) +
thorough AI-generated 3-depth lessons + grounded Socratic tutor (ALEKS's void) + beautiful UX.** A
second flaw, letting the *unmotivated learner pick* from the outer fringe causes stalls, validates
our Convergence-2 decision to make the **computed route the zero-decision default** and the graph a
deliberate second view.

## Case Study 3: Duolingo

The engagement engine + the adaptive model we under-specced.

We already dissected Duolingo's path/streak/onboarding in `UX-CASE-STUDIES.md`. The **new** material
that changes our spec is the *adaptive and AI* layer.

**Birdbrain** (built with Carnegie Mellon) runs a **half-life regression** model per learner-word
Pair across **1.25 billion exercises/day**, predicting the moment recall probability hits ~50% and
scheduling the item to reappear just before
([tomdaccord.com](https://www.tomdaccord.com/blog/ai-and-duolingo),
[buildmvpfast.com](https://www.buildmvpfast.com/blog/ai-learning-personalization-duolingo-ai-driven-lessons-2026)).
This is conceptually FSRS at consumer scale and *validates our scheduler choice*, the most
successful learning app on earth runs a per-learner forgetting model as its core. **Duolingo Max**
Adds **Roleplay** (production under situational pressure), **Video Call with Lily** (a stateful AI
conversation partner), and **Explain My Answer** (GPT-4 error diagnosis, moved to *free* Jan 2026)
([beginnersinai.org](https://beginnersinai.org/duolingo-max-explained/)). And GPT-4 **cut course
build time ~80%** (Swedish 6 mo → 3 wk), the proof that **AI content generation is now a viable
Moat rather than a gimmick** ([chiefaiofficer.com](https://chiefaiofficer.com/duolingos-ai-strategy-fuels-51-user-growth-and-1b-revenue/)).

**The numbers that set our ambition:** **135M MAU**, **~$1.0B revenue in 2025** (first billion-dollar
Year), **83% from subscriptions**, **51% YoY DAU growth**, but **Max is only ~7% of paid subs**,
Showing the AI-tutor upsell is still nascent and contestable.

**Replicable for Bucket:** (1) the **Explain My Answer** pattern maps directly to our non-punishing
Feedback moment, when a learner is wrong, the grounded tutor diagnoses *which misconception* (our
UX-SPEC §6.3 already specs this; Duolingo proves the demand); (2) **Roleplay = our Socratic "predict
what happens to this system" drill** for derive/teach mastery; (3) AI content-gen at 80% time savings
Is the economic basis of our "generate a lesson for any topic" wedge. **What to avoid (already in our
guardrails):** Duolingo *gamifies the metric* and *plateaus shallow*, our derive/teach ceiling +
mastery-weighted XP (Decision 20) is the explicit counter.

## Case Study 4: Anki + FSRS

The retention engine, and the friction we delete.

Anki is the proof that **spaced retrieval works** and the proof that **authoring friction kills
adoption**. FSRS (default since v23.12) models stability/difficulty/retrievability with 17 trained
weights against the learner's own history, trained on **~700M community reviews**, and **cuts reviews
20-30% vs SM-2 at the same 90% retention**
([faqs.ankiweb.net](https://faqs.ankiweb.net/what-spaced-repetition-algorithm),
[studycardsai.com](https://studycardsai.com/blog/anki-fsrs-algorithm),
[migaku.com](https://migaku.com/blog/language-fun/spaced-repetition-in-2026-how-it-actually-works)).
This *is* our scheduler (Decision 3), we are on the correct, current, validated algorithm.

**The replicable target:** **90% retention default** (95% roughly doubles daily review count, the
Exact trade our exam-sprint mode toggles). The **open-format / shared-deck ecosystem** is what made
Anki durable; our Library + community decks + Anki export (Pro) inherit this.

**The fatal flaws we delete, this is the whole point of Bucket:** (1) **Authoring friction**, Anki
Makes *you* write every card by hand in a 2010-era editor; **AI generation from canon erases this**.
(2) **No structure**, a card pile with tags, no prereq graph, no "why this matters"; **our nucleus
graph + "Unlocks →" line is the fix**. (3) **Ugly + lonely**; our Apple-grade UX + leagues/cohorts
fix both. (4) **No content**, Anki ships an *engine* without knowledge; Bucket ships **canon-grounded
atoms**. Anki defines the retention floor; everything above it is our product.

## Case Study 5: Brilliant

Intuition and beauty without a retention engine or a graph.

Brilliant is the most relevant *concept-learning* competitor: interactive, problem-first lessons that
Build intuition, polished animated diagrams, **67 STEM courses**, **10M+ users**, **$14.3M
ARR bootstrapped** ([e-student.org](https://e-student.org/brilliant-org-review/),
[getlatka](https://getlatka.com/companies/Brilliant)). It proves a market of serious self-learners
will pay a premium ($13.49/mo annual) for *learn-by-doing* depth.

**Replicable:** the **active-construction lesson** (encounter a broken model → fix it → scaffolded
Hints) is a strong template for our "Apply/Derive" drills, more engaging than flashcard reveal.
**Fatal flaws that are Bucket's opening:** (1) **No learner knowledge graph**, a gap in logarithms
Walls you in calculus with **no rerouting** ([skillscouter.com](https://skillscouter.com/brilliant-review-math-science-coding/));
(2) **shallow/no spaced repetition**, intervals are baked into course order instead of a per-learner
forgetting curve, so **intuition built in week 1 is gone by week 6**; (3) **STEM-only, no humanities/
foundations**; (4) depth sacrificed for interactivity. Bucket = Brilliant's intuition + **a real
forgetting-curve retention engine** + **a prereq graph that reroutes** + **any-branch coverage**.
3Blue1Brown is the same lesson in extreme form: **the most beautiful intuition-building on earth, and
Zero retrieval, progression, or personalization**, passive video produces the *fluency illusion*
Without consolidation ([frontiersin.org](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1632206/full)).
Our functional-art + dual-coding anchor (Convergence 1) borrows 3b1b's visual power *and* couples it
To retrieval, the thing 3b1b structurally lacks.

## Case Study 6: Khanmigo

The AI tutor done as well as anyone has, and still not enough.

Khanmigo is the reference AI tutor: GPT-4, **grounded against Khan's own vetted exercises/solutions**,
**Socratic** (won't hand over answers), with reviewable logs, and it scaled **40K → 700K students in
One year**, heading past 1M ([aiforcause.org](https://aiforcause.org/stories/khanmigo-ai-tutor),
[blog.khanacademy.org](https://blog.khanacademy.org/khanmigo-math-computation-and-tutoring-updates/)).
The Socratic guardrail is the right move: it *structurally* resists being a homework-cheat engine,
which is what makes 80% of LLM "tutors" pedagogically worthless
([jetlearn.com](https://www.jetlearn.com/blog/80-kids-cheat-math-with-ai--parents-cant-spot-it)).

**And it still demonstrates why our S1, S7 safety gate (Convergence 3) is non-negotiable.** Khanmigo
**accepted 430 for 27²−17² (correct: 440), accepted a wrong square root, and disputed a reporter's
*correct* arithmetic** ([iblnews.org](https://iblnews.org/khanmigo-struggles-with-basic-math-showed-a-report/)).
Even the best-grounded tutor on the market shipped confident-and-wrong arithmetic, the *default*
Failure mode our People pillar named (RLHF breaks calibration). Khan's fix was to **separate symbolic
computation from language generation**, a pattern we should adopt (route math to sympy/a CAS, never
let the LLM free-generate a derivation). **The second gap is decisive for us:** Khanmigo has **no
learner memory model and no spaced repetition**, each session starts fresh; it cannot predict you'll
forget a concept in 4 days and schedule a review. The 2025 **LECTOR** result shows combining LLM
semantic analysis *with* concept-level SR beats either alone, **yet no major commercial
tutor ships it** ([arxiv.org/pdf/2508.03275](https://www.arxiv.org/pdf/2508.03275)). **Bucket's tutor
sits inside the FSRS scheduler and the knowledge graph, that union is the unoccupied position.** On
Claims: the effect band is **0.33-0.96σ, well under Bloom's 2σ**, exactly what `DECISIONS.md`
Decision 15 already commits us to ([educationnext.org](https://www.educationnext.org/two-sigma-tutoring-separating-science-fiction-from-science-fact/)).

---

# PART III: THE WHITE SPACE

## The structural map of the gap

Lay the six categories on the four capabilities that produce learning, and the white space
Is visible at a glance. **✅ = strong, ◐ = partial/shallow, ❌ = absent.**

| Capability → | Retention engine (per-learner forgetting curve) | Knowledge-graph structure (typed/directed prereqs, "why") | Thorough generated lessons (any topic, 3-depth, grounded) | Verifiable mastery + canon grounding + share/contribute |
|---|---|---|---|---|
| **SRS (Anki/SM/Quizlet)** | ✅ | ❌ | ❌ | ❌ |
| **Mastery-graph (Math Academy/ALEKS)** | ✅ (FIRe/progress-assess) | ✅ | ❌ (hand-authored, math-only) | ❌ |
| **Concept/visual (Brilliant/3b1b)** | ❌ | ❌ | ◐ (beautiful but fixed, STEM-only) | ❌ |
| **Language (Duolingo/…)** | ✅ (Birdbrain) | ❌ | ◐ (AI-gen, but shallow drills) | ❌ |
| **AI tutors (Khanmigo/Synthesis)** | ❌ | ❌ | ◐ (grounded but no memory/SR) | ❌ |
| **PKM (Obsidian/Roam)** | ❌ | ◐ (untyped hairball, fails as nav) | ❌ | ❌ |
| **▶ BUCKET ACADEMY** | ✅ FSRS-6 (+FIRe) | ✅ KST + typed/directed + centrality + curated shells | ✅ AI-gen, 3-depth, **any branch**, canon-grounded | ✅ BKT⊗FSRS profile + Story Protocol contributor rail |

**No existing product has more than two columns. Bucket targets all four.** Every competitor that has
The graph (Math Academy, ALEKS) lacks generated lessons and any-topic breadth and a good tutor and
beauty. Every competitor that has generated content or a great tutor (Duolingo, Khanmigo) lacks the
graph and the canon grounding. Every competitor that has the retention engine (Anki) lacks
*everything else*. The PKM tools have only a *broken* version of the graph.

## The seven specific things only Bucket combines

1. **A typed, directed, *curated* prerequisite graph that is also the navigation**, fixing the
 Obsidian hairball (untyped/undirected edges carry no info at scale,
 [codeculture.store](https://codeculture.store/blogs/developer-culture/obsidian-graph-view-useful))
 by doing what ALEKS/Math Academy proved works (real prereq DAG) but exposing it as a beautiful
 *map* (Mathigon's missing strength) with our concentric-shell layout + centrality sizing.
2. **Adaptive spaced review fused with that graph**, FSRS-6 (Anki/Duolingo-validated) *plus* FIRe-
 style credit propagation down the prereq graph (Math Academy's optimization), which no SRS tool
 and no AI tutor has together.
3. **Thorough AI-generated lessons for *any* topic**, the thing Math Academy (hand-authored) and
 Brilliant (fixed catalog) and ALEKS (barely teaches) structurally cannot do, now economically
 proven by Duolingo's 80% content-build reduction.
4. **A grounded Socratic tutor that lives inside the scheduler and graph**, Khanmigo's grounding +
 Socratic restraint, *plus* the learner-memory/SR model Khanmigo lacks (the LECTOR gap), *plus*
 symbolic computation separated from generation (Khan's own fix) under our S1, S7 safety gate.
5. **A verifiable mastery profile**, BKT⊗FSRS so "mastered" means "retained" (ALEKS-style progress
 assessment, but as a *shareable knowledge portfolio* across branches, the polymath flex no
 competitor has).
6. **Primary-source canon grounding**, every atom traces to an axiom / law / primary derivation with
 a citation. No learning product grounds in *foundations*; this is uniquely Bucket Foundation's
 asset (the canon corpus + the contributor index).
7. **A contributor/creator rail**, learn → author an atom → mint to Story Protocol → earn citation
 fees. Mastery becomes a *citable artifact*; experts can build and earn. No mastery-graph or tutor
 product has any social/creator economy at all.

## The positioning line

Per `DECISIONS.md` Decision 15: position as **"AI tutor + spaced repetition grounded in a
knowledge-graph of foundations"**, *not* test-prep. The wedge is the serious autodidact who today
cobbles together **Anki + Brilliant + 3b1b + Obsidian + a chatbot** and *still* feels their knowledge
Doesn't accumulate into a structure. Bucket is the one product where it does.

---

# PART IV: THE 12 HIGHEST-RETURN PRODUCT MOVES

Ranked by return = (differentiation against the field) × (impact on learning outcome) ÷ (build cost),
And sequenced against our P0→P3 plan. Each cites the competitor evidence that motivates it.

1. **Ship the computed route as the zero-decision default; the graph is a deliberate map.**
 *(Convergence 2, already decided, restated #1 because the competition re-confirms it hardest.)*
 ALEKS lets the unmotivated learner pick from the outer fringe → stalls; Duolingo's single biggest
 win was *killing* the skill tree for a linear path; Obsidian's global graph fails as navigation.
 The evidence is now overwhelming: **route by default, map on demand.** Owner: Product + Data +
 Engineering (route API returns ordered route). *P0/P1.*

2. **Make AI-generated thorough lessons for ANY topic the headline wedge.** This is the one column no
 graph competitor (Math Academy, ALEKS) can occupy, they are hand-authored and math-only, and
 Duolingo just proved AI content-gen cuts build time ~80% and is a real moat. "Type any topic →
 get a grounded, 3-depth, functional-art lesson on the nucleus of that field" is the demo that
 beats every incumbent in one screen. Owner: Data (extraction-to-spec) + Engineering (gen pipeline)
 + People (load-bearing-art + safety contract). *P1, but prototype in P0.*

3. **Add FIRe-style fractional implicit repetition on top of FSRS-6.** *(NEW, not yet in
 DECISIONS.md.)* Math Academy's encompassing-graph credit propagation (credit flows down prereqs,
 penalties up) is the proven fix for review-backlog explosion as the atom count grows. We already
 have the `requires`/`unlocks` graph; add an encompassing-weight layer so mastering a frontier atom
 discounts review load on its nucleus prerequisites. High return, moderate cost, directly
 improves the core loop's scalability. Owner: Data + Engineering. *P1→P2.*
 ([justinmath.com](https://www.justinmath.com/individualized-spaced-repetition-in-hierarchical-knowledge-structures/))

4. **Build the tutor INSIDE the scheduler + graph, with S1, S7 safety and symbolic computation split
 out.** The LECTOR gap (LLM + SR beats either alone, yet no major tutor ships it) plus Khanmigo's
 confident-wrong arithmetic = our unoccupied position. The tutor must (a) ground via RAG on canon,
 (b) abstain on weak retrieval, (c) route math/derivations to sympy/a CAS, never free-generate
 them (Khan's own fix), (d) feed misconceptions back to FSRS to reschedule. Owner: Engineering +
 Data (canon index) + People (eval suite). *P1 (basic) → P2 (full).*

5. **Make the "Unlocks →" impact line + post-mastery reveal animation a signature mechanic.** No
 SRS or tutor tells you *why a concept is load-bearing* or *what it opens*. This is our cheapest
 pure-differentiation win, it directly attacks Anki's "no why," Brilliant's "no rerouting," and
 makes the graph's value felt in the daily loop. Owner: Product + Data (centrality/`unlocks` edges).
 *P1.*

6. **Onboarding teaches a real atom + animates the reveal BEFORE signup; KST placement quiz starts
 experts mid-graph.** Duolingo's commitment ladder + ALEKS's 20-25Q fast assessment. Boredom is the
 #1 churn risk for expert-adjacent users (our target); a placement quiz over the nucleus graph that
 skips known prereqs is the fix. Owner: Product + Customer Success + Data. *P1.*

7. **Functional art anchor per atom (dual-coding), generated once at build, cached.** Borrow 3b1b/
 Brilliant's intuition-through-visual power, but couple it to retrieval (which they lack) and obey
 People's load-bearing-art contract (decorative art *hurts* novices). Per-atom build-time render =
 ~$6-200 total then free forever (Convergence 1). The shareable card is the growth loop Duolingo
 never fully exploited. Owner: Data (art_prompt) + Engineering (render/cache) + People (contract).
 *P1.*

8. **Verifiable, shareable Knowledge Portfolio (mastery across branches) as the headline metric, not
 the streak.** ALEKS's progress-assessment discipline (confirm *retained* rather than inferred) rendered
 as a *polymath flex* profile. Counters Duolingo's streak-eats-learning failure (our Decision 20)
 and gives the viral/social layer every mastery-graph competitor lacks. Owner: Product + Data
 (BKT⊗FSRS). *P2→P3.*

9. **Adopt the "Explain My Answer" non-punishing feedback moment, grounded.** Duolingo moved this to
 free in 2026 because demand is universal; our version names the *misconception* via the grounded
 tutor and reschedules sooner (amber, never red). Highest-impact emotional-design decision (UX-SPEC
 §6.3). Owner: Product + Engineering + People. *P1.*

10. **Production-under-pressure drills (Roleplay/Pimsleur-style) for Derive/Teach mastery.** Duolingo
 Roleplay and Pimsleur's *spoken production at graduated intervals* both show recognition ≠
 production. Our Derive/Teach signals should prompt "predict what this system does / explain it in
 your own words," not multiple-choice, the real ceiling Brilliant and Anki lack. Owner: Product +
 Engineering (AI grading) + Data (rubrics). *P2.*

11. **Comprehensible-input "learn from the actual papers" mode with a known-concepts counter.** LingQ's
 insight (acquisition from meaningful authentic content) + its *known-words* metric, applied
 to the canon: read a primary source, tap unfamiliar concepts → they become reviewable atoms; track
 a *known-concepts* count per branch. This operationalizes Bucket's "learn from the real corpus"
 advantage no app has. Owner: Product + Data (canon linking) + Engineering. *P2→P3.*

12. **Scholar/Studio creator rail (Whop model, Apple restraint), learn → author → mint → earn.** The
 social/creator economy *every* mastery-graph and tutor competitor completely lacks. Atoms/decks as
 access-gated products, transparent net citation-fee economics, fast marketplace approval, minimal
 dashboard. Closes Bucket's flywheel: learners become the canon's authors. Owner: Product +
 Engineering (Story Protocol mint + entitlement) + Operations (marketplace fee policy). *P3.*

---

## Sources

**SRS / flashcards:** [Anki FSRS FAQ](https://faqs.ankiweb.net/what-spaced-repetition-algorithm) ·
[Anki FSRS explained](https://studycardsai.com/blog/anki-fsrs-algorithm) ·
[SR in 2026 (Migaku)](https://migaku.com/blog/language-fun/spaced-repetition-in-2026-how-it-actually-works) ·
[SM-18](https://supermemo.guru/wiki/Algorithm_SM-18) ·
[Incremental Reading](https://en.wikipedia.org/wiki/Incremental_reading) ·
[RemNote review](https://thetoolsverse.com/tools/remnote) ·
[Mochi vs Anki](https://study-genius-ai.hatolabs.com/blog/mochi-vs-anki-2026) ·
[Brainscape CBR](https://www.brainscape.com/academy/confidence-based-repetition-definition/) ·
[Quizlet SR](https://learnclash.com/blog/does-quizlet-have-spaced-repetition) ·
[Quizlet ARR](https://getlatka.com/companies/quizlet)

**Mastery / knowledge-graph:** [Math Academy, How Our AI Works](https://www.mathacademy.com/how-our-ai-works) ·
[FIRe (Skycak)](https://www.justinmath.com/individualized-spaced-repetition-in-hierarchical-knowledge-structures/) ·
[MA knowledge graph](https://www.justinmath.com/how-math-academy-creates-its-knowledge-graph/) ·
[Frank Hecker MA series](https://frankhecker.com/2025/02/14/math-academy-part-7/) ·
[MA balanced review](https://newsletter.ozwrites.com/p/a-balanced-review-of-math-academy) ·
[8th-grade Calc BC (WaPo)](https://www.washingtonpost.com/local/education/calculus-for-eighth-graders-its-the-differential-in-one-school-system/2017/09/15/9877d960-9a2d-11e7-b569-3360011663b4_story.html) ·
[ALEKS KST](https://www.aleks.com/about_aleks/knowledge_space_theory) ·
[KST & ALEKS (Matayoshi)](https://jmatayoshi.github.io/publications/JMP2021_KST_ALEKS_preprint.pdf) ·
[ALEKS meta-analysis](https://eric.ed.gov/?id=EJ1314175) ·
[Khan efficacy](https://blog.khanacademy.org/khan-academy-efficacy-results-november-2024/) ·
[Khan Knowledge Map](https://khanacademy.fandom.com/wiki/Knowledge_Map) ·
[MAP Accelerator](https://overdeck.org/portfolios/spotlight/khan-academy-use-of-map-accelerator-associated-with-better-than-projected-gains-in-map-growth-scores) ·
[Mathigon about](https://mathigon.org/about)

**Concept / visual:** [Brilliant review](https://e-student.org/brilliant-org-review/) ·
[Brilliant weaknesses](https://skillscouter.com/brilliant-review-math-science-coding/) ·
[Brilliant ARR](https://getlatka.com/companies/Brilliant) ·
[3b1b SoME](https://www.3blue1brown.com/blog/some1/) ·
[retrieval vs passive (Frontiers 2025)](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1632206/full) ·
[Polypad](https://polypad.amplify.com/)

**Language:** [Duolingo AI strategy/revenue](https://chiefaiofficer.com/duolingos-ai-strategy-fuels-51-user-growth-and-1b-revenue/) ·
[Birdbrain](https://www.tomdaccord.com/blog/ai-and-duolingo) ·
[Duolingo Max](https://beginnersinai.org/duolingo-max-explained/) ·
[Babbel](https://www.icanlearn.com/babbel/) · [Babbel stats](https://skillademia.com/statistics/babbel-statistics/) ·
[Busuu](https://univext.com/en/blog/340/busuu-review-2026) ·
[Memrise](https://languavibe.com/memrise-review/) ·
[LingQ method](https://www.lingq.com/en/learn-languages-like-steve-kaufmann/) ·
[Pimsleur GIR](https://www.liquisearch.com/spaced_repetition/pimsleurs_graduated-interval_recall)

**AI tutors:** [Khanmigo updates](https://blog.khanacademy.org/khanmigo-math-computation-and-tutoring-updates/) ·
[Khanmigo growth](https://aiforcause.org/stories/khanmigo-ai-tutor) ·
[Khanmigo math errors](https://iblnews.org/khanmigo-struggles-with-basic-math-showed-a-report/) ·
[Synthesis Tutor](https://www.synthesis.com/tutor) ·
[Speak $100M](https://www.marketdash.com/stock-market-news/53441/ai-language-tutor-speak-hits-100m-revenue-with-voice-first-approach-taking-aim-at-duolingo) ·
[80% cheat with AI](https://www.jetlearn.com/blog/80-kids-cheat-math-with-ai--parents-cant-spot-it) ·
[2-sigma debunk (EdNext)](https://www.educationnext.org/two-sigma-tutoring-separating-science-fiction-from-science-fact/) ·
[LECTOR (LLM+SR)](https://www.arxiv.org/pdf/2508.03275)

**PKM / graphs:** [Obsidian hairball](https://codeculture.store/blogs/developer-culture/obsidian-graph-view-useful) ·
[Roam alternatives](https://www.atlasworkspace.ai/blog/roam-research-alternative) ·
[Logseq 2026](https://productivitystack.io/tools/logseq/) ·
[Notion vs Obsidian](https://dev.to/froxell_/notion-vs-obsidian-which-pkm-tool-actually-wins-in-2026-1991) ·
[KB vs KG for LLM](https://www.kloia.com/blog/knowledge-base-vs-knowledge-graph-llm)
