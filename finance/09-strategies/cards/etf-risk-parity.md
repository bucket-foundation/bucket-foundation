# Risk Parity

ID: `etf-risk-parity`
Family: ETFs and Macro
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Weight asset classes by inverse risk so each contributes equal volatility, then lever the portfolio.

## Source

1. Leverage Aversion and Risk Parity. Asness, Frazzini, Pedersen, 2012, Financial Analysts Journal. https://doi.org/10.2469/faj.v68.n1.1 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Asness, Frazzini and Pedersen argue leverage aversion makes low-risk assets earn more, which favors risk parity.

## Post-Publication Decay

Decay source: Leverage Aversion and Risk Parity. Asness, Frazzini, Pedersen, 2012, Financial Analysts Journal. https://doi.org/10.2469/faj.v68.n1.1 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md), [D-longrun](../../03-data-sources/cards/D-longrun.md)

## Implementation

[riskfolio-lib](../../08-software/riskfolio-lib.md), [pyportfolioopt](../../08-software/pyportfolioopt.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code QuantConnect/Lean: Algorithm.Framework/Portfolio/RiskParityPortfolioConstructionModel.py
- code QuantConnect/Lean: Algorithm.Python/RiskParityPortfolioAlgorithm.py
- code bt: bt/algos.py WeighERC / WeighMeanVar / TargetVol

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
