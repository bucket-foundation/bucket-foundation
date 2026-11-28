# Gross Profitability

ID: `eq-gross-profitability`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Rank on gross profit over assets. Buy the most profitable firms.

## Source

1. The other side of value: The gross profitability premium. Novy-Marx, 2013, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2013.01.003 (Crossref DOI, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/roa-effect-within-stocks/ (fetched 2026-11-27)

## Claimed Edge

Gross profitability predicts returns with the same power as book-to-market, and the two hedge each other.

## Post-Publication Decay

Profitability holds up in Hou-Xue-Zhang. It entered the Fama-French five-factor model as RMW.

Decay source: A five-factor asset pricing model. Fama, French, 2015, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2014.10.010 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md), [D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

[alphalens-reloaded](../../08-software/alphalens-reloaded.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- GP
- GPlag
- GPlag_q

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
