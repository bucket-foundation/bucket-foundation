<!-- voice-ignore-file: verbatim copy of a founder-authored literature card from _intake/research-os-k12-literature -->
---
title: "Accelerating Scientific Discovery with Co-Scientist"
authors:
  - "Gottweis, Juraj"
  - "Weng, Wei-Hung"
  - "Daryin, Alexander"
  - "Tu, Tao"
  - "Sirkovic, Petar"
  - "and 54 others"
year: 2026
venue: "Nature"
doi: "10.1038/s41586-026-10644-y"
url: "https://doi.org/10.1038/s41586-026-10644-y"
openalex_id: "https://openalex.org/W4416043407"
branch: "scientific-discovery-metascience"
tier: "canon"
why_it_matters: >
  The peer-reviewed record of Google DeepMind's multi-agent hypothesis-generation
  system, built on the same generate, critique, rank loop the hypothesis engine's own
  `hte.roles` module runs, and evaluated with a tournament and an Elo-style ranking
  the engine's own belief-fusion tournament closely parallels.
key_claims:
  - "The system runs a multi-agent pipeline, a generation agent proposing hypotheses, a reflection agent critiquing them, a ranking agent running a tournament between candidates, and an evolution agent refining top candidates over iterations."
  - "In a wet-lab validation arm, hypotheses the system ranked highly for drug-repurposing and gene-function targets were tested experimentally, with a subset confirmed by follow-up laboratory work the paper reports as independent of the system's own scoring."
  - "The paper reports the system's own tournament ranking correlated with expert scientist ratings of hypothesis quality on a held-out evaluation set, though the correlation was not perfect and the paper names cases of expert-system disagreement."
research_questions_it_leaves_open:
  - "What fraction of the system's top-ranked hypotheses would survive wet-lab testing outside the specific domains (drug repurposing, gene function) the paper validates in."
  - "Whether the tournament-ranking approach transfers to a domain, like a K-12 knowledge-graph production, where ground truth is available quickly rather than only after a slow laboratory validation step."
how_it_bears_on_research_os: >
  Is the most direct existing precedent for the engine's own tournament-ranking loop,
  `hte.roles.generate`, `critic`, `judge` map onto this system's generation,
  reflection, and ranking agents closely enough to compare designs directly. Its
  wet-lab validation arm gives a template for what `docs/RESEARCH-OS-INTEGRATION.md`
  question 21 (extended by `OVERLAP-RESEARCH-OS-AND-AI-FOR-RESEARCH.md` question 4)
  asks about a reviewed K-12 production meeting a novelty and testability bar: a
  teacher's review, standing in for the paper's wet-lab step, is the engine's own
  fast, cheap verification Messeri and Crockett (2024) argue most AI-for-science
  domains lack.
---

# Accelerating Scientific Discovery with Co-Scientist

A multi-agent hypothesis-generation system running a generate, critique, tournament-
rank, evolve loop, validated in a wet-lab arm on drug-repurposing and gene-function
targets, with tournament rankings correlated with expert scientist ratings.

## Key Claims

- The pipeline runs generation, reflection (critique), ranking (tournament), and
  evolution agents in sequence, refining top candidates over iterations.
- A wet-lab validation arm tested highly ranked hypotheses experimentally, with a
  subset confirmed by follow-up laboratory work.
- Tournament rankings correlated with expert scientist ratings on a held-out set,
  though not perfectly, with named cases of disagreement.

## Research Questions It Leaves Open

- What fraction of top-ranked hypotheses would survive wet-lab testing outside the
  validated domains.
- Whether tournament ranking transfers to a domain with fast ground truth rather than
  slow laboratory validation.

## How It Bears on Research OS

Is the closest existing precedent for the engine's own tournament loop: `hte.roles`'s
generate, critic, and judge roles map onto this system's generation, reflection, and
ranking agents. Its wet-lab validation gives a template for the novelty-and-
testability question the overlap map's question 4 asks about a reviewed K-12
production, with a teacher's review standing in for the slow wet-lab step.
