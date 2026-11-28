# Box Spread Financing

ID: `op-box-spread`
Family: Options and Volatility
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Kakushadze-Serur

## Logic

Combine a bull call spread with a bear put spread at the same strikes. The package pays a fixed amount at expiry, so its price sets an implied borrowing or lending rate.

## Source

1. Kakushadze and Serur, 151 Trading Strategies, section 2.52. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The box locks a rate; on SPX it trades close to Treasury yields. No return claim beyond that rate.

## Post-Publication Decay

No decay study fetched for this structure. Index option sellers earned the variance premium after 2010 with deep losses in February 2018 and March 2020. Grade C.

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
