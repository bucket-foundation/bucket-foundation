# Bucket Learning Framework

Bead `bkt-0rsk.2`, under epic `bkt-0rsk`. Draft v1, 2026-10-11. A proposal: nothing here is built, and the founder decides the items under Open Questions. The corpus it cites is `learning/corpus/` from PR #720.

| Mark | Meaning |
|---|---|
| `[w:<id>]` | A work in `learning/corpus/works.jsonl` |
| `[m:<name>]` | A method in `methods.jsonl` |
| `[c:<id>]` | An internal claim in `claims.jsonl`, with its status |
| `[mech:<id>]` | A mechanism the app runs today, in `mechanisms.jsonl` |
| `[empirical: source, date, command]` | A measured number under `docs/agents/MATH-CONTRACT.md`. The command `show` stands for `python3 tools/learning-corpus/check_refs.py --show <id>`, which prints the record the number was read from |
| `[bm:Name]` | A definition or proved theorem in BucketMath |
| No confirmed work | The corpus holds no checked source for the statement |

A number computed here from other numbers carries an empirical tag whose source begins with `derived` and whose command is the arithmetic. A proposed parameter value or definition is a choice and carries no tag. `python3 tools/learning-corpus/check_refs.py` fails when a cited id is absent from the corpus.

## Aim

### Education

The corpus holds 44 definitions across five terms, and the traditions disagree by design [empirical: learning/corpus/definitions.jsonl, 2026-10-11, wc -l].

| Tradition | Definition on record | What it would have Bucket measure |
|---|---|---|
| Pragmatism | "that reconstruction or reorganization of experience which adds to the meaning of experience, and which increases ability to direct the course of subsequent experience" [w:dewey-1916-democracy-and-education] | Whether later work changes |
| Analytic philosophy | Initiation into worthwhile activities, with knowledge, understanding and voluntary participation as criteria [w:peters-1966-ethics-and-education] | Understanding, and that the person chose it |
| Continental theory | Three functions: qualification, socialisation, subjectification [w:biesta-2009-good-education-age-of-measurement] | Skill, entry into a practice, and the person as subject of their own life |
| Capability approach | What each person is able to do and to be [w:nussbaum-2011-creating-capabilities] [w:sen-1999-development-as-freedom] | Real options a person gains |
| Signalling | Schooling can raise wages by certifying ability that existed before [w:spence-1973-job-market-signaling] [w:caplan-2018-case-against-education] | Nothing about learning; a warning about credentials |
| Human rights law | "the full development of the human personality" [w:un-1948-udhr-article-26] | No instrument |
| Bucket internal | An operating system from the first school year to the research frontier, where a learner's own production enters the map [c:epistemics-impact:bucket-definition-of-education] | Production, unbacked as a claim |

Bucket adopts Dewey's sentence as its working definition. Education is a change in a person that shows up as greater ability to direct what they do next. The choice rests on four reasons.

1. It names an observable. The app sees a person's later work through beads, pull requests and notes, so "ability to direct subsequent experience" can be checked against records.
2. It guards against the main measurement error in study apps. Performance during practice is an unreliable index of learning, and learners misread fluent practice as learning [w:soderstrom-2015-learning-versus-performance]. A definition anchored in later use cannot be satisfied by a session score.
3. It fits the learner the product has. The September roadmap sets the first user as one researcher on one machine (`market-analysis.md`), whose learning happens inside work.
4. It keeps the credential modest. One instrumental-variable estimate puts 30% of the private return to schooling on signalling and 70% on productivity [empirical: w:aryal-2022-signaling-employer-learning-instruments, 2026-10-11, show], and the split may be unidentifiable [w:huntington-klein-2021-human-capital-signaling-unresolvable]. A Bucket record has to show retained skill to be worth more than a badge.

This is a value choice. No neutral definition of an educated person exists in the corpus [c:epistemics-impact:no-single-definition-of-educated].

### Biesta's Three Functions

| Function | What Bucket does | What Bucket measures | Limit |
|---|---|---|---|
| Qualification | Every mechanism under Mechanisms and Learning from Work | Levels, retention, transfer, calibration | Near transfer only |
| Socialisation | Each atom names its source; lessons point to primary papers; questions ask how a claim is known | No instrument today | Entry into a research practice also needs people, covered under Apprenticeship |
| Subjectification | The person picks the target, may decline any prompt, and owns the log | Nothing, by decision | An app cannot produce it and can obstruct it |

<!-- voice-ignore-next 1: verbatim quotation from the abstract -->
Subjectification "has to do with the existence of the child or student as subject of her or his own life, not as object of educational interventions" [w:biesta-2020-risking-ourselves-in-education]. Bucket's duty here is restraint: no mechanism steers behaviour for engagement. External regulation shows no link to performance or persistence and a link to lower well-being [w:howard-2021-sdt-student-motivation-meta]. The app states on the report screen that it measures qualification alone.

### Learned

Bucket counts a thing as learned when the person can produce it unaided, after a delay, on an item they have not memorised. Each condition answers a known failure.

| Condition | Failure it answers | Ground |
|---|---|---|
| Unaided | A score earned with a model's answer on screen can vanish when the model leaves | [c:epistemics-impact:dependence-flag], [w:bastani-et-al-2025-generative-ai-can-harm-learning] |
| After a delay | In-session performance overstates learning | [w:soderstrom-2015-learning-versus-performance] |
| Produced | Recognition gives less than recall | [w:rowland-2014-testing-effect-meta] |
| On varied items | One correct answer with a reason can be luck | [w:gettier-1963-justified-true-belief], [w:machery-2017-gettier-across-cultures] |
| Across sessions | A belief counts by the reliability of the process behind it | [w:goldman-1979-reliabilism-justified-belief] |

### Understanding and Recall

Recall and understanding take separate evidence. Intelligent performance is a kind of knowledge that does not reduce to holding propositions [w:ryle-1945-knowing-how-knowing-that]. Understanding is a grasp of how a body of information fits together [w:kvanvig-2003-value-of-knowledge-understanding]; a scientist understands a phenomenon when they can build a qualitative explanation without the full calculation [w:de-regt-2017-understanding-scientific-understanding]; and a person understands a pattern a model found when they can internalize it and apply it independently [w:krenn-et-al-2022-scientific-understanding-with-ai]. Perkins adds flexible performance, from a work the corpus could not confirm [w:perkins-1993-teaching-for-understanding].

The corpus holds no internal definition of understanding (`gaps.md`, Definitions Missing). This framework supplies one: a person understands an atom when they hold it at the Retained level, give an explanation that contains the atom's key points, and answer one or more sealed transfer items on it. People overrate how well they can explain a thing until they try [w:rozenblit-2002-illusion-of-explanatory-depth], so a self-report of understanding counts for nothing.

### Evidence of Knowing

| Evidence | Counts as | Reason |
|---|---|---|
| A lesson opened or read | Nothing | Reading records activity [c:core:reading-is-not-mastery] |
| A self-rating | Input to scheduling | Self-ratings are biased [m:metacognitive monitoring and calibration]; self-report never earns credit [c:core:practice-credential-firewall] |
| A correct pick among options | Recognised | Chance is one in three with three options [mech:three-choice-quiz] |
| A correct answer with a hint, the tutor or a model's answer shown | Recognised | Assisted performance is the thing the dependence flag separates from learning [c:epistemics-impact:dependence-flag] |
| A correct produced answer, graded by rule or by a key-point checklist | Recalled | Retrieval is the event with the evidence [m:retrieval practice] |
| Correct produced answers in two sessions seven or more days apart | Retained | Reliability across occasions [w:goldman-1979-reliabilism-justified-belief] |
| A key-point explanation plus a correct sealed transfer item | Understood | Understanding and Recall |
| A debrief record tying the atom to the person's own output | Used | Dewey's criterion |

### Tiers of Known

Four levels form a ladder for memory, and two marks sit beside it. Use and understanding are marks because knowing how and knowing that need separate evidence [w:ryle-1945-knowing-how-knowing-that].

| Level | Name | Requires |
|---|---|---|
| 0 | Unknown | No graded event. Unknown supplies no positive evidence [c:core:mastery-attainment-unknown] |
| 1 | Recognised | One correct answer of any kind |
| 2 | Recalled | One correct unaided produced answer |
| 3 | Retained | Two correct unaided produced answers in sessions seven or more days apart |

| Mark | Requires |
|---|---|
| Understood | Level 3, an explanation meeting the key points, one or more correct sealed transfer items |
| Used | Level 2 or above and one or more debrief records from the person's own work |

Each atom carries an attained level, which never falls, and a current level, which falls when a review or probe fails or the atom runs overdue. The split follows the internal distinction between current mastery and historical attainment [c:core:mastery-attainment-unknown].

These tiers grade the person. The founder's truth tiers grade the claim: "A claim's standing depends on how it is known" [c:epistemics-impact:claim-standing-by-how-known]. The app shows both, so a learner can hold a disputed atom at Retained and see that its footing is disputed. Most knowledge arrives by testimony [w:coady-1992-testimony-philosophical-study], a layperson can have good reason to believe a claim because an expert has good reason [w:hardwig-1985-epistemic-dependence], and track record weighs most when a novice chooses between experts [w:goldman-2001-experts-which-ones]. Every atom therefore carries its source, and the learning-to-learn deck teaches source checking [c:epistemics-impact:lateral-reading].

Teaching about knowledge has measured effects: epistemic-cognition interventions d = 0.509 on achievement across 28 samples [empirical: w:cartiff-2021-epistemic-cognition-interventions-meta, 2026-10-11, show], and instruction in critical thinking g+ = 0.30 across 341 effect sizes [empirical: w:abrami-2015-teaching-critical-thinking-meta, 2026-10-11, show]. The International Baccalaureate guide to theory of knowledge could not be confirmed [w:ibo-2020-theory-of-knowledge-guide]; one analysis finds the course stresses some strands of critical thinking and leaves others undeveloped [w:hughes-2014-tok-critical-thinking-analysis].

## Evidence Rules

### Admission

A mechanism earns a place through a confirmed work or through a Bucket measurement. A confirmed work has a DOI or page checked against its record and is not withdrawn (`learning/corpus/README.md`).

| Grade | Evidence | Treatment |
|---|---|---|
| A | One or more confirmed meta-analyses or preregistered trials with a delayed or transfer outcome, and no open contest on direction | On by default |
| B | Confirmed works that are contested, single trials, or a method with no pooled effect | On, labelled in the report, paired with a Bucket experiment |
| C | No confirmed work | Off by default. It runs as an experiment arm with a stop date, or stays as a declared design choice that makes no learning claim |
| D | Contradicted by confirmed evidence | Removed from defaults and from every user-facing sentence |

A Bucket measurement under Measurement admits a mechanism for the learner it was measured on. A statement about learners at large needs the multi-user study.

### Discounts

Published effects overstate what a product delivers.

| Finding | Tag |
|---|---|
| Published, small and experimenter-measured studies report effects about twice as large | [empirical: w:cheung-2016-methodological-features-effect-sizes, 2026-10-11, show] |
| Large education trials average 0.06 SD with a mean interval width of 0.30 SD | [empirical: w:lortie-forgues-2019-large-rcts-uninformative, 2026-10-11, show] |
| 36% of trial effect sizes fall below 0.05 SD | [empirical: w:kraft-2023-effect-size-benchmark-fail, 2026-10-11, show] |
| Fade-out is widespread and coexists with persistence | [w:bailey-2020-persistence-and-fade-out], [w:hart-2024-fadeout-persistence-meta] |
| Averaging effect sizes across unlike comparisons ranks study designs more than interventions | [w:simpson-2017-misdirection-standardised-effect-sizes], [w:bergeron-2017-hattie-pseudoscience-critique] |

Two rules follow. Bucket plans on half of any pooled laboratory effect. No product sentence states an effect size without its comparison, its population and its delay.

### Contested Evidence

Where confirmed works disagree, the framework cites both, plans on the lower figure, and builds the disputed element as a switch with an experiment behind it.

| Contest | Sides | Ruling |
|---|---|---|
| Tutoring | 2.0 SD [w:bloom-1984-two-sigma-problem] against 0.288 SD pooled [w:nickow-2024-promise-of-tutoring-meta] and 0.16 to 0.22 SD at scale [w:kraft-2026-tutoring-at-scale-meta] | Plan on 0.16 to 0.22 SD |
| Mastery learning | ES 0.52 [w:kulik-kulik-bangert-drowns-1990-mastery-learning-meta-analysis] against no effect on standardized measures [w:slavin-1987-mastery-learning-reconsidered] | Gate new atoms at Recalled, a light gate |
| Feedback | d near 0.79 [w:hattie-2007-power-feedback] against d = 0.48 [w:wisniewski-2020-power-of-feedback-revisited] | Plan on 0.48; the type of feedback decides the sign |
| Problems first | g = 0.36 [w:sinha-2021-productive-failure-meta] against examples first [w:kirschner-sweller-clark-2006-minimal-guidance-does-not-work] | Examples first for a new atom, with one pretest question ahead of them |
| Unskilled and unaware | [w:kruger-1999-unskilled-unaware] against an artefact reading [w:gignac-2020-dunning-kruger-artefact] | No label on the person; calibration is plotted from their own answers |
| Deliberate practice | 18% of variance in sport and 1% among elites [w:macnamara-2016-deliberate-practice-sports] against 29% under a narrower definition [w:ericsson-2019-deliberate-practice-reanalysis] | No claim that practice volume explains expertise |
| Learning styles | No required interaction [w:pashler-2008-learning-styles-evidence] against g = 0.31 with a crossover in 26% of measures [w:clinton-lisell-2024-learning-styles-matching-meta] | Not adopted; the second paper also advises against adoption |
| Inquiry | Minimal guidance fails [w:kirschner-sweller-clark-2006-minimal-guidance-does-not-work] against guided inquiry d = 0.50 [w:lazonder-harmsen-2016-inquiry-based-learning-meta-analysis] | Guidance is the moderator; Bucket guides |

### The 112 Unbacked Claims

The unbacked claims split by kind: 34 findings, 20 principles, 19 methods, 14 models, 12 definitions, 12 measures and 1 mechanism [empirical: learning/corpus/claims.jsonl, 2026-10-11, count kind where status is unbacked].

| Group | Count | Rule |
|---|---|---|
| Definitions, models, measures, principles | 58 | Bucket's own design statements. Each takes the status `design`, an owner, and a place in this framework. An empirical statement inside one is split out as a finding |
| Methods and the one mechanism | 20 | Each maps to a subsection of Mechanisms and takes that subsection's grade. Gap fill already found works for two: teach-back [c:core:teach-back-protege-effect] and tacit transfer [c:career-work:apprenticeship-transfers-tacit-knowledge] |
| Findings | 34 | Empirical. Each gets a confirmed work in the next corpus pass or leaves every user-facing surface: site copy, app strings, grant drafts |

Findings in use today that fall under the third rule: the 85% and 0.14% hiring figures in `learning/EPIC.md` [c:core:skills-based-hiring-gap], the streak retention figures [c:core:streak-loss-aversion], and day 7 as the habit checkpoint [c:core:day-7-habit-checkpoint]. The two founder theses stay in the corpus labelled as theses and appear nowhere as findings [c:epistemics-impact:ai-holding-capability-back] [c:epistemics-impact:education-reduces-existential-risk].

### The 11 Contradicted Claims

Each contradicted claim keeps its record with the status `contradicted-by-evidence`, and its source file gains one line giving the replacement.

| Claims | Replacement | Works |
|---|---|---|
| [c:core:bloom-two-sigma], [c:epistemics-impact:two-sigma-problem], [c:career-work:bloom-two-sigma-and-deflation] | Tutoring adds 0.288 SD pooled and 0.16 to 0.22 SD in large programmes on independent tests. Bloom's figure came from two dissertations on narrow tests [empirical: w:nickow-2024-promise-of-tutoring-meta, 2026-10-11, show] [empirical: w:kraft-2026-tutoring-at-scale-meta, 2026-10-11, show] | [w:von-hippel-2024-two-sigma-tutoring], [w:kraft-2026-tutoring-at-scale-meta] |
| [c:core:mastery-learning-effect], [c:epistemics-impact:mastery-learning-meta-analysis] | Mastery learning shows moderate effects on experimenter-made tests that do not persist and no effect on standardized measures | [w:slavin-1987-mastery-learning-reconsidered] |
| [c:core:feedback-power-and-variance] | Feedback averages d = 0.48 with high heterogeneity, and over one third of interventions lowered performance [empirical: w:wisniewski-2020-power-of-feedback-revisited, 2026-10-11, show] | [w:kluger-1996-feedback-interventions-meta] |
| [c:core:deliberate-practice], [c:career-work:deliberate-practice] | Practice accounts for 18% of variance in sport performance and 1% among elites; the 1993 violinist result did not replicate [empirical: w:macnamara-2016-deliberate-practice-sports, 2026-10-11, show] | [w:macnamara-2019-ericsson-1993-replication] |
| [c:career-work:research-apprenticeship-review-sadler-2010], [c:epistemics-impact:research-apprenticeships] | Evidence that research experiences raise persistence is weak, and more than half the studies rest on self-report | [w:linn-2015-undergraduate-research-experiences-review] |
| [c:career-work:mentorship-into-a-domain] | Mentoring is associated with career benefits, and effects on objective outcomes are small | [w:allen-2004-mentoring-career-benefits-meta], [w:eby-2008-does-mentoring-matter-meta] |

`learning/EPIC.md` tells authors to cite a replicated band of 0.5 to 0.8σ [c:core:replicated-efficacy-band]. That band now conflicts with the tutoring row above and is restated to match it.

### Internal Contradictions

Sixteen claims are contradicted inside the repository. The framework rules on the seven that concern learning design.

| Claim | Ruling |
|---|---|
| [c:core:mastered-means-retained], [c:core:operational-mastery-policy] | Tiers of Known replaces all three mastery definitions |
| [c:core:binary-search-diagnostic] | Diagnostic Placement |
| [c:core:inline-variable-xp] | Removed with points, under Motivation |
| [c:core:spacing-10-30-percent-claim], [c:core:retrieval-50-percent-claim], [c:epistemics-impact:testing-effect] | The percentages leave product copy. The corpus figures are g = 0.74 for spaced against massed retrieval and g = 0.499 for classroom quizzing |

### Parameters

The app holds 146 parameters across 39 mechanisms, and 132 carry no stated source [empirical: learning/corpus/mechanisms.jsonl, 2026-10-11, sum parameters_total and unsourced_parameters]. Every parameter takes one status.

`sourced`: a confirmed work gives the value or its range. `measured`: a Bucket experiment set it, with the run named. `founder`: a product decision. `default`: arbitrary and declared so, with bounds and the experiment that will set it. `removed`: the mechanism holding it is gone.

Removing nine mechanisms under Mechanisms retires 25 unsourced parameters, which leaves 107 to carry a status [empirical: derived from mechanisms.jsonl, 2026-10-11, 132-25]. The registry lives beside the corpus as `learning/corpus/parameters.jsonl`, and a later check fails the build when code holds a constant the registry lacks.

### Document and Code Conflicts

Fourteen mechanisms have a document that disagrees with the code [empirical: learning/corpus/mechanisms.jsonl, 2026-10-11, count doc_code_conflict]. This framework is the ruling document for each.

| Mechanism | Ruling |
|---|---|
| [mech:fsrs-scheduler] | The document wins: FSRS-6 through the `ts-fsrs` library, inside the proved clamps |
| [mech:elo-proficiency] | The code's point estimate stays and loses its role in mastery; it chooses items |
| [mech:fused-mastery] | Both sides retire. Levels replace the formula |
| [mech:encompassing-map] | Retired |
| [mech:fire-credit] | Retired |
| [mech:leverage-score] | The code wins: dependents count, declared a default ordering rule |
| [mech:daily-route] | A new atom opens when each prerequisite is at Recalled, between the document's "mastered" and the code's "seen once" |
| [mech:diagnostic-placement] | The code's per-atom belief stays. The document's typed answers and "not learned yet" button are added |
| [mech:assessment-run] | The document wins: sealed items, kept apart from practice |
| [mech:deterministic-grader] | The code wins: string and number match, with a normal form for expressions. Symbolic equivalence waits for a local engine |
| [mech:streak] | Both sides retire |
| [mech:socratic-tutor] | The document wins on the evaluation rig, which gates the tutor's default. The code's single-atom grounding stays |
| [mech:three-choice-quiz] | The document wins: produced answers first |
| [mech:fermi-grading] | Closed. The founder kept the margin on `bkt-gp92`, and the margin is proved safe [bm:BucketMath.Grade.correct_accepted_with_epsilon] |

## The Learner Model

### Events

Every quantity is a function of the review log, an append-only list of events. An event records the item, its atom, the time, the session, whether the answer was produced or picked, whether help was on screen, who graded it, whether it was correct, and the stated confidence. A session is a run of events with no gap over 30 minutes, a default.

An event qualifies when it is correct, unaided, produced, and graded by rule or by key-point checklist.

### Quantities

| Quantity | Symbol and range | Definition | Observed by |
|---|---|---|---|
| Attained level | L in {0, 1, 2, 3} | 3 when two qualifying events on the atom lie seven or more days apart; else 2 when one qualifying event exists; else 1 when any correct event exists; else 0 | The log |
| Current level | C in {0, 1, 2, 3}, C at or below L | L while the latest unaided event on the atom is correct and the atom is overdue by less than its last interval; otherwise one level lower, floor 1 | The log and the clock |
| Understood | U, true or false | L = 3, an explanation event meeting the key points, and one or more correct sealed transfer events | The log |
| Used | W, true or false | L at or above 2 and one or more debrief events naming the atom | The log |
| Memory strength | S in days, S at or above 0.01 | The scheduler's stability | State replayed from the log |
| Predicted recall | R in [0, 1] | The scheduler's probability of a correct unaided answer at the moment of review, stored before the answer | The log |
| Observed recall | o in {0, 1} | Correctness of a scheduled unaided produced answer | The log |
| Confidence | p in four stated bins | The probability the person states before the answer is shown | The log |
| Calibration | B in [0, 1] | Brier score, the mean of (p - o)² over answers [w:brier-1950-verification-of-forecasts-probability] | Computed |
| Overconfidence | V in [-1, 1] | Mean p minus mean o | Computed |
| Transfer | T in [0, 1] | Share correct on sealed transfer items, corrected for guessing when the item offers options | Computed |
| Proficiency | theta, unbounded | The Elo estimate [mech:elo-proficiency], used to choose items | State |
| Time to Retained | seconds | Active time on the atom from first event to L = 3 | The log |
| Dependence | flag | Gain with the model present whose interval lies above zero, with learning at or below zero a week later [c:epistemics-impact:dependence-flag] | The probe |

The Brier score splits into reliability, resolution and uncertainty [w:murphy-1973-vector-partition-probability-score]; the report shows reliability, the part a person can improve by adjusting stated confidence. Overconfidence has distinct forms, and overestimation and overplacement reverse on some tasks [w:moore-2008-trouble-with-overconfidence]. Bucket measures overestimation on the person's own answers and makes no comparison with other people.

The guess-corrected score for c correct of n items with four options is s = (c/n - 1/4)/(3/4), with chance at 0 and a perfect run at 1; its bounds are proved in the multiplier paper's Lean package [c:epistemics-impact:guess-corrected-score]. Three-option items use 1/3 in place of 1/4.

### Formal Statements

Each quantity has a statement that fits core Lean: the levels are bounded and never fall when an event is appended, a self-graded event changes no level, the Brier score lies in [0, 1], the guess-corrected score is 0 at chance, and the scheduler's outputs sit inside proved clamps [bm:BucketMath.Fsrs.review_bounds]. Formal Core lists every statement. Predicted recall passes through a power function, which Lean does not cover for floating-point values (`docs/ARCHITECTURE-TARGET.md`, Lean); its range and its fall with time are stated over the fixed-point model and checked on the running code by replay.

The model holds no trait of the person: no ability score across fields, no learning style, no mindset label. Far transfer from one field to another is small or null [w:sala-2019-near-far-transfer-second-order-meta], so a level on one atom says nothing about an unrelated atom. The model also holds no measure of socialisation or subjectification, per Aim.

## Mechanisms

A parameter status below is one of the five under Parameters, and E1 to E6 are the experiments under Within-Person Experiments.

### Retrieval

Changed. Method [m:retrieval practice]; today [mech:self-rated-review], [mech:three-choice-quiz] and [mech:daily-quiz].

| Field | Content |
|---|---|
| Evidence, grade A | Classroom quizzing g = 0.499 across 222 studies and 48,478 students [empirical: w:yang-2021-classroom-quizzing-meta, 2026-10-11, show]. Transfer d = 0.40, interval 0.31 to 0.50, against re-exposure [empirical: w:pan-2018-test-enhanced-transfer-meta, 2026-10-11, show]. Retrieval beat concept mapping on a concept-map test [w:karpicke-2011-retrieval-vs-concept-mapping] |
| Boundary | Recall tests give larger benefits than recognition tests [w:rowland-2014-testing-effect-meta]. Transfer to untested material from the same text is weakest |
| Rule | An item asks for a produced answer whenever a rule can grade it: a word, a number, a short expression, an ordering. An item with no rule grader shows its answer after an attempt, with a key-point checklist. The three-option form stays for first exposure in word lessons and for the timed daily quiz. Rereading a lesson is never offered as review [m:highlighting and rereading] |
| Parameters | Due batch 50: `default`, bounded by session time. Options 3: `founder` direction on short questions |
| Logged | Produced or picked, option count, grader, correct, elapsed time |
| Failure | Produced answers take longer, and a strict grader marks near misses wrong. People learn less from failure feedback than from success feedback [w:eskreis-winkler-2019-not-learning-from-failure]. The grader accepts listed variants, and E3 measures the cost |

### Spacing and the Scheduler

Changed. Methods [m:spacing] and [m:knowledge tracing and scheduling models]; today [mech:fsrs-scheduler].

| Finding | Tag |
|---|---|
| Spaced against massed retrieval g = 0.74 over 39 effect sizes | [empirical: w:latimier-2021-spaced-retrieval-meta, 2026-10-11, show] |
| Expanding against uniform spacing g = 0.034, a nonsignificant difference, over 54 effect sizes | [empirical: w:latimier-2021-spaced-retrieval-meta, 2026-10-11, show] |
| Equal and expanding schedules are equivalent in second-language learning | [w:kim-2022-spaced-practice-l2-meta] |
| A limited advantage for expanding spacing; the amount of spacing mattered more | [w:nakata-2015-expanding-equal-spacing-l2] |
| The best gap is 20 to 40% of a one-week delay, falling to 5 to 10% of a one-year delay | [empirical: w:cepeda-2008-spacing-temporal-ridgeline, 2026-10-11, show] |
| 13 sessions at 56 days matched 26 sessions at 14 days, tested at one to five years | [empirical: w:bahrick-1993-foreign-vocabulary-spacing-9-years, 2026-10-11, show] |
| Personalised review raised retention 16.5% over massed study and 10.0% over one-size-fits-all spacing | [empirical: w:lindsey-2014-personalized-review, 2026-10-11, show] |
| Recall prediction, log loss: FSRS-6 0.3460, FSRS-5 0.3561, half-life regression 0.4694 | [empirical: w:open-spaced-repetition-srs-benchmark, 2026-10-11, show] |
| Spacing beat massing for 90% of learners while 72% believed massing had worked better | [empirical: w:kornell-2009-flashcards-spacing, 2026-10-11, show] |

Spacing against massing is grade A. The shape of the schedule is another matter: expanding intervals add nothing measurable over uniform ones. The evidence for FSRS is prediction accuracy on review logs, plus a simulation of review cost [w:ye-2022-fsrs-ssp-mmc]. One classroom trial shows that an adaptive schedule improves retention over a fixed one, and it used a different model [w:lindsey-2014-personalized-review]. The case for an adaptive scheduler is that it gives hard items more reviews and easy items fewer. Expanding intervals are a side effect.

| Field | Content |
|---|---|
| What Bucket runs | FSRS-6 through `ts-fsrs` with the library's published default weights, every output passed through the proved clamps [bm:BucketMath.Fsrs.review_bounds]. Beside it, a fixed ladder of 7, 30 and 90 days on a random sample of atoms, which serves as the retention probe and as the comparison arm of E2 |
| Why | FSRS-6 predicts recall better than the hand-written FSRS-5 the app runs, whose last two weights are never read [mech:fsrs-scheduler]. The ladder costs nothing extra, since the probes are needed anyway, and it tests the one claim the literature leaves open for this product: whether adaptive scheduling saves reviews at equal retention |
| Rule | A review is due when predicted recall falls to the target. An atom earns scheduling credit once per session. Weights are fitted to the person only after about 1,000 reviews (`gaps.md`, Open Questions, `core:cold-start`). No interval exceeds 180 days until predicted and observed recall at 90 days have been compared on this machine. Product copy says "spaced review" and makes no claim for expanding intervals |
| Parameters | Target retention 0.9: `default`; no confirmed work fixes it [c:core:target-retention-below-100]. The 19 weights: `sourced` to the pinned library version, where today they carry no origin note. Maximum interval 3650 days becomes 180: `default` until measured. Lapse interval 1 day: `default`. Stability floor 0.01: a proved bound. Ladder 7, 30, 90: `default`, tied to the measurement checkpoints. Probe share 10% of atoms: `default` |
| Logged | Predicted recall, stability, difficulty and interval before the answer; days since last review; scheduler name and version; arm |
| Failure | A scheduler that predicts badly for this person spaces items too far, and they lapse unseen. FSRS is validated on recall-style cards only (`gaps.md`, Open Questions, `core:fsrs-deck-granularity`). The calibration plot and the 180-day cap are the guards. A backlog can grow past what a session holds, so new atoms pause while the due count exceeds one batch, a `default` |

The ladder steps sit inside the gap band above: 7 of 30 days is 23% and 30 of 90 days is 33% of the delay to the next checkpoint [empirical: derived from the ladder, 2026-10-11, 7/30 and 30/90]. The best share falls as the delay grows, so 33% may sit above the optimum.

### Interleaving

Changed. Method [m:interleaving]; today [mech:quiz-session-picker] and [mech:work-quiz-sampler].

| Field | Content |
|---|---|
| Evidence, grade A within its boundary | g = 0.42 overall; paintings 0.67, mathematics 0.34, word lists -0.39 [empirical: w:brunmair-2019-interleaving-meta, 2026-10-11, show]. In a preregistered trial the interleaved group scored 61% against 38% one month later, d = 0.83 [empirical: w:rohrer-2020-interleaved-math-rct, 2026-10-11, show] |
| Boundary | Blocking wins for word lists. Interleaving works when categories are confusable |
| Rule | The deck manifest sets `interleave`. With `confusable`, a practice set mixes atoms joined by `confusable_with` links and sibling atoms under one parent. With `none`, the setting for word decks, new words arrive in blocks by lesson node and due words run in due order. A daily route draws from every active deck |
| Parameters | Scan size 4 times the session size, long-form fallback below 20 short items, sampler slots and weights: all `default`, set by E1 |
| Logged | Arm, position in the session, the previous item's atom and category |
| Failure | Accuracy inside the session drops under interleaving, and learners rate massing as more effective even after seeing their own results [w:kornell-2008-spacing-induction]. The report shows delayed results beside session results. The wrong setting on a word deck costs 0.39 SD at face value [empirical: w:brunmair-2019-interleaving-meta, 2026-10-11, show] |

### Self-Explanation

Added. Method [m:self-explanation], with [m:teaching others] and [m:elaborative interrogation]. No mechanism implements it today.

| Field | Content |
|---|---|
| Evidence, grade A at once and B at a delay | g = 0.55 over 69 effect sizes [empirical: w:bisra-2018-self-explanation-meta, 2026-10-11, show]. Teaching with preparation g = 0.56 and preparing to teach g = 0.35 over 28 studies [empirical: w:kobayashi-2019-learning-by-teaching-meta, 2026-10-11, show]. The founding studies are [w:chi-et-al-1989-self-explanations-study-examples] and [w:chi-et-al-1994-self-explanation] |
| Boundary | In mathematics, evidence for classroom use and delayed retention is limited [w:rittle-johnson-2017-self-explanation-math-meta]. Explanation quality needs support. Elaborative interrogation has no pooled effect in the corpus |
| Rule | Each atom carries one authored prompt and two to four key points. The prompt appears after the worked example in the first lesson and again after a miss at Recalled or above. The person writes or speaks an answer, then sees the key points and ticks the ones their answer held. A full set of ticks is the explanation event for the Understood mark. The "teach" rung of [mech:depth-ladder] becomes this prompt |
| Parameters | One prompt per atom per session: `default`, set by E4. Key points two to four: an authoring rule |
| Logged | Prompt, encrypted response, key points ticked, elapsed time |
| Failure | The checklist is self-graded, and a person can tick without thinking. The explanation alone never grants Understood; the sealed transfer item is graded by rule. Prompts on material already held waste time, so they stop once the mark is earned |

### Worked Examples and Fading

Added. Method [m:worked examples and fading], within [m:cognitive load management].

| Field | Content |
|---|---|
| Evidence, grade A for novices | g = 0.48 in mathematics over 55 studies [empirical: w:barbieri-2023-worked-examples-math-meta, 2026-10-11, show]. Solution steps come out one at a time as skill grows [w:renkl-2003-example-fading] |
| Boundary | The benefit shrinks or reverses for advanced learners [w:kalyuga-2003-expertise-reversal-effect]. Problem solving first is the rival design, g = 0.36 [w:sinha-2021-productive-failure-meta] |
| Rule | An atom of type method or equation carries one or more worked examples with numbered steps. At Unknown and Recognised the lesson shows the full example, then a twin with the last step blank; each correct completion blanks one more step, working backward. At Recalled and above the lesson shows the problem, with the example one tap away |
| Parameters | One step removed per success: `sourced` to the fading rule. Two twin problems per atom: `default` |
| Logged | Steps shown, steps completed, example opened |
| Failure | Examples slow a learner who already holds the skill. The level gate and placement keep them away from that learner |

### Elaborated Feedback and the Resource Link

Changed. Method [m:feedback timing and type]; today [mech:wrong-answer-resource-link].

| Finding | Tag |
|---|---|
| Elaborated feedback 0.49, the correct answer 0.32, right or wrong alone 0.05; range -0.78 to 2.29 | [empirical: w:van-der-kleij-2015-computer-feedback-meta, 2026-10-11, show] |
| d = 0.41 over 607 effect sizes; over one third of interventions lowered performance; feedback loses value as it draws attention to the self | [empirical: w:kluger-1996-feedback-interventions-meta, 2026-10-11, show] |
| d = 0.48 over 435 studies, with high heterogeneity | [empirical: w:wisniewski-2020-power-of-feedback-revisited, 2026-10-11, show] |
| Classroom quizzes favour immediate feedback; laboratory studies favour delayed | [w:kulik-1988-feedback-timing-meta], [w:butler-2007-feedback-timing-type] |
| People learn less from failure feedback than from success feedback | [w:eskreis-winkler-2019-not-learning-from-failure] |

| Field | Content |
|---|---|
| Grade | A for an explanation over a bare verdict. B for the link, which no confirmed work tests |
| Rule on a miss | The screen shows the correct answer, a why line of 20 tokens or fewer, and one "learn this" link to the resource that teaches the atom. All of it describes the task [w:shute-2008-formative-feedback-review]. The screen carries no praise, no blame, no comparison with other people, and no loss of points or streak |
| Rule on a correct answer | A mark, with the why line one tap away |
| Timing | At once in practice. After the run ends in sealed assessments and probes |
| Link | The existing resolution order stays: the atom's lesson, an excerpt's evidence anchor, a work's DOI page. A link found by term match is labelled "related" |
| Parameters | Why line 20 tokens: `founder` direction, value `default`. Two shared key terms for a term match: `default` |
| Logged | Feedback shown, link target, link followed, time on the resource, and the result of the next attempt on the item. Today none of this is recorded |
| Failure | Feedback harms when it turns attention to the self. A miss screen can read as a verdict on the person; a link can pull the person out of the session; a term-matched link can teach the wrong thing. E6 tests whether the link raises the next attempt |

### Pretesting

Added. Methods [m:pretesting] and [m:productive failure].

| Field | Content |
|---|---|
| Evidence, grade B | Failed pretest attempts improved later learning beyond extra study time [w:richland-2009-pretesting-effect]. Pretesting improves memory for the pretested content, with less consistent benefit for other content [w:pan-2023-prequestioning-review]. No pooled effect is confirmed in the corpus. Problems first: g = 0.36, interval 0.20 to 0.51 [empirical: w:sinha-2021-productive-failure-meta, 2026-10-11, show] |
| Boundary | The trend reverses for second to fifth graders. Gains sit on the pretested content |
| Rule | A lesson on a new atom opens with one question on that atom. A miss shows no miss screen; the lesson is the feedback. A pretest event never rates the scheduler. A correct produced pretest sets Recalled, and the lesson may be skimmed. Placement answers count as pretests for the atoms asked |
| Parameters | One question: `default`, set by E5 |
| Logged | Role `pretest`, correct, confidence |
| Failure | A run of misses before any teaching can discourage. The question is skippable and is framed as a check of what the person already holds |

### Successive Relearning

Changed. Method [m:successive relearning]; today [mech:fsrs-scheduler] and [mech:work-quiz-miss-cards].

| Field | Content |
|---|---|
| Evidence, grade B | Successive relearning improved course exam scores and long-term retention [w:rawson-2013-successive-relearning-course]. A review calls the combination of retrieval to criterion with spacing potent and underused [w:rawson-2022-successive-relearning-review]. No effect size is retrievable from either abstract |
| Boundary | Few classroom studies. It costs time per item |
| Rule | Inside a session a missed item returns, after three or more other items, until one correct produced answer. Across sessions the scheduler brings it back. An item with a correct first answer also gets a card with a first interval of 7 days, where today a work-quiz item gets a card on a miss alone |
| Parameters | Criterion of one correct answer per session, return gap of three items, first interval of 7 days: all `default`. No confirmed work in the corpus gives a criterion level |
| Logged | Attempt number within the session |
| Failure | Sessions run long. A session ends by time, with unfinished items carried to the next |

### Calibration and Confidence

Added. Method [m:metacognitive monitoring and calibration]. It replaces [mech:confidence-band] and changes [mech:self-rated-review].

| Field | Content |
|---|---|
| Evidence, grade B | Metacognitive strategy instruction g = 0.50 at posttest and 0.63 at follow-up [empirical: w:de-boer-2018-metacognitive-strategy-long-term-meta, 2026-10-11, show]. Stated confidence can be compared with the proportion correct [w:lichtenstein-1977-know-more-calibration]. Experienced developers took 19% longer with a model and believed they had been 20% faster [empirical: w:becker-2025-ai-experienced-open-source-developers, 2026-10-11, show]. No confirmed work shows that a calibration display improves learning |
| Boundary | Self-ratings are biased, and the unskilled-and-unaware pattern is disputed as an artefact [w:gignac-2020-dunning-kruger-artefact] |
| Rule | Before the answer appears, the person states confidence with one tap on four bins. The report plots stated against observed for each bin. Correctness comes from the grader wherever a rule exists. The Again, Hard, Good, Easy buttons stay on checklist-graded cards and feed the scheduler alone |
| Parameters | Four bins labelled 25%, 50%, 75% and 95%: `default`, open question 9 |
| Logged | Confidence bin and time to state it |
| Failure | One more tap per item. A person who taps the same bin every time yields no resolution, and the report says so. The prompt has an off switch |

### The Prerequisite Graph and Mastery

Changed. Method [m:mastery learning]; today [mech:prereq-path-planner], [mech:daily-route], [mech:topic-graph-states], [mech:fused-mastery], [mech:depth-ladder] and [mech:grip-sphere].

| Field | Content |
|---|---|
| Evidence | The planner's properties are proved: every concept a target requires and the learner lacks appears on any valid path [bm:BucketMath.Learning.remaining_necessary], the prerequisite-ordered list is a shortest path [bm:BucketMath.Learning.minimum_unit_distance], and a chain under a strict rank never cycles [bm:BucketMath.Graph.acyclic_of_rank]. The human evidence is contested, grade B: ES 0.52 on experimenter tests against none on standardized measures. No prerequisite edge in the catalog has evidence behind it [c:core:learning-maps-need-empirical-checks]. The mastery formula and its 0.7 cut have no source [c:epistemics-impact:mastery-formula] |
| Boundary | Mastery-learning effects sit on experimenter-made tests and fade |
| Rule | The graph and the planner stay. The word "mastered" in the interface means current level Retained. A new atom opens when each prerequisite is at Recalled. The planner treats current level 2 or above as held. The depth ladder picks the question from the level: recall at 0 and 1, apply at 2, derive at 3, the explanation prompt after that. The grip display averages levels in place of the formula |
| Edge audit | Every `requires` edge carries a verification status under `docs/DATA-STANDARD.md`. Placement and pretest questions reach atoms whose prerequisites are unheld, so the log yields the miss rate on an atom with and without each prerequisite |
| Parameters | Gap of 7 days and two sessions for Retained: `default`, open question 1. Gate at level 2: `default`, open question 7. Four new atoms a day: `default` |
| Logged | Level and mark transitions, derived from the log and stored for the report |
| Failure | Nothing reaches Retained in the first week, so the interface also counts Recalled. A light gate admits shaky prerequisites, which the audit exposes. A wrong edge blocks a learner, so an "open anyway" action exists and is logged |

### Diagnostic Placement

Changed. Methods [m:adaptive learning and intelligent tutoring systems] and [m:pretesting]; today [mech:diagnostic-placement] and [mech:placement-seeding].

| Field | Content |
|---|---|
| Evidence, grade B for the method and C for this algorithm's constants | Adaptive systems g = 0.42 against teacher-led classes [empirical: w:ma-2014-its-learning-outcomes-meta, 2026-10-11, show]; 0.37 SD in mathematics over 4.5 months [empirical: w:muralidharan-2019-mindspark-rct, 2026-10-11, show]. All 13 placement parameters lack a source, and no held-out question checks a placement [mech:diagnostic-placement] |
| Boundary | Adaptive systems show no advantage over human tutoring and smaller effects on standardized tests |
| Rule | Answers are typed or picked and graded by rule. A "not learned yet" button replaces the self-judged "I knew it". An atom placed as known enters at Recognised, marked claimed, and gets a produced question within 7 days. Every answer and the final beliefs are stored. After placement a check set asks a sample of unasked atoms, half placed known and half placed unknown, and the report states the placement's accuracy |
| Parameters | All 13: `default`. Check set of 6: `default`. They are refitted when multi-user data exists |
| Logged | Per question: atom, answer, correct, elapsed time, belief before and after. Check-set results |
| Failure | Placing too high skips atoms never learned, which the 7-day question catches. Placing too low hands an expert material they hold |

### The Tutor

Changed. Method [m:tutoring and the two-sigma claim]; today [mech:socratic-tutor] and [mech:tutor-answer-guard].

| Finding | Tag |
|---|---|
| Human tutoring 0.288 SD pooled; 0.16 to 0.22 SD in large programmes on independent tests | [empirical: w:nickow-2024-promise-of-tutoring-meta, 2026-10-11, show], [empirical: w:kraft-2026-tutoring-at-scale-meta, 2026-10-11, show] |
| Tutoring systems g = 0.42 against teacher-led classes and a nonsignificant -0.11 against human tutors | [empirical: w:ma-2014-its-learning-outcomes-meta, 2026-10-11, show] |
| Step-level feedback d = 0.76, human tutors 0.79, answer-level feedback 0.31 | [empirical: w:vanlehn-2011-relative-effectiveness-tutoring, 2026-10-11, show] |
| Open access to a model left students 17% lower once access ended, and a tutor that gave hints did no such harm | [empirical: w:bastani-et-al-2025-generative-ai-can-harm-learning, 2026-10-11, show] |
| One trial of 194 students: an AI tutor 0.63 to 1.3 SD above active learning | [empirical: w:kestin-et-al-2025-ai-tutoring-outperforms-active-learning, 2026-10-11, show] |
| 18 schools: 0.06 to 0.14 SD, and the AI coach added nothing | [empirical: w:oreopoulos-2026-one-click-away-ai, 2026-10-11, show] |
| AI use impaired conceptual understanding; patterns that kept the learner engaged preserved learning | [w:shen-2026-ai-skill-formation] |

| Field | Content |
|---|---|
| Grade | B. The trials of AI tutors disagree |
| Rule | Grounding on one atom, hints in place of answers, and the leak guard all stay. Three additions. The tutor answers only after the person has an attempt on record for the item. Its first move asks for the person's own explanation. A correct answer after a tutor turn logs as aided and reaches Recognised alone. The tutor runs on a local model by default, with a hosted model as an opt-in. It is on by default only after the evaluation rig with a misconception set passes. No sentence in the product cites two sigma |
| Parameters | Model: a `founder` decision, open question 6; today the constant names a hosted model. Token, history and grounding limits and the daily caps: `default` |
| Logged | Each turn joined to its item and to the next unaided attempt on the atom. Today the turn and the later result are unlinked |
| Failure | A leaked answer builds dependence. A local model gives weaker hints. Both show in one figure the log can now produce: unaided results on atoms after tutor turns against atoms without |

### Motivation

Changed. Methods [m:motivation: self-determination theory], [m:motivation: expectancy-value], [m:gamification and streaks] and [m:motivation: growth mindset]; today [mech:streak] and [mech:xp-by-depth].

| Finding | Tag |
|---|---|
| Across 344 samples and 223,209 people, intrinsic motivation relates to success and external regulation shows no link to performance | [empirical: w:howard-2021-sdt-student-motivation-meta, 2026-10-11, show] |
| Contingent tangible rewards lower intrinsic motivation | [w:deci-koestner-ryan-1999-extrinsic-rewards-meta-analysis] |
| Choice raises intrinsic motivation, 41 studies | [empirical: w:patall-cooper-robinson-2008-choice-intrinsic-motivation-meta-analysis, 2026-10-11, show] |
| Motivation interventions as a class d = 0.49, interval 0.43 to 0.56 | [empirical: w:lazowski-2016-motivation-interventions-meta, 2026-10-11, show] |
| Gamification: cognitive g = 0.49 from 19 samples and 1,686 people, motivational 0.36, behavioural 0.25; the cognitive effect alone held in rigorous studies | [empirical: w:sailer-2020-gamification-meta, 2026-10-11, show] |
| A gamified course produced lower motivation and lower exam scores | [w:hanus-fox-2015-gamification-classroom] |
| A broken streak lowers later engagement; the drop eases when the streak can be repaired | [w:silverman-2023-broken-streaks] |
| Growth mindset d = 0.05, interval 0.02 to 0.09, and 0.02 in the best studies | [empirical: w:macnamara-2023-growth-mindset-best-practices-meta, 2026-10-11, show] |
| Paying for test scores did nothing; paying for inputs helped | [w:fryer-2011-financial-incentives-student-achievement] |

| Kept | Form in the app | Ground |
|---|---|---|
| Autonomy | The person chooses the target, the deck and the session length, and can decline any prompt | Choice, self-determination |
| Competence | Progress appears as evidence: levels, retention, the atoms a finished atom opens [c:core:unlocks-line] | Self-determination |
| Value | Questions come from the person's own work; the path to a target shows the count remaining, a proved minimum | Expectancy-value |
| Curiosity | The pretest question opens a gap before the lesson closes it [c:epistemics-impact:curiosity-information-gap] | Pretesting |

| Refused | Reason |
|---|---|
| A streak that resets | A broken streak lowers later engagement. [mech:streak] is removed |
| Points | Contingent rewards lower intrinsic motivation, and the motivational effect of gamification did not hold in rigorous studies. [mech:xp-by-depth] is removed |
| Hearts | A miss that costs a life punishes the errors that Error-Based Questions relies on. Removed from [mech:language-lesson-loop] |
| Guilt in reminders | External regulation links to lower well-being |
| Leaderboards and comparisons | Feedback that turns attention to the self lowers performance |
| Variable rewards | [c:core:inline-variable-xp], contradicted inside the repository |
| Mindset messages, style matching, payment for scores | The effects above |

A calendar of days studied replaces the streak. It counts up and has no reset. A reminder goes out once a day at most and states what is due and how long it takes, a `default` with no confirmed work behind it [c:core:value-led-notifications].

The log records how each session started and each declined prompt. The failure to expect is fewer return visits: gamification's behavioural effect is g = 0.25 at face value, and the app gives that up. Sessions per week before and after the removal are reported, as an observation without a control.

### Lessons and Decks

Changed. Today [mech:language-lesson-loop], [mech:three-depth-lesson] and the science decks.

Word decks first.

| Finding | Tag |
|---|---|
| Intentional study: 60.1% meaning recall and 58.5% form recall at once, then 39.4% and 25.1% at a delay | [empirical: w:webb-2020-intentional-vocabulary-meta, 2026-10-11, show] |
| The keyword method: 72% correct against 46% for a control | [empirical: w:atkinson-1975-keyword-method-russian, 2026-10-11, show] |
| Keyword gave the best retention; rote pairs beat semantic mapping | [w:sagarra-2006-keyword-beginning-spanish] |
| Reading without help needs 98% coverage, 8,000 to 9,000 word families for written text | [empirical: w:nation-2006-vocabulary-size-needed, 2026-10-11, show], [w:schmitt-2011-words-known-comprehension] |
| Encounters relate to incidental learning at r = .34 | [empirical: w:uchihara-2019-repetition-incidental-vocabulary-meta, 2026-10-11, show] |

New words arrive in blocks, four to a node as today, a `default`. Each word has a meaning-recall item and a form-recall item, tracked apart, because form recall falls faster. A word may carry a keyword field. Words are ordered by frequency toward the coverage figure. Review is spaced and blocked. Hearts go. An image appears only when it carries the meaning [m:dual coding]. Audio made by speech synthesis is labelled as such.

**Science decks.** A lesson runs in a fixed order: the pretest question, the worked example with fading, the explanation prompt, practice items, and later the sealed transfer items. The plain, core and deep texts of [mech:three-depth-lesson] stay as content and make no learning claim [c:core:three-depth-explanations]; the lesson opens on plain below Recalled and on core from Recalled up. Art stays only where it carries content [c:core:load-bearing-art-contract].

**A person's own deck.** Producing material beats reading it, d = 0.40 over 86 studies [empirical: w:bertsch-2007-generation-effect-meta, 2026-10-11, show]. Highlighting by the learner gives memory 0.36 and no reliable gain in comprehension [empirical: w:ponce-2022-highlighting-meta, 2026-10-11, show], so a highlight becomes a card only when the person writes a question for it. Each own-deck item links to the note, paper or commit it came from. Own decks skip curation. Their author has seen every item, so they hold no sealed items, and their atoms stop at Retained and Used.

### Question Forms and Length Limits

Adopted. Method [m:cognitive load management]; today [mech:question-length-limits], [mech:short-fields] and [mech:work-quiz-forms].

The founder asked for short quiz text. Cognitive load theory supports fitting material to working memory [w:sweller-2019-cognitive-load-20-years], its testability is questioned [w:de-jong-2010-cognitive-load-critique], and eleven multimedia design principles show positive effects [w:noetel-2022-multimedia-design-meta-meta]. No confirmed work sets a token count. The limits stand as defaults under a founder direction, with values read from the running code [empirical: mech:question-length-limits, 2026-10-11, show].

| Limit | Value |
|---|---|
| Stem | 15 tokens, 20 for an intent question |
| Option | 5 tokens, exactly 3 options, lengths within 1 token and 30% of characters |
| Why line | 20 tokens, 160 characters |
| Screen before answering | 30 tokens, 280 characters |
| Formula | 12 characters |
| Source links | 1 |

| Form | Method it serves |
|---|---|
| recall, cloze, and the four language forms | Retrieval |
| compare | Case comparison, d = 0.50, interval 0.44 to 0.56 [empirical: w:alfieri-2013-case-comparison-meta, 2026-10-11, show] |
| spot_error, cause_effect | Error-Based Questions |
| estimate | Order-of-magnitude grading, symmetric and scale-free [bm:BucketMath.Grade.within_symm] [bm:BucketMath.Grade.within_scale] |
| order | Retrieval of sequence |
| true_false, which_changed | Blocked today, and they stay blocked |

Mathematics renders as typeset notation from stored LaTeX source, and the formula limit counts source characters. Numeric answers grade within 1% or on the log scale, both statable as integer inequalities.

Speed stops changing the rating: [mech:timed-choice-rating] is removed, since no confirmed work supports rating a fast answer as easier. The time limit stays as pacing in the daily quiz and as a logged flag.

The failure to watch: 15 tokens cannot hold a derive-level question, so those items use the long form inside lessons. Nothing yet measures whether a shorter question changes recall.

### Dispositions

| Mechanism | Disposition | Note |
|---|---|---|
| [mech:fsrs-scheduler] | Changed | FSRS-6 library, capped interval, ladder arm |
| [mech:stability-only-mastery] | Removed | Unsourced 21-day constant |
| [mech:elo-proficiency] | Changed | Chooses items; no role in mastery |
| [mech:fused-mastery] | Removed | Levels replace it |
| [mech:depth-ladder] | Changed | Keyed to levels |
| [mech:encompassing-map] | Removed | Weights from hop distance, cited to unconfirmed essays [w:skycak-nd-how-math-academy-creates-its] |
| [mech:fire-credit] | Removed | Moves due dates later with no measurement behind it [w:skycak-nd-optimized-individualized-spaced-repetition-in] |
| [mech:leverage-score] | Adopted | Ordering rule, declared default |
| [mech:daily-route] | Changed | Gate at Recalled; draws across decks |
| [mech:prereq-path-planner] | Adopted | Proved |
| [mech:topic-graph-states] | Changed | States from levels |
| [mech:diagnostic-placement] | Changed | Graded answers, stored, checked |
| [mech:placement-seeding] | Changed | Enters as claimed, verified in 7 days |
| [mech:assessment-run] | Changed | Sealed items, apart from practice state |
| [mech:deterministic-grader] | Changed | Normal form; its verdict gates levels |
| [mech:xp-by-depth] | Removed | Motivation |
| [mech:streak] | Removed | Motivation |
| [mech:confidence-band] | Removed | Five unsourced cuts; calibration replaces it |
| [mech:grip-sphere] | Changed | Averages levels |
| [mech:three-depth-lesson] | Adopted | Content, no learning claim |
| [mech:socratic-tutor] | Changed | Attempt first, local model, linked log |
| [mech:tutor-answer-guard] | Adopted | |
| [mech:learn-event-log] | Changed | The review log supersedes it |
| [mech:three-choice-quiz] | Changed | Fallback form |
| [mech:timed-choice-rating] | Removed | Speed bonus |
| [mech:self-rated-review] | Changed | Feeds the scheduler alone |
| [mech:quiz-session-picker] | Changed | Interleave setting |
| [mech:short-fields] | Adopted | |
| [mech:question-length-limits] | Adopted | Defaults under founder direction |
| [mech:work-quiz-forms] | Adopted | |
| [mech:work-quiz-sampler] | Changed | Feeds the debrief |
| [mech:work-quiz-miss-cards] | Changed | A card on a first correct answer too |
| [mech:fermi-grading] | Adopted | Conflict closed |
| [mech:surprise-quiz-trigger] | Removed | The debrief at a work boundary replaces it |
| [mech:daily-quiz] | Changed | Becomes the debrief |
| [mech:wrong-answer-resource-link] | Changed | Logged and tested |
| [mech:language-lesson-loop] | Changed | Hearts removed, blocked introduction |
| [mech:polingual-neighbors] | Adopted | Search aid, no learning claim |
| [mech:hai-probe-retest] | Changed | Retest on parallel items |

Of the 39 mechanisms, 9 are adopted, 21 changed and 9 removed [empirical: derived from the table above, 2026-10-11, 9+21+9]. Sixteen are added:

| Added | | | |
|---|---|---|---|
| Levels and marks | Self-explanation prompt | Worked example with fading | Pretest question |
| Confidence capture and calibration score | Review log | Retention probes on a fixed ladder | Sealed transfer items |
| Experiment runner | Per-learner report | Debrief at a work boundary | Error-based questions |
| Feedback on real output | Paper reading with prompts | Commit first, with unaided checks | Career view |

## Learning from Work

The edtech map lists learning tied to a person's own working output as open ground: the nearest products grade code on set exercises, and none builds questions from the learner's own commits or papers (`edtech-landscape.md`, Open ground). Workplace players have the thinnest evidence of any segment: 2 of 23 have an independent finding [empirical: market/edtech-landscape.md, 2026-10-11, Evidence of learning]. Experience alone does not hold skill: 52% of 62 evaluations found physician performance falling with years in practice [empirical: w:choudhry-2005-clinical-experience-quality, 2026-10-11, show], and the rule that 70% of work learning is informal has weak evidence [w:clardy-2018-70-20-10-evidence] [w:johnson-2018-70-20-10-transfer].

### The Debrief

Changed from [mech:daily-quiz], [mech:work-quiz-sampler] and [mech:surprise-quiz-trigger].

| Finding | Tag |
|---|---|
| Debriefs improve performance d = .67 over 46 samples and 2,136 people, about 25% over control, for individuals as for teams | [empirical: w:tannenbaum-2012-debriefs-meta, 2026-10-11, show] |
| After-action reviews: overall effect 0.67; alignment to the individual and objective review media contributed most | [empirical: w:keiser-2021-after-action-review-meta, 2026-10-11, show] |
| Soldiers debriefed on successes and failures improved more than those who reviewed failures alone | [w:ellis-2005-after-event-reviews-success-failure] |
| After-event reviews improved leadership development | [w:derue-2012-after-event-reviews-leadership] |

| Field | Content |
|---|---|
| Grade | A for the debrief as a method. No confirmed work tests a debrief written by software from a person's own records |
| Rule | A debrief opens at a work boundary: a merged pull request, a closed bead, a finished note, or the end of the day. It never interrupts a task. It asks three to five questions built from the record of that work. One or more questions cover something that went right and one or more cover something that went wrong. Each question shows the line of the record it came from. Each answered atom gains a debrief event, the evidence for the Used mark |
| What goes | The random trigger, which opens a question during active work with a 1 in 60 chance per minute and has no source [mech:surprise-quiz-trigger] |
| Parameters | Three to five questions, two days of session records, the local model and its temperature: `default` |
| Logged | The source record, form, correct, confidence, and a "this question is wrong" flag |
| Failure | A local model can misread the person's work and ask a false question. The source line and the flag expose it, and the report counts flagged questions. Work text stays on the machine |

### Error-Based Questions

Added.

| Field | Content |
|---|---|
| Evidence, grade A for transfer | Error management training d = 0.44 over 24 studies and 2,183 people; 0.56 for transfer after training and 0.80 for adaptive transfer to new tasks [empirical: w:keith-2008-error-management-training-meta, 2026-10-11, show] |
| Boundary | People learned less from feedback on their own failures than on their successes, and learned equally from the failures and successes of others [w:eskreis-winkler-2019-not-learning-from-failure]. Learning from error needs safety [w:edmondson-1999-psychological-safety-teams] [w:frazier-2016-psychological-safety-meta] |
| Rule | The app builds `spot_error` and `cause_effect` questions from the person's recorded mistakes: a reverted commit, a failed check, a review comment that led to a change, a correction in a note, a missed quiz item. The question presents the artefact, "this diff", and leaves the author unnamed, which uses the finding on other people's failures. Error questions stay on the device and leave every export unless the person adds them |
| Parameters | Which record types count as an error: `default`, chosen by the person in Settings |
| Logged | Error source, form, correct |
| Failure | A person who reads the question as blame stops answering. A record marked as an error may have been a sound decision, so each question can be dismissed with one tap |

### Feedback on Real Output

Added.

| Field | Content |
|---|---|
| Evidence, grade B | Feedback at work averages d = 0.41 with over a third of interventions harmful [w:kluger-1996-feedback-interventions-meta]. Audit and feedback lifts clinician compliance by a median 4.3% absolute, interquartile range 0.5% to 16% [empirical: w:ivers-2012-audit-feedback-cochrane, 2026-10-11, show]. Gains after multisource feedback are small [w:smither-2005-multisource-feedback-meta]. Performance feedback in organisations shows large effects [w:sleiman-2020-performance-feedback-obm] |
| Rule | On request, the app states facts from objective records about a piece of output: checks passed, review comments by kind, error types that repeat across weeks, and one next step. It gives no rating of the person. A model's opinion of quality is off by default and labelled when on, because wrong advice from a model pulled experienced readers from 82.3% correct to 45.5% [empirical: w:dratsch-2023-automation-bias-mammography, 2026-10-11, show] |
| Logged | Feedback requested, facts shown, next step accepted |
| Failure | The same as for any feedback: attention moves from the task to the self. No confirmed work tests feedback from an app on a researcher's own output |

### Reading Real Papers

Added. It rests on Self-Explanation, Pretesting and the own-deck rule; the internal claim for learning from the papers themselves is unbacked [c:core:papers-as-comprehensible-input].

| Stage | Rule |
|---|---|
| Before | The app lists the atoms the paper leans on that the reader holds below Recalled, and asks one prequestion |
| During | One explanation prompt at the end of each section, which the reader may batch to the end. A highlight becomes a card only with a written question |
| After | A debrief the next day, three to five questions, each tied to a locator in the paper |

Each card carries the paper's record and locator, the `excerpt` kind of `docs/DATA-STANDARD.md`. The log records prompts answered, prompts skipped and the debrief result.

### Apprenticeship and Tacit Knowledge

People know more than they can tell [w:polanyi-1966-tacit-dimension]. Western laboratories took about 20 years to repeat one Russian measurement, and personal contact between scientists carried the missing knowledge [w:collins-2001-tacit-knowledge-q-sapphire]. The claim that tacit knowledge converts to explicit knowledge has no evidence that a simpler account fails to explain [w:gourlay-2006-nonaka-critique]. Cognitive apprenticeship brings tacit expert processes into the open where learners can watch and practise them [w:collins-1989-cognitive-apprenticeship]; its reviews are qualitative and report no outcome effect [w:lyons-2016-cognitive-apprenticeship-health] [w:minshew-2021-cognitive-apprenticeship-stem-graduate]. In laboratories, the principal investigator's mentoring did not predict student skill, while active postdocs and senior students made junior students over 4 times as likely to develop [empirical: w:feldon-2019-cascading-mentorship, 2026-10-11, show]. Research experience pays off from 10 hours a week across two or more semesters [empirical: w:hernandez-2018-undergraduate-research-dosage, 2026-10-11, show].

| An app can | An app cannot |
|---|---|
| Show an expert's process: worked examples drawn from real work, with each step and its reason written out | Transfer a craft skill that needs a person watching the work |
| Prompt the learner to put their own process into words, in the debrief | Stand in for membership of a laboratory or a team |
| Schedule practice and record what a person needs to ask someone | Verify a tacit skill with a quiz |
| Point to near peers who work on the same problem | Supply the contact itself |

An atom of type `craft` carries the line "learned with a person" and takes no Understood mark from quiz evidence. The internal claim that apprenticeship transfers tacit knowledge rests on case studies and stays labelled so [c:career-work:apprenticeship-transfers-tacit-knowledge].

### Career Learning

| What Bucket holds | Count |
|---|---|
| Distinct researchers with an ORCID or OpenAlex id | 19,407,444 |
| Of those, with two or more dated institutions | 14,006,094 |
| Linked to a grant | 58,495, which is 0.3% |
| Advisor or advisee pairs | 0 |
| Scored advisors, unvalidated against any advising outcome | 3,934, with 59% in one field |

Every count comes from one profile [empirical: market/researcher-data.md, 2026-10-11, researcher-queries.sql].

| Finding | Tag |
|---|---|
| One standard deviation of faculty quality adds 13 points to the chance of a top-journal dissertation paper | [empirical: w:waldinger-2010-faculty-quality-phd-outcomes, 2026-10-11, show] |
| Losing a star coauthor cuts output by 5 to 8% for good | [empirical: w:azoulay-2010-superstar-extinction, 2026-10-11, show] |
| Postdoctoral mentors predict trainee success more than graduate mentors | [w:lienard-2018-intellectual-synthesis-mentorship] |
| Mentoring's effects on objective career outcomes are small | [w:allen-2004-mentoring-career-benefits-meta], [w:eby-2008-does-mentoring-matter-meta] |
| Interest fit relates to job satisfaction at rho = 0.19 | [empirical: w:hoff-2020-interest-fit-job-satisfaction-meta, 2026-10-11, show] |
| Job search interventions raise the odds of employment 2.67 times, 47 evaluations | [empirical: w:liu-2014-job-search-interventions-meta, 2026-10-11, show] |
| The funded-career gap of 2.11 times falls to 1.23 times after matching | [empirical: c:career-work:funded-gap-mostly-selection, 2026-10-11, show] |

| Supported today | Needs advisor links or other data |
|---|---|
| Who works on a problem, from topics on 19.4 million authors | Advisor lineage and what a given advisor's students went on to do |
| Where people in a field moved, from institution-by-year histories | A validated advisor match (`gaps.md`, Open Questions, `career-work:advisor-match-outcome-test`) |
| Funding by field, with investigator links for five funders in the United States, the United Kingdom and Germany | Funding links for other funders |
| Base rates such as the share of doctorates reaching the tenure track [c:career-work:phd-tenure-track-14pct] | Job titles, degrees and careers outside academia |

The career view joins the data to the learning system through one step: a person picks a research area, the app lists the atoms that area's papers lean on, and the planner returns the shortest path to them. The view shows counts with their denominators and names thin coverage. It shows no fit score until the score is tested against outcomes. It presents interest fit and mentoring as small effects. Person records use CC0 facts alone, with the opt-out path live and every email private (`researcher-data.md`, Rights and Privacy). Advisor pairs would come from Academic Tree and thesis records, the second collection step in that file.

### Learning with AI

| Finding | Tag |
|---|---|
| AI help raised issues resolved per hour by 15%, most for less experienced workers | [empirical: w:brynjolfsson-2025-generative-ai-at-work, 2026-10-11, show] |
| Developers with the tool completed 26.08% more tasks, standard error 10.3% | [empirical: w:cui-2026-generative-ai-high-skilled-work, 2026-10-11, show] |
| Experienced developers took 19% longer with AI and estimated they had been 20% faster | [empirical: w:becker-2025-ai-experienced-open-source-developers, 2026-10-11, show] |
| Adenoma detection in unassisted colonoscopy fell from 28.4% to 22.4% after exposure to AI | [empirical: w:budzyn-2025-endoscopist-deskilling, 2026-10-11, show] |
| Open access to a model left students 17% lower once it was withdrawn | [empirical: w:bastani-et-al-2025-generative-ai-can-harm-learning, 2026-10-11, show] |
| Automation can enlarge the operator's problems | [w:bainbridge-1983-ironies-of-automation] |
| In pilots the cognitive tasks of manual flight decayed more than hand control | [w:casner-2014-manual-flying-skills-retention] |

How far AI use erodes skill has no confirmed magnitude: the corpus holds one before-and-after study and one randomized trial [w:shen-2026-ai-skill-formation].

| Rule | Ground |
|---|---|
| Commit first. On a task the person must check, the app asks for their answer before the model's appears | Forcing a judgement before the suggestion reduces overreliance [w:bucinca-malaya-gajos-2021-cognitive-forcing-functions] |
| Every answer given with a model on screen logs as aided and reaches Recognised alone | Tiers of Known |
| The person marks skills to retain. For those, the app keeps unaided practice and logs time and quality | Skill decay with assistance [w:macnamara-et-al-2024-ai-assistance-skill-decay] |
| A Retained atom whose recent correct events are all aided falls due for an unaided check | The dependence definition [c:epistemics-impact:dependence-flag] |
| The probe reports the multiplier and the dependence flag, and its retest uses parallel items | Today the retest reuses items, so transfer is unmeasured [mech:hai-probe-retest] |

## Measurement

No real learner has been measured. The probe has run zero times [c:epistemics-impact:hai-bank-status], and the learning-system results come from 57,060 enumerated cases on 1,099 small graphs [empirical: c:epistemics-impact:planner-enumeration-result, 2026-10-11, show] and 1,200 synthetic learners [empirical: c:epistemics-impact:synthetic-prediction-experiment, 2026-10-11, show]. Measurement is the first thing built.

### Review Log

One append-only table on the device. The current `attempts` table holds the item, mode, encrypted response, correct, rating, elapsed time and timestamp [mech:three-choice-quiz]; the log extends it.

| Field | Content |
|---|---|
| `id`, `at`, `session_id` | Row id, UTC milliseconds, session |
| `deck_id`, `deck_version`, `atom_id`, `item_id` | What was asked |
| `item_role` | `practice`, `transfer`, `probe`, `pretest`, `placement`, `debrief` |
| `form`, `depth` | Question form and depth |
| `produced`, `options_n` | Produced or picked, and the option count |
| `aided` | `none`, `hint`, `tutor`, `model_answer` |
| `graded_by` | `rule`, `checklist`, `self` |
| `correct`, `response` | Verdict and the encrypted response |
| `confidence` | Stated bin |
| `elapsed_ms`, `timed_out` | Timing |
| `scheduler`, `predicted_r`, `stability`, `difficulty`, `interval_days`, `days_since_last`, `due_after` | Scheduler state before the answer and the due date after |
| `experiment_id`, `arm` | Experiment assignment |
| `feedback_shown`, `link_target`, `link_followed` | Feedback on a miss |
| `source_ref` | The work record behind a debrief question |

Scheduler state, levels and marks are pure functions of this table. Replaying the log from empty must reproduce the stored state exactly.

### Predicted and Observed Recall

For each scheduled unaided answer the log holds the scheduler's prediction and the outcome. The report bins predictions and plots the observed share in each bin against the bin's mean prediction, with the Brier score and the log loss beside it. The benchmark figures for FSRS under Spacing and the Scheduler come from other people's cards; this plot is the test for this person.

A bin of n answers with observed share p has a 95% half-width of 1.96 times the square root of p(1 - p)/n. At p = 0.9 that is 5.9 points for 100 answers and 2.9 points for 400 [empirical: derived from the binomial variance, 2026-10-11, 1.96*sqrt(0.9*0.1/100) and 1.96*sqrt(0.9*0.1/400)]. The plot draws that band and greys any bin under 100 answers. The same plot, with stated confidence in place of predicted recall, is the person's calibration plot.

### Held-Out Transfer Items

Each atom in a curated deck carries two or more sealed items that practice never shows. An item is shown once and then retires to the practice pool. Sealed items are graded by rule. They differ from practice items in surface and share the principle, which is near transfer; far transfer is small or null [w:sala-2019-near-far-transfer-second-order-meta] [w:simons-2016-brain-training-review], and its dimensions are set out in [w:barnett-ceci-2002-far-transfer-taxonomy]. The transfer score is the share correct on sealed items, corrected for guessing. Retrieval practice transfers at d = 0.40 against re-exposure, so some transfer is the expectation to test.

### Retention Probes

One atom in ten, chosen by seeded hash when it is introduced, leaves the adaptive scheduler and follows the fixed ladder: a produced question 7, 30 and 90 days after it reaches Recalled. Retention at each point is the share correct, with its interval. A sample of 49 atoms, one tenth of the 487 science atoms, gives a half-width of 12.8 points at 70% retention, and 100 atoms give 9.0 points [empirical: derived from the binomial variance, 2026-10-11, 1.96*sqrt(0.7*0.3/49) and 1.96*sqrt(0.7*0.3/100)].

Reference points from the corpus: two thirds to three quarters of basic-science knowledge remains at one year and slightly under half at two [empirical: w:custers-2010-retention-basic-science, 2026-10-11, show]; 62%, 44% and 34% of employees apply training at once, at six months and at one year [empirical: w:saks-2006-transfer-activities, 2026-10-11, show]. A one-year probe joins the ladder once a deck has been in use that long.

### The Per-Learner Report

One screen in the app, computed on the device.

| Panel | Shows |
|---|---|
| What you hold | Atoms by level and mark, per deck, attained and current |
| Memory | Predicted against observed recall; retention at 7, 30 and 90 days with intervals |
| Calibration | Stated against observed per confidence bin; the overconfidence figure |
| Transfer | Score on sealed items, with the count behind it |
| Cost | Time to mastery: active seconds on an atom from its first event to Retained, summed from `elapsed_ms` with each answer capped at its time limit, as a median per deck. Reviews per Retained atom, the cost figure for E2 |
| Work | Debriefs done, atoms marked Used, flagged questions |
| With AI | Aided share of correct answers; the dependence flag when a probe has run |
| Experiments | Each running or finished experiment, its arms, counts and result |
| Limits | What the sample is too small to say |

The report states task facts. It ranks the person against nobody and gives no praise or blame, following the feedback evidence. Dashboards are surveyed in [w:verbert-2013-learning-dashboards-overview-future]. No product on the edtech map shows each learner their measured retention at 30 days or their transfer to new problems (`edtech-landscape.md`, Evidence of learning).

### Within-Person Experiments

An experiment runs on one machine, with consent, and no data leaves it.

| Element | Design |
|---|---|
| Unit | The atom. Atoms in a deck are assigned to two arms by a seeded hash of the seed and the atom id |
| Consent | One screen stating the two arms, the duration and that the result stays local. Declining changes nothing else |
| Registration | The experiment's definition, with its outcome, sample size and analysis, is hashed into the log before the first event |
| Outcome | Correct or wrong on the first unaided produced answer at a fixed delay after the last practice |
| Stopping | At the registered sample size, with no early look |
| Analysis | The difference in shares with a 95% interval, shown whatever its direction |
| Scope | The result holds for this person on these decks |

| Id | Arms | Delay | Tests |
|---|---|---|---|
| E1 | Interleaved against blocked practice | 7 and 30 days | Interleaving |
| E2 | Adaptive schedule against the fixed ladder | 90 days, plus reviews spent | Spacing and the Scheduler |
| E3 | Produced against picked first answers | 7 days | Retrieval |
| E4 | Explanation prompt against none | 30 days | Self-Explanation |
| E5 | Pretest question against none | 7 days | Pretesting |
| E6 | Why line with the link against the why line alone | Next attempt | Elaborated Feedback |

### Power

For two arms of n atoms each and shares near 0.6, the difference detectable with 80% power at a two-sided 5% level is 2.8 times the square root of 2 × 0.24/n. Dividing by the standard deviation of a 0.6 share, 0.49, gives the effect in SD units.

| Atoms per arm | Detectable difference | In SD units |
|---|---|---|
| 50 | 27 points | 0.56 |
| 100 | 19 points | 0.40 |
| 200 | 14 points | 0.28 |
| 400 | 10 points | 0.20 |
| 1,000 | 6 points | 0.13 |

The rows follow from the formula [empirical: derived from the two-proportion test, 2026-10-11, 2.8*sqrt(0.48/n) for n in 50 100 200 400 1000 and each over 0.49].

| Effect to detect | Size | Atoms per arm |
|---|---|---|
| Interleaving as in the mathematics trial, 61% against 38% | 23 points | 71 |
| Interleaving at the pooled g = 0.42 | about 21 points | 89 |
| Interleaving at half the pooled effect, the planning figure | about 10 points | 356 |
| Expanding against uniform spacing, g = 0.034 | 1.7 points | 13,558 |

Each count is 7.84 times the summed variances over the squared difference [empirical: derived from the two-proportion test, 2026-10-11, 7.84*(0.61*0.39+0.38*0.62)/0.23**2 and 3.7632/(0.42*0.49)**2 and 3.7632/(0.21*0.49)**2 and 3.7632/(0.034*0.49)**2].

Item counts on hand: the eight science decks hold 487 atoms and 998 quiz items, and `lang-core` holds 244 atoms in 17 languages (`docs/DATA-STANDARD.md`, Learning corpus). At four new atoms a day, 200 atoms take 50 days and 800 take 200 days [empirical: derived from mech:daily-route, 2026-10-11, 200/4 and 800/4].

Three conclusions follow. One person can test interleaving at its published size in about 50 days. One person cannot tell a half-size effect from zero inside a season, so a null from E1 at 100 atoms per arm reads as "no difference above 19 points". No single machine can settle fixed against expanding spacing on recall, which needs over 13,000 atoms per arm; E2 therefore reports recall with its interval and takes reviews spent as the outcome that decides.

### A Multi-User Study

| Need | Detail |
|---|---|
| Ethics review and consent | The classroom plan records no review board approval (`market-analysis.md`, Who Bucket Serves) |
| One preregistered primary endpoint | The repository names two, time to target and delayed transfer (inventory `core.md`, Contradictions); open question 8 |
| An active control | Effects shrink against treated controls [w:melby-lervag-2016-working-memory-training-far-transfer] |
| An outcome measure Bucket did not write | Experimenter-made measures double effects [w:cheung-2016-methodological-features-effect-sizes] |
| Pretest as covariate, standardized gain | Normalized gain favours groups with higher pretest scores [w:nissen-2018-normalized-gain-vs-cohens-d] |
| Follow-up at 30 days or more | Fade-out |
| A validity argument for each score's use | [w:kane-2013-validating-interpretations-uses], [w:messick-1995-validity-of-psychological-assessment], [w:aera-apa-ncme-2014-standards] |

Between two groups, the people needed per arm are 2 × 7.84 over the squared effect: 187 for 0.29 SD, 392 for 0.2 SD, 1,568 for 0.1 SD and 4,356 for the 0.06 SD that large trials average [empirical: derived from the two-sample test, 2026-10-11, 15.68/0.29**2 and 15.68/0.2**2 and 15.68/0.1**2 and 15.68/0.06**2]. Randomising atoms inside each person, as the on-device experiments do, removes between-person variance and lowers those counts; pooling such runs needs each person's consent to export.

## Anki and Duolingo

Of 187 edtech products on the map, 50 have any efficacy evidence, 27%: 24 with an independent finding and 26 with a company study [empirical: market/edtech-players.jsonl, 2026-10-11, count efficacy.level]. Anki's evidence is observational: one Step 1 point per 1,700 unique cards [empirical: w:deng-2015-anki-usmle-step1, 2026-10-11, show]. Duolingo's is observational and largely its own: 225 learners with no control group [empirical: w:jiang-2021-duolingo-reading-listening, 2026-10-11, show], and a review that kept 35 of 367 records and found outcome evidence thin [empirical: w:shortt-2021-duolingo-literature-review, 2026-10-11, show].

### What Bucket Does That They Do Not

| Bucket | Evidence | Edtech map |
|---|---|---|
| Shows each learner predicted against observed recall, retention at 7, 30 and 90 days, and transfer on sealed items | Learning differs from performance [w:soderstrom-2015-learning-versus-performance] | No player publishes per-learner retention at 30 days or transfer |
| Counts an atom as held only on produced, unaided, delayed evidence, with understanding and use as separate marks | Tiers of Known | Anki counts a self-rating; Duolingo counts a finished lesson |
| Builds a debrief from the person's own work | d = .67 [w:tannenbaum-2012-debriefs-meta] | Open ground 1 |
| Turns the person's own mistakes into questions | d = 0.80 for adaptive transfer [w:keith-2008-error-management-training-meta] | Open ground 1 |
| Teaches before it drills: worked examples with fading and an explanation prompt | g = 0.48 and g = 0.55 | Anki has no curriculum |
| Routes a miss to the resource that teaches it, and measures whether the link helps | Elaborated feedback 0.49 against 0.05 for a bare verdict | Neither does both |
| Orders atoms by a prerequisite graph with a proved shortest path | [bm:BucketMath.Learning.minimum_unit_distance] | Adaptive mastery tools do this for school mathematics alone |
| Records stated confidence and reports calibration | Calibration and Confidence | Neither |
| Logs model help and tests for dependence | 17% lower after access ended [empirical: w:bastani-et-al-2025-generative-ai-can-harm-learning, 2026-10-11, show] | AI tutors cut both ways |
| Runs experiments on the device with the result shown to the person | Measurement | Neither |
| Keeps every record on the person's computer | Founder decision, 2026-09-18 | Open ground 3 |
| States its definitions and bounds in Lean | Formal Core | Neither |
| Joins a research-career view to a learning path | Career Learning | Open ground 5 |

### What Bucket Will Not Copy

| From | Practice | Reason |
|---|---|---|
| Duolingo | A streak that resets | [w:silverman-2023-broken-streaks] |
| Duolingo | Points, hearts, leaderboards, guilt in reminders | Motivation |
| Duolingo | Rotating picked-answer drills as the main form | Recognition gives less than recall |
| Duolingo | Mixing new words in a lesson | Interleaving reverses for word lists, g = -0.39 |
| Anki | A self-rating as the record of knowing | Self-ratings are biased |
| Anki | A scheduler with no check of its own predictions | Predicted and Observed Recall |
| Anki | Cards without lessons, examples or sources | Worked examples, sources on every atom |
| Both | A claim of efficacy without a controlled measurement | Evidence Rules |
| Both | The claim that expanding intervals are the cause of retention | g = 0.034 against uniform spacing |

What Bucket keeps from Anki: spaced review, the open deck file, offline use. What it keeps from the adaptive mastery tools: placement and a prerequisite graph. Those tools have the strongest trials on the map, with small effects: Zearn at +0.09 across 22,575 students and ALEKS level with classroom teaching at g = 0.05 [empirical: market/edtech-landscape.md, 2026-10-11, Evidence of learning]. A Bucket trial may show as little.

## Deck and Content Standard

A deck is the file format of bead `bkt-twjy`: SQLite plus a manifest with title, language, counts, version, sha256, source, licence, curator and card fields. Each atom and item is a record under `docs/DATA-STANDARD.md`, kinds `atom` and `quiz-fact`. The mechanisms need more than that format carries today.

### Manifest Fields

| Field | Values | Mechanism served |
|---|---|---|
| `interleave` | `confusable` or `none` | Interleaving |
| `kind` | `words`, `science`, `own` | Lessons and Decks |
| `grade` | `practice` or `measured` | A `measured` deck meets every sealed-item rule below |
| `sealed_sha256` | Hash over the sealed items | Shows the sealed set is unchanged between versions |
| `scheduler_floor` | Lowest app version whose scheduler the deck was checked with | Spacing and the Scheduler |

### Atom Fields

| Field | Rule | Mechanism served |
|---|---|---|
| `source` with a URL, and `sources` | One or more, each resolvable; `source.url` is absent on the worked example in the data standard today | The resource link; Evidence of Knowing |
| `footing` | How the claim is known, in the founder's truth tiers | Tiers of Known |
| `relations` of type `requires` | Acyclic under a rank witness [bm:BucketMath.Graph.acyclic_of_rank]; each edge with a verification status | The Prerequisite Graph |
| `confusable_with` | Atoms a learner mixes up with this one | Interleaving |
| `worked_examples` | One or more with numbered steps, on atoms of type method or equation | Worked Examples and Fading |
| `explain_prompt` and `key_points` | One prompt, two to four key points | Self-Explanation |
| `quiz` | Item ids, each a `quiz-fact` | Retrieval |
| `craft` | True when the atom needs a person | Apprenticeship |

### Item Fields

| Field | Rule |
|---|---|
| `role` | `practice` or `transfer`. Two or more `transfer` items per atom in a `measured` deck |
| `form`, `level` | A form from Question Forms; a level of recall, apply, derive or teach |
| `answer_format`, `accept` | Pick, word, number or order; the accepted variants and the numeric tolerance |
| `why` | The line shown on a miss, 20 tokens or fewer |
| `short` | The short stem and answer within the length limits |
| `latex` | Source for any mathematics, rendered as notation |
| Word atoms | `forms` with word and IPA per language, `gloss`, `order_tier` by frequency, an optional `keyword`, a meaning-recall and a form-recall item, and an image only with rights under the `image` facet |

### Rights and Review

Every record carries `rights` with a licence from the licence list and a `verification` status; an agent sets `asserted` and a human reviewer sets `verified` (`docs/DATA-STANDARD.md`, Rights and Verification). Deck prose states CC-BY-4.0 while the rights policy states MIT, founder decision 5 of that document, and it blocks the first curated deck. Wiktionary-derived word data is share-alike and carries its licence onto derived records.

The curation checklist for a deck: every atom has a resolvable source; every method or equation atom has a worked example; every atom has an explanation prompt; sealed items exist and appear in no lesson text; the prerequisite relation passes the rank check; every item passes the length limits; the licence is one the list holds; the manifest hash matches. A person's own deck skips the checklist, ships as `grade: practice`, and is never listed in the curated catalog.

## Formal Core

Bead `bkt-k4ch` gave each core rule a Lean definition and a replay test. It is closed, with four pull requests on `dev`. The framework extends it. Proved today:

| Rule | Theorem |
|---|---|
| Scheduling clamps | [bm:BucketMath.Fsrs.review_bounds], [bm:BucketMath.Fsrs.review_inputs_positive] |
| Log-scale grade | [bm:BucketMath.Grade.within_symm], [bm:BucketMath.Grade.within_of_closer], [bm:BucketMath.Grade.no_exact_boundary] |
| Shortest learning path | [bm:BucketMath.Learning.minimum_unit_distance], [bm:BucketMath.Learning.minimum_weighted_effort] |
| Prerequisite order | [bm:BucketMath.Graph.acyclic_of_rank], [bm:BucketMath.Graph.required_rank_lt] |

Proposed, each stated first in `BucketMath.Open` and moved out when proved. The names are proposals and resolve to nothing yet.

| Module | Statement | Replay against |
|---|---|---|
| `Level` | The attained level is a function of the event list with range 0 to 3 | The level code |
| `Level` | Appending an event never lowers the attained level, and never clears a mark | The level code |
| `Level` | A self-graded event leaves the level unchanged; an aided event never raises it above 1 | The level code |
| `Level` | Level 3 implies two qualifying events whose times differ by seven days or more, in whole seconds | The level code |
| `Level` | The current level never exceeds the attained level | The level code |
| `Gate` | If every introduced atom had all prerequisites at level 2 or above when introduced, the introduced set is closed under prerequisites, reusing `Closed` from `BucketMath.Learning` | The route code |
| `Schedule` | The fixed ladder is strictly increasing and every step lies inside the clamp; any scheduler's interval, once clamped, lies between 1 day and the cap | The scheduler wrapper |
| `Schedule` | A due date is later than its review date | The scheduler wrapper |
| `Calibration` | For forecasts and outcomes over the rationals in [0, 1], the Brier score lies in [0, 1] and is 0 exactly when each forecast equals its outcome | The report code |
| `Calibration` | Overconfidence lies in [-1, 1]; the binned reliability term is nonnegative | The report code |
| `Score` | The guess-corrected score for k options is at most 1 and is 0 at c/n = 1/k, in integers as c × k compared with n | The report code |
| `Grade` | Numeric acceptance within 1% as an integer inequality, 100 × the absolute difference at or below the absolute value of the key; it is monotone in the difference | The grader |
| `Limits` | The length limits and option parity as decidable predicates. This is bead `bkt-8y60`, which waits on the founder | The limits code |
| `Assign` | Arm assignment depends on the seed and the atom id alone, and replay returns the same arm | The experiment runner |
| `Replay` | Folding the state update over a log and its prefix agree on the prefix | The log |

Two open children of `bkt-k4ch` bear on the scheduler: a stored NaN stability still yields a NaN review (`bkt-k4ch.5`), and the Lean stability floor needs tying to the TypeScript constant (`bkt-k4ch.6`). Both close before the scheduler changes.

Lean covers none of the following: the value of predicted recall, which passes through floating-point powers; the quality of a prerequisite edge; whether a question measures its atom; any effect on a person. Those belong to Measurement.

## Build Order

Measurement comes first, so every later slice lands with its own evidence. Each slice names the bead it belongs to; a slice with no bead yet becomes a child of `bkt-0rsk` when the founder accepts this framework, labelled as agent-proposed until then.

| Slice | Work | Bead | Acceptance test |
|---|---|---|---|
| 1 | Parameter registry and the 14 conflict rulings written into the corpus | `bkt-0rsk.1` | All 146 parameters carry a status; the corpus build fails on one without |
| 2 | Review log | new child of `bkt-0rsk` | Every graded answer in every mode writes one row; replay from empty reproduces stored state byte for byte |
| 3 | Predicted against observed recall, and report version 1 | new child of `bkt-0rsk` | From a fixture log the report prints the binned plot data, Brier score and log loss that a reference script prints |
| 4 | Confidence capture and calibration | new child of `bkt-0rsk` | One tap stores a bin before reveal; the calibration panel matches the reference script; the off switch stores nothing |
| 5 | Levels and marks replace the mastery formula | new child of `bkt-0rsk`; Lean under `bkt-k4ch` | The `Level` statements sit in `BucketMath.Open` with replay vectors passing; no screen reads the old formula |
| 6 | Sealed transfer items, retention probes, deck fields | `bkt-twjy` | A `measured` deck fails validation with fewer than two sealed items on any atom; a sealed item never appears in practice across 10,000 simulated sessions; probes fall on days 7, 30 and 90 |
| 7 | Removals: streak, points, hearts, speed bonus, random trigger, FIRe, encompassing weights, confidence band | new child of `bkt-0rsk` | The nine removed mechanisms have no code path; the 25 parameters are marked removed; existing scheduler state migrates with no due date moved earlier |
| 8 | Miss screen with the why line and logged link; produced answers first | new child of `bkt-0rsk` | A miss writes feedback and link fields; a gradable item renders the produced form; the grader accepts each listed variant |
| 9 | Lessons: pretest question, worked example with fading, explanation prompt | `bkt-twjy` for fields; new child for the lesson view | One science deck passes the curation checklist; a lesson walks the fixed order; a correct fade step blanks the next |
| 10 | Debrief at a work boundary and error-based questions | new child of `bkt-0rsk` | Closing a bead opens a debrief whose every question shows a source line; no question opens during typing; a reverted commit yields a `spot_error` item |
| 11 | Experiment runner with E1 | new child of `bkt-0rsk` | Assignment is reproducible from the seed; the definition hash precedes the first event; the result panel matches the reference script |
| 12 | FSRS-6 through the library inside the clamps, the interval cap, E2 | new child of `bkt-0rsk`; `bkt-k4ch.5` and `bkt-k4ch.6` first | Replay vectors from Lean pass; no interval exceeds the cap; a stored NaN is rejected |
| 13 | Paper reading prompts, commit-first, unaided checks | new child of `bkt-0rsk` | A highlight without a question makes no card; an answer given after a model reply logs as aided |
| 14 | Career view | `bkt-1l5z` for the market question; new child for the view | Every count shows its denominator; no fit score renders; the opt-out path removes a person from the view |

Slices 1 to 4 change nothing a learner is taught. They make the app able to say what it does.

## Open Questions

1. **What "mastered" means.** Options: (a) Retained as defined here, two produced answers seven days apart; (b) the shipped formula with its 0.7 cut; (c) the twelve-item policy of [c:core:operational-mastery-policy]. Evidence: (b) has no source; (c) is the strictest and costs twelve items per atom; no literature definition of mastery is held in the corpus. The framework proposes (a), with the gap and count as defaults.
2. **The default scheduler.** Options: (a) FSRS-6 adaptive with the ladder on a tenth of atoms; (b) the fixed ladder for everything; (c) the current hand-written FSRS-5. Evidence: expanding against uniform g = 0.034; personalised review +10.0% over fixed spacing in one trial; FSRS-6 predicts better than FSRS-5. The framework proposes (a).
3. **The streak.** Options: (a) a calendar that counts up; (b) a streak with a free repair; (c) the current streak. Evidence: a broken streak lowers engagement and repair eases the drop [w:silverman-2023-broken-streaks]. The framework proposes (a).
4. **Points and hearts in word decks.** Options: remove everywhere, or keep in word lessons alone. Evidence: cognitive g = 0.49 from 19 small samples against lower motivation and scores in one course. The framework proposes removal.
5. **Target retention and the interval cap.** The 0.9 target and the 180-day cap have no confirmed work. Options: keep both as defaults, or set the target per deck by the person's stated deadline, since the best gap depends on the delay to the test [w:cepeda-2008-spacing-temporal-ridgeline].
6. **The tutor's model.** Options: local model alone; local by default with a hosted opt-in; hosted by default as coded. Evidence: a guarded tutor avoided the harm of open access; no confirmed work compares local and hosted models as tutors.
7. **The gate for a new atom.** Options: prerequisites at Recognised, Recalled or Retained. Evidence: mastery gating is contested between [w:kulik-kulik-bangert-drowns-1990-mastery-learning-meta-analysis] and [w:slavin-1987-mastery-learning-reconsidered]. Retained holds a learner for a week per layer of the graph.
8. **The primary endpoint of a human trial.** Options: time to target, or delayed transfer on unseen items. Evidence: the repository names both; the corpus advises one preregistered endpoint and held-out items.
9. **The confidence scale.** Options: four bins at 25, 50, 75 and 95%; a slider; two bins. No confirmed work in the corpus compares scales.
10. **Work records as question sources.** Options: beads, pull requests and notes on by default, or each source opt-in. Evidence bears on the method alone; the privacy choice is the founder's.
11. **Definitions.** Accept Dewey's sentence as the working definition of education and the definition of understanding under Aim, or choose another from the table.
12. **Deck licence.** CC-BY-4.0 or MIT for deck prose, decision 5 of `docs/DATA-STANDARD.md`. It blocks the first curated deck.
13. **Advisor links.** Load pairs from Academic Tree and thesis records or leave the career view without lineage. Evidence: faculty quality moves doctoral outcomes [w:waldinger-2010-faculty-quality-phd-outcomes]; Bucket holds zero pairs.
14. **A multi-user study.** Run one, which needs ethics review, an outside outcome measure and 392 people per arm to detect 0.2 SD, or stay with on-device experiments and make no general claim.
15. **Length limits in Lean.** Bead `bkt-8y60` waits on a ruling on whether the limits are fixed numbers or per-deck settings.
16. **Statements with no confirmed work.** The effect of successive relearning; a pooled effect for pretesting; the value of a resource link on a miss; the effect of showing a calibration plot; any token count for question length; a software-written debrief; how much AI use erodes skill; whether tacit skill moves through anything but contact. Each runs as a default or an experiment until a work or a measurement arrives. Decide which the next corpus pass searches first.
