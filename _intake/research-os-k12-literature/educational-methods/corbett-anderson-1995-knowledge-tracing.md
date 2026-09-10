---
title: "Knowledge tracing: Modeling the acquisition of procedural knowledge"
authors:
  - "Corbett, Albert T."
  - "Anderson, John R."
year: 1995
venue: "User Modelling and User-Adapted Interaction"
doi: "10.1007/bf01099821"
url: "https://doi.org/10.1007/bf01099821"
openalex_id: "https://openalex.org/W2015040676"
branch: "educational-methods"
tier: "canon"
why_it_matters: >
  Introduces Bayesian Knowledge Tracing, the model Research OS explicitly considered and
  rejected in favor of an IRT/Elo-plus-FSRS fusion, making this the paper the system
  review's own modeling decision argues against.
key_claims:
  - "A student's mastery of a skill can be tracked as a hidden binary state (known or unknown), updated after each practice opportunity with a four-parameter Bayesian model: initial knowledge, learning rate, guess rate, slip rate."
  - "Fit to real intelligent-tutor data, the model predicted individual differences in learning curves and post-test performance better than a fixed-trials heuristic."
  - "The model assumes independence between skills and no forgetting, two simplifications later literature revisits."
research_questions_it_leaves_open:
  - "How to extend a single-skill hidden-state model to a graph of interdependent skills, the same problem Research OS's own prerequisite closure table solves differently."
  - "How to add a forgetting term without breaking the model's closed-form updates, the problem FSRS solves by replacing BKT's binary state with a continuous retrievability function."
how_it_bears_on_research_os: >
  The system review's own knowledge-tracing decision (Section 3) argues against BKT by
  name: it fuses poorly with a spaced-repetition decay term and does not fit
  partial-credit grading, so mastery.ts composes IRT/Elo with FSRS multiplicatively
  instead. Citing BKT directly documents the alternative the shipped design rejected and
  why.
---

# Knowledge tracing: Modeling the acquisition of procedural knowledge

Introduces Bayesian Knowledge Tracing, the model Research OS explicitly considered and rejected in favor of an IRT/Elo-plus-FSRS fusion, making this the paper the system review's own modeling decision argues against.

## Key Claims

- A student's mastery of a skill can be tracked as a hidden binary state (known or unknown), updated after each practice opportunity with a four-parameter Bayesian model: initial knowledge, learning rate, guess rate, slip rate.
- Fit to real intelligent-tutor data, the model predicted individual differences in learning curves and post-test performance better than a fixed-trials heuristic.
- The model assumes independence between skills and no forgetting, two simplifications later literature revisits.

## Research Questions It Leaves Open

- How to extend a single-skill hidden-state model to a graph of interdependent skills, the same problem Research OS's own prerequisite closure table solves differently.
- How to add a forgetting term without breaking the model's closed-form updates, the problem FSRS solves by replacing BKT's binary state with a continuous retrievability function.

## How It Bears on Research OS

The system review's own knowledge-tracing decision (Section 3) argues against BKT by name: it fuses poorly with a spaced-repetition decay term and does not fit partial-credit grading, so mastery.ts composes IRT/Elo with FSRS multiplicatively instead. Citing BKT directly documents the alternative the shipped design rejected and why.
