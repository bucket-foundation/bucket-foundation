# OLMAR Online Mean Reversion

ID: `ex-olmar`
Family: Execution and Portfolio Construction
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Each period, move portfolio weights toward assets whose price sits below their moving average, by a passive-aggressive update.

## Source

1. Moving average reversion strategy for on-line portfolio selection. Li and co-authors, 2015, Artificial Intelligence. https://doi.org/10.1016/j.artint.2015.01.006 (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 3 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Li and Hoi 2012 reported OLMAR beat other online portfolio methods on six datasets before costs.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[QuantConnect/Lean](../../08-software/lean.md), [stefan-jansen/zipline-reloaded](../../08-software/zipline-reloaded.md)

## Code

- `QuantConnect/Lean: Algorithm.Framework/Portfolio/MeanReversionPortfolioConstructionModel.py`
- `QuantConnect/Lean: Algorithm.Python/MeanReversionPortfolioAlgorithm.py`
- `stefan-jansen/zipline-reloaded: src/zipline/examples/olmar.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
