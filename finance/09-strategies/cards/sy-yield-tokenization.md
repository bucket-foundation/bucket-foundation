# Fixed-Yield Tokenization

ID: `sy-yield-tokenization`
Family: Stablecoin Yield
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Split yield-bearing tokens into principal and yield tokens; buy principal tokens for a fixed rate.

## Source

1. https://docs.pendle.finance/. web. https://docs.pendle.finance/ (web page, fetched 2026-11-27)
2. Yield Token - Pendle Documentation. https://docs.pendle.finance/pendle-v2/ProtocolMechanics/YieldTokenization/YT (fetched 2026-11-27)

## Claimed Edge

Locks a fixed rate to maturity.

## Post-Publication Decay

A Pendle YT price falls linearly with time to zero at maturity, pays off only if the underlying APY averages above the implied APY paid, and earns the underlying asset's points.

Decay source: DeFi Protocols for Loanable Funds: Interest Rates, Liquidity and Market Efficiency. arXiv. https://arxiv.org/abs/2006.13922 (arXiv abstract page, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
