# Bucket Learning Framework

Bead `bkt-0rsk.2`, under epic `bkt-0rsk`. Draft v2, 2026-10-11, revised after critic round 1. A proposal: nothing here is built, and the founder decides the items under Open Questions. The corpus it cites is `learning/corpus/` from PR #720.

| Mark | Meaning |
|---|---|
| `[w:<id>]` | A work in `learning/corpus/works.jsonl` |
| `[m:<name>]` | A method in `methods.jsonl` |
| `[c:<id>]` | An internal claim in `claims.jsonl`, with its status |
| `[mech:<id>]` | A mechanism the app runs today, in `mechanisms.jsonl` |
| `[empirical: source, date, command]` | A measured number under `docs/agents/MATH-CONTRACT.md`. The command `show` stands for `python3 tools/learning-corpus/check_refs.py --show <id>`, which prints the record the number was read from |
| `[bm:Name]` | A definition or proved theorem in BucketMath |
| No confirmed work | The corpus holds no checked source for the statement |

A number computed here from other numbers carries an empirical tag whose source begins with `derived` and whose command is the arithmetic. A proposed parameter value or definition is a choice and carries no tag. `python3 tools/learning-corpus/check_refs.py` fails when a cited id is absent from the corpus, when a number beside an empirical tag is absent from the tagged record, and when that record took its effect from a truncated abstract. Market and researcher counts cite the summaries under `learning/corpus/market/`.

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
3. It fits the learner the product has. The September roadmap sets the first user as one researcher on one machine (`learning/corpus/market/market-analysis.md`), whose learning happens inside work.
4. It keeps the credential modest. One instrumental-variable estimate puts 30% of the private return to schooling on signalling and 70% on productivity [empirical: w:aryal-2022-signaling-employer-learning-instruments, 2026-10-11, show], and the split may be unidentifiable [w:huntington-klein-2021-human-capital-signaling-unresolvable]. A Bucket record has to show retained skill to be worth more than a badge.

This is a value choice. No neutral definition of an educated person exists in the corpus [c:epistemics-impact:no-single-definition-of-educated].

### Biesta's Three Functions

| Function | What Bucket does | What Bucket measures | Limit |
|---|---|---|---|
| Qualification | Every mechanism under Mechanisms and Learning from Work | Levels, retention, transfer, calibration | Near transfer only |
| Socialisation | Each atom names its source; lessons point to primary papers; questions ask how a claim is known | No instrument today | Entry into a research practice also needs people, covered under Apprenticeship |
| Subjectification | The person picks the target, may decline any prompt, and owns the log | Nothing, by decision | An app cannot produce it and can obstruct it |

<!-- voice-ignore-next 1: verbatim quotation from the abstract -->
Subjectification "has to do with the existence of the child or student as subject of her or his own life, not as object of educational interventions" [w:biesta-2020-risking-ourselves-in-education]. Bucket's duty here is restraint: no mechanism steers behaviour for engagement. External regulation shows no link to performance or persistence and a link to lower well-being [empirical: w:howard-2021-sdt-student-motivation-meta, 2026-10-11, show]. The app states on the report screen that it measures qualification alone.

### Learned

Bucket counts a thing as learned when the person can produce it unaided, after a delay, on an item they have not memorised. Each condition answers a known failure.

| Condition | Failure it answers | Ground |
|---|---|---|
| Unaided | A score earned with a model's answer on screen can vanish when the model leaves | [c:epistemics-impact:dependence-flag], [w:bastani-et-al-2025-generative-ai-can-harm-learning] |
| After a delay | In-session performance overstates learning | [w:soderstrom-2015-learning-versus-performance] |
| Produced | Recognition gives less than recall | [empirical: w:rowland-2014-testing-effect-meta, 2026-10-11, show] |
| On varied items | One correct answer with a reason can be luck | [w:gettier-1963-justified-true-belief], [w:machery-2017-gettier-across-cultures] |
| Across sessions | A belief counts by the reliability of the process behind it | [w:goldman-1979-reliabilism-justified-belief] |

### Understanding and Recall

Recall and understanding take separate evidence. Intelligent performance is a kind of knowledge that does not reduce to holding propositions [w:ryle-1945-knowing-how-knowing-that]. Understanding is a grasp of how a body of information fits together [w:kvanvig-2003-value-of-knowledge-understanding]; a scientist understands a phenomenon when they can build a qualitative explanation without the full calculation [w:de-regt-2017-understanding-scientific-understanding]; and a person understands a pattern a model found when they can internalize it and apply it independently [w:krenn-et-al-2022-scientific-understanding-with-ai]. Perkins adds flexible performance, from a work the corpus could not confirm [w:perkins-1993-teaching-for-understanding].

The corpus holds no internal definition of understanding (`gaps.md`, Definitions Missing). This framework supplies one: a person understands an atom when they hold it at the Retained level and answer one or more sealed transfer items on it, graded by rule. People overrate how well they can explain a thing until they try [w:rozenblit-2002-illusion-of-explanatory-depth], so a self-report of understanding counts for nothing. The explanation prompt under Self-Explanation is practice toward understanding; the person checks it themselves, so it earns no mark.

### Evidence of Knowing

| Evidence | Counts as | Reason |
|---|---|---|
| A lesson opened or read | Nothing | Reading records activity [c:core:reading-is-not-mastery] |
| A self-rating, or a checklist the person ticks | Input to scheduling, and no level | Self-ratings are biased [m:metacognitive monitoring and calibration]; self-report never earns credit [c:core:practice-credential-firewall] |
| A correct pick among options | Recognised | Chance is one in three with three options [mech:three-choice-quiz] |
| A correct answer with a hint, the tutor or a model's answer shown | Recognised | Assisted performance is the thing the dependence flag separates from learning [c:epistemics-impact:dependence-flag] |
| A correct produced answer, graded by rule | Recalled | Retrieval is the event with the evidence [m:retrieval practice] |
| Correct produced answers in two sessions seven or more days apart | Retained | Reliability across occasions [w:goldman-1979-reliabilism-justified-belief] |
| A correct sealed transfer item at Retained, graded by rule | Understood | Understanding and Recall |
| A correct rule-graded answer in a debrief on the person's own work, for a person who has turned the debrief on | Used | Dewey's criterion |

### Tiers of Known

Four levels form a ladder for memory, and two marks sit beside it. Use and understanding are marks because knowing how and knowing that need separate evidence [w:ryle-1945-knowing-how-knowing-that].

| Level | Name | Requires |
|---|---|---|
| 0 | Unknown | No graded event. Unknown supplies no positive evidence [c:core:mastery-attainment-unknown] |
| 1 | Recognised | One correct rule-graded answer of any kind |
| 2 | Recalled | One correct unaided produced answer, graded by rule |
| 3 | Retained | Two correct unaided produced answers, graded by rule, in sessions seven or more days apart |

| Mark | Requires |
|---|---|
| Understood | Level 3 and one or more correct sealed transfer items |
| Used | Level 2 or above and one or more correct rule-graded debrief answers on the atom |

Each atom carries an attained level, which never falls, and a current level, which falls when a review or probe fails or the atom runs overdue. The split follows the internal distinction between current mastery and historical attainment [c:core:mastery-attainment-unknown].

These tiers grade the person. The founder's truth tiers grade the claim: "A claim's standing depends on how it is known" [c:epistemics-impact:claim-standing-by-how-known]. The app shows both, so a learner can hold a disputed atom at Retained and see that its footing is disputed. Most knowledge arrives by testimony [w:coady-1992-testimony-philosophical-study], a layperson can have good reason to believe a claim because an expert has good reason [w:hardwig-1985-epistemic-dependence], and track record weighs most when a novice chooses between experts [w:goldman-2001-experts-which-ones]. Every atom therefore carries its source, and the learning-to-learn deck teaches source checking [c:epistemics-impact:lateral-reading].

Theory of knowledge enters the product in four places: the source and `footing` fields on every atom; source-checking items in the learning-to-learn deck; a "how is this known" recall item that asks for an atom's footing; and the confidence rating, which treats belief as a matter of degree. Epistemic aims go beyond these: reliable processes, adaptation to context and caring about truth [w:barzilai-2018-apt-epistemic-performance]. No instrument for epistemic cognition is wired in, and the ten epistemic-cognition cards in the corpus name none (inventory `epistemics-impact.md`, Missing). That gap is recorded under Open Questions.

Teaching about knowledge has measured effects in students, whose ages the records leave unstated: epistemic-cognition interventions d = 0.509 on achievement across 28 samples [empirical: w:cartiff-2021-epistemic-cognition-interventions-meta, 2026-10-11, show], and instruction in critical thinking g+ = 0.30 across 341 effect sizes [empirical: w:abrami-2015-teaching-critical-thinking-meta, 2026-10-11, show]. The International Baccalaureate guide to theory of knowledge could not be confirmed [w:ibo-2020-theory-of-knowledge-guide]; one analysis finds the course stresses some strands of critical thinking and leaves others undeveloped [w:hughes-2014-tok-critical-thinking-analysis].

## Evidence Rules

### Admission

A mechanism earns a place through a confirmed work or through a Bucket measurement. A confirmed work has a DOI or page checked against its record and is not withdrawn (`learning/corpus/README.md`). The work has to test the mechanism itself. A study of a neighbouring practice, such as a team debrief led by a facilitator, grades the method and leaves an app's version of it at C.

| Grade | Evidence | Treatment |
|---|---|---|
| A | One or more confirmed meta-analyses or preregistered trials with a delayed or transfer outcome, no open contest on direction, and one or more confirmed works on adults or on people at work | On by default |
| B | Confirmed works that are contested, single trials, a method with no pooled effect, or evidence from school pupils alone | On, labelled "untested here" in the report, paired with a Bucket experiment |
| C | No confirmed work tests the mechanism | Off by default. It runs as an experiment arm with a stop date, behind consent, or stays as a declared design choice that makes no learning claim |
| D | Contradicted by confirmed evidence | Removed from defaults and from every user-facing sentence |

A Bucket measurement under Measurement admits a mechanism for the learner it was measured on. A statement about learners at large needs the multi-user study.

### Populations

The reader of this product is an adult researcher who studies alone on a desktop computer. Most of the evidence comes from school classes, from university students in laboratory sessions of an hour, or from trainees with an instructor. Every evidence table below names who was studied, in the words of the corpus record. Where a record gives a count of studies and no ages, the table says so.

| Rule | Content |
|---|---|
| What carries | The direction of an effect, as a hypothesis. The size does not carry |
| Cap | A mechanism whose confirmed works study school pupils alone, or whose records leave ages unstated, holds grade B at most |
| Why the carry-over can fail | Prior knowledge: the benefit of guidance shrinks or reverses for advanced learners [w:kalyuga-2003-expertise-reversal-effect]. Material: word pairs and school mathematics differ from research papers. Pacing: a teacher or an experimenter set the schedule in the studies, and here the person does. Selection: a person who installs a study tool differs from a class that was assigned one |
| What falsifies it for one person | The registered experiment for the mechanism names a direction. The carry-over is rejected for that person when the 95% interval of the primary outcome lies wholly on the other side of zero, and the mechanism turns off for them [empirical: derived from the registered analysis, 2026-10-11, interval excludes zero on the opposite side]. An interval that includes zero leaves the grade at B and the label "untested here" |
| What falsifies it at large | The multi-user study |

### Discounts

Published effects overstate what a product delivers.

| Finding | Studied | Tag |
|---|---|---|
| Published, small and experimenter-measured studies report effects about twice as large as large studies with independent measures | 645 studies from 12 reviews of school programmes | [empirical: w:cheung-2016-methodological-features-effect-sizes, 2026-10-11, show] |
| Large education trials average 0.06 SD with a mean interval width of 0.30 SD | 141 large trials, 1,222,024 school students | [empirical: w:lortie-forgues-2019-large-rcts-uninformative, 2026-10-11, show] |
| 36% of trial effect sizes fall below 0.05 SD | Randomized trials with standardized achievement outcomes | [empirical: w:kraft-2023-effect-size-benchmark-fail, 2026-10-11, show] |
| Fade-out is widespread and coexists with persistence | Reviews of school interventions with follow-up | [w:bailey-2020-persistence-and-fade-out], [w:hart-2024-fadeout-persistence-meta] |
| Averaging effect sizes across unlike comparisons ranks study designs more than interventions | Method papers | [w:simpson-2017-misdirection-standardised-effect-sizes], [w:bergeron-2017-hattie-pseudoscience-critique] |

Two rules follow. Bucket plans on half of any pooled effect, a planning default the founder can change under open question 20. No product sentence states an effect size without its comparison, its population and its delay.

### Contested Evidence

Where confirmed works disagree, the framework cites both, plans on the lower figure, and builds the disputed element as a switch with an experiment behind it.

| Contest | Sides | Studied | Ruling |
|---|---|---|---|
| Tutoring | 2.0 SD [empirical: w:bloom-1984-two-sigma-problem, 2026-10-11, show] against 0.288 SD pooled [empirical: w:nickow-2024-promise-of-tutoring-meta, 2026-10-11, show] and 0.16 to 0.22 SD at scale [empirical: w:kraft-2026-tutoring-at-scale-meta, 2026-10-11, show] | School pupils, preschool to grade 12 | Plan on the lower range |
| Mastery learning | ES 0.52 [empirical: w:kulik-kulik-bangert-drowns-1990-mastery-learning-meta-analysis, 2026-10-11, show] against no effect on standardized measures [empirical: w:slavin-1987-mastery-learning-reconsidered, 2026-10-11, show] | 108 controlled studies; elementary and secondary schools | Gate new atoms at Recalled, a light gate |
| Feedback | d near 0.79 [empirical: w:hattie-2007-power-feedback, 2026-10-11, show] against d = 0.48 [empirical: w:wisniewski-2020-power-of-feedback-revisited, 2026-10-11, show] | Syntheses of mixed samples, ages unstated | Plan on the lower; the type of feedback decides the sign |
| Problems first | g = 0.36 [empirical: w:sinha-2021-productive-failure-meta, 2026-10-11, show] against examples first [empirical: w:kirschner-sweller-clark-2006-minimal-guidance-does-not-work, 2026-10-11, show] | 53 studies, ages unstated; a review | Examples first for a new atom, with one pretest question ahead of them |
| Unskilled and unaware | [w:kruger-1999-unskilled-unaware] against an artefact reading [w:gignac-2020-dunning-kruger-artefact] | Cornell undergraduates; 929 community adults | No label on the person; calibration is plotted from their own answers |
| Deliberate practice | 18% of variance in sport and 1% among elites [empirical: w:macnamara-2016-deliberate-practice-sports, 2026-10-11, show] against 29% under a narrower definition [empirical: w:ericsson-2019-deliberate-practice-reanalysis, 2026-10-11, show] | Athletes; musicians and others | No claim that practice volume explains expertise |
| Learning styles | No required interaction [empirical: w:pashler-2008-learning-styles-evidence, 2026-10-11, show] against g = 0.31 with a crossover in 26% of measures [empirical: w:clinton-lisell-2024-learning-styles-matching-meta, 2026-10-11, show] | 21 studies, 1,712 participants | Not adopted; the second paper also advises against adoption |
| Inquiry | Minimal guidance fails [empirical: w:kirschner-sweller-clark-2006-minimal-guidance-does-not-work, 2026-10-11, show] against guided inquiry d = 0.50 on learning outcomes [empirical: w:lazonder-harmsen-2016-inquiry-based-learning-meta-analysis, 2026-10-11, show] | 72 studies of guided inquiry | Guidance is the moderator; Bucket guides |

### The 112 Unbacked Claims

The unbacked claims split by kind: 34 findings, 20 principles, 19 methods, 14 models, 12 definitions, 12 measures and 1 mechanism [empirical: learning/corpus/claims.jsonl, 2026-10-11, count kind where status is unbacked].

| Group | Count | Rule |
|---|---|---|
| Definitions, models, measures, principles | 58 | Bucket's own design statements. Each takes the status `design`, an owner, and a place in this framework. An empirical statement inside one is split out as a finding |
| Methods and the one mechanism | 20 | Each maps to a subsection of Mechanisms and takes that subsection's grade. Gap fill already found works for two: teach-back [c:core:teach-back-protege-effect] and tacit transfer [c:career-work:apprenticeship-transfers-tacit-knowledge] |
| Findings | 34 | Empirical. Each gets a confirmed work in the next corpus pass or leaves every user-facing surface: site copy, app strings, grant drafts |

Findings in use today that fall under the third rule: the 85% and 0.14% hiring figures in `learning/EPIC.md` [empirical: c:core:skills-based-hiring-gap, 2026-10-11, show], the streak retention figures [c:core:streak-loss-aversion], and day 7 as the habit checkpoint [c:core:day-7-habit-checkpoint]. The two founder theses stay in the corpus labelled as theses and appear nowhere as findings [c:epistemics-impact:ai-holding-capability-back] [c:epistemics-impact:education-reduces-existential-risk].

### The 11 Contradicted Claims

Each contradicted claim keeps its record with the status `contradicted-by-evidence`, and its source file gains one line giving the replacement.

| Claims | Replacement | Works |
|---|---|---|
| [c:core:bloom-two-sigma], [c:epistemics-impact:two-sigma-problem], [c:career-work:bloom-two-sigma-and-deflation] | Tutoring adds 0.288 SD pooled and 0.16 to 0.22 SD in large programmes on independent tests. Bloom's figure came from two dissertations on narrow tests [empirical: w:nickow-2024-promise-of-tutoring-meta, 2026-10-11, show] [empirical: w:kraft-2026-tutoring-at-scale-meta, 2026-10-11, show] | [w:von-hippel-2024-two-sigma-tutoring], [w:kraft-2026-tutoring-at-scale-meta] |
| [c:core:mastery-learning-effect], [c:epistemics-impact:mastery-learning-meta-analysis] | Mastery learning shows moderate effects on experimenter-made tests that do not persist and no effect on standardized measures | [w:slavin-1987-mastery-learning-reconsidered] |
| [c:core:feedback-power-and-variance] | Feedback averages d = 0.48 with high heterogeneity [empirical: w:wisniewski-2020-power-of-feedback-revisited, 2026-10-11, show]. In an earlier synthesis over one third of interventions lowered performance [w:kluger-1996-feedback-interventions-meta] | Both |
| [c:core:deliberate-practice], [c:career-work:deliberate-practice] | Practice accounts for 18% of variance in sport performance and 1% among elites [empirical: w:macnamara-2016-deliberate-practice-sports, 2026-10-11, show]. The violinist study did not replicate | [w:macnamara-2019-ericsson-1993-replication] |
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
| [mech:fsrs-scheduler] | The document wins: FSRS-6 through the `ts-fsrs` library, with the clamp functions applied to its output. The change lands in the TypeScript code that `docs/ARCHITECTURE-TARGET.md` keeps as the oracle for the Rust port |
| [mech:elo-proficiency] | The code's point estimate stays and loses its role in mastery; it chooses items |
| [mech:fused-mastery] | Both sides retire. Levels replace the formula |
| [mech:encompassing-map] | Retired |
| [mech:fire-credit] | Retired |
| [mech:leverage-score] | The code wins: dependents count, declared a default ordering rule |
| [mech:daily-route] | A new atom opens when each prerequisite is at Recalled, between the document's "mastered" and the code's "seen once" |
| [mech:diagnostic-placement] | The code's per-atom belief stays. The document's typed answers and "not learned yet" button are added |
| [mech:assessment-run] | The document wins: sealed items, kept apart from practice |
| [mech:deterministic-grader] | The code wins: string and number match, with a normal form for expressions. Its verdict alone raises a level. An answer it cannot grade is checked by the person and raises none. Symbolic equivalence waits for a local engine |
| [mech:streak] | Both sides retire |
| [mech:socratic-tutor] | The document wins on the evaluation rig, which gates the tutor's default. The code's single-atom grounding stays |
| [mech:three-choice-quiz] | The document wins: produced answers first |
| [mech:fermi-grading] | Closed. The founder kept the margin on `bkt-gp92`, and the margin is proved safe [bm:BucketMath.Grade.correct_accepted_with_epsilon] |

## The Learner Model

### Events

Every quantity is a function of the review log, an append-only list of events. An event records the item, its atom, the time, the session, whether the answer was produced or picked, whether help was on screen, who graded it, whether it was correct, and the stated confidence. A session is a run of events with no gap over `30 minutes`, a default.

An event qualifies when it is correct, unaided, produced and graded by rule. An event the person graded, by a rating or by ticking a checklist, changes the schedule and no level or mark.

### Writes

| Writer | May write | May not |
|---|---|---|
| The rule grader | Verdicts, and through them levels and marks | |
| The person | Answers, confidence, ratings on self-checked cards, switches, the "open anyway" action | A level or a mark by assertion |
| Placement | A claimed flag at Recognised | Recalled or above |
| The tutor and any model | An aided flag on the events that follow its turn | A verdict, a level, a card |
| A deck file, on import | Deck tables | Any row of the review log |
| An experiment | Arm assignment and its own registration row, after a consent row | Anything before consent |

### Quantities

| Quantity | Symbol and range | Definition | Observed by |
|---|---|---|---|
| Attained level | L in {0, 1, 2, 3} | 3 when two qualifying events on the atom lie seven or more days apart; else 2 when one qualifying event exists; else 1 when any correct rule-graded event exists; else 0 | The log |
| Current level | C in {0, 1, 2, 3}, C at or below L | L while the latest unaided rule-graded event on the atom is correct and the atom is overdue by less than its last interval; otherwise it drops one level and stays at Recognised or above | The log and the clock |
| Understood | U, true or false | L = 3 and one or more correct sealed transfer events | The log |
| Used | W, true or false | L at or above 2 and one or more correct rule-graded debrief events naming the atom | The log |
| Memory strength | S in days, with a proved floor | The scheduler's stability | Scheduler state |
| Predicted outcome | R in [0, 1] | The scheduler's probability of a correct unaided answer at the moment of review, stored before the answer | The log |
| Observed outcome | o in {0, 1} | Correctness of a scheduled unaided produced answer | The log |
| Confidence | p in four stated bins | The probability the person states before the answer is shown | The log |
| Calibration | B in [0, 1] | Brier score, the mean of (p - o)² over answers [w:brier-1950-verification-of-forecasts-probability] | Computed |
| Overconfidence | V in [-1, 1] | Mean p minus mean o | Computed |
| Transfer | T in [0, 1] | Proportion correct on sealed transfer items, corrected for guessing when the item offers options | Computed |
| Proficiency | theta, unbounded | The Elo estimate [mech:elo-proficiency], used to choose items | State |
| Time to Retained | seconds | Active time on the atom from first event to L = 3 | The log |
| Dependence | flag | Gain with the model present whose interval lies above zero, with learning at or below zero a week later [c:epistemics-impact:dependence-flag] | The probe |

The Brier score splits into reliability, resolution and uncertainty [w:murphy-1973-vector-partition-probability-score]; the report shows reliability, the part a person can improve by adjusting stated confidence. Overconfidence has distinct forms, and overestimation and overplacement reverse on some tasks [w:moore-2008-trouble-with-overconfidence]. Bucket measures overestimation on the person's own answers and makes no comparison with other people.

The guess-corrected score for c correct of n items with k options is s = (c/n - 1/k)/(1 - 1/k), with chance at 0 and a perfect run at 1; its bounds are proved for four options in the multiplier paper's Lean package [c:epistemics-impact:guess-corrected-score].

### Formal Statements

Each quantity has a statement that fits core Lean: the levels are bounded and never fall when an event is appended, an event the person graded changes no level, the Brier score lies in [0, 1], the guess-corrected score is 0 at chance, and the scheduler's outputs sit inside proved clamps [bm:BucketMath.Fsrs.review_bounds]. Formal Core lists every statement. Predicted recall passes through a power function, which Lean does not cover for floating-point values (`docs/ARCHITECTURE-TARGET.md`, Lean); its range and its fall with time are stated over the fixed-point model and checked on the running code by replay.

The model holds no trait of the person: no ability score across fields, no learning style, no mindset label. Far transfer from one field to another is small or null [w:sala-2019-near-far-transfer-second-order-meta], so a level on one atom says nothing about an unrelated atom. The model also holds no measure of socialisation or subjectification, per Aim.

## Mechanisms

A parameter status below is one of the five under Parameters, and E1 to E8 are the experiments under Within-Person Experiments. Every grade applies the population cap.

### Retrieval

Changed. Method [m:retrieval practice]; today [mech:self-rated-review], [mech:three-choice-quiz] and [mech:daily-quiz].

| Finding | Studied | Tag |
|---|---|---|
| Quizzing against no quizzing, g = 0.499 | 48,478 students in 222 classroom studies | [empirical: w:yang-2021-classroom-quizzing-meta, 2026-10-11, show] |
| Transfer d = 0.40, interval 0.31 to 0.50, against re-exposure | 122 experiments, 10,382 people, ages unstated | [empirical: w:pan-2018-test-enhanced-transfer-meta, 2026-10-11, show] |
| Testing beats restudy at a delay, and recall tests give more than recognition tests | Laboratory studies, mostly adults | [empirical: w:rowland-2014-testing-effect-meta, 2026-10-11, show] |
| Retrieval beat concept mapping on a concept-map test | Undergraduates studying science texts | [w:karpicke-2011-retrieval-vs-concept-mapping] |

| Field | Content |
|---|---|
| Grade | A. Adults were studied, in laboratories and courses. Self-directed study over months is untested |
| Rule | An item asks for a produced answer whenever a rule can grade it: a word, a number, a short expression, an ordering. An item with no rule grader shows its answer after an attempt and the person checks it; that event feeds the scheduler and no level. The three-option form stays for first exposure in word lessons and for the timed daily quiz. Rereading a lesson is never offered as review [m:highlighting and rereading] |
| Founder direction | The three-option form was built to the founder's request for short quiz text. Putting produced answers first changes that, so it is open question 17 |
| Parameters | Due batch `50`: `default`, bounded by session time. Options `3`: `founder` direction |
| Logged | Produced or picked, option count, grader, correct, elapsed time |
| Failure | Produced answers take longer, and a strict grader marks near misses wrong. People learned less from failure feedback than from success feedback in five studies of adults [w:eskreis-winkler-2019-not-learning-from-failure]. The grader accepts listed variants, and E3 measures the cost |

Few stored answers can be graded by rule today. Of the 998 quiz items in the eight science decks, the shipped grader accepts 375: 370 because the stored answer contains a number and 5 because it is a short string. For most of the 370 the answer is a sentence that happens to hold a number, and the grader would compare that one number alone. Only 43 accepted items have an answer of 60 characters or fewer, on 39 of the 487 atoms, and 623 items have no rule at all [empirical: learning/app/corpus science decks, 2026-10-11, bun tools/learning-corpus/count_gradable.ts].

| Case | What happens |
|---|---|
| An item no rule can grade | The person answers, sees the stored answer and checks themselves. The event feeds the scheduler and raises no level |
| A sentence answer that holds a number | It counts as rule-gradable only when the deck marks the item `answer_format: number`. The grader stops inferring a key from a stray digit |
| The three-option form | Graded by rule, and it reaches Recognised |
| An atom with no rule-gradable produced item | It stops at Recognised. That is 448 of the 487 science atoms today [empirical: derived from the count above, 2026-10-11, 487-39] |
| The way out | Each atom gains one or more produced items a rule can grade: a typed short answer from the short fields, a cloze, a number, an ordering. The curation checklist requires it, and the report shows per deck how many atoms can reach Recalled |
| Word decks | A typed word is graded by string match, so word atoms can reach Retained now |

### Spacing and the Scheduler

Changed. Methods [m:spacing] and [m:knowledge tracing and scheduling models]; today [mech:fsrs-scheduler].

| Finding | Studied | Tag |
|---|---|---|
| Spaced against massed retrieval g = 0.74 over 39 effect sizes | 29 studies, ages unstated | [empirical: w:latimier-2021-spaced-retrieval-meta, 2026-10-11, show] |
| Expanding against uniform spacing g = 0.034, a nonsignificant difference, over 54 effect sizes | The same 29 studies | [empirical: w:latimier-2021-spaced-retrieval-meta, 2026-10-11, show] |
| Equal and expanding schedules are equivalent | 48 experiments, 3,411 second-language learners | [w:kim-2022-spaced-practice-l2-meta] |
| A limited advantage for expanding spacing; the amount of spacing mattered more | 128 Japanese college students, 20 word pairs | [w:nakata-2015-expanding-equal-spacing-l2] |
| The best gap is 20 to 40% of a 1-week delay, falling to 5 to 10% of a 1-year delay | More than 1,350 adults online | [empirical: w:cepeda-2008-spacing-temporal-ridgeline, 2026-10-11, show] |
| 13 sessions at 56 days matched 26 sessions at 14 days, tested at 1 to 5 years | 4 subjects, 300 word pairs, 9 years | [empirical: w:bahrick-1993-foreign-vocabulary-spacing-9-years, 2026-10-11, show] |
| Personalised review: +16.5% over massed study and +10.0% over one-size-fits-all spacing | One middle-school Spanish class, one semester | [empirical: w:lindsey-2014-personalized-review, 2026-10-11, show] |
| Log loss: FSRS-6 0.3460, FSRS-5 0.3561, half-life regression 0.4694 | 9,999 Anki collections | [empirical: w:open-spaced-repetition-srs-benchmark, 2026-10-11, show] |
| Spacing beat massing for 90% of participants while 72% believed massing had worked better | Web participants, word pairs | [empirical: w:kornell-2009-flashcards-spacing, 2026-10-11, show] |

Spacing against massing is grade A, with adults studied online for up to a year. The shape of the schedule is another matter: expanding intervals add nothing measurable over uniform ones. The evidence for FSRS is how closely it predicts other people's review logs, plus a simulation of review cost on logs from a language app [w:ye-2022-fsrs-ssp-mmc]. One trial shows an adaptive schedule improving retention over a fixed one; it used a different model, in one class of school pupils. The case for an adaptive scheduler is that it gives hard items more reviews and easy items fewer, and for this product that case is a hypothesis, grade B.

| Field | Content |
|---|---|
| What Bucket runs | FSRS-6 through `ts-fsrs` with the library's published default weights. Every value the library returns passes through the clamp functions before it is stored |
| What is proved | The clamp functions keep stability, difficulty and interval inside their bounds for any raw value [bm:BucketMath.Fsrs.review_bounds]. The proof covers the clamps of the hand-written model. That the wrapper runs on every path of the library version is a replay test still to write |
| Fit with the target architecture | `docs/ARCHITECTURE-TARGET.md` moves scheduling into the Rust `bucket-core` with the TypeScript version as its oracle, and lists last-bit agreement of `exp`, `ln` and `powf` across engines as unproven. The scheduler change lands in the oracle first. Scheduler state is compared across engines within a tolerance and never byte for byte |
| Rule | A review is due when the predicted outcome falls to the target. An atom earns scheduling credit once per session. Weights are fitted to the person only after about `1,000` reviews (`gaps.md`, Open Questions, `core:cold-start`). No interval exceeds `180 days` until predicted and observed outcomes at 90 days have been compared on this machine. Product copy says "spaced review" and makes no claim for expanding intervals |
| Parameters | Target retention `0.9`: `default`; no confirmed work fixes it [c:core:target-retention-below-100]. Weights: FSRS-6 has `21`, `sourced` to the pinned library version; the code today holds `19` FSRS-5 weights with no origin note and reads `17` of them. Maximum interval `3650 days` becomes `180`: `default` until measured. Lapse interval `1 day`: `default`. Stability floor `0.01`: a proved bound |
| Logged | The prediction, stability, difficulty and interval before the answer; days since the last review; scheduler name and version; arm |
| Failure | A scheduler that predicts badly for this person spaces items too far, and they lapse unseen. FSRS is validated on recall-style cards only (`gaps.md`, Open Questions, `core:fsrs-deck-granularity`). The calibration plot and the interval cap are the guards. New atoms pause while the due count exceeds one batch, a `default` |

The fixed ladder of `7`, `30` and `90` days no longer runs by default. It is the comparison arm of E2, behind consent.

### Interleaving

Changed. Method [m:interleaving]; today [mech:quiz-session-picker] and [mech:work-quiz-sampler].

| Finding | Studied | Tag |
|---|---|---|
| g = 0.42 overall; paintings 0.67, mathematics 0.34, word lists -0.39 | 59 studies, 158 samples, ages unstated | [empirical: w:brunmair-2019-interleaving-meta, 2026-10-11, show] |
| 61% against 38% correct one month later, d = 0.83 | 54 seventh-grade mathematics classes, preregistered | [empirical: w:rohrer-2020-interleaved-math-rct, 2026-10-11, show] |
| Learners rated massing as more effective even after seeing their own results | University students learning painters' styles | [w:kornell-2008-spacing-induction] |

| Field | Content |
|---|---|
| Grade | B. The trial with a delayed outcome studied school pupils |
| Boundary | Blocking wins for word lists. Interleaving works when categories are confusable |
| Rule | The deck manifest sets `interleave`. With `confusable`, a practice set mixes atoms joined by `confusable_with` links and sibling atoms under one parent. With `none`, the setting for word decks, new words arrive in blocks by lesson node and due words run in due order. A daily route draws from every active deck |
| Parameters | Scan size, long-form fallback, sampler slots and weights: all `default`, set by E1 |
| Logged | Arm, position in the session, the previous item's atom and category |
| Failure | Accuracy inside the session drops under interleaving, and the person may read that as failing. The report shows delayed results beside session results. The wrong setting on a word deck would cost what the word-list row shows |

### Self-Explanation

Added. Method [m:self-explanation], with [m:teaching others] and [m:elaborative interrogation]. No mechanism implements it today.

| Finding | Studied | Tag |
|---|---|---|
| g = 0.55 over 69 effect sizes | 64 research reports, ages unstated | [empirical: w:bisra-2018-self-explanation-meta, 2026-10-11, show] |
| g = 0.56 for teaching with preparation and g = 0.35 for preparing to teach | 28 studies, ages unstated | [empirical: w:kobayashi-2019-learning-by-teaching-meta, 2026-10-11, show] |
| Small to moderate gains at once; limited evidence for classroom use and delayed retention | Mathematics learners, school to university | [w:rittle-johnson-2017-self-explanation-math-meta] |
| The founding studies | Students studying worked physics examples and a science text | [w:chi-et-al-1989-self-explanations-study-examples], [w:chi-et-al-1994-self-explanation] |

| Field | Content |
|---|---|
| Grade | B. Ages are unstated in the pooled records, and delayed evidence is thin |
| Rule | Each atom carries one authored prompt and two to four key points. The prompt appears after the worked example in the first lesson and again after a miss at Recalled or above. The person writes or speaks an answer, then sees the key points and ticks the ones their answer held. The ticks are the person's own check: they are logged and they change no level and no mark. The "teach" rung of [mech:depth-ladder] becomes this prompt |
| Parameters | One prompt per atom per session: `default`, set by E4. Key points two to four: an authoring rule |
| Logged | Prompt, encrypted response, key points ticked, elapsed time, graded by the person |
| Failure | A person can tick without thinking, which is why the ticks earn nothing. Prompts on material already held waste time, so they stop once the atom is Understood |

### Worked Examples and Fading

Added. Method [m:worked examples and fading], within [m:cognitive load management].

| Finding | Studied | Tag |
|---|---|---|
| g = 0.48 over 55 studies and 181 effect sizes | Elementary to postsecondary mathematics | [empirical: w:barbieri-2023-worked-examples-math-meta, 2026-10-11, show] |
| Solution steps come out one at a time as skill grows | A review of worked-example experiments | [w:renkl-2003-example-fading] |
| The benefit shrinks or reverses for advanced learners | A review of interaction studies | [w:kalyuga-2003-expertise-reversal-effect] |

| Field | Content |
|---|---|
| Grade | B. The pooled record does not separate adults, and the reversal for advanced learners bears on researchers |
| Rule | An atom of type method or equation carries one or more worked examples with numbered steps. At Unknown and Recognised the lesson shows the full example, then a twin with the last step blank; each correct completion blanks one more step, working backward. At Recalled and above the lesson shows the problem, with the example one tap away |
| Parameters | One step removed per success: `sourced` to the fading rule. Two twin problems per atom: `default` |
| Logged | Steps shown, steps completed, example opened |
| Failure | Examples slow a learner who already holds the skill. The level gate and placement keep them away from that learner |

### Elaborated Feedback and the Resource Link

Changed. Method [m:feedback timing and type]; today [mech:wrong-answer-resource-link].

| Finding | Studied | Tag |
|---|---|---|
| Elaborated feedback 0.49, the correct answer 0.32, right or wrong alone 0.05; range -0.78 to 2.29 | 40 studies in computer-based environments, ages unstated | [empirical: w:van-der-kleij-2015-computer-feedback-meta, 2026-10-11, show] |
| d = 0.41 over 607 effect sizes; over one third of interventions lowered performance; feedback loses value as it draws attention to the self | 23,663 observations, ages unstated | [empirical: w:kluger-1996-feedback-interventions-meta, 2026-10-11, show] |
| d = 0.48 over 435 studies, with high heterogeneity | More than 61,000 people, ages unstated | [empirical: w:wisniewski-2020-power-of-feedback-revisited, 2026-10-11, show] |
| Classroom quizzes favour immediate feedback; laboratory studies favour delayed | 53 studies of verbal learning; university students | [w:kulik-1988-feedback-timing-meta], [w:butler-2007-feedback-timing-type] |
| People learned less from failure feedback than from success feedback | Five studies, 1,674 adults | [w:eskreis-winkler-2019-not-learning-from-failure] |

| Field | Content |
|---|---|
| Grade | B for an explanation over a bare verdict, since ages are unstated. C for the link, which no confirmed work tests; it stays as a declared design choice the founder asked for, and E6 tests it |
| Rule on a miss | The screen shows the correct answer, a why line within the length limit, and one "learn this" link to the resource that teaches the atom. All of it describes the task [w:shute-2008-formative-feedback-review]. The screen carries no praise, no blame, no comparison with other people, and no loss of points or streak |
| Rule on a correct answer | A mark, with the why line one tap away |
| Timing | At once in practice. After the run ends in sealed items and outcome tests |
| Link | The existing resolution order stays: the atom's lesson, an excerpt's evidence anchor, a work's DOI page. A link found by term match is labelled "related" |
| Parameters | Why line `20` tokens: `founder` direction, value `default`. Shared key terms for a term match `2`: `default` |
| Logged | Feedback shown, link target, link followed, time on the resource, and the result of the next attempt on the item. Today none of this is recorded |
| Failure | Feedback harms when it turns attention to the self. A miss screen can read as a verdict on the person; a link can pull the person out of the session; a term-matched link can teach the wrong thing |

### Pretesting

Added. Methods [m:pretesting] and [m:productive failure].

| Finding | Studied | Tag |
|---|---|---|
| Failed pretest attempts improved later learning beyond extra study time | Undergraduates, five experiments on one essay | [w:richland-2009-pretesting-effect] |
| Pretesting improves memory for the pretested content, with less consistent benefit for other content | A review; no pooled effect | [w:pan-2023-prequestioning-review] |
| Problems first: g = 0.36, interval 0.20 to 0.51 | 53 studies, ages unstated; the trend reverses for young children | [empirical: w:sinha-2021-productive-failure-meta, 2026-10-11, show] |

| Field | Content |
|---|---|
| Grade | B. Single experiments in undergraduates and no pooled effect |
| Rule | A lesson on a new atom opens with one question on that atom. A miss shows no miss screen; the lesson is the feedback. A pretest event never rates the scheduler. A correct, produced, rule-graded pretest sets Recalled, and the lesson may be skimmed. Placement answers count as pretests for the atoms asked |
| Parameters | One question: `default`, set by E5 |
| Logged | Role `pretest`, correct, confidence |
| Failure | A run of misses before any teaching can discourage. The question is skippable and is framed as a check of what the person already holds |

### Successive Relearning

Changed. Method [m:successive relearning]; today [mech:fsrs-scheduler] and [mech:work-quiz-miss-cards].

| Finding | Studied | Tag |
|---|---|---|
| Successive relearning improved course exam scores and long-term retention | Undergraduates in a psychology course, two experiments | [w:rawson-2013-successive-relearning-course] |
| Retrieval to criterion with spacing across sessions is potent and underused | A review; no effect size in the abstract | [w:rawson-2022-successive-relearning-review] |

| Field | Content |
|---|---|
| Grade | B. Adults in one course; no pooled effect |
| Rule | Inside a session a missed item returns, after three or more other items, until one correct produced answer. Across sessions the scheduler brings it back. An item with a correct first answer also gets a card with a first interval of `7 days`, where today a work-quiz item gets a card on a miss alone |
| Parameters | Criterion of one correct answer per session, return gap of three items, first interval: all `default`. No confirmed work in the corpus gives a criterion level |
| Logged | Attempt number within the session |
| Failure | Sessions run long. A session ends by time, with unfinished items carried to the next |

### Calibration and Confidence

Added. Method [m:metacognitive monitoring and calibration]. It replaces [mech:confidence-band] and changes [mech:self-rated-review].

| Finding | Studied | Tag |
|---|---|---|
| Metacognitive strategy instruction g = 0.50 at posttest and 0.63 at follow-up | 48 school interventions with follow-up tests | [empirical: w:de-boer-2018-metacognitive-strategy-long-term-meta, 2026-10-11, show] |
| Stated confidence can be compared with the proportion correct | Adults answering two-choice questions with probabilities | [w:lichtenstein-1977-know-more-calibration] |
| A 19% longer completion time with AI, which the developers afterwards estimated as 20% shorter | 16 experienced open-source developers, 246 tasks | [empirical: w:becker-2025-ai-experienced-open-source-developers, 2026-10-11, show] |
| The unskilled-and-unaware pattern read as an artefact | 929 community adults | [w:gignac-2020-dunning-kruger-artefact] |

| Field | Content |
|---|---|
| Grade | C as a learning mechanism: no confirmed work shows that a calibration display improves learning. It is kept as measurement, a declared design choice that makes no learning claim, with an off switch |
| Rule | Before the answer appears, the person states confidence with one tap on four bins. The report plots stated against observed for each bin. Correctness comes from the rule grader. The Again, Hard, Good, Easy buttons stay on cards the person checks themselves and feed the scheduler alone |
| Parameters | Four bins labelled `10%`, `40%`, `70%` and `95%`: `default`, open question 9. The lowest bin sits near the chance level of a produced answer |
| Logged | Confidence bin and time to state it |
| Failure | One more tap per item. A person who taps the same bin every time yields no resolution, and the report says so |

### The Prerequisite Graph and Mastery

Changed. Method [m:mastery learning]; today [mech:prereq-path-planner], [mech:daily-route], [mech:topic-graph-states], [mech:fused-mastery], [mech:depth-ladder] and [mech:grip-sphere].

| Field | Content |
|---|---|
| Proved | Every concept a target requires and the learner lacks appears on any valid path [bm:BucketMath.Learning.remaining_necessary], the prerequisite-ordered list is a shortest path [bm:BucketMath.Learning.minimum_unit_distance], and a chain under a strict rank never cycles [bm:BucketMath.Graph.acyclic_of_rank] |
| Studied | Mastery learning in 108 controlled studies, and in elementary and secondary schools for the opposing review. No adult evidence is held |
| Grade | B, contested. No prerequisite edge in the catalog has evidence behind it [c:core:learning-maps-need-empirical-checks]. The mastery formula and its cut have no source [c:epistemics-impact:mastery-formula] |
| Rule | The graph and the planner stay. The word "mastered" in the interface means current level Retained. A new atom opens when each prerequisite is at Recalled. The planner treats a current level of Recalled or above as held. The depth ladder picks the question from the level. The grip display averages levels in place of the formula |
| Edge audit | Every `requires` edge carries a verification status under `docs/DATA-STANDARD.md`. Placement and pretest questions reach atoms whose prerequisites are unheld, so the log yields the miss frequency on an atom with and without each prerequisite |
| Parameters | Gap of `7 days` and `2` sessions for Retained: `default`, open question 1. Gate at Recalled: `default`, open question 7. New atoms a day `4`: `default` |
| Logged | Level and mark transitions, derived from the log and stored for the report |
| Failure | Nothing reaches Retained in the first week, so the interface also counts Recalled. A light gate admits shaky prerequisites, which the audit exposes. A wrong edge blocks a learner, so an "open anyway" action exists and is logged |

### Diagnostic Placement

Changed. Methods [m:adaptive learning and intelligent tutoring systems] and [m:pretesting]; today [mech:diagnostic-placement] and [mech:placement-seeding].

| Finding | Studied | Tag |
|---|---|---|
| Adaptive systems g = 0.42 against teacher-led classes | 107 effect sizes, 14,321 participants, ages unstated | [empirical: w:ma-2014-its-learning-outcomes-meta, 2026-10-11, show] |
| 0.37 SD in mathematics in 4.5 months | Middle-school students in Delhi, by lottery | [empirical: w:muralidharan-2019-mindspark-rct, 2026-10-11, show] |

| Field | Content |
|---|---|
| Grade | B for adaptive placement as a method. C for this algorithm's constants: all of its parameters lack a source, and no held-out question checks a placement [mech:diagnostic-placement] |
| Rule | Answers are typed or picked and graded by rule. A "not learned yet" button replaces the self-judged "I knew it". An atom placed as known enters at Recognised, marked claimed, and gets a produced question within `7 days`. Every answer and the final beliefs are stored. After placement a check set asks a sample of unasked atoms, half placed known and half placed unknown, and the report states how many the placement got right |
| Parameters | All placement constants: `default`. Check set of `6`: `default`. They are refitted when multi-user data exists |
| Logged | Per question: atom, answer, correct, elapsed time, belief before and after. Check-set results |
| Failure | Placing too high skips atoms never learned, which the follow-up question catches. Placing too low hands an expert material they hold |

### The Tutor

Changed. Method [m:tutoring and the two-sigma claim]; today [mech:socratic-tutor] and [mech:tutor-answer-guard].

| Finding | Studied | Tag |
|---|---|---|
| Human tutoring 0.288 SD pooled | Randomized field experiments, preschool through secondary school | [empirical: w:nickow-2024-promise-of-tutoring-meta, 2026-10-11, show] |
| 0.16 to 0.22 SD for studies that match large programmes, against 0.40 SD in the full sample | 263 randomized trials of tutoring | [empirical: w:kraft-2026-tutoring-at-scale-meta, 2026-10-11, show] |
| Tutoring systems g = 0.42 against teacher-led classes and a nonsignificant -0.11 against human tutors | 107 effect sizes, 14,321 participants | [empirical: w:ma-2014-its-learning-outcomes-meta, 2026-10-11, show] |
| Step-based systems d = 0.76, human tutors 0.79, answer-based systems 0.31 | Studies of tutoring and tutoring systems | [empirical: w:vanlehn-2011-relative-effectiveness-tutoring, 2026-10-11, show] |
| Unrestricted access: practice +48 percent and unassisted exam -17 percent against control. Hints only: exam -0.4 percent, a nonsignificant difference | About 1,000 high school students in Turkey | [empirical: w:bastani-et-al-2025-generative-ai-can-harm-learning, 2026-10-11, show] |
| An AI tutor 0.63 to 1.3 SD above active learning, depending on the estimator | 194 college physics students, crossover | [empirical: w:kestin-et-al-2025-ai-tutoring-outperforms-active-learning, 2026-10-11, show] |
| Assignment raised achievement by 1.3 national percentile ranks per term, about 0.06 to 0.08 SD over a school year; a full year of active participation implies 0.14 SD. The gains resemble those of the platform without the AI coach | 18 Tennessee middle schools | [empirical: w:oreopoulos-2026-one-click-away-ai, 2026-10-11, show] |
| AI use impaired conceptual understanding; patterns that kept the learner engaged preserved learning | Developers learning a new programming library | [w:shen-2026-ai-skill-formation] |

| Field | Content |
|---|---|
| Grade | B. The trials of AI tutors disagree, and one studied adults |
| Rule | Grounding on one atom, hints in place of answers, and the leak guard all stay. Three additions. The tutor answers only after the person has an attempt on record for the item. Its first move asks for the person's own explanation. A correct answer after a tutor turn logs as aided and reaches Recognised alone. The tutor runs on a local model by default, with a hosted model as an opt-in that states what text leaves the machine. It is on by default only after the evaluation rig with a misconception set passes. No sentence in the product cites two sigma |
| Parameters | Model: a `founder` decision, open question 6; today the constant names a hosted model. Token, history and grounding limits and the daily caps: `default` |
| Logged | Each turn joined to its item and to the next unaided attempt on the atom. Today the turn and the later result are unlinked |
| Failure | A leaked answer builds dependence. A local model gives weaker hints. Both show in one figure the log can now produce: unaided results on atoms after tutor turns against atoms without |

### Motivation

Changed. Methods [m:motivation: self-determination theory], [m:motivation: expectancy-value], [m:gamification and streaks] and [m:motivation: growth mindset]; today [mech:streak] and [mech:xp-by-depth].

| Finding | Studied | Tag |
|---|---|---|
| Intrinsic motivation relates to success; external regulation shows no link to performance or persistence | 344 samples, 223,209 students | [empirical: w:howard-2021-sdt-student-motivation-meta, 2026-10-11, show] |
| Tangible, expected, performance-contingent rewards undermined intrinsic motivation; verbal praise raised it | Pooled experiments on rewards | [w:deci-koestner-ryan-1999-extrinsic-rewards-meta-analysis] |
| Choice raised intrinsic motivation, more for children | 41 studies with child and adult samples | [empirical: w:patall-cooper-robinson-2008-choice-intrinsic-motivation-meta-analysis, 2026-10-11, show] |
| Motivation interventions as a class d = 0.49, interval 0.43 to 0.56 | 38,377 participants in field settings | [empirical: w:lazowski-2016-motivation-interventions-meta, 2026-10-11, show] |
| Gamification: cognitive g = 0.49, motivational 0.36, behavioural 0.25; the cognitive effect alone was stable in rigorous studies | Samples of 19, 16 and 9 by outcome; 1,686 people for the first | [empirical: w:sailer-2020-gamification-meta, 2026-10-11, show] |
| A gamified section showed falling intrinsic motivation and weaker performance on some measures | Two sections of one university course | [w:hanus-fox-2015-gamification-classroom] |
| An intact streak raises later engagement and a broken one lowers it; the drop eases when the streak can be repaired | Seven consumer studies | [w:silverman-2023-broken-streaks] |
| Growth mindset d = 0.05, interval 0.02 to 0.09, and 0.02 in the highest-quality studies | 63 studies, 97,672 people | [empirical: w:macnamara-2023-growth-mindset-best-practices-meta, 2026-10-11, show] |
| Pay for test scores produced no gain in either city tested; pay for inputs produced gains in one or more | School students in randomized trials | [w:fryer-2011-financial-incentives-student-achievement] |

| Kept | Form in the app | Ground |
|---|---|---|
| Autonomy | The person chooses the target, the deck and the session length, and can decline any prompt | Choice, self-determination |
| Competence | Progress appears as evidence: levels, retention, the atoms a finished atom opens [c:core:unlocks-line] | Self-determination |
| Value | Questions come from the person's own work when they turn that on; the path to a target shows the count remaining, a proved minimum | Expectancy-value |
| Curiosity | The pretest question opens a gap before the lesson closes it [c:epistemics-impact:curiosity-information-gap] | Pretesting |

The evidence on streaks and points is mixed, and none of it is grade D. An intact streak raises engagement; gamification's one stable effect is a cognitive gain; the reward findings concern tangible rewards. Removing them is a product choice in line with Aim, proposed to the founder under open questions 3, 4 and 21.

| Proposed removal | Reason | Reversal |
|---|---|---|
| The streak that resets [mech:streak] | A broken streak lowers later engagement, and the app should not steer by loss | Restored as a repairable streak if sessions per week over the `28 days` after removal fall more than `25%` below the `28 days` before |
| Points [mech:xp-by-depth] | They reward the score in place of the evidence | The same threshold |
| Hearts in [mech:language-lesson-loop] | A miss that costs a life punishes errors | The same threshold |
| Guilt in reminders, leaderboards, variable rewards [c:core:inline-variable-xp] | External regulation links to lower well-being | None; these are absent today |
| Mindset messages, style matching, payment for scores | The effects above | None |

Removal hides each surface and keeps the stored counts, so a reversal restores them. A calendar of days studied replaces the streak; it counts up and has no reset. A reminder goes out once a day at most and states what is due and how long it takes, a `default` with no confirmed work behind it [c:core:value-led-notifications]. The log records how each session started and each declined prompt.

### Lessons and Decks

Changed. Today [mech:language-lesson-loop], [mech:three-depth-lesson] and the science decks. Word decks first.

| Finding | Studied | Tag |
|---|---|---|
| Intentional study: 60.1% meaning recall and 58.5% form recall at once, then 39.4% and 25.1% at a delay | 22 studies, 100 effect sizes of second-language learners | [empirical: w:webb-2020-intentional-vocabulary-meta, 2026-10-11, show] |
| The keyword method: 72% correct against 46% for a control | University students learning Russian vocabulary | [empirical: w:atkinson-1975-keyword-method-russian, 2026-10-11, show] |
| Keyword gave the best retention; rote pairs beat semantic mapping | 778 beginning learners of Spanish | [w:sagarra-2006-keyword-beginning-spanish] |
| Reading without help needs 8,000 to 9,000 word families for written text at 98% coverage | A corpus analysis, and 661 learners from 8 countries for the coverage target | [empirical: w:nation-2006-vocabulary-size-needed, 2026-10-11, show], [empirical: w:schmitt-2011-words-known-comprehension, 2026-10-11, show] |
| Encounters relate to incidental learning at r = .34 | 26 studies, 1,918 learners | [empirical: w:uchihara-2019-repetition-incidental-vocabulary-meta, 2026-10-11, show] |

New words arrive in blocks, four to a node as today, a `default`. Each word has a meaning-recall item and a form-recall item, tracked apart, because form recall falls faster. A word may carry a keyword field. Words are ordered by frequency toward the coverage figure. Review is spaced and blocked. An image appears only when it carries the meaning [m:dual coding]. Audio made by speech synthesis is labelled as such.

**Science decks.** A lesson runs in a fixed order: the pretest question, the worked example with fading, the explanation prompt, practice items, and later the sealed transfer items. The plain, core and deep texts of [mech:three-depth-lesson] stay as content and make no learning claim [c:core:three-depth-explanations]; the lesson opens on plain below Recalled and on core from Recalled up. Art stays only where it carries content [c:core:load-bearing-art-contract].

**A person's own deck.** Producing material beats reading it, d = 0.40 over 86 studies and 445 effect sizes, ages unstated [empirical: w:bertsch-2007-generation-effect-meta, 2026-10-11, show]. Highlighting by the learner gives memory 0.36 and a nonsignificant 0.20 for comprehension across 36 articles [empirical: w:ponce-2022-highlighting-meta, 2026-10-11, show], so a highlight becomes a card only when the person writes a question for it. Each own-deck item links to the note, paper or commit it came from. Own decks skip curation. Their author has seen every item, so they hold no sealed items, and their atoms stop at Retained and Used.

### Question Forms and Length Limits

Adopted. Method [m:cognitive load management]; today [mech:question-length-limits], [mech:short-fields] and [mech:work-quiz-forms].

The founder asked for short quiz text. Cognitive load theory supports fitting material to working memory [w:sweller-2019-cognitive-load-20-years], its testability is questioned [w:de-jong-2010-cognitive-load-critique], and eleven multimedia design principles show positive effects [w:noetel-2022-multimedia-design-meta-meta]. No confirmed work sets a token count. The limits stand as defaults under a founder direction, with values read from the running code [empirical: mech:question-length-limits, 2026-10-11, show].

| Limit | Value |
|---|---|
| Stem | `15` tokens, `20` for an intent question |
| Option | `5` tokens, exactly `3` options, lengths within `1` token and `30%` of characters |
| Why line | `20` tokens, `160` characters |
| Screen before answering | `30` tokens, `280` characters |
| Formula | `12` characters |
| Source links | `1` |

| Form | Method it serves |
|---|---|
| recall, cloze, and the four language forms | Retrieval |
| compare | Case comparison, d = 0.50, interval 0.44 to 0.56, over 57 experiments with ages unstated [empirical: w:alfieri-2013-case-comparison-meta, 2026-10-11, show] |
| spot_error, cause_effect | Error-Based Questions |
| estimate | Order-of-magnitude grading, symmetric and scale-free [bm:BucketMath.Grade.within_symm] [bm:BucketMath.Grade.within_scale] |
| order | Retrieval of sequence |
| true_false, which_changed | Blocked today, and they stay blocked |

Mathematics renders as typeset notation from stored LaTeX source, and the formula limit counts source characters. Numeric answers grade within `1%` or on the log scale, both statable as integer inequalities.

Speed stops changing the rating: [mech:timed-choice-rating] is removed, since no confirmed work supports rating a fast answer as easier. The time limit stays as pacing in the daily quiz and as a logged flag. A stem this short cannot hold a derive-level question, so those items use the long form inside lessons. Nothing yet measures whether a shorter question changes what a person retains.

### Dispositions

| Mechanism | Disposition | Note |
|---|---|---|
| [mech:fsrs-scheduler] | Changed | FSRS-6 library, capped interval |
| [mech:stability-only-mastery] | Removed | Unsourced constant |
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
| [mech:placement-seeding] | Changed | Enters as claimed, then verified |
| [mech:assessment-run] | Changed | Sealed items, apart from practice state |
| [mech:deterministic-grader] | Changed | Normal form; its verdict alone raises levels |
| [mech:xp-by-depth] | Removed | Founder choice, with a reversal threshold |
| [mech:streak] | Removed | Founder choice, with a reversal threshold |
| [mech:confidence-band] | Removed | Unsourced cuts; calibration replaces it |
| [mech:grip-sphere] | Changed | Averages levels |
| [mech:three-depth-lesson] | Adopted | Content, no learning claim |
| [mech:socratic-tutor] | Changed | Attempt first, local model, linked log |
| [mech:tutor-answer-guard] | Adopted | |
| [mech:learn-event-log] | Changed | The review log supersedes it |
| [mech:three-choice-quiz] | Changed | Fallback form, open question 17 |
| [mech:timed-choice-rating] | Removed | Speed bonus |
| [mech:self-rated-review] | Changed | Feeds the scheduler alone |
| [mech:quiz-session-picker] | Changed | Interleave setting |
| [mech:short-fields] | Adopted | |
| [mech:question-length-limits] | Adopted | Defaults under founder direction |
| [mech:work-quiz-forms] | Adopted | |
| [mech:work-quiz-sampler] | Changed | One switch per source |
| [mech:work-quiz-miss-cards] | Changed | A card on a first correct answer too |
| [mech:fermi-grading] | Adopted | Conflict closed |
| [mech:surprise-quiz-trigger] | Removed | An unsourced interruption of work, open question 18 |
| [mech:daily-quiz] | Changed | One switch per source; the debrief form runs as E7 |
| [mech:wrong-answer-resource-link] | Changed | Logged and tested |
| [mech:language-lesson-loop] | Changed | Hearts removed, blocked introduction |
| [mech:polingual-neighbors] | Adopted | Search aid, no learning claim |
| [mech:hai-probe-retest] | Changed | Retest on parallel items |

Of the 39 mechanisms, 9 are adopted, 21 changed and 9 removed [empirical: derived from the table above, 2026-10-11, 9+21+9]. Sixteen are added. Those marked as experiments are grade C and off until the person consents.

| Added | | | |
|---|---|---|---|
| Levels and marks | Self-explanation prompt | Worked example with fading | Pretest question |
| Confidence capture and calibration score | Review log | Retention bands and single-delay probes | Sealed transfer items |
| Experiment runner | Per-learner report | Debrief at a work boundary, an experiment | Error-based questions, an experiment |
| Feedback on real output, an experiment | Paper reading with prompts, an experiment | Commit first, with unaided checks | Career view |

## Learning from Work

The edtech map lists learning tied to a person's own working output as open ground: the nearest products grade code on set exercises, and none builds questions from the learner's own commits or papers (`learning/corpus/market/edtech-landscape.md`, Open ground). The workplace evidence below comes from teams, trainees and clinicians with an instructor or a facilitator. No confirmed work tests any of these mechanisms for one person working alone with an app. Under Admission each is grade C: off until the person turns it on, run as an experiment with a stop date, and described in the product as untested.

### Work Sources

The Work quiz card in `packages/bkt-ui/src/views/WorkQuiz.tsx` holds the switches that exist today. Nothing is read until the person sets one.

| Source | Switch today | What is read | What is kept |
|---|---|---|---|
| Tasks | "Choose tasks file" | A `.jsonl` file of tasks the person picks | Per task: id, title, status, priority, created date, sealed with the device key |
| Project folder | "Your project folder", "Use this folder", "Remove" | In that folder: the tasks file, the git log of merged changes up to `400`, and note files in two note folders | The folder path, sealed. Facts are read again on request |
| Claude chats | A checkbox, off by default | Session files under `.claude/projects` from the last `2` days, up to `200` files | Per session a stub: a hashed id, a label of `80` characters at most, the date and the count of the person's messages. Lines the secret scan flags are dropped |
| Codex chats | A checkbox, off by default | The same under `.codex/sessions` | The same |
| All of the above | "Remove all" | | Deletes the source row, turns both chat switches off, and deletes daily quizzes, coverage, cards and languages |

The daily quiz today builds its questions from the chat stubs, so chats are a source of the debrief and are named as one. The question writer sends up to `24` stub labels to a model on the same machine and refuses any address other than the loopback address (`packages/bkt/src/quiz-writer.ts`).

| Rule | Content |
|---|---|
| One switch per source | Tasks, merged changes, notes, Claude chats, Codex chats, error records and papers read each get a switch, off on install. The project folder switch, which today turns on tasks, merged changes and notes together, splits into those parts |
| Stated before it is turned on | Each switch shows one line: what it reads, what it keeps, for how long |
| What is kept | Stubs and facts as in the table, the questions written from them, and the answers. Whole chats and whole files are never copied into the store |
| For how long | Question text and source stubs for `90 days`, a `default` under open question 10. After that the log row keeps the item id, the verdict and the timing |
| Deletion | Turning a switch off offers to delete everything derived from that source, found through `source_ref`. "Remove all" stays. A separate control erases the review log |
| Nothing leaves the machine | The work-quiz tables are in the local-only list of `packages/bkt/src/store.ts`. The `attempts` table is in the sync list and writes an outbox row per attempt; the code read at `origin/dev` holds no sender for it. The review log joins the local-only list and writes no outbox row. A hosted tutor model, when the person opts in, receives atom text and never work text |
| Export | A file the person makes, by an explicit action |

### The Debrief

An experiment, E7. Today's [mech:daily-quiz] keeps running on whichever sources the person has turned on.

| Finding | Studied | Tag |
|---|---|---|
| Debriefs improve effectiveness, d = .67, about 25% over control | Teams and individuals, 46 samples, 2,136 people | [empirical: w:tannenbaum-2012-debriefs-meta, 2026-10-11, show] |
| After-action reviews d = 0.79 overall; alignment to the individual or team and objective review media contributed most | 61 studies, 107 effect sizes, 915 teams and 3,499 individuals in military, healthcare and other training | [empirical: w:keiser-2021-after-action-review-meta, 2026-10-11, show] |
| Debriefs on successes and failures improved more than debriefs on failures alone | Soldiers on navigation exercises | [w:ellis-2005-after-event-reviews-success-failure] |
| After-event reviews improved leadership development | 173 participants over 9 months | [w:derue-2012-after-event-reviews-leadership] |

| Field | Content |
|---|---|
| Grade | C. The studies above test debriefs run by people for teams and trainees. A debrief written by software from one person's records is a different thing, and no confirmed work tests it |
| Rule, when the person turns it on | A debrief opens at a work boundary: a merged change, a closed task, a finished note, or the end of the day. It never interrupts a task. It asks three to five questions built from the sources that are on. One or more cover something that went right and one or more something that went wrong. Each question shows the line of the record it came from |
| Stop | E7 ends at its registered sample or after `90 days`. Without a result in its favour the debrief form turns off and the daily quiz remains |
| What goes | The random trigger, which opens a question during active work and has no source [mech:surprise-quiz-trigger]; open question 18 |
| Parameters | Question count, days of records, the local model and its temperature: `default` |
| Logged | The source record, form, correct, confidence, and a "this question is wrong" flag |
| Failure | A local model can misread the person's work and ask a false question. The source line and the flag expose it, and the report counts flagged questions |

### Error-Based Questions

An experiment, E8.

| Finding | Studied | Tag |
|---|---|---|
| Error management training d = 0.44 overall, 0.56 for transfer after training and 0.80 for adaptive transfer | Trainees, 24 studies, 2,183 people, invited to make errors while practising a new skill | [empirical: w:keith-2008-error-management-training-meta, 2026-10-11, show] |
| People learned less from feedback on their own failures and learned equally from the failures and successes of others | Five studies, 1,674 adults | [w:eskreis-winkler-2019-not-learning-from-failure] |
| Psychological safety is associated with learning behaviour | 51 work teams; 136 samples of over 22,000 people | [w:edmondson-1999-psychological-safety-teams], [w:frazier-2016-psychological-safety-meta] |

| Field | Content |
|---|---|
| Grade | C. The training studies invite errors during practice of a new skill. A question about a past mistake in one's own work is a separate thing, carried here by analogy |
| Rule, when the person turns it on | The app builds `spot_error` and `cause_effect` questions from recorded mistakes: a reverted change, a failed check, a review comment that led to a change, a correction in a note, a missed quiz item. The question presents the artefact, "this diff", and leaves the author unnamed, which uses the finding on other people's failures. Error questions leave every export unless the person adds them |
| Parameters | Which record types count as an error: `default`, chosen by the person |
| Logged | Error source, form, correct |
| Failure | A person who reads the question as blame stops answering. A record marked as an error may have been a sound decision, so each question can be dismissed with one tap |

### Feedback on Real Output

Grade C, off until requested.

| Finding | Studied | Tag |
|---|---|---|
| Feedback interventions d = 0.41, with over one third lowering performance | 607 effect sizes, 23,663 observations, settings mixed | [empirical: w:kluger-1996-feedback-interventions-meta, 2026-10-11, show] |
| Audit and feedback: a median 4.3% absolute increase in compliance, interquartile range 0.5% to 16% | Healthcare professionals, 82 comparisons from 49 studies | [empirical: w:ivers-2012-audit-feedback-cochrane, 2026-10-11, show] |
| Improvement after multisource feedback is small | Managers, 24 longitudinal studies | [w:smither-2005-multisource-feedback-meta] |
| Correct ratings fell from 82.3% with a correct AI suggestion to 45.5% with a wrong one, among the most experienced readers | 27 radiologists reading 50 mammograms | [empirical: w:dratsch-2023-automation-bias-mammography, 2026-10-11, show] |

On request, the app states facts from objective records about a piece of output: checks passed, review comments by kind, error types that repeat across weeks, and one next step. It gives no rating of the person. A model's opinion of quality is off by default and labelled when on. The log records the request, the facts shown and whether the next step was taken. The failure is the one common to feedback: attention moves from the task to the self.

### Reading Real Papers

Grade C, a reading mode the person opens. It applies Self-Explanation and Pretesting to papers, which no confirmed work tests; the internal claim for learning from the papers themselves is unbacked [c:core:papers-as-comprehensible-input].

| Stage | Rule |
|---|---|
| Before | The app lists the atoms the paper leans on that the reader holds below Recalled, and asks one prequestion |
| During | One explanation prompt at the end of each section, which the reader may batch to the end. A highlight becomes a card only with a written question |
| After | A set of questions the next day, each tied to a locator in the paper, the `excerpt` kind of `docs/DATA-STANDARD.md` |

### Apprenticeship and Tacit Knowledge

People know more than they can tell [w:polanyi-1966-tacit-dimension]. Western laboratories took about two decades to repeat one Russian measurement, and personal contact between physicists carried the missing knowledge [w:collins-2001-tacit-knowledge-q-sapphire]. The claim that tacit knowledge converts to explicit knowledge has no evidence that a simpler account fails to explain [w:gourlay-2006-nonaka-critique]. Learning at work is described as movement from peripheral to full participation in a community's practice, from ethnographies of midwives, tailors and other trades [w:lave-1991-situated-learning]. Informal learning, learning from experience and tacit knowledge are distinct phenomena under one label [w:eraut-2004-informal-learning-workplace] [w:marsick-2001-informal-incidental-learning]. Cognitive apprenticeship brings tacit expert processes into the open [w:collins-1989-cognitive-apprenticeship]; its reviews are qualitative and report no outcome effect [w:lyons-2016-cognitive-apprenticeship-health] [w:minshew-2021-cognitive-apprenticeship-stem-graduate].

| Finding | Studied | Tag |
|---|---|---|
| Informal learning behaviour correlates with knowledge and skill at rho = .41 and with performance at rho = .42 | Working adults, 55,514 people, as a correlation | [empirical: w:cerasoli-2017-informal-learning-meta, 2026-10-11, show] |
| With active postdocs and senior students, junior students were over 4 times as likely to develop, and the principal investigator's mentoring did not predict it | 336 PhD students in the United States | [empirical: w:feldon-2019-cascading-mentorship, 2026-10-11, show] |
| Research experience paid off from 10 or more hours a week across two or more semesters | Underrepresented science students followed for 10 years | [empirical: w:hernandez-2018-undergraduate-research-dosage, 2026-10-11, show] |
| 52% of 62 evaluations found performance falling with years in practice | Practising physicians | [empirical: w:choudhry-2005-clinical-experience-quality, 2026-10-11, show] |
| The rule that most work learning is informal has weak evidence | Five literature traditions; middle managers | [w:clardy-2018-70-20-10-evidence], [w:johnson-2018-70-20-10-transfer] |

| An app can | An app cannot |
|---|---|
| Show an expert's process: worked examples drawn from real work, with each step and its reason written out | Transfer a craft skill that needs a person watching the work |
| Prompt the learner to put their own process into words | Stand in for membership of a laboratory or a team |
| Schedule practice and record what a person needs to ask someone | Verify a tacit skill with a quiz |
| Point to near peers who work on the same problem | Supply the contact itself |

An atom of type `craft` carries the line "learned with a person" and takes no Understood mark from quiz evidence. The internal claim that apprenticeship transfers tacit knowledge rests on case studies and stays labelled so [c:career-work:apprenticeship-transfers-tacit-knowledge].

### Career Learning

This part is a data view. It holds one learning mechanism, the path from a research area to the atoms it needs, which is grade C and untested. No confirmed work in the corpus shows that a career view changes what a person learns.

| What Bucket holds | Count |
|---|---|
| Distinct researchers with an ORCID or OpenAlex id | 19,407,444 |
| Of those, with two or more dated institutions | 14,006,094 |
| Linked to a grant | 58,495 |
| Advisor or advisee pairs | 0 |
| Scored advisors, unvalidated against any advising outcome | 3,934 |

Every count comes from one profile [empirical: learning/corpus/market/researcher-data.md, 2026-10-11, Headline Counts].

| Finding | Studied | Tag |
|---|---|---|
| One SD of faculty quality: +13 percentage points on a top-journal dissertation paper | Mathematics PhD students in Germany around the dismissals of 1933 | [empirical: w:waldinger-2010-faculty-quality-phd-outcomes, 2026-10-11, show] |
| A lasting 5% to 8% decline in publication after a star coauthor's death | Coauthors of 112 academic superstars | [empirical: w:azoulay-2010-superstar-extinction, 2026-10-11, show] |
| Postdoctoral mentors predicted trainee success more than graduate mentors | 18,856 researchers, mostly neuroscience | [w:lienard-2018-intellectual-synthesis-mentorship] |
| Mentoring's effects on objective career outcomes are small | Protégés in workplaces and universities | [w:allen-2004-mentoring-career-benefits-meta], [w:eby-2008-does-mentoring-matter-meta] |
| Interest fit and job satisfaction, rho = 0.19 | 39,602 workers across 105 studies | [empirical: w:hoff-2020-interest-fit-job-satisfaction-meta, 2026-10-11, show] |
| Job search interventions: odds of employment 2.67 times higher | Job seekers in 47 evaluations | [empirical: w:liu-2014-job-search-interventions-meta, 2026-10-11, show] |
| The funded-career gap of 2.11 times falls to 1.23 times after matching | Researchers in Bucket's own atlas | [empirical: c:career-work:funded-gap-mostly-selection, 2026-10-11, show] |

| Supported today | Needs advisor links or other data |
|---|---|
| Who works on a problem, from topics on the authors above | Advisor lineage and what a given advisor's students went on to do |
| Where people in a field moved, from institution-by-year histories | A validated advisor match (`gaps.md`, Open Questions, `career-work:advisor-match-outcome-test`) |
| Funding by field, with investigator links for five funders in the United States, the United Kingdom and Germany | Funding links for other funders |
| The proportion of doctorates reaching the tenure track [c:career-work:phd-tenure-track-14pct] | Job titles, degrees and careers outside academia |

A person picks a research area, the app lists the atoms that area's papers lean on, and the planner returns the shortest path to them. The view shows counts with their denominators and names thin coverage. It shows no fit score until the score is tested against outcomes, and it presents interest fit and mentoring as small effects. Person records use CC0 facts alone, with the opt-out path live and every email private (`learning/corpus/market/researcher-data.md`, Rights and Privacy). Advisor pairs would come from Academic Tree and thesis records, the second collection step in that file.

### Learning with AI

| Finding | Studied | Tag |
|---|---|---|
| A 15% average increase in issues resolved per hour, most for the less experienced | 5,172 customer-support agents | [empirical: w:brynjolfsson-2025-generative-ai-at-work, 2026-10-11, show] |
| A 26.08% increase in completed tasks, standard error 10.3% | 4,867 developers at three firms | [empirical: w:cui-2026-generative-ai-high-skilled-work, 2026-10-11, show] |
| A 19% longer completion time with AI, afterwards estimated as 20% shorter | 16 experienced open-source developers | [empirical: w:becker-2025-ai-experienced-open-source-developers, 2026-10-11, show] |
| Adenoma detection in standard colonoscopy 28.4% before and 22.4% after exposure to AI | 1,443 patients of endoscopists, before and after | [empirical: w:budzyn-2025-endoscopist-deskilling, 2026-10-11, show] |
| Unrestricted access: unassisted exam -17 percent against control | About 1,000 high school students in Turkey | [empirical: w:bastani-et-al-2025-generative-ai-can-harm-learning, 2026-10-11, show] |
| AI-assisted training is linked to faster decline in unassisted performance, and confidence does not track the decay | Population not stated in the record | [empirical: w:macnamara-et-al-2024-ai-assistance-skill-decay, 2026-10-11, show] |
| The cognitive tasks of manual flight showed more problems than hand control | 16 airline pilots in a simulator | [w:casner-2014-manual-flying-skills-retention] |
| Forcing a judgement first cut over-reliance on wrong AI answers, at a cost in speed | Participants in AI-assisted decision tasks | [w:bucinca-malaya-gajos-2021-cognitive-forcing-functions] |

How far AI use erodes skill has no confirmed magnitude. The corpus holds two randomized trials, one in school pupils and one in developers learning a library [w:shen-2026-ai-skill-formation], and one before-and-after study in clinicians.

| Rule | Status |
|---|---|
| Every answer given with a model on screen logs as aided and reaches Recognised alone | On. It is measurement and follows Tiers of Known |
| A Retained atom whose recent correct events are all aided falls due for an unaided check | On. It follows the dependence definition [c:epistemics-impact:dependence-flag] |
| Commit first: on a task the person must check, the app asks for their answer before the model's appears | Grade C as a learning mechanism, a setting the person turns on |
| The person marks skills to retain, and for those the app keeps unaided practice and logs time and quality | A setting |
| The probe reports the multiplier and the dependence flag, and its retest uses parallel items | Today the retest reuses items, so transfer is unmeasured [mech:hai-probe-retest] |

## Measurement

No real learner has been measured. The probe has run zero times [c:epistemics-impact:hai-bank-status], and the learning-system results come from 57,060 enumerated cases on 1,099 small graphs [empirical: c:epistemics-impact:planner-enumeration-result, 2026-10-11, show] and 1,200 synthetic learners [empirical: c:epistemics-impact:synthetic-prediction-experiment, 2026-10-11, show]. Measurement is the first thing built.

### Review Log

One append-only table on the device, in the local-only list. The current `attempts` table holds the item, mode, encrypted response, correct, rating, elapsed time and timestamp [mech:three-choice-quiz]; the log extends it.

| Field | Content |
|---|---|
| `id`, `at`, `session_id` | Row id, UTC milliseconds, session |
| `deck_id`, `deck_version`, `atom_id`, `item_id` | What was asked |
| `item_role` | `practice`, `transfer`, `outcome`, `probe`, `pretest`, `placement`, `debrief` |
| `form`, `depth` | Question form and depth |
| `produced`, `options_n` | Produced or picked, and the option count |
| `aided` | `none`, `hint`, `tutor`, `model_answer` |
| `graded_by` | `rule` or `self` |
| `correct`, `response` | Verdict and the encrypted response |
| `confidence` | Stated bin |
| `elapsed_ms`, `timed_out` | Timing |
| `scheduler`, `predicted_r`, `stability`, `difficulty`, `interval_days`, `days_since_last`, `due_after` | Scheduler state before the answer and the due date after |
| `experiment_id`, `arm`, `consent_id` | Experiment assignment and the consent row it rests on |
| `feedback_shown`, `link_target`, `link_followed` | Feedback on a miss |
| `source_ref` | The work record behind a question, which also drives deletion by source |

Levels and marks are functions of this table over integers and booleans, and replaying the log from empty must reproduce them exactly. Scheduler state passes through floating-point powers. `docs/ARCHITECTURE-TARGET.md` records that the engine does not replay imported attempts until a property test passes, and that last-bit agreement across engines is unproven. Scheduler state is therefore stored, and a replay inside one engine must agree with it within a stated tolerance. Rows that predate the log carry no confidence and no prediction, and the report starts its plots at the first logged row.

### Predicted and Observed Outcomes

For each scheduled unaided answer the log holds the scheduler's prediction and the outcome. The report bins predictions and plots the observed proportion in each bin against the bin's mean prediction, with the Brier score and the log loss beside it. The benchmark figures under Spacing and the Scheduler come from other people's cards; this plot is the test for this person.

A bin of n answers with observed proportion p has a 95% half-width of 1.96 times the square root of p(1 - p)/n, which at p = 0.9 is 5.9 points for 100 answers and 2.9 points for 400 [empirical: derived from the binomial variance, 2026-10-11, 1.96*sqrt(0.9*0.1/100) and 1.96*sqrt(0.9*0.1/400)]. The plot draws that band and greys any bin under `100` answers. The same plot, with stated confidence in place of the prediction, is the person's calibration plot.

### Sealed Transfer Items

Each atom in a `measured` deck carries sealed items that practice never shows. They differ from practice items in surface and keep the principle, which is near transfer; far transfer is small or null [w:sala-2019-near-far-transfer-second-order-meta] [w:simons-2016-brain-training-review], and its dimensions are set out in [w:barnett-ceci-2002-far-transfer-taxonomy].

| Rule | Content |
|---|---|
| Pool | `2` or more per atom at publication. An item is shown once, then retires to the practice pool |
| Refill | A sealed item may be a template with numeric or named slots, graded by rule, which yields a fresh instance on each use. An atom whose pool is empty and has no template shows "no sealed items left", and its mark cannot be earned again until a deck update |
| Grading | By rule alone |
| Storage | Sealed items sit in the deck file on the person's own disk, and anyone who opens the file can read them. Sealing keeps them out of practice by accident. It supports what a person learns about themselves and supports no credential; the sealed checkpoint in `learning/EPIC.md` would need items the device never holds |
| Equating | Sealed and practice items are not equated for difficulty, so the transfer score is reported alone and never set beside practice accuracy as a gain. Equating needs response data from many people [w:lord-1980-applications-of-irt] |

### Retention

Two measures, with different meanings.

Retention bands come free from the log: for every scheduled review, the days since the last exposure and the outcome, grouped into bands around `7`, `30` and `90` days. They describe retention at the moments the scheduler chose, after however many earlier reviews, and the report labels them so. They are no forgetting curve.

Single-delay probes give the curve and are an experiment, P, behind consent and off by default. An atom drawn for a probe gets one delay, `7`, `30` or `90` days after it reaches Recalled, and no review before it. The probe is one produced question; afterwards the atom returns to the scheduler with the probe's result as its first rating. The cost is stated on the consent screen: probe atoms go unreviewed for their delay and some will be forgotten. With 100 atoms in a delay cell, retention near 70% is known to within 9.0 points [empirical: derived from the binomial variance, 2026-10-11, 1.96*sqrt(0.7*0.3/100)].

| Reference point | Studied | Tag |
|---|---|---|
| Two thirds to three quarters retained at 1 year, slightly below 50% at 2 years | General and medical education retention studies | [empirical: w:custers-2010-retention-basic-science, 2026-10-11, show] |
| 62%, 44% and 34% of employees apply training at once, at six months and at one year, as trainers report it | Training professionals from 150 organizations | [empirical: w:saks-2006-transfer-activities, 2026-10-11, show] |

### The Per-Learner Report

One screen in the app, computed on the device.

| Panel | Shows |
|---|---|
| What you hold | Atoms by level and mark, per deck, attained and current |
| Memory | Predicted against observed outcomes; retention bands, labelled as conditional on the schedule; probe results when P has run |
| Calibration | Stated against observed per confidence bin; the overconfidence figure |
| Transfer | Score on sealed items, with the count behind it |
| Cost | Active seconds and reviews per Retained atom, as a median per deck |
| Work | Which sources are on, questions asked, atoms marked Used, flagged questions |
| With AI | Aided answers among correct ones; the dependence flag when a probe has run |
| Experiments | Each experiment: arms, counts, days left; its result only after it stops |
| Limits | What the sample is too small to say; which mechanisms are "untested here" |

The report states task facts. It ranks the person against nobody and gives no praise or blame. Dashboards are surveyed in [w:verbert-2013-learning-dashboards-overview-future]. No product on the edtech map shows each learner their measured retention or their transfer to new problems (`learning/corpus/market/edtech-landscape.md`, Evidence of learning).

### Within-Person Experiments

An experiment runs on one machine and no data leaves it.

| Element | Design |
|---|---|
| Consent | Each experiment, and P, starts from its own consent screen stating the arms, the duration, the cost to the person and that the result stays local. Nothing is assigned before a consent row exists. Declining changes nothing else |
| Off switch | One control per experiment. Turning it off returns every atom to the default scheduler at once, records the run as stopped, and shows its figures marked incomplete |
| Unit | The atom, or the closed task for E7 and E8. Units are assigned to two arms of equal size by a seeded hash of the seed and the unit id. A unit belongs to one experiment at a time |
| Registration | The definition, with one primary outcome, the sample size, the margin and the analysis, is hashed into the log before the first assignment |
| Outcome test | One produced, rule-graded question at the registered day, the same day in both arms. It gives no feedback and feeds no scheduler. Because a rule grades it, a correct unaided outcome, probe or transfer event is a qualifying event for the level, as any other is. An atom with no rule-gradable produced item cannot enter an experiment, so no outcome event is ever graded by the person |
| Blinding | Items carry no arm label. The result panel shows counts and days left, and no outcome figures, until the run stops |
| Stopping | At the registered sample or the registered stop date, whichever comes first, with no early look |
| Analysis | The difference in proportions with a `95%` interval, and a permutation test that reshuffles arm labels among the units, which holds whatever the dependence between them |
| Use of a result | One run may change this person's default. A sentence about the mechanism in product copy needs a second run on fresh units or the multi-user study, since eight tests at the 5% level produce 0.4 false positives on average when nothing is true [empirical: derived from the test count, 2026-10-11, 8*0.05] |
| Scope | The result holds for this person on these decks |

| Id | Arms | Primary outcome | Tests |
|---|---|---|---|
| E1 | Interleaved against blocked practice | Outcome test at day `30`; day `7` is secondary | Interleaving |
| E2 | Adaptive schedule against the fixed ladder | Outcome test at day `90`, with a registered margin | Spacing and the Scheduler |
| E3 | Produced against picked first answers | Outcome test at day `7` | Retrieval |
| E4 | Explanation prompt against none | Outcome test at day `30` | Self-Explanation |
| E5 | Pretest question against none | Outcome test at day `7` | Pretesting |
| E6 | Why line with the link against the why line alone | The next attempt on the item | The resource link |
| E7 | Debrief on a closed task against none | A question on that task at day `7`, in both arms | The Debrief |
| E8 | Error question on a recorded mistake against none | A question on that record at day `7`, in both arms | Error-Based Questions |
| P | Single-delay probes at three delays | Retention at each delay | Retention |

### The Schedule Experiment

E2 compares two policies from the day an atom reaches Recalled, day 0.

| Element | Design |
|---|---|
| Arms | Adaptive: FSRS-6 reviews as scheduled. Ladder: reviews on days `7` and `30`. Equal sizes |
| Outcome | The outcome test on day `90` to `96` in both arms. It feeds neither scheduler, so the test cannot move the schedule it measures |
| What differs by design | The time since the last review. In the ladder arm it is 60 days. In the adaptive arm it is whatever FSRS chose, and it is logged. That difference is the policy under test |
| A missed review | In either arm the item is relearned to one correct answer in the session, and the arm's schedule continues |
| A lapsed prerequisite | The atom stays in its arm. Analysis is by assigned arm |
| Secondary outcome | Reviews per atom between day 0 and the outcome test |
| Margin | `10` points of the outcome proportion, registered before the first assignment |
| Decision | A policy becomes this person's default when its outcome is not worse than the other's by the margin, at the one-sided `2.5%` level, and its review count is lower with an interval that excludes zero. Any other result changes nothing |
| Stop | The registered sample, or `365 days`. At the stop date the app reports the interval and the margin the reached sample supports, and changes a default only if the registered margin is met |

The ladder's gaps are 7 days before a 23-day wait and 23 days before a 60-day wait, 30% and 38% of the wait that follows [empirical: derived from the ladder, 2026-10-11, 7/23 and 23/60]. Both sit near the top of the band under Spacing and the Scheduler, and the best gap falls as the wait grows, so the ladder may space wider than the optimum. Showing that one arm is not worse by 10 points, at proportions near 0.6, takes 377 atoms per arm [empirical: derived from the noninferiority test, 2026-10-11, 7.84*0.48/0.10**2]. That is 754 atoms, 189 days of enrolment at four new atoms a day, and 90 more to the last outcome, 279 days in all and inside the stop date [empirical: derived from mech:daily-route, 2026-10-11, 754/4 and 189+90]. The limit is supply. The science decks hold 39 atoms with a sound rule-gradable item, so E2 runs on word decks. A person at two new atoms a day has 550 atoms with an outcome by day 365, since enrolment must end 90 days earlier; at 275 per arm the test supports a margin of 12 points and no finer [empirical: derived from the noninferiority test, 2026-10-11, 2*275 and 2.8*sqrt(0.48/275)]. The conclusion allowed at that size is "not worse by more than 12 points", which does not meet the registered margin and changes no default.

### Power

For two arms of n units each and proportions near 0.6, the difference detectable with 80% power at a two-sided 5% level is 2.8 times the square root of 2 × 0.24/n [empirical: derived from the two-proportion test, 2026-10-11, 2.8*sqrt(0.48/n) for n in 50 100 200 400 1000].

| Units per arm | Detectable difference |
|---|---|
| `50` | 27 points |
| `100` | 19 points |
| `200` | 14 points |
| `400` | 10 points |
| `1,000` | 6 points |

| Effect to detect | Size | Units per arm |
|---|---|---|
| Interleaving as in the school mathematics trial | 23 points | 71 |
| Half that difference, the planning figure | 11.5 points | 293 |
| Expanding against uniform spacing | Under 2 points on a rough conversion | Over 13,000 |

Each count is 7.84 times the summed variances over the squared difference [empirical: derived from the two-proportion test, 2026-10-11, 7.84*(0.61*0.39+0.38*0.62)/0.23**2 and 7.84*(0.555*0.445+0.44*0.56)/0.115**2 and 3.7632/(0.034*0.49)**2].

Three cautions apply. A pooled g from test scores has no exact translation into points on these items; the last row treats the standard deviation of a 0.6 proportion, 0.49, as if it were the studies' own, which is an assumption. Atoms inside one person are not independent: they share sessions, lessons and prerequisites. With m atoms per lesson and a correlation rho among them, the variance grows by `1 + (m - 1) × rho`, no estimate of rho exists, and the counts above are therefore lower bounds. The default registered sample is `100` units per arm, which detects 19 points and nothing smaller.

Item counts on hand: the eight science decks hold 487 atoms and 998 quiz items, and `lang-core` holds 244 atoms in 17 languages (`docs/DATA-STANDARD.md`, Learning corpus). At four new atoms a day, 200 atoms take 50 days [empirical: derived from mech:daily-route, 2026-10-11, 200/4]. One person can test interleaving at the size the school trial found in about that time, cannot tell a half-size effect from zero in a season, and cannot settle fixed against expanding spacing at all.

### Impact

Training research counts four criteria: reaction, learning, behaviour and results, with d = 0.60, 0.63, 0.62 and 0.62 among employees in organisational training [empirical: w:arthur-2003-training-effectiveness-meta, 2026-10-11, show]. Transfer is generalisation to the job plus maintenance over time [w:baldwin-1988-transfer-of-training-review]. Its predictors look stronger when the learner reports both sides, across 89 studies of workplace training [w:blume-2010-transfer-of-training-meta], so use is read from records and never from a survey of the learner.

| Criterion | Bucket's measure | Status |
|---|---|---|
| Reaction | None | No survey is planned |
| Learning | Levels, retention, transfer, calibration | Built by slices 2 to 6 |
| Behaviour | The Used mark, from work records, for people who turn a source on | An experiment under E7 |
| Results | Whether a task the person brought was finished | No instrument. `docs/ARCHITECTURE-TARGET.md` proposes a task-completion study. The three impact lines on the site carry no metric [c:epistemics-impact:three-impact-lines] |

### A Multi-User Study

| Need | Detail |
|---|---|
| Ethics review and consent | The classroom plan records no review board approval (`learning/corpus/market/market-analysis.md`, Who Bucket Serves) |
| One preregistered primary endpoint | The repository names two, time to target and delayed transfer (inventory `core.md`, Contradictions); open question 8 |
| An active control | Effects shrink against treated controls [w:melby-lervag-2016-working-memory-training-far-transfer] |
| An outcome measure Bucket did not write | Experimenter-made measures double effects [w:cheung-2016-methodological-features-effect-sizes] |
| Pretest as covariate | Normalized gain favours groups that start ahead [w:nissen-2018-normalized-gain-vs-cohens-d] |
| Follow-up at a month or more | Fade-out |
| A validity argument for each score's use | [w:kane-2013-validating-interpretations-uses], [w:messick-1995-validity-of-psychological-assessment], [w:aera-apa-ncme-2014-standards] |
| Adults who study alone | The population the carry-over rule leaves open |

Between two groups, the people needed per arm are 2 × 7.84 over the squared effect: 187 for 0.29 SD, 392 for 0.2 SD, 1,568 for 0.1 SD and 4,356 for the 0.06 SD that large trials average [empirical: derived from the two-sample test, 2026-10-11, 15.68/0.29**2 and 15.68/0.2**2 and 15.68/0.1**2 and 15.68/0.06**2]. Randomising atoms inside each person removes between-person variance and lowers those counts; pooling such runs needs each person's consent to export.

## Anki and Duolingo

Of 187 edtech products on the map, 50 hold any efficacy evidence: 24 an independent finding and 26 a company study [empirical: learning/corpus/market/edtech-landscape.md, 2026-10-11, first paragraph]. Anki's evidence is observational: 1 point on Step 1 per 1,700 unique cards among 72 medical students [empirical: w:deng-2015-anki-usmle-step1, 2026-10-11, show]. Duolingo's is observational and in good part its own: 225 US adults with no control group [empirical: w:jiang-2021-duolingo-reading-listening, 2026-10-11, show], and a review that kept 35 of 367 records and found outcome evidence thin [empirical: w:shortt-2021-duolingo-literature-review, 2026-10-11, show]. Bucket has no efficacy evidence either. The rows below state what it does and what that rests on.

### What Bucket Does That They Do Not

| Bucket | Rests on | Edtech map |
|---|---|---|
| Shows each learner predicted against observed outcomes, retention and transfer on sealed items | Learning differs from performance [w:soderstrom-2015-learning-versus-performance] | No player publishes per-learner retention or transfer |
| Counts an atom as held only on produced, unaided, delayed, rule-graded evidence | Tiers of Known | Anki counts a self-rating; Duolingo counts a finished lesson |
| Teaches before it drills: worked examples with fading and an explanation prompt | Grade B, school and student samples | Anki has no curriculum |
| Routes a miss to the resource that teaches it, and tests whether the link helps | Grade B for the explanation, C for the link | Neither does both |
| Orders atoms by a prerequisite graph with a proved shortest path | [bm:BucketMath.Learning.minimum_unit_distance] | Adaptive mastery tools do this for school mathematics alone |
| Records stated confidence and reports calibration | Measurement, no learning claim | Neither |
| Logs model help and tests for dependence | Learning with AI | AI tutors cut both ways |
| Runs consented experiments on the device and shows the person the result | Measurement | Neither |
| Offers questions from the person's own work and mistakes, as an experiment | Grade C. Untested for one person with an app | Open ground 1 |
| Keeps every record on the person's computer | Founder decision, 2026-09-18 | Open ground 3 |
| States its definitions and bounds in Lean | Formal Core | Neither |
| Joins a research-career view to a learning path | Grade C | Open ground 5 |

### What Bucket Will Not Copy

| From | Practice | Reason |
|---|---|---|
| Duolingo | A streak that resets, points, hearts, leaderboards, guilt in reminders | A founder choice under Motivation, with a reversal threshold |
| Duolingo | Rotating picked-answer drills as the main form | Recognition gives less than producing the answer |
| Duolingo | Mixing new words in a lesson | Interleaving reverses for word lists |
| Anki | A self-rating as the record of knowing | Self-ratings are biased |
| Anki | A scheduler with no check of its own predictions | Predicted and Observed Outcomes |
| Anki | Cards without lessons, examples or sources | Worked examples, sources on every atom |
| Both | A claim of efficacy without a controlled measurement | Evidence Rules |
| Both | The claim that expanding intervals are the cause of retention | The expanding-against-uniform row under Spacing |

What Bucket keeps from Anki: spaced review, the open deck file, offline use. What it keeps from the adaptive mastery tools: placement and a prerequisite graph. Those tools have the strongest trials on the map, in school pupils, with small effects (`learning/corpus/market/edtech-landscape.md`, Evidence of learning). A Bucket trial may show as little.

## Deck and Content Standard

A deck is the file format of bead `bkt-twjy`, as PR #719 builds it: `format` `bkt-deck`, a SQLite file, and a manifest with `id`, `title`, `kind`, `language`, `fields`, `counts`, `version`, `sha256`, `source`, `licence` and `curator`. `kind` is `words` or `cards` there, and this framework keeps those two values. Each atom and item is a record under `docs/DATA-STANDARD.md`, kinds `atom` and `quiz-fact`. The mechanisms need the additions below, each optional so that today's word packs stay valid.

### Manifest Additions

| Field | Values | Mechanism served |
|---|---|---|
| `origin` | `curated` or `own` | Lessons and Decks. An `own` deck is never listed in the catalog |
| `interleave` | `confusable` or `none`; absent reads as `none` | Interleaving |
| `grade` | `practice` or `measured`; absent reads as `practice` | A `measured` deck meets every sealed-item rule |
| `sealed_sha256` | Hash over the sealed items | Shows the sealed set is unchanged between versions |

### Atom Fields

| Field | Rule | Mechanism served |
|---|---|---|
| `source` with a URL, and `sources` | One or more, each resolvable; `source.url` is absent on the worked example in the data standard today | The resource link; Evidence of Knowing |
| `footing` | How the claim is known, in the founder's truth tiers | Tiers of Known |
| `relations` of type `requires` | Acyclic under a rank witness [bm:BucketMath.Graph.acyclic_of_rank]; each edge with a verification status | The Prerequisite Graph |
| `confusable_with` | Atoms a learner mixes up with this one | Interleaving |
| `worked_examples` | One or more with numbered steps, on atoms of type method or equation | Worked Examples and Fading |
| `explain_prompt` and `key_points` | One prompt, two to four key points | Self-Explanation |
| `quiz` | Item ids, each a `quiz-fact`. One or more must be a produced item gradable by rule, or the atom stops at Recognised | Retrieval |
| `craft` | True when the atom needs a person | Apprenticeship |

### Item Fields

| Field | Rule |
|---|---|
| `role` | `practice` or `transfer`. Two or more `transfer` items per atom in a `measured` deck |
| `template` | Optional slots and a rule that computes the answer, for refill |
| `form`, `level` | A form from Question Forms; a level of recall, apply, derive or teach |
| `answer_format`, `accept` | Pick, word, number or order; the accepted variants and the numeric tolerance. An item with neither is checked by the person and raises no level |
| `why` | The line shown on a miss, within the length limit |
| `short` | The short stem and answer within the length limits |
| `latex` | Source for any mathematics, rendered as notation |
| Word atoms | `forms` with word and IPA per language, `gloss`, `order_tier` by frequency, an optional `keyword`, a meaning-recall and a form-recall item, and an image only with rights under the `image` facet |

### Rights and Review

Every record carries `rights` with a licence from the licence list and a `verification` status; an agent sets `asserted` and a human reviewer sets `verified` (`docs/DATA-STANDARD.md`, Rights and Verification). Deck prose states CC-BY-4.0 while the rights policy states MIT, founder decision 5 of that document, and it blocks the first curated deck. Wiktionary-derived word data is share-alike and carries its licence onto derived records.

The curation checklist for a deck: every atom has a resolvable source and one or more rule-gradable items; every method or equation atom has a worked example; every atom has an explanation prompt; sealed items exist and appear in no lesson text; the prerequisite relation passes the rank check; every item passes the length limits; the licence is one the list holds; the manifest hash matches. A person's own deck skips the checklist and ships as `grade: practice`.

## Formal Core

Bead `bkt-k4ch` gave each core rule a Lean definition and a replay test. It is closed, with four pull requests on `dev`. The framework extends it. Proved today:

| Rule | Theorem |
|---|---|
| Scheduling clamps of the hand-written model | [bm:BucketMath.Fsrs.review_bounds], [bm:BucketMath.Fsrs.review_inputs_positive] |
| Log-scale grade | [bm:BucketMath.Grade.within_symm], [bm:BucketMath.Grade.within_of_closer], [bm:BucketMath.Grade.no_exact_boundary] |
| Shortest learning path | [bm:BucketMath.Learning.minimum_unit_distance], [bm:BucketMath.Learning.minimum_weighted_effort] |
| Prerequisite order | [bm:BucketMath.Graph.acyclic_of_rank], [bm:BucketMath.Graph.required_rank_lt] |

Proposed, each stated first in `BucketMath.Open` and moved out when proved. The names are proposals and resolve to nothing yet.

| Module | Statement | Replay against |
|---|---|---|
| `Level` | The attained level is a function of the event list with range 0 to 3 | The level code |
| `Level` | Appending an event never lowers the attained level, and never clears a mark | The level code |
| `Level` | An event not graded by rule leaves every level and mark unchanged; an aided event never raises a level above 1 | The level code |
| `Level` | Level 3 implies two qualifying events whose timestamps differ by seven days or more, in whole seconds | The level code |
| `Level` | The current level never exceeds the attained level | The level code |
| `Gate` | If every introduced atom had all prerequisites at level 2 or above when introduced, the introduced set is closed under prerequisites, reusing `Closed` from `BucketMath.Learning` | The route code |
| `Schedule` | The ladder is strictly increasing and every step lies inside the clamp; any scheduler's interval, once clamped, lies between the floor and the cap | The scheduler wrapper |
| `Schedule` | A due date is later than its review date | The scheduler wrapper |
| `Calibration` | For forecasts and outcomes over the rationals in [0, 1], the Brier score lies in [0, 1] and is 0 exactly when each forecast equals its outcome | The report code |
| `Calibration` | Overconfidence lies in [-1, 1]; the binned reliability term is nonnegative | The report code |
| `Score` | The guess-corrected score for k options is at most 1 and is 0 at c/n = 1/k, in integers as `c × k` compared with `n` | The report code |
| `Grade` | Numeric acceptance within one part in a hundred as an integer inequality, monotone in the difference | The grader |
| `Limits` | The length limits and option parity as decidable predicates. This is bead `bkt-8y60`, which waits on the founder | The limits code |
| `Assign` | Arm assignment depends on the seed and the unit id alone, the two arms differ in size by one at most, and replay returns the same arm | The experiment runner |
| `Consent` | Every row with an experiment id is preceded in the log by that experiment's consent row and registration row | The log |
| `Replay` | Folding the level update over a log and over its prefix agree on the prefix | The log |

Two open children of `bkt-k4ch` bear on the scheduler: a stored NaN stability still yields a NaN review (`bkt-k4ch.5`), and the Lean stability floor needs tying to the TypeScript constant (`bkt-k4ch.6`). Both close before the scheduler changes.

Lean covers none of the following: the value of a prediction, which passes through floating-point powers; whether the library calls the clamps on every path; the quality of a prerequisite edge; whether a question measures its atom; any effect on a person. Those belong to replay tests and to Measurement.

## Build Order

Measurement comes first, so every later slice lands with its own evidence. Each slice names the screen a person touches, which the launch gate requires, and the bead it belongs to. A slice with no bead yet becomes a child of `bkt-0rsk` when the founder accepts this framework, labelled agent-proposed until then.

| Slice | Work | Screen | Bead | Acceptance test |
|---|---|---|---|---|
| 1 | Parameter registry and the 14 conflict rulings written into the corpus | None; it gates the rest | `bkt-0rsk.1` | Every parameter carries a status; the corpus build fails on one without |
| 2 | Review log, local-only, with an erase control | `Review.tsx`, `Quiz.tsx` | new child | Every graded answer in every mode writes one row and no outbox row; a property test over random logs shows replay reproduces levels exactly; erase leaves zero rows |
| 3 | Predicted against observed outcomes, and report version 1 | A new Report view from `LearnHome.tsx` | new child | From a fixture log the report prints the binned plot data, Brier score and log loss that a reference script prints |
| 4 | Confidence capture and calibration | `Review.tsx`, `Quiz.tsx` | new child | One tap stores a bin before reveal; the panel matches the reference script; with the switch off no bin is stored |
| 5 | Levels and marks replace the mastery formula | `Path.tsx`, `TopicGraph.tsx`, `Grip.tsx` | new child; Lean under `bkt-k4ch` | The `Level` statements sit in `BucketMath.Open` with replay vectors passing; a property test shows no event graded by the person changes a level; the old formula is computed in shadow for `30 days` and then deleted |
| 6 | Sealed transfer items, deck fields, and rule-gradable keys for the science decks | The Library screen of PR #719, `Deck.tsx` | `bkt-twjy` | A `measured` deck fails validation with too few sealed items or an atom with no rule-gradable item; a sealed item never appears in practice across simulated sessions; a word pack from PR #719 still validates |
| 7 | Removals: streak, points, hearts, speed bonus, random trigger, FIRe, encompassing weights, confidence band. The two mastery mechanisms go in slice 5 | `LearnHome.tsx`, `Lesson.tsx` | new child, after open questions 3, 4 and 18 | No code path reaches the seven removed mechanisms; stored counts remain; no due date moves earlier in migration; the reversal threshold is computed and shown |
| 8 | Miss screen with the why line and logged link; produced answers first | `Quiz.tsx`, `WorkQuiz.tsx` | new child, after open question 17 | A miss writes the feedback and link fields; a gradable item renders the produced form; the grader accepts each listed variant |
| 9 | Lessons: pretest question, worked example with fading, explanation prompt | `Lesson.tsx` | `bkt-twjy` for fields; new child for the view | One science deck passes the curation checklist; a lesson walks the fixed order; ticking key points writes a row graded by the person and changes no level |
| 10 | One switch per work source, retention and deletion | `WorkQuiz.tsx` | new child | With every switch off, a run under a fake home directory opens no file outside the app's data folder; turning a source off and deleting leaves no row with that `source_ref`; the writer rejects a non-loopback address |
| 11 | Experiment runner, consent and off switch, with E1 | The Report view | new child | No row carries an experiment id without a prior consent row; assignment is reproducible from the seed and balanced; outcome figures stay hidden until the stop; the off switch returns atoms to the default scheduler |
| 12 | FSRS-6 through the library inside the clamps, the interval cap, E2 | `Review.tsx` | new child; `bkt-k4ch.5` and `bkt-k4ch.6` first | A replay test shows every stored interval inside the clamp; a stored NaN is rejected; old and new schedulers run side by side on the fixture log and differences are listed |
| 13 | Debrief form and error questions as E7 and E8 | `WorkQuiz.tsx` | new child | No question opens during typing; every question shows a source line; the form turns off at its stop date without a favourable result |
| 14 | Paper reading prompts, commit first, unaided checks | `Notes.tsx` and a new reading view | new child | A highlight without a question makes no card; an answer given after a model reply logs as aided |
| 15 | Career view | `Advisors.tsx` | `bkt-1l5z` for the market question; new child for the view | Every count shows its denominator; no fit score renders; the opt-out path removes a person from the view |

Slices 1 to 4 add and change nothing a learner is taught. Each later slice ships behind a setting that restores the earlier behaviour, and slice 12 keeps the old scheduler state until the person has used the new one for `30 days`.

## Open Questions

1. **What "mastered" means.** Options: (a) Retained as defined here, two produced rule-graded answers seven days apart; (b) the shipped formula with its cut; (c) the twelve-item policy of [c:core:operational-mastery-policy]. Evidence: (b) has no source; (c) is the strictest and costs twelve items per atom; no literature definition of mastery is held in the corpus. The framework proposes (a), with the gap and count as defaults.
2. **The default scheduler.** Options: (a) FSRS-6 adaptive; (b) the fixed ladder for everything; (c) the current hand-written FSRS-5. Evidence: expanding intervals add nothing over uniform ones; adaptive review beat fixed spacing in one school class; FSRS-6 predicts better than FSRS-5 on other people's cards. The framework proposes (a) at grade B.
3. **The streak.** Options: (a) a calendar that counts up; (b) a streak with a free repair; (c) the current streak. Evidence: an intact streak raises engagement, a broken one lowers it, and repair eases the drop [w:silverman-2023-broken-streaks]. This is a product choice. The framework proposes (a), with the reversal threshold under Motivation, whose value the founder sets.
4. **Points and hearts in word decks.** Options: remove everywhere, or keep in word lessons alone. Evidence: gamification's one stable effect is a cognitive gain, against falling motivation in one university course. A product choice, with the same reversal threshold.
5. **Target retention and the interval cap.** Neither default has a confirmed work. Options: keep both, or set the target per deck by the person's stated deadline, since the best gap depends on the delay to the test [w:cepeda-2008-spacing-temporal-ridgeline].
6. **The tutor's model.** Options: local model alone; local by default with a hosted opt-in; hosted by default as coded. Evidence: a hints-only tutor avoided the harm of open access among school pupils; no confirmed work compares local and hosted models as tutors.
7. **The gate for a new atom.** Options: prerequisites at Recognised, Recalled or Retained. Evidence: mastery gating is contested between [w:kulik-kulik-bangert-drowns-1990-mastery-learning-meta-analysis] and [w:slavin-1987-mastery-learning-reconsidered]. Retained holds a learner for a week per layer of the graph.
8. **The primary endpoint of a human trial.** Options: time to target, or delayed transfer on unseen items. The repository names both; the corpus advises one preregistered endpoint and held-out items.
9. **The confidence scale.** Options: four bins as proposed; a slider; two bins. No confirmed work in the corpus compares scales.
10. **Work records as question sources.** Which of tasks, merged changes, notes, Claude chats, Codex chats, error records and papers read may be offered at all; whether every one stays off until switched on, as proposed; and how long question text is kept. Chats are the source the daily quiz uses today.
11. **Definitions.** Accept Dewey's sentence as the working definition of education and the definition of understanding under Aim, or choose another from the table.
12. **Deck licence.** CC-BY-4.0 or MIT for deck prose, decision 5 of `docs/DATA-STANDARD.md`. It blocks the first curated deck.
13. **Advisor links.** Load pairs from Academic Tree and thesis records or leave the career view without lineage. Evidence: faculty quality moved doctoral outcomes in one historical sample [w:waldinger-2010-faculty-quality-phd-outcomes]; Bucket holds zero pairs.
14. **A multi-user study.** Run one, which needs ethics review, an outside outcome measure and adults who study alone, or stay with on-device experiments and make no general claim.
15. **Length limits in Lean.** Bead `bkt-8y60` waits on a ruling on whether the limits are fixed numbers or per-deck settings.
16. **Statements with no confirmed work.** The effect of successive relearning; a pooled effect for pretesting; the value of a resource link on a miss; the effect of showing a calibration plot; any token count for question length; a software-written debrief for one person; questions on one's own past mistakes; prompts while reading papers; whether a career view changes learning; how much AI use erodes skill; whether tacit skill moves through anything but contact; an instrument for epistemic cognition; a measure of impact beyond learning. Decide which the next corpus pass searches first.
17. **Produced answers ahead of the three-option form.** The founder asked for short quiz text and the three-option form was built to that. Options: keep three options as the main form; produced answers first where a rule can grade them, as proposed; produced answers in lessons alone. Evidence: recall tests give more than recognition tests in laboratory studies of adults.
18. **The daily quiz, the debrief and the random trigger.** Options: keep the daily quiz and the random trigger as they are; keep the daily quiz and drop the trigger, as proposed; add the debrief form as experiment E7. Evidence: none for an app with one person.
19. **Experiments on the person's own cards.** Whether the app may offer E1 to E8 and the probes at all, given that each withholds or changes practice on some atoms. Every one sits behind consent with an off switch as proposed.
20. **Planning on half.** Whether to plan on half of a pooled effect, on the lowest confirmed figure, or on no figure until Bucket measures one.
21. **Restraint on engagement.** Whether "no mechanism steers behaviour for engagement" is a rule of the product. It follows from Aim and costs return visits by an unknown amount.
