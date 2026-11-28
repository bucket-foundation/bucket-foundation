# poly-kalshi-arb

https://github.com/taetaehoho/poly-kalshi-arb. License none declared. Stars 445. Last push 2025-12-21. Rust. Checked 2026-11-27.

## Architecture
`src/`: discovery (match equivalent Kalshi and Polymarket markets, team-name cache), kalshi and polymarket clients, polymarket_clob, execution, position_tracker, circuit_breaker, cache, config.

## Data Layer
Websocket books from both venues.

## Event Loop
Tokio async; every book update recomputes cross-venue cost.

## Execution
Buys YES on one venue and NO on the other when combined cost is under `ARB_THRESHOLD` (0.995). `DRY_RUN=1` paper mode.

## Risk
Circuit breaker: max position per market, max total position, max daily loss, max consecutive errors.

## Strategies Shipped
Cross-venue binary arbitrage, YES plus NO under 99.5 cents.

## AI Components
None.

## Connectors
Kalshi, Polymarket CLOB.

## Fit
Reference for the cross-venue edge. Settlement rules differ between venues (`06-youtube/SYNTHESIS.md`), so a match carries resolution risk. No license, so read only.
