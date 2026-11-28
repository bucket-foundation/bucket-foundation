# cryptocurrency-arbitrage

https://github.com/manu354/cryptocurrency-arbitrage. License GPL-3.0. Stars 1,285. Last push 2022-05-15. JavaScript. Checked 2026-11-27.

## Architecture
Three files: `main.js` (Express and Socket.IO server plus the compute loop), `settings.js` (a list of market adapters, each with `URL` and a `last` function that maps that exchange's JSON to coin prices), and `index.html` (browser table). No tests.

## Data Layer
Polls public REST ticker endpoints through `request` and Bluebird promises. Prices are held in memory per coin and market. No storage.

## Event Loop
`setTimeout(main, 10000)`: fetch all markets, compute, emit to connected sockets, repeat every ten seconds.

## Execution
None. The tool displays opportunities only.

## Risk
None. Fees, depth and transfer time are not modelled.

## Strategies Shipped
Cross-exchange spot spread: for every coin quoted on two or more exchanges, sort prices, form each ordered pair and rank by price ratio.

## AI Components
None.

## Connectors
Bittrex, Poloniex, Cryptopia, Bleutrade, BTC38 and Jubi public ticker APIs. Several of these exchanges have closed.

## Fit
Teaching example of adapter-per-exchange price polling. Data sources are stale and the spread ignores fees, so it is a UI pattern reference.
