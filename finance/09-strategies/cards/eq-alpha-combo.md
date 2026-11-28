# Alpha Combination

ID: `eq-alpha-combo`
Family: Equities
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Combine hundreds of weak signals into one forecast with regression or risk-model weights, then trade the combined alpha.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 3.20. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)
2. 101 Formulaic Alphas. Kakushadze, 2016, Wilmott. https://doi.org/10.1002/wilm.10525 (Crossref search, fetched 2026-11-27)

## Claimed Edge

The book cites Kakushadze and Yu on combining 101 formulaic alphas. No return figure.

## Post-Publication Decay

No fetched post-publication study for this strategy. Grade C.

Decay source: Does Academic Research Destroy Stock Return Predictability?. MCLEAN, PONTIFF, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref search, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

- code pysystemtrade: systems/provided/rules/factors.py

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
