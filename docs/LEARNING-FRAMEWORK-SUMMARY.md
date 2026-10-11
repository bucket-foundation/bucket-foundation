# Learning Framework Summary

Bead `bkt-0rsk.2`. Draft, 2026-10-11. The full text is `docs/LEARNING-FRAMEWORK.md`; the evidence is `learning/corpus/`.

## What Bucket Counts as Learning

Education is a change in a person that shows up in what they can do next, Dewey's definition [w:dewey-1916-democracy-and-education]. A thing is learned when the person can produce it without help, after a delay, on a question they have not memorised. Bucket measures skill and knowledge alone and says so on the report screen.

Each topic sits at one of four levels: Unknown, Recognised, Recalled, Retained. Retained needs two correct produced answers a week or more apart. Two marks sit beside the level: Understood, earned by an explanation plus a new question never seen in practice, and Used, earned when the topic shows up in the person's own work. Reading a lesson earns nothing. A self-rating earns nothing. An answer given with AI help earns Recognised at most.

## What the Evidence Supports

| Method | Effect | Source |
|---|---|---|
| Spacing against cramming | g = 0.74 | [empirical: w:latimier-2021-spaced-retrieval-meta, 2026-10-11, show] |
| Debriefs after work | d = .67 | [empirical: w:tannenbaum-2012-debriefs-meta, 2026-10-11, show] |
| Explaining to oneself | g = 0.55 | [empirical: w:bisra-2018-self-explanation-meta, 2026-10-11, show] |
| Quizzing | g = 0.499 | [empirical: w:yang-2021-classroom-quizzing-meta, 2026-10-11, show] |
| An explanation on a miss | 0.49, against 0.05 for a bare right or wrong | [empirical: w:van-der-kleij-2015-computer-feedback-meta, 2026-10-11, show] |
| Worked examples | g = 0.48 | [empirical: w:barbieri-2023-worked-examples-math-meta, 2026-10-11, show] |
| Practice that allows errors | d = 0.44, and 0.80 on new kinds of task | [empirical: w:keith-2008-error-management-training-meta, 2026-10-11, show] |
| Mixing problem types | g = 0.42, reversing to -0.39 for word lists | [empirical: w:brunmair-2019-interleaving-meta, 2026-10-11, show] |

Published effects run about twice what a product delivers [w:cheung-2016-methodological-features-effect-sizes], so Bucket plans on half.

What the evidence does not support: growing review intervals over even ones, points and streaks for motivation, mindset messages, learning styles, and the two-sigma tutoring figure. Over a third of feedback interventions lower performance, the ones that turn attention from the task to the person [w:kluger-1996-feedback-interventions-meta].

## The Five Largest Changes

1. **Mastery becomes evidence.** The formula with its 0.7 cut has no source. Levels and marks replace it.
2. **Measurement ships first.** A review log, a plot of predicted against observed recall, retention checks at 7, 30 and 90 days, sealed questions for transfer, and a report the person sees. Today no real learner has been measured.
3. **Streak, points, hearts and the speed bonus go.** A calendar that counts up replaces the streak.
4. **Lessons teach before they drill.** One question first, a worked example whose steps fade, a prompt to explain, then practice. Answers are typed where a rule can grade them.
5. **Work becomes the classroom.** A debrief opens when a task closes, with questions drawn from the person's own records and their own mistakes. The random mid-work quiz goes.

## The Scheduler

Bucket runs FSRS-6 from the public library, inside the bounds already proved in Lean, with no interval over 180 days until its predictions have been checked on the person's machine. One topic in ten follows a fixed ladder of 7, 30 and 90 days, which gives clean retention figures and a comparison. The reason for an adaptive scheduler is that hard topics get more reviews and easy ones fewer. Growing intervals are a side effect and no selling point.

## Counts

Of the 39 mechanisms in the app, 9 stay as they are, 21 change and 9 are removed. Sixteen are added. Of 146 parameters, 132 have no stated source; each now takes a status, and 25 leave with the removed mechanisms [empirical: learning/corpus/mechanisms.jsonl, 2026-10-11, sum parameters_total and unsourced_parameters]. The 14 places where documents and code disagree each get a ruling. The 11 claims the evidence contradicts each get a replacement sentence, and the 34 unbacked findings leave user-facing text until a source is found.

## What One Machine Can Show

With 100 topics in each arm, an experiment on one person detects a difference of 19 points in recall. That is enough to test mixing problem types at its published size in about 50 days. It cannot settle fixed against growing intervals, which would need over 13,000 topics per arm. A claim about learners at large needs a study with other people, 392 per group to detect 0.2 SD [empirical: derived from the two-sample test, 2026-10-11, 15.68/0.2**2].

## What Bucket Does That Anki and Duolingo Do Not

It shows each person their measured retention and transfer. It counts a topic as held on produced, unaided, delayed answers. It builds questions from the person's own work and errors. It teaches with examples and explanation before review. It sends a miss to the resource that teaches it and checks whether that helped. It records AI help and tests for dependence. It keeps everything on the person's computer. Of 187 edtech products mapped, 50 have any efficacy evidence [empirical: market/edtech-players.jsonl, 2026-10-11, count efficacy.level].

## Career Data

Bucket holds 19.4 million researcher ids and zero advisor links [empirical: market/researcher-data.md, 2026-10-11, researcher-queries.sql]. Today that supports who works on a problem, where people in a field moved, and funding by field. Advisor lineage and a tested advisor match need pairs loaded from thesis records.

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
10. Work records as question sources
11. The definitions of education and understanding
12. Deck licence
13. Advisor links
14. A multi-user study
15. Length limits in Lean
16. Which unsupported statements the next corpus pass searches first
