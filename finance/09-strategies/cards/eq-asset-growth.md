# Asset Growth and Investment

ID: `eq-asset-growth`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Short firms with the fastest total-asset growth, buy the slowest.

## Source

1. Asset Growth and the Cross‐Section of Stock Returns. Cooper, Gulen, Schill, 2008, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.2008.01370.x (Crossref DOI, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/asset-growth-effect/ (fetched 2026-11-27)

## Claimed Edge

Asset growth predicts abnormal returns and keeps its power in large caps.

## Post-Publication Decay

Survives as CMA in Fama-French five factors. Value-weighted spreads are a fraction of the equal-weighted figure.

Decay source: A five-factor asset pricing model. Fama, French, 2015, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2014.10.010 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium to large.

## Data Needed

[D-filings](../../03-data-sources/cards/D-filings.md), [D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[alphalens-reloaded](../../08-software/alphalens-reloaded.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- AssetGrowth
- AssetGrowth_q
- Quantpedia asset-growth-effect
- Quantpedia investment-factor

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
