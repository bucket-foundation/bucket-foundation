# TIPS-Treasury Mispricing

ID: `rt-tips-treasury`
Family: Rates
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Replicate a nominal Treasury with TIPS plus inflation swaps; buy the cheaper leg.

## Source

1. The TIPS‐Treasury Bond Puzzle. Fleckenstein, Longstaff, Lustig, 2014, The Journal of Finance. https://doi.org/10.1111/jofi.12032 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 16.2. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. The TIPS-Treasury Bond Puzzle. NBER Digest, 2011. https://www.nber.org/digest/feb11/tips-treasury-bond-puzzle (fetched 2026-11-27)

## Claimed Edge

Treasuries can cost more than $20 per $100 notional above an inflation-swapped TIPS replica; total mispricing exceeded $56 billion.

## Post-Publication Decay

Fleckenstein, Longstaff and Lustig find TIPS-Treasury gaps above $20 per $100 notional, with total mispricing above $56 billion, over July 2004 to November 2009. Needs swap access.

Decay source: The TIPS‐Treasury Bond Puzzle. Fleckenstein, Longstaff, Lustig, 2014, The Journal of Finance. https://doi.org/10.1111/jofi.12032 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 14.2

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
