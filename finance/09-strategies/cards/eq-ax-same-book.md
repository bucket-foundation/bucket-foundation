# Same Book

ID: `eq-ax-same-book`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Passive-execution backtests can therefore depend on an unobserved cancellation-allocation rule even when observed prices, quantities, and trades are held fixed. Holding that path, reconciled market removals, latent order partitions, and additions fixed, our path-preserving compiler varies only cancellation allocation among front, quantity-weighted-random, and back rules.

## Source

1. Same Book, Different Fills: Partial Identification of FIFO Execution from Aggregate Order Books. Riya Danait and co-authors, 2026, arXiv 2609.13597. https://arxiv.org/abs/2609.13597 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: For 1301.T, front rather than back cancellation raises preterminal completion by 8.01 percentage points and reduces implementation shortfall by 1.010 bps. For 7911.T, the corresponding differences are 7.39 percentage points and 0.384 bps.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
