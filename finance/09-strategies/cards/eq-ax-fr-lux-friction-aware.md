# FR-LUX: Friction-Aware

ID: `eq-ax-fr-lux-friction-aware`
Family: Equities
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: arXiv q-fin.TR or q-fin.PM 2015 to 2026

## Logic

From the abstract: FR-LUX integrates three ingredients: (i) a microstructure-consistent execution model combining proportional and impact costs, directly embedded in the reward; (ii) a trade-space trust region that constrains changes in inventory flow rather than logits, yielding stable low-turnover updates; and (iii) explicit regime conditioning so the policy specializes to LL/LH/HL/HH states without fragmenting the data. We provide formal guarantees on optimality under convex frictions, monotonic improvement under a KL trust region, long-run turnover bounds and induced inaction bands due to proportional costs, positive value advantage for regime-conditioned policies, and robustness to cost misspecification. <!-- voice-ignore-line -->

## Source

1. FR-LUX: Friction-Aware, Regime-Conditioned Policy Optimization for Implementable Portfolio Management. Jian'an Zhang, 2025, arXiv 2510.02986. https://arxiv.org/abs/2510.02986 (arXiv API, fetched 2026-11-27)

## Claimed Edge

The abstract reports: On a 4 x 5 grid of regimes and cost levels with multiple random seeds, FR-LUX achieves the top average Sharpe ratio with narrow bootstrap confidence intervals, maintains a flatter cost-performance slope than strong baselines, and attains superior risk-return efficiency for a given turnover budget.

## Post-Publication Decay

Single arXiv study with no out-of-sample follow-up fetched. Grade C.

## Capacity

Unknown; the abstract gives no capacity figure. Treat as Small until tested.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
