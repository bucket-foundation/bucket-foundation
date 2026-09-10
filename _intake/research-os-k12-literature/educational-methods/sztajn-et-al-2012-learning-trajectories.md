---
title: "Learning Trajectory Based Instruction"
authors:
  - "Sztajn, Paola"
  - "Confrey, Jere"
  - "Wilson, P. Holt"
  - "Edgington, Cynthia"
year: 2012
venue: "Educational Researcher"
doi: "10.3102/0013189x12442801"
url: "https://doi.org/10.3102/0013189x12442801"
openalex_id: null
branch: "educational-methods"
tier: "canon"
why_it_matters: >
  The direct precedent for representing a subject as a sequenced prerequisite structure
  with grade-band placement, the design problem the atom-tier ingestion pipeline and the
  prerequisite-edge inference worker both have to solve for every K-12 subject.
key_claims:
  - "A learning trajectory names three linked parts: a learning goal, a developmental path students tend to take toward it, and a set of instructional tasks matched to each step of that path."
  - "Trajectories are grounded in observed student reasoning rather than a logical decomposition of the subject matter alone; the order that makes sense to an expert is not always the order students traverse."
  - "Using a trajectory to sequence instruction requires ongoing formative assessment to place each student on their own path, since students do not all enter or move through a trajectory at the same point."
research_questions_it_leaves_open:
  - "How to build a learning trajectory for a subject with far less existing research than elementary mathematics, the domain from which most learning-trajectory work has come."
  - "How a graph's prerequisite edges relate to a trajectory's developmental path when the two disagree: a logically prerequisite topic students in practice learn out of order."
how_it_bears_on_research_os: >
  Names the failure mode the prerequisite-edge inference worker has to guard against: an
  LLM-proposed edge from standards sequencing encodes the logical order an expert would
  choose, rather than necessarily the developmental path this paper shows students take,
  which is why the system review requires human review before any inferred edge can affect
  routing.
---

# Learning Trajectory Based Instruction

The direct precedent for representing a subject as a sequenced prerequisite structure with grade-band placement, the design problem the atom-tier ingestion pipeline and the prerequisite-edge inference worker both have to solve for every K-12 subject.

## Key Claims

- A learning trajectory names three linked parts: a learning goal, a developmental path students tend to take toward it, and a set of instructional tasks matched to each step of that path.
- Trajectories are grounded in observed student reasoning rather than a logical decomposition of the subject matter alone; the order that makes sense to an expert is not always the order students traverse.
- Using a trajectory to sequence instruction requires ongoing formative assessment to place each student on their own path, since students do not all enter or move through a trajectory at the same point.

## Research Questions It Leaves Open

- How to build a learning trajectory for a subject with far less existing research than elementary mathematics, the domain from which most learning-trajectory work has come.
- How a graph's prerequisite edges relate to a trajectory's developmental path when the two disagree: a logically prerequisite topic students in practice learn out of order.

## How It Bears on Research OS

Names the failure mode the prerequisite-edge inference worker has to guard against: an LLM-proposed edge from standards sequencing encodes the logical order an expert would choose, rather than necessarily the developmental path this paper shows students take, which is why the system review requires human review before any inferred edge can affect routing.
