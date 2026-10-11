# Learning Framework Summary

Bead `bkt-0rsk.2`. Draft v2, 2026-10-11, revised after critic round 1. The full text is `docs/LEARNING-FRAMEWORK.md`; the evidence is `learning/corpus/`.

## What Bucket Counts as Learning

Education is a change in a person that shows up in what they can do next, Dewey's definition [w:dewey-1916-democracy-and-education]. A thing is learned when the person can produce it without help, after a delay, on a question they have not memorised. Bucket measures skill and knowledge alone and says so on the report screen.

Each topic sits at one of four levels: Unknown, Recognised, Recalled, Retained. Retained needs two correct produced answers a week or more apart. Only an answer a rule graded can raise a level. A self-rating, a ticked checklist and a read lesson earn nothing, and an answer given with AI help earns Recognised at most. Two marks sit beside the level: Understood, earned on a new question never seen in practice, and Used, earned in a debrief on the person's own work.

## What the Evidence Supports and for Whom

Bucket's reader is an adult researcher studying alone. Most of the evidence is from school classes and student laboratories, so only two methods hold the top grade.

| Method | Effect | Who was studied | Grade here | Source |
|---|---|---|---|---|
| Spacing against cramming | g = 0.74 | 29 studies, plus more than 1,350 adults online in a second study | A | [empirical: w:latimier-2021-spaced-retrieval-meta, 2026-10-11, show], [empirical: w:cepeda-2008-spacing-temporal-ridgeline, 2026-10-11, show] |
| Quizzing | g = 0.499 | 48,478 students in 222 classroom studies; laboratory studies of adults | A | [empirical: w:yang-2021-classroom-quizzing-meta, 2026-10-11, show] |
| Explaining to oneself | g = 0.55 | 64 research reports, ages unstated | B | [empirical: w:bisra-2018-self-explanation-meta, 2026-10-11, show] |
| An explanation on a miss | 0.49, against 0.05 for a bare right or wrong | 40 studies in computer-based environments, ages unstated | B | [empirical: w:van-der-kleij-2015-computer-feedback-meta, 2026-10-11, show] |
| Worked examples | g = 0.48 | Elementary to postsecondary mathematics | B | [empirical: w:barbieri-2023-worked-examples-math-meta, 2026-10-11, show] |
| Mixing problem types | g = 0.42 overall, and -0.39 for words | 59 studies, ages unstated; the best trial is seventh grade | B | [empirical: w:brunmair-2019-interleaving-meta, 2026-10-11, show] |

A school or laboratory finding carries to an adult researcher as a guess about direction. Its size does not carry. Small studies with their own tests report about twice the effect of large studies with independent tests [w:cheung-2016-methodological-features-effect-sizes], so Bucket plans on half, a default the founder can change.

Debriefs and learning from errors are absent from this table on purpose. Their studies are of teams and trainees with a facilitator or an instructor. Nobody has tested a debrief that software writes for one person, so under the framework's own rule both are grade C: off until the person turns them on, run as experiments with a stop date.

The evidence gives no support to: growing review intervals over even ones, mindset messages, learning styles, or the two-sigma tutoring figure. On streaks and points it is mixed. Over one third of feedback interventions lowered performance [w:kluger-1996-feedback-interventions-meta].

## The Largest Changes

1. **Mastery becomes evidence.** The formula with its cut has no source. Levels and marks replace it, and only rule-graded answers count.
2. **Measurement ships first.** A review log, a plot of predicted against observed results, retention figures, sealed questions for transfer, and a report the person sees. Today no real learner has been measured.
3. **Lessons teach before they drill.** One question first, a worked example whose steps fade, a prompt to explain, then practice. Answers are typed where a rule can grade them, which changes the three-option form the founder asked for and is a founder question.
4. **Streak, points, hearts and the speed bonus are proposed for removal.** This is a product choice, since the evidence is mixed. A stated drop in weekly sessions reverses it.
5. **Questions from the person's own work become an experiment.** A debrief at the end of a task and questions on past mistakes, both off by default. The random mid-work quiz goes.

## Privacy

The daily quiz today reads the last two days of Claude and Codex chats when the person ticks a box, and tasks, merged changes and notes when they name a project folder. The framework gives every source its own switch, off on install, with one line saying what is read and kept. The app keeps short stubs and the questions written from them, for `90 days` by default, and deletes them when a source is turned off. Only a model on the same machine reads them. Nothing leaves the computer.

## The Scheduler

Bucket runs FSRS-6 from the public library, with the proved bounds applied to its output and no interval over `180 days` until its predictions have been checked on the person's machine. The reason for an adaptive scheduler is that hard topics get more reviews and easy ones fewer. That reason is a hypothesis here: the one trial behind it studied a school class. Growing intervals are a side effect and no selling point.

## Experiments

Every experiment needs consent, has an off switch, assigns equal numbers to each arm, names one outcome and one test day for both arms before it starts, and hides its result until it stops. With `100` topics in each arm, one person can detect a difference of 19 points [empirical: derived from the two-proportion test, 2026-10-11, 2.8*sqrt(0.48/100)]. Comparing the adaptive scheduler with a fixed 7, 30 and 90 day ladder needs 377 topics in each arm [empirical: derived from the noninferiority test, 2026-10-11, 7.84*0.48/0.10**2], which most people will not reach inside a year. A claim about learners at large needs a study with other adults, 392 per group to detect 0.2 SD [empirical: derived from the two-sample test, 2026-10-11, 15.68/0.2**2].

## Counts

Of the 39 mechanisms in the app, 9 stay as they are, 21 change and 9 are removed. Sixteen are added, six of them as experiments or settings that start off. Of 146 parameters, 132 have no stated source [empirical: learning/corpus/mechanisms.jsonl, 2026-10-11, sum parameters_total and unsourced_parameters]; each now takes a status. The 14 places where documents and code disagree each get a ruling. The 11 claims the evidence contradicts each get a replacement sentence.

## Against Anki and Duolingo

Bucket shows each person their measured retention and transfer. It counts a topic as held only on produced, unaided, delayed, rule-graded answers. It teaches with examples before review. It sends a miss to the resource that teaches it and tests whether that helped. It records AI help and tests for dependence. It keeps everything on the person's computer. Of 187 edtech products mapped, 50 hold any efficacy evidence [empirical: learning/corpus/market/edtech-landscape.md, 2026-10-11, first paragraph]. Bucket holds none yet either.

## Career Data

Bucket holds 19,407,444 researcher ids and 0 advisor links [empirical: learning/corpus/market/researcher-data.md, 2026-10-11, Headline Counts]. That supports a view of who works on a problem and where people moved. It is a data view, and nothing shows it changes what a person learns.

## Decisions Needed

1. What "mastered" means
2. The default scheduler
3. The streak
4. Points and hearts in word decks
5. Target retention and the interval cap
6. The tutor's model, local or hosted
7. The gate for a new topic
8. The primary endpoint of a human trial
9. The confidence scale
10. Work records as question sources, chats included
11. The definitions of education and understanding
12. Deck licence
13. Advisor links
14. A multi-user study
15. Length limits in Lean
16. Which unsupported statements the next corpus pass searches first
17. Produced answers ahead of the three-option form
18. The daily quiz, the debrief and the random trigger
19. Experiments on the person's own cards
20. Planning on half
21. Restraint on engagement
