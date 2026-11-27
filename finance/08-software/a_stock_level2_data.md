# a_stock_level2_data

https://github.com/zzhahn/a_stock_level2_data. License not stated. Stars 375. Last push 2026-11-02. Python examples and docs. Checked 2026-11-27.

## Architecture
Documentation and example clients for a closed A-share market data client called datas (data_interface). The main branch holds `docs/`, `examples/` (`d1`, `d2`, `d101`, `d201`, `d202` GUI and script clients, `ai_control.py`) and `llms.txt`. Installers are hosted off the repo.

## Data Layer
Local WebSocket and HTTP service on `127.0.0.1:8080`. `d201_l2_csv.py` subscribes to Level 2 order and trade streams and writes CSV. `d202_snapshot_auction.py` reads auction snapshots.

## Event Loop
Websocket client with signal handlers and a worker thread per script.

## Execution
`d201_buysell_batch_repro.py` reproduces buy and sell batch statistics from the stream. No order placement.

## Risk
None.

## Strategies Shipped
None.

## AI Components
`ai_control.py` and a docs page on driving the client from AI agents on a headless server.

## Connectors
Closed datas client with Level 2 tick data, ten-level books, limit-up lists, dragon-tiger lists and capital flow. Registration and authorization are required.

## Fit
Example code for Level 2 A-share capture through a vendor client. The vendor software is closed and its terms sit outside the repo.
