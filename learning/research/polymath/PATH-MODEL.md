# Polymath Path Model

A testable model of the path to many languages and many fields. Evidence ids point to `works.jsonl`; arguments sit in `SYNTHESIS.md`.

Grades: **A** meta-analysis or several RCTs agree. **B** one RCT or consistent longitudinal data. **C** observational or correlational. **D** case study, self-report or extrapolation.

## Model

1. A domain is a graph of chunks and procedures. Hours buy chunks with diminishing returns per hour.
2. Transfer between domains equals shared elements plus taught structural schemas. General faculties do not transfer.
3. Each held domain costs a maintenance budget that falls as proficiency and spacing rise.
4. Combination value comes from a deep anchor plus a few distant fields at working depth.

## Steps

| # | Rule | Evidence | Grade |
|---|---|---|---|
| 1 | Anchor in one domain to working depth before adding a second at full intensity. For languages, B2 or about 8,000 word families. For fields, the point where the learner sorts problems by principle. | chi-1981-physics-expert-novice; nation-2006-vocabulary-size-reading; hu-2000-unknown-vocabulary-density; uzzi-2013-atypical-combinations | C |
| 2 | Choose the anchor by interest, aptitude tilt and distance-adjusted value. Tilt predicts the domain of achievement. | park-2007-ability-tilt-smpy; ackerman-1996-ppik-theory; li-2016-aptitude-meta | B |
| 3 | Sample broadly at low dose before committing; commit later in wicked domains. | gullich-2022-multidisciplinary-practice-meta; barth-2020-predictors-junior-senior-success; teodoridis-2019-generalists-specialists-innovation; liu-2021-exploration-exploitation-hot-streaks | B in sport, C in science |
| 4 | Sequence by proximity: next language or field shares the most elements with what is held. Close pairs go one after the other with a gap. Distant pairs may run in parallel. | thorndike-1901-influence-improvement-mental-function; singley-1989-transfer-cognitive-skill; rothman-2011-typological-primacy-model; westergaard-2017-linguistic-proximity-model; cenoz-2003-third-language-acquisition | B for languages, C for fields |
| 5 | Avoid starting two close languages at once until one passes B1. | levy-2007-inhibiting-native-language; anderson-1994-retrieval-induced-forgetting; de-bot-2007-dynamic-systems-sla | D |
| 6 | Interleave within a domain among confusable categories. Block new vocabulary. | brunmair-2019-interleaving-meta; rohrer-2020-interleaved-math-classroom-rct | A |
| 7 | Teach transfer explicitly: compare cases across fields side by side and name the shared schema. | gentner-2003-analogical-encoding; alfieri-2013-case-comparison-meta; gick-1983-schema-induction-analogical-transfer | A |
| 8 | Expect no far transfer from brain training, chess, music or bilingualism. Budget each domain on its own hours. | sala-2019-cognitive-training-second-order-meta; lehtonen-2018-bilingualism-executive-meta | A |
| 9 | Input to practice ratio for languages: input majority early, rising output and explicit focus after A2. Starting point 70:30 input to output, tested. | jeon-2016-extensive-reading-meta; norris-2000-explicit-instruction-meta; swain-1985-output-hypothesis; ../language/sla/SYNTHESIS.md | C |
| 10 | Hours per domain: language 600 to 2,200 guided hours to professional use by distance; field working depth several hundred to a few thousand hours, with returns flattening after. | fsi-2018-language-difficulty; gobet-2007-chess-practice-starting-age; heathcote-2000-power-law-repealed | C |
| 11 | Maintenance budget: spaced retrieval with gaps at 10 to 20% of the target interval. Push domains past the permastore threshold, about 3 to 6 years of exposure or advanced coursework, before cutting to maintenance. | bahrick-1984-permastore-spanish; bahrick-1991-lifetime-maintenance-math; cepeda-2008-spacing-temporal-ridgeline; rowland-2014-testing-effect-meta | B |
| 12 | Maintain receptively first; productive skill fades first and costs more to hold. | weltens-1987-attrition-school-french; schmid-2011-language-attrition | C |
| 13 | AI tutor gives hints and forces retrieval; it never supplies answers. | bastani-2024-generative-ai-harm-learning; kestin-2024-ai-tutoring-outperforms-active-learning; lehmann-2024-ai-meets-classroom | B |
| 14 | Route every new domain through a prerequisite graph and per-skill mastery estimate. | doignon-1985-knowledge-spaces; falmagne-2006-aleks-knowledge-space; corbett-1994-knowledge-tracing | B |
| 15 | Keep adding domains with age; knowledge breadth grows into middle age while fluid speed falls. | ackerman-2000-domain-knowledge-adulthood; hartshorne-2015-when-does-cognitive-functioning-peak; park-2014-synapse-project | C |

## Budget Arithmetic

A learner with 10 hours a week holds N domains when the sum of maintenance costs stays below the slack left after the active domain. The model's prior: an active domain takes 6 to 8 hours; a domain in maintenance past permastore takes 0.5 to 1 hour; one below threshold takes 2 or more. Under those priors a learner can add a domain every 1 to 3 years and hold 6 to 10 at maintenance by year 15, which matches Erard's cluster around 11 [erard-2012-babel-no-more]. Grade D until Bucket measures the costs.

## Measurements Bucket Can Run

| Test | Step | Design | Metric |
|---|---|---|---|
| Anchor threshold | 1 | Compare learners who start a second language at A2, B1 or B2 in the first | Hours to A2 in language two; first-language retention at 6 months |
| Proximity sequencing | 4, 5 | Randomize the order of a close vs distant next language among users holding one | Hours to milestone; intrusion error rate between languages |
| Parallel close pair | 5 | Users who start two close languages together vs staggered | Cross-language intrusions in FSRS reviews; lapse rate |
| Cross-domain comparison | 7 | A/B side-by-side analogue cards across decks vs single cases | Delayed transfer quiz on a held-out third domain |
| Input share | 9 | Randomize session mix at 50, 70, 90% input | Listening and speaking assessments at 3 and 6 months |
| Maintenance cost | 11, 12 | Log minutes per week and recall per held deck across proficiency bands | Minutes needed to hold 90% retention; fit of cost vs proficiency curve |
| Permastore | 11 | Follow users who stop a deck at different exposure totals | Recall at 6, 12, 24 months after stop |
| Tutor guardrail | 13 | Hint-only tutor vs answer-giving tutor vs none | Exam without tutor, two weeks later |
| Prerequisite graph | 14 | Graph-gated sequence vs free choice | Mastery per hour; dropout |
| Breadth and output | 3 | Observational: number of decks sampled before commitment | Long-run mastery and retention in the chosen deck |

Each test needs a preregistered effect threshold of 0.10 SD [kraft-2020-interpreting-effect-sizes] and a delayed measure, since immediate practice scores mislead [bastani-2024-generative-ai-harm-learning, kornell-2008-interleaving-induction].
