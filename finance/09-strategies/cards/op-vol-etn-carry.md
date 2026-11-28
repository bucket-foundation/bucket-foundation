# Volatility ETN Carry

ID: `op-vol-etn-carry`
Family: Options and Volatility
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Short a short-term VIX ETN and hold a medium-term VIX ETN against it, or hedge VXX with VIX futures as in section 7.3.1, to earn the roll in contango.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 7.3. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)
2. Statistics of VIX Futures and Their Applications to Trading Volatility Exchange-Traded Products. Avellaneda, Papanicolaou, 2017, Crossref. https://doi.org/10.2139/ssrn.3028910 (Crossref search, fetched 2026-11-27)

## Claimed Edge

The book cites Avellaneda and Papanicolaou on VIX ETN decay. February 2018 wiped out inverse VIX products.

## Post-Publication Decay

No decay study fetched for this structure. Index option sellers earned the variance premium after 2010 with deep losses in February 2018 and March 2020. Grade C.

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
