# Cross-Venue Funding Arbitrage

ID: `cy-cross-venue-funding`
Family: Crypto
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Go long the perpetual on the venue with the lowest funding and short it on the venue with the highest, collect the funding gap.

## Source

1. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

No claim in the code. Funding gaps are larger on small venues with more counterparty risk.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Medium.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[hummingbot](../../08-software/hummingbot.md)

## Code

- `hummingbot: scripts/v2_funding_rate_arb.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
