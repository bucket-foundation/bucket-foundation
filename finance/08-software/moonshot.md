# moonshot

https://github.com/quantrocket-llc/moonshot. License Apache-2.0. Stars 300. Last push 2026-10-28. Python. Checked 2026-11-27.

## Architecture
Package `moonshot/` with `strategies/base.py` (class `Moonshot`, about 1,400 lines) and `strategies/ml.py` (`MoonshotML`). Plug-in folders: `commission/` (stock, futures, FX), `slippage/` (fixed, borrow fee), `mixins/weight.py`. A strategy subclasses `Moonshot` and fills in the pipeline methods.

## Data Layer
`get_prices` loads from QuantRocket history databases and master file; `_cache.py` caches loads. Everything is a pandas DataFrame indexed by date and security id.

## Event Loop
None. Vectorized pipeline: `prices_to_signals`, `signals_to_target_weights`, `target_weights_to_positions`, `positions_to_gross_returns`, then `order_stubs_to_orders` and `orders_to_child_orders` for live runs.

## Execution
`trade()` produces order DataFrames that QuantRocket submits to brokers; Moonshot has no broker code of its own.

## Risk
`limit_position_sizes`, `_constrain_weights`, commission and slippage models, `allow_rebalance` gating.

## Strategies Shipped
None in the repo. `MoonshotML` loads a saved Keras or scikit-learn model for signals.

## AI Components
`MoonshotML` wraps a trained model file for prediction.

## Connectors
QuantRocket services only.

## Fit
Clean example of a vectorized signals-to-weights-to-orders pipeline. Needs QuantRocket for data and execution.
