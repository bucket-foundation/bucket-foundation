# Turn of the Month

ID: `eq-turn-of-month`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Hold the index from the last trading day of the month through the first three days of the next.

## Source

1. A monthly effect in stock returns. Ariel, 1987, Journal of Financial Economics. https://doi.org/10.1016/0304-405X(87)90066-3 (Crossref DOI, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/turn-of-the-month-in-equity-indexes/ (fetched 2026-11-27)

## Claimed Edge

Ariel found nearly all positive US stock returns arrived in the first half of the month.

## Post-Publication Decay

Persists in index data with smaller magnitude. Cheap to test with an ETF.

Decay source: Does Academic Research Destroy Stock Return Predictability?. Mclean, Pontiff, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[vectorbt](../../08-software/vectorbt.md), [backtesting-py](../../08-software/backtesting-py.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia turn-of-the-month-in-equity-indexes

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
