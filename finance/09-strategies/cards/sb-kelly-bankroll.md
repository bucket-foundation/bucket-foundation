# Kelly Staking for Bettors

ID: `sb-kelly-bankroll`
Family: Sports Betting
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Size each bet at edge over odds; use a fraction of Kelly to cut variance.

## Source

1. A New Interpretation of Information Rate. Kelly, 1956, Bell System Technical Journal. https://doi.org/10.1002/j.1538-7305.1956.tb03809.x (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Kelly maximizes long-run log growth given a true edge.

## Post-Publication Decay

A sizing rule; with no edge it loses.

Decay source: A New Interpretation of Information Rate. Kelly, 1956, Bell System Technical Journal. https://doi.org/10.1002/j.1538-7305.1956.tb03809.x (Crossref DOI, fetched 2026-11-27)

## Capacity

n/a

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code kalshi-ai-trading-bot: src/strategies/portfolio_optimization.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
