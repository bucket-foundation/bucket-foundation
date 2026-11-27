# binance-triangle-arbitrage

https://github.com/bmino/binance-triangle-arbitrage. License MIT. Stars 1,173. Last push 2022-12-07. JavaScript (Node). Checked 2026-11-27.

## Architecture
Single Node process in `src/main/`: `Main.js` (startup and cycle callback), `MarketCache.js` (ticker universe and triangle construction), `CalculationNode.js` (profit math), `ArbitrageExecution.js`, `BinanceApi.js`, `Validation.js`, `HUD.js`, `Loggers.js`, `SpeedTest.js`.

## Data Layer
In-memory depth caches from Binance websockets. `MarketCache.createTrade(a, b, c)` builds triangles from exchange info. Config from `config/config.json`. No database.

## Event Loop
Event driven. Each depth update for a ticker triggers `arbitrageCycleCallback`, which analyzes every triangle related to that ticker. Depth sockets start staggered or bundled.

## Execution
`linear` or `parallel` three-leg market order strategy chosen by `EXECUTION.STRATEGY`. The `test` flag on the API client stays on until `EXECUTION.ENABLED` is set.

## Risk
`isSafeToExecute` checks a profit threshold, an age threshold on the oldest depth event, symbols already in flight, double execution of one position, more than one attempt per second, and an execution cap.

## Strategies Shipped
`CalculationNode.optimize`: steps investment size from MIN to MAX and keeps the best profit percent per triangle, walking order book depth for each leg.

## AI Components
None.

## Connectors
Binance REST and websocket through `node-binance-api`.

## Fit
Compact reference for cross-pair arbitrage on one venue with depth-aware sizing. Unmaintained since 2022.
