# StockRL

https://github.com/sunnyswag/StockRL. License GPL-3.0. Stars 365. Last push 2024-03-27. Python. Checked 2026-11-27.

## Architecture
FinRL-style pipeline for China A-shares. `utils/` (`pull_data.py`, `preprocessors.py`, `env.py` with `StockLearningEnv`, `models.py` with `DRL_Agent`, `backtest.py`, `config.py`), `learn/` (`data.py`, `trainer.py`, `trader.py`, `start_train.sh`), `script/` for CSI 300 and SSE 50 constituent lists, `paper.pdf`.

## Data Layer
Tushare daily bars from 2009 to 2024, technical indicators (Bollinger bands, RSI 20, SMA 20, 60 and 120, MACD, volume averages), split by date into train, trade and test. `config.py` holds a Tushare token in source.

## Event Loop
Gym environment steps once per trading day; Stable-Baselines3 trains against it.

## Execution
Backtest only. `get_transactions` converts actions to share counts inside the environment.

## Risk
Reward is cumulative return plus a penalty for drawdown from the running asset peak. No live risk layer.

## Strategies Shipped
Learned policies from A2C, DDPG, PPO, SAC and TD3 with listed hyperparameters, compared with the index on the held-out period.

## AI Components
Deep reinforcement learning through Stable-Baselines3.

## Connectors
Tushare.

## Fit
Compact A-share reinforcement learning baseline. Rotate the committed token and treat backtests as research.
