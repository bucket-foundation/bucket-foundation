<!-- voice-ignore-file: verbatim copy of a founder-authored literature card from _intake/research-os-k12-literature -->
---
title: "Intrinsic Motivation Systems for Autonomous Mental Development"
authors:
  - "Oudeyer, Pierre-Yves"
  - "Kaplan, Frédéric"
  - "Hafner, Verena V."
year: 2007
venue: "IEEE Transactions on Evolutionary Computation"
doi: "10.1109/TEVC.2006.890271"
url: "https://doi.org/10.1109/TEVC.2006.890271"
openalex_id: "https://openalex.org/W2101524054"
branch: "educational-methods"
tier: "canon"
why_it_matters: >
  The founding paper for scoring intrinsic motivation as expected learning progress,
  how much a prediction error is expected to shrink from taking an action, a different
  quantity from novelty or expected information gain alone. This is a direct
  computational precedent for prioritizing a gap node by how much closing it would
  improve the engine's own calibration, a criterion distinct from how unknown it
  currently is.
key_claims:
  - "A learning-progress-driven intrinsic reward, computed as the rate of improvement in a learner's own predictive model, produces more efficient skill acquisition in a simulated agent than either a pure novelty-seeking or a pure uncertainty-seeking reward."
  - "Learning-progress-driven exploration naturally avoids both already-mastered regions, where progress has plateaued, and unlearnable regions, where progress never improves regardless of practice, a property neither novelty nor uncertainty alone guarantees."
  - "The framework was demonstrated on a physical robot learning sensorimotor skills with no external reward signal, exploration was driven entirely by the agent's own internally computed learning-progress estimate."
research_questions_it_leaves_open:
  - "Whether a learning-progress signal computed from a class's own aggregate Check-verdict history would identify productive frontier targets better than the router's current confidence-weighted shortest path."
  - "How to distinguish an unlearnable gap node, one where progress will never improve, from one that is hard and needs a different scaffold, before routing students away from it."
how_it_bears_on_research_os: >
  Extends overlap map question 11 directly: Jones's burden-of-knowledge question
  asks whether gap nodes cluster in a measurable way, and this paper supplies the
  computational tool for prioritizing among a cluster once found, rank by expected
  learning progress, which naturally avoids both mastered and unlearnable gaps. This
  is the closest published precedent for what `hte.unknowns.active_priority`'s
  unwired scoring function is likely to need once `hte.runner` calls it, a
  learning-progress estimate rather than a static uncertainty score.
---

# Intrinsic Motivation Systems for Autonomous Mental Development

Founds intrinsic-motivation-as-learning-progress: reward an action by how much it
improves a learner's own predictive model, a signal that naturally avoids both
mastered and unlearnable regions, demonstrated on a physical robot with no external
reward.

## Key Claims

- Learning-progress-driven reward produces more efficient skill acquisition than pure
  novelty-seeking or uncertainty-seeking reward.
- Learning-progress exploration avoids both mastered regions, where progress has
  plateaued, and unlearnable regions, where it never improves.
- The framework was demonstrated on a physical robot with exploration driven entirely
  by an internally computed learning-progress estimate.

## Research Questions It Leaves Open

- Whether a learning-progress signal from aggregate class Check-verdict history would
  beat the router's current confidence-weighted shortest path.
- How to distinguish an unlearnable gap node from one that is hard and needs a
  different scaffold.

## How It Bears on Research OS

Extends overlap map question 11: the computational tool for prioritizing among a gap
cluster once found, and the closest published precedent for what
`hte.unknowns.active_priority`'s unwired function likely needs, a learning-progress
estimate rather than a static uncertainty score.
