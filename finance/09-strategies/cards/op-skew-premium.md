# Skew Risk Premium

ID: `op-skew-premium`
Family: Options and Volatility
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Sell out-of-the-money index puts versus calls through risk reversals.

## Source

1. Stock Return Characteristics, Skew Laws, and the Differential Pricing of Individual Equity Options. Bakshi, Kapadia, Madan, 2003, Review of Financial Studies. https://doi.org/10.1093/rfs/16.1.0101 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 7.5. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Index risk-neutral skew is steeper than physical skew.

## Post-Publication Decay

Premium persists but losses cluster in crashes.

Decay source: Variance Risk Premiums. Carr, Wu, 2008, Review of Financial Studies. https://doi.org/10.1093/rfs/hhn038 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 7.5

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
