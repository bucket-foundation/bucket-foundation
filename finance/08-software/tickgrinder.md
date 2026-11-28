# tickgrinder

https://github.com/Ameobea/tickgrinder. License MIT. Stars 591. Last push 2019-12-09. Rust. Checked 2026-11-27.

## Architecture
Cargo workspace of separate processes: `util` (shared types, transport, `strategies.rs`), `backtester`, `optimizer`, `spawner`, `logger`, `tick_parser`, `configurator`, `data_downloaders`, `broker_shims/FXCM`, and a `mm` Node server with `mm-react` dashboard.

## Data Layer
Tick data in CSV files from FXCM and Poloniex downloaders, written by `tick_writer/writer.js`. Redis holds commands and live streams.

## Event Loop
Modules talk through a Redis pub/sub command protocol (`transport/redis`). The backtester replays ticks through a simulated broker and answers `handle_command` messages. Tick processors evaluate conditions on every tick.

## Execution
`broker_shims/FXCM` bridges the FXCM C++ SDK through a Java bridge and a native FFI library. A simulated broker serves backtests.

## Risk
None found. README marks the project pre-alpha and unfit for trading.

## Strategies Shipped
Author keeps strategies private. The optimizer is a runner that toggles conditions on tick processors.

## AI Components
None.

## Connectors
FXCM and Poloniex feeds, with an IEX downloader.

## Fit
Dormant since 2019. Useful as an example of a multi-process tick pipeline with a Redis bus in Rust.
