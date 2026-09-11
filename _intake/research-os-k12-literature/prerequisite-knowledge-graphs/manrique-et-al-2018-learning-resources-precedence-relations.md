---
title: "Investigating Learning Resources Precedence Relations via Concept Prerequisite Learning"
authors:
  - "Manrique, Rubén"
  - "Sosa, Juan Sebastián"
  - "Mariño, Olga"
  - "Pereira Nunes, Bernardo"
  - "Cardozo, Nicolas"
year: 2018
venue: "2018 IEEE/WIC/ACM International Conference on Web Intelligence"
doi: "10.1109/wi.2018.00-89"
url: "https://doi.org/10.1109/wi.2018.00-89"
openalex_id: "https://openalex.org/W2910901818"
branch: "prerequisite-knowledge-graphs"
tier: "canon"
why_it_matters: >
  A fourth independent group converging on the same two-step method Pan and
  colleagues (2017), Liang and colleagues (2018), and Roy and colleagues (2019) each
  use: propose candidate concept-prerequisite pairs, then score confidence from a
  learned feature set. That convergence across independent teams strengthens
  `ROUTING.md`'s own choice to treat this as a stable, replicated method family rather
  than one team's idiosyncratic approach.
key_claims:
  - "Concept prerequisite relations were learned from a feature set combining term co-occurrence, structural position within a resource, and cross-resource reference patterns, extending the feature families used in prior prerequisite-learning work with resource-level structural signals."
  - "The paper distinguishes a resource's own internal precedence order, which section comes before which within one document, from a concept's prerequisite order across resources, showing the two orders diverge enough to require separate modeling."
  - "Confidence scores from the learned model correlated with human-annotated precedence judgments at a level the paper reports as comparable to inter-annotator agreement among the paper's own human raters."
research_questions_it_leaves_open:
  - "Whether Research OS's own within-node ordering, section order inside one card, and across-node prerequisite ordering should be kept as separately modeled signals the way this paper argues, rather than collapsed into one edge type."
  - "What the model-versus-human-agreement level reported here implies for how much a `confidence` value near the `inferred` tier's own upper bound should be trusted relative to a teacher's own judgment."
how_it_bears_on_research_os: >
  Extends overlap map question 3 alongside Pan, Liang, Roy, and Gasparetti: a fourth
  independent method converging on the same candidate-then-confidence approach
  strengthens the case that `ROUTING.md`'s `inferred` confidence tier reflects a
  stable, cross-team method family. Its within-resource-versus-across-resource
  distinction is a design question `graph.edge`'s current kind vocabulary,
  prerequisite, cites, generalizes, does not yet separately name.
---

# Investigating Learning Resources Precedence Relations via Concept Prerequisite Learning

Learns concept prerequisite relations from term co-occurrence, structural position,
and cross-resource reference patterns, distinguishing a resource's internal order from
a concept's prerequisite order across resources.

## Key Claims

- Prerequisite relations were learned from co-occurrence, structural position, and
  cross-resource reference features.
- A resource's internal precedence order and a concept's cross-resource prerequisite
  order diverge enough to need separate modeling.
- Model confidence correlated with human precedence judgments at a level comparable to
  the paper's own inter-annotator agreement.

## Research Questions It Leaves Open

- Whether within-node and across-node ordering should stay separately modeled signals
  rather than one edge type.
- What the reported model-versus-human agreement implies for trusting a confidence
  value near the `inferred` tier's upper bound.

## How It Bears on Research OS

Extends overlap map question 3 alongside Pan, Liang, Roy, and Gasparetti: a fourth
independent method converging on the candidate-then-confidence approach, strengthening
the case that `inferred` reflects a stable, cross-team method family.
