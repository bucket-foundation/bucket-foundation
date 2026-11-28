# VWAP Reversion and Pullback

ID: `ta-vwap`
Family: Technical Analysis
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Buy when price trades a band below VWAP or EVWMA and exit at VWAP; trend versions buy pullbacks to an anchored VWAP.

## Source

1. Simple Technical Trading Rules and the Stochastic Properties of Stock Returns. BROCK and co-authors, 1992, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1992.tb04681.x (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 9 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

The code ships the rule with no performance claim. Brock, Lakonishok and LeBaron 1992 found simple trading rules beat buy-and-hold on the Dow before 1987.

## Post-Publication Decay

Sullivan, Timmermann and White 1999 tested 7,846 technical rules with a data-snooping bootstrap: the best rule beat the Dow from 1897 to 1986 and showed no edge from 1987 to 1996. Park and Irwin 2007 found most profitable results predate the 1990s.

Decay source: Data‐Snooping, Technical Trading Rule Performance, and the Bootstrap. Sullivan and co-authors, 1999, The Journal of Finance. https://doi.org/10.1111/0022-1082.00163 (Crossref search, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[QuantDinger](../../08-software/quantdinger.md), [lumibot](../../08-software/lumibot.md), [prediction-market-backtesting](../../08-software/prediction-market-backtesting.md)

## Code

- `prediction-market-backtesting: strategies/vwap_reversion.py`
- `lumibot: lumibot/example_strategies/ai_vwap.py`
- `QuantDinger: library/strategies/007_quantdinger_evwma_vwap_cross.py`
- `QuantDinger: library/strategies/014_quantdinger_evwma_vwap_macd.py`
- `QuantDinger: library/strategies/069_quantdinger_dynamic_swing_vwap.py`
- `QuantDinger: library/strategies/139_quantdinger_gold_intraday_ema_bb_vwap_atr_sl_tp_session_weekday_fi.py`
- `QuantDinger: library/strategies/141_quantdinger_golden_trident_swing_anchored_vwap_trend_system.py`
- `QuantDinger: library/strategies/145_quantdinger_js_techtrading_vwap_momentum_pullback_strategy.py`
- `QuantDinger: library/strategies/175_quantdinger_vwap_breakout_strategy_emas_clean_cycle_tp_sl_plots.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
