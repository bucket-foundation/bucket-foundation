# CDS-Bond Basis

ID: `cr-cds-bond-basis`
Family: Credit
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy a bond and buy CDS protection when the bond yields more than the CDS spread implies.

## Source

1. The CDS-Bond Basis During the Financial Crisis of 2007-2009. Bai, Collin-Dufresne, 2011. https://doi.org/10.2139/ssrn.1785756 (Crossref search, fetched 2026-11-27)

## Claimed Edge

The basis broke from zero in the 2007-2009 crisis, driven by funding, counterparty and collateral risk.

## Post-Publication Decay

Funding cost and counterparty risk explain most of the gap.

Decay source: The CDS-Bond Basis During the Financial Crisis of 2007-2009. Bai, Collin-Dufresne, 2011. https://doi.org/10.2139/ssrn.1785756 (Crossref search, fetched 2026-11-27)

## Capacity

Large for banks.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 5.14

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
