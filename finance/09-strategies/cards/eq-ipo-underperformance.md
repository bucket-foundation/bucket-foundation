# Long-Run IPO Underperformance

ID: `eq-ipo-underperformance`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Avoid or short IPOs in their first three years.

## Source

1. The Long‐Run Performance of initial Public Offerings. Ritter, 1991, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1991.tb03743.x (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Issuers in 1975-1984 underperformed matched firms over three years, worst in high-volume IPO years.

## Post-Publication Decay

Decay source: Replicating Anomalies. Hou, Xue, Zhang, 2018, The Review of Financial Studies. https://doi.org/10.1093/rfs/hhy131 (Crossref DOI, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- AgeIPO
- IndIPO

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
