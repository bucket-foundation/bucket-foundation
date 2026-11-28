# ESG Tilt

ID: `eq-green-returns`
Family: Equities
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Overweight green stocks.

## Source

1. Dissecting green returns. Pástor, Stambaugh, Taylor, 2022, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2022.07.007 (Crossref DOI, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/esg-factor-investing-strategy/ (fetched 2026-11-27)

## Claimed Edge

Green stocks beat brown in 2012-2020, but Pastor, Stambaugh and Taylor attribute it to unexpected climate concern.

## Post-Publication Decay

The authors expect lower future returns for green stocks.

Decay source: Dissecting green returns. Pástor, Stambaugh, Taylor, 2022, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2022.07.007 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia esg-factor-investing-strategy

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
