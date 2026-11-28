# When Alpha Disappears: A One-Switch Benchmark for Decision-Time Leakage in Financial Backtests

ID: `eq-ax-when-alpha-disappears-a-one-switch-benchmark-for-d`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: Rather than treating leakage as a binary property, the benchmark estimates protocol-induced inflation by toggling one evaluation convention at a time around a clean $t{+}1$-open reference, while holding the data panel, walk-forward split, model family, horizon, portfolio rule, and cost convention fixed.

## Source

1. When Alpha Disappears: A One-Switch Benchmark for Decision-Time Leakage in Financial Backtests. Fan Zhang and co-authors, 2026, arXiv 2605.23959. https://arxiv.org/abs/2605.23959 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: We introduce When Alpha Disappears, a paired evaluation benchmark for diagnosing decision-time leakage in financial machine-learning backtests. The benchmark is diagnostic rather than a claim of tradable alpha, and is intended to make evaluation assumptions, failure modes, and protocol fragility directly measurable.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
