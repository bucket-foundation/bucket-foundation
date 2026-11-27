# Implied versus Historical Vol Cross-Section

ID: `op-iv-rv-cross-section`
Family: Options and Volatility
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy straddles on stocks where historical vol exceeds implied, sell where implied is far above.

## Source

1. Cross-section of option returns and volatility☆. Goyal, Saretto, 2009, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2009.01.001 (Crossref DOI, fetched 2026-11-27)

## Claimed Edge

Delta-hedged straddles sorted on the historical minus implied vol gap earn large spreads before costs.

## Post-Publication Decay

Wide option spreads cut most of it.

Decay source: Replicating Anomalies. Hou, Xue, Zhang, 2018, The Review of Financial Studies. https://doi.org/10.1093/rfs/hhy131 (Crossref DOI, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- RIVolSpread
- code stefan-jansen/machine-learning-for-trading: case_studies/sp500_options

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
