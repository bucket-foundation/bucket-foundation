---
title: "MLE-bench: Evaluating Machine Learning Agents on Machine Learning Engineering"
authors:
  - "Chan, Jun Shern"
  - "Chowdhury, Neil"
  - "Jaffe, Oliver"
  - "Aung, James"
  - "Sherburn, Dane"
  - "Mays, Evan"
  - "Starace, Giulio"
  - "Liu, Kevin"
  - "Maksin, Leon"
  - "Patwardhan, Tejal"
  - "Weng, Lilian"
  - "Mądry, Aleksander"
year: 2024
venue: "arXiv"
doi: "10.48550/arxiv.2410.07095"
url: "https://doi.org/10.48550/arxiv.2410.07095"
openalex_id: "https://openalex.org/W4403345800"
branch: "scientific-discovery-metascience"
tier: "candidate"
why_it_matters: >
  A benchmark-design precedent from outside pure hypothesis generation: rather than
  asking whether an AI agent's idea is novel, MLE-bench asks whether an agent can execute
  a full applied machine-learning task end to end against a human baseline, the same shift
  from generation quality to execution quality Si, Hashimoto, and Yang (2025) apply to
  research ideas specifically.
key_claims:
  - "Curates 75 real machine-learning-engineering competitions from Kaggle into a
    benchmark that tests an AI agent's ability to train models, prepare datasets, and run
    experiments, with human performance baselines established from each competition's own
    public leaderboard."
  - "The best-performing agent configuration tested, a frontier language model paired with
    an open-source agent scaffold, reached at least a Kaggle bronze-medal standard in
    16.9 percent of the 75 competitions, evidence current agents clear a real execution bar
    on a minority of tasks rather than most."
  - "Separately investigates how agent performance scales with more resources (more
    attempts, more compute) and checks for contamination from a model's own pre-training
    data overlapping the benchmark's tasks."
research_questions_it_leaves_open:
  - "Whether a K-12-scale research task, far narrower than a full Kaggle competition, needs
    its own execution-quality benchmark, or whether MLE-bench's own competition-grade
    difficulty is the wrong reference point for what a Research OS Production should be
    checked against."
  - "Whether the 16.9 percent bronze-medal rate this paper reports transfers to the
    hypothesis-generation and evidence-fusion tasks the engine itself performs, a different
    task family than applied ML engineering."
how_it_bears_on_research_os: >
  Sharpens what "the engine's ranking passed a check" should mean, alongside the
  forecasting-calibration cards in this batch: MLE-bench's own design measures whether an
  agent's output clears a human-competitive execution bar, not whether the agent's plan
  merely looks plausible, the same distinction Si, Yang, and Hashimoto (2024)'s idea-only
  evaluation and Si, Hashimoto, and Yang (2025)'s execution-focused follow-up draw for
  research ideas. A future benchmark for the engine's own hypothesis-ranking quality could
  borrow MLE-bench's own human-baseline-comparison design rather than inventing a bespoke
  pass/fail rule.
---

# MLE-bench: Evaluating Machine Learning Agents on Machine Learning Engineering

Curates 75 real Kaggle competitions into a benchmark testing whether an AI agent can
execute a full applied machine-learning task end to end against a human baseline.

## Key Claims

- Curates 75 real machine-learning-engineering competitions from Kaggle into a benchmark
  that tests an AI agent's ability to train models, prepare datasets, and run experiments,
  with human performance baselines established from each competition's own public
  leaderboard.
- The best-performing agent configuration tested, a frontier language model paired with
  an open-source agent scaffold, reached at least a Kaggle bronze-medal standard in 16.9
  percent of the 75 competitions, evidence current agents clear a real execution bar on a
  minority of tasks rather than most.
- Separately investigates how agent performance scales with more resources (more
  attempts, more compute) and checks for contamination from a model's own pre-training
  data overlapping the benchmark's tasks.

## Research Questions It Leaves Open

- Whether a K-12-scale research task, far narrower than a full Kaggle competition, needs
  its own execution-quality benchmark, or whether MLE-bench's own competition-grade
  difficulty is the wrong reference point for what a Research OS Production should be
  checked against.
- Whether the 16.9 percent bronze-medal rate this paper reports transfers to the
  hypothesis-generation and evidence-fusion tasks the engine itself performs, a different
  task family than applied ML engineering.

## How It Bears on Research OS

Sharpens what "the engine's ranking passed a check" should mean, alongside the
forecasting-calibration cards in this batch: MLE-bench's own design measures whether an
agent's output clears a human-competitive execution bar, not whether the agent's plan
merely looks plausible, the same distinction Si, Yang, and Hashimoto (2024)'s idea-only
evaluation and Si, Hashimoto, and Yang (2025)'s execution-focused follow-up draw for
research ideas. A future benchmark for the engine's own hypothesis-ranking quality could
borrow MLE-bench's own human-baseline-comparison design rather than inventing a bespoke
pass/fail rule.
