# lppls

https://github.com/Boulder-Investment-Technologies/lppls. License MIT. Stars 482. Last push 2026-05-30. Jupyter Notebook, Python. Checked 2026-11-27.

## Architecture
Package `src/lppls/`: `lppls.py` (class `LPPLS` with `fit`, `compute_indicators`, `compute_nested_fits`), `lppls_lm.py`, `lppls_cmaes.py`, `lppls_q.py` (alternative fitters), `data_loader.py`. `notebooks/` shows nested fits, Lagrange regularization and quantile regression.

## Data Layer
NumPy arrays or dataframes of log prices indexed by time. `data_loader.py` fetches sample series.

## Event Loop
None. Nested fits run in a multiprocessing pool (`mp_compute_nested_fits`).

## Execution
None.

## Risk
Bubble confidence indicators from the fraction of valid fits across windows, with filter conditions on oscillation and damping and critical time bounds.

## Strategies Shipped
None. The output is a bubble and anti-bubble confidence series.

## AI Components
None. Fitting uses Levenberg-Marquardt, CMA-ES and a quantile variant.

## Connectors
None.

## Fit
Log-periodic power law fitter for crash and bubble detection research. Combine with a signal layer to test usefulness.
