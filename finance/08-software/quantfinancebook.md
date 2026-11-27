# QuantFinanceBook

https://github.com/LechGrzelak/QuantFinanceBook. License BSD-3-Clause. Stars 997. Last push 2025-04-14. Python and MATLAB. Checked 2026-11-27.

## Architecture
Companion code for the book "Mathematical Modeling and Computation in Finance". `PythonCodes/Chapter 01` to `Chapter 15` hold one script per figure, table or exercise (`Fig03_07.py`, `Tab03_01.py`, `Exe13_11.py`); `MatlabCodes/` mirrors them; `Solutions to Exercises/` has odd-numbered answers.

## Data Layer
Simulated paths and hard-coded market parameters. No market data feed.

## Event Loop
None. Each script is a standalone numpy run with matplotlib output.

## Execution
None.

## Risk
Chapters on hedging and exposure measures appear as plotted examples. No risk module.

## Strategies Shipped
None. Models cover Black-Scholes, Heston, Merton jumps, Levy processes (CGMY, NIG, VG exercises), COS and Fourier pricing, Monte Carlo and Greeks.

## AI Components
None.

## Connectors
None.

## Fit
Clean reference implementations of derivative pricing models for checking other code. Scripts are not packaged as a library.
