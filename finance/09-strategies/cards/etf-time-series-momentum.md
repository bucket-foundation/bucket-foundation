# Time-Series Momentum

ID: `etf-time-series-momentum`
Family: ETFs and Macro
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Go long each futures or ETF when its own past 12-month excess return is positive, short when negative, scaled to equal volatility.

## Source

1. Time series momentum. Moskowitz, Ooi, Pedersen, 2012, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2011.11.003 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 10.4. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. Quantpedia free strategy page. https://quantpedia.com/strategies/time-series-momentum-effect/ (fetched 2026-11-27)

## Claimed Edge

Significant time-series momentum in equity index, currency, commodity and bond futures.

## Post-Publication Decay

Huang and co-authors find the time-series predictability weak once pooling bias is removed. Trend returns were poor from 2012 to 2019.

Decay source: Time series momentum: Is it there?. Huang, Li, Wang, Zhou, 2020, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2019.08.004 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large. Futures markets carry hundreds of billions in trend money.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[pysystemtrade](../../08-software/pysystemtrade.md), [bt](../../08-software/bt.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 10.4
- KS 4.6
- Quantpedia time-series-momentum-effect
- code QuantConnect/Lean: Algorithm.Framework/Alphas/HistoricalReturnsAlphaModel.py
- code finmarketpy: finmarketpy_examples/tradingmodelfxtrend_example.py
- code pysystemtrade: systems/provided/rules/ewmac.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
