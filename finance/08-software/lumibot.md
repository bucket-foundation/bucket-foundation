# Lumibot

https://github.com/Lumiwealth/lumibot. License GPL-3.0. Stars 2,257. Last push 2026-11-27. Python. Checked 2026-11-27.

## Architecture
`Strategy` subclass with lifecycle hooks (`initialize`, `on_trading_iteration`, `on_filled_order`, `before_market_closes`). `StrategyExecutor` drives the hooks; `Trader` runs one or many strategies; the same class runs in backtest, paper and live.

## Data Layer
`data_sources/`: Alpaca, Alpha Vantage, CCXT, Databento (pandas and polars), IBKR (TWS and REST), Kalshi, Polymarket, Polygon, Schwab, Tradier, Tradovate, Webull, Yahoo, plus Pandas and Polars frames for custom data.

## Event Loop
`strategy_executor.py` sleeps `sleeptime` between `on_trading_iteration` calls and processes a broker event queue in between. In backtests `safe_sleep` advances simulated time.

## Execution
Market, limit, stop, stop-limit, trailing, bracket, OCO and multi-leg option orders through the broker adapter. Broker events (fills, cancels) arrive through `trade_event_priority.py`.

## Risk
Per-strategy cash and position tracking; stops sit in strategy code. No global kill switch.

## Strategies Shipped
`lumibot/example_strategies/`: buy and hold, 60/40, crypto 50/50, drift rebalancer, stock momentum, bracket, OCO, limit and trailing stops, top market cap, revenue growth with low debt, diversified leverage, strangle, options/futures/forex hold to expiry, Kalshi favorite, Polymarket prediction contract, MetaMask perpetual, plus 20+ AI strategies (`agent_*`, `ai_*`, `ai_trading_team_*`).

## AI Components
`components/agents/` holds an agent runtime with tools (DuckDB, web, docs, browser), memory, structured output and a ChatGPT/OpenAI, Anthropic and Grok LLM layer. Example agents trade on news sentiment, M2 liquidity, macro risk, insider and congressional trades, and "investor persona" teams. The agent places orders.

## Connectors
Brokers: Alpaca, IBKR (TWS and REST), Schwab, Tradier, Tradovate, Webull, ProjectX, Bitunix, CCXT, MetaMask, Kalshi, Polymarket.

## Fit
Widest single framework for stocks, options, futures, crypto and prediction markets in one API. GPL license matters if code ships. Lets the LLM place trades by default, so a notify-first build would swap the order call for an alert.
