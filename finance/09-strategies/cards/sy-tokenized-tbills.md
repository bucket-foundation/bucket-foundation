# Tokenized T-Bill Funds

ID: `sy-tokenized-tbills`
Family: Stablecoin Yield
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Hold a tokenized Treasury fund such as BlackRock BUIDL to earn the bill rate on-chain.

## Source

1. Securitize | The Leading Tokenization Platform. web. https://securitize.io/ (web page, fetched 2026-11-27)

## Claimed Edge

Yield equals the T-bill rate minus fees.

## Post-Publication Decay

No alpha; the Fed rate sets it.

Decay source: The Rate of Return on Everything, 1870-2015*. Jordà, Knoll, Kuvshinov, Schularick, 2019, The Quarterly Journal of Economics. https://doi.org/10.1093/qje/qjz012 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md), [D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
