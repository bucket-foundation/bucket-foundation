# Pairs Trading, Distance Method

ID: `eq-pairs-distance`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Match stocks with the smallest sum of squared normalized price gaps. Open when the gap exceeds two standard deviations, close on convergence.

## Source

1. Pairs Trading: Performance of a Relative-Value Arbitrage Rule. Gatev, Goetzmann, Rouwenhorst, 2006, Review of Financial Studies. https://doi.org/10.1093/rfs/hhj020 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 3.8. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. Quantpedia free strategy page. https://quantpedia.com/strategies/pairs-trading-with-stocks/ (fetched 2026-11-27)

## Claimed Edge

Gatev, Goetzmann and Rouwenhorst report positive excess returns from self-financing pairs portfolios.

## Post-Publication Decay

Do and Faff, titled Does Simple Pairs Trading Still Work, find declining profitability in later decades.

Decay source: Does Simple Pairs Trading Still Work?. Do, Faff, 2010, Financial Analysts Journal. https://doi.org/10.2469/faj.v66.n4.1 (Crossref DOI, fetched 2026-11-27)

## Capacity

Small to medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[mlfinlab](../../08-software/mlfinlab.md), [nautilus_trader](../../08-software/nautilus_trader.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 3.8
- Quantpedia pairs-trading-with-stocks
- code QuantConnect/Lean: Algorithm.Framework/Alphas/PearsonCorrelationPairsTradingAlphaModel.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
