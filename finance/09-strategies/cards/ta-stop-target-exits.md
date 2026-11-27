# Stop-Loss and Target Exits

ID: `ta-stop-target-exits`
Family: Technical Analysis
Retail feasibility: **B**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Wrap any entry with fixed percent or ATR stops, trailing stops, stepped trails and partial take-profits, or liquidate after a trailing drawdown.

## Source

1. Simple Technical Trading Rules and the Stochastic Properties of Stock Returns. BROCK and co-authors, 1992, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1992.tb04681.x (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 16 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

## Claimed Edge

Kaminski and Lo 2014 found stop-loss rules add value when returns show momentum and cost value under a random walk.

## Post-Publication Decay

Sullivan, Timmermann and White 1999 tested 7,846 technical rules with a data-snooping bootstrap: the best rule beat the Dow from 1897 to 1986 and showed no edge from 1987 to 1996. Park and Irwin 2007 found most profitable results predate the 1990s.

Decay source: Data‐Snooping, Technical Trading Rule Performance, and the Bootstrap. Sullivan and co-authors, 1999, The Journal of Finance. https://doi.org/10.1111/0022-1082.00163 (Crossref search, fetched 2026-11-27)

## Capacity

Large.

## Data Needed

[D-market](../../03-data-sources/cards/D-market.md)

## Implementation

[QuantConnect/Lean](../../08-software/lean.md), [QuantDinger](../../08-software/quantdinger.md), [polakowo/vectorbt](../../08-software/vectorbt.md)

## Code

- `polakowo/vectorbt: examples/StopSignals.ipynb`
- `QuantConnect/Lean: Algorithm.Framework/Risk/TrailingStopRiskManagementModel.py`
- `QuantDinger: library/strategies/011_quantdinger_atr_trailing_line.py`
- `QuantDinger: library/strategies/062_quantdinger_sma_trailing_profit.py`
- `QuantDinger: library/strategies/064_quantdinger_chandelier_risk.py`
- `QuantDinger: library/strategies/104_quantdinger_continuous_trailing_long.py`
- `QuantDinger: library/strategies/134_quantdinger_fixed_percent_stop_loss_take_profit.py`
- `QuantDinger: library/strategies/163_quantdinger_stop_loss_and_take_profit_in_example.py`
- `QuantDinger: library/strategies/165_quantdinger_strategy_template.py`
- `QuantDinger: library/strategies/179_quantdinger_2xtp_sl_to_entry.py`
- `QuantDinger: library/strategies/180_quantdinger_advanced_position_management_mr_rakun.py`
- `QuantDinger: library/strategies/181_quantdinger_advanced_vwap_pullback_strategy_trend_template_qualifi.py`
- `QuantDinger: library/strategies/184_quantdinger_backtest_template_backtest_terminal.py`
- `QuantDinger: library/strategies/187_quantdinger_ema_crossover_strategy_with_take_profit_and_candle_hig.py`
- `QuantDinger: library/strategies/197_quantdinger_stepped_trailing_strategy_example.py`
- `QuantDinger: library/strategies/204_quantdinger_sl1_pips_after_tp1_ma.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
