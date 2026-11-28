# How Much Must a Private Mempool Hide? Exact Leakage Thresholds for Sandwich Attacks

ID: `eq-ax-how-much-must-a-private-mempool-hide-exact-leakage`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: If the direction is hidden too, no non-contingent first leg front-runs both possible directions, while post-trade arbitrage can survive even perfect pre-trade hiding. We answer exactly for a fee-free constant-product automated market maker, the pricing rule behind Uniswap v2.

## Source

1. How Much Must a Private Mempool Hide? Exact Leakage Thresholds for Sandwich Attacks. Tingyi Lin and co-authors, 2026, arXiv 2609.31379. https://arxiv.org/abs/2609.31379 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: It alone determines the feasible front-runs, the largest feasible front-run is optimal for pointwise, expected, and worst-case profit alike, and the guaranteed profit has a closed form. When execution is costly, a privacy layer that wants to rule out sandwiches profitable at every consistent size may therefore reveal anything about the size except a lower bound above an explicit threshold; the upper end of the range is irrelevant.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
