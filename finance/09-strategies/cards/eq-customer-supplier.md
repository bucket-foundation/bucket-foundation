# Customer-Supplier Lead-Lag

ID: `eq-customer-supplier`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy suppliers whose major customers had good news last month.

## Source

1. Economic Links and Predictable Returns. Cohen, Frazzini, 2008, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.2008.01379.x (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

A long-short on customer returns earned over 150 basis points a month in Cohen and Frazzini.

## Post-Publication Decay

No post-publication decay study turned up in a Crossref search on 2026-11-27.

Decay source: Does Academic Research Destroy Stock Return Predictability?. Mclean, Pontiff, 2016, The Journal of Finance. https://doi.org/10.1111/jofi.12365 (Crossref DOI, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- CustomerMomentum
- iomom_cust
- iomom_supp

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
