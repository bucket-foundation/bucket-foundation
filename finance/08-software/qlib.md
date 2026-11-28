# Qlib

https://github.com/microsoft/qlib · MIT · 50,626 stars · last push 2026-11-04 · Python with Cython · checked 2026-11-27

## Architecture
Research platform for ML alpha on equity cross-sections. Layers: `qlib/data` (storage, expression engine, datasets), `qlib/contrib/model` (forecast models), `qlib/strategy` and `qlib/contrib/strategy` (signal to orders), `qlib/backtest` (exchange, executor, account), `qlib/workflow` (MLflow-style recorder), `qlib/rl` (order-execution RL).

## Data Layer
Custom binary column store per instrument and field (`qlib/data/storage`). Formula expressions such as `Ref($close, 5)/$close` parsed in `qlib/data/ops.py` and `expression_parser.py`, cached in `cache.py`. Point-in-time fundamentals in `pit.py`. Collectors in `scripts/data_collector/` for Yahoo, CN and US indexes, crypto, Baostock 5-minute, funds. Alpha158 and Alpha360 feature handlers.

## Event Loop
Nested decision framework: `backtest/executor.py` runs a `NestedExecutor` where an outer daily strategy hands orders to an inner intraday executor. Each step calls `strategy.generate_trade_decision`, then `exchange.py` fills.

## Execution
Simulated only. `backtest/exchange.py` takes `deal_price`, `limit_threshold` for limit-up and limit-down, `open_cost` 0.0015 and `close_cost` defaults. `examples/online_srv` rolls models forward for daily live signal generation; no broker adapter.

## Risk
Cost model and trade limits in the exchange. Portfolio optimizers in `contrib/strategy/optimizer/` (mean variance, risk parity style `PortfolioOptimizer`, `EnhancedIndexingOptimizer` with tracking-error budget). Risk model estimators in `qlib/model/riskmodel`.

## Strategies Shipped
- `qlib/contrib/strategy/signal_strategy.py` `TopkDropoutStrategy`: hold top k by score, swap out n worst each day.
- `signal_strategy.py` `EnhancedIndexingStrategy`: optimize weights against a benchmark with a factor risk model.
- `cost_control.py` `SoftTopkStrategy`: top k with turnover-limited weight moves.
- `rule_strategy.py` `TWAPStrategy`, `SBBStrategyBase`, `SBBStrategyEMA`, `ACStrategy` (Almgren-Chriss), `RandomOrderStrategy`, `FileOrderStrategy`: execution strategies.
- `qlib/rl/order_execution`: PPO and DQN order-execution policies.
- 30+ forecast models in `qlib/contrib/model/`: LightGBM, XGBoost, CatBoost, DoubleEnsemble, LSTM, GRU, ALSTM, GATs, TCN, Transformer, Localformer, TabNet, HIST, TRA, ADARNN, KRNN, SFM, IGMTF.

## AI Components
Supervised ML and deep learning forecasters plus RL execution. No LLM code in `qlib/`. Microsoft's RD-Agent is the separate LLM layer that drives Qlib.

## Connectors
None for brokers. Data from Yahoo and Chinese sources through collectors.

## Fit
Research bench for cross-sectional equity ranking models. Feeds a daily ranked list into the notify layer. Not an execution engine.
