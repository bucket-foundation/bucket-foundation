# czsc

https://github.com/waditu/czsc. License Other. Stars 6,644. Last push 2026-11-08. Rust. Checked 2026-11-27.

## Architecture
Rust workspace under `crates/` (`czsc-core`, `czsc-signals`, `czsc-ta`, `czsc-trader`, `czsc-utils`, `czsc-python`) with a PyO3 wheel exposed as `czsc._native`. The Python package `czsc/` re-exports the native layer. `CLAUDE.md` makes Rust and Python behavior identical a hard rule, so Python holds no adapter logic.

## Data Layer
Bars are Arrow IPC frames passed across the PyO3 boundary. `connectors/` pull from vendor sources; `mock.py` generates test bars.

## Event Loop
Bar-by-bar: the `CZSC` object ingests bars and updates fractals (fenxing), strokes (bi) and segments. The trader engine (`engine_v2`) steps positions per bar for backtests.

## Execution
None. Positions are simulated in `czsc-trader/src/trader.rs`; no broker adapter ships.

## Risk
Position objects carry stop-loss and time-exit parameters; no portfolio risk module.

## Strategies Shipped
`czsc-signals/src` holds signal families (`cxt.rs` structure signals, `tas.rs` indicator signals, `bar.rs`, `vol.rs`, `pos.rs`). `strategy.rs` defines `CzscStrategyBase` which combines signals into positions with open and exit rules.

## AI Components
None.

## Connectors
Arrow IPC to pandas and polars, local file loaders.

## Fit
Structural analysis engine for Chan-theory signals with a native speed path. Useful when a signal library for China futures and equities is the goal.
