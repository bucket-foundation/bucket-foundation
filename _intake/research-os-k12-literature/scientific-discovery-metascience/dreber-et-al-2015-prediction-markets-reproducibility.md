---
title: "Using prediction markets to estimate the reproducibility of scientific research"
authors:
  - "Dreber, Anna"
  - "Pfeiffer, Thomas"
  - "Almenberg, Johan"
  - "Isaksson, Siri"
  - "Wilson, Brad"
  - "Chen, Yiling"
  - "Nosek, Brian A."
  - "Johannesson, Magnus"
year: 2015
venue: "Proceedings of the National Academy of Sciences"
doi: "10.1073/pnas.1516179112"
url: "https://doi.org/10.1073/pnas.1516179112"
openalex_id: "https://openalex.org/W2145409614"
branch: "scientific-discovery-metascience"
tier: "canon"
why_it_matters: >
  Shows a market-elicited probability estimate predicted which of 44 psychology studies
  would replicate better than an individual survey forecast did, direct precedent for
  treating a calibrated probability over a claim, not just a binary accept-or-reject verdict,
  as the informative output of a scientific-hypothesis evaluation system, the same shape as
  the engine's own ranked, calibrated hypothesis output.
key_claims:
  - "Prediction markets set up to trade on whether each of 44 studies from the
    Reproducibility Project: Psychology would replicate predicted the replication outcomes
    well, outperforming a survey of the same participants' individual forecasts."
  - "The markets let the researchers estimate a prior probability that a tested hypothesis
    was true at different stages of the research pipeline; the hypotheses being tested in
    psychology were estimated to have a low prior probability of being true (median about
    9 percent) before a well-powered replication raised confidence."
  - "The authors argue prediction markets could supply speedy, low-cost reproducibility
    information and could help decide which studies are worth replicating with limited
    resources."
research_questions_it_leaves_open:
  - "Whether a market-style aggregation mechanism, rather than a single model's stated
    confidence, would improve the engine's own hypothesis ranking, a design this paper
    tests among human researchers rather than automated evaluators."
  - "Whether the low prior-probability finding (about 9 percent of tested psychology
    hypotheses judged likely true before replication) generalizes to the domains the
    engine's own corpora cover, or is specific to the studies the Reproducibility Project
    sampled."
how_it_bears_on_research_os: >
  Corroborates the design choice behind the engine's own ranking label: this paper treats
  a calibrated probability, not a binary pass or fail, as the informative unit a
  replication-forecasting system should output, the same shape `hte.holdout_ledger`'s own
  ranking-status label is built around. Its own low-prior finding is a caution for the
  engine's belief fusion: if the domains the engine ranks hypotheses in carry a similarly
  low base rate of true claims, an unvalidated ranking risks looking more confident than the
  underlying claim pool warrants until enough held-out cases clear the ledger's own
  `MIN_VERIFIED_FOR_LABEL = 20` floor.
---

# Using prediction markets to estimate the reproducibility of scientific research

Shows a market-elicited probability estimate predicted which of 44 psychology studies
would replicate better than an individual survey forecast did.

## Key Claims

- Prediction markets set up to trade on whether each of 44 studies from the
  Reproducibility Project: Psychology would replicate predicted the replication outcomes
  well, outperforming a survey of the same participants' individual forecasts.
- The markets let the researchers estimate a prior probability that a tested hypothesis
  was true at different stages of the research pipeline; the hypotheses being tested in
  psychology were estimated to have a low prior probability of being true (median about 9
  percent) before a well-powered replication raised confidence.
- The authors argue prediction markets could supply speedy, low-cost reproducibility
  information and could help decide which studies are worth replicating with limited
  resources.

## Research Questions It Leaves Open

- Whether a market-style aggregation mechanism, rather than a single model's stated
  confidence, would improve the engine's own hypothesis ranking, a design this paper tests
  among human researchers rather than automated evaluators.
- Whether the low prior-probability finding (about 9 percent of tested psychology
  hypotheses judged likely true before replication) generalizes to the domains the
  engine's own corpora cover, or is specific to the studies the Reproducibility Project
  sampled.

## How It Bears on Research OS

Corroborates the design choice behind the engine's own ranking label: this paper treats a
calibrated probability, not a binary pass or fail, as the informative unit a
replication-forecasting system should output, the same shape `hte.holdout_ledger`'s own
ranking-status label is built around. Its own low-prior finding is a caution for the
engine's belief fusion: if the domains the engine ranks hypotheses in carry a similarly low
base rate of true claims, an unvalidated ranking risks looking more confident than the
underlying claim pool warrants until enough held-out cases clear the ledger's own
`MIN_VERIFIED_FOR_LABEL = 20` floor.
