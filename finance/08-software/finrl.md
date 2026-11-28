# FinRL

https://github.com/AI4Finance-Foundation/FinRL · MIT · 17,193 stars · last push 2026-11-27 · Python and Jupyter · checked 2026-11-27

## Architecture
Three layers: data processors (`finrl/meta/data_processors/`), Gym environments (`finrl/meta/env_*`), and DRL agent wrappers (`finrl/agents/`). Entry points `finrl/train.py`, `finrl/test.py`, `finrl/trade.py`.

## Data Layer
Processors for Yahoo Finance, Alpaca, CCXT, EODHD, WRDS, JoinQuant, QuantConnect, Sinopac, FXMacroData (`finrl/meta/data_processors/processor_*.py`). `finrl/meta/preprocessor/preprocessors.py` adds technical indicators, VIX and a turbulence index.

## Event Loop
Gym `step()` per trading day: agent outputs a continuous action vector of share counts, env applies costs, returns portfolio value change as reward. Paper trading (`finrl/meta/paper_trading/alpaca.py`) polls Alpaca each interval and feeds the trained policy.

## Execution
Simulated in env with `buy_cost_pct` and `sell_cost_pct`. Live paper orders through Alpaca.

## Risk
`turbulence_threshold` in `finrl/meta/env_stock_trading/env_stocktrading.py` liquidates all positions when the turbulence index spikes. `env_stocktrading_stoploss.py` adds stop loss; `env_stocktrading_cashpenalty.py` penalizes low cash. `hmax` caps shares per trade.

## Strategies Shipped
- `finrl/applications/stock_trading/stock_trading.py`: train A2C, DDPG, PPO, SAC, TD3 on Dow 30 with indicators, trade the best.
- `finrl/applications/stock_trading/ensemble_stock_trading.py`: retrain A2C, PPO, DDPG each quarter and trade the one with the best validation Sharpe.
- `finrl/applications/stock_trading/stock_trading_rolling_window.py`: same with rolling retrain windows.
- `finrl/applications/stock_trading/fundamental_stock_trading.py`: adds fundamental ratios to the state.
- `finrl/meta/env_portfolio_allocation/env_portfolio.py`: agent outputs softmax portfolio weights using covariance features.
- `finrl/meta/env_portfolio_optimization/env_portfolio_optimization.py` with `finrl/agents/portfolio_optimization/`: EIIE and policy-gradient portfolio optimization.
- `finrl/meta/env_cryptocurrency_trading/env_multiple_crypto.py`, `env_btc_ccxt.py`: crypto variants.
- `finrl/agents/fasttd3/`: FastTD3 agent.

## AI Components
Deep RL via Stable-Baselines3, ElegantRL, RLlib; Optuna tuning in `finrl/agents/stablebaselines3/hyperparams_opt.py`. No LLM.

## Connectors
Alpaca for paper trading; data vendors listed above.

## Fit
Research sandbox for RL allocation. Results are known to overfit and use daily bars with simple costs; treat outputs as research, never as live sizing.
