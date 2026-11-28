# tf-quant-finance

https://github.com/google/tf-quant-finance. License Apache-2.0. Stars 5,584. Last push 2026-08-06. Python. Checked 2026-11-27.

## Architecture
Numerical library `tf_quant_finance/`: `black_scholes` (vanilla, Asian, binomial tree, implied vol, variance swaps), `models` (Heston, Hull-White, HJM, CIR, geometric Brownian motion, Longstaff-Schwartz, generic Ito process), `math` (PDE, QMC, root search, interpolation, optimizers, gradients), `rates`, `datetime` (calendars, day counts, schedules) and `experimental` (pricing platform, local vol, SVI, American options, instruments).

## Data Layer
Tensors in, tensors out. `experimental/io.py` and the pricing platform read portfolio and market data files.

## Event Loop
None. Vectorized graph computation on CPU, GPU or TPU.

## Execution
None.

## Risk
Differentiable pricing gives Greeks by automatic differentiation; the pricing platform values portfolios and sensitivities. No limit enforcement.

## Strategies Shipped
None.

## AI Components
TensorFlow is the substrate; no trained models.

## Connectors
TensorFlow, TF Probability.

## Fit
Derivatives pricing and Monte Carlo reference with hardware acceleration. Valuation only; no market connectivity.
