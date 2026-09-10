---
title: "Hypothesis Generation with Large Language Models"
authors:
  - "Zhou, Yangqiaoyu"
  - "Liu, Haokun"
  - "Srivastava, Tejes"
  - "Mei, Hongyuan"
  - "Tan, Chenhao"
year: 2024
venue: "Proceedings of the 1st Workshop on NLP for Science (NLP4Science)"
doi: "10.18653/v1/2024.nlp4science-1.10"
url: "https://doi.org/10.18653/v1/2024.nlp4science-1.10"
openalex_id: "https://openalex.org/W4404781796"
branch: "scientific-discovery-metascience"
tier: "candidate"
why_it_matters: >
  Introduces HypoGeniC, a system generating and iteratively refining hypotheses from a
  small set of labeled examples rather than from a full literature corpus, closer in
  scale to a single classroom's data than to the engine's own corpus-wide generation.
key_claims:
  - "HypoGeniC generates an initial pool of hypotheses from a small number of labeled training examples, then iteratively refines the pool by testing hypotheses against additional examples and updating a reward score for each."
  - "Hypotheses HypoGeniC generated, when handed to a separate downstream classifier as features, improved classification accuracy on several tasks relative to hypotheses written by a single-pass prompt without the iterative refinement loop."
  - "The paper reports the generated hypotheses were rated as more interpretable by human evaluators than an uninterpretable black-box classifier trained on the same data, though not directly compared for interpretability against human-authored hypotheses."
research_questions_it_leaves_open:
  - "Whether the small-data hypothesis-generation approach scales to the class sizes and label sparsity typical of a single K-12 classroom's own production data."
  - "How the iterative refinement loop's reward signal should change when the labels available are teacher review verdicts rather than a fixed ground-truth dataset."
how_it_bears_on_research_os: >
  Is a plausible small-data analog to the engine's own hypothesis generation for
  the specific case of a single class's production corpus, which `docs/RESEARCH-OS-
  INTEGRATION.md` notes ships as only twelve fixture productions across three grade
  bands, far smaller than the engine's typical corpus. HypoGeniC's use of a
  downstream classifier's accuracy as a proxy reward is a concrete alternative to a
  full tournament rank for a small, single-class run. Extends `OVERLAP-RESEARCH-OS-
  AND-AI-FOR-RESEARCH.md` question 4.
---

# Hypothesis Generation with Large Language Models

HypoGeniC generates and iteratively refines hypotheses from a small set of labeled
examples, with generated hypotheses improving a downstream classifier's accuracy
relative to single-pass prompting.

## Key Claims

- Generates an initial hypothesis pool from few labeled examples, then iteratively
  refines it against additional examples with a reward score.
- Hypotheses used as classifier features improved accuracy relative to hypotheses
  from single-pass prompting without refinement.
- Human evaluators rated the generated hypotheses as more interpretable than a
  black-box classifier trained on the same data.

## Research Questions It Leaves Open

- Whether the small-data approach scales to a single K-12 classroom's own label
  sparsity.
- How the reward signal should change when labels are teacher review verdicts rather
  than a fixed ground-truth dataset.

## How It Bears on Research OS

A plausible small-data analog to engine hypothesis generation for a single class's
production corpus, which ships as only twelve fixture productions today. Its
downstream-classifier reward is a concrete alternative to a full tournament rank for a
small, single-class run. Extends the overlap map's question 4.
