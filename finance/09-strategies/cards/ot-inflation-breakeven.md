# Inflation Breakeven Trades

ID: `ot-inflation-breakeven`
Family: Other
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy TIPS versus nominals when breakeven inflation is below your forecast.

## Source

1. The TIPS‐Treasury Bond Puzzle. Fleckenstein, Longstaff, Lustig, 2014, The Journal of Finance. https://doi.org/10.1111/jofi.12032 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 16.2. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Breakevens embed liquidity and inflation risk premia.

## Post-Publication Decay

Liquidity premium spikes in stress, as in 2008 and 2020.

Decay source: The TIPS‐Treasury Bond Puzzle. Fleckenstein, Longstaff, Lustig, 2014, The Journal of Finance. https://doi.org/10.1111/jofi.12032 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
