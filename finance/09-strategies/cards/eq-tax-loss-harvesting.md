# Tax-Loss Harvesting

ID: `eq-tax-loss-harvesting`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Sell positions at a loss to realize tax deductions, replace with similar exposure.

## Source

1. An Empirical Evaluation of Tax-Loss Harvesting Alpha. Chaudhuri, Burnham, Lo, 2019, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3351382 (Crossref search, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 19.1. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Chaudhuri, Burnham and Lo estimate positive tax alpha from harvesting in historical simulations.

## Post-Publication Decay

Benefit shrinks as the basis resets; a tax edge, durable while the code stands.

Decay source: An Empirical Evaluation of Tax-Loss Harvesting Alpha. Chaudhuri, Burnham, Lo, 2019, SSRN Electronic Journal. https://doi.org/10.2139/ssrn.3351382 (Crossref search, fetched 2026-11-27)

## Capacity

Large; scales with taxable assets.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
