# Oscillator Oversold Reversion

ID: `ta-oscillator-reversion`
Family: Technical Analysis
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Buy when a bounded oscillator, RSI, CCI, Stochastic, Williams %R, RCI or Elder ray, falls below an oversold level; sell when it rises past overbought or the midline.

## Source

1. Simple Technical Trading Rules and the Stochastic Properties of Stock Returns. BROCK and co-authors, 1992, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1992.tb04681.x (Crossref search, fetched 2026-11-27)
2. Source code in `finance/code/`: 19 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

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

[Qbot](../../08-software/qbot.md), [QuantConnect/Lean](../../08-software/lean.md), [QuantDinger](../../08-software/quantdinger.md), [backtrader](../../08-software/backtrader.md), [crypto-trading-bot](../../08-software/crypto-trading-bot.md), [prediction-market-backtesting](../../08-software/prediction-market-backtesting.md), [rqalpha](../../08-software/rqalpha.md)

## Code

- `backtrader: samples/kselrsi/ksignal.py`
- `QuantConnect/Lean: Algorithm.Framework/Alphas/RsiAlphaModel.py`
- `rqalpha: rqalpha/examples/rsi.py`
- `prediction-market-backtesting: strategies/rsi_reversion.py`
- `crypto-trading-bot: src/strategy/strategies/awesome_oscillator_cross_zero.ts`
- `Qbot: pytrader/strategies/*.py`
- `QuantDinger: library/strategies/036_quantdinger_rsi_reversal.py`
- `QuantDinger: library/strategies/050_quantdinger_reversal_rsi_combo.py`
- `QuantDinger: library/strategies/063_quantdinger_wpr_trend_helper.py`
- `QuantDinger: library/strategies/066_quantdinger_crsi_vwma_waves.py`
- `QuantDinger: library/strategies/095_quantdinger_rci_cross.py`
- `QuantDinger: library/strategies/114_quantdinger_backtest_traders_dynamic_index_indicator_alert_by_just.py`
- `QuantDinger: library/strategies/121_quantdinger_buy_sell_strategy_depends_on_ao_stoch_rsi_atr_by_serda.py`
- `QuantDinger: library/strategies/124_quantdinger_crypto_crew_university.py`
- `QuantDinger: library/strategies/126_quantdinger_delta_rsi_strategy_with_filters.py`
- `QuantDinger: library/strategies/129_quantdinger_elder_ray_bull_power_tp_and_sl.py`
- `QuantDinger: library/strategies/155_quantdinger_open_close_cross_strategy_norepaint_version_by_justunc.py`
- `QuantDinger: library/strategies/172_quantdinger_triple_ema_rsi_atr.py`
- `QuantDinger: library/strategies/201_quantdinger_the_flash_strategy_momentum_rsi_ema_crossover_atr.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
