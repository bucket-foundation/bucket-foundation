# REIT Momentum

ID: `re-reit-momentum`
Family: Real Estate
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Rank REITs on past 11-month return; buy winners.

## Source

1. Momentum Factor Effect in REITs - Quantpedia. web. https://quantpedia.com/strategies/momentum-factor-effect-in-reits/ (web page, fetched 2026-11-27)
2. Quantpedia free strategy page. https://quantpedia.com/strategies/momentum-factor-effect-in-reits/ (fetched 2026-11-27)

## Claimed Edge

Quantpedia lists momentum among REITs.

## Post-Publication Decay

Small universe; same decay as equity momentum.

Decay source: Momentum crashes. Daniel, Moskowitz, 2016, Journal of Financial Economics. https://doi.org/10.1016/j.jfineco.2015.12.002 (Crossref DOI, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[bt](../../08-software/bt.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- Quantpedia momentum-factor-effect-in-reits

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
