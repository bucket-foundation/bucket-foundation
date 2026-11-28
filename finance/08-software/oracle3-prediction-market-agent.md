# oracle3-prediction-market-agent

https://github.com/YichengYang-Ethan/oracle3-prediction-market-agent. License Apache-2.0. Stars 573. Last push 2026-11-25. Python. Checked 2026-11-27.

## Architecture
Package `oracle3/` (a legacy `coinjure/matching` module remains). `core/trading_engine.py` runs events through strategy, risk and trader. Other modules: `strategy/`, `trader/`, `risk/`, `pricing/`, `matching` of related contracts, `ml/`, `backtest/`, `live/`, `mcp_server/`, `dashboard/`, `alerts/`.

## Data Layer
Pluggable data sources: Polymarket orderflow, Kalshi, DFlow websocket, CoinGecko over x402, Google News, Twitter and on-chain signals. Backtests replay recorded DFlow parquet episodes. State in `storage/state_store.py`.

## Event Loop
Async `TradingEngine.start()` pulls events, applies market updates, calls strategies, then trades and reconciles orders.

## Execution
`Trader` base class with Polymarket, Kalshi, Solana and paper traders, a Jito submitter and an atomic basket trader. Kill switch, read-only mode and a ticker allow-list sit in the base class.

## Risk
`StandardRiskManager`: trade size, position limit, total exposure, drawdown, daily loss and position count. A correlation manager and an on-chain manager exist.

## Strategies Shipped
Arbitrage: event-sum, exclusivity, implication, cross-market. Statistical: cointegration spread, lead-lag, premium decay, order book imbalance, market making, momentum with mean reversion.

## AI Components
LLM news, debate, multi-agent and Solana agent strategies. An MCP server. `ml/` with calibration and ablation.

## Connectors
Polymarket, Kalshi, DFlow, Solana.

## Fit
Broad prediction-market reference. Strategy docstrings hedge arbitrage claims on asserted relations.
