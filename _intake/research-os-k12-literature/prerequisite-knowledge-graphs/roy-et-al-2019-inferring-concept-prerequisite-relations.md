---
title: "Inferring Concept Prerequisite Relations from Online Educational Resources"
authors:
  - "Roy, Sudeshna"
  - "Madhyastha, Meghana"
  - "Lawrence, Sheril"
  - "Rajan, Vaibhav"
year: 2019
venue: "Proceedings of the AAAI Conference on Artificial Intelligence"
doi: "10.1609/aaai.v33i01.33019589"
url: "https://doi.org/10.1609/aaai.v33i01.33019589"
openalex_id: "https://openalex.org/W2965216240"
branch: "prerequisite-knowledge-graphs"
tier: "canon"
why_it_matters: >
  Infers prerequisite relations from open educational resources rather than a single
  course's own text, a closer match to Research OS's own multi-source `graph.node`
  corpus, which spans textbooks, primary sources, and teacher-authored material rather
  than one platform's course catalog.
key_claims:
  - "The paper's PREREQ model combines a graph-based feature representing how concepts co-occur across a large corpus of educational resources with features drawn from Wikipedia's own link structure, treating a concept's surrounding resource network as a signal for its prerequisites."
  - "PREREQ outperformed prior methods, including Pan and colleagues (2017)'s approach, on multiple benchmark datasets spanning different subject domains."
  - "The paper reports that resource-based features (which materials cite or reference which) added predictive power beyond text-content features alone, suggesting citation and reference structure is itself a usable prerequisite signal."
research_questions_it_leaves_open:
  - "Whether resource-citation structure is as informative in a K-12 corpus, where materials cite each other far less densely than research literature or Wikipedia, as it is in the paper's benchmark domains."
  - "How prerequisite inference should combine with the graph's own `provenance` and `cites` edge kinds, which already carry citation information for a different purpose."
how_it_bears_on_research_os: >
  Suggests Research OS's own `graph.edge` `cites` kind, already a first-class citizen
  for provenance, could double as an input feature for candidate prerequisite
  detection, the same resource-citation signal Roy and colleagues show adds predictive
  power beyond text content alone. This gives the Pan-style candidate-generation step
  named in the prerequisite-learning literature a source of signal specific to
  Research OS's own multi-source corpus rather than a single platform's text. Extends
  `RESEARCH-QUESTIONS.md` Q3, alongside Pan and colleagues (2017) and Liang and
  colleagues (2018).
---

# Inferring Concept Prerequisite Relations from Online Educational Resources

The PREREQ model infers prerequisite relations from a large corpus of educational
resources, combining resource co-occurrence and Wikipedia link structure, and
outperforms prior text-only methods on multiple subject domains.

## Key Claims

- PREREQ combines resource-network co-occurrence with Wikipedia link-structure
  features to predict prerequisites.
- PREREQ outperformed prior methods, including Pan and colleagues (2017), on multiple
  benchmark datasets.
- Resource-citation features added predictive power beyond text-content features
  alone.

## Research Questions It Leaves Open

- Whether resource-citation structure is as informative in a sparser K-12 corpus as in
  the paper's benchmark domains.
- How prerequisite inference should combine with a graph's existing citation-carrying
  edge kinds.

## How It Bears on Research OS

Suggests `graph.edge`'s `cites` kind could double as an input feature for candidate
prerequisite detection, the same resource-citation signal shown here to add predictive
power beyond text content. Extends `RESEARCH-QUESTIONS.md` Q3 alongside Pan and
colleagues (2017) and Liang and colleagues (2018).
