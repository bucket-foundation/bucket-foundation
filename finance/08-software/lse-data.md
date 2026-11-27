# lse-data

https://github.com/londonstrategicedge/lse-data. License MIT. Stars 357. Last push 2026-11-26. Python. Checked 2026-11-27.

## Architecture
Thin client package `lse/`: `client.py` (class `LSE`, about 1,600 lines), `data3.py` (history and catalogue mixin), `cli.py`, `tui.py`. Twelve scripts in `examples/` cover streaming, options, macro series and CSV export.

## Data Layer
Hosted service. WebSocket for live ticks, REST for history and reference rows; exports to CSV and Parquet. Tick and `OptionTick` dataclasses carry OSI symbol parts, premium and DTE.

## Event Loop
Callback registration with `on(event, cb)` and `_emit`, a blocking `stream()` iterator with reconnect, and an async variant in `examples/async_stream.py`.

## Execution
None.

## Risk
None.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
LSE Data 3.0 service via one API key: equities, FX, crypto, indices, options, macro series.

## Fit
Data vendor client. Gives L1 to L3 market data through one key for backtests that need order-level history. Needs a paid or free-tier account on the vendor service.
