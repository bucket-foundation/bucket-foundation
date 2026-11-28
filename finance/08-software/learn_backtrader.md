# learn_backtrader

https://github.com/jrothschild33/learn_backtrader. License none stated. Stars 2,310. Last push 2021-10-21. Python. Checked 2026-11-27.

## Architecture
Seven lesson scripts, `Lesson1.py` to `Lesson7.py`, each a runnable Backtrader tutorial in Chinese: introduction, data, indicators, trading, strategy, visualization. `Data/` holds `daily_price.csv` and `trade_info.csv`.

## Data Layer
Pandas frames fed to `bt.feeds.PandasData`; CSV files in `Data/`.

## Event Loop
Backtrader `Cerebro` bar loop calling `next()` on each `bt.Strategy` subclass.

## Execution
Backtrader's simulated broker: cash, commission, slippage and sizer settings shown per lesson. No live broker.

## Risk
None beyond sizer and stop order examples.

## Strategies Shipped
Many `TestStrategy` classes per lesson: SMA cross, TA-Lib indicator strategy (`TALibStrategy`), exponential average with stochastic filter, custom observers for buy and sell markers and trades (`Lesson7.py`).

## AI Components
None.

## Connectors
None.

## Fit
Teaching material for Backtrader's `Cerebro`, observers and plotting. No license is stated, so treat the code as reference only. Backtrader itself carries the engine.
