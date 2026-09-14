---
title: "DiscoveryWorld: A Virtual Environment for Developing and Evaluating Automated Scientific Discovery Agents"
authors:
  - "Jansen, Peter"
  - "Côté, Marc-Alexandre"
  - "Khot, Tushar"
  - "Bransom, Erin"
  - "Dalvi Mishra, Bhavana"
  - "Majumder, Bodhisattwa Prasad"
  - "Tafjord, Oyvind"
  - "Clark, Peter"
year: 2024
venue: "arXiv"
doi: "10.48550/arxiv.2406.06769"
url: "https://doi.org/10.48550/arxiv.2406.06769"
openalex_id: "https://openalex.org/W4399597648"
branch: "scientific-discovery-metascience"
tier: "candidate"
why_it_matters: >
  Names three separate metrics for scoring an agent's discovery attempt, task completion,
  task-relevant actions taken, and the discovered explanatory knowledge itself, a
  finer-grained benchmark-design vocabulary than a single pass or fail, relevant to what a
  ranking-validation benchmark for the hypothesis engine could measure beyond whether a
  final hypothesis was correct.
key_claims:
  - "Introduces DiscoveryWorld, a text-based (with an optional 2D visual overlay), low-cost
    simulated environment offering 120 discovery tasks across eight topics, radioisotope
    dating, rocket science, and proteomics among them, each requiring an agent to form
    hypotheses, design and run experiments, analyze results, and act on conclusions."
  - "Provides three automatic metrics for evaluating an agent's discovery process: whether
    the task was completed, whether the actions the agent took were relevant to the task,
    and how well the agent's own discovered explanatory knowledge matches the ground
    truth, rather than scoring task completion alone."
  - "Strong baseline agents that perform well in prior published discovery-agent
    environments struggle on most DiscoveryWorld tasks, evidence the environment captures
    discovery challenges its predecessors did not."
research_questions_it_leaves_open:
  - "Whether the three-metric design, completion, relevant actions, and discovered
    knowledge, maps onto a useful three-part score for the engine's own campaigns, which
    today report a single calibration number rather than a decomposed discovery-process
    score."
  - "Whether an environment built around discrete, gamified discovery tasks like
    radioisotope dating transfers any design lessons to the engine's own citation-graph and
    slot-filled hypothesis space, a structurally different kind of discovery task."
how_it_bears_on_research_os: >
  Supplies a benchmark-design vocabulary the engine's own `hte.holdout_ledger` does not
  yet have: DiscoveryWorld scores an agent on task-relevant actions and discovered
  explanatory knowledge, not completion alone, a decomposition in the same spirit as
  Murphy (1973)'s reliability-resolution split for calibration, applied here to the
  process of discovery rather than to a probability estimate. A future engine benchmark
  aimed at validating the ranking process itself, not just the final calibration score,
  could adopt a comparable process-versus-outcome split.
---

# DiscoveryWorld: A Virtual Environment for Developing and Evaluating Automated Scientific Discovery Agents

Names three separate metrics for scoring an agent's discovery attempt: task completion,
task-relevant actions taken, and the discovered explanatory knowledge itself.

## Key Claims

- Introduces DiscoveryWorld, a text-based (with an optional 2D visual overlay), low-cost
  simulated environment offering 120 discovery tasks across eight topics, radioisotope
  dating, rocket science, and proteomics among them, each requiring an agent to form
  hypotheses, design and run experiments, analyze results, and act on conclusions.
- Provides three automatic metrics for evaluating an agent's discovery process: whether
  the task was completed, whether the actions the agent took were relevant to the task,
  and how well the agent's own discovered explanatory knowledge matches the ground truth,
  rather than scoring task completion alone.
- Strong baseline agents that perform well in prior published discovery-agent
  environments struggle on most DiscoveryWorld tasks, evidence the environment captures
  discovery challenges its predecessors did not.

## Research Questions It Leaves Open

- Whether the three-metric design, completion, relevant actions, and discovered
  knowledge, maps onto a useful three-part score for the engine's own campaigns, which
  today report a single calibration number rather than a decomposed discovery-process
  score.
- Whether an environment built around discrete, gamified discovery tasks like
  radioisotope dating transfers any design lessons to the engine's own citation-graph and
  slot-filled hypothesis space, a structurally different kind of discovery task.

## How It Bears on Research OS

Supplies a benchmark-design vocabulary the engine's own `hte.holdout_ledger` does not yet
have: DiscoveryWorld scores an agent on task-relevant actions and discovered explanatory
knowledge, not completion alone, a decomposition in the same spirit as Murphy (1973)'s
reliability-resolution split for calibration, applied here to the process of discovery
rather than to a probability estimate. A future engine benchmark aimed at validating the
ranking process itself, not just the final calibration score, could adopt a comparable
process-versus-outcome split.
