# Short Interest

ID: `eq-short-interest`
Family: Equities
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Avoid or short stocks with high short interest and low institutional ownership.

## Source

1. Short Interest, Institutional Ownership, and Stock Returns. Asquith, Pathak, Ritter, 2004. https://doi.org/10.2139/ssrn.525623 (Crossref search, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/short-interest-effect-long-only-version/ (fetched 2026-11-27)

## Claimed Edge

Constrained, heavily shorted stocks underperform.

## Post-Publication Decay

Hou-Xue-Zhang find 96% of trading-friction anomalies fail; the long-only screen still avoids losers.

Decay source: Replicating Anomalies. Hou, Xue, Zhang, 2018, The Review of Financial Studies. https://doi.org/10.1093/rfs/hhy131 (Crossref DOI, fetched 2026-11-27)

## Capacity

Small. Borrow fees cap the short side.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia short-interest-effect-long-only-version
- Quantpedia short-interest-effect-long-short-version
- ShortInterest

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
