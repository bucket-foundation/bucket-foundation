---
title: "Information-Seeking, Curiosity, and Attention: Computational and Neural Mechanisms"
authors:
  - "Gottlieb, Jacqueline"
  - "Oudeyer, Pierre-Yves"
  - "Lopes, Manuel"
  - "Baranes, Adrien"
year: 2013
venue: "Trends in Cognitive Sciences"
doi: "10.1016/j.tics.2013.09.001"
url: "https://doi.org/10.1016/j.tics.2013.09.001"
openalex_id: "https://openalex.org/W2013830186"
branch: "educational-methods"
tier: "canon"
why_it_matters: >
  Reviews computational accounts of information-seeking that treat curiosity as an
  internal reward signal driven by expected information gain or learning progress, the
  same quantity `hte/unknowns.py`'s `value_of_information` and `active_priority`
  functions already compute for the hypothesis engine's own gap nodes, giving a
  named, published theory for the mechanism those two unwired functions implement.
key_claims:
  - "Multiple computational frameworks converge on treating curiosity as intrinsic reward proportional to expected information gain, distinct from and sometimes competing with extrinsic reward for task performance."
  - "Attention and information-seeking are argued to be actively directed toward regions of moderate, resolvable uncertainty rather than toward either fully known or fully unknown states, converging with Kidd and Hayden's account of an uncertainty sweet spot."
  - "Neural evidence points to overlapping circuitry for information-seeking and reward-seeking, suggesting a system that treats reducing uncertainty as a reward in its own right rather than a separate, competing drive."
research_questions_it_leaves_open:
  - "Whether an information-gain-based routing cost, ranking frontier targets by expected reduction in graph uncertainty rather than only by prerequisite confidence, would out-predict the current router's own confidence-weighted shortest path."
  - "Whether a student workspace should expose any signal of expected information gain to a learner directly, or keep it as an internal routing heuristic."
how_it_bears_on_research_os: >
  Extends overlap map question 7 and question 11: this review is the published
  computational literature behind `hte.unknowns.value_of_information` and
  `active_priority`, functions the overlap map's integration-points table already
  flags as built but not wired into `hte.runner`. It gives a theoretical basis, beyond
  Swanson's undiscovered-public-knowledge case, for treating expected information gain
  itself as the quantity worth routing toward, both for the engine's own gap-node
  queue and, by direct analogy, for `ROUTING.md`'s own frontier-backward cost function.
---

# Information-Seeking, Curiosity, and Attention: Computational and Neural Mechanisms

Reviews computational frameworks that treat curiosity as an intrinsic reward
proportional to expected information gain, converging with neural evidence for
shared information-seeking and reward-seeking circuitry.

## Key Claims

- Multiple frameworks converge on curiosity as intrinsic reward proportional to
  expected information gain, distinct from extrinsic task reward.
- Attention and information-seeking target regions of moderate, resolvable
  uncertainty rather than fully known or unknown states.
- Neural evidence points to overlapping circuitry for information-seeking and
  reward-seeking.

## Research Questions It Leaves Open

- Whether an information-gain-based routing cost would out-predict the current
  confidence-weighted shortest path.
- Whether a workspace should expose expected information gain to a learner directly.

## How It Bears on Research OS

Extends overlap map questions 7 and 11: the published computational literature behind
`hte.unknowns.value_of_information` and `active_priority`, functions the overlap
map's table already flags as built but not wired into `hte.runner`.
