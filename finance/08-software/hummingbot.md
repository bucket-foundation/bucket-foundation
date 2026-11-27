# Hummingbot

https://github.com/hummingbot/hummingbot · Apache-2.0 · 21,415 stars · last push 2026-11-27 · Python and Cython · checked 2026-11-27

## Architecture
Market-making and arbitrage framework. Cython core clock and order book (`hummingbot/core/`), connector layer (`hummingbot/connector/`), terminal client (`hummingbot/client/`). Two strategy generations: legacy V1 strategies in `hummingbot/strategy/` and V2 in `hummingbot/strategy_v2/`, where controllers emit executor actions and `executors/executor_orchestrator.py` runs them.

## Data Layer
Live order books and trades streamed per connector. `hummingbot/data_feed/` provides candles feeds and AMM price feeds. Trades and orders recorded to SQLite through `hummingbot/model/`. `scripts/download_order_book_and_trades.py` records books for research.

## Event Loop
A `Clock` ticks every second (configurable) and calls `tick()` on strategies and connectors. V2 controllers run `update_processed_data()` then `determine_executor_actions()` each tick.

## Execution
Executors in `hummingbot/strategy_v2/executors/`: position (triple barrier), DCA, grid, TWAP, XEMM, arbitrage, order, LP. Native REST and websocket connectors per venue, plus Gateway (`hummingbot/connector/gateway/`) for DEX and AMM venues. `paper_trade` exchange for simulation.

## Risk
`TripleBarrierConfig` (stop loss, take profit, time limit, trailing stop) in `executors/position_executor/data_types.py`. Kill switch in `hummingbot/core/utils/kill_switch.py`. Inventory skew and price bands in market-making controllers. Perpetual budget checker in `connector/derivative/perpetual_budget_checker.py`.

## Strategies Shipped
- `hummingbot/strategy/pure_market_making/`: symmetric bid and ask around mid with inventory skew and order refresh.
- `hummingbot/strategy/avellaneda_market_making/`: Avellaneda-Stoikov reservation price and optimal spread.
- `hummingbot/strategy/cross_exchange_market_making/`: quote on a maker venue, hedge fills on a taker venue.
- `hummingbot/strategy/amm_arb/`: buy on one venue, sell on another when spread beats fees.
- `hummingbot/strategy/spot_perpetual_arbitrage/`: capture spot and perpetual basis.
- `hummingbot/strategy/perpetual_market_making/`, `liquidity_mining/`, `cross_exchange_mining/`, `hedge/`.
- `controllers/directional_trading/bollinger_v1.py`, `bollinger_v2.py`: long below lower band, short above upper band.
- `controllers/directional_trading/macd_bb_v1.py`: Bollinger extreme confirmed by MACD histogram sign.
- `controllers/directional_trading/supertrend_v1.py`: trade SuperTrend direction when price is near the line.
- `controllers/directional_trading/dman_v3.py`: Bollinger mean reversion with DCA grid entries.
- `controllers/directional_trading/bollingrid.py`: Bollinger signal opens a grid executor.
- `controllers/directional_trading/ai_livestream.py`: trade external ML signals received over MQTT.
- `controllers/generic/stat_arb.py`: pairs trade on two cointegrated assets via spread z-score.
- `controllers/generic/grid_strike.py`, `multi_grid_strike.py`: fixed-range grids.
- `controllers/generic/quantum_grid_allocator.py`: grids per asset sized to target portfolio weights.
- `controllers/generic/hedge_asset.py`: keep a perpetual short at a fixed ratio to spot holdings.
- `controllers/generic/arbitrage_controller.py`, `xemm_multiple_levels.py`, `pmm_v1.py`, `pmm_mister.py`.
- `controllers/market_making/pmm_simple.py`, `pmm_dynamic.py` (spreads scaled by NATR, MACD shifts mid), `dman_maker_v2.py`.
- `scripts/v2_funding_rate_arb.py`: long and short perpetuals on two venues to collect a funding rate gap.
- `scripts/simple_vwap.py`, `simple_pmm.py`, `simple_xemm.py`, `screener_volatility.py`.

## AI Components
No built-in model. `ai_livestream.py` consumes signals over MQTT; MCP server and Condor agent live in sibling repos.

## Connectors
CEX spot: Binance, Bybit, OKX, Kraken, Coinbase Advanced Trade, Gate, KuCoin, HTX, MEXC, Bitstamp, Gemini, Bitget, Bitmart, Hyperliquid, XRPL, Injective, others. Perpetuals: Binance, Bybit, OKX, Hyperliquid, dYdX v4, Gate, KuCoin, Bitget, Lighter, Derive, `kalshi_perpetual`. DEX via Gateway.

## Fit
Execution engine for crypto market making, funding arbitrage and Kalshi when the system graduates past alerts. Too heavy as a signal layer.
