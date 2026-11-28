# CloddsBot

https://github.com/alsk1992/CloddsBot. License MIT. Stars 3,134. Last push 2026-11-13. TypeScript. Checked 2026-11-27.

## Architecture
Large TypeScript monolith, 581 source files in `src/` with a small Rust crate `rust/fast-broadcast`. Domains: `feeds/` (Polymarket, Kalshi, Betfair, Smarkets, PredictIt, Manifold, Metaculus, weather, FRED), `exchanges/` (Binance futures, Bybit, Hyperliquid, MEXC, Lighter), `execution/`, `risk/`, `opportunity/`, `strategies/`, `trading/`, `signal-router/`, `agents/`, `channels/`, `skills/`, `mcp/`.

## Data Layer
better-sqlite3 or sql.js with migrations in `db/`, optional Postgres; feed registry with freshness tracking.

## Event Loop
Gateway process with websocket feeds and a signal router that fans events to strategies and the opportunity executor.

## Execution
Smart router, TWAP, DCA, bracket and trigger orders, order persistence, MEV protection and auto-redeem for resolved markets.

## Risk
`risk/engine.ts` chains kill switch, circuit breaker, order size, exposure, daily loss, drawdown, concentration, VaR, volatility regime and Kelly sizing.

## Strategies Shipped
Combinatorial and cross-platform arbitrage in `opportunity/`, venue arbitrage scanners, `strategies/hft-divergence`, `strategies/crypto-hft`, `trading/market-making`, copy trading.

## AI Components
Claude-based agents, ML signals module, chat channels and an MCP server.

## Connectors
Polymarket, Kalshi, Binance, Bybit, Hyperliquid, Solana, EVM, Telegram and other chat apps.

## Fit
Widest open prediction-market agent stack with a real pre-trade risk chain. Breadth is high and depth per module is uneven.
