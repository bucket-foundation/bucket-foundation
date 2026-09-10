---
title: "Learning progressions: Aligning curriculum, instruction, and assessment"
authors:
  - "Duncan, Ravit Golan"
  - "Hmelo-Silver, Cindy E."
year: 2009
venue: "Journal of Research in Science Teaching"
doi: "10.1002/tea.20316"
url: "https://doi.org/10.1002/tea.20316"
openalex_id: "https://openalex.org/W2016295847"
branch: "educational-methods"
tier: "canon"
why_it_matters: >
  Learning progressions describe how a K-12 discipline's core ideas build on each other across grade bands in an empirically supported sequence, exactly the ordering a prerequisite DAG and its ancestor closure table need to route a learner correctly from grade to grade rather than only within one grade band.
key_claims:
  - "A learning progression describes how students' understanding of a core idea is expected to grow more sophisticated over an extended time span, an evidence-grounded ordering rather than a bare topic list."
  - "A defensible learning progression needs empirical validation against how students reason at each grade band; expert judgment about logical prerequisite order alone leaves that validation undone."
  - "Progressions should organize a curriculum's assessment as much as its instruction, so that assessment items at each grade band target the specific way understanding is expected to have changed."
research_questions_it_leaves_open:
  - "Empirically validated learning progressions exist for only a handful of science topics; most of a K-12 curriculum has no validated progression to check a prerequisite edge against."
  - "How a progression validated on classroom-level data should be represented as machine-checkable graph edges with a provenance and review trail."
how_it_bears_on_research_os: >
  Research OS's `prerequisite` edge and its derived `graph.prereq_ancestor` closure table are the graph-native encoding of a learning progression; the ingestion pipeline's rule that no prerequisite edge ships without human review exists because Duncan and Hmelo-Silver's own finding, that a progression needs empirical validation against real student reasoning beyond logical ordering alone, names exactly the failure mode an unreviewed LLM-proposed edge risks.
---

# Learning progressions: Aligning curriculum, instruction, and assessment

Learning progressions describe how a K-12 discipline's core ideas build on each other across grade bands in an empirically supported sequence, exactly the ordering a prerequisite DAG and its ancestor closure table need to route a learner correctly from grade to grade rather than only within one grade band.

## Key Claims

- A learning progression describes how students' understanding of a core idea is expected to grow more sophisticated over an extended time span, an evidence-grounded ordering rather than a bare topic list.
- A defensible learning progression needs empirical validation against how students reason at each grade band; expert judgment about logical prerequisite order alone leaves that validation undone.
- Progressions should organize a curriculum's assessment as much as its instruction, so that assessment items at each grade band target the specific way understanding is expected to have changed.

## Research Questions It Leaves Open

- Empirically validated learning progressions exist for only a handful of science topics; most of a K-12 curriculum has no validated progression to check a prerequisite edge against.
- How a progression validated on classroom-level data should be represented as machine-checkable graph edges with a provenance and review trail.

## How It Bears on Research OS

Research OS's `prerequisite` edge and its derived `graph.prereq_ancestor` closure table are the graph-native encoding of a learning progression; the ingestion pipeline's rule that no prerequisite edge ships without human review exists because Duncan and Hmelo-Silver's own finding, that a progression needs empirical validation against real student reasoning beyond logical ordering alone, names exactly the failure mode an unreviewed LLM-proposed edge risks.
