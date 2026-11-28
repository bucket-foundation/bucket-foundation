# Quality Minus Junk

ID: `eq-quality-minus-junk`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Score stocks on profitability, growth, safety and payout. Long high quality, short junk.

## Source

1. Quality minus junk. Asness, Frazzini, Pedersen, 2018, Review of Accounting Studies. https://doi.org/10.1007/s11142-018-9470-2 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 3.5. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

QMJ earned significant risk-adjusted returns in the US and internationally.

## Post-Publication Decay

Quality is one of the 13 themes Jensen-Kelly-Pedersen find replicate out of sample in 93 countries.

Decay source: Is There a Replication Crisis in Finance?. Jensen, Kelly, Pedersen, 2023, The Journal of Finance. https://doi.org/10.1111/jofi.13249 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large. Low turnover.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md), [D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

[alphalens-reloaded](../../08-software/alphalens-reloaded.md), [qlib](../../08-software/qlib.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code lumibot: lumibot/example_strategies/stock_revenue_growth_low_debt.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
