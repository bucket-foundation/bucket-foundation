# Research OS for K-12: Open Research Questions

Seeded 2026-09-09 from the people and funding streams in `_intake/research-os-k12/`. Three literature-review streams (educational methods, HCI and human-AI collaboration, AI for scientific discovery) extend this file with paper-level citations as they land. Each question is phrased so a study can answer it.

## Learner states

1. Do the five states (Access, Awareness, Understanding, Internalization, Production) map onto ICAP's four engagement modes, or do they form a distinct construct? Study: classify activity logs by ICAP mode and by state; test whether state predicts delayed transfer beyond ICAP mode. Comparators: Chi and Wylie 2014; Bloom's revised taxonomy; SOLO; Perkins's understanding performances.
2. Does a state classification predict forward learning rate on the next atom in the route? Study: knowledge-tracing baseline versus state-augmented model on held-out learners.
3. What is the misclassification rate of each state signal, and at what rate do teachers contest a state? Study: log contest events; sample audits by a second reviewer.
4. Does the Production state, as gated by review, show transfer to unfamiliar formats (Perkins) or format-matched performance only?

## Routing

5. Does frontier-backward routing from a chosen target improve time-to-Understanding on the target compared with Academy's forward route, and at what cost in prerequisite gaps? Study: randomized route assignment within a class.
6. Does routing from a live hypothesis-engine gap node produce productions the engine can use, and does that change learner engagement? Study: compare gap-node targets with static frontier atoms.
7. How should supports fade as state rises, given expertise reversal (Kalyuga 2003)? Study: scaffolding schedule as a factor.

## The constrained AI

8. Does a find, quote, check, organize workspace outperform a permissive explain-and-answer tutor and a no-AI control on delayed unassisted post-tests? Pre-registered three-arm RCT scored on transfer, with process measures (quotes gathered, checks run).
9. At what rate does the quote tool fabricate or misattribute a span, and does the check tool's abstain path fire when retrieval is weak? Adversarial audit on a K-12 query set (the Bender test).
10. Does the constraint change how learners judge source quality (lateral reading, McGrew and others 2019)? Study: civic online reasoning tasks before and after.
11. What is the cognitive-offloading effect of check on later unassisted claim evaluation (Bastani and others 2024; Lee and others 2025)?

## Productions and payments

12. Can student productions meet a research-grade evidence standard? Study: blind rating of accepted productions against the engine's evidence tiers; compare with citizen-science and course-based research precedents.
13. Does the prospect of a citation payment change the quality or the quantity of productions, and does it crowd out intrinsic motivation? Study: classes with recognition only versus recognition plus custodial credit.
14. Which payout structure do guardians and districts accept (guardian-as-payee, custodial account, deferred ledger), and what do state child-earnings laws require in each pilot state?

## Teacher view

15. Which process signals in the class view change teacher decisions, and which are ignored? Study: think-aloud sessions and dashboard telemetry (Holstein and others).
16. Does exposing state confidence and a contest path change teacher trust in the classifier?

## Distribution and adoption

17. Is the school-library research-skills channel a faster adoption path than a subject-teacher channel? Study: parallel pilots with a librarian lead and a teacher lead.
18. Does a Common Sense rating or a Digital Promise certification change district willingness to pilot, against the 2026 moratorium backdrop?

## Engine overlap

19. What detectability and tier should a reviewed student production carry inside the engine's belief fusion, and does adding productions change hypothesis rankings in a calibrated direction? Study: holdout calibration with and without productions.
20. Can the engine's gap-node queue serve as a curriculum: does assigning gap nodes to classes fill them faster than the engine's own active-learning loop?

## From the AI-for-science literature

Source: `_intake/research-os-k12/raw/lit-ai-for-science.md` (42 papers, all identifiers resolved).

21. Does an artifact-validity instrument for student productions, separate from a learning-outcome instrument, predict whether a production earns belief mass in the engine? Auchincloss and others 2014 (doi:10.1187/cbe.14-01-0004) report that the course-based research literature has not built this instrument. Study: blind dual rating of accepted productions on validity, compared with the production's later fusion weight.
22. Does isolated-quote checking overcredit cherry-picked spans compared with full-document context checking? Wadden and others 2022 (arXiv:2112.01640) found context changes verification judgments. Study: run check in both modes on the same productions and compare against human labels.
23. When a generator, critic, and judge share a base model, do they share blind spots by construction? Qi and others 2023 (arXiv:2311.05965) found proposer quality degrades on facts excluded from pretraining. Study: cross-family judge versus same-family judge on held-out placements.
24. Does re-scoring cadence and reviewer training move calibration more than the fusion rule? Mellers and others 2014 (doi:10.1177/0956797614524255). Study: vary update cadence and reviewer calibration feedback; hold the fusion operator fixed.
25. Does reliability-weighted aggregation of many student judgments converge on expert-grade output for slot extraction, as Galaxy Zoo did for morphology (Lintott and others 2008, doi:10.1111/j.1365-2966.2008.13689.x)? Study: weight students by track record; compare with expert labels.
26. Which frontier nodes attract student routing over time, and does the engine's generator narrow or widen the question set relative to that traffic? Messeri and Crockett 2024 (doi:10.1038/s41586-024-07146-0). Study: longitudinal comparison of routed targets and generated hypotheses.
27. Does locking a production's evaluation criteria before check runs reduce bias, the way Registered Reports do for human research (Chambers 2013, doi:10.1016/j.cortex.2012.12.016)?
