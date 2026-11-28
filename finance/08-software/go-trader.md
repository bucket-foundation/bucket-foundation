# go-trader

https://github.com/robaho/go-trader. License GPL-3.0. Stars 522. Last push 2026-06-30. Go. Checked 2026-11-27.

## Architecture
Exchange simulator and clients. `cmd/exchange` is the server, `cmd/client` a CLI, `cmd/marketmaker` a mass quoter, `cmd/algo` a sample algo, `cmd/playback` replays recorded data. `internal/exchange` holds `orderbook.go`, `orderlist.go`, `marketdata.go`, `spsc.go`, `qfixapp.go`, `grpc.go`, `webserver.go`. `pkg/connector` has `grpc`, `qfix` and `marketdata` clients. Web UIs in `web` and `web_lit`.

## Data Layer
In-memory books. Market data goes out over UDP multicast with a TCP channel to replay dropped packets. Fixed-point prices through `robaho/fixed`.

## Event Loop
Single-producer single-consumer queue (`spsc.go`) feeds the book. Client callbacks: `OnBook`, `OnInstrument`, `OnOrderStatus`, `OnFill`, `OnTrade`.

## Execution
FIX via quickfixgo or gRPC. Limit and market orders, cancel and replace, mass quotes.

## Risk
None in the exchange.

## Strategies Shipped
`cmd/algo/main.go`: state machine that buys at the best ask, then exits at a profit target or a loss limit. `cmd/marketmaker` quotes symbols from `configs/instruments.txt`.

## AI Components
None.

## Connectors
FIX, gRPC, UDP multicast.

## Fit
Teaching and test-bench exchange for latency and protocol work. Pair it with a strategy engine to test order flow.
