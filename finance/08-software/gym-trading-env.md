# Gym-Trading-Env

https://github.com/ClementPerroud/Gym-Trading-Env. License MIT. Stars 499. Last push 2025-03-19. Python. Checked 2026-11-27.

## Architecture
Package `src/gym_trading_env/`: `environments.py` (`TradingEnv`, `MultiDatasetTradingEnv`), `downloader.py`, `renderer.py`, and `utils/` with `portfolio.py`, `history.py`, `charts.py`.

## Data Layer
OHLCV dataframes supplied by the user. `downloader.py` pulls candles through ccxt with pauses between requests. `MultiDatasetTradingEnv` cycles through several datasets.

## Event Loop
Gymnasium `reset` and `step`. Actions map to a position index (for example short, flat, long). `windows` stacks past observations.

## Execution
Simulated position changes at the bar close or through limit orders added with `add_limit_order`. Parameters: `trading_fees`, `borrow_interest_rate`, `portfolio_initial_value`.

## Risk
None beyond fees and borrow interest in the simulation.

## Strategies Shipped
None. Custom reward functions and dynamic features plug in through `reward_function` and `dynamic_feature_functions`.

## AI Components
Reinforcement learning environment for agents. A renderer shows runs in a browser dashboard.

## Connectors
ccxt exchanges for historical download.

## Fit
Lightweight RL trading gym with vectorized variants. Fills are simplified.
