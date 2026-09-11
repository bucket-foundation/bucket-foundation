---
title: "SciAgents: Automating Scientific Discovery Through Bioinspired Multi-Agent Intelligent Graph Reasoning"
authors:
  - "Ghafarollahi, Alireza"
  - "Buehler, Markus J."
year: 2024
venue: "Advanced Materials"
doi: "10.1002/adma.202413523"
url: "https://doi.org/10.1002/adma.202413523"
openalex_id: "https://openalex.org/W4405599065"
branch: "scientific-discovery-metascience"
tier: "canon"
why_it_matters: >
  Runs a multi-agent system directly over a knowledge graph built from scientific
  literature, ontologist, scientist, and critic agents traversing graph paths to
  propose and refine hypotheses, the closest existing published system to what a
  `hypothesize` query over Research OS's own `graph.node`/`graph.edge` schema would
  need to do.
key_claims:
  - "The system builds a large knowledge graph from a materials-science literature corpus, then samples paths through the graph as seeds for a multi-agent pipeline where an ontologist agent extracts relations, a scientist agent proposes a research hypothesis linking sampled concepts, and a critic agent evaluates novelty and feasibility."
  - "The paper reports the system autonomously proposed a hypothesis connecting biological materials principles to a structural design, which the authors then pursued as a real research direction, treating the system's own output as a genuine research lead rather than only a demonstration."
  - "Graph-path sampling, choosing which nodes and edges to traverse before generation begins, is presented as materially shaping what the generator agent can propose, a coupling between graph structure and hypothesis space the paper treats as a design lever rather than a side effect."
research_questions_it_leaves_open:
  - "Whether the system's graph-path sampling strategy, tuned for a dense materials-science literature graph, transfers to a sparser graph like a single subject's K-12 concept map."
  - "How to evaluate novelty for a hypothesis the critic agent itself scores, versus an independent domain expert, given the paper's own reliance on the critic agent for that judgment."
how_it_bears_on_research_os: >
  Is the closest published system to the `hypothesize` MCP tool `docs/K12-
  INTEGRATION.md` names beside `canon_search`, `bucket_research`, and `bucket_cite`:
  graph-path sampling before generation, this paper's central design lever, is
  the same operation Research OS's own frontier-backward routing performs over
  `graph.prereq_ancestor`, run here for hypothesis proposal instead of learner
  routing. Its critic-agent novelty scoring is a concrete comparison point for
  Research OS's own Check tool, narrowed here to source-grounded verification rather
  than novelty judgment. Extends `RESEARCH-QUESTIONS.md` Q19 and Q20.
---

# SciAgents

A multi-agent system, ontologist, scientist, and critic agents, running directly over
a knowledge graph built from scientific literature, sampling graph paths as seeds for
hypothesis proposal and refinement.

## Key Claims

- Builds a large knowledge graph from a literature corpus, then samples graph paths
  as seeds for a multi-agent generate-and-critique pipeline.
- The system proposed a hypothesis the authors pursued as a real research direction,
  treated as a genuine lead rather than only a demonstration.
- Graph-path sampling is presented as materially shaping the hypothesis space, a
  design lever the paper controls deliberately.

## Research Questions It Leaves Open

- Whether the sampling strategy transfers from a dense literature graph to a sparser
  K-12 concept map.
- How to evaluate hypothesis novelty independent of the same critic agent that scores
  it.

## How It Bears on Research OS

Is the closest published system to the `hypothesize` tool named in `docs/K12-
INTEGRATION.md`: graph-path sampling before generation is the same operation
frontier-backward routing performs over `graph.prereq_ancestor`, run here for
hypothesis proposal. Its critic-agent scoring is a comparison point for the Check
tool, narrowed on the Research OS side to source-grounded verification. Extends
`RESEARCH-QUESTIONS.md` Q19 and Q20.
