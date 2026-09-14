---
title: "Psychological Strategies for Winning a Geopolitical Forecasting Tournament"
authors:
  - "Mellers, Barbara"
  - "Ungar, Lyle"
  - "Baron, Jonathan"
  - "Ramos, Jaime"
  - "Gürçay, Burcu"
  - "Fincher, Katrina"
  - "Scott, Sydney"
  - "Moore, Don"
year: 2014
venue: "Psychological Science"
doi: "10.1177/0956797614524255"
url: "https://doi.org/10.1177/0956797614524255"
openalex_id: "https://openalex.org/W2131472525"
branch: "scientific-discovery-metascience"
tier: "canon"
why_it_matters: >
  Names three non-architectural interventions, training, teaming, and tracking, that
  independently raised human forecasting accuracy in a multi-year geopolitical tournament,
  the closest published account of what separates a well-calibrated forecaster from an
  average one, relevant to whether the hypothesis engine's own ranking quality can be
  improved by process changes rather than model changes alone.
key_claims:
  - "Three psychological interventions independently raised forecasting accuracy in a
    two-year IARPA-run geopolitical forecasting tournament: probability training that
    corrected cognitive biases and taught reference-class reasoning and averaging
    heuristics, teaming that let forecasters share information and discuss rationales, and
    tracking that placed the prior year's top 2 percent of forecasters into elite teams."
  - "All three interventions improved both calibration and resolution, the same two
    components Murphy (1973) names as jointly driving a probability score."
  - "Forecasting is framed as a behavioral, not only statistical, problem: putting
    psychological interventions and statistical aggregation methods to work together
    produced the tournament's best forecasts across both years studied."
research_questions_it_leaves_open:
  - "Whether the trainable-calibration finding generalizes to a machine model's own
    confidence outputs, or is specific to the human forecasters whose probability
    judgments this paper measures."
  - "Whether the engine's own tournament-style Elo ranking, which already fuses evidence
    across hypotheses, would benefit from an analogous elevate-top-performers step,
    distinct from the calibration-and-ranking blend it already runs."
how_it_bears_on_research_os: >
  Offers a human-side precedent for the engine's own `MIN_VERIFIED_FOR_LABEL = 20` gate:
  the tournament's own headline result is that tracking and elevating a small number of
  consistently well-calibrated forecasters into elite teams beat a larger undifferentiated
  pool, the same selection-after-tracking logic a ranking label that waits for enough
  held-out cases applies to a model run instead of a person. Also names training as an
  independent lever: if a future engine iteration exposes its own calibration record
  (the self-report PR #60 shipped) back into how campaigns are configured, this paper is
  evidence that exposing calibration feedback, not just architecture changes, is a route to
  a better-calibrated ranking.
---

# Psychological Strategies for Winning a Geopolitical Forecasting Tournament

Names three non-architectural interventions, training, teaming, and tracking, that
independently raised human forecasting accuracy in a multi-year geopolitical tournament.

## Key Claims

- Three psychological interventions independently raised forecasting accuracy in a
  two-year IARPA-run geopolitical forecasting tournament: probability training that
  corrected cognitive biases and taught reference-class reasoning and averaging
  heuristics, teaming that let forecasters share information and discuss rationales, and
  tracking that placed the prior year's top 2 percent of forecasters into elite teams.
- All three interventions improved both calibration and resolution, the same two
  components Murphy (1973) names as jointly driving a probability score.
- Forecasting is framed as a behavioral, not only statistical, problem: putting
  psychological interventions and statistical aggregation methods to work together
  produced the tournament's best forecasts across both years studied.

## Research Questions It Leaves Open

- Whether the trainable-calibration finding generalizes to a machine model's own
  confidence outputs, or is specific to the human forecasters whose probability judgments
  this paper measures.
- Whether the engine's own tournament-style Elo ranking, which already fuses evidence
  across hypotheses, would benefit from an analogous elevate-top-performers step, distinct
  from the calibration-and-ranking blend it already runs.

## How It Bears on Research OS

Offers a human-side precedent for the engine's own `MIN_VERIFIED_FOR_LABEL = 20` gate: the
tournament's own headline result is that tracking and elevating a small number of
consistently well-calibrated forecasters into elite teams beat a larger undifferentiated
pool, the same selection-after-tracking logic a ranking label that waits for enough
held-out cases applies to a model run instead of a person. Also names training as an
independent lever: if a future engine iteration exposes its own calibration record (the
self-report PR #60 shipped) back into how campaigns are configured, this paper is
evidence that exposing calibration feedback, not just architecture changes, is a route to
a better-calibrated ranking.
