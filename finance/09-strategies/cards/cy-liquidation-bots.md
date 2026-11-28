# DeFi Liquidation Bots

ID: `cy-liquidation-bots`
Family: Crypto
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Repay undercollateralized loans on lending protocols and collect the liquidation bonus.

## Source

1. An Empirical Study of DeFi Liquidations: Incentives, Risks, and Instabilities. arXiv. https://arxiv.org/abs/2106.06389 (arXiv abstract page, fetched 2026-11-27)

## Claimed Edge

Qin and co-authors measure liquidation volume and bonuses across Ethereum lending markets.

## Post-Publication Decay

Qin and co-authors find that Aave, Compound, MakerDAO and dYdX liquidation designs incentivize liquidators well but sell excessive discounted collateral at borrowers' expense (Qin et al., 2021).

Decay source: An Empirical Study of DeFi Liquidations: Incentives, Risks, and Instabilities. arXiv. https://arxiv.org/abs/2106.06389 (arXiv abstract page, fetched 2026-11-27)

## Capacity

Small.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
