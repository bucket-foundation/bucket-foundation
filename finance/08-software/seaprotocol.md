# seaprotocol

https://github.com/sea-protocol/seaprotocol. License Other. Stars 5,025. Last push 2026-03-02. Move. Checked 2026-11-27.

## Architecture
Move packages under `src/`: `sources/` (`market.move`, `amm.move`, `camm.move`, `grid.move`, `router.move`, `aggregator.move`, `escrow.move`, `fee.move`, `mining.move`, `price.move`, `events.move`), plus `sea_init`, `sea_lib`, `sea_lp`, `sea_mock` and a `lending` design note. About 11,600 lines of Move. The README points to an EVM successor, GridTrade.

## Data Layer
On-chain resources: order books, pools and fee state in Aptos and Sui storage.

## Event Loop
Transaction-driven; `events.move` emits order and trade events for indexers.

## Execution
Matching in `market.move` (the largest module), constant-product pools in `amm.move`, routing across book and pool in `router.move`, aggregation in `aggregator.move`.

## Risk
Escrow and fee modules; no external risk controls.

## Strategies Shipped
`grid.move` computes price and quantity levels for a grid order: buy orders flip to sell when filled and the reverse.

## AI Components
None.

## Connectors
Aptos and Sui only.

## Fit
Reference for an on-chain order book with native grid orders. No audit file is in the repo.
