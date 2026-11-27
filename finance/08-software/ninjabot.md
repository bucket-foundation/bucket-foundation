# ninjabot

https://github.com/rodrigo-brito/ninjabot. License MIT. Stars 1,636. Last push 2026-11-01. Go. Checked 2026-11-27.

## Architecture
Root `ninjabot.go` (`NinjaBot.Run`) wires `exchange/`, `order/` (controller, feed), `strategy/` (controller, registry, indicator set, streaming), `storage/` (memory, BuntDB, SQL), `notification/` (Telegram, mail), `backtest/`, `portfolio/`, `sweep/` and `report/`. A React and Vite dashboard sits in `web/` and is served by `ui/`.

## Data Layer
`exchange.DataFeedSubscription` fans candles to strategies. Sources are Binance spot and futures, CSV feeds (`csvfeed.go`) and a downloader (`download/`). Orders persist through the storage interface.

## Event Loop
Goroutine per feed with channels; strategies run on candle close, with optional partial-candle updates.

## Execution
`order.Controller` places market, limit, stop, OCO and stop-limit orders through the `service.Exchange` interface. Implementations: Binance, Binance futures and `PaperWallet`, which the backtester also uses.

## Risk
Strategy-set stop losses and trailing stops, OCO protection, minimum quote balance checks, backtest metrics in `backtest/metrics.go`.

## Strategies Shipped
`examples/strategies`: `emacross.go`, `turtle.go`, `trailingstop.go`, `ocosell.go`. Parameters are declarative structs; specs load from YAML (`examples/specs/emacross.yaml`).

## AI Components
None.

## Connectors
Binance, Telegram, SMTP mail.

## Fit
Clean Go template for a crypto bot with one exchange interface shared by live, paper and backtest modes.
