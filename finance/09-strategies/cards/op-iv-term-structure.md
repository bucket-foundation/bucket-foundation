# Implied Vol Term Structure

ID: `op-iv-term-structure`
Family: Options and Volatility
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy straddles when the implied vol term slope is steep upward, sell when inverted.

## Source

1. Equity Volatility Term Structures and the Cross-Section of Option Returns. Vasquez, 2011. https://doi.org/10.2139/ssrn.1944298 (Crossref search, fetched 2026-11-27)

## Claimed Edge

Slope of the implied vol term structure predicts straddle returns.

## Post-Publication Decay

Single-study evidence.

Decay source: Does Academic Research Destroy Stock Return Predictability?. Mclean, Pontiff, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref DOI, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
