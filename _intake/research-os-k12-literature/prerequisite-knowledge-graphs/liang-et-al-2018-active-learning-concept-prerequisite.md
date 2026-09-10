---
title: "Investigating Active Learning for Concept Prerequisite Learning"
authors:
  - "Liang, Chen"
  - "Ye, Jianbo"
  - "Wang, Shuting"
  - "Pursel, Bart"
  - "Giles, C. Lee"
year: 2018
venue: "Proceedings of the AAAI Conference on Artificial Intelligence"
doi: "10.1609/aaai.v32i1.11396"
url: "https://doi.org/10.1609/aaai.v32i1.11396"
openalex_id: "https://openalex.org/W2805805409"
branch: "prerequisite-knowledge-graphs"
tier: "canon"
why_it_matters: >
  Tests active-learning strategies, picking which concept pairs a human should label
  next, for building a prerequisite graph under a fixed labeling budget. This is the
  budget-constrained version of the validation-by-human-editor step Research OS's own
  graph curation needs at classroom scale.
key_claims:
  - "The paper compares uncertainty sampling, query-by-committee, and other active-learning strategies for selecting which candidate prerequisite pairs a human annotator should label next, against random selection."
  - "The best active-learning strategy reached a target accuracy with substantially fewer labeled pairs than random selection needed, a direct labeling-cost reduction."
  - "The gain from active learning was largest early in the labeling process and shrank as the labeled set grew, suggesting diminishing returns past a certain budget."
research_questions_it_leaves_open:
  - "Whether the same active-learning gains hold when the labeler is a classroom teacher rather than a crowdworker or domain expert, given different time constraints and error tolerances."
  - "How the strategy should change when new concepts are added to a live graph incrementally, rather than labeled once in a batch."
how_it_bears_on_research_os: >
  Gives a concrete method for the open item `OVERLAP-RESEARCH-OS-AND-AI-FOR-
  RESEARCH.md`'s integration table names for `graph.edge`: rather than a teacher
  reviewing every candidate prerequisite edge a Pan-style model proposes, an
  active-learning queue could rank candidates by uncertainty, so a limited pool of
  teacher review time (`RESEARCH-QUESTIONS.md` Q3's contest-rate concern) is spent
  where it changes the graph most. Extends `RESEARCH-QUESTIONS.md` Q3.
---

# Investigating Active Learning for Concept Prerequisite Learning

Compares active-learning strategies for choosing which candidate prerequisite pairs a
human should label next, finding the best strategy reaches target accuracy with far
fewer labels than random selection.

## Key Claims

- Uncertainty sampling and query-by-committee strategies are compared against random
  selection for labeling candidate prerequisite pairs.
- The best strategy reached target accuracy with substantially fewer labeled pairs
  than random selection.
- Gains from active learning were largest early in labeling and shrank as the labeled
  set grew.

## Research Questions It Leaves Open

- Whether the gains hold when the labeler is a classroom teacher rather than a
  crowdworker or domain expert.
- How the strategy should change for a live graph with concepts added incrementally.

## How It Bears on Research OS

Gives a method for spending limited teacher review time where it changes the graph
most: an active-learning queue could rank candidate prerequisite edges a Pan-style
model proposes by uncertainty, rather than asking a teacher to review every candidate.
Extends `RESEARCH-QUESTIONS.md` Q3's contest-rate concern.
