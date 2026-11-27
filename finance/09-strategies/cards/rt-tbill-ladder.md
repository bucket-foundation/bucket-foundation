# T-Bill and Money Market Yield

ID: `rt-tbill-ladder`
Family: Rates
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Hold short Treasuries or a government money fund for the risk-free rate.

## Source

1. The Rate of Return on Everything, 1870-2015*. Jordà, Knoll, Kuvshinov, Schularick, 2019, The Quarterly Journal of Economics. https://doi.org/10.1093/qje/qjz012 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 17.1. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Bills carry the lowest volatility of any asset in the Jordà rate-of-return dataset.

## Post-Publication Decay

The rate itself is the return; no decay, only Fed policy.

Decay source: The Rate of Return on Everything, 1870-2015*. Jordà, Knoll, Kuvshinov, Schularick, 2019, The Quarterly Journal of Economics. https://doi.org/10.1093/qje/qjz012 (Crossref DOI, fetched 2026-11-27)

## Capacity

Unlimited.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md), [D-longrun](../../03-data-sources/cards/D-longrun.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- KS 17.3

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
