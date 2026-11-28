# Intraday EMA-RSI Scalping

ID: `ta-scalping`
Family: Technical Analysis
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

On 1 to 15 minute bars, enter with a fast EMA trend and an RSI or fractal trigger, exit at fixed ticks or a tight trailing stop.

## Source

1. Simple Technical Trading Rules and the Stochastic Properties of Stock Returns. BROCK and co-authors, 1992, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1992.tb04681.x (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 14 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

The code ships the rule with no performance claim. Retail costs on 1-minute bars exceed most gross edges.

## Post-Publication Decay

Sullivan, Timmermann and White 1999 tested 7,846 technical rules with a data-snooping bootstrap: the best rule beat the Dow from 1897 to 1986 and showed no edge from 1987 to 1996. Park and Irwin 2007 found most profitable results predate the 1990s.

Decay source: Data‐Snooping, Technical Trading Rule Performance, and the Bootstrap. Sullivan and co-authors, 1999, The Journal of Finance. https://doi.org/10.1111/0022-1082.00163 (Crossref search, fetched 2026-11-27)

## Capacity

Medium.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[QuantDinger](../../08-software/quantdinger.md)

## Code

- `QuantDinger: library/strategies/029_quantdinger_zigzag_rsi_15m.py`
- `QuantDinger: library/strategies/039_quantdinger_moving_average_scalper.py`
- `QuantDinger: library/strategies/041_quantdinger_scalping_system.py`
- `QuantDinger: library/strategies/048_quantdinger_super_scalper_15m.py`
- `QuantDinger: library/strategies/056_quantdinger_accurate_5m_composite.py`
- `QuantDinger: library/strategies/112_quantdinger_3_ema_rsi_with_trail_stop_free990_low_tf.py`
- `QuantDinger: library/strategies/125_quantdinger_crypto_bot_lower_timeframes.py`
- `QuantDinger: library/strategies/135_quantdinger_flawless_victory_strategy_15min_btc_machine_learning_s.py`
- `QuantDinger: library/strategies/136_quantdinger_forex_fractal_ema_scalper.py`
- `QuantDinger: library/strategies/140_quantdinger_gold_scalping_strategy_with_precise_entries.py`
- `QuantDinger: library/strategies/159_quantdinger_scalping_the_bull_two_ema_strategy.py`
- `QuantDinger: library/strategies/162_quantdinger_smart_grid_scalping_pullback_strategy_bullbyte.py`
- `QuantDinger: library/strategies/170_quantdinger_tradeiq_crazy_scalping_trading_strategy_kaspricci.py`
- `QuantDinger: library/strategies/177_quantdinger_xauusd_scalping_v2_agresiv.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
