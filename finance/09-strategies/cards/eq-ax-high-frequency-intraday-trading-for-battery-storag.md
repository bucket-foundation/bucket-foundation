# High-frequency intraday trading for battery storages

ID: `eq-ax-high-frequency-intraday-trading-for-battery-storag`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: By combining the established rolling intrinsic logic with a full limit order book representation and a fast dynamic programming approximation, our method explicitly considers the continuously updated list of buy and sell offers, market rules, a linear approximation of degradation, and other technical parameters at a millisecond resolution. This paper introduces and evaluates a computationally efficient, high-frequency implementation of the rolling intrinsic trading strategy for battery energy storage systems on the intraday market for power.

## Source

1. High-frequency intraday trading for battery storages. David Schaurecker and co-authors, 2025, arXiv 2504.06932. https://arxiv.org/abs/2504.06932 (arXiv API, fetched 2026-11-27)
2. Published version: https://doi.org/10.1016/j.apenergy.2026.128550 (DOI listed by the arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: A detailed backtest over a full year of German order book data demonstrates that the proposed dynamic programming formulation does not reduce trading profits and enables the policy to react to every relevant order book update, enabling realistic rapid backtesting. Our results show the large revenue potential of high-frequency trading: our policy earns 58% more than when re-optimizing only once every hour and 14% more than when re-optimizing once per minute, highlighting that profits critically depend on trading speed.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
