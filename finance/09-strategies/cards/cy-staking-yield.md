# Staking and Liquid Staking Yield

ID: `cy-staking-yield`
Family: Crypto
Retail feasibility: **A**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Stake ETH or other proof-of-stake tokens to earn protocol rewards.

## Source

1. Ethereum staking: How does it work? | ⁦ethereum.org⁩. web. https://ethereum.org/en/staking/ (web page, fetched 2026-11-27)
2. Rewards and penalties. ethereum.org. https://ethereum.org/en/developers/docs/consensus-mechanisms/pos/rewards-and-penalties/ (web page, fetched 2026-11-27)

## Claimed Edge

Ethereum staking yields a few percent a year in ETH.

## Post-Publication Decay

Per-validator base reward scales as 1/sqrt(N) in the number of validators N, so yield falls as stake grows, and a slashed 32 ETH validator burns 0.0078125 ETH at once, with a further correlation penalty when many validators are slashed together.

Decay source: Rewards and penalties. ethereum.org. https://ethereum.org/en/developers/docs/consensus-mechanisms/pos/rewards-and-penalties/ (web page, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md)

## Implementation

No open-source implementation in `code/`.

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
