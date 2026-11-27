# QuantMath

https://github.com/MarcusRainbow/QuantMath. License MIT. Stars 412. Last push 2023-06-16. Rust. Checked 2026-11-27.

## Architecture
Rust library `quantmath`. `core/` (factories, serialization), `data/` (curves, vol surfaces, vol smiles, dividends, fixings, bumps), `dates/` (calendars, rules), `instruments/` (options, bonds, baskets, assets), `models/` (Black diffusion, Monte Carlo timeline), `pricers/` (Monte Carlo, self pricer), `risk/` (bump based sensitivities), `solvers/` (implied vol), `math/` (Brent, interpolation, option pricing), `facade/` C interface with `quantmath.h` for C++.

## Data Layer
In-memory market data objects with serde deserialization; example Monte Carlo input in `examples/montecarlo.rs`.

## Event Loop
None.

## Execution
None.

## Risk
Bump and revalue greeks: delta and gamma (`deltagamma.rs`), vega and volga (`vegavolga.rs`), time bumps (`timebumped.rs`), dependency collection and a pricing cache.

## Strategies Shipped
None.

## AI Components
None.

## Connectors
C interface for C++ callers (`src/cpp-test/quantmath_runner.cpp`).

## Fit
Pricing and risk engine for equity derivatives with Monte Carlo and bump risk. Pre-2019 Rust edition; port before use.
