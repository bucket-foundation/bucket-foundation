---
title: "Verification of Forecasts Expressed in Terms of Probability"
authors:
  - "Brier, Glenn W."
year: 1950
venue: "Monthly Weather Review"
doi: "10.1175/1520-0493(1950)078<0001:VOFEIT>2.0.CO;2"
url: "https://doi.org/10.1175/1520-0493(1950)078<0001:VOFEIT>2.0.CO;2"
openalex_id: "https://openalex.org/W2073241381"
branch: "scientific-discovery-metascience"
tier: "canon"
why_it_matters: >
  Defines the quadratic probability scoring rule, the Brier score, that the hypothesis
  engine's own holdout campaigns already report (the `literature` corpus run's own 0.0226
  figure). This card is the founding citation for that number rather than an incidental
  analogy: naming the metric before assuming its use is warranted the way the corpus's own
  verification standard requires.
key_claims:
  - "Proposes a quadratic scoring rule for a probabilistic forecast checked against an
    observed categorical outcome, rewarding a forecaster whose stated probabilities track
    the true frequency of events."
  - "The rule is a proper scoring rule: a forecaster who wants to minimize their expected
    score has no incentive to report anything other than their honest probability
    estimate, unlike scoring rules that reward overconfidence or hedging."
  - "Originally built to verify categorical weather forecasts, the scoring rule generalizes
    to any system that outputs a probability over a small set of possible outcomes."
research_questions_it_leaves_open:
  - "Whether the quadratic form is the right proper scoring rule for the engine's own
    holdout ledger, against a log-loss or other proper scoring rule, a choice the ledger's
    own documentation does not defend from first principles."
  - "How a Brier-style score should be aggregated across the engine's own two holdout
    modes, k-fold evidence holdout and discovery-date holdout, which this paper's own
    single-forecast framing does not address."
how_it_bears_on_research_os: >
  Is the founding definition behind the Brier score the engine's own campaign runs
  already report (0.0226 for the `literature` corpus's k-fold holdout, `docs/
  RESEARCH-OS-INTEGRATION.md`), so `hte.holdout_ledger`'s own hit-rate report rests on a
  75-year-old, still-standard scoring rule rather than a novel metric invented for this
  system. Motivates why the ledger's own `MIN_VERIFIED_FOR_LABEL = 20` gate withholds a
  validated label until enough held-out cases accumulate: a proper scoring rule rewards
  honest reporting in expectation, not on any single held-out case, so a ranking label
  earned from too few cases is exactly the overconfidence this rule's own properness
  guards against once enough cases exist to check it.
---

# Verification of Forecasts Expressed in Terms of Probability

Defines the quadratic probability scoring rule, the Brier score, that rewards a forecaster
whose stated probabilities track the true frequency of events rather than one who hedges
or overstates confidence.

## Key Claims

- Proposes a quadratic scoring rule for a probabilistic forecast checked against an
  observed categorical outcome, rewarding a forecaster whose stated probabilities track
  the true frequency of events.
- The rule is a proper scoring rule: a forecaster who wants to minimize their expected
  score has no incentive to report anything other than their honest probability estimate,
  unlike scoring rules that reward overconfidence or hedging.
- Originally built to verify categorical weather forecasts, the scoring rule generalizes
  to any system that outputs a probability over a small set of possible outcomes.

## Research Questions It Leaves Open

- Whether the quadratic form is the right proper scoring rule for the engine's own
  holdout ledger, against a log-loss or other proper scoring rule, a choice the ledger's
  own documentation does not defend from first principles.
- How a Brier-style score should be aggregated across the engine's own two holdout modes,
  k-fold evidence holdout and discovery-date holdout, which this paper's own
  single-forecast framing does not address.

## How It Bears on Research OS

Is the founding definition behind the Brier score the engine's own campaign runs already
report (0.0226 for the `literature` corpus's k-fold holdout, `docs/
RESEARCH-OS-INTEGRATION.md`), so `hte.holdout_ledger`'s own hit-rate report rests on a
75-year-old, still-standard scoring rule rather than a novel metric invented for this
system. Motivates why the ledger's own `MIN_VERIFIED_FOR_LABEL = 20` gate withholds a
validated label until enough held-out cases accumulate: a proper scoring rule rewards
honest reporting in expectation, not on any single held-out case, so a ranking label
earned from too few cases is exactly the overconfidence this rule's own properness guards
against once enough cases exist to check it.
