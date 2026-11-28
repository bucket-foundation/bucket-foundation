# Crypto Up-Down Contract Signals

ID: `pm-crypto-updown-ta`
Family: Prediction Markets
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

On 5-minute BTC up or down contracts, combine RSI, momentum, VWAP deviation and SMA cross; enter when 3 of 4 agree and the price is 55 cents or less.

## Source

1. Source code in `finance/code/`: 1 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

The bot reports no audited track record.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Small.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[polymarket-kalshi-weather-bot](../../08-software/polymarket-kalshi-weather-bot.md)

## Code

- `polymarket-kalshi-weather-bot: backend/core/signals.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
