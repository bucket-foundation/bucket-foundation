# Industry-Demeaned Mean Reversion

ID: `eq-cluster-mean-reversion`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Subtract the industry or cluster mean from each stock return, buy stocks below the mean and short those above, dollar neutral. Section 3.9.1 uses several cluster levels.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 3.9. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)
2. When are Contrarian Profits Due to Stock Market Overreaction?. Lo, MacKinlay, 1989, Crossref. https://doi.org/10.3386/w2977 (Crossref search, fetched 2026-11-27)

## Claimed Edge

The book cites contrarian results of Lehmann 1990 and Lo and MacKinlay 1990. No own figure.

## Post-Publication Decay

No fetched post-publication study for this strategy. Grade C.

Decay source: Does Academic Research Destroy Stock Return Predictability?. MCLEAN, PONTIFF, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref search, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
