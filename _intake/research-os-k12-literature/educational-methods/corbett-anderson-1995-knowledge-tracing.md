---
title: "Knowledge tracing: Modeling the acquisition of procedural knowledge"
authors:
  - "Corbett, Albert T."
  - "Anderson, John R."
year: 1995
venue: "User Modeling and User-Adapted Interaction"
doi: "10.1007/BF01099821"
url: "https://doi.org/10.1007/BF01099821"
openalex_id: "https://openalex.org/W2015040676"
branch: "educational-methods"
tier: "canon"
why_it_matters: >
  Bayesian Knowledge Tracing is the founding algorithm for per-skill mastery estimation from a sequence of right and wrong attempts, and the direct ancestor of every knowledge-tracing model the system review weighs against IRT and Deep Knowledge Tracing before choosing IRT/Elo plus FSRS for mastery.ts.
key_claims:
  - "A two-state hidden Markov model, learned versus not yet learned, updated by four parameters (prior, learn rate, guess rate, slip rate) tracks a student's mastery of a discrete skill from a sequence of right or wrong answers."
  - "The model was validated against real tutoring-system data from the Pump Algebra Tutor and predicted subsequent performance."
  - "Knowledge tracing became the basis for the mastery threshold used to decide when a student is done practicing a skill in the tutor systems it was built for."
research_questions_it_leaves_open:
  - "BKT's binary learned/not-learned state cannot represent partial mastery or represent forgetting over time without extension."
  - "The model assumes one skill per item and independence across skills, which does not hold for items that draw on multiple prerequisite skills at once."
how_it_bears_on_research_os: >
  The system review explicitly rejects a Bayesian Knowledge Tracing spine for Research OS because BKT fuses poorly with a spaced-repetition decay term and does not fit partial-credit grading, choosing instead the multiplicative IRT/Elo-times-FSRS formula already shipping in mastery.ts. Corbett and Anderson's model is still the reference point that decision argues against, and its four-parameter structure (prior, learn rate, guess rate, slip rate) is the direct ancestor of the guess and slip terms an IRT-based Check-tool grader still has to handle.
---

# Knowledge tracing: Modeling the acquisition of procedural knowledge

Bayesian Knowledge Tracing is the founding algorithm for per-skill mastery estimation from a sequence of right and wrong attempts, and the direct ancestor of every knowledge-tracing model the system review weighs against IRT and Deep Knowledge Tracing before choosing IRT/Elo plus FSRS for mastery.ts.

## Key Claims

- A two-state hidden Markov model, learned versus not yet learned, updated by four parameters (prior, learn rate, guess rate, slip rate) tracks a student's mastery of a discrete skill from a sequence of right or wrong answers.
- The model was validated against real tutoring-system data from the Pump Algebra Tutor and predicted subsequent performance.
- Knowledge tracing became the basis for the mastery threshold used to decide when a student is done practicing a skill in the tutor systems it was built for.

## Research Questions It Leaves Open

- BKT's binary learned/not-learned state cannot represent partial mastery or represent forgetting over time without extension.
- The model assumes one skill per item and independence across skills, which does not hold for items that draw on multiple prerequisite skills at once.

## How It Bears on Research OS

The system review explicitly rejects a Bayesian Knowledge Tracing spine for Research OS because BKT fuses poorly with a spaced-repetition decay term and does not fit partial-credit grading, choosing instead the multiplicative IRT/Elo-times-FSRS formula already shipping in mastery.ts. Corbett and Anderson's model is still the reference point that decision argues against, and its four-parameter structure (prior, learn rate, guess rate, slip rate) is the direct ancestor of the guess and slip terms an IRT-based Check-tool grader still has to handle.
