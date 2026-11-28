# AMM Liquidity Provision

ID: `cy-lp-provision`
Family: Crypto
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Deposit tokens into a constant-product or concentrated-liquidity pool to earn swap fees.

## Source

1. Automated Market Making and Loss-Versus-Rebalancing. arXiv. https://arxiv.org/abs/2208.06046 (arXiv abstract page, fetched 2026-11-27)

## Claimed Edge

Fees accrue on volume; LPs lose loss-versus-rebalancing to arbitrageurs.

## Post-Publication Decay

Milionis and co-authors show LVR can exceed fees for volatile pairs.

Decay source: Automated Market Making and Loss-Versus-Rebalancing. arXiv. https://arxiv.org/abs/2208.06046 (arXiv abstract page, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md)

## Implementation

[hummingbot](../../08-software/hummingbot.md)

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
