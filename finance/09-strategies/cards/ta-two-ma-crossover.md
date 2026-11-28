# Two Moving Average Crossover

ID: `ta-two-ma-crossover`
Family: Technical Analysis
Retail feasibility: **C**
As of: 2026-11-27
Bead: `bkt-q5moa.15`
Origin: Strategies in code

## Logic

Go long when the fast moving average, simple, exponential, double, triple, Hull or SSL, crosses above the slow one; exit or reverse on the cross below.

## Source

1. Simple Technical Trading Rules and the Stochastic Properties of Stock Returns. BROCK and co-authors, 1992, The Journal of Finance. https://doi.org/10.1111/j.1540-6261.1992.tb04681.x (Crossref search, fetched 2026-11-27)
2. Kakushadze and Serur, 151 Trading Strategies, section 3.12. https://doi.org/10.1007/978-3-030-02792-6 (Crossref DOI, fetched 2026-11-27); Spanish edition arXiv 1912.04492 (arXiv API, fetched 2026-11-27)
3. Source code in `finance/code/`: 26 implementations listed in `08-software/STRATEGIES-IN-CODE.md` (read 2026-11-27).

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

[QuantConnect/Lean](../../08-software/lean.md), [QuantDinger](../../08-software/quantdinger.md), [backtesting.py](../../08-software/backtesting-py.md), [backtrader](../../08-software/backtrader.md), [nautechsystems/nautilus_trader](../../08-software/nautilus_trader.md), [polakowo/vectorbt](../../08-software/vectorbt.md), [prediction-market-backtesting](../../08-software/prediction-market-backtesting.md), [rqalpha](../../08-software/rqalpha.md), [stefan-jansen/zipline-reloaded](../../08-software/zipline-reloaded.md)

## Code

- `backtrader: backtrader/strategies/sma_crossover.py`
- `backtrader: samples/gold-vs-sp500/gold-vs-sp500.py`
- `backtesting.py: doc/examples/Quick Start User Guide.py`
- `backtesting.py: doc/examples/Parameter Heatmap & Optimization.py`
- `backtesting.py: doc/examples/Strategies Library.py`
- `nautechsystems/nautilus_trader: crates/trading/src/examples/strategies/ema_cross/strategy.rs`
- `nautechsystems/nautilus_trader: examples/backtest/finfeed_kalshi_nfl_ema_cross.py`
- `polakowo/vectorbt: examples/BitcoinDMAC.ipynb`
- `QuantConnect/Lean: Algorithm.Framework/Alphas/EmaCrossAlphaModel.py`
- `QuantConnect/Lean: Algorithm.Python/FuturesMomentumAlgorithm.py`
- `QuantConnect/Lean: Algorithm.Python/MovingAverageCrossAlgorithm.py`
- `QuantConnect/Lean: Algorithm.Python/EmaCrossFuturesFrontMonthAlgorithm.py`
- `QuantConnect/Lean: Algorithm.Python/EmaCrossUniverseSelectionAlgorithm.py`
- `stefan-jansen/zipline-reloaded: src/zipline/examples/dual_moving_average.py`
- `stefan-jansen/zipline-reloaded: src/zipline/examples/dual_ema_talib.py`
- `rqalpha: rqalpha/examples/golden_cross.py`
- `prediction-market-backtesting: strategies/ema_crossover.py`
- `QuantDinger: library/strategies/003_quantdinger_ema_atr_long.py`
- `QuantDinger: library/strategies/005_quantdinger_dual_ma_angle.py`
- `QuantDinger: library/strategies/016_quantdinger_dual_ema_cross.py`
- `QuantDinger: library/strategies/022_quantdinger_sma_10_20_cross.py`
- `QuantDinger: library/strategies/027_quantdinger_state_aware_ma_cross.py`
- `QuantDinger: library/strategies/053_quantdinger_ema_accelerator_combo.py`
- `QuantDinger: library/strategies/068_quantdinger_dema_entry_exit.py`
- `QuantDinger: library/strategies/072_quantdinger_ema_ratio_cross.py`
- `QuantDinger: library/strategies/077_quantdinger_timed_sma_cross.py`

Grades: A retail with free data and a small account; B retail with paid data, margin or more capital; C edge thin after retail costs or needs low latency; D institutional balance sheet or access; F closed or not feasible.
