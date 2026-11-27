# Municipal Bond Tax Arbitrage

ID: `rt-muni-tax-arb`
Family: Rates
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Borrow at a taxable deductible rate and buy tax-exempt municipal bonds; the tax shield is the spread.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 13.1. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)

## Claimed Edge

IRS rules disallow interest deductions used to carry munis for many holders.

## Post-Publication Decay

No fetched post-publication study for this strategy. Grade C.

## Capacity

Medium.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
