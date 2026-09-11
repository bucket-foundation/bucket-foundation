---
title: "Prerequisites Between Learning Objects: Automatic Extraction Based on a Machine Learning Approach"
authors:
  - "Gasparetti, Fabio"
  - "De Medio, Carlo"
  - "Limongelli, Carla"
  - "Sciarrone, Filippo"
  - "Temperini, Marco"
year: 2017
venue: "Telematics and Informatics"
doi: "10.1016/j.tele.2017.05.007"
url: "https://doi.org/10.1016/j.tele.2017.05.007"
openalex_id: "https://openalex.org/W2618918222"
branch: "prerequisite-knowledge-graphs"
tier: "canon"
why_it_matters: >
  Extracts prerequisite relations between fine-grained learning objects, a paragraph
  or a slide, rather than between whole concepts, and uses the extracted graph to
  drive a learning-path recommender. It is the closest existing precedent for turning
  a prerequisite graph directly into a routed sequence, which is what Research OS's
  own frontier-backward routing does over `graph.prereq_ancestor`.
key_claims:
  - "The paper trains a supervised classifier on lexical and structural features (shared terminology, document structure, relative position in a source text) to predict whether one learning object is a prerequisite of another."
  - "The extracted prerequisite graph was used to generate a personalized learning path for a given target object, ordering objects so that each appears after its detected prerequisites."
  - "An evaluation with real courseware found the automatically generated paths agreed with instructor-authored orderings on a majority of learning-object pairs, with disagreement concentrated on pairs the instructors themselves rated as weak or optional prerequisites."
research_questions_it_leaves_open:
  - "Whether the same lexical and structural features generalize from the paper's higher-education courseware to K-12 material with simpler language and more repetition across grade bands."
  - "How the system should handle a prerequisite pair instructors themselves disagree on, rather than treating the graph as a single ground truth."
how_it_bears_on_research_os: >
  Is the direct precedent for what Research OS's frontier-backward routing already
  does over `graph.prereq_ancestor`: this paper's routing step and Research OS's own
  are the same operation, walk backward from a target through detected prerequisites
  to build a route, at finer grain than a whole concept node. Its finding that
  instructor disagreement concentrates on weak or optional prerequisites bears on
  `RESEARCH-QUESTIONS.md` Q3's contest-rate question: a graph edge with low instructor
  agreement is a candidate for `atom` tier rather than `canon` tier until reviewed
  further. Extends `RESEARCH-QUESTIONS.md` Q3 and Q5, and `OVERLAP-RESEARCH-OS-AND-
  AI-FOR-RESEARCH.md` question 3.
---

# Prerequisites Between Learning Objects

Extracts prerequisite relations between fine-grained learning objects using a
supervised classifier on lexical and structural features, then uses the resulting
graph to generate a personalized learning path.

## Key Claims

- A supervised classifier predicts prerequisite relations from shared terminology,
  document structure, and relative position in a source text.
- The extracted graph drove a personalized learning path, ordering objects after
  their detected prerequisites.
- Automatically generated paths agreed with instructor-authored orderings on a
  majority of pairs, with disagreement concentrated on weak or optional prerequisites.

## Research Questions It Leaves Open

- Whether the same features generalize from higher-education courseware to K-12
  material.
- How to handle a prerequisite pair instructors themselves disagree on.

## How It Bears on Research OS

Is the direct precedent for frontier-backward routing over `graph.prereq_ancestor`:
walking backward from a target through detected prerequisites is the same operation
this paper runs, at finer grain. Its finding that instructor disagreement concentrates
on weak prerequisites bears on `RESEARCH-QUESTIONS.md` Q3: a low-agreement edge is a
candidate for `atom` tier rather than `canon` tier until reviewed further.
