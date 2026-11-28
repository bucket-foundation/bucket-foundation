# Stableswap Liquidity Provision

ID: `sy-curve-lp`
Family: Stablecoin Yield
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Provide stablecoin pairs to Curve pools for fees and token emissions.

## Source

1. https://docs.curve.finance/. web. https://docs.curve.finance/ (web page, fetched 2026-11-27)

## Claimed Edge

Low-impermanent-loss fees plus CRV rewards.

## Post-Publication Decay


Decay source: Automated Market Making and Loss-Versus-Rebalancing. arXiv. https://arxiv.org/abs/2208.06046 (arXiv abstract page, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
