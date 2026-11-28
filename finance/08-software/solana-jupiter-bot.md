# solana-jupiter-bot

https://github.com/ARBProtocol/solana-jupiter-bot. License MIT. Stars 790. Last push 2024-02-14. JavaScript on Node.js. Checked 2026-11-27.

## Architecture
`src/bot/index.js` holds both strategies and the main loop, `swap.js` executes routes, `setup.js` and `cache.js` hold config and runtime state, `ui/` draws the CLI dashboard, `wizard/` is an Ink-based config wizard.

## Data Layer
In-memory cache of balances, iteration counts and trade history. Routes come from the Jupiter V4 SDK `computeRoutes`. Tokens from the Jupiter token list.

## Event Loop
Fixed-interval async loop. Each iteration computes routes, compares simulated profit to a threshold and swaps. Minimum interval setting avoids RPC 429 errors.

## Execution
Jupiter swap transactions signed by a local wallet key from `.env`, with priority fee and slippage in basis points. Optional adaptive slippage scales with simulated profit.

## Risk
Minimum profit percent gate, slippage cap, trade size mode (cumulative or initial). No loss limit or kill switch. The README warns of fund loss.

## Strategies Shipped
`pingpongStrategy` and `arbitrageStrategy` in `src/bot/index.js`.

## AI Components
None.

## Connectors
Solana RPC, Jupiter Aggregator v4.

## Fit
Reference for route-based Solana arbitrage. Jupiter v4 is deprecated, so the SDK calls need porting to the current Jupiter API.
