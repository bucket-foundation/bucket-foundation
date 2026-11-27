# Bond Carry and Roll-Down

ID: `rt-bond-carry`
Family: Rates
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Overweight government bonds with the highest yield plus roll-down across countries and maturities.

## Source

1. Carry. Koijen, Moskowitz, Pedersen, Vrugt, 2018, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2017.11.002 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 5.2. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Carry predicts returns in global bonds, equities, currencies and commodities.

## Post-Publication Decay

Bond carry suffers in sharp rate rises such as 2022.

Decay source: Carry. Koijen, Moskowitz, Pedersen, Vrugt, 2018, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2017.11.002 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large via bond futures.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[pysystemtrade](../../08-software/pysystemtrade.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 5.11
- KS 5.12

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
