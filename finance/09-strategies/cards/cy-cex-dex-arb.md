# CEX-DEX Arbitrage

ID: `cy-cex-dex-arb`
Family: Crypto
Retail feasibility: **D**
As of: 2026-11-27
Bead: `bkt-q5moa.5`

## Logic

Trade DEX pools back to centralized exchange prices, paying gas and builder tips.

## Source

1. Flash Boys 2.0: Frontrunning, Transaction Reordering, and Consensus Instability in Decentralized Exchanges. arXiv. https://arxiv.org/abs/1904.05234 (arXiv abstract page, fetched 2026-11-27)
2. Flash Boys 2.0: Frontrunning, Transaction Reordering, and Consensus Instability in Decentralized Exchanges. Daian et al., 2019. https://arxiv.org/abs/1904.05234 (arXiv abstract page, fetched 2026-11-27)

## Claimed Edge

Daian and co-authors show arbitrage bots bid gas in priority auctions for these profits.

## Post-Publication Decay

Arbitrage bots on decentralized exchanges bid transaction fees up in priority gas auctions to win ordering priority (Daian et al., 2019).

Decay source: Flash Boys 2.0: Frontrunning, Transaction Reordering, and Consensus Instability in Decentralized Exchanges. Daian et al., 2019. https://arxiv.org/abs/1904.05234 (arXiv abstract page, fetched 2026-11-27)

## Capacity

Medium, all to a few searchers.

## Data Needed

[D-onchain](../../03-data-sources/cards/D-onchain.md)

## Implementation

[hummingbot](../../08-software/hummingbot.md)

## Merged Duplicates

Same logic found in bead `bkt-q5moa.15` sources:

- code hummingbot: controllers/generic/arbitrage_controller.py
- code hummingbot: hummingbot/strategy/amm_arb/

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
