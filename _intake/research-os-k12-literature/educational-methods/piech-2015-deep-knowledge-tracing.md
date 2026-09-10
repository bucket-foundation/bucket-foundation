---
title: "Deep Knowledge Tracing"
authors:
  - "Piech, Chris"
  - "Spencer, Jonathan"
  - "Huang, Jonathan"
  - "Ganguli, Surya"
  - "Sahami, Mehran"
  - "Guibas, Leonidas"
  - "Sohl-Dickstein, Jascha"
year: 2015
venue: "arXiv preprint"
doi: "10.48550/arxiv.1506.05908"
url: "https://doi.org/10.48550/arxiv.1506.05908"
openalex_id: null
branch: "educational-methods"
tier: "canon"
why_it_matters: >
  The second knowledge-tracing approach the system review names and rejects: a
  recurrent-network model that improved prediction accuracy over BKT but produces an
  opaque per-skill score, a regulatory liability for a minor-facing product.
key_claims:
  - "A recurrent neural network trained on sequences of student exercise attempts outperformed BKT and other prior knowledge-tracing methods at predicting whether a student would answer the next problem correctly, across several public datasets."
  - "The learned model captures structure among skills, which skills tend to be learned together or depend on each other, without those relationships being hand-coded."
  - "The model's internal representation is not directly interpretable: it predicts well but does not expose why it believes a student knows or does not know a skill."
research_questions_it_leaves_open:
  - "Whether DKT's gains hold on the small per-student interaction histories a typical K-12 learner produces."
  - "How to make a DKT-style score auditable to a teacher or a regulator, a problem the paper does not attempt to solve."
how_it_bears_on_research_os: >
  The system review names DKT's own data requirement as the second reason mastery.ts
  avoids it: DKT needs a dense per-skill interaction history most nodes in a large graph
  will never accumulate, and its opaque score raises regulatory exposure when the subject
  is a minor, so the shipped fusion formula stays IRT/Elo plus FSRS instead.
---

# Deep Knowledge Tracing

The second knowledge-tracing approach the system review names and rejects: a recurrent-network model that improved prediction accuracy over BKT but produces an opaque per-skill score, a regulatory liability for a minor-facing product.

## Key Claims

- A recurrent neural network trained on sequences of student exercise attempts outperformed BKT and other prior knowledge-tracing methods at predicting whether a student would answer the next problem correctly, across several public datasets.
- The learned model captures structure among skills, which skills tend to be learned together or depend on each other, without those relationships being hand-coded.
- The model's internal representation is not directly interpretable: it predicts well but does not expose why it believes a student knows or does not know a skill.

## Research Questions It Leaves Open

- Whether DKT's gains hold on the small per-student interaction histories a typical K-12 learner produces.
- How to make a DKT-style score auditable to a teacher or a regulator, a problem the paper does not attempt to solve.

## How It Bears on Research OS

The system review names DKT's own data requirement as the second reason mastery.ts avoids it: DKT needs a dense per-skill interaction history most nodes in a large graph will never accumulate, and its opaque score raises regulatory exposure when the subject is a minor, so the shipped fusion formula stays IRT/Elo plus FSRS instead.
