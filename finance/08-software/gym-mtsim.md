# gym-mtsim

https://github.com/AminHP/gym-mtsim. License MIT. Stars 527. Last push 2024-11-14. Python. Checked 2026-11-27.

## Architecture
Package `gym_mtsim/`: `envs/mt_env.py` (`MtEnv`, a Gymnasium env), `simulator/` (`MtSimulator`, `Order`), `metatrader/` (MT5 API wrappers and symbol info), `data/` (pickled symbol sets for forex, crypto, stocks and mixed).

## Data Layer
`MtSimulator.download_data` pulls history through the MetaTrader 5 Python API; `save_symbols` and `load_symbols` cache pickles. Price lookups use `price_at` and `nearest_time`.

## Event Loop
Gym `reset` and `step`; `tick` advances simulated time by a delta.

## Execution
Simulated hedged and unhedged orders with margin, free margin and margin level. `close_order` realizes profit.

## Risk
Margin level and volume checks in the simulator. Reward is the equity change.

## Strategies Shipped
None. A random-action demo and an RL training notebook are the usage examples.

## AI Components
Reinforcement learning environment with multi-symbol observations and continuous actions for volume per symbol.

## Connectors
MetaTrader 5 for data only.

## Fit
RL environment for forex and CFD research with MT5 margin rules. No live trading path.
