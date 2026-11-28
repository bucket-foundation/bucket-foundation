# January Effect

ID: `eq-january-effect`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy small caps in late December, sell in late January.

## Source

1. Size-related anomalies and stock return seasonality. Keim, 1983, Journal of Financial Economics. https://doi.org/10.1016/0304-405X(83)90025-9 (Crossref DOI, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/january-effect-in-stocks/ (fetched 2026-11-27)

## Claimed Edge

Keim found half the size premium arrived in January, much of it in the first week.

## Post-Publication Decay

The January size premium has shrunk since publication. Schwert lists it among anomalies that weakened.

Decay source: Anomalies and Market Efficiency. Schwert, 2002. https://doi.org/10.2139/ssrn.338080 (Crossref search, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[vectorbt](../../08-software/vectorbt.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia january-effect-in-stocks

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
