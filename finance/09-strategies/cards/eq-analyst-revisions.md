# Earnings Momentum and Revisions

ID: `eq-analyst-revisions`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy stocks with upward analyst estimate revisions and surprises.

## Source

1. Momentum Strategies. Chan, Jegadeesh, Lakonishok, 1996, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1996.tb05222.x (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Earnings momentum and price momentum each predict returns; neither subsumes the other.

## Post-Publication Decay

Signal sold by every data vendor; McLean-Pontiff decay applies.

Decay source: Does Academic Research Destroy Stock Return Predictability?. Mclean, Pontiff, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- AnalystRevision
- REV6

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
