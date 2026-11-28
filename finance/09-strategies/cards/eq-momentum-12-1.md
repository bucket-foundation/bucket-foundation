# Cross-Sectional Stock Momentum

ID: `eq-momentum-12-1`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Rank stocks on return from month t-12 to t-2. Buy the top decile, short the bottom decile, hold 3 to 12 months.

## Source

1. Returns to Buying Winners and Selling Losers: Implications for Stock Market Efficiency. Jegadeesh, Titman, 1993, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1993.tb04702.x (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 3.1. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. Quantpedia free strategy page. https://quantpedia.com/strategies/momentum-factor-effect-in-stocks/ (fetched 2026-11-27)

## Claimed Edge

Significant positive returns over 3 to 12 month holding periods in US stocks; part of the first-year return dissipates over the next two years.

## Post-Publication Decay

Daniel and Moskowitz document momentum crashes after market rebounds, with the 2009 loser rally as the worst case. The factor survives in Jensen-Kelly-Pedersen replication.

Decay source: Momentum crashes. Daniel, Moskowitz, 2016, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2015.12.002 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large. Turnover above 100% a year caps it at a few tens of billions across managers.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[zipline-reloaded](../../08-software/zipline-reloaded.md), [alphalens-reloaded](../../08-software/alphalens-reloaded.md), [qlib](../../08-software/qlib.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 3.1
- Mom12m
- Mom6m
- Quantpedia momentum-effect-in-stocks-in-small-portfolios
- Quantpedia momentum-factor-effect-in-stocks
- code stefan-jansen/zipline-reloaded: src/zipline/examples/momentum_pipeline.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
