# Low Idiosyncratic Volatility

ID: `eq-low-idio-vol`
Family: Equities
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Sort on residual volatility from a factor model over the past month. Buy the low end, avoid or short the high end.

## Source

1. The Cross‐Section of Volatility and Expected Returns. Ang, Hodrick, Xing, Zhang, 2006, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.2006.00836.x (Crossref DOI, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 3.4. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27)
3. Quantpedia free strategy page. https://quantpedia.com/strategies/low-volatility-factor-effect-in-stocks/ (fetched 2026-11-27)

## Claimed Edge

Stocks with high idiosyncratic volatility relative to Fama-French have abysmally low average returns.

## Post-Publication Decay

Hou-Xue-Zhang find the effect weak once microcaps are muted with NYSE breakpoints and value weighting.

Decay source: Replicating Anomalies. Hou, Xue, Zhang, 2018, The Review of Financial Studies. https://doi.org/10.1093/rfs/hhy131 (Crossref DOI, fetched 2026-11-27)

## Capacity

Large for long-only low-vol ETFs.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[alphalens-reloaded](../../08-software/alphalens-reloaded.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- IdioVol3F
- IdioVolAHT
- IdioVolCAPM
- IdioVolQF
- KS 3.4

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
