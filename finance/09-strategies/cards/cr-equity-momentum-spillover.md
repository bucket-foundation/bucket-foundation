# Equity Momentum into Bonds

ID: `cr-equity-momentum-spillover`
Family: Credit
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Buy bonds of firms whose stock has strong momentum.

## Source

1. Stock and Bond Market Interaction: Does Momentum Spill Over?. Gebhardt, Hvidkjaer, Swaminathan, 2002. https://doi.org/10.2139/ssrn.319009 (Crossref search, fetched 2026-11-27)

## Claimed Edge

Equity momentum predicts corporate bond returns.

## Post-Publication Decay

OTC bond trading costs can exceed the edge.

Decay source: Replicating Anomalies. Hou, Xue, Zhang, 2018, The Review of Financial Studies. https://doi.org/10.1093/rfs/hhy131 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md), [D-macro](../../03-data-sources/cards/D-macro.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
