# DeFi Stablecoin Lending

ID: `sy-defi-lending`
Family: Stablecoin Yield
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Supply USDC or USDT to Aave or Compound and earn the variable borrow rate share.

## Source

1. DeFi Protocols for Loanable Funds: Interest Rates, Liquidity and Market Efficiency. arXiv. https://arxiv.org/abs/2006.13922 (arXiv abstract page, fetched 2026-11-27)

## Claimed Edge

Gudgeon and co-authors map rates set by utilization curves.

## Post-Publication Decay

Rates spike in bull markets and fall below T-bills in quiet ones; smart contract risk.

Decay source: DeFi Protocols for Loanable Funds: Interest Rates, Liquidity and Market Efficiency. arXiv. https://arxiv.org/abs/2006.13922 (arXiv abstract page, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
