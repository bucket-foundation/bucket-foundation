# GraphVega

https://github.com/rahuljoshi44/GraphVega. License MIT. Stars 296. Last push 2021-03-03. JavaScript. Checked 2026-11-27.

## Architecture
React front end in `src/` (option chain, expiries, greeks chart, IV skew chart, positions, analysis line chart, quote and search) and an Express server in `server/` (`app.js`, `options.js`, `stock.js`, `config.js`). Docker and compose files included.

## Data Layer
Server routes proxy a market data API with a key from `config.js`; the client holds positions in state.

## Event Loop
Request and response from the browser to the Express routes.

## Execution
None.

## Risk
`src/utils/bsm.js` computes net profit across price, date and IV change for a set of positions, plus average volatility.

## Strategies Shipped
None. Multi-leg payoff and greeks analysis for user-built positions.

## AI Components
None.

## Connectors
Third-party quote and option chain API through the server.

## Fit
Front-end pattern for an option chain viewer with a Black-Scholes payoff chart. Dormant since 2021.
