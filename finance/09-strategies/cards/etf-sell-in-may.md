# Sell in May

ID: `etf-sell-in-may`
Family: ETFs and Macro
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Hold equities November to April, cash May to October.

## Source

1. The Halloween Indicator, “Sell in May and Go Away”: Another Puzzle. Bouman, Jacobsen, 2002, American Economic Review. https://doi.org/10.1257/000282802762024683 (Crossref DOI, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/market-seasonality-effect-in-world-equity-indexes/ (fetched 2026-11-27)

## Claimed Edge

Bouman and Jacobsen find the Halloween pattern in most of the markets they study.

## Post-Publication Decay

Small effect; tax and cost of switching reduce it.

Decay source: Does Academic Research Destroy Stock Return Predictability?. Mclean, Pontiff, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md), [D-longrun](../../03-data-sources/cards/D-longrun.md)

## Implementation

[vectorbt](../../08-software/vectorbt.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia market-seasonality-effect-in-world-equity-indexes

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
