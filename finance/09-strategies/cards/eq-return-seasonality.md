# Same-Month Return Seasonality

ID: `eq-return-seasonality`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy stocks that did well in the same calendar month in prior years.

## Source

1. Seasonality in the Cross-Section of Expected Stock Returns. Heston, Sadka, 2005. https://doi.org/10.2139/ssrn.687022 (Crossref search, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/12-month-cycle-in-cross-section-of-stocks-returns/ (fetched 2026-11-27)

## Claimed Edge

Stocks with high same-month returns in past years outperform in that month.

## Post-Publication Decay

Keloharju, Linnainmaa and Nyberg show the pattern spans asset classes and reflects seasonal risk premia.

Decay source: Return Seasonalities. Keloharju, Linnainmaa, Nyberg, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12398 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[vectorbt](../../08-software/vectorbt.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- MomSeason
- MomSeason06YrPlus
- MomSeason11YrPlus
- MomSeason16YrPlus
- MomSeasonShort
- Quantpedia 12-month-cycle-in-cross-section-of-stocks-returns

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
