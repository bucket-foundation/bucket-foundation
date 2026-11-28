# GoEx

https://github.com/nntaoli-project/goex. License MIT. Stars 1,998. Last push 2026-10-30. Go. Checked 2026-11-27.

## Architecture
Go exchange client library: `api.go` defines interfaces for spot, futures and swap; folders per venue (`binance`, `okx`, `bitget`), `httpcli`, `options`, `model`.

## Data Layer
REST and websocket market data normalized to `model` structs.

## Event Loop
None.

## Execution
Unified order, cancel and balance calls.

## Risk
Rate limiting in `httpcli`.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
Binance, OKX, Bitget.

## Fit
Go counterpart to ccxt with fewer venues.
