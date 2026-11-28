# Bond Immunization

ID: `rt-immunization`
Family: Rates
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Match the duration and present value of assets to a liability so rate moves change both by the same amount.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 5.5. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)
2. Review of the Principles of Life-office Valuations. Redington, 1952, Journal of the Institute of Actuaries. https://doi.org/10.1017/s0020268100052811 (Crossref search, fetched 2026-11-27)

## Claimed Edge

A hedging rule from Redington 1952. No return claim.

## Post-Publication Decay

No fetched post-publication study for this strategy. Grade C.

## Capacity

Large.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
