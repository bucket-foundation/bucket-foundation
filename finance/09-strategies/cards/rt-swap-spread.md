# Swap Spread Arbitrage

ID: `rt-swap-spread`
Family: Rates
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Trade the gap between Treasury yields and swap rates of the same maturity.

## Source

1. Negative Swap Spreads and Limited Arbitrage. Jermann, 2019. https://doi.org/10.3386/w25422 (Crossref search, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 5.13. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Negative swap spreads persist because balance-sheet costs block arbitrage.

## Post-Publication Decay

Fixed rates on 30-year swaps have been mostly below Treasury rates since October 2008, and Jermann models frictions on holding bonds that limit arbitrage.

Decay source: Negative Swap Spreads and Limited Arbitrage. Jermann, 2019. https://doi.org/10.3386/w25422 (Crossref search, fetched 2026-11-27)

## Capacity

Large for banks.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 5.15

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
