---
title: "Automatic Extraction of Prerequisites Among Learning Objects Using Wikipedia-Based Content Analysis"
authors:
  - "De Medio, Carlo"
  - "Gasparetti, Fabio"
  - "Limongelli, Carla"
  - "Sciarrone, Filippo"
  - "Temperini, Marco"
year: 2016
venue: "Intelligent Tutoring Systems (Lecture Notes in Computer Science 9684)"
doi: "10.1007/978-3-319-39583-8_44"
url: "https://doi.org/10.1007/978-3-319-39583-8_44"
openalex_id: "https://openalex.org/W2484339323"
branch: "prerequisite-knowledge-graphs"
tier: "canon"
why_it_matters: >
  The predecessor to `gasparetti-et-al-2017-prerequisites-between-learning-objects.md`'s
  machine-learning method: this earlier paper by the same research group builds
  prerequisite edges from Wikipedia's own link structure alone, before the later paper
  added learned features on top. Reading them together shows what the Wikipedia
  signal contributes on its own versus what the added machine-learning layer buys.
key_claims:
  - "Two learning objects' prerequisite relation can be predicted from how their corresponding Wikipedia pages are linked and positioned relative to each other in Wikipedia's own category and link graph, without reading either object's own text content."
  - "The Wikipedia-link-based method achieved competitive accuracy against contemporaneous text-based methods on the study's benchmark, evidence link structure alone carries real prerequisite signal."
  - "The method's accuracy degraded for learning objects on topics with thin or inconsistent Wikipedia coverage, a domain-coverage dependency the later machine-learning method was built partly to address."
research_questions_it_leaves_open:
  - "Whether a Research OS node's own citation and cross-reference structure, independent of Wikipedia's own, carries a similar prerequisite signal for topics with thin external Wikipedia coverage."
  - "How the Wikipedia-link signal and the later learned-feature signal should be weighted against each other when both are available for the same candidate edge pair."
how_it_bears_on_research_os: >
  Extends `ROUTING.md`'s `inferred` confidence tier and the existing Gasparetti 2017
  card: this earlier, link-structure-only method is the baseline the later paper's
  machine-learning approach improved on, and its domain-coverage-dependency finding
  sharpens what `ROUTING.md` already flags, that `inferred` edges are the weakest
  confidence tier by construction, since the Wikipedia signal itself is weaker for
  thinly covered K-12 topics than for the paper's own benchmark domains.
---

# Automatic Extraction of Prerequisites Among Learning Objects Using Wikipedia-Based Content Analysis

Predicts prerequisite relations between learning objects from Wikipedia's own link
and category structure alone, achieving accuracy competitive with contemporaneous
text-based methods but degrading on topics with thin Wikipedia coverage.

## Key Claims

- Prerequisite relations can be predicted from Wikipedia link and category structure
  alone, without reading either object's own text.
- The link-based method achieved accuracy competitive with text-based methods on the
  study's benchmark.
- Accuracy degraded for topics with thin or inconsistent Wikipedia coverage.

## Research Questions It Leaves Open

- Whether a Research OS node's own citation structure carries a similar signal for
  thinly covered topics.
- How the Wikipedia-link signal and a later learned-feature signal should be weighted
  against each other.

## How It Bears on Research OS

Extends `ROUTING.md`'s `inferred` confidence tier: this link-structure-only method is
the baseline the later Gasparetti 2017 method improved on, and its coverage-dependency
finding sharpens why `inferred` edges are the weakest tier by construction.
