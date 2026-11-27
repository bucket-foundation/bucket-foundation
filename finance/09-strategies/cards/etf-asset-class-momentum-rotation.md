# Asset Class Momentum Rotation

ID: `etf-asset-class-momentum-rotation`
Family: ETFs and Macro
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Quantpedia

## Logic

Each month hold the 3 of 5 asset class ETFs, US stocks, foreign stocks, bonds, REITs and commodities, with the best 12-month return, equal weight.

## Source

1. Quantpedia, Momentum Asset Allocation Strategy. https://quantpedia.com/strategies/asset-class-momentum-rotational-system/ (web fetch, fetched 2026-11-27)
2. Mebane Faber: Relative Strength Strategies for Investing. http://papers.ssrn.com/sol3/papers.cfm?abstract_id=1585517 (linked from Quantpedia; SSRN blocked the fetch )

## Claimed Edge

Quantpedia, from the source paper over 1973 to 2009: 14.49% per annum, Sharpe 0.78.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

- code QuantConnect/Lean: Algorithm.Python/ETFGlobalRotationAlgorithm.py
- code bt: bt/algos.py SelectMomentum + WeighInvVol
- code lumibot: lumibot/example_strategies/stock_momentum.py
- code lumibot: lumibot/example_strategies/agent_momentum_allocator.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
