---
title: "Applying Centrality Measures to the Course Prerequisite Network Analysis of the Undergraduate Civil Engineering Curriculum"
authors:
  - "Valdez, Ma. Theresa Christine"
  - "Roldan, Kristine Joy"
  - "Masuli, Timothy John"
year: 2025
venue: "Journal of Science Educational Science"
doi: "10.18173/2354-1075.2025-0137"
url: "https://doi.org/10.18173/2354-1075.2025-0137"
openalex_id: "https://openalex.org/W7124987812"
branch: "prerequisite-knowledge-graphs"
tier: "candidate"
why_it_matters: >
  Applies graph centrality measures to a real curriculum's own prerequisite network to
  identify which courses sit at structurally central points, a technique directly
  applicable to Research OS's own `graph.prereq_ancestor` structure for finding
  frontier nodes with many downstream dependents, rather than routing by
  prerequisite-confidence alone. Closest verified match to an Open Syllabus Project
  curriculum-mining paper named in the task brief, which had no resolvable DOI; this
  paper's own prerequisite-network analysis covers the same curriculum-structure
  ground.
key_claims:
  - "A civil engineering curriculum's prerequisite structure, modeled as a directed graph with courses as vertices and prerequisite requirements as edges, showed a small number of courses with centrality scores far above the network's own median, indicating a small set of structurally central courses."
  - "Betweenness centrality and out-degree centrality identified different courses as most central, evidence that which node counts as structurally important depends on which centrality measure is chosen rather than there being one settled answer."
  - "The highest-betweenness courses were concentrated in the early-to-middle part of the program's own sequence rather than at the start itself, since a course with many downstream dependents needs its own prerequisites satisfied first before it can serve as a hub."
research_questions_it_leaves_open:
  - "Which centrality measure, betweenness, out-degree, or another, best identifies a frontier node with many downstream dependents in Research OS's own multi-subject graph, given this paper finds the choice of measure changes the answer."
  - "Whether a routing algorithm that favors high-centrality frontier targets would produce measurably different learning outcomes than the current confidence-weighted shortest-path router."
how_it_bears_on_research_os: >
  Extends `ROUTING.md`'s frontier computation with a concrete technique: centrality
  analysis over `graph.prereq_ancestor` could identify which frontier nodes serve the
  most downstream targets once mastered, a criterion orthogonal to the edge-confidence
  weighting the router currently uses. This paper's own finding that betweenness and
  out-degree disagree on which node is most central is a caution against picking one
  centrality measure without testing it against the others on Research OS's own graph
  shape.
---

# Applying Centrality Measures to the Course Prerequisite Network Analysis of the Undergraduate Civil Engineering Curriculum

Applies graph centrality measures to a real curriculum's prerequisite network,
finding a small set of structurally central courses whose identity depends on which
centrality measure is chosen.

## Key Claims

- A small set of courses showed centrality scores far above the network's median,
  indicating structurally central points in the curriculum.
- Betweenness and out-degree centrality identified different courses as most central.
- High-betweenness courses concentrated in the early-to-middle program sequence
  rather than at the start itself.

## Research Questions It Leaves Open

- Which centrality measure best identifies a frontier node with many downstream
  dependents in a multi-subject graph.
- Whether routing toward high-centrality targets would produce measurably different
  outcomes than the current shortest-path router.

## How It Bears on Research OS

Extends `ROUTING.md`'s frontier computation with a concrete technique: centrality
analysis over `graph.prereq_ancestor` could identify frontier nodes serving the most
downstream targets, a criterion orthogonal to the router's current confidence
weighting.
