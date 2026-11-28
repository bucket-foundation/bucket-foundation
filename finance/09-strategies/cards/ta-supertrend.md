# SuperTrend and ATR Trailing Flip

ID: `ta-supertrend`
Family: Technical Analysis
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Track an ATR-scaled trailing line, SuperTrend, UT Bot, Chandelier, OTT, PMax or alpha trend; stay long while price holds above it, flip short when it closes below.

## Source

1. Simple Technical Trading Rules and the Stochastic Properties of Stock Returns. BROCK and co-authors, 1992, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1992.tb04681.x (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 33 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

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

[QuantDinger](../../08-software/quantdinger.md), [hummingbot](../../08-software/hummingbot.md)

## Code

- `hummingbot: controllers/directional_trading/supertrend_v1.py`
- `QuantDinger: library/strategies/018_quantdinger_grover_activator.py`
- `QuantDinger: library/strategies/021_quantdinger_kpl_swing.py`
- `QuantDinger: library/strategies/025_quantdinger_ut_bot.py`
- `QuantDinger: library/strategies/032_quantdinger_alpha_trend.py`
- `QuantDinger: library/strategies/035_quantdinger_dual_atr_trails.py`
- `QuantDinger: library/strategies/045_quantdinger_ut_bot_range.py`
- `QuantDinger: library/strategies/052_quantdinger_pivot_supertrend.py`
- `QuantDinger: library/strategies/055_quantdinger_ut_bot_v2.py`
- `QuantDinger: library/strategies/059_quantdinger_alpha_trend_mfi.py`
- `QuantDinger: library/strategies/061_quantdinger_supertrend_cci.py`
- `QuantDinger: library/strategies/073_quantdinger_flexi_supertrend.py`
- `QuantDinger: library/strategies/089_quantdinger_pivot_supertrend.py`
- `QuantDinger: library/strategies/090_quantdinger_pmax_explorer.py`
- `QuantDinger: library/strategies/091_quantdinger_rsi_t3_pmax.py`
- `QuantDinger: library/strategies/093_quantdinger_pmax_long.py`
- `QuantDinger: library/strategies/099_quantdinger_stochastic_ott.py`
- `QuantDinger: library/strategies/100_quantdinger_hma_supertrend.py`
- `QuantDinger: library/strategies/102_quantdinger_supertrend_cloud.py`
- `QuantDinger: library/strategies/103_quantdinger_supertrend.py`
- `QuantDinger: library/strategies/107_quantdinger_twin_ott.py`
- `QuantDinger: library/strategies/108_quantdinger_ut_bot_v5.py`
- `QuantDinger: library/strategies/109_quantdinger_vegas_supertrend.py`
- `QuantDinger: library/strategies/115_quantdinger_bbtrend_w_supertrend_decision_strategy_presenttrading.py`
- `QuantDinger: library/strategies/116_quantdinger_btcusd_supertrend_ema_trend_filter_1h.py`
- `QuantDinger: library/strategies/167_quantdinger_supertrend_backtester.py`
- `QuantDinger: library/strategies/168_quantdinger_supertrend_regime_confluence.py`
- `QuantDinger: library/strategies/182_quantdinger_ai_volume_supertrend_strategy_presenttrading.py`
- `QuantDinger: library/strategies/186_quantdinger_elliott_wave_with_supertrend_exit_strategy_presenttrad.py`
- `QuantDinger: library/strategies/193_quantdinger_multi_step_flexima_strategy_presenttrading.py`
- `QuantDinger: library/strategies/194_quantdinger_multi_step_flexisupertrend_strategy_presenttrading.py`
- `QuantDinger: library/strategies/198_quantdinger_superatr_7_step_profit_strategy_presenttrading.py`
- `QuantDinger: library/strategies/199_quantdinger_supertrend_advance.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
