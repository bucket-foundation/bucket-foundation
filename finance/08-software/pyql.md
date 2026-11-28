# pyql

https://github.com/enthought/pyql. License NOASSERTION (a LICENSE.txt file ships in the repo). Stars 1,358. Last push 2026-07-17. Cython. Checked 2026-11-27.

## Architecture
Cython wrappers over C++ QuantLib. Package `quantlib/` holds paired `.pxd` and `.pyx` files per class: `instruments`, `models` (equity, short rate, market models), `methods` (finite differences, Monte Carlo), `termstructures`, `time`, `cashflows`, `currency`, `indexes`, `market`, `mlab`. `cpp_layer/` adds C++ support for simulation and calibration constraints. `setup.py` builds the extensions with `cythonize`.

## Data Layer
None. Inputs are Python objects and the sample CSVs in `examples/data`.

## Event Loop
None. Pricing and calibration run as synchronous library calls.

## Execution
None.

## Risk
None as a module. It exposes pricing engines and greeks through QuantLib.

## Strategies Shipped
None. `examples/` has scripts for American option valuation, bond pricing, CDS, swaps and multicurve bootstrapping, plus notebooks.

## AI Components
None.

## Connectors
None.

## Fit
Python access to QuantLib pricing for derivatives and fixed income. It needs a QuantLib build on the machine. Useful as a valuation oracle next to a strategy engine.
