# Industry Momentum

ID: `eq-industry-momentum`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Rank industries on past 6 to 12 month returns. Long winners, short losers.

## Source

1. Do Industries Explain Momentum?. Moskowitz, Grinblatt, 1999, The Journal of Finance. https://doi.org/10.1111/0022-1082.00146 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 3.14. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. Quantpedia free strategy page. https://quantpedia.com/strategies/sector-momentum-rotational-system/ (fetched 2026-11-27)

## Claimed Edge

Industry momentum explains much of individual stock momentum in Moskowitz and Grinblatt.

## Post-Publication Decay

Shares momentum's crash risk. Sector ETFs make it cheap to run.

Decay source: Momentum crashes. Daniel, Moskowitz, 2016, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2015.12.002 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large via sector ETFs.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[bt](../../08-software/bt.md), [vectorbt](../../08-software/vectorbt.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- IndMom

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
