# On-Chain Valuation Ratios

ID: `cy-onchain-valuation`
Family: Crypto
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Use network size, active addresses and MVRV to time bitcoin exposure.

## Source

1. Common Risk Factors in Cryptocurrency. Liu, Tsyvinski, Wu, 2022, The Journal of Finance. https://doi.org/10.1111/jofi.13119 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 18.3. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Liu, Tsyvinski and Wu find network factors relate to crypto returns.

## Post-Publication Decay

Ratios like MVRV were fit on few cycles; out-of-sample evidence is thin.

Decay source: Common Risk Factors in Cryptocurrency. Liu, Tsyvinski, Wu, 2022, The Journal of Finance. https://doi.org/10.1111/jofi.13119 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
