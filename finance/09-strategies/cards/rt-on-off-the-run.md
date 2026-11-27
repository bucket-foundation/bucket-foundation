# On-the-Run versus Off-the-Run

ID: `rt-on-off-the-run`
Family: Rates
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Short the newly issued Treasury, buy the older one with similar maturity, wait for the premium to close.

## Source

1. The Bond/Old-Bond Spread. Krishnamurthy, 2000. https://doi.org/10.2139/ssrn.251769 (Crossref search, fetched 2026-11-27)

## Claimed Edge

The on-the-run premium narrows predictably over the auction cycle.

## Post-Publication Decay


Decay source: The Bond/Old-Bond Spread. Krishnamurthy, 2000. https://doi.org/10.2139/ssrn.251769 (Crossref search, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
