# Value and Book to Market

ID: `eq-value-book-to-market`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Sort stocks on book equity over market equity. Long cheap, short expensive, rebalance yearly.

## Source

1. The Cross‐Section of Expected Stock Returns. Fama, French, 1992, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1992.tb04398.x (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 3.3. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. Quantpedia free strategy page. https://quantpedia.com/strategies/value-book-to-market-factor/ (fetched 2026-11-27)

## Claimed Edge

Size and book-to-market capture the cross-section of average returns; the beta-return relation is flat.

## Post-Publication Decay

McLean and Pontiff study 97 cross-sectional predictors and find portfolio returns 26% lower out of sample and 58% lower after publication.

Decay source: Does Academic Research Destroy Stock Return Predictability?. Mclean, Pontiff, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large. Low turnover; the deepest factor capacity in equities.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md), [D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

[zipline-reloaded](../../08-software/zipline-reloaded.md), [alphalens-reloaded](../../08-software/alphalens-reloaded.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- BM
- BMdec
- BMq
- KS 3.3
- Quantpedia value-book-to-market-factor

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
