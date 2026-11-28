# Currency Momentum

ID: `fx-momentum`
Family: FX
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy currencies with the best excess returns over the past months.

## Source

1. Currency momentum strategies. Menkhoff, Sarno, Schmeling, Schrimpf, 2012, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2012.06.009 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 8.1. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. Quantpedia free strategy page. https://quantpedia.com/strategies/currency-momentum-factor/ (fetched 2026-11-27)

## Claimed Edge

Menkhoff and co-authors find high excess returns for currency momentum.

## Post-Publication Decay

Returns concentrate in illiquid, high-cost currencies.

Decay source: Currency momentum strategies. Menkhoff, Sarno, Schmeling, Schrimpf, 2012, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2012.06.009 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[pysystemtrade](../../08-software/pysystemtrade.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia currency-momentum-factor

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
