---
title: "DiscoveryBench: Towards Data-Driven Discovery with Large Language Models"
authors:
  - "Majumder, Bodhisattwa Prasad"
  - "Surana, Harshit"
  - "Agarwal, Dhruv"
  - "Dalvi Mishra, Bhavana"
  - "Meena, Abhijeetsingh"
  - "Prakhar, Aryan"
  - "Vora, Tirth"
  - "Khot, Tushar"
  - "Sabharwal, Ashish"
  - "Clark, Peter"
year: 2024
venue: "arXiv"
doi: "10.48550/arxiv.2407.01725"
url: "https://doi.org/10.48550/arxiv.2407.01725"
openalex_id: "https://openalex.org/W4400373784"
branch: "scientific-discovery-metascience"
tier: "candidate"
why_it_matters: >
  Formalizes data-driven discovery as a benchmarkable, multi-step task derived directly
  from published papers rather than invented tasks, and finds even the best tested
  LLM-based system scores only about a quarter of tasks correctly, a low-headroom finding
  relevant to how much confidence a ranking system should place in an unvalidated
  AI-generated hypothesis before holdout evidence accumulates.
key_claims:
  - "Introduces DiscoveryBench, a benchmark of 264 discovery tasks manually derived from
    published papers' own discovery workflows across six domains including sociology and
    engineering, each task defined by a dataset, its metadata, and a natural-language
    discovery goal, plus 903 additional synthetic tasks for controlled complexity testing."
  - "Its structured task formalism supports facet-based evaluation, scoring not just
    whether a discovered hypothesis was correct but which part of the discovery workflow
    failed, a more diagnostic evaluation than pass or fail alone."
  - "Evaluating several popular LLM-based reasoning frameworks with both open and closed
    models as baselines, even the best-scoring system solved only about 25 percent of
    tasks, evidence current systems fall well short of reliable autonomous data-driven
    discovery."
research_questions_it_leaves_open:
  - "Whether the facet-based failure-mode evaluation this benchmark introduces has a
    counterpart in the engine's own campaign output, which reports an aggregate
    calibration score without a per-step failure breakdown."
  - "Whether the roughly 25 percent best-system success rate this paper reports on
    published-paper-derived discovery tasks is comparable to, better than, or worse than
    the engine's own coverage-of-truth figures on its shipped corpora, a direct benchmark
    comparison this pass does not run."
how_it_bears_on_research_os: >
  Sets a low-headroom external reference point for the ranking-validation question this
  batch's forecasting-calibration cards raise from the human side: if even the best tested
  LLM-based discovery system solves only about a quarter of published-paper-derived
  discovery tasks, an AI-generated hypothesis ranking, whether from the engine or from a
  K-12 learner's own routed workspace, should be read against a similarly low base rate of
  reliable automated discovery rather than assumed correct by default, the same caution
  Dreber and colleagues (2015)'s own low-prior finding raises for psychology hypotheses
  generally.
---

# DiscoveryBench: Towards Data-Driven Discovery with Large Language Models

Formalizes data-driven discovery as a benchmarkable task derived from published papers;
even the best tested LLM-based system solves only about a quarter of tasks.

## Key Claims

- Introduces DiscoveryBench, a benchmark of 264 discovery tasks manually derived from
  published papers' own discovery workflows across six domains including sociology and
  engineering, each task defined by a dataset, its metadata, and a natural-language
  discovery goal, plus 903 additional synthetic tasks for controlled complexity testing.
- Its structured task formalism supports facet-based evaluation, scoring not just
  whether a discovered hypothesis was correct but which part of the discovery workflow
  failed, a more diagnostic evaluation than pass or fail alone.
- Evaluating several popular LLM-based reasoning frameworks with both open and closed
  models as baselines, even the best-scoring system solved only about 25 percent of
  tasks, evidence current systems fall well short of reliable autonomous data-driven
  discovery.

## Research Questions It Leaves Open

- Whether the facet-based failure-mode evaluation this benchmark introduces has a
  counterpart in the engine's own campaign output, which reports an aggregate calibration
  score without a per-step failure breakdown.
- Whether the roughly 25 percent best-system success rate this paper reports on
  published-paper-derived discovery tasks is comparable to, better than, or worse than the
  engine's own coverage-of-truth figures on its shipped corpora, a direct benchmark
  comparison this pass does not run.

## How It Bears on Research OS

Sets a low-headroom external reference point for the ranking-validation question this
batch's forecasting-calibration cards raise from the human side: if even the best tested
LLM-based discovery system solves only about a quarter of published-paper-derived
discovery tasks, an AI-generated hypothesis ranking, whether from the engine or from a
K-12 learner's own routed workspace, should be read against a similarly low base rate of
reliable automated discovery rather than assumed correct by default, the same caution
Dreber and colleagues (2015)'s own low-prior finding raises for psychology hypotheses
generally.
