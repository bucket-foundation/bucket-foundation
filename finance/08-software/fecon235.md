# fecon235

https://github.com/rsvp/fecon235. License NOASSERTION (LICENSE.md ships in the repo). Stars 1,283. Last push 2023-01-20. Jupyter Notebook, Python. Checked 2026-11-27.

## Architecture
Analysis library in `lib/` with `yi_*` modules (`yi_fred`, `yi_quandl`, `yi_stocks`, `yi_timeseries`, `yi_matrix`, `yi_simulation`, `yi_secform`, `yi_plot`) and `ys_*` modules (`ys_opt_holt`, `ys_prtf_boltzmann`, `ys_gauss_mix`, `ys_mlearn`, `ys_optimize`). About 35 notebooks in `nb/` apply it to macro series. Tests are in `tests/`.

## Data Layer
FRED and Quandl downloads into pandas, with compressed CSV snapshots in `nb/`. `yi_secform` parses SEC 13F filings. Resampling helpers cover daily, monthly and quarterly series.

## Event Loop
None. Notebook and script analysis.

## Execution
None.

## Risk
None as a module. `ys_prtf_boltzmann` computes portfolio weights from covariance and growth rates with a floor and a temperature parameter.

## Strategies Shipped
None as trading code. Holt-Winters forecast with grid-searched parameters, Boltzmann portfolio weighting, softmax weighting, Gaussian mixture fits for kurtosis, and bootstrap simulation of S&P 500 returns.

## AI Components
`ys_mlearn` holds softmax weighting and sort helpers on numpy.

## Connectors
FRED, Quandl, SEC EDGAR.

## Fit
Macro notebook set for inflation, employment, gold, housing and credit series. Pre-2023 data connectors need checking, since Quandl access changed.
