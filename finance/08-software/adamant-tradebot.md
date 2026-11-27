# adamant-tradebot

https://github.com/Adamant-im/adamant-tradebot. License none stated. Stars 868. Last push 2026-11-19. JavaScript (Node). Checked 2026-11-27.

## Architecture
Node app (`app.js`) with feature modules in `trade/features/` (`mm_trader`, `mm_orderbook_builder`, `mm_liquidity_provider`, `mm_price_watcher`), per-exchange `trade/trader/` and `trade/api/` adapters, a command layer in `modules/commands/`, an HTTP API in `api/`, and an `mm` CLI that manages PM2 or Docker runs.

## Data Layer
MongoDB through `modules/DB.js` for orders and balances history. Prices from exchange order books and an Infoservice rate feed.

## Event Loop
Timer loops per feature module. Commands arrive over the ADAMANT messenger and the HTTP API.

## Execution
Limit orders placed through exchange adapters. Policies include regular market making and a `wash` policy that runs only the trader module.

## Risk
Price watcher keeps all modules inside a configured price range or a reference exchange price. Balance watcher and sniper-bot watcher settings in `config.default.jsonc`. Liquidity limits per module.

## Strategies Shipped
Order book builder, liquidity provider with VWAP price correction, spread maintainer, antigap and ladder modules referenced in the price watcher header.

## AI Components
None.

## Connectors
Azbit, Coinstore, FameEX, NonKYC, P2PB2B, StakeCube. All are small centralized exchanges.

## Fit
Shows how a token issuer runs self-hosted liquidity on thin venues. The `wash` policy and "live-like activity" features create artificial volume, so it is a study object and a compliance risk for any real use.
