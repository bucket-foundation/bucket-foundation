# rango-client

https://github.com/rango-exchange/rango-client. License Apache-2.0. Stars 1,123. Last push 2026-11-26. TypeScript. Checked 2026-11-27.

## Architecture
Nx monorepo. `widget/` (embedded swap widget, app and UI kit), `wallets/` (38 `provider-*` packages plus `react`), `signers/` (EVM, Solana, Starknet, Sui, TON, Tron), `queue-manager/` (`core`, `react`, `rango-preset`), `blockchains/internal-blockchains`, `logging/` (console, Sentry, subscriber layers) and `examples/` (Vue, Next, Vite, CRA).

## Data Layer
Quotes, routes and token lists from the Rango API through `rango-sdk` and `rango-types`. Swap state lives in the queue manager and persists in browser storage with a migration module.

## Event Loop
Queue manager runs a swap as ordered steps (check prerequisites, check approve, create transaction, execute, check status) and resumes after page reload.

## Execution
Signers per chain build and sign transactions through the user wallet. Extra executors for Hyperliquid, Stellar trustlines and XRPL trustlines.

## Risk
Prerequisite and approval checks before each step; slippage and error mapping in `shared-errors.ts`. No portfolio risk.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
Rango aggregator API, 38 wallet providers, WalletConnect 2, Ledger, Trezor.

## Fit
Reference for cross-chain swap UX and a durable multi-step transaction queue. Order routing happens on the Rango server, outside this repo.
