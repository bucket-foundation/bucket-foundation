---
title: "Predicting research trends with semantic and neural networks with an application in quantum physics"
authors:
  - "Krenn, Mario"
  - "Zeilinger, Anton"
year: 2020
venue: "Proceedings of the National Academy of Sciences"
doi: "10.1073/pnas.1914370116"
url: "https://doi.org/10.1073/pnas.1914370116"
openalex_id: "https://openalex.org/W2950657507"
branch: "ai-and-researchers"
tier: "canon"
why_it_matters: >
  Demonstrates that a neural network trained on a field's own citation and co-occurrence
  graph can predict which future research topics will become productive, the closest
  existing precedent for treating what to research next as a learnable, evidence-grounded
  prediction rather than a matter of individual researcher intuition.
key_claims:
  - "A neural network trained on the historical co-occurrence graph of concepts in quantum-physics papers predicted which not-yet-studied concept combinations would become active research topics in the following years, at accuracy well above a random or popularity-based baseline."
  - "The trained model's own predictions were used to suggest specific, previously unstudied research directions to domain physicists, several of which the authors report were judged plausible and worth pursuing by those physicists."
  - "The approach depends on a densely populated, well-curated concept-and-citation graph for the target field, a resource that exists for quantum physics but not for most other domains at the same density."
research_questions_it_leaves_open:
  - "Whether the same graph-based trend-prediction approach works on a much smaller, differently structured graph, like a single research question's own address space in the hypothesis engine, rather than a full field's decades of literature."
  - "How to validate a predicted research direction's own plausibility without waiting years for the field to pursue it, the same target-blind validation problem the hypothesis engine's own self-report addresses differently."
how_it_bears_on_research_os: >
  Is a close structural cousin of the hypothesis engine's own gap-node queue: where this
  paper predicts which unstudied concept combination a whole field will productively
  pursue next, hte.unknowns.GapNode's active_priority prices which unfilled cell or
  unresolved mechanism within one campaign's own address space is worth investigating
  next, the same kind of prediction at a far smaller and more bounded scale.
---

# Predicting research trends with semantic and neural networks with an application in quantum physics

Demonstrates that a neural network trained on a field's own citation and co-occurrence graph can predict which future research topics will become productive, the closest existing precedent for treating what to research next as a learnable, evidence-grounded prediction rather than a matter of individual researcher intuition.

## Key Claims

- A neural network trained on the historical co-occurrence graph of concepts in quantum-physics papers predicted which not-yet-studied concept combinations would become active research topics in the following years, at accuracy well above a random or popularity-based baseline.
- The trained model's own predictions were used to suggest specific, previously unstudied research directions to domain physicists, several of which the authors report were judged plausible and worth pursuing by those physicists.
- The approach depends on a densely populated, well-curated concept-and-citation graph for the target field, a resource that exists for quantum physics but not for most other domains at the same density.

## Research Questions It Leaves Open

- Whether the same graph-based trend-prediction approach works on a much smaller, differently structured graph, like a single research question's own address space in the hypothesis engine, rather than a full field's decades of literature.
- How to validate a predicted research direction's own plausibility without waiting years for the field to pursue it, the same target-blind validation problem the hypothesis engine's own self-report addresses differently.

## How It Bears on Research OS

Is a close structural cousin of the hypothesis engine's own gap-node queue: where this paper predicts which unstudied concept combination a whole field will productively pursue next, hte.unknowns.GapNode's active_priority prices which unfilled cell or unresolved mechanism within one campaign's own address space is worth investigating next, the same kind of prediction at a far smaller and more bounded scale.
