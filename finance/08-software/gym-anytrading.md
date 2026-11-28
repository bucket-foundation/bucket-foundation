# gym-anytrading

https://github.com/AminHP/gym-anytrading. License MIT. Stars 2,389. Last push 2024-03-14. Python. Checked 2026-11-27.

## Architecture
Gymnasium environments in `gym_anytrading/envs/`: abstract `TradingEnv` (`trading_env.py`, 210 lines) with `StocksEnv` and `ForexEnv` subclasses. Registered ids `stocks-v0` and `forex-v0`. Sample CSV data in `datasets/`.

## Data Layer
Caller supplies a pandas DataFrame with prices; `_process_data` builds feature signals and a `frame_bound` slice. Bundled FOREX and stock sample files.

## Event Loop
Gym `reset` and `step` loop owned by the RL agent; one bar per step.

## Execution
Simulated positions Long and Short with two actions Sell and Buy. `_update_profit` applies bid and ask fee percentages on position flips. No broker.

## Risk
None. The episode ends at the end of the frame.

## Strategies Shipped
None. Reward is realized price difference when the position flips, in `stocks_env._calculate_reward`.

## AI Components
Reinforcement learning environment; the repo ships no agent, README examples use stable-baselines3. `max_possible_profit` gives an oracle upper bound.

## Connectors
None.

## Fit
Smallest working RL trading environment. Suitable as a test harness for agent code; reward and fee model are too thin for realistic evaluation.
