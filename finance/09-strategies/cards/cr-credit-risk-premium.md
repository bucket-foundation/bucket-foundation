# Credit Risk Premium

ID: `cr-credit-risk-premium`
Family: Credit
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Hold corporate bonds hedged for duration to earn the default premium.

## Source

1. The Credit Risk Premium. Asvanunt, Richardson, 2016, The Journal of Fixed Income. https://doi.org/10.3905/jfi.2017.26.3.006 (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 5.10. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Credit excess returns over duration-matched Treasuries are positive across 1936-2014.

## Post-Publication Decay

Premium small after defaults and costs for high grade.

Decay source: The Credit Risk Premium. Asvanunt, Richardson, 2016, The Journal of Fixed Income. https://doi.org/10.3905/jfi.2017.26.3.006 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
