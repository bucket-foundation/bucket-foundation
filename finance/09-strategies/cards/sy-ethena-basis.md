# Synthetic Dollar Basis Yield

ID: `sy-ethena-basis`
Family: Stablecoin Yield
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Hold staked USDe, which earns funding from a short perpetual hedge on staked ETH.

## Source

1. Ethena Overview | Ethena. web. https://docs.ethena.fi/ (web page, fetched 2026-11-27)
2. Funding Risk - Ethena Documentation. https://docs.ethena.fi/solution-overview/risks/funding-risk (fetched 2026-11-27)

## Claimed Edge

Yield passes through perpetual funding plus staking.

## Post-Publication Decay

Ethena states negative funding rates are expected and that a reserve fund steps in when combined revenue is negative; it does not pass negative revenue to sUSDe stakers.

Decay source: Fundamentals of Perpetual Futures. arXiv. https://arxiv.org/abs/2212.06888 (arXiv abstract page, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
