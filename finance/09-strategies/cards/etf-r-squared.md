# R-Squared Selection

ID: `etf-r-squared`
Family: ETFs and Macro
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Rank ETFs on the R-squared of a factor regression and hold those with low R-squared, which carry more selectivity.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 4.3. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)
2. Mutual Fund's
                    <i>R</i>
                    2 as Predictor of Performance. Amihud, Goyenko, 2012, The Review of Financial Studies. https://doi.org/10.1093/rfs/hhs182 (Crossref search, fetched 2026-11-27)

## Claimed Edge

The book cites Amihud and Goyenko 2013, who found low R-squared funds outperform.

## Post-Publication Decay

No fetched post-publication study for this strategy. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
