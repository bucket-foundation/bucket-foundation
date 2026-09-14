---
title: "A New Vector Partition of the Probability Score"
authors:
  - "Murphy, Allan H."
year: 1973
venue: "Journal of Applied Meteorology"
doi: "10.1175/1520-0450(1973)012<0595:ANVPOT>2.0.CO;2"
url: "https://doi.org/10.1175/1520-0450(1973)012<0595:ANVPOT>2.0.CO;2"
openalex_id: "https://openalex.org/W2047634553"
branch: "scientific-discovery-metascience"
tier: "canon"
why_it_matters: >
  Splits the Brier score into reliability, resolution, and uncertainty components, giving
  a way to tell whether a low calibration score traces to miscalibration or to weak
  discrimination between outcomes, the exact diagnosis PR #48's real-bug fix on the
  engine's own calibration gap (0.14 to 0.25 against 0.95 to 1.00 on synthetic worlds) had
  to find by code inspection rather than by a decomposed score.
key_claims:
  - "Formulates a new three-term partition of the probability (Brier) score: uncertainty,
    the inherent variance of the outcome itself; reliability, how far a forecaster's
    stated probabilities track observed frequencies; and resolution, how much a
    forecaster's probabilities vary across different outcome classes independent of
    whether they are correctly calibrated."
  - "The new partition's reliability and resolution terms are related to, but not
    linearly equivalent to, the terms in an earlier partition scheme, and the paper works
    through two forecast collections to show where the two partitions diverge."
  - "Two forecasters with an identical aggregate score can differ sharply in which
    component, reliability or resolution, is driving that score, a distinction the
    aggregate number alone hides."
research_questions_it_leaves_open:
  - "Whether the engine's own `hte.holdout_ledger` report computes this three-part
    decomposition anywhere, or only the aggregate Brier-style score, a diagnostic gap if
    the ledger cannot say whether a low score traces to miscalibration or to low
    discrimination without a code-level bug hunt."
  - "Whether the engine's own real-corpora calibration gap PR #48 closed was, in this
    paper's own vocabulary, a reliability failure, a resolution failure, or both, a
    question the bug fix (candidate addressing, deduplication, slot-matching) does not
    answer directly."
how_it_bears_on_research_os: >
  Supplies the missing diagnostic vocabulary for exactly the gap PR #48 closed by
  inspection: three real bugs (candidate addressing, deduplication, slot-matching) found
  by reading code after the calibration numbers came back low, rather than by a
  reliability-resolution breakdown that could have pointed at which bug mattered most
  before the search began. A future `hte.holdout_ledger` report that adopts this
  partition, rather than the aggregate score alone, would let a re-run after a future fix
  say directly whether the fix improved calibration, discrimination, or both, closing the
  same gap this paper's own comparison of two forecast collections closes for weather
  verification.
---

# A New Vector Partition of the Probability Score

Splits the Brier score into reliability, resolution, and uncertainty components, giving a
way to diagnose whether a low score traces to miscalibration or to weak discrimination
between outcomes.

## Key Claims

- Formulates a new three-term partition of the probability (Brier) score: uncertainty,
  the inherent variance of the outcome itself; reliability, how far a forecaster's stated
  probabilities track observed frequencies; and resolution, how much a forecaster's
  probabilities vary across different outcome classes independent of whether they are
  correctly calibrated.
- The new partition's reliability and resolution terms are related to, but not linearly
  equivalent to, the terms in an earlier partition scheme, and the paper works through two
  forecast collections to show where the two partitions diverge.
- Two forecasters with an identical aggregate score can differ sharply in which
  component, reliability or resolution, is driving that score, a distinction the aggregate
  number alone hides.

## Research Questions It Leaves Open

- Whether the engine's own `hte.holdout_ledger` report computes this three-part
  decomposition anywhere, or only the aggregate Brier-style score, a diagnostic gap if the
  ledger cannot say whether a low score traces to miscalibration or to low discrimination
  without a code-level bug hunt.
- Whether the engine's own real-corpora calibration gap PR #48 closed was, in this
  paper's own vocabulary, a reliability failure, a resolution failure, or both, a question
  the bug fix (candidate addressing, deduplication, slot-matching) does not answer
  directly.

## How It Bears on Research OS

Supplies the missing diagnostic vocabulary for exactly the gap PR #48 closed by
inspection: three real bugs (candidate addressing, deduplication, slot-matching) found by
reading code after the calibration numbers came back low, rather than by a
reliability-resolution breakdown that could have pointed at which bug mattered most before
the search began. A future `hte.holdout_ledger` report that adopts this partition, rather
than the aggregate score alone, would let a re-run after a future fix say directly whether
the fix improved calibration, discrimination, or both, closing the same gap this paper's
own comparison of two forecast collections closes for weather verification.
