---
title: "Highly accurate protein structure prediction with AlphaFold"
authors:
  - "Jumper, John"
  - "Evans, Richard"
  - "Pritzel, Alexander"
  - "Green, Tim"
  - "Figurnov, Michael"
  - "Ronneberger, Olaf"
  - "Hassabis, Demis"
  - "et al."
year: 2021
venue: "Nature"
doi: "10.1038/s41586-021-03819-2"
url: "https://doi.org/10.1038/s41586-021-03819-2"
openalex_id: "https://openalex.org/W3177828909"
branch: "scientific-discovery-metascience"
tier: "canon"
why_it_matters: >
  AlphaFold showed that a deep-learning system trained on sequence and structural data could
  predict a protein's three-dimensional shape at a level competitive with experimental methods,
  closing a fifty-year open problem in structural biology. It is the reference case for what an
  AI system can contribute inside a scientific discovery pipeline, from raw sequence to a
  validated structural claim.
key_claims:
  - "AlphaFold predicts protein structure from amino acid sequence with accuracy comparable to experimental methods such as X-ray crystallography and cryo-EM, across a wide range of protein families."
  - "The system combines evolutionary, template, and geometric information inside an attention-based network (the Evoformer) and an iterative structure module, trained end to end."
  - "Independent, blind evaluation at CASP14 confirmed the accuracy claim against structures withheld from the model at training time."
research_questions_it_leaves_open:
  - "The paper reports strong accuracy on single-chain, well-characterized proteins and leaves open how the same approach performs on multi-protein complexes, disordered regions, and conformational dynamics."
  - "It leaves open how a prediction of this kind should be credited once it becomes an input to a later discovery by another researcher, rather than treated only as a software output."
how_it_bears_on_research_os: >
  AlphaFold is the working example Bucket's hypothesis engine should be measured against: a
  machine-generated structural claim that earned trust through blind, adversarial evaluation
  (CASP) rather than self-report, the same standard the tournament and gap-node machinery should
  hold synthetic hypotheses to before they enter the citation graph as evidence. It also sets a
  precedent for the provenance model: one predicted structure can become the evidentiary basis
  for thousands of downstream papers, the shape of claim the x402 pay-once-cite-forever rail
  needs to handle when a K-12 student production or an engine-generated hypothesis becomes a
  citable node that other work builds on.
---

# Highly accurate protein structure prediction with AlphaFold

AlphaFold matters to Bucket Foundation as a case study in earned machine trust. It reached its
accuracy claim through the CASP14 blind assessment, where the target structures were unknown to
the model at prediction time. That is the bar the tournament
and gap-node machinery should hold a synthetic hypothesis to before it counts as evidence inside
the citation graph. The paper also shows how far a single validated claim can travel: one
predicted structure becomes an input other researchers build on for years, which is the same
shape of downstream reuse the x402 pay-once-cite-forever rail is built to settle.

Key claims:
- Predicts protein structure from sequence at accuracy comparable to experimental methods, across many protein families.
- Combines evolutionary, template, and geometric signal inside an end-to-end trained network (the Evoformer plus an iterative structure module).
- Confirmed by independent, blind evaluation (CASP14) against structures withheld from training.

Open questions:
- Generalization to multi-protein complexes, disordered regions, and conformational dynamics beyond the single-chain, well-characterized cases reported.
- How to credit a prediction once other researchers treat it as an input to their own discoveries.
