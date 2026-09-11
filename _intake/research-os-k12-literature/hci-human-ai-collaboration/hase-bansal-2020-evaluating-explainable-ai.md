---
title: "Evaluating Explainable AI: Which Algorithmic Explanations Help Users Predict Model Behavior?"
authors:
  - "Hase, Peter"
  - "Bansal, Mohit"
year: 2020
venue: "Proceedings of the 58th Annual Meeting of the Association for Computational Linguistics"
doi: "10.18653/v1/2020.acl-main.491"
url: "https://doi.org/10.18653/v1/2020.acl-main.491"
openalex_id: "https://openalex.org/W3035371891"
branch: "hci-human-ai-collaboration"
tier: "canon"
why_it_matters: >
  A human-subject evaluation isolating simulatability, whether a person can predict a
  model's behavior on a new input after seeing its explanation, as the target metric for
  algorithmic explanation quality, and finds clear evidence of improvement is rare across
  five common explanation methods, a caution against assuming any explanation format the
  engine or a Production tool offers actually helps a person predict or trust the system's
  behavior.
key_claims:
  - "Carries out human-subject tests isolating the effect of algorithmic explanations on
    simulatability, whether a person can predict a model's output on a new input after
    seeing an explanation of its behavior, while controlling for confounds earlier studies
    of explanation quality did not."
  - "Testing five explanation methods (LIME, Anchor, a decision-boundary method, a
    prototype method, and a composite combining several) across text and tabular data,
    clear evidence that an explanation method improved simulatability was found in very
    few of the tested conditions."
  - "Subjective ratings of how helpful an explanation felt were collected alongside the
    simulatability tests and were not found to predict how much the explanation actually
    helped a person predict model behavior, evidence a felt sense of a good explanation
    and a measurably useful one can diverge."
research_questions_it_leaves_open:
  - "Whether the engine's own disclosed, model-generated understanding artifact has ever
    been tested for simulatability, whether a K-12 learner who reads it can then predict
    how the ranking would change on a new, unseen hypothesis, the same test this paper
    applies to algorithmic explanations generally."
  - "Whether the subjective-rating-does-not-predict-helpfulness finding means a
    learner's own stated confidence after reading a Check verdict's rationale is an
    unreliable signal of whether that rationale actually improved their understanding, a
    caution for any pilot measure that relies on self-reported explanation quality."
how_it_bears_on_research_os: >
  Sharpens Miller (2019)'s own general argument with a concrete negative result: even
  algorithmic explanation methods purpose-built for interpretability rarely produce
  measurable gains in a person's ability to predict model behavior, and subjective
  ratings of explanation quality do not track that measurable gain. Read against the
  disclosed understanding artifact PR #60 shipped, this paper argues that artifact's own
  value should be tested by whether it lets a learner predict how the engine's ranking
  would move on a new case, not by whether the artifact reads as satisfying, the same
  simulatability standard this paper finds most tested explanation methods fail to clear.
---

# Evaluating Explainable AI: Which Algorithmic Explanations Help Users Predict Model Behavior?

Isolates simulatability, whether a person can predict a model's behavior on a new input
after seeing its explanation, as the target metric, and finds clear evidence of
improvement is rare across five common explanation methods.

## Key Claims

- Carries out human-subject tests isolating the effect of algorithmic explanations on
  simulatability, whether a person can predict a model's output on a new input after
  seeing an explanation of its behavior, while controlling for confounds earlier studies
  of explanation quality did not.
- Testing five explanation methods (LIME, Anchor, a decision-boundary method, a
  prototype method, and a composite combining several) across text and tabular data, clear
  evidence that an explanation method improved simulatability was found in very few of the
  tested conditions.
- Subjective ratings of how helpful an explanation felt were collected alongside the
  simulatability tests and were not found to predict how much the explanation actually
  helped a person predict model behavior, evidence a felt sense of a good explanation and
  a measurably useful one can diverge.

## Research Questions It Leaves Open

- Whether the engine's own disclosed, model-generated understanding artifact has ever
  been tested for simulatability, whether a K-12 learner who reads it can then predict how
  the ranking would change on a new, unseen hypothesis, the same test this paper applies
  to algorithmic explanations generally.
- Whether the subjective-rating-does-not-predict-helpfulness finding means a learner's
  own stated confidence after reading a Check verdict's rationale is an unreliable signal
  of whether that rationale actually improved their understanding, a caution for any
  pilot measure that relies on self-reported explanation quality.

## How It Bears on Research OS

Sharpens Miller (2019)'s own general argument with a concrete negative result: even
algorithmic explanation methods purpose-built for interpretability rarely produce
measurable gains in a person's ability to predict model behavior, and subjective ratings
of explanation quality do not track that measurable gain. Read against the disclosed
understanding artifact PR #60 shipped, this paper argues that artifact's own value should
be tested by whether it lets a learner predict how the engine's ranking would move on a
new case, not by whether the artifact reads as satisfying, the same simulatability
standard this paper finds most tested explanation methods fail to clear.
