# WTI-Brent Spread

ID: `cm-wti-brent`
Family: Commodities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Trade mean reversion in the WTI-Brent futures spread.

## Source

1. Trading WTI/BRENT Spread - Quantpedia. web. https://quantpedia.com/strategies/trading-wti-brent-spread/ (web page, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 9.4. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. Quantpedia free strategy page. https://quantpedia.com/strategies/trading-wti-brent-spread/ (fetched 2026-11-27)
4. Lifting the US Crude Oil Export Ban: A Numerical Partial-Equilibrium Analysis. Langer, 2016. https://doi.org/10.2139/ssrn.2733473 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Quantpedia lists the spread as mean-reverting around transport costs.

## Post-Publication Decay

A partial-equilibrium model finds that lifting the US crude export ban expands US sweet crude exports and cuts US refiner profits as distortions shrink (Langer, 2016).

Decay source: Lifting the US Crude Oil Export Ban: A Numerical Partial-Equilibrium Analysis. Langer, 2016. https://doi.org/10.2139/ssrn.2733473 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[pysystemtrade](../../08-software/pysystemtrade.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia trading-wti-brent-spread

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
