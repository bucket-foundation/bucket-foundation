# Convertible Arbitrage

ID: `cr-convertible-arb`
Family: Credit
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy convertible bonds, short the stock at delta, collect the cheapness of the embedded option.

## Source

1. Risk and return in convertible arbitrage: Evidence from the convertible bond market. Agarwal, Fung, Loon, Naik, 2011, Journal of Empirical Finance. https://doi.org/10.1016/j.jempfin.2010.11.008 (Crossref search, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 13.1. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Returns tied to new issuance supply and liquidity.

## Post-Publication Decay

2005 and 2008 crowding losses; issuance-driven.

Decay source: Slow Moving Capital. Mitchell, Pedersen, Pulvino, 2007. https://doi.org/10.3386/w12877 (Crossref search, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 12.1

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
