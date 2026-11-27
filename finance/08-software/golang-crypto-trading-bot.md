# golang-crypto-trading-bot

https://github.com/saniales/golang-crypto-trading-bot. License GPL-3.0. Stars 1,162. Last push 2026-11-26. Go. Checked 2026-11-27.

## Architecture
Cobra CLI (`cmd/` with `init` and `start`). Packages: `environment` (config, market, order, chart types), `exchanges` (wrapper per venue), `strategies` (interval and websocket runners), `bot_helpers`, `examples`.

## Data Layer
YAML config for exchanges, markets and strategies. `exchanges/cache.go` caches responses. No database.

## Event Loop
`strategies.ApplyAllStrategies` runs each strategy. `IntervalStrategy` loops `OnUpdate` then sleeps for its interval; `WebsocketStrategy` leaves updates to the model. Hooks: `Setup`, `OnUpdate`, `OnError`, `TearDown`.

## Execution
`ExchangeWrapper` interface implemented for Binance, Bitfinex, Bittrex (v1 and v2), HitBTC, Kraken, KuCoin and Poloniex, plus `exchange_mock.go`. Simulated mode takes fake balances.

## Risk
None built in.

## Strategies Shipped
`examples/interval.go`: `Watch5Sec` market print, Telegram and Discord notification examples. `examples/websocket.go`: websocket demo.

## AI Components
None.

## Connectors
Seven exchange wrappers, Telegram, Discord.

## Fit
Plugin skeleton for writing Go strategies against several exchanges. Ships no trading edge. Several wrapped venues are defunct.
