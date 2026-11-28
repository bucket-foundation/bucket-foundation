# External Signal Execution

ID: `ex-webhook-signals`
Family: Execution and Portfolio Construction
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Receive buy and sell alerts from TradingView, MQTT or a signal vendor and execute them as orders.

## Source

1. Source code in `finance/code/`: 4 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

An execution bridge; the edge, if any, is the signal provider.

## Post-Publication Decay

No fetched post-publication study. Grade C.

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[OctoBot](../../08-software/octobot.md), [QuantDinger](../../08-software/quantdinger.md), [hummingbot](../../08-software/hummingbot.md)

## Code

- `hummingbot: controllers/directional_trading/ai_livestream.py`
- `OctoBot: packages/tentacles/Trading/Mode/trading_view_signals_trading_mode`
- `QuantDinger: library/strategies/202_quantdinger_tradingview_alerts_to_mt4_mt5_dynamic_variables_non_re.py`
- `QuantDinger: library/strategies/203_quantdinger_tradingview_alerts_to_mt4_mt5_forex_indices_commoditie.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
