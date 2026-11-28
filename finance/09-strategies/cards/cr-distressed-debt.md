# Distressed Debt

ID: `cr-distressed-debt`
Family: Credit
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy debt of firms in or near bankruptcy that will recover more than the price implies.

## Source

1. 151 Trading Strategies. Kakushadze, Serur, 2018. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 12.1. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Kakushadze and Serur list it; returns depend on legal process and seniority.

## Post-Publication Decay

Specialist activity; no clean decay series.

Decay source: 151 Trading Strategies. Kakushadze, Serur, 2018. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 15.1

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
