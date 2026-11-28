# Share Class Arbitrage

ID: `eq-share-class-arb`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Long the cheap and short the rich share class of the same company, dollar neutral, when their ratio leaves its range.

## Source

1. Mispricing of Dual-Class Shares: Profit Opportunities, Arbitrage, and Trading. Schultz, Shive, 2009, Crossref. https://doi.org/10.2139/ssrn.1338885 (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Schultz and Shive 2010 found mispricing between dual-class shares that reverts.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[QuantConnect/Lean](../../08-software/lean.md)

## Code

- `QuantConnect/Lean: Algorithm.Python/Alphas/ShareClassMeanReversionAlpha.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
