# Forward-Rate Term Premium Factor

ID: `rt-cochrane-piazzesi`
Family: Rates
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Combine one-to-five-year forward rates into a single factor that forecasts excess bond returns; extend duration when it is high.

## Source

1. Bond Risk Premia. Cochrane, Piazzesi, 2005, American Economic Review. https://doi.org/10.1257/0002828053828581 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

The factor forecasts one-year excess bond returns with R-squared up to 44%.

## Post-Publication Decay

Out-of-sample forecasting power is far lower in later studies.

Decay source: A Comprehensive Look at The Empirical Performance of Equity Premium Prediction. Welch, Goyal, 2007, Review of Financial Studies. https://doi.org/10.1093/rfs/hhm014 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
