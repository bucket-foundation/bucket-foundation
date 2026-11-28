# Not All LPs Are Equal: The Active-Passive Gap in Automated Market Maker Liquidity Provision

ID: `cy-ax-not-all-lps-are-equal-the-active-passive-gap-in-au`
Family: Crypto
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: This aggregate view can hide how liquidity provision outcomes differ between LP strategies, as concentrated liquidity AMM designs operating on high-performance blockchains allow liquidity to be actively repositioned around trades. We develop a markout-based framework to decompose Uniswap LP profitability into active and passive components using two complementary methods: a LIFO subtraction method that matches short-lived mint-burn positions and attributes swap-level markouts by liquidity share; and an infinitesimal LP benchmark that estimates the performance of a fully passive, always-in-range marginal LP directly from the AMM price path.

## Source

1. Not All LPs Are Equal: The Active-Passive Gap in Automated Market Maker Liquidity Provision. Agathe Sadeghi and co-authors, 2026, arXiv 2609.37963. https://arxiv.org/abs/2609.37963 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: We apply these methods to Uniswap v2, v3, and v4 pools on Ethereum, Arbitrum, and Base chains, and find passive profitability can materially differ from aggregate pool profitability.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
