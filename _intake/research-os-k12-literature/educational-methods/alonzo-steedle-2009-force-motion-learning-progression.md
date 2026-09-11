---
title: "Developing and Assessing a Force and Motion Learning Progression"
authors:
  - "Alonzo, Alicia C."
  - "Steedle, Jeffrey T."
year: 2009
venue: "Science Education"
doi: "10.1002/sce.20303"
url: "https://doi.org/10.1002/sce.20303"
openalex_id: "https://openalex.org/W2132640196"
branch: "educational-methods"
tier: "canon"
why_it_matters: >
  Tests a hypothesized ordered learning progression against real assessment data and
  finds the field-based order and the hypothesized order disagree for a meaningful
  share of learners, direct empirical counter-evidence against assuming an authored
  prerequisite or state order is automatically the order learners pass
  through.
key_claims:
  - "Three independent methods, an interview-based method, a multiple-choice ordered-multiple-choice method, and an item-response-theory method, were used to place the same students on a hypothesized five-level force and motion learning progression."
  - "The three methods agreed on a student's placement for only a modest majority of cases, and each method's placement diverged from the progression's own hypothesized level ordering for a nontrivial share of students."
  - "Some students' response patterns were consistent with skipping a hypothesized intermediate level entirely, evidence against treating every level as a required waypoint rather than a common but non-universal path."
research_questions_it_leaves_open:
  - "Whether the three-method disagreement rate found here for a five-level science progression would replicate on Bucket's own five learner states."
  - "What a routing algorithm should do when live student data implies a level was skipped, treat the skip as measurement noise or as evidence the hypothesized order is locally wrong."
how_it_bears_on_research_os: >
  Directly extends `LEARNER-STATE-MODEL.md` OPEN-7's question about the rate at which
  a trajectory-versus-prerequisite divergence would appear if teachers could contest
  every state rather than only the two gates the shipped code supports today: this
  paper is a field-tested precedent for exactly that divergence, measured with three
  independent methods on a five-level progression structurally close to Bucket's own
  five states, and shows the disagreement was not small. It also complicates OPEN-2's
  unidimensionality question, since a progression that some learners skip a level of is
  not behaving as one clean ordered scale for every learner.
---

# Developing and Assessing a Force and Motion Learning Progression

Places students on a hypothesized five-level force and motion learning progression
using three independent methods and finds meaningful disagreement among the methods
and evidence some students skip a hypothesized intermediate level.

## Key Claims

- Three independent placement methods, interview-based, ordered-multiple-choice, and
  IRT-based, were applied to the same hypothesized five-level progression.
- The three methods agreed for only a modest majority of students, diverging from the
  progression's own hypothesized order for a nontrivial share.
- Some students' response patterns were consistent with skipping a hypothesized
  intermediate level.

## Research Questions It Leaves Open

- Whether this disagreement rate would replicate on Bucket's own five learner states.
- What a routing algorithm should do when live data implies a level was skipped.

## How It Bears on Research OS

Extends `LEARNER-STATE-MODEL.md` OPEN-7: a field-tested precedent for
trajectory-versus-prerequisite divergence on a five-level progression structurally
close to Bucket's own states, with a measured, non-small disagreement rate.
Complicates OPEN-2's unidimensionality question.
