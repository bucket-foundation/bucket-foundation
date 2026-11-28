# xad

https://github.com/auto-differentiation/xad. License AGPL-3.0. Stars 446. Last push 2026-11-25. C++ with Python bindings. Checked 2026-11-27.

## Architecture
Header library in `src/XAD` (forward and adjoint active types, tape, checkpointing, higher-order modes) with `test/` and `samples/`. Finance samples: `BlackScholesGreeks`, `HestonCalibration`, `ImpliedVolatility`, `LiborSwaptionPricer`, `SwapPricer`, `AmericanPDE`, `BasketMonteCarlo`, `CrossGamma`.

## Data Layer
None. Operates on caller's numeric code.

## Event Loop
None.

## Execution
None.

## Risk
Computes sensitivities (greeks, cross gamma, Jacobians, Hessians) of pricing code through forward and adjoint differentiation.

## Strategies Shipped
None.

## AI Components
None. `LogisticRegression` sample shows gradients for fitting.

## Connectors
Eigen sample for matrix types. Python bindings.

## Fit
Sensitivity engine for derivatives pricing and calibration, a candidate backend beside QuantLib style code. AGPL licence restricts closed use.
Pricing code written against XAD active types returns the value and every input derivative in one pass; checkpointing bounds tape memory on long Monte Carlo paths.
