# rateslib

https://github.com/attack68/rateslib. License dual: source-available non-commercial (`LICENCE`) or paid commercial subscription (`COMMERCIAL_LICENCE`). Stars 372. Last push 2026-05-20. Python with a Rust core. Checked 2026-11-27.

## Architecture
Python package `python/rateslib` over Rust crates in `rust/` (curves, dual numbers, FX volatility, scheduling, splines). Modules: `curves` (including Nelson-Siegel and Svensson), `instruments` (IRS, FRA, XCS, FX forwards and options, bonds, CDS, zero coupon swaps, STIR futures, loans), `legs`, `periods`, `fx`, `volatility`, `dual` (automatic differentiation), `solver.py`, `scheduling`.

## Data Layer
In-memory curve, FX rate and fixing objects; `data/fixings.py` and `loader.py` load fixings.

## Event Loop
None.

## Execution
None.

## Risk
Dual-number sensitivities of instrument values to curve nodes, with a solver that fits curves to market quotes. Delta and gamma reports across instruments.

## Strategies Shipped
None.

## AI Components
None. The repo carries `.ai-opt-out` and `.aiignore` files.

## Connectors
None.

## Fit
Fixed income and FX derivatives analytics with analytic risk. Check the dual licence before any commercial use.
