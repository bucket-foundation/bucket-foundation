# Coin Ratio Hopping

ID: `cy-coin-ratio-hopping`
Family: Crypto
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Hold one coin and switch to another whenever their price ratio beats the stored ratio by more than fees, ratcheting coin count.

## Source

1. Source code in `finance/code/`: 2 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

No claim in the code; a mean-reversion bet on alt-coin ratios.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[binance-trade-bot](../../08-software/binance-trade-bot.md)

## Code

- `binance-trade-bot: binance_trade_bot/strategies/default_strategy.py`
- `binance-trade-bot: binance_trade_bot/strategies/multiple_coins_strategy.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
