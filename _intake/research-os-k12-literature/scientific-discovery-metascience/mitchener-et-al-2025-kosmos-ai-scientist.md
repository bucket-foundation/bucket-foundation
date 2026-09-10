---
title: "Kosmos: An AI Scientist for Autonomous Discovery"
authors:
  - "Mitchener, Ludovico"
  - "and 40+ others"
year: 2025
venue: "arXiv preprint"
doi: "10.48550/arxiv.2511.02824"
url: "https://doi.org/10.48550/arxiv.2511.02824"
openalex_id: "https://openalex.org/W4416437085"
branch: "scientific-discovery-metascience"
tier: "candidate"
why_it_matters: >
  Runs a long-horizon autonomous-discovery agent across many sequential research
  cycles rather than a single generate-and-check pass, each cycle's output logged
  with a traceable link back to the specific data and prior cycle result that
  produced it, a provenance discipline close to what `graph.edge.provenance` and
  `hte.evidence.Source.stemma_parents` already require on the Research OS and engine
  sides.
key_claims:
  - "The system runs many sequential discovery cycles in a single session, each cycle building on structured outputs (code, data analyses, literature summaries) from prior cycles rather than restarting from the original prompt each time."
  - "Every claim the system produces carries a traceable citation back to either a specific prior cycle's output or an external source, a design choice the paper reports catches a class of fabricated or unsupported claims that single-pass systems in its comparison set did not catch."
  - "The paper reports the system's per-cycle cost and traceability discipline trade off against raw throughput, running far fewer total cycles per unit time than a system without the traceability requirement, an explicit cost the authors accept for the reliability gain."
research_questions_it_leaves_open:
  - "Whether the traceability discipline's fabrication-catching benefit holds at the much smaller scale and shorter horizon a single classroom session would run, rather than the paper's own long multi-cycle sessions."
  - "What the minimum traceability requirement is that still catches most fabrication without the full throughput cost this system accepts."
how_it_bears_on_research_os: >
  Is a working precedent for the exact trade Research OS's own Quote tool makes
  deliberately: `hte.roles.extract`'s span-anchoring discipline, never trusting a
  model's own character offsets, is the same traceability-over-throughput choice this
  system makes at a larger scale, and this paper's finding that traceability catches
  fabrication single-pass systems miss is direct support for keeping that discipline
  in the Quote tool rather than relaxing it for speed. Extends `docs/K12-
  INTEGRATION.md` question 9 and `OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md`'s
  "Shared Constrained AI Tool Surface" section.
---

# Kosmos

A long-horizon autonomous-discovery agent running many sequential research cycles,
each output carrying a traceable citation back to a prior cycle or external source, a
discipline the paper reports catches fabrication that single-pass systems miss.

## Key Claims

- Runs many sequential discovery cycles per session, each building on structured
  outputs from prior cycles rather than restarting from the original prompt.
- Every claim carries a traceable citation to a prior cycle's output or an external
  source, catching fabricated or unsupported claims that single-pass comparison
  systems did not catch.
- Traceability trades off against throughput: the system runs far fewer cycles per
  unit time than a system without the requirement, an accepted cost for reliability.

## Research Questions It Leaves Open

- Whether the fabrication-catching benefit holds at classroom-session scale rather
  than the paper's own long multi-cycle sessions.
- What minimum traceability requirement still catches most fabrication without the
  full throughput cost.

## How It Bears on Research OS

Is a working precedent for the Quote tool's own design: `hte.roles.extract`'s
span-anchoring discipline, never trusting a model's own offsets, is the same
traceability-over-throughput choice made here at larger scale. This paper's
fabrication-catching result supports keeping that discipline rather than relaxing it
for speed. Extends `docs/K12-INTEGRATION.md` question 9.
